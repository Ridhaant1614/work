export function formatINR(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatINRCompact(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return sign + "₹" + (abs / 1e7).toFixed(1) + "Cr";
  if (abs >= 1e5) return sign + "₹" + (abs / 1e5).toFixed(1) + "L";
  if (abs >= 1e3) return sign + "₹" + (abs / 1e3).toFixed(1) + "K";
  return sign + "₹" + abs.toFixed(0);
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

export function formatTime(iso: string | undefined | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return ""; }
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr}, ${timeStr}`;
  } catch { return "—"; }
}

export function shortDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch { return "—"; }
}

export function toInputDate(iso: string | undefined | null): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Ensures an ISO timestamp has the exact creation time preserved.
 * If only a date (YYYY-MM-DD) is provided, it incorporates the current clock time.
 */
export function combineDateWithCurrentTime(dateStr?: string | null): string {
  const now = new Date();
  if (!dateStr) return now.toISOString();
  if (dateStr.includes("T") || (dateStr.includes(":") && dateStr.includes("-"))) {
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    } catch {}
  }
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const [y, m, d] = parts;
    const constructed = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return constructed.toISOString();
  }
  return now.toISOString();
}

/**
 * Converts numbers into standard Indian English words (Lakhs, Crores, etc.)
 * e.g. 36600 -> "INR Thirty Six Thousand Six Hundred Only"
 * e.g. 5583.06 -> "INR Five Thousand Five Hundred Eighty Three and Six paise Only"
 */
export function amountToWords(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount) || amount === 0) {
    return "INR Zero Only";
  }

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function numToWordsUnderThousand(n: number): string {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  const rounded = Math.round(amount * 100) / 100;
  const wholePart = Math.floor(rounded);
  const paisePart = Math.round((rounded - wholePart) * 100);

  let remaining = wholePart;
  const parts: string[] = [];

  const crore = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crore > 0) {
    parts.push(numToWordsUnderThousand(crore) + " Crore");
  }

  const lakh = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakh > 0) {
    parts.push(numToWordsUnderThousand(lakh) + " Lakh");
  }

  const thousand = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousand > 0) {
    parts.push(numToWordsUnderThousand(thousand) + " Thousand");
  }

  const hundred = remaining;
  if (hundred > 0) {
    parts.push(numToWordsUnderThousand(hundred));
  }

  const rupeeStr = parts.length > 0 ? parts.join(" ") : "Zero";
  let result = `INR ${rupeeStr}`;

  if (paisePart > 0) {
    result += ` and ${numToWordsUnderThousand(paisePart)} paise`;
  }

  return `${result} Only`;
}


