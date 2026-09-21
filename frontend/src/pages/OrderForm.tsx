import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut } from "../api";
import { Spinner } from "../ui";
import { formatINR, toInputDate } from "../format";
import { useToast } from "../toast";

type Line = { key: string; product_id: string; model: string; qty: string; rate: string };
type Kind = "sale" | "purchase";

export default function OrderForm({ kind }: { kind: Kind }) {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get("id");
  const editId = (paramId && paramId !== "new") ? paramId : (queryId && queryId !== "new" ? queryId : undefined);
  const isEdit = !!editId;
  const { show } = useToast();
  const qc = useQueryClient();
  const isSale = kind === "sale";

  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyName, setPartyName] = useState("");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [orderDate, setOrderDate] = useState(toInputDate(null));
  const [payStatus, setPayStatus] = useState<"unpaid" | "partial" | "cleared">("unpaid");
  const [amountPaid, setAmountPaid] = useState("");
  const [payMethod, setPayMethod] = useState("RTGS");
  const [lines, setLines] = useState<Line[]>([]);

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => apiGet<any[]>("/products") });
  const { data: dealers = [] } = useQuery({ queryKey: ["dealers"], queryFn: () => apiGet<any[]>("/dealers"), enabled: isSale });
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: [isSale ? "sales" : "purchases", editId],
    queryFn: () => apiGet(`${isSale ? "/sales" : "/purchases"}/${editId}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setPartyId(existing.party_id ?? null);
      setPartyName(existing.party_name ?? "");
      setRefNo(existing.ref_no ?? "");
      setNotes(existing.notes ?? "");
      setOrderDate(toInputDate(existing.date));
      const curStatus = existing.pay_status === "cleared" ? "cleared" : (existing.amount_paid > 0 || existing.paid > 0) ? "partial" : "unpaid";
      setPayStatus(curStatus);
      setAmountPaid(String(existing.amount_paid ?? existing.paid ?? ""));
      setLines((existing.items || []).map((it: any, i: number) => ({
        key: `${it.product_id || "p"}-${i}-${Date.now()}`,
        product_id: it.product_id,
        model: it.model,
        qty: String(it.qty ?? 1),
        rate: String(it.rate ?? 0),
      })));
    }
  }, [existing]);

  const total = lines.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0), 0);

  const mutation = useMutation({
    mutationFn: () => {
      const isoDate = orderDate
        ? (orderDate.includes("T") ? orderDate : `${orderDate}T12:00:00.000Z`)
        : new Date().toISOString();
      const calculatedPaid = payStatus === "cleared" ? total : payStatus === "unpaid" ? 0 : parseFloat(amountPaid) || 0;
      const paymentTag = payStatus !== "unpaid" ? `[Payment: ${payMethod}]` : "";
      const finalNotes = notes.trim()
        ? (paymentTag && !notes.includes("[Payment:") ? `${notes.trim()} ${paymentTag}` : notes.trim())
        : paymentTag;
      const body = {
        party_id: isSale ? partyId : null,
        party_name: isSale ? partyName : partyName.trim(),
        ref_no: refNo.trim() || null,
        notes: finalNotes,
        date: isoDate,
        items: lines.map(l => ({ product_id: l.product_id, model: l.model, qty: parseFloat(l.qty) || 0, rate: parseFloat(l.rate) || 0 })),
        payment_status: payStatus,
        amount_paid: calculatedPaid,
        initial_payment: calculatedPaid,
      };
      return isEdit ? apiPut(`/orders/${editId}`, body) : apiPost(isSale ? "/sales" : "/purchases", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [isSale ? "sales" : "purchases"] });
      if (isEdit) qc.invalidateQueries({ queryKey: [isSale ? "sales" : "purchases", editId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      show(isEdit ? "Order updated successfully" : isSale ? "Sale order created successfully" : "Purchase order created successfully", "success");
      navigate(isEdit ? `${isSale ? "/sales" : "/purchases"}/${editId}` : (isSale ? "/sales" : "/purchases"));
    },
    onError: (e: any) => show(e?.message || "Failed to save order", "error"),
  });

  function addLine(productId: string) {
    const p = products.find((x: any) => x.id === productId);
    if (!p) return;
    if (lines.some(l => l.product_id === p.id)) { show("Product already added", "info"); return; }
    setLines(prev => [...prev, { key: `${p.id}-${Date.now()}`, product_id: p.id, model: p.model, qty: "1", rate: String(isSale ? p.sell_price : p.cost_price) }]);
  }

  function updateLine(key: string, field: "qty" | "rate", val: string) {
    setLines(prev => prev.map(l => l.key === key ? { ...l, [field]: val.replace(/[^0-9.]/g, "") } : l));
  }

  function submit() {
    if (isSale && !partyId) { show("Select a dealer", "error"); return; }
    if (!isSale && !partyName.trim()) { show("Enter supplier name", "error"); return; }
    if (lines.length === 0) { show("Add at least one product", "error"); return; }
    if (lines.some(l => !(parseFloat(l.qty) > 0))) { show("Enter valid quantity for all items", "error"); return; }

    if (isSale) {
      for (const l of lines) {
        const p = products.find((x: any) => x.id === l.product_id);
        const enteredQty = parseFloat(l.qty) || 0;
        const existingQtyInOrder = isEdit && existing
          ? (existing.items || []).filter((it: any) => it.product_id === l.product_id).reduce((s: number, it: any) => s + (Number(it.qty) || 0), 0)
          : 0;
        const availableStock = (Number(p?.qty_on_hand) || 0) + existingQtyInOrder;
        if (enteredQty > availableStock) {
          show(`Notice: ${l.model || "Product"} sale exceeds on-hand stock (${availableStock} available). Stock will reflect deficit until purchase lot is recorded.`, "info");
        }
      }
    }

    mutation.mutate();
  }

  if (isEdit && loadingExisting) return <div className="page-body"><Spinner /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{isEdit ? (isSale ? "Edit Sale Order" : "Edit Purchase Order") : isSale ? "New Sale Order" : "New Purchase Order"}</h1>
          <p>{isEdit ? (isSale ? `Editing Sale Invoice ${refNo || ""}` : `Editing Purchase Order ${refNo || ""}`) : isSale ? "Invoice to a dealer" : "Order from supplier"}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
        {/* Party & Meta */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Order Details</div>
          {isSale ? (
            <div className="field">
              <label>Dealer *</label>
              <select className="input" value={partyId || ""} onChange={e => {
                const d = dealers.find((x: any) => x.id === e.target.value);
                setPartyId(e.target.value);
                setPartyName(d?.shop_name || "");
              }}>
                <option value="">Select dealer…</option>
                {dealers.map((d: any) => <option key={d.id} value={d.id}>{d.shop_name}</option>)}
              </select>
            </div>
          ) : (
            <div className="field">
              <label>Supplier Name *</label>
              <input className="input" value={partyName} onChange={e => setPartyName(e.target.value)} placeholder="e.g. Worldtech Distributor" />
            </div>
          )}
          <div className="grid-2">
            <div className="field">
              <label>{isSale ? "Invoice No." : "PO No."} (optional)</label>
              <input className="input" value={refNo} onChange={e => setRefNo(e.target.value)} placeholder="e.g. INV-001" />
            </div>
            <div className="field">
              <label>Order Date</label>
              <input className="input" type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Notes (optional)</label>
            <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any remarks…" rows={2} />
          </div>
        </div>

        {/* Line Items */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Items ({lines.length})</div>
            <select className="input" style={{ maxWidth: 260 }} value="" onChange={e => { addLine(e.target.value); (e.target as HTMLSelectElement).value = ""; }}>
              <option value="">+ Add product…</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.model} (Stock: {p.qty_on_hand})</option>
              ))}
            </select>
          </div>
          {lines.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14 }}>No items added yet. Use the dropdown above.</p>}
          {lines.map(l => {
            const amt = (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0);
            return (
              <div key={l.key} className="card card-sm" style={{ background: "var(--surface-2)", display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{l.model}</span>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: "var(--error)" }} onClick={() => setLines(p => p.filter(x => x.key !== l.key))}>🗑</button>
                </div>
                <div className="line-item-inputs" style={{ display: "flex", gap: "var(--s3)" }}>
                  <div className="field" style={{ flex: 1, minWidth: 80 }}>
                    <label>Qty</label>
                    <input className="input" type="number" min={0} value={l.qty} onChange={e => updateLine(l.key, "qty", e.target.value)} />
                  </div>
                  <div className="field" style={{ flex: 2 }}>
                    <label>Rate / unit (₹)</label>
                    <input className="input" type="number" min={0} value={l.rate} onChange={e => updateLine(l.key, "rate", e.target.value)} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>Amount</label>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--brand)", paddingTop: 10, fontVariantNumeric: "tabular-nums" }}>{formatINR(amt)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment + Total */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
          <div className="field">
            <label style={{ fontWeight: 700, marginBottom: 4 }}>
              Payment Status {isSale ? "(Sale)" : "(Purchase)"}
            </label>
            <div style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn btn-sm ${payStatus === "unpaid" ? "btn-primary" : "btn-outline"}`}
                style={{ flex: 1 }}
                onClick={() => { setPayStatus("unpaid"); setAmountPaid("0"); }}
              >
                ✕ Unpaid
              </button>
              <button
                type="button"
                className={`btn btn-sm ${payStatus === "partial" ? "btn-primary" : "btn-outline"}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setPayStatus("partial");
                  if (!amountPaid || amountPaid === "0") setAmountPaid(String(Math.round(total / 2)));
                }}
              >
                ⏳ Partial Payment
              </button>
              <button
                type="button"
                className={`btn btn-sm ${payStatus === "cleared" ? "btn-primary" : "btn-outline"}`}
                style={{ flex: 1 }}
                onClick={() => { setPayStatus("cleared"); setAmountPaid(String(total)); }}
              >
                ✓ Fully Paid (Cleared)
              </button>
            </div>
          </div>

          {payStatus !== "unpaid" && (
            <div className="field">
              <label>Payment Mode</label>
              <select
                className="input"
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
              >
                <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
                <option value="NEFT / Bank Transfer">NEFT / Bank Transfer</option>
                <option value="IMPS">IMPS</option>
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          )}

          {payStatus === "partial" && (
            <div className="field">
              <label>{isSale ? "Amount Received (₹)" : "Amount Paid (₹)"}</label>
              <input
                className="input"
                type="number"
                min={0}
                max={total}
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder="0"
              />
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                Remaining {isSale ? "receivable" : "payable"} balance: {formatINR(Math.max(0, total - (parseFloat(amountPaid) || 0)))}
              </div>
            </div>
          )}

          {payStatus === "cleared" && (
            <div style={{ background: "var(--surface-2)", padding: "var(--s3) var(--s4)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--success)" }}>
              ✅ Order will be marked as fully paid ({formatINR(total)}). Balance due: ₹0.
            </div>
          )}

          {payStatus === "unpaid" && (
            <div style={{ background: "var(--surface-2)", padding: "var(--s3) var(--s4)", borderRadius: "var(--r-sm)", fontSize: 13, color: "var(--muted)" }}>
              ℹ️ Order marked as unpaid. Full amount {formatINR(total)} will be recorded as outstanding.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--brand-ter)", padding: "var(--s4) var(--s5)", borderRadius: "var(--r-md)" }}>
            <span style={{ fontWeight: 700, color: "var(--on-brand-ter)" }}>Order Total</span>
            <span style={{ fontWeight: 800, fontSize: 22, color: "var(--brand)", fontVariantNumeric: "tabular-nums" }}>{formatINR(total)}</span>
          </div>
          <button className="btn btn-primary w-full" onClick={submit} disabled={mutation.isPending} style={{ padding: "12px" }}>
            {mutation.isPending ? "Saving…" : isEdit ? "💾 Save Changes" : isSale ? "✓ Create Sale Order" : "✓ Create Purchase Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
