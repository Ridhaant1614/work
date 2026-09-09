import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { Spinner, EmptyState } from "../ui";
import { formatINR, formatINRCompact } from "../format";

export default function Reports() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports"],
    queryFn: () => apiGet("/reports"),
  });

  if (isLoading) return <div className="page-body"><Spinner /></div>;
  if (isError || !data) {
    return (
      <div className="page-body">
        <EmptyState
          icon="⚠️"
          title="Failed to load reports"
          subtitle="Please check your connection and try again"
          action="Retry"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  const {
    summary = {},
    sales_by_month = {},
    purchases_by_month = {},
    top_products = [],
    expense_by_category = {},
    overdue_receivables = [],
    overdue_payables = [],
  } = data;

  const totalSales = summary.total_sales || 0;
  const cogs = summary.cogs || 0;
  const grossProfit = summary.gross_profit || (totalSales - cogs);
  const totalExpenses = summary.total_expenses || 0;
  const netProfit = summary.net_profit || (grossProfit - totalExpenses);
  const grossMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : "0.0";
  const netMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";

  // Months sorted
  const allMonths = Array.from(
    new Set([...Object.keys(sales_by_month), ...Object.keys(purchases_by_month)])
  ).filter((m) => m !== "unknown").sort();

  const maxMonthVal = Math.max(
    ...allMonths.map((m) => Math.max(sales_by_month[m] || 0, purchases_by_month[m] || 0)),
    1000
  );

  const maxProductQty = Math.max(...top_products.map((p: any) => p.qty || 0), 1);

  const totalExpCalc = Object.values(expense_by_category).reduce(
    (a: number, b: any) => a + Number(b),
    0
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Financial & Business Reports</h1>
          <p>Comprehensive profit analysis, aging receivables, and inventory performance</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨️ Print Report</button>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>
        {/* P&L Statement Waterfall */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Profit & Loss Overview (YTD)</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Standard distribution accounting statement</p>
            </div>
            <div style={{ display: "flex", gap: "var(--s3)" }}>
              <div className="badge badge-brand">Gross Margin: {grossMargin}%</div>
              <div className={`badge ${netProfit >= 0 ? "badge-success" : "badge-error"}`}>
                Net Margin: {netMargin}%
              </div>
            </div>
          </div>
          <div style={{ padding: "var(--s4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--s4)" }}>
              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Revenue (Sales)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--brand)", marginTop: 4 }}>{formatINR(totalSales)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{summary.sales_count || 0} invoices cleared / billed</div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Cost of Goods (COGS)</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--on-surface)", marginTop: 4 }}>{formatINR(cogs)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Direct unit acquisition cost</div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Gross Profit</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--success)", marginTop: 4 }}>{formatINR(grossProfit)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Revenue minus unit cost</div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Operating Expenses</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--warning)", marginTop: 4 }}>{formatINR(totalExpenses)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Transport, rent, salaries, utilities</div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: netProfit >= 0 ? "var(--success-bg)" : "var(--error-bg)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Net Profit</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: netProfit >= 0 ? "var(--success)" : "var(--error)", marginTop: 4 }}>
                  {formatINR(netProfit)}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Bottom line distribution earnings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Comparison and Top Products Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--s6)" }}>
          {/* Monthly Sales vs Purchases Bars */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Monthly Volume (Sales vs Purchases)</h2>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Track stock inflow and distribution outflow</p>
              </div>
            </div>
            <div style={{ padding: "var(--s4)", display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
              {allMonths.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>No monthly transaction history yet.</p>
              ) : (
                allMonths.map((m) => {
                  const sVal = sales_by_month[m] || 0;
                  const pVal = purchases_by_month[m] || 0;
                  const sPct = Math.min(100, Math.round((sVal / maxMonthVal) * 100));
                  const pPct = Math.min(100, Math.round((pVal / maxMonthVal) * 100));

                  return (
                    <div key={m} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                        <span>{m}</span>
                        <span style={{ color: "var(--muted)" }}>
                          Sales: <strong style={{ color: "var(--brand)" }}>{formatINR(sVal)}</strong> | PO:{" "}
                          <strong style={{ color: "var(--warning)" }}>{formatINR(pVal)}</strong>
                        </span>
                      </div>
                      {/* Sales Bar */}
                      <div style={{ background: "var(--surface-3)", height: 10, borderRadius: 5, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${sPct}%`, background: "var(--brand)", transition: "width 0.4s" }} />
                      </div>
                      {/* Purchases Bar */}
                      <div style={{ background: "var(--surface-3)", height: 6, borderRadius: 3, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${pPct}%`, background: "var(--warning)", transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })
              )}
              <div style={{ display: "flex", gap: "var(--s4)", marginTop: "var(--s2)", fontSize: 12, color: "var(--muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: "var(--brand)" }} /> Sales
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: "var(--warning)" }} /> Purchases
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Products Leaderboard */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Top Selling TV Models</h2>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Highest volume products moved</p>
              </div>
            </div>
            <div style={{ padding: "var(--s4)", display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
              {top_products.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>No sales recorded yet.</p>
              ) : (
                top_products.map((p: any, idx: number) => {
                  const pct = Math.min(100, Math.round((p.qty / maxProductQty) * 100));
                  return (
                    <div key={p.model} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>
                          #{idx + 1} {p.model}
                        </span>
                        <span style={{ fontWeight: 700, color: "var(--brand)" }}>{p.qty} units sold</span>
                      </div>
                      <div style={{ background: "var(--surface-3)", height: 8, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, background: "var(--brand)", height: "100%", transition: "width 0.4s" }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Expense Allocation by Category</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Operational overhead distribution</p>
            </div>
            <div className="badge badge-brand">Total: {formatINR(totalExpCalc)}</div>
          </div>
          <div style={{ padding: "var(--s4)" }}>
            {Object.keys(expense_by_category).length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>No expense entries recorded.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--s4)" }}>
                {Object.entries(expense_by_category).map(([cat, amount]: [string, any]) => {
                  const share = totalExpCalc > 0 ? ((amount / totalExpCalc) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={cat}
                      style={{
                        padding: "var(--s3) var(--s4)",
                        borderRadius: "var(--r-md)",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ fontWeight: 700 }}>{cat}</span>
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>{share}%</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--warning)" }}>
                        {formatINR(Number(amount))}
                      </div>
                      <div style={{ background: "var(--surface-3)", height: 6, borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                        <div style={{ width: `${share}%`, background: "var(--warning)", height: "100%" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Aging Overdue Tables (Receivables & Payables) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--s6)" }}>
          {/* Overdue Receivables */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Overdue Dealer Receivables</h2>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Uncollected sales balances sorted by age</p>
              </div>
              <div className="badge badge-error">Outstanding: {formatINR(summary.receivable || 0)}</div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Dealer</th>
                    <th>Invoice</th>
                    <th>Aging</th>
                    <th className="num">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue_receivables.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--s6)" }}>
                        🎉 No overdue receivables! All dealers are fully cleared.
                      </td>
                    </tr>
                  ) : (
                    overdue_receivables.map((r: any) => (
                      <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/sales/${r.id}`)}>
                        <td style={{ fontWeight: 600 }}>{r.party_name || "Unknown"}</td>
                        <td><span className="mono" style={{ fontSize: 12 }}>{r.ref_no || "—"}</span></td>
                        <td>
                          <span className={`badge ${r.age_days > 30 ? "badge-error" : r.age_days > 15 ? "badge-warning" : "badge-info"}`}>
                            {r.age_days} days
                          </span>
                        </td>
                        <td className="num" style={{ fontWeight: 700, color: "var(--error)" }}>
                          {formatINR(r.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overdue Payables */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>Supplier Payables</h2>
                <p style={{ color: "var(--muted)", fontSize: 13 }}>Unsettled purchase orders sorted by age</p>
              </div>
              <div className="badge badge-warning">Outstanding: {formatINR(summary.payable || 0)}</div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Ref No</th>
                    <th>Aging</th>
                    <th className="num">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue_payables.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--s6)" }}>
                        🎉 No outstanding supplier bills!
                      </td>
                    </tr>
                  ) : (
                    overdue_payables.map((r: any) => (
                      <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/purchases/${r.id}`)}>
                        <td style={{ fontWeight: 600 }}>{r.party_name || "Supplier"}</td>
                        <td><span className="mono" style={{ fontSize: 12 }}>{r.ref_no || "—"}</span></td>
                        <td>
                          <span className={`badge ${r.age_days > 30 ? "badge-error" : r.age_days > 15 ? "badge-warning" : "badge-info"}`}>
                            {r.age_days} days
                          </span>
                        </td>
                        <td className="num" style={{ fontWeight: 700, color: "var(--warning)" }}>
                          {formatINR(r.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
