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

  const kpis = [
    { label: "Total Sales", value: formatINRCompact(data.total_sales), icon: "📈", color: "var(--brand)", bg: "var(--brand-ter)" },
    { label: "Net Profit", value: formatINRCompact(data.net_profit), icon: "💹", color: data.net_profit >= 0 ? "var(--success)" : "var(--error)", bg: data.net_profit >= 0 ? "var(--success-bg)" : "var(--error-bg)" },
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
            </div>
          ))}
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
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{o.ref_no || "No ref"} · {shortDate(o.date)}</div>
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
