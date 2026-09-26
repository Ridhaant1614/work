import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { useAuth } from "../auth";
import { PayBadge, Spinner } from "../ui";
import { formatINR, formatINRCompact, shortDate } from "../format";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stockSearch, setStockSearch] = useState("");
  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "in" | "low" | "out" | "negative">("all");
  const [selectedGstMonth, setSelectedGstMonth] = useState<string>("all");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet("/dashboard"),
  });

  const availableStockList: any[] = data?.available_stock || [];

  const filteredStock = useMemo(() => {
    let list = availableStockList;
    if (stockStatusFilter === "in") {
      list = list.filter((p) => p.qty_on_hand > 2);
    } else if (stockStatusFilter === "low") {
      list = list.filter((p) => p.qty_on_hand > 0 && p.qty_on_hand <= 2);
    } else if (stockStatusFilter === "out") {
      list = list.filter((p) => p.qty_on_hand === 0);
    } else if (stockStatusFilter === "negative") {
      list = list.filter((p) => p.qty_on_hand < 0);
    }

    if (!stockSearch.trim()) return list;
    const q = stockSearch.toLowerCase();
    return list.filter(
      (p) =>
        p.model?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [availableStockList, stockStatusFilter, stockSearch]);

  if (isLoading) return <div className="page-body"><Spinner /></div>;
  if (isError || !data) return (
    <div className="page-body">
      <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Failed to load</h3><button className="btn btn-primary btn-sm" onClick={() => refetch()}>Retry</button></div>
    </div>
  );

  const lowCount = availableStockList.filter((p: any) => p.qty_on_hand > 0 && p.qty_on_hand <= 2).length;
  const outCount = availableStockList.filter((p: any) => p.qty_on_hand === 0).length;
  const negativeCount = availableStockList.filter((p: any) => p.qty_on_hand < 0).length;

  const totalSales = Number(data.total_sales) || 0;
  const totalPurchases = Number(data.total_purchases) || 0;
  const netProfitPreGst = Number(data.net_profit_before_gst ?? data.net_profit) || 0;
  const monthlyGstList: any[] = data.monthly_gst_breakdown || data.monthly_breakdown || [];
  
  // Real-time calculation from monthly timeline
  const totalGstPayable = Number(data.gst_payable ?? 0);
  const activeGstReceivable = Number(data.gst_receivable ?? data.accumulated_credit ?? 0);
  // Net Profit (After GST) = Net Profit - GST Payable (receivable never modifies profit)
  const netProfitPostGst = Number(data.net_profit_after_gst ?? (netProfitPreGst - totalGstPayable));

  const kpis = [
    { label: "Total Sales", value: formatINRCompact(totalSales), icon: "📈", color: "var(--brand)", bg: "var(--brand-ter)" },
    {
      label: "Net Profit (Pre-GST)",
      value: formatINRCompact(netProfitPreGst),
      icon: "💹",
      color: netProfitPreGst >= 0 ? "var(--success)" : "var(--error)",
      bg: netProfitPreGst >= 0 ? "var(--success-bg)" : "var(--error-bg)",
      subtitle: `Before 18% GST`,
    },
    {
      label: "GST Payable (18%)",
      value: formatINRCompact(totalGstPayable),
      icon: "🏛️",
      color: totalGstPayable > 0 ? "#dc2626" : "#10b981",
      bg: totalGstPayable > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
      subtitle: totalGstPayable > 0 
        ? `Remit on portal (${formatINR(totalGstPayable)})` 
        : activeGstReceivable > 0 
          ? `Credit: ${formatINRCompact(activeGstReceivable)} on portal` 
          : `(Sales - Purchases) × 18%`,
      badge: totalGstPayable > 0 ? "Due on Portal" : activeGstReceivable > 0 ? "ITC Carried Fwd" : "₹0 Due",
    },
    {
      label: "Net Profit (After GST)",
      value: formatINRCompact(netProfitPostGst),
      icon: "💼",
      color: netProfitPostGst >= 0 ? "var(--brand)" : "var(--error)",
      bg: "var(--brand-ter)",
      subtitle: `Net Profit - GST Payable`,
    },
    { label: "Receivable", value: formatINRCompact(data.receivable), icon: "💰", color: "var(--info)", bg: "var(--info-bg)" },
    { label: "Payable", value: formatINRCompact(data.payable), icon: "🧾", color: "var(--warning)", bg: "var(--warning-bg)" },
    { label: "Inventory Value", value: formatINRCompact(data.inventory_value), icon: "📦", color: "var(--on-surface-2)", bg: "var(--surface-3)" },
    {
      label: "Units in Stock",
      value: String(data.units_in_stock),
      icon: "🏷️",
      color: negativeCount > 0 ? "var(--warning)" : "var(--on-surface-2)",
      bg: "var(--surface-3)",
      badge: negativeCount > 0 ? `${negativeCount} model(s) in deficit` : lowCount > 0 ? `${lowCount} low stock` : undefined,
    },
  ];

  const quickActions = [
    { label: "New Sale", icon: "🧾", to: "/sales/new" },
    { label: "New Purchase", icon: "📦", to: "/purchases/new" },
    { label: "Add Expense", icon: "💳", to: "/expenses" },
    { label: "Inventory", icon: "📊", to: "/inventory" },
    { label: "Dealers", icon: "🏪", to: "/dealers" },
    { label: "Analytics", icon: "📈", to: "/reports" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Hi {user?.name?.split(" ")[0] || "there"} 👋 — here's your business overview</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate("/sales/new")}>+ New Sale</button>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>
        {/* KPI Grid */}
        <div className="kpi-grid">
          {kpis.map(k => (
            <div key={k.label} className="kpi-card">
              <div className="kpi-icon" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
              <div className="kpi-value" style={{ color: k.color }}>{k.value}</div>
              <div className="kpi-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{k.label}</span>
                {k.badge && <span style={{ fontSize: 11, color: "var(--error)", fontWeight: 700 }}>{k.badge}</span>}
              </div>
              {(k as any).subtitle && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, fontWeight: 500 }}>
                  {(k as any).subtitle}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Net Profit & GST Deduction Card */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s3)", borderBottom: "1px solid var(--divider)", paddingBottom: "var(--s3)", marginBottom: "var(--s3)" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>🏛️ Net Profit After GST Deduction</h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "2px 0 0 0" }}>
                Formula: <strong>Net Profit after GST = Net Profit - GST Payable</strong> (GST Receivable is never added to net profit)
              </p>
            </div>
            <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center" }}>
              <span className="badge badge-brand" style={{ fontWeight: 800, padding: "4px 10px", fontSize: 12 }}>
                18% GST Rate
              </span>
              {activeGstReceivable > 0 && (
                <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#2563eb", fontWeight: 700, padding: "4px 10px", fontSize: 12, border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                  🏛️ Portal Credit: {formatINR(activeGstReceivable)}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "var(--s4)" }}>
            <div style={{ padding: "var(--s4)", background: "var(--surface)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>1. Net Profit (Pre-GST)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: netProfitPreGst >= 0 ? "var(--success)" : "var(--error)", marginTop: 4 }}>
                {formatINR(netProfitPreGst)}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Total Sales minus COGS &amp; Operating Expenses</div>
            </div>

            <div style={{ padding: "var(--s4)", background: "var(--surface)", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>2. GST Payable (18%)</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: totalGstPayable > 0 ? "#dc2626" : "var(--success)", marginTop: 4 }}>
                - {formatINR(totalGstPayable)}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {totalGstPayable > 0
                  ? `Subtracted from Net Profit to remit on government portal`
                  : activeGstReceivable > 0
                    ? `Purchases > Sales: ${formatINR(activeGstReceivable)} is GST Receivable on portal. Carried forward to offset next month; ₹0 subtracted from profit.`
                    : `No GST liability · ₹0 subtracted from net profit`}
              </div>
            </div>

            <div style={{ padding: "var(--s4)", background: netProfitPostGst >= 0 ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)", borderRadius: "var(--r-md)", border: netProfitPostGst >= 0 ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)" }}>
              <div style={{ fontSize: 11, color: netProfitPostGst >= 0 ? "var(--success)" : "var(--error)", fontWeight: 700, textTransform: "uppercase" }}>3. Net Profit (After GST)</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: netProfitPostGst >= 0 ? "var(--success)" : "var(--error)", marginTop: 4 }}>
                {formatINR(netProfitPostGst)}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {totalGstPayable > 0
                  ? `True distributable earnings after deducting actual GST payable`
                  : `Protected! Fully intact since no GST is payable this period`}
              </div>
            </div>
          </div>
        </div>

        {/* MONTHLY GST BREAKDOWN SECTION */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s3)" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📊 Monthly GST Overview (Different for Each Month)</h2>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "2px 0 0 0" }}>
                Each month has a different GST based on (Sales - Purchases) × 18%. Excess purchase GST is credited on government portal and offsets next month's payable.
              </p>
            </div>
            <div className="chip-bar" style={{ display: "flex", gap: 4, overflowX: "auto", maxWidth: "100%" }}>
              <button
                className={`btn btn-xs ${selectedGstMonth === "all" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setSelectedGstMonth("all")}
              >
                All Months ({monthlyGstList.length})
              </button>
              {monthlyGstList.map((m: any) => (
                <button
                  key={m.month}
                  className={`btn btn-xs ${selectedGstMonth === m.month ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setSelectedGstMonth(m.month)}
                >
                  {m.month}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="table" style={{ width: "100%", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "var(--s3) var(--s4)" }}>Month</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Net Sales</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Net Purchases</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Taxable Base (Sales - Purchase)</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Raw GST (18%)</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Credit Offset</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>GST Payable (Portal)</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Carried to Next Month</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Net Profit (Pre-GST)</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Net Profit (After GST)</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyGstList.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: "var(--s5)", textAlign: "center", color: "var(--muted)" }}>
                      No monthly order data recorded yet.
                    </td>
                  </tr>
                ) : (
                  (selectedGstMonth === "all" ? monthlyGstList : monthlyGstList.filter((m: any) => m.month === selectedGstMonth)).map((m: any) => {
                    const diff = m.net_diff !== undefined ? m.net_diff : (m.sales - m.purchases);
                    const rawGst = m.raw_gst !== undefined ? m.raw_gst : Math.round(diff * 0.18 * 100) / 100;
                    const creditUsed = m.credit_used || 0;
                    const gst = m.gst_payable || 0;
                    const carriedFwd = m.accumulated_credit || 0;
                    const netPre = m.net_profit_before_gst !== undefined ? m.net_profit_before_gst : m.net_profit || 0;
                    const netPost = m.net_profit_after_gst !== undefined ? m.net_profit_after_gst : (netPre - gst);

                    return (
                      <tr key={m.month} style={{ borderBottom: "1px solid var(--divider)" }}>
                        <td style={{ padding: "var(--s3) var(--s4)", fontWeight: 800 }}>
                          {m.month}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right", fontWeight: 700, color: "var(--brand)" }}>
                          {formatINR(m.sales || 0)}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right", color: "var(--warning)", fontWeight: 600 }}>
                          {formatINR(m.purchases || 0)}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right", fontWeight: 600, color: diff >= 0 ? "var(--on-surface)" : "var(--error)" }}>
                          {formatINR(diff)}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right", fontWeight: 700, color: rawGst < 0 ? "var(--info)" : "var(--on-surface)" }}>
                          {rawGst < 0 ? `- ${formatINR(Math.abs(rawGst))}` : `+ ${formatINR(rawGst)}`}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right", color: creditUsed > 0 ? "var(--success)" : "var(--muted)", fontWeight: 600 }}>
                          {creditUsed > 0 ? `- ${formatINR(creditUsed)}` : "—"}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right", fontWeight: 800, color: gst > 0 ? "#dc2626" : "var(--muted)" }}>
                          {formatINR(gst)}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right", fontWeight: 700, color: carriedFwd > 0 ? "var(--info)" : "var(--muted)" }}>
                          {carriedFwd > 0 ? formatINR(carriedFwd) : "—"}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right", fontWeight: 600 }}>
                          {formatINR(netPre)}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right", fontWeight: 800, color: netPost >= 0 ? "var(--success)" : "var(--error)" }}>
                          {formatINR(netPost)}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "center" }}>
                          {gst > 0 ? (
                            <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#dc2626", fontWeight: 700, border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                              🏛️ Tax Payable
                            </span>
                          ) : rawGst < 0 ? (
                            <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#2563eb", fontWeight: 700, border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                              🏛️ GST Receivable
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ fontWeight: 600 }}>
                              ✓ Covered by ITC
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="section-title">Quick Actions</div>
          <div className="quick-actions-grid">
            {quickActions.map(a => (
              <button key={a.label} className="card quick-action-card"
                onClick={() => navigate(a.to)}
              >
                <div className="quick-action-icon">{a.icon}</div>
                <span className="quick-action-label">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* LIVE AVAILABLE GODOWN STOCK SECTION */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s3)" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>📦 Live Godown Inventory & Available Stock</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Current available stock for every model, including backorders & deficit lots</p>
            </div>
            <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center", flexWrap: "wrap", width: "100%", maxWidth: "100%" }}>
              <input
                className="input input-sm"
                style={{ flex: "1 1 180px", minWidth: 140 }}
                placeholder="Search model or SKU…"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
              />
              <div className="chip-bar" style={{ display: "flex", gap: 4, overflowX: "auto", maxWidth: "100%" }}>
                <button
                  className={`btn btn-xs ${stockStatusFilter === "all" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setStockStatusFilter("all")}
                >
                  All ({availableStockList.length})
                </button>
                <button
                  className={`btn btn-xs ${stockStatusFilter === "in" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setStockStatusFilter("in")}
                >
                  In Stock
                </button>
                <button
                  className={`btn btn-xs ${stockStatusFilter === "low" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setStockStatusFilter("low")}
                >
                  Low ({lowCount})
                </button>
                <button
                  className={`btn btn-xs ${stockStatusFilter === "out" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setStockStatusFilter("out")}
                >
                  Out ({outCount})
                </button>
                {negativeCount > 0 && (
                  <button
                    className={`btn btn-xs ${stockStatusFilter === "negative" ? "btn-primary" : "btn-outline"}`}
                    style={stockStatusFilter === "negative" ? { background: "var(--error)", color: "#fff", borderColor: "var(--error)" } : { color: "var(--error)", borderColor: "var(--error)" }}
                    onClick={() => setStockStatusFilter("negative")}
                  >
                    Deficit ({negativeCount})
                  </button>
                )}
                <button className="btn btn-outline btn-xs" onClick={() => navigate("/inventory")}>Full Inventory →</button>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table" style={{ width: "100%", textAlign: "left", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "var(--s3) var(--s4)" }}>TV Model</th>
                  <th className="hide-mobile" style={{ padding: "var(--s3) var(--s4)" }}>Category</th>
                  <th className="hide-mobile" style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Selling Price</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "center" }}>Available Stock</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "center" }}>Status</th>
                  <th style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "var(--s5)", textAlign: "center", color: "var(--muted)" }}>
                      No products match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((p) => {
                    const qty = Number(p.qty_on_hand) || 0;
                    const isNegative = qty < 0;
                    const isLow = qty > 0 && qty <= 2;
                    const isZero = qty === 0;

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: "1px solid var(--divider)",
                          background: isNegative ? "rgba(239, 68, 68, 0.05)" : undefined,
                        }}
                      >
                        <td style={{ padding: "var(--s3) var(--s4)", fontWeight: 700 }}>
                          <div>{p.model}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{p.sku}</div>
                          <div className="show-mobile" style={{ fontSize: 11, color: "var(--brand)", fontWeight: 600, marginTop: 2 }}>
                            {p.category} · {formatINR(p.sell_price)}
                          </div>
                        </td>
                        <td className="hide-mobile" style={{ padding: "var(--s3) var(--s4)", color: "var(--muted)" }}>{p.category}</td>
                        <td className="hide-mobile" style={{ padding: "var(--s3) var(--s4)", textAlign: "right", fontWeight: 600 }}>
                          {formatINR(p.sell_price)}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              fontVariantNumeric: "tabular-nums",
                              color: isNegative ? "var(--error)" : isZero ? "var(--muted)" : isLow ? "var(--warning)" : "var(--success)",
                            }}
                          >
                            {qty} {Math.abs(qty) === 1 ? "unit" : "units"}
                          </span>
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "center" }}>
                          {isNegative ? (
                            <span
                              className="badge badge-error"
                              title={`Sold before purchase lot was logged. Need ${Math.abs(qty)} unit(s) entered.`}
                              style={{ fontWeight: 700 }}
                            >
                              🔴 {qty} (Deficit)
                            </span>
                          ) : isZero ? (
                            <span className="badge badge-error">Out of Stock</span>
                          ) : isLow ? (
                            <span className="badge badge-warning">🟡 Low Stock ({qty})</span>
                          ) : (
                            <span className="badge badge-success">🟢 In Stock</span>
                          )}
                        </td>
                        <td style={{ padding: "var(--s3) var(--s4)", textAlign: "right" }}>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => navigate("/purchases/new")}
                            title="Create purchase order to replenish stock"
                          >
                            + Purchase
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => navigate("/sales/new")}
                            title="Invoice this product"
                          >
                            + Sale
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid-2" style={{ gap: "var(--s5)" }}>
          {/* Stock Alerts (Low & Out of Stock) */}
          <div>
            <div className="section-title">⚠️ Stock Alerts &amp; Reorder Needs</div>
            <div className="card card-flush">
              {availableStockList.filter((p: any) => p.qty_on_hand <= 2).length === 0 ? (
                <div style={{ padding: "var(--s5)", color: "var(--muted)", fontSize: 14 }}>✅ All products are well stocked.</div>
              ) : (
                <>
                  {/* Deficit items: Sold before purchase bill logged */}
                  {availableStockList.filter((p: any) => p.qty_on_hand < 0).map((p: any) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "var(--s3) var(--s4)", borderBottom: "1px solid var(--divider)", gap: "var(--s3)", background: "rgba(239, 68, 68, 0.05)" }}>
                      <span style={{ fontSize: 20 }}>🔴</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--error)" }}>
                          {p.model}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Sold before purchase logged · Deficit of {Math.abs(p.qty_on_hand)} unit(s)</div>
                      </div>
                      <button className="btn btn-primary btn-xs" onClick={() => navigate("/purchases/new")}>
                        + Enter Purchase
                      </button>
                    </div>
                  ))}

                  {/* Low / Out of stock items */}
                  {availableStockList.filter((p: any) => p.qty_on_hand >= 0 && p.qty_on_hand <= 2).map((p: any) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "var(--s3) var(--s4)", borderBottom: "1px solid var(--divider)", gap: "var(--s3)" }}>
                      <span style={{ fontSize: 20 }}>{p.qty_on_hand === 0 ? "⚪" : "🟡"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.model}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.sku}</div>
                      </div>
                      <span className={`badge ${p.qty_on_hand === 0 ? "badge-error" : "badge-warning"}`}>
                        {p.qty_on_hand === 0 ? "Out of Stock" : `${p.qty_on_hand} in stock`}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s4)" }}>
              <div className="section-title" style={{ marginBottom: 0 }}>🧾 Recent Sales</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate("/sales")}>See all →</button>
            </div>
            <div className="card card-flush">
              {data.recent_sales?.length === 0 ? (
                <div style={{ padding: "var(--s5)", color: "var(--muted)", fontSize: 14 }}>No sales recorded yet.</div>
              ) : (
                data.recent_sales?.map((o: any, i: number) => (
                  <div key={o.id} onClick={() => navigate(`/sales/${o.id}`)}
                    style={{ display: "flex", alignItems: "center", padding: "var(--s3) var(--s4)", borderBottom: i < data.recent_sales.length - 1 ? "1px solid var(--divider)" : "none", gap: "var(--s3)", cursor: "pointer" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.party_name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
                        <span>{o.ref_no || "No ref"} · {shortDate(o.date)}</span>
                        <span>· {o.credit_days ?? 15}d credit</span>
                      </div>
                      {o.balance > 0.5 ? (
                        <div style={{ marginTop: 4 }}>
                          {o.is_due_passed ? (
                            <span className="badge" style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #f87171", fontWeight: 800, fontSize: 10 }}>
                              🔴 Due date passed ({Math.abs(o.days_left)}d overdue)
                            </span>
                          ) : o.days_left === 0 ? (
                            <span className="badge" style={{ background: "#fef3c7", color: "#b45309", fontWeight: 700, fontSize: 10 }}>
                              ⚠️ Due today
                            </span>
                          ) : (
                            <span className="badge" style={{ background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: 10 }}>
                              ⏳ {o.days_left}d left · Due {shortDate(o.due_date)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={{ marginTop: 3 }}>
                          <span className="badge badge-success" style={{ fontSize: 10 }}>✓ Cleared</span>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                      <span style={{ fontWeight: 800, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{formatINR(o.total)}</span>
                      <PayBadge status={o.pay_status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
