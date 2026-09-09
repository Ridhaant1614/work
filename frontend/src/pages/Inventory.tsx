import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../api";
import { Spinner, EmptyState } from "../ui";
import { formatINR } from "../format";

export default function Inventory() {
  const [query, setQuery] = useState("");
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["products"], queryFn: () => apiGet<any[]>("/products") });

  const filtered = useMemo(() => {
    if (!query.trim()) return data;
    const q = query.toLowerCase();
    return data.filter((p: any) => p.model.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
  }, [data, query]);

  const totalUnits = data.reduce((a: number, p: any) => a + (p.qty_on_hand || 0), 0);
  const totalValue = data.reduce((a: number, p: any) => a + (p.qty_on_hand || 0) * (p.cost_price || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>{totalUnits} units · {formatINR(totalValue)} total value</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
        <div className="search-bar" style={{ maxWidth: 340 }}>
          <span className="search-icon">🔍</span>
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search model or SKU…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>

        {isLoading ? <Spinner /> : isError ? (
          <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Failed to load</h3><button className="btn btn-primary btn-sm" onClick={() => refetch()}>Retry</button></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📦" title="No products found" subtitle="Try a different search or add products in the Cost Sheet." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th style={{ textAlign: "right" }}>Cost Price</th>
                  <th style={{ textAlign: "right" }}>Sell Price</th>
                  <th style={{ textAlign: "right" }}>Margin</th>
                  <th style={{ textAlign: "right" }}>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => {
                  const margin = p.sell_price && p.cost_price ? ((p.sell_price - p.cost_price) / p.cost_price * 100).toFixed(1) : "—";
                  const low = p.qty_on_hand <= 2;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700 }}>{p.model}</td>
                      <td style={{ color: "var(--muted)", fontSize: 13 }}>{p.sku}</td>
                      <td style={{ color: "var(--muted)", fontSize: 13 }}>{p.category}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatINR(p.cost_price)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatINR(p.sell_price)}</td>
                      <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 600 }}>{margin}%</td>
                      <td style={{ textAlign: "right", fontWeight: 800, fontSize: 16, fontVariantNumeric: "tabular-nums", color: p.qty_on_hand <= 0 ? "var(--error)" : low ? "var(--warning)" : "var(--on-surface)" }}>{p.qty_on_hand}</td>
                      <td>
                        {p.qty_on_hand <= 0 ? <span className="badge badge-error">Out</span> : low ? <span className="badge badge-warning">Low</span> : <span className="badge badge-success">OK</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
