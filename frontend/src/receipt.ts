import { formatINR, formatDate, amountToWords } from "./format";

export interface BillItem {
  model: string;
  qty: number;
  rate: number;
  amount: number;
  hsn?: string;
  description?: string;
}

export interface BillData {
  refNo: string;
  date?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  customerState?: string;
  customerStateCode?: string;
  items: BillItem[];
  total: number;
  paid: number;
  balance: number;
  payMethod?: string;
  notes?: string;
  isPurchase?: boolean;
  supplierName?: string;
  supplierAddress?: string;
  supplierGstin?: string;
}

export const COMPANY_DETAILS = {
  name: "SONEJA ELECTRONIC",
  addressLine1: "GROUND FLOOR 17A SHOP NO S-16",
  addressLine2: "HAJI KASAM CHAWL, V A PATEL MRG",
  addressLine3: "GRANT ROAD EAST, MUMBAI, MAHARASHTRA 400007",
  address: "GROUND FLOOR 17A SHOP NO S-16, HAJI KASAM CHAWL, V A PATEL MRG, GRANT ROAD EAST, MUMBAI, MAHARASHTRA 400007",
  gstin: "27AMZPS1148H1ZH",
  stateName: "Maharashtra",
  stateCode: "27",
  contact: "9820340382, 9820842483",
  email: "msoneja@yahoo.co.in, girishsoneja@ymail.com",
  pan: "AMZPS1145H",
  bankName: "SVCCO-OPERATIVE BANK LTD",
  accountNo: "100604180006444",
  bankAccount: "100604180006444",
  ifsc: "SHAMRAO VITHAL MARG & SVCB0000006",
  bankIfsc: "SHAMRAO VITHAL MARG & SVCB0000006",
};

/**
 * Generate formatted WhatsApp message text formatted as professional electronics distribution Tax Invoice
 */
export function generateWhatsAppBillText(bill: BillData): string {
  const dateStr = formatDate(bill.date || new Date().toISOString());
  const methodStr = bill.payMethod ? ` (${bill.payMethod})` : "";
  const isPur = !!bill.isPurchase;

  const itemsText = bill.items
    .map((it, idx) => {
      const hsn = it.hsn || "85287219";
      return `${idx + 1}. *${it.model}*\n   HSN: ${hsn} | Qty: ${it.qty} Nos x ${formatINR(it.rate)} = *${formatINR(it.amount)}*`;
    })
    .join("\n");

  const balanceLine =
    bill.balance <= 0.5
      ? "✅ *Payment Status: Fully Paid (Cleared)*"
      : `🔴 *Balance Due: ${formatINR(bill.balance)}*`;

  return [
    "📺 *SONEJA ELECTRONIC*",
    "Distribution & Wholesale | Mumbai",
    `GSTIN: ${COMPANY_DETAILS.gstin} · Code: ${COMPANY_DETAILS.stateCode}`,
    `📞 ${COMPANY_DETAILS.contact}`,
    "══════════════════════════",
    `🧾 *${isPur ? "PURCHASE ORDER" : "TAX INVOICE"}: ${bill.refNo || "SE/INV"}*`,
    `📅 Date: ${dateStr}`,
    `👤 ${isPur ? "Supplier" : "Buyer/Dealer"}: *${bill.customerName || "Counter Sale"}*`,
    bill.customerGstin ? `🏛️ GSTIN: ${bill.customerGstin}` : null,
    bill.customerAddress ? `📍 ${bill.customerAddress}` : null,
    bill.customerPhone ? `📱 Phone: ${bill.customerPhone}` : null,
    "──────────────────────────",
    "*DESCRIPTION OF GOODS (LED TVs):*",
    itemsText || "No items",
    "──────────────────────────",
    `💰 *Grand Total (Incl. GST):* *${formatINR(bill.total)}*`,
    `💵 *Payment Received:* ${formatINR(bill.paid)}${methodStr}`,
    balanceLine,
    bill.notes ? `\n📝 Remarks: ${bill.notes}` : null,
    "──────────────────────────",
    "Company Bank Details:",
    `Bank: ${COMPANY_DETAILS.bankName}`,
    `A/c No: ${COMPANY_DETAILS.accountNo}`,
    `IFSC: ${COMPANY_DETAILS.ifsc}`,
    "══════════════════════════",
    "🙏 *Thank you for your business!*",
    "📍 Soneja Electronic, Grant Road East, Mumbai",
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
 * Builds the complete A4 GST Tax Invoice HTML matching the client's sample bill.
 */
export function renderTaxInvoiceHtml(bill: BillData): string {
  const dateStr = formatDate(bill.date || new Date().toISOString());
  const isPurchase = !!bill.isPurchase;

  // Seller Details
  const sellerName = isPurchase ? (bill.supplierName || bill.customerName || "Supplier") : COMPANY_DETAILS.name;
  const sellerAddr = isPurchase
    ? (bill.supplierAddress || bill.customerAddress || "Mumbai, Maharashtra")
    : `${COMPANY_DETAILS.addressLine1}<br>${COMPANY_DETAILS.addressLine2}<br>${COMPANY_DETAILS.addressLine3}`;
  const sellerGstin = isPurchase ? (bill.supplierGstin || "Unregistered") : COMPANY_DETAILS.gstin;
  const sellerState = "Maharashtra";
  const sellerCode = "27";

  // Buyer Details
  const buyerName = isPurchase ? COMPANY_DETAILS.name : (bill.customerName || "Counter Sale");
  const buyerAddr = isPurchase
    ? `${COMPANY_DETAILS.addressLine1}, ${COMPANY_DETAILS.addressLine2}, ${COMPANY_DETAILS.addressLine3}`
    : (bill.customerAddress || "Mumbai, Maharashtra");
  const buyerGstin = isPurchase ? COMPANY_DETAILS.gstin : (bill.customerGstin || "Unregistered");
  const buyerState = bill.customerState || "Maharashtra";
  const buyerCode = bill.customerStateCode || "27";

  // Reverse tax calculation for GST (18% standard for Televisions: 9% CGST + 9% SGST)
  // Total in system is GST-inclusive.
  const grandTotal = bill.total || 0;
  const taxableSubtotal = Math.round((grandTotal / 1.18) * 100) / 100;
  const totalTax = Math.round((grandTotal - taxableSubtotal) * 100) / 100;
  const cgstAmount = Math.round((totalTax / 2) * 100) / 100;
  const sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;

  const totalQty = bill.items.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  const itemRowsHtml = bill.items
    .map((it) => {
      const itAmount = Number(it.amount) || (Number(it.qty) * Number(it.rate));
      const itTaxable = Math.round((itAmount / 1.18) * 100) / 100;
      const itRateExcl = it.qty > 0 ? Math.round((itTaxable / it.qty) * 100) / 100 : 0;
      const hsn = it.hsn || "85287219";

      return `
        <tr>
          <td style="padding: 6px 8px; vertical-align: top; border-right: 1px solid #000;">
            <div style="font-weight: bold; font-size: 11.5px;">${it.model}</div>
            <div style="font-style: italic; font-size: 10px; color: #222; margin-top: 2px;">${it.description || "WORLDTECH 2 YEARS WARRANTY"}</div>
          </td>
          <td style="padding: 6px 8px; text-align: center; vertical-align: top; border-right: 1px solid #000;">${hsn}</td>
          <td style="padding: 6px 8px; text-align: right; vertical-align: top; border-right: 1px solid #000; font-weight: bold;">${it.qty} Nos</td>
          <td style="padding: 6px 8px; text-align: right; vertical-align: top; border-right: 1px solid #000;">${itRateExcl.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding: 6px 8px; text-align: center; vertical-align: top; border-right: 1px solid #000;">Nos</td>
          <td style="padding: 6px 8px; text-align: right; vertical-align: top; font-weight: bold;">${itTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    })
    .join("");

  const amountInWords = amountToWords(grandTotal);
  const taxInWords = amountToWords(totalTax);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${bill.refNo || "SE-INV"}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      margin: 0;
      padding: 0;
      line-height: 1.3;
      background: #fff;
    }
    .invoice-container {
      width: 100%;
      max-width: 780px;
      margin: 0 auto;
      border: 1.5px solid #000;
      background: #fff;
    }
    .title-banner {
      text-align: center;
      font-size: 15px;
      font-weight: 800;
      padding: 4px 0;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #000;
      text-transform: uppercase;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
    }
    .grid-table td {
      border: 1px solid #000;
      vertical-align: top;
      padding: 5px 8px;
    }
    .bold { font-weight: bold; }
    .company-title {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 0.3px;
      margin-bottom: 3px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
    }
    .items-table th {
      border-bottom: 1.5px solid #000;
      border-right: 1px solid #000;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 800;
      background: #fafafa;
    }
    .items-table th:last-child {
      border-right: none;
    }
    .tax-breakup-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      font-size: 10.5px;
    }
    .tax-breakup-table th, .tax-breakup-table td {
      border: 1px solid #000;
      padding: 3px 6px;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .no-print {
      margin-bottom: 16px;
      text-align: center;
    }
    .print-btn {
      background: #0f4c5c;
      color: #fff;
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
    @media print {
      .no-print { display: none !important; }
      body { margin: 0; padding: 0; }
      .invoice-container { border: 1.5px solid #000; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding-top: 12px;">
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
  </div>

  <div class="invoice-container">
    <div class="title-banner">${isPurchase ? "Purchase Order / Tax Invoice" : "Tax Invoice"}</div>

    <!-- Top Info Grid -->
    <table class="grid-table" style="border-top: none;">
      <tr>
        <!-- Seller Info -->
        <td style="width: 50%; border-top: none; border-left: none;">
          <div class="company-title">${sellerName}</div>
          <div style="font-size: 10.5px; line-height: 1.35;">
            ${sellerAddr}<br>
            <span class="bold">GSTIN/UIN:</span> ${sellerGstin}<br>
            <span class="bold">State Name:</span> ${sellerState}, <span class="bold">Code:</span> ${sellerCode}<br>
            ${!isPurchase ? `<span class="bold">Contact:</span> ${COMPANY_DETAILS.contact}<br><span class="bold">E-Mail:</span> ${COMPANY_DETAILS.email}` : ""}
          </div>
          <div style="border-top: 1px solid #000; margin-top: 6px; padding-top: 4px;">
            <div style="font-size: 10px; text-transform: uppercase; color: #333; font-weight: bold;">Buyer:</div>
            <div style="font-weight: 800; font-size: 12px; margin-top: 1px;">${buyerName}</div>
            <div style="font-size: 10.5px; margin-top: 2px;">
              ${buyerAddr}<br>
              <span class="bold">GSTIN/UIN:</span> ${buyerGstin}<br>
              <span class="bold">State Name:</span> ${buyerState}, <span class="bold">Code:</span> ${buyerCode}<br>
              <span class="bold">Place of Supply:</span> ${buyerState}
            </div>
          </div>
        </td>

        <!-- Invoice Meta Details -->
        <td style="width: 50%; border-top: none; border-right: none; padding: 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
            <tr>
              <td style="width: 50%; border-left: none; border-top: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Invoice No.</div>
                <div class="bold" style="font-size: 11px;">${bill.refNo || "SE/029/2026-27"}</div>
              </td>
              <td style="width: 50%; border-right: none; border-top: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Dated</div>
                <div class="bold">${dateStr}</div>
              </td>
            </tr>
            <tr>
              <td style="border-left: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Delivery Note</div>
                <div>—</div>
              </td>
              <td style="border-right: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Mode/Terms of Payment</div>
                <div class="bold">${bill.payMethod || "RTGS / Bank Transfer"}</div>
              </td>
            </tr>
            <tr>
              <td style="border-left: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Supplier's Ref.</div>
                <div>—</div>
              </td>
              <td style="border-right: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Other Reference(s)</div>
                <div>—</div>
              </td>
            </tr>
            <tr>
              <td style="border-left: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Buyer's Order No.</div>
                <div>—</div>
              </td>
              <td style="border-right: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Dated</div>
                <div>—</div>
              </td>
            </tr>
            <tr>
              <td style="border-left: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Despatch Document No.</div>
                <div>—</div>
              </td>
              <td style="border-right: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Delivery Note Date</div>
                <div>—</div>
              </td>
            </tr>
            <tr>
              <td style="border-left: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Despatched through</div>
                <div>Direct Delivery</div>
              </td>
              <td style="border-right: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Destination</div>
                <div>Mumbai</div>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="border-left: none; border-right: none; border-bottom: none; padding: 4px 6px;">
                <div style="color: #444; font-size: 9.5px;">Terms of Delivery</div>
                <div>Goods once sold will not be taken back or exchanged. 2 Years Brand Warranty.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="text-align: left; width: 44%;">Description of Goods</th>
          <th style="text-align: center; width: 12%;">HSN/SAC</th>
          <th style="text-align: right; width: 10%;">Quantity</th>
          <th style="text-align: right; width: 12%;">Rate</th>
          <th style="text-align: center; width: 8%;">per</th>
          <th style="text-align: right; width: 14%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRowsHtml}

        <!-- Empty spacing filler rows for classic invoice structure -->
        <tr style="height: 60px;">
          <td style="border-right: 1px solid #000;"></td>
          <td style="border-right: 1px solid #000;"></td>
          <td style="border-right: 1px solid #000;"></td>
          <td style="border-right: 1px solid #000;"></td>
          <td style="border-right: 1px solid #000;"></td>
          <td></td>
        </tr>

        <!-- Tax Breakdown Rows -->
        <tr>
          <td style="border-right: 1px solid #000; text-align: right; padding: 4px 8px; font-weight: bold; font-style: italic;">
            SALES CGST 9%<br>
            SALES SGST 9%
          </td>
          <td style="border-right: 1px solid #000;"></td>
          <td style="border-right: 1px solid #000;"></td>
          <td style="border-right: 1px solid #000; text-align: right; padding: 4px 8px; font-size: 10.5px;">
            9 %<br>9 %
          </td>
          <td style="border-right: 1px solid #000;"></td>
          <td style="text-align: right; padding: 4px 8px; font-weight: bold; font-size: 11px;">
            ${cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>
            ${sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>

        <!-- Subtotal / Total Row -->
        <tr style="border-top: 1.5px solid #000; border-bottom: 1px solid #000; font-size: 12px;">
          <td style="border-right: 1px solid #000; text-align: right; font-weight: 800; padding: 6px 8px;">Total</td>
          <td style="border-right: 1px solid #000;"></td>
          <td style="border-right: 1px solid #000; text-align: right; font-weight: 800; padding: 6px 8px;">${totalQty} Nos</td>
          <td style="border-right: 1px solid #000;"></td>
          <td style="border-right: 1px solid #000;"></td>
          <td style="text-align: right; font-weight: 900; padding: 6px 8px; font-size: 13px;">₹ ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; padding: 2px 8px; font-size: 9.5px; font-weight: bold; color: #444;">
      E. & O.E
    </div>

    <!-- Amount In Words -->
    <div style="border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px 8px;">
      <div style="font-size: 10px; color: #333;">Amount Chargeable (in words)</div>
      <div class="bold" style="font-size: 11.5px; margin-top: 2px;">${amountInWords}</div>
    </div>

    <!-- HSN / Tax Breakdown Analysis Table -->
    <div style="padding: 6px 8px; border-bottom: 1px solid #000;">
      <table class="tax-breakup-table">
        <thead>
          <tr style="background: #fafafa;">
            <th rowspan="2" style="text-align: left;">HSN/SAC</th>
            <th rowspan="2" class="text-right">Taxable Value</th>
            <th colspan="2" class="text-center">Central Tax</th>
            <th colspan="2" class="text-center">State Tax</th>
            <th rowspan="2" class="text-right">Total Tax Amount</th>
          </tr>
          <tr style="background: #fafafa;">
            <th class="text-center" style="width: 10%;">Rate</th>
            <th class="text-right" style="width: 14%;">Amount</th>
            <th class="text-center" style="width: 10%;">Rate</th>
            <th class="text-right" style="width: 14%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="bold">85287219</td>
            <td class="text-right">${taxableSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-center">9%</td>
            <td class="text-right">${cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-center">9%</td>
            <td class="text-right">${sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right bold">${totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr style="font-weight: bold; background: #fdfdfd;">
            <td class="text-right">Total</td>
            <td class="text-right">${taxableSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td></td>
            <td class="text-right">${cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td></td>
            <td class="text-right">${sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">${totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size: 10.5px; margin-top: 6px;">
        <span class="bold">Tax Amount (in words) :</span> ${taxInWords}
      </div>
    </div>

    <!-- Footer: Declaration & Bank Details -->
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <!-- Left: PAN & Declaration -->
        <td style="width: 50%; vertical-align: top; padding: 8px; border-right: 1px solid #000;">
          <div style="margin-bottom: 6px;">
            <span class="bold">Company's PAN :</span> <span class="bold" style="letter-spacing: 0.5px;">${COMPANY_DETAILS.pan}</span>
          </div>
          <div class="bold" style="text-decoration: underline; margin-bottom: 3px; font-size: 10px;">Declaration</div>
          <div style="font-size: 10px; color: #222; line-height: 1.35;">
            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
          </div>
          ${bill.notes ? `<div style="margin-top: 6px; font-size: 10px; color: #444;"><strong>Remarks:</strong> ${bill.notes}</div>` : ""}
        </td>

        <!-- Right: Bank Details & Signatory -->
        <td style="width: 50%; vertical-align: top; padding: 8px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="bold" style="font-size: 10.5px; margin-bottom: 2px;">Company's Bank Details</div>
            <div style="font-size: 10px; line-height: 1.4;">
              <span class="bold">Bank Name :</span> ${COMPANY_DETAILS.bankName}<br>
              <span class="bold">A/c No. :</span> ${COMPANY_DETAILS.accountNo}<br>
              <span class="bold">Branch & IFS Code :</span> ${COMPANY_DETAILS.ifsc}
            </div>
          </div>
          <div style="text-align: right; margin-top: 24px;">
            <div style="font-size: 10.5px; font-weight: bold;">for ${COMPANY_DETAILS.name}</div>
            <div style="height: 38px;"></div>
            <div style="font-size: 10.5px; font-weight: bold; border-top: 1px dashed #666; display: inline-block; padding-top: 3px; min-width: 130px; text-align: center;">Authorised Signatory</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <div style="text-align: center; font-size: 10px; color: #444; margin-top: 6px; margin-bottom: 14px;">
    This is a Computer Generated Invoice
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    }
  </script>
</body>
</html>`;
}

/**
 * Open Print Window with standard A4 GST Tax Invoice
 */
export function printTaxInvoice(bill: BillData) {
  const html = renderTaxInvoiceHtml(bill);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

/**
 * Compatibility alias: routes legacy thermal receipt calls to official Tax Invoice
 */
export function printThermalReceipt(bill: BillData) {
  printTaxInvoice(bill);
}

