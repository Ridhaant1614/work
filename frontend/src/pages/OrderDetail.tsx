import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "../api";
import { Spinner, PayBadge, ConfirmModal } from "../ui";
import { formatINR, formatDate } from "../format";
import { useToast } from "../toast";

type Kind = "sale" | "purchase";

export default function OrderDetail({ kind }: { kind: Kind }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { show } = useToast();
  const qc = useQueryClient();
  const isSale = kind === "sale";
  const listKey = isSale ? "sales" : "purchases";
  const balanceLabel = isSale ? "Receivable" : "Payable";

  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: o, isLoading, isError, refetch } = useQuery({
    queryKey: [listKey, id],
    queryFn: () => apiGet(`${isSale ? "/sales" : "/purchases"}/${id}`),
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: [listKey] });
    qc.invalidateQueries({ queryKey: [listKey, id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  const payMutation = useMutation({
    mutationFn: () => apiPost(`/orders/${id}/payments`, { amount: parseFloat(payAmount) || 0, note: payNote.trim() }),
    onSuccess: () => {
      setPayAmount(""); setPayNote("");
      invalidateAll(); refetch();
      show("Payment recorded", "success");
    },
    onError: (e: any) => show(e?.message || "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/orders/${id}`),
    onSuccess: () => {
      invalidateAll();
      show("Order deleted, stock reversed", "info");
      navigate(isSale ? "/sales" : "/purchases");
    },
    onError: (e: any) => show(e?.message || "Failed", "error"),
  });

  function addPayment() {
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) { show("Enter a valid amount", "error"); return; }
    if (o && amt > o.balance + 0.5) { show(`Max ${balanceLabel.toLowerCase()} is ${formatINR(o.balance)}`, "error"); return; }
    payMutation.mutate();
  }

  function printInvoice() {
    if (!o) return;
    const html = `
<!DOCTYPE html><html><head><title>Invoice ${o.ref_no || o.id.slice(0,8)}</title>
<style>
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 40px; color: #111827; max-width: 600px; margin: auto; }
  h1 { font-size: 24px; font-weight: 800; color: #0F4C5C; }
  .sub { color: #6B7280; font-size: 14px; margin-top: 4px; }
  .divider { border: none; border-top: 1px solid #E5E7EB; margin: 20px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { text-align: left; padding: 8px 12px; background: #F9FAFB; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #6B7280; border-bottom: 1px solid #E5E7EB; }
  td { padding: 10px 12px; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
  .right { text-align: right; }
  .total-row { font-size: 16px; font-weight: 800; background: #E0F2F1; }
  .status { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: ${o.pay_status === "cleared" ? "#ECFDF5" : o.pay_status === "partial" ? "#FFFBEB" : "#FEF2F2"}; color: ${o.pay_status === "cleared" ? "#059669" : o.pay_status === "partial" ? "#D97706" : "#DC2626"}; }
  @media print { button { display: none; } }
</style></head><body>
<h1>Soneja Electronics</h1>
<div class="sub">Distribution CRM | Mumbai</div>
<hr class="divider">
<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
  <div>
    <div style="font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em">${isSale ? "Invoice To" : "Order From"}</div>
    <div style="font-size:18px;font-weight:800;margin-top:4px">${o.party_name}</div>
    <div style="font-size:13px;color:#6B7280;margin-top:2px">${isSale ? "Dealer" : "Supplier"}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:20px;font-weight:800;color:#0F4C5C">${o.ref_no || "No Ref"}</div>
    <div style="font-size:13px;color:#6B7280;margin-top:4px">${formatDate(o.date)}</div>
    <div style="margin-top:8px"><span class="status">${o.pay_status}</span></div>
  </div>
</div>
<table>
  <thead><tr><th>Product</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
  <tbody>
    ${(o.items || []).map((it: any) => `<tr><td>${it.model}</td><td class="right">${it.qty}</td><td class="right">₹${it.rate.toLocaleString("en-IN")}</td><td class="right">₹${it.amount.toLocaleString("en-IN")}</td></tr>`).join("")}
    <tr class="total-row"><td colspan="3" style="text-align:right">Order Total</td><td class="right">₹${o.total.toLocaleString("en-IN")}</td></tr>
  </tbody>
</table>
<hr class="divider">
<div style="display:flex;justify-content:space-between">
  <div><div style="font-size:12px;font-weight:600;color:#6B7280">${isSale ? "Amount Received" : "Amount Paid"}</div><div style="font-size:18px;font-weight:800;color:#059669">₹${(o.amount_paid||0).toLocaleString("en-IN")}</div></div>
  <div style="text-align:right"><div style="font-size:12px;font-weight:600;color:#6B7280">${balanceLabel}</div><div style="font-size:18px;font-weight:800;color:${o.balance > 0 ? "#DC2626" : "#059669"}">₹${(o.balance||0).toLocaleString("en-IN")}</div></div>
</div>
${o.notes ? `<hr class="divider"><div style="font-size:13px;color:#6B7280;font-style:italic">Note: ${o.notes}</div>` : ""}
<button onclick="window.print()" style="margin-top:24px;background:#0F4C5C;color:#fff;border:none;padding:10px 24px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;">🖨 Print / Save as PDF</button>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  if (isLoading) return <div className="page-body"><Spinner /></div>;
  if (isError || !o) return <div className="page-body"><div className="empty-state"><div className="empty-icon">⚠️</div><h3>Order not found</h3><button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isSale ? "Sale Order" : "Purchase Order"}</h1>
          <p>{o.ref_no ? `Ref: ${o.ref_no} · ` : ""}{o.party_name}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={printInvoice} title="Print / PDF">🖨 Print</button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`${isSale ? "/sales" : "/purchases"}/new?id=${id}`)}>✏️ Edit</button>
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--error)" }} onClick={() => setConfirmDelete(true)}>🗑 Delete</button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
        {/* Summary Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{o.party_name}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{isSale ? "Dealer" : "Supplier"} · {formatDate(o.date)}</div>
              {o.ref_no && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>Ref: {o.ref_no}</div>}
            </div>
            <PayBadge status={o.pay_status} />
          </div>
          {o.balance > 0 && o.age_days > 0 && (
            <div style={{ fontSize: 13, color: "var(--warning)", fontWeight: 700 }}>⏱ Outstanding since {o.age_days} day{o.age_days === 1 ? "" : "s"}</div>
          )}
          {o.notes && <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic", borderTop: "1px solid var(--divider)", paddingTop: "var(--s3)" }}>{o.notes}</div>}
          <div className="amount-box">
            <div className="amount-cell"><label>Total</label><strong>{formatINR(o.total)}</strong></div>
            <div className="amount-cell"><label>{isSale ? "Received" : "Paid"}</label><strong style={{ color: "var(--success)" }}>{formatINR(o.amount_paid)}</strong></div>
            <div className="amount-cell"><label>{balanceLabel}</label><strong style={{ color: o.balance > 0 ? "var(--error)" : "var(--on-surface)" }}>{formatINR(o.balance)}</strong></div>
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="section-title">Items</div>
          <div className="card card-flush">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Rate</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {o.items?.map((it: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{it.model}</td>
                    <td style={{ textAlign: "right" }}>{it.qty}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{formatINR(it.rate)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatINR(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments */}
        <div>
          <div className="section-title">Payment History</div>
          <div className="card card-flush" style={{ marginBottom: "var(--s4)" }}>
            {o.payments?.length ? o.payments.map((p: any, i: number) => (
              <div key={p.id} className="pay-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{formatINR(p.amount)}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{formatDate(p.date)}{p.note ? ` · ${p.note}` : ""}</div>
                </div>
                <span style={{ color: "var(--success)", fontSize: 18 }}>✓</span>
              </div>
            )) : (
              <div style={{ padding: "var(--s4)", color: "var(--muted)", fontSize: 14 }}>No payments recorded yet.</div>
            )}
          </div>

          {o.balance > 0 && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Record {isSale ? "Payment Received" : "Payment Made"}</div>
              <div className="grid-2">
                <div className="field">
                  <label>Amount (₹)</label>
                  <input className="input" type="number" min={0} max={o.balance} value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder={`Up to ${formatINR(o.balance)}`} />
                </div>
                <div className="field">
                  <label>Note (optional)</label>
                  <input className="input" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g. UPI / Cheque" />
                </div>
              </div>
              <button className="btn btn-primary" onClick={addPayment} disabled={payMutation.isPending}>
                {payMutation.isPending ? "Recording…" : "💰 Add Payment"}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="Delete this order?"
        body="Stock changes from this order will be reversed. This cannot be undone."
        onConfirm={() => { setConfirmDelete(false); deleteMutation.mutate(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
