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

export function shortDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch { return "—"; }
}

export function toInputDate(iso: string | undefined | null): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(iso).toISOString().slice(0, 10);
}
