import { NextRequest, NextResponse } from "next/server";
import { listPayments } from "@/lib/services";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return new NextResponse("Missing id", { status: 400 });

  const payments = await listPayments();
  const payment = payments.find((p) => p.id === id);
  if (!payment) return new NextResponse("Invoice not found", { status: 404 });

  const basePrice = payment.base_amount || (payment.amount - (payment.overage_amount || 0));
  const overagePrice = payment.overage_amount || 0;

  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${payment.invoice_id}</title>
        <style>
          body { font-family: monospace; padding: 40px; max-width: 600px; margin: 0 auto; color: #1c1917; background: #fff; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1c1917; padding-bottom: 20px; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
          .total { border-top: 2px solid #1c1917; padding-top: 20px; margin-top: 20px; font-weight: bold; font-size: 1.2em; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body onload="window.print()">
        <button class="no-print" onclick="window.print()" style="margin-bottom:20px; padding: 10px 16px; background: #c85a32; color: white; border: none; font-weight: bold; cursor: pointer;">Print / Save as PDF</button>
        <div class="header">
           <div>
              <h2 style="margin: 0 0 8px 0; font-size: 20px;">NEXUS PLATFORM</h2>
              <p style="margin: 2px 0;">Invoice ID: ${payment.invoice_id}</p>
              <p style="margin: 2px 0;">Date: ${new Date(payment.timestamp).toLocaleDateString()}</p>
           </div>
           <div style="text-align: right">
              <p style="margin: 2px 0;">Workspace: ${payment.workspace_id}</p>
           </div>
        </div>
        
        <div class="row">
           <span>Base Subscription</span>
           <span>$${(basePrice / 100).toFixed(2)}</span>
        </div>
        <div class="row">
           <span>Metered Overage Fees</span>
           <span>$${(overagePrice / 100).toFixed(2)}</span>
        </div>
        
        <div class="row total">
           <span>Total Paid</span>
           <span>$${(payment.amount / 100).toFixed(2)}</span>
        </div>
        
        <div style="margin-top: 40px; font-size: 0.85em; color: #57534e; border-top: 1px dashed #d6d3d1; padding-top: 15px;">
           <p style="margin: 3px 0;">Payment Method: ${(payment.method || "card").toUpperCase()} | Ref: ${payment.gateway_reference || "N/A"}</p>
           <p style="margin: 3px 0;">Payment Status: ${(payment.status || "succeeded").toUpperCase()}</p>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" }
  });
}
