import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../api";
import { Spinner, EmptyState, ConfirmModal } from "../ui";
import { formatINR, formatDate, toInputDate } from "../format";
import { useToast } from "../toast";

const CATEGORIES = ["Transport", "Rent", "Salary", "Utilities", "Marketing", "Misc"];
const CAT_ICONS: Record<string, string> = { Transport: "🚚", Rent: "🏢", Salary: "💼", Utilities: "⚡", Marketing: "📣", Misc: "📌" };

export default function Expenses() {
  const { show } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [category, setCategory] = useState("Transport");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payMethod, setPayMethod] = useState("RTGS");
  const [expDate, setExpDate] = useState(toInputDate(null));
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["expenses"], queryFn: () => apiGet<any[]>("/expenses") });
  const total = data.reduce((a: number, e: any) => a + (e.amount || 0), 0);

  function openNew() {
    setEditId(null);
    setCategory("Transport");
    setAmount("");
    setNote("");
    setPayMethod("RTGS");
    setExpDate(toInputDate(null));
    setOpen(true);
  }
  function openEdit(e: any) {
    setEditId(e.id);
    setCategory(e.category);
    setAmount(String(e.amount));
    const match = (e.note || "").match(/\[(.*?)\]/);
    if (match) {
      setPayMethod(match[1]);
      setNote((e.note || "").replace(/\[.*?\]\s*/, ""));
    } else {
      setPayMethod("RTGS");
      setNote(e.note || "");
    }
    setExpDate(toInputDate(e.date));
    setOpen(true);
  }

  function invalidate() { qc.invalidateQueries({ queryKey: ["expenses"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); qc.invalidateQueries({ queryKey: ["reports"] }); }

  const saveMutation = useMutation({
    mutationFn: () => {
      const cleanNote = note.trim();
      const finalNote = `[${payMethod}]${cleanNote ? ` ${cleanNote}` : ""}`;
      const body = { category, amount: parseFloat(amount) || 0, note: finalNote, date: new Date(expDate).toISOString() };
      return editId ? apiPut(`/expenses/${editId}`, body) : apiPost("/expenses", body);
    },
    onSuccess: () => { invalidate(); setOpen(false); show(editId ? "Expense updated" : "Expense added", "success"); },
    onError: (e: any) => show(e?.message || "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/expenses/${id}`),
    onSuccess: () => { invalidate(); show("Expense deleted", "info"); },
  });

  function save() {
    if (!(parseFloat(amount) > 0)) { show("Enter a valid amount", "error"); return; }
    saveMutation.mutate();
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Daily Expenses</h1><p>Total: {formatINR(total)} · {data.length} entries</p></div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Expense</button>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>↻</button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
        {/* Total card */}
        <div className="card" style={{ background: "var(--brand)", border: "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,.85)", fontWeight: 600 }}>Total Expenses</span>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{formatINR(total)}</span>
        </div>

        {isLoading ? <Spinner /> : isError ? (
          <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Failed to load</h3><button className="btn btn-primary btn-sm" onClick={() => refetch()}>Retry</button></div>
        ) : data.length === 0 ? (
          <EmptyState icon="💳" title="No expenses yet" subtitle="Log your first expense." action="Add Expense" onAction={openNew} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Category</th><th>Date</th><th>Note</th><th style={{ textAlign: "right" }}>Amount</th><th></th></tr>
              </thead>
              <tbody>
                {data.map((e: any) => (
                  <tr key={e.id} className="clickable" onClick={() => openEdit(e)}>
                    <td><span style={{ marginRight: 6 }}>{CAT_ICONS[e.category] || "📌"}</span><span style={{ fontWeight: 700 }}>{e.category}</span></td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{formatDate(e.date)}</td>
                    <td style={{ color: "var(--muted)", fontSize: 13 }}>{e.note || "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatINR(e.amount)}</td>
                    <td onClick={ev => ev.stopPropagation()}><button className="btn btn-ghost btn-icon btn-sm" style={{ color: "var(--error)" }} onClick={() => setDeleteId(e.id)}>🗑</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={ev => ev.stopPropagation()}>
            <div className="modal-header"><h2>{editId ? "Edit Expense" : "Add Expense"}</h2><button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button></div>
            <div className="modal-body">
              <div className="field">
                <label>Category</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)" }}>
                  {CATEGORIES.map(c => (
                    <button key={c} className={`chip${category === c ? " active" : ""}`} onClick={() => setCategory(c)}>
                      {CAT_ICONS[c]} {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid-2">
                <div className="field"><label>Amount (₹) *</label><input className="input" type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></div>
                <div className="field"><label>Date</label><input className="input" type="date" value={expDate} onChange={e => setExpDate(e.target.value)} /></div>
              </div>
              <div className="field">
                <label>Payment Mode</label>
                <select className="input" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
                  <option value="NEFT / Net Banking">NEFT / Net Banking</option>
                  <option value="IMPS">IMPS</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <div className="field"><label>Note (optional)</label><input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="What was this for?" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : editId ? "Save Changes" : "Add Expense"}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteId} title="Delete expense?" body="This expense record will be permanently removed." onConfirm={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
      <button className="fab" onClick={openNew} title="Add expense">+</button>
    </div>
  );
}
