import { formatINR, formatDate } from "./format";

export interface BillItem {
  model: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface BillData {
  refNo: string;
  date?: string;
  customerName: string;
  customerPhone?: string;
  items: BillItem[];
  total: number;
  paid: number;
  balance: number;
  payMethod?: string;
  notes?: string;
}

/**
 * Generate formatted WhatsApp receipt text
 */
export function generateWhatsAppBillText(bill: BillData): string {
  const dateStr = formatDate(bill.date || new Date().toISOString());
  const methodStr = bill.payMethod ? ` (${bill.payMethod})` : "";

  const itemsText = bill.items
    .map((it, idx) => {
      return `${idx + 1}. *${it.model}*\n   ${it.qty} x ${formatINR(it.rate)} = *${formatINR(it.amount)}*`;
    })
    .join("\n");

  const balanceLine =
    bill.balance <= 0.5
      ? "✅ *Status: Fully Paid (Cleared)*"
      : `🔴 *Balance Due: ${formatINR(bill.balance)}*`;

  return [
    "📺 *SONEJA ELECTRONICS*",
    "Distribution CRM & Wholesale | Mumbai",
    "📞 +91 9653190285 / +91 9820958939",
    "──────────────────────────",
    `🧾 *BILL / INVOICE: ${bill.refNo || "CASH-MEMO"}*`,
    `📅 Date: ${dateStr}`,
    `👤 Customer/Dealer: *${bill.customerName || "Counter Sale"}*`,
    bill.customerPhone ? `📱 Phone: ${bill.customerPhone}` : null,
    "──────────────────────────",
    "*ITEMS:*",
    itemsText || "No items",
    "──────────────────────────",
    `💰 *Grand Total:* *${formatINR(bill.total)}*`,
    `💵 *Payment Received:* ${formatINR(bill.paid)}${methodStr}`,
    balanceLine,
    bill.notes ? `\n📝 Note: ${bill.notes}` : null,
    "──────────────────────────",
    "🙏 *Thank you for your business!*",
    "📍 Soneja Electronics, Mumbai",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Sanitize and format Indian/international phone numbers for WhatsApp
 */
export function cleanWhatsAppNumber(phone: string | undefined | null): string {
  let clean = (phone || "").replace(/[^0-9]/g, "");
  if (clean.startsWith("0") && clean.length === 11) {
    clean = clean.slice(1);
  }
  if (clean.length === 10) {
    clean = "91" + clean;
  }
  return clean;
}

/**
 * Open WhatsApp with prefilled bill text targeted to customer phone
 */
export function sendWhatsAppBill(phone: string | undefined | null, billText: string) {
  const cleanPhone = cleanWhatsAppNumber(phone);
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(billText)}`
    : `https://wa.me/?text=${encodeURIComponent(billText)}`;
  window.open(url, "_blank");
}

/**
 * Trigger 58mm / 80mm Thermal Receipt Printing
 */
export function printThermalReceipt(bill: BillData) {
  const dateStr = formatDate(bill.date || new Date().toISOString());
  const methodStr = bill.payMethod ? `[${bill.payMethod}]` : "";

  const itemsHtml = bill.items
    .map(
      (it) => `
    <tr>
      <td colspan="3" style="font-weight:bold; padding-top:4px;">${it.model}</td>
    </tr>
    <tr style="border-bottom: 1px dotted #ccc;">
      <td style="padding-bottom:4px;">${it.qty}</td>
      <td style="text-align:right; padding-bottom:4px;">₹${it.rate.toLocaleString("en-IN")}</td>
      <td style="text-align:right; font-weight:bold; padding-bottom:4px;">₹${it.amount.toLocaleString("en-IN")}</td>
    </tr>
  `
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${bill.refNo}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    body {
      width: 76mm;
      margin: 0 auto;
      padding: 10px 6px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      line-height: 1.35;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .title { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
    .sub { font-size: 11px; margin-top: 2px; }
    .dashed { border-bottom: 1px dashed #000; margin: 6px 0; }
    .double { border-bottom: 2px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    th { text-align: left; font-size: 11px; border-bottom: 1px dashed #000; padding: 4px 0; }
    .totals-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; }
    .grand-total { font-size: 15px; font-weight: 900; }
    .status-badge { display: inline-block; padding: 2px 6px; border: 1px solid #000; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
    @media print {
      body { width: 100%; margin: 0; padding: 2mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="title">SONEJA ELECTRONICS</div>
    <div class="sub">Wholesale TV Distribution & Retail</div>
    <div class="sub">Mumbai, Maharashtra</div>
    <div class="sub">📞 9653190285 / 9820958939</div>
  </div>

  <div class="dashed"></div>

  <div>
    <div><span class="bold">Bill No:</span> ${bill.refNo || "CASH-MEMO"}</div>
    <div><span class="bold">Date:</span> ${dateStr}</div>
    <div><span class="bold">Party:</span> ${bill.customerName}</div>
    ${bill.customerPhone ? `<div><span class="bold">Phone:</span> ${bill.customerPhone}</div>` : ""}
  </div>

  <div class="dashed"></div>

  <table>
    <thead>
      <tr>
        <th>Qty</th>
        <th class="text-right">Rate (₹)</th>
        <th class="text-right">Amt (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="dashed"></div>

  <div class="totals-row grand-total">
    <span>TOTAL:</span>
    <span>₹${bill.total.toLocaleString("en-IN")}</span>
  </div>
  <div class="totals-row">
    <span>Paid ${methodStr}:</span>
    <span class="bold">₹${bill.paid.toLocaleString("en-IN")}</span>
  </div>
  <div class="totals-row">
    <span>Balance Due:</span>
    <span class="bold" style="${bill.balance > 0 ? "font-size:13px;" : ""}">₹${bill.balance.toLocaleString("en-IN")}</span>
  </div>

  <div class="double"></div>

  <div class="text-center" style="margin: 8px 0;">
    <span class="status-badge">${bill.balance <= 0.5 ? "CLEARED / PAID" : "PARTIAL / UNPAID"}</span>
  </div>

  ${bill.notes ? `<div style="font-size:11px; margin-bottom: 6px;">*Note: ${bill.notes}</div>` : ""}

  <div class="dashed"></div>

  <div class="text-center sub">
    <div>*** THANK YOU FOR YOUR VISIT ***</div>
    <div>Goods once sold subject to warranty terms.</div>
    <div>Save Paper · Digital POS Receipt</div>
  </div>

  <div class="no-print" style="margin-top: 18px; text-align: center;">
    <button onclick="window.print()" style="background:#000; color:#fff; padding:8px 16px; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:13px;">
      🖨 Print Receipt
    </button>
  </div>

  <script>
    window.onload = function() {
      // Auto open print dialog
      setTimeout(function() { window.print(); }, 250);
    }
  </script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
