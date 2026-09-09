import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { useAuth } from "../auth";
import { PayBadge, Spinner } from "../ui";
import { formatINR, formatINRCompact, shortDate } from "../format";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => apiGet("/dashboard") });

  if (isLoading) return <div className="page-body"><Spinner /></div>;
  if (isError) return (
    <div className="page-body">
      <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Failed to load</h3><button className="btn btn-primary btn-sm" onClick={() => refetch()}>Retry</button></div>
    </div>
  );

  const kpis = [
    { label: "Total Sales", value: formatINRCompact(data.total_sales), icon: "📈", color: "var(--brand)", bg: "var(--brand-ter)" },
    { label: "Net Profit", value: formatINRCompact(data.net_profit), icon: "💹", color: data.net_profit >= 0 ? "var(--success)" : "var(--error)", bg: data.net_profit >= 0 ? "var(--success-bg)" : "var(--error-bg)" },
    { label: "Receivable", value: formatINRCompact(data.receivable), icon: "💰", color: "var(--info)", bg: "var(--info-bg)" },
    { label: "Payable", value: formatINRCompact(data.payable), icon: "🧾", color: "var(--warning)", bg: "var(--warning-bg)" },
    { label: "Inventory Value", value: formatINRCompact(data.inventory_value), icon: "📦", color: "var(--on-surface-2)", bg: "var(--surface-3)" },
    { label: "Units in Stock", value: String(data.units_in_stock), icon: "🏷️", color: "var(--on-surface-2)", bg: "var(--surface-3)" },
  ];

  const quickActions = [
    { label: "New Sale", icon: "🧾", to: "/sales/new" },
    { label: "New Purchase", icon: "📦", to: "/purchases/new" },
    { label: "Add Expense", icon: "💳", to: "/expenses" },
    { label: "Inventory", icon: "📊", to: "/inventory" },
    { label: "Dealers", icon: "🏪", to: "/dealers" },
    { label: "Reports", icon: "📈", to: "/reports" },
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
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <div className="section-title">Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "var(--s3)" }}>
            {quickActions.map(a => (
              <button key={a.label} className="card" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--s2)", padding: "var(--s5)", transition: "box-shadow .2s, transform .2s", border: "1px solid var(--border)", background: "var(--surface)" }}
                onClick={() => navigate(a.to)}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = ""; (e.currentTarget as HTMLElement).style.transform = ""; }}
              >
                <div style={{ fontSize: 28, width: 50, height: 50, borderRadius: "var(--r-md)", background: "var(--brand-ter)", display: "flex", alignItems: "center", justifyContent: "center" }}>{a.icon}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--on-surface-2)", textAlign: "center" }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s5)" }}>
          {/* Low Stock Alerts */}
          <div>
            <div className="section-title">⚠️ Low Stock Alerts</div>
            <div className="card card-flush">
              {data.low_stock?.length === 0 ? (
                <div style={{ padding: "var(--s5)", color: "var(--muted)", fontSize: 14 }}>✅ All products are well stocked.</div>
              ) : (
                data.low_stock?.map((p: any) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", padding: "var(--s3) var(--s4)", borderBottom: "1px solid var(--divider)", gap: "var(--s3)" }}>
                    <span style={{ fontSize: 20 }}>{p.qty_on_hand <= 0 ? "🔴" : "🟡"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.model}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.sku}</div>
                    </div>
                    <span className={`badge ${p.qty_on_hand <= 0 ? "badge-error" : "badge-warning"}`}>{p.qty_on_hand <= 0 ? "Out" : `${p.qty_on_hand} left`}</span>
                  </div>
                ))
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
