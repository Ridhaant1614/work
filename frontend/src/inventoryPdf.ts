/**
 * Soneja CRM - Inventory Stock PDF Exporter
 * Generates and triggers a print/PDF view containing ONLY:
 * - Model Name
 * - In Stock Quantity
 * (Strictly no prices, costs, valuation, categories, or other metadata)
 */

export interface InventoryItemForPdf {
  model?: string;
  qty_on_hand?: number | string;
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function exportInventoryStockPdf(items: InventoryItemForPdf[]): boolean {
  if (!items || items.length === 0) {
    return false;
  }

  // Sort items alphabetically by model name
  const sorted = [...items].sort((a, b) =>
    (a.model || "").localeCompare(b.model || "", undefined, { sensitivity: "base", numeric: true })
  );

  const rowsHtml = sorted
    .map((it) => {
      const model = escapeHtml(it.model || "-");
      const qty = Number(it.qty_on_hand) || 0;
      return `      <tr>
        <td class="col-model">${model}</td>
        <td class="col-qty">${qty}</td>
      </tr>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Inventory_Stock_Details</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 20px;
      line-height: 1.4;
    }
    .no-print {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 18px;
      margin-bottom: 20px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 13px;
      color: #334155;
    }
    .no-print-tip {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no-print-actions {
      display: flex;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid transparent;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .btn-primary {
      background: #0f4c5c;
      color: #ffffff;
      border-color: #0f4c5c;
    }
    .btn-primary:hover {
      background: #0a3642;
    }
    .btn-secondary {
      background: #ffffff;
      color: #334155;
      border-color: #cbd5e1;
    }
    .btn-secondary:hover {
      background: #f1f5f9;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #000;
      padding: 7px 12px;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .col-model {
      text-align: left;
      font-weight: 500;
    }
    .col-qty {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      width: 160px;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        padding: 0;
      }
      th {
        background: #e2e8f0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div class="no-print-tip">
      <span>💡</span>
      <span>To save as a PDF file, select <strong>"Save as PDF"</strong> as the printer/destination.</span>
    </div>
    <div class="no-print-actions">
      <button class="btn btn-primary" onclick="window.print()">🖨️ Save as PDF / Print</button>
      <button class="btn btn-secondary" onclick="window.close()">✖ Close</button>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-model">Model Name</th>
        <th class="col-qty">In Stock Quantity</th>
      </tr>
    </thead>
    <tbody>
${rowsHtml}
    </tbody>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    return false;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
