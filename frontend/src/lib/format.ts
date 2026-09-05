// Indian-format currency + date helpers.

export function formatINR(value: number, withPaise = false): string {
  const n = Number.isFinite(value) ? value : 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const fixed = withPaise ? abs.toFixed(2) : Math.round(abs).toString();
  const [intPart, decPart] = fixed.split(".");
  // Indian grouping: last 3 digits, then groups of 2
  let last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const joined = rest ? `${grouped},${last3}` : last3;
  return `${sign}\u20B9${joined}${decPart ? "." + decPart : ""}`;
}

// Compact for big numbers on cards: ₹12.5L, ₹1.2Cr
export function formatINRCompact(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}\u20B9${(abs / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `${sign}\u20B9${(abs / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `${sign}\u20B9${(abs / 1e3).toFixed(1)}K`;
  return formatINR(n);
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function shortDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
