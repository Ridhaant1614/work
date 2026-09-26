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
  const [timeRange, setTimeRange] = useState<"all" | "6m" | "3m" | "1m">("all");
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
  const topDealers: any[] = data?.top_dealers || [];
  const categoryBreakdown: any[] = data?.category_breakdown || [];
  const executiveKpis = data?.executive_kpis || null;
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

  // Filtered months according to active time range
  const filteredMonths = useMemo(() => {
    if (timeRange === "1m") return allMonths.slice(-1);
    if (timeRange === "3m") return allMonths.slice(-3);
    if (timeRange === "6m") return allMonths.slice(-6);
    return allMonths;
  }, [allMonths, timeRange]);

  const filteredMonthlyBreakdown = useMemo(() => {
    return monthlyBreakdown.filter((mb: any) => filteredMonths.includes(mb.month));
  }, [monthlyBreakdown, filteredMonths]);

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
  const totalPurchases = summary.total_purchases || 0;
  const totalGstPayable = summary.gst_payable !== undefined ? summary.gst_payable : Math.max(0, Math.round((totalSales - totalPurchases) * 0.18 * 100) / 100);
  const netProfitAfterGst = summary.net_profit_after_gst !== undefined ? summary.net_profit_after_gst : (netProfit - totalGstPayable);
  const grossMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : "0.0";
  const netMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";
  const netMarginAfterGst = totalSales > 0 ? ((netProfitAfterGst / totalSales) * 100).toFixed(1) : "0.0";

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

  // Active series for the chart based on selected metric and filtered months
  const activeSeriesList = selectedModels.map((modelName, idx) => {
    const found = modelSeries.find((s: any) => s.model === modelName);
    const color = PALETTE[idx % PALETTE.length];
    const points = filteredMonths.map((m: string) => {
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
    if (filteredMonths.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (filteredMonths.length - 1)) * plotWidth;
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

  function downloadCSV(filename: string, rows: (string | number)[][]) {
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportMonthlyLedgerCSV() {
    const headers = [
      "Month",
      "Sales Revenue (INR)",
      "Units Sold",
      "Purchases PO (INR)",
      "COGS (INR)",
      "Gross Profit (INR)",
      "Margin Pct",
      "GST Payable 18% (INR)",
      "Net Profit After GST (INR)",
      "Top Selling Model"
    ];
    const rows = filteredMonthlyBreakdown.map((mb: any) => {
      const diff = mb.net_diff !== undefined ? mb.net_diff : (mb.sales - mb.purchases);
      const gst = mb.gst_payable !== undefined ? mb.gst_payable : Math.max(0, Math.round(diff * 0.18 * 100) / 100);
      const netPre = mb.net_profit_before_gst !== undefined ? mb.net_profit_before_gst : mb.net_profit || 0;
      const netPost = mb.net_profit_after_gst !== undefined ? mb.net_profit_after_gst : (netPre - gst);

      return [
        mb.month,
        mb.sales,
        mb.units,
        mb.purchases,
        mb.cogs,
        mb.gross_profit,
        mb.sales > 0 ? ((mb.gross_profit / mb.sales) * 100).toFixed(1) + "%" : "0.0%",
        gst,
        netPost,
        `"${(mb.top_model || '').replace(/"/g, '""')}"`
      ];
    });
    downloadCSV("Soneja_Monthly_Ledger.csv", [headers, ...rows]);
  }

  function exportModelMatrixCSV() {
    const headers = ["TV Model", ...filteredMonths, "Total Units", "Total Revenue (INR)"];
    const rows = modelSeries.map((ms: any) => [
      `"${(ms.model || '').replace(/"/g, '""')}"`,
      ...filteredMonths.map((m: string) => ms.monthly_data?.[m]?.qty || 0),
      ms.total_units,
      ms.total_revenue
    ]);
    downloadCSV("Soneja_Model_Sales_Matrix.csv", [headers, ...rows]);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics & Financial Reports</h1>
          <p>Monthly sales trends, model sales comparisons, dealer performance &amp; financial analytics</p>
        </div>
        <div className="page-header-actions" style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨️ Print Report</button>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>

        {/* TIME-RANGE SELECTOR BAR */}
        <div
          className="card"
          style={{
            padding: "var(--s3) var(--s4)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--s3)",
            background: "var(--surface)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>⏱️ Time Horizon:</span>
            <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: "var(--r-md)", padding: 3, gap: 2 }}>
              {(
                [
                  { key: "all", label: "All Time" },
                  { key: "6m", label: "Last 6 Months" },
                  { key: "3m", label: "Last 3 Months" },
                  { key: "1m", label: "Current Month" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`btn btn-xs ${timeRange === t.key ? "btn-primary" : "btn-ghost"}`}
                  style={{ borderRadius: "var(--r-sm)", fontWeight: 600 }}
                  onClick={() => setTimeRange(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-outline btn-xs" onClick={exportMonthlyLedgerCSV}>
              📥 Export Ledger CSV
            </button>
            <button className="btn btn-outline btn-xs" onClick={exportModelMatrixCSV}>
              📥 Export Matrix CSV
            </button>
          </div>
        </div>

        {/* EXECUTIVE DISTRIBUTION HIGHLIGHTS */}
        {executiveKpis && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--s4)" }}>
            <div className="card" style={{ padding: "var(--s4)", borderLeft: "4px solid var(--brand)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px" }}>
                🏆 Top Model By Volume
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)", marginTop: 4 }}>
                {executiveKpis.top_model_by_volume ? executiveKpis.top_model_by_volume.model : "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {executiveKpis.top_model_by_volume ? `${executiveKpis.top_model_by_volume.units} units sold` : "No sales yet"}
              </div>
            </div>

            <div className="card" style={{ padding: "var(--s4)", borderLeft: "4px solid var(--success)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px" }}>
                💎 Highest Grossing Model
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--success)", marginTop: 4 }}>
                {executiveKpis.top_model_by_revenue ? executiveKpis.top_model_by_revenue.model : "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {executiveKpis.top_model_by_revenue ? formatINR(executiveKpis.top_model_by_revenue.revenue) : "₹0"} in gross revenue
              </div>
            </div>

            <div className="card" style={{ padding: "var(--s4)", borderLeft: "4px solid var(--warning)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px" }}>
                💳 Average Invoice Value (AOV)
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--warning)", marginTop: 4 }}>
                {formatINR(executiveKpis.avg_order_value)}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Across {summary.sales_count || 0} wholesale dealer dispatches
              </div>
            </div>

            <div className="card" style={{ padding: "var(--s4)", borderLeft: "4px solid #8b5cf6" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px" }}>
                📈 Cash Collection Efficiency
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#8b5cf6", marginTop: 4 }}>
                {executiveKpis.collection_rate}%
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                {formatINR(executiveKpis.total_collected)} collected of {formatINR(totalSales)}
              </div>
            </div>
          </div>
        )}

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
            {filteredMonths.length === 0 || activeSeriesList.length === 0 ? (
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
                  {filteredMonths.map((m: string, idx: number) => {
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
                          const monthLabel = filteredMonths[idx];
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
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s3)" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>📅 Every Month Sales & Operational Ledger</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Chronological breakdown of sales, purchase volumes, and gross profit by month</p>
            </div>
            <button className="btn btn-outline btn-xs" onClick={exportMonthlyLedgerCSV}>
              📥 Export CSV
            </button>
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
                  <th style={{ textAlign: "right" }}>GST Payable (18%)</th>
                  <th style={{ textAlign: "right" }}>Net After GST</th>
                  <th style={{ textAlign: "right" }}>Margin</th>
                  <th>Top Model</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthlyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--s5)" }}>
                      No monthly transactions found for selected period.
                    </td>
                  </tr>
                ) : (
                  filteredMonthlyBreakdown.map((mb: any) => {
                    const marginPct = mb.sales > 0 ? ((mb.gross_profit / mb.sales) * 100).toFixed(1) : "0.0";
                    const diff = mb.net_diff !== undefined ? mb.net_diff : (mb.sales - mb.purchases);
                    const gst = mb.gst_payable !== undefined ? mb.gst_payable : Math.max(0, Math.round(diff * 0.18 * 100) / 100);
                    const netPre = mb.net_profit_before_gst !== undefined ? mb.net_profit_before_gst : mb.net_profit || 0;
                    const netPost = mb.net_profit_after_gst !== undefined ? mb.net_profit_after_gst : (netPre - gst);

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
                        <td style={{ textAlign: "right", fontWeight: 700, color: gst > 0 ? "#d97706" : "var(--muted)" }}>
                          {formatINR(gst)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: netPost >= 0 ? "var(--success)" : "var(--error)" }}>
                          {formatINR(netPost)}
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

        {/* 4. MODEL SALES BREAKDOWN MATRIX */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s3)" }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>🏷️ Model-by-Month Sales Breakdown</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Complete matrix of units sold per TV model across each month</p>
            </div>
            <button className="btn btn-outline btn-xs" onClick={exportModelMatrixCSV}>
              📥 Export CSV
            </button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>TV Model</th>
                  {filteredMonths.map((m: string) => (
                    <th key={m} style={{ textAlign: "center" }}>{m}</th>
                  ))}
                  <th style={{ textAlign: "right" }}>Total Units</th>
                  <th style={{ textAlign: "right" }}>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {modelSeries.length === 0 ? (
                  <tr>
                    <td colSpan={filteredMonths.length + 3} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--s5)" }}>
                      No model sales recorded yet.
                    </td>
                  </tr>
                ) : (
                  modelSeries.map((ms: any) => (
                    <tr key={ms.model}>
                      <td style={{ fontWeight: 700 }}>{ms.model}</td>
                      {filteredMonths.map((m: string) => {
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

        {/* 5. TOP WHOLESALE DEALERS LEADERBOARD */}
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s3)" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>🏆 Wholesale Dealers Performance &amp; Volume Leaderboard</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Revenue ranking, TV unit volume, and ledger collection status across all partner shops
              </p>
            </div>
            <div className="badge badge-brand">{topDealers.length} Active Wholesale Dealers</div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Dealer / Shop Name</th>
                  <th style={{ textAlign: "center" }}>Orders</th>
                  <th style={{ textAlign: "right" }}>TV Units Taken</th>
                  <th style={{ textAlign: "right" }}>Total Business</th>
                  <th style={{ textAlign: "right" }}>Total Paid</th>
                  <th style={{ textAlign: "right" }}>Outstanding Balance</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {topDealers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--s5)" }}>
                      No dealer transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  topDealers.map((d: any, idx: number) => {
                    const isFullyPaid = d.balance <= 0.5;
                    const isPartial = d.amount_paid > 0 && !isFullyPaid;
                    return (
                      <tr key={d.party_id || d.party_name} style={{ cursor: "pointer" }} onClick={() => navigate("/dealers")}>
                        <td style={{ fontWeight: 700, color: "var(--muted)", width: 36 }}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--on-surface)" }}>
                          {d.party_name}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="badge" style={{ background: "var(--surface-2)", fontWeight: 600 }}>
                            {d.orders_count}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {d.total_units} units
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "var(--brand)" }}>
                          {formatINR(d.total_revenue)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "var(--success)" }}>
                          {formatINR(d.amount_paid)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: isFullyPaid ? "var(--muted)" : "var(--error)" }}>
                          {formatINR(d.balance)}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`badge ${
                              isFullyPaid ? "badge-success" : isPartial ? "badge-warning" : "badge-error"
                            }`}
                            style={{ fontWeight: 700 }}
                          >
                            {isFullyPaid ? "Cleared" : isPartial ? "Partial" : "Unpaid"}
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

        {/* 6. TELEVISION SCREEN SIZE & TECHNOLOGY DISTRIBUTION */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>📺 Screen Size &amp; Technology Distribution</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                Sales contribution and market share split across 32", 43", 50", 55", 58", and 65" WebOS / QLED models
              </p>
            </div>
          </div>
          <div style={{ padding: "var(--s4)" }}>
            {categoryBreakdown.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>No category sales recorded yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--s4)" }}>
                {categoryBreakdown.map((cat: any, idx: number) => {
                  const barColor = PALETTE[idx % PALETTE.length];
                  return (
                    <div
                      key={cat.category}
                      style={{
                        padding: "var(--s4)",
                        borderRadius: "var(--r-md)",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{cat.category}</span>
                        <span className="badge" style={{ background: `${barColor}22`, color: barColor, fontWeight: 800 }}>
                          {cat.share_pct}% Share
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: "var(--on-surface)" }}>
                          {formatINR(cat.revenue)}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                          {cat.units} units sold
                        </span>
                      </div>
                      <div style={{ background: "var(--surface-3)", height: 8, borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(100, Math.max(2, cat.share_pct))}%`, background: barColor, height: "100%", borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 7. P&L STATEMENT WATERFALL */}
        <div className="card">
          <div className="card-header" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Profit & Loss Overview (YTD)</h2>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>Standard distribution accounting statement with GST deduction</p>
            </div>
            <div style={{ display: "flex", gap: "var(--s3)", flexWrap: "wrap" }}>
              <div className="badge badge-brand">Gross Margin: {grossMargin}%</div>
              <div className={`badge ${netProfit >= 0 ? "badge-success" : "badge-error"}`}>
                Pre-GST Margin: {netMargin}%
              </div>
              <div className={`badge ${netProfitAfterGst >= 0 ? "badge-success" : "badge-error"}`} style={{ fontWeight: 700 }}>
                Net Margin (After GST): {netMarginAfterGst}%
              </div>
            </div>
          </div>
          <div style={{ padding: "var(--s4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--s4)" }}>
              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Revenue (Sales)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--brand)", marginTop: 4 }}>{formatINR(totalSales)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{summary.sales_count || 0} invoices recorded</div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Cost of Goods (COGS)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--on-surface)", marginTop: 4 }}>{formatINR(cogs)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Direct unit acquisition cost</div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Gross Profit</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--success)", marginTop: 4 }}>{formatINR(grossProfit)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Revenue minus unit cost</div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Operating Expenses</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--warning)", marginTop: 4 }}>{formatINR(totalExpenses)}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Transport, rent, salaries, utilities</div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, textTransform: "uppercase" }}>Net Profit (Pre-GST)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: netProfit >= 0 ? "var(--success)" : "var(--error)", marginTop: 4 }}>
                  {formatINR(netProfit)}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Gross profit minus expenses</div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: "var(--surface-2)", border: "1px solid rgba(220, 38, 38, 0.25)" }}>
                <div style={{ fontSize: 12, color: totalGstPayable > 0 ? "var(--error)" : "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>GST Payable (18%)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: totalGstPayable > 0 ? "var(--error)" : "var(--success)", marginTop: 4 }}>
                  - {formatINR(totalGstPayable)}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  {totalGstPayable > 0 ? "Remitted on portal" : "Protected (₹0 tax payable)"}
                </div>
              </div>

              <div style={{ padding: "var(--s4)", borderRadius: "var(--r-md)", background: netProfitAfterGst >= 0 ? "var(--success-bg)" : "var(--error-bg)", border: `1px solid ${netProfitAfterGst >= 0 ? "var(--success)" : "var(--error)"}` }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Net Profit (After GST)</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: netProfitAfterGst >= 0 ? "var(--success)" : "var(--error)", marginTop: 4 }}>
                  {formatINR(netProfitAfterGst)}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Final earnings after GST deduction</div>
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
                    <th>Credit / Due Terms</th>
                    <th>Aging</th>
                    <th className="num">Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: "var(--s6)" }}>
                        🎉 No overdue receivables! All dealers are fully cleared.
                      </td>
                    </tr>
                  ) : (
                    overdueReceivables.map((r: any) => (
                      <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => navigate(`/sales/${r.id}`)}>
                        <td style={{ fontWeight: 600 }}>{r.party_name || "Unknown"}</td>
                        <td><span className="mono" style={{ fontSize: 12 }}>{r.ref_no || "—"}</span></td>
                        <td>
                          {r.is_due_passed ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#dc2626",
                                background: "#fee2e2",
                                border: "1px solid #fca5a5",
                                padding: "2px 6px",
                                borderRadius: 4,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                width: "fit-content"
                              }}>
                                🔴 Due date passed ({Math.abs(r.days_left || 0)}d overdue)
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                Due: {r.due_date ? r.due_date.slice(0, 10) : "—"} ({r.credit_days || 15}d)
                              </span>
                            </div>
                          ) : r.days_left === 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#d97706",
                                background: "#fef3c7",
                                border: "1px solid #fcd34d",
                                padding: "2px 6px",
                                borderRadius: 4,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                width: "fit-content"
                              }}>
                                ⚠️ Due today
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                Due: {r.due_date ? r.due_date.slice(0, 10) : "—"}
                              </span>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)" }}>
                                ⏳ {r.days_left}d left
                              </span>
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                Due: {r.due_date ? r.due_date.slice(0, 10) : "—"} ({r.credit_days || 15}d)
                              </span>
                            </div>
                          )}
                        </td>
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
