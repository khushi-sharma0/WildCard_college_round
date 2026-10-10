import { NextRequest, NextResponse } from "next/server";
import { authorize, getRole, isUnauthenticatedError } from "@/lib/auth";
import { listSiteThemes, saveSiteTheme } from "@/lib/services";
import { siteThemeSchema } from "@/lib/site-validation";

export async function GET() {
  try {
    const role = await getRole();
    if (!(await authorize(role, "read", "list_site_themes"))) {
      return NextResponse.json({ error: "Your role cannot view saved themes." }, { status: 403 });
    }
    return NextResponse.json(await listSiteThemes());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load saved themes.";
    return NextResponse.json({ error: message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = await getRole();
    if (!(await authorize(role, "page_write", "save_site_theme"))) {
      return NextResponse.json({ error: "Your role cannot save themes." }, { status: 403 });
    }
    const parsed = siteThemeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid theme details." }, { status: 400 });
    }
    return NextResponse.json(await saveSiteTheme(parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save theme.";
    return NextResponse.json({ error: message }, { status: isUnauthenticatedError(error) ? 401 : 500 });
  }
}
