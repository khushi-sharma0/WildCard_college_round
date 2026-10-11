
import { NextResponse } from "next/server";
import { getRole, canPerformAction } from "@/lib/auth";
import {
  getAnalyticsOverrides,
  saveAnalyticsOverride,
  saveAnalyticsOverrides,
  metricKeys,
  type MetricKey,
} from "@/lib/analytics-overrides";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const overrides = await getAnalyticsOverrides({ throwOnError: true });
    return NextResponse.json({ overrides });
  } catch (error) {
    console.error("Analytics GET error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown analytics error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const role = await getRole();

    if (!canPerformAction(role, "write")) {
      return NextResponse.json(
        { error: "Read-only access: Viewer identity cannot save analytics metrics." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Support batch overrides: { overrides: { [metricKey]: number, ... } }
    if (body.overrides && typeof body.overrides === "object" && !Array.isArray(body.overrides)) {
      const entries = Object.entries(body.overrides);
      if (entries.length === 0) {
        return NextResponse.json(
          { error: "No metric values provided in overrides object." },
          { status: 400 }
        );
      }

      const validatedBatch: Partial<Record<MetricKey, number>> = {};
      for (const [key, val] of entries) {
        if (!metricKeys.includes(key as MetricKey)) {
          return NextResponse.json(
            { error: `Invalid metric key: "${key}". Allowed keys: ${metricKeys.join(", ")}` },
            { status: 400 }
          );
        }
        const numVal = Number(val);
        if (typeof val !== "number" && typeof val !== "string") {
          return NextResponse.json(
            { error: `Invalid value for "${key}": must be a number.` },
            { status: 400 }
          );
        }
        if (!Number.isFinite(numVal) || numVal < 0) {
          return NextResponse.json(
            { error: `Invalid value for "${key}": must be a non-negative finite number.` },
            { status: 400 }
          );
        }
        validatedBatch[key as MetricKey] = numVal;
      }

      await saveAnalyticsOverrides(validatedBatch, role);

      return NextResponse.json({
        success: true,
        overrides: validatedBatch,
        updated_by: role,
      });
    }

    // Support single metric override: { metricKey, metricValue }
    const { metricKey, metricValue } = body;

    if (
      typeof metricKey !== "string" ||
      !metricKeys.includes(metricKey as MetricKey)
    ) {
      return NextResponse.json(
        { error: `Invalid metric key. Allowed keys: ${metricKeys.join(", ")}` },
        { status: 400 }
      );
    }

    const numValue = Number(metricValue);
    if (!Number.isFinite(numValue) || numValue < 0) {
      return NextResponse.json(
        { error: `Invalid value for ${metricKey}: must be a non-negative finite number.` },
        { status: 400 }
      );
    }

    await saveAnalyticsOverride(
      metricKey as MetricKey,
      numValue,
      role
    );

    return NextResponse.json({
      success: true,
      metricKey,
      metricValue: numValue,
      updated_by: role,
    });
  } catch (error) {
    console.error("Analytics POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown analytics save error",
      },
      { status: 500 }
    );
  }
}
