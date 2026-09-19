import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api";
import { Spinner, EmptyState } from "../ui";
import { formatINR, formatINRCompact } from "../format";

const PALETTE = [
  "#0ea5e9", // Sky blue
  "#10b981", // Emerald green
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#ef4444", // Red
];

export default function Reports() {
  const navigate = useNavigate();
  const [chartMetric, setChartMetric] = useState<"units" | "revenue">("units");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    label: string;
    series: string;
    value: string;
  } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports"],
    queryFn: () => apiGet("/reports"),
  });

  // Extract backend/mockData results
  const summary = data?.summary || {};
  const salesByMonth: Record<string, number> = data?.sales_by_month || {};
  const purchasesByMonth: Record<string, number> = data?.purchases_by_month || {};
  const salesUnitsByMonth: Record<string, number> = data?.sales_units_by_month || {};
  const modelSeries: any[] = data?.model_series || [];
  const monthlyBreakdown: any[] = data?.monthly_breakdown || [];
  const momComparison = data?.mom_comparison || null;
  const expenseByCategory: Record<string, number> = data?.expense_by_category || {};
  const overdueReceivables: any[] = data?.overdue_receivables || [];
  const overduePayables: any[] = data?.overdue_payables || [];

  // Determine chronological list of months
  const allMonths = useMemo(() => {
    if (data?.month_keys && data.month_keys.length > 0) {
      return data.month_keys;
    }
    const set = new Set([...Object.keys(salesByMonth), ...Object.keys(purchasesByMonth)]);
    const arr = Array.from(set).filter((m) => m && m !== "unknown").sort();
    return arr.length > 0 ? arr : [new Date().toISOString().slice(0, 7)];
  }, [data?.month_keys, salesByMonth, purchasesByMonth]);

  // Set default selected models once loaded
  React.useEffect(() => {
    if (modelSeries.length > 0 && selectedModels.length === 0) {
      // Pick top 4 models by volume initially
      setSelectedModels(modelSeries.slice(0, 4).map((m: any) => m.model));
    }
  }, [modelSeries, selectedModels.length]);

  if (isLoading) return <div className="page-body"><Spinner /></div>;
  if (isError || !data) {
    return (
      <div className="page-body">
        <EmptyState
          icon="⚠️"
          title="Failed to load analytics"
          subtitle="Please check your connection and try again"
          action="Retry"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  const totalSales = summary.total_sales || 0;
  const cogs = summary.cogs || 0;
  const grossProfit = summary.gross_profit || (totalSales - cogs);
  const totalExpenses = summary.total_expenses || 0;
  const netProfit = summary.net_profit || (grossProfit - totalExpenses);
  const grossMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : "0.0";
  const netMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";

  const totalExpCalc = Object.values(expenseByCategory).reduce(
    (a: number, b: any) => a + Number(b),
    0
  );

  // Prepare line chart coordinates
  const svgWidth = 800;
  const svgHeight = 300;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Active series for the chart based on selected metric
  const activeSeriesList = selectedModels.map((modelName, idx) => {
    const found = modelSeries.find((s: any) => s.model === modelName);
    const color = PALETTE[idx % PALETTE.length];
    const points = allMonths.map((m: string) => {
      if (chartMetric === "units") {
        return found?.monthly_data?.[m]?.qty || 0;
      }
      return found?.monthly_data?.[m]?.amount || 0;
    });
    return {
      model: modelName,
      color,
      points,
    };
  });

  // Calculate max Y for scaling
  const allYValues = activeSeriesList.flatMap((s) => s.points);
  const maxY = Math.max(...allYValues, chartMetric === "units" ? 5 : 10000);

  const getX = (index: number) => {
    if (allMonths.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (allMonths.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    return padding.top + plotHeight - (val / maxY) * plotHeight;
  };

  function toggleModel(model: string) {
    if (selectedModels.includes(model)) {
      if (selectedModels.length === 1) return; // keep at least one
      setSelectedModels(selectedModels.filter((m) => m !== model));
    } else {
      setSelectedModels([...selectedModels, model]);
    }
  }

  function selectAllModels() {
    setSelectedModels(modelSeries.map((m: any) => m.model));
  }

  function resetToTopModels() {
    setSelectedModels(modelSeries.slice(0, 4).map((m: any) => m.model));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics & Financial Reports</h1>
          <p>Monthly sales trends, model sales comparisons, and distribution performance</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨️ Print Report</button>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>

        {/* 1. MONTH-OVER-MONTH (MoM) COMPARISON CARDS */}
        {momComparison ? (
          <div>
            <div className="section-title">📊 Month-over-Month (MoM) Comparison Analysis</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--s4)" }}>
              {/* Sales Revenue MoM */}
              <div className="card" style={{ padding: "var(--s4)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
                  Sales Revenue ({momComparison.current_month})
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", marginTop: 4 }}>
                  {formatINR(momComparison.current_sales)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 13 }}>
                  <span
                    className={`badge ${momComparison.sales_growth_pct >= 0 ? "badge-success" : "badge-error"}`}
                    style={{ fontWeight: 700 }}
                  >
                    {momComparison.sales_growth_pct >= 0 ? `▲ +${momComparison.sales_growth_pct}%` : `▼ ${momComparison.sales_growth_pct}%`}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>vs prev ({formatINR(momComparison.previous_sales)})</span>
                </div>
              </div>

              {/* Units Sold MoM */}
              <div className="card" style={{ padding: "var(--s4)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
                  TV Units Sold ({momComparison.current_month})
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--on-surface)", marginTop: 4 }}>
                  {momComparison.current_units} units
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 13 }}>
                  <span
                    className={`badge ${momComparison.units_growth_pct >= 0 ? "badge-success" : "badge-error"}`}
                    style={{ fontWeight: 700 }}
                  >
                    {momComparison.units_growth_pct >= 0 ? `▲ +${momComparison.units_growth_pct}%` : `▼ ${momComparison.units_growth_pct}%`}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>vs prev ({momComparison.previous_units} units)</span>
                </div>
              </div>

              {/* Gross Margin MoM */}
              <div className="card" style={{ padding: "var(--s4)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
                  Gross Profit ({momComparison.current_month})
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--success)", marginTop: 4 }}>
                  {formatINR(momComparison.current_profit)}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                  Direct margin on dispatched TV models
                </div>
              </div>

              {/* Average Order Value */}
              <div className="card" style={{ padding: "var(--s4)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>
                  Avg Sales Per Invoice
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--warning)", marginTop: 4 }}>
                  {formatINR(summary.sales_count > 0 ? Math.round(totalSales / summary.sales_count) : 0)}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                  Across {summary.sales_count || 0} total sale invoices
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 2. INTERACTIVE MULTI-MODEL SALES LINE GRAPH OVER MONTHS */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s3)" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>📈 Model Sales Trends Over the Months</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Line graph tracking which TV model was sold and how much across every recorded month
              </p>
            </div>
            <div style={{ display: "flex", gap: "var(--s3)", alignItems: "center", flexWrap: "wrap" }}>
              {/* Metric Toggle */}
              <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 2 }}>
                <button
                  type="button"
                  className={`btn btn-xs ${chartMetric === "units" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setChartMetric("units")}
                >
                  Units Sold
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${chartMetric === "revenue" ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setChartMetric("revenue")}
                >
                  Revenue (₹)
                </button>
              </div>

              {/* Selection actions */}
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-outline btn-xs" onClick={selectAllModels}>Select All</button>
                <button className="btn btn-outline btn-xs" onClick={resetToTopModels}>Top 4</button>
              </div>
            </div>
          </div>

          {/* Model Selector Pills */}
          <div style={{ padding: "var(--s3) var(--s4)", borderBottom: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginRight: 4 }}>Models:</span>
            {modelSeries.map((ms: any, idx: number) => {
              const active = selectedModels.includes(ms.model);
              const color = PALETTE[idx % PALETTE.length];
              return (
                <button
                  key={ms.model}
                  type="button"
                  onClick={() => toggleModel(ms.model)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all .15s",
                    border: `1.5px solid ${active ? color : "var(--border)"}`,
                    background: active ? `${color}18` : "transparent",
                    color: active ? "var(--on-surface)" : "var(--muted)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: active ? color : "var(--muted)",
                    }}
                  />
                  <span>{ms.model}</span>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>({ms.total_units})</span>
                </button>
              );
            })}
          </div>

          {/* SVG Line Graph Container */}
          <div style={{ padding: "var(--s4)", overflowX: "auto", position: "relative" }}>
            {allMonths.length === 0 || activeSeriesList.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", padding: "var(--s6)" }}>
                No sales data available to chart. Record sales orders to view trends.
              </p>
            ) : (
              <div style={{ minWidth: 640 }}>
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding.top + plotHeight * (1 - ratio);
                    const val = ratio * maxY;
                    return (
                      <g key={ratio}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={padding.left + plotWidth}
                          y2={y}
                          stroke="var(--border)"
                          strokeDasharray={ratio > 0 && ratio < 1 ? "4 4" : undefined}
                          strokeWidth={1}
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 4}
                          textAnchor="end"
                          fontSize={11}
                          fill="var(--muted)"
                          fontFamily="sans-serif"
                        >
                          {chartMetric === "units" ? Math.round(val) : formatINRCompact(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* X Axis Month Labels */}
                  {allMonths.map((m: string, idx: number) => {
                    const x = getX(idx);
                    return (
                      <g key={m}>
                        <line
                          x1={x}
                          y1={padding.top + plotHeight}
                          x2={x}
                          y2={padding.top + plotHeight + 6}
                          stroke="var(--border)"
                          strokeWidth={1.5}
                        />
                        <text
                          x={x}
                          y={padding.top + plotHeight + 20}
                          textAnchor="middle"
                          fontSize={12}
                          fontWeight={600}
                          fill="var(--on-surface-2)"
                          fontFamily="sans-serif"
                        >
                          {m}
                        </text>
                      </g>
                    );
                  })}

                  {/* Series Lines & Circles */}
                  {activeSeriesList.map((series) => {
                    const pointsStr = series.points
                      .map((val: number, idx: number) => `${getX(idx)},${getY(val)}`)
                      .join(" ");

                    return (
                      <g key={series.model}>
                        {/* Polyline */}
                        <polyline
                          fill="none"
                          stroke={series.color}
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={pointsStr}
                          style={{ transition: "all .3s" }}
                        />

                        {/* Interactive Data Dots */}
                        {series.points.map((val: number, idx: number) => {
                          const cx = getX(idx);
                          const cy = getY(val);
                          const monthLabel = allMonths[idx];
                          const formattedVal =
                            chartMetric === "units"
                              ? `${val} units`
                              : formatINR(val);

                          const pointData = {
                            x: cx,
                            y: cy,
                            label: monthLabel,
                            series: series.model,
                            value: formattedVal,
                          };

                          return (
                            <g key={`${series.model}-${idx}`}>
                              {/* Invisible larger hit target for comfortable mobile touches */}
                              <circle
                                cx={cx}
                                cy={cy}
                                r={14}
                                fill="transparent"
                                style={{ cursor: "pointer" }}
                                onClick={() => setHoveredPoint(pointData)}
                                onTouchStart={() => setHoveredPoint(pointData)}
                                onMouseEnter={() => setHoveredPoint(pointData)}
                              />
                              {/* Visible data point */}
                              <circle
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill="#fff"
                                stroke={series.color}
                                strokeWidth={2.5}
                                style={{ cursor: "pointer", transition: "r .2s", pointerEvents: "none" }}
                              />
                            </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip */}
                {hoveredPoint && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                      top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                      transform: "translate(-50%, -120%)",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-md, 0 4px 12px rgba(0,0,0,0.15))",
                      borderRadius: "var(--r-md)",
                      padding: "6px 12px",
                      pointerEvents: "none",
                      fontSize: 12,
                      zIndex: 10,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "var(--on-surface)" }}>{hoveredPoint.series}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>{hoveredPoint.label}</div>
                    <div style={{ fontWeight: 800, color: "var(--brand)", marginTop: 2 }}>{hoveredPoint.value}</div>
                  </div>
                )}
              </div>
            )}
            <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 8 }}>
              💡 Tip: On phones, swipe horizontally across the chart. Tap any point to view exact sales units &amp; revenue.
            </div>
          </div>
        </div>

        {/* 3. EVERY MONTH SALES BREAKDOWN TABLE */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>📅 Every Month Sales & Operational Ledger</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Chronological breakdown of sales, purchase volumes, and gross profit by month</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: "right" }}>Sales Revenue</th>
                  <th style={{ textAlign: "right" }}>Units Sold</th>
                  <th style={{ textAlign: "right" }}>Purchases (PO)</th>
                  <th style={{ textAlign: "right" }}>COGS</th>
                  <th style={{ textAlign: "right" }}>Gross Profit</th>
                  <th style={{ textAlign: "right" }}>Margin</th>
                  <th>Top Selling Model</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--s5)" }}>
                      No monthly transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  monthlyBreakdown.map((mb: any) => {
                    const marginPct = mb.sales > 0 ? ((mb.gross_profit / mb.sales) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={mb.month}>
                        <td style={{ fontWeight: 700 }}>{mb.month}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--brand)" }}>
                          {formatINR(mb.sales)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{mb.units} units</td>
                        <td style={{ textAlign: "right", color: "var(--warning)" }}>{formatINR(mb.purchases)}</td>
                        <td style={{ textAlign: "right", color: "var(--muted)" }}>{formatINR(mb.cogs)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: mb.gross_profit >= 0 ? "var(--success)" : "var(--error)" }}>
                          {formatINR(mb.gross_profit)}
                        </td>
                        <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 600 }}>{marginPct}%</td>
                        <td>
                          <span className="badge" style={{ background: "var(--surface-2)", color: "var(--on-surface)", fontWeight: 600 }}>
                            {mb.top_model || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. MODEL SALES BREAKDOWN MATRIX (Which model was sold and how much each month) */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>🏷️ Model-by-Month Sales Breakdown</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Complete matrix of units sold per TV model across each month</p>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>TV Model</th>
                  {allMonths.map((m: string) => (
                    <th key={m} style={{ textAlign: "center" }}>{m}</th>
                  ))}
                  <th style={{ textAlign: "right" }}>Total Units</th>
                  <th style={{ textAlign: "right" }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {modelSeries.length === 0 ? (
                  <tr>
                    <td colSpan={allMonths.length + 3} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--s5)" }}>
                      No model sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  modelSeries.map((ms: any) => (
                    <tr key={ms.model}>
                      <td style={{ fontWeight: 700 }}>{ms.model}</td>
                      {allMonths.map((m: string) => {
                        const cell = ms.monthly_data?.[m];
                        const qty = cell?.qty || 0;
                        return (
                          <td key={m} style={{ textAlign: "center" }}>
                            {qty > 0 ? (
                              <span
                                className="badge badge-brand"
                                style={{ fontWeight: 700 }}
                                title={`${formatINR(cell.amount)} in ${m}`}
                              >
                                {qty} units
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted)", opacity: 0.4 }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: "right", fontWeight: 800, color: "var(--brand)" }}>
                        {ms.total_units}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {formatINR(ms.total_revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. P&L STATEMENT WATERFALL */}
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
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{summary.sales_count || 0} invoices recorded</div>
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

        {/* 6. EXPENSE ALLOCATION & AGING ACCOUNTS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "var(--s6)" }}>
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
              {Object.keys(expenseByCategory).length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>No expense entries recorded.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--s4)" }}>
                  {Object.entries(expenseByCategory).map(([cat, amount]: [string, any]) => {
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
                  {overdueReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--s6)" }}>
                        🎉 No overdue receivables! All dealers are fully cleared.
                      </td>
                    </tr>
                  ) : (
                    overdueReceivables.map((r: any) => (
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
        </div>

      </div>
    </div>
  );
}
