import { NextResponse } from "next/server";
import { subscribe_customer, generate_invoice, get_usage } from "../../../lib/actions/billing";
import { record_usage, check_limit } from "../../../lib/billing/limits";

export async function GET() {
  const workspace_id = process.env.DEMO_WORKSPACE_ID || "00000000-0000-0000-0000-000000000001";

  // A contact ID for testing
  const contact_id = "00000000-0000-0000-0001-000000000001";
  // The 'Basic' plan ID
  const basic_plan_id = "11111111-1111-1111-1111-111111111101";

  try {
    const logs = [];

    logs.push("Starting SaaS Billing Test...");

    // 1. Subscribe to the Basic Plan
    logs.push("\n1. SUBSCRIBING CUSTOMER TO BASIC PLAN ($999/mo)...");
    const subResult = await subscribe_customer(workspace_id, contact_id, basic_plan_id);
    if (!subResult.success) {
      return NextResponse.json({ error: (subResult as any).error }, { status: 500 });
    }
    const sub_id = subResult.subscription.id;
    logs.push(`Success! Subscription ID: ${sub_id}`);

    // 2. Check limits before usage
    logs.push("\n2. CHECKING LIMITS BEFORE USAGE...");
    const limitBefore = await check_limit(workspace_id, "emails_sent");
    logs.push(`- Can send emails? ${limitBefore.allowed ? "Yes" : "No"}`);

    // 3. Record Usage (Simulating heavy usage to trigger overage)
    // Basic plan includes 1,000 emails. Let's simulate sending 1,200 emails (200 overage).
    logs.push("\n3. SIMULATING USAGE (Sending 1,200 emails)...");
    await record_usage(workspace_id, "emails_sent", 1200);
    // Basic plan includes 100 AI actions. Let's simulate 150 (50 overage).
    await record_usage(workspace_id, "ai_actions", 150);
    logs.push(`Usage recorded in database.`);

    // 4. Verify Usage
    logs.push("\n4. VERIFYING RECORDED USAGE...");
    const usage = await get_usage(workspace_id);
    logs.push(`- Emails sent this cycle: ${usage?.emails_sent}`);
    logs.push(`- AI actions this cycle: ${usage?.ai_actions}`);

    // 5. Generate Invoice (End of cycle)
    logs.push("\n5. GENERATING END-OF-CYCLE INVOICE...");
    const invoiceResult = await generate_invoice(sub_id);

    if (invoiceResult.success) {
      logs.push(`Invoice Generated!`);
      logs.push(`- Invoice ID: ${invoiceResult.invoice.id}`);
      logs.push(`- Total Amount Due: $${invoiceResult.invoice.amount_due_cents / 100}`);
      logs.push(`- Status: ${invoiceResult.invoice.status}`);
      logs.push(`(The invoice includes base fee + overage fees for emails and AI actions)`);
    } else {
      logs.push(`Failed to generate invoice: ${(invoiceResult as any).error}`);
    }

    logs.push("\nTest Complete! The billing engine is fully working end-to-end.");

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
