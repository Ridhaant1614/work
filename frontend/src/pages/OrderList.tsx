import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiGet, apiDelete } from "../api";
import { PayBadge, Spinner, EmptyState, ConfirmModal } from "../ui";
import { formatINR, shortDate } from "../format";
import { useToast } from "../toast";

type Kind = "sale" | "purchase";

interface OrderListProps { kind: Kind; title: string; }

export default function OrderList({ kind, title }: OrderListProps) {
  const navigate = useNavigate();
  const { show } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const endpoint = kind === "sale" ? "/sales" : "/purchases";
  const createRoute = kind === "sale" ? "/sales/new" : "/purchases/new";
  const detailBase = kind === "sale" ? "/sales" : "/purchases";

  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: [kind === "sale" ? "sales" : "purchases"],
    queryFn: () => apiGet<any[]>(endpoint),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [kind === "sale" ? "sales" : "purchases"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      show("Order deleted, stock reversed", "info");
    },
    onError: (e: any) => show(e?.message || "Delete failed", "error"),
  });

  const filtered = useMemo(() => {
    let rows = data;
    if (filter !== "all") rows = rows.filter((o: any) => o.pay_status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((o: any) =>
        o.party_name?.toLowerCase().includes(q) || o.ref_no?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [data, filter, search]);

  const partyLabel = kind === "sale" ? "Dealer" : "Supplier";

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{partyLabel} orders &amp; payments · {data.length} total</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => navigate(createRoute)}>+ New {kind === "sale" ? "Sale" : "Purchase"}</button>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>↻</button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: "var(--s3)", flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-bar" style={{ flex: "0 0 280px" }}>
            <span className="search-icon">🔍</span>
            <input className="input" style={{ paddingLeft: 36 }} placeholder={`Search ${partyLabel.toLowerCase()}, ref…`} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="chip-bar">
            {[{ key: "all", label: "All" }, { key: "unpaid", label: "Unpaid" }, { key: "partial", label: "Partial" }, { key: "cleared", label: "Cleared" }].map(f => (
              <button key={f.key} className={`chip${filter === f.key ? " active" : ""}`} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
          </div>
        </div>

        {isLoading ? <Spinner /> : isError ? (
          <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Failed to load</h3><button className="btn btn-primary btn-sm" onClick={() => refetch()}>Retry</button></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={kind === "sale" ? "🧾" : "📦"} title={`No ${title.toLowerCase()} found`} subtitle="Try adjusting your filters or create a new order." action={`New ${kind === "sale" ? "Sale" : "Purchase"}`} onAction={() => navigate(createRoute)} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{partyLabel}</th>
                  <th>Ref No.</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right" }}>Paid</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th>Status</th>
                  <th>Age</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o: any) => (
                  <tr key={o.id} className="clickable" onClick={() => navigate(`${detailBase}/${o.id}`)}>
                    <td><span style={{ fontWeight: 700 }}>{o.party_name}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{o.ref_no || "—"}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{shortDate(o.date)}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatINR(o.total)}</td>
                    <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatINR(o.amount_paid)}</td>
                    <td style={{ textAlign: "right", color: o.balance > 0 ? "var(--error)" : "var(--muted)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatINR(o.balance)}</td>
                    <td><PayBadge status={o.pay_status} /></td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{o.age_days > 0 ? `${o.age_days}d` : "—"}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteId(o.id)} title="Delete order" style={{ color: "var(--error)" }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        title="Delete this order?"
        body="Stock changes from this order will be reversed. This cannot be undone."
        onConfirm={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}
        onCancel={() => setDeleteId(null)}
      />

      <button className="fab" onClick={() => navigate(createRoute)} title={`New ${kind}`}>+</button>
    </div>
  );
}
