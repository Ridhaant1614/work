import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../api";
import { Spinner, EmptyState, Initials, ConfirmModal } from "../ui";
import { useToast } from "../toast";

type Draft = { id?: string; shop_name: string; contact_person: string; phone: string; whatsapp: string; area: string; notes: string };
const EMPTY: Draft = { shop_name: "", contact_person: "", phone: "", whatsapp: "", area: "", notes: "" };

export default function Dealers() {
  const { show } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ["dealers"], queryFn: () => apiGet<any[]>("/dealers") });

  const filtered = data.filter((d: any) => !search.trim() || d.shop_name.toLowerCase().includes(search.toLowerCase()) || d.contact_person?.toLowerCase().includes(search.toLowerCase()));

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = { ...draft, whatsapp: draft.whatsapp || draft.phone };
      delete (body as any).id;
      return draft.id ? apiPut(`/dealers/${draft.id}`, body) : apiPost("/dealers", body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dealers"] }); setOpen(false); show(draft.id ? "Dealer updated" : "Dealer added", "success"); },
    onError: (e: any) => show(e?.message || "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/dealers/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dealers"] }); show("Dealer removed", "info"); },
  });

  function openEdit(d: any) {
    setDraft({ id: d.id, shop_name: d.shop_name, contact_person: d.contact_person || "", phone: d.phone || "", whatsapp: d.whatsapp || "", area: d.area || "", notes: d.notes || "" });
    setOpen(true);
  }

  function call(phone: string) {
    if (!phone) { show("No phone number", "error"); return; }
    window.open(`tel:${phone.replace(/\s/g, "")}`, "_self");
  }

  function whatsapp(num: string) {
    if (!num) { show("No WhatsApp number", "error"); return; }
    const clean = num.replace(/\D/g, "");
    const withCc = clean.length === 10 ? `91${clean}` : clean;
    window.open(`https://wa.me/${withCc}`, "_blank");
  }

  function save() {
    if (!draft.shop_name.trim()) { show("Enter shop name", "error"); return; }
    saveMutation.mutate();
  }

  return (
    <div>
      <div className="page-header">
        <div><h1>Dealer Network</h1><p>{data.length} shops in your network</p></div>
        <div className="page-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => { setDraft(EMPTY); setOpen(true); }}>+ Add Dealer</button>
          <button className="btn btn-outline btn-sm" onClick={() => refetch()}>↻</button>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
        <div className="search-bar" style={{ maxWidth: 340 }}>
          <span className="search-icon">🔍</span>
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search dealer or contact…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {isLoading ? <Spinner /> : isError ? (
          <div className="empty-state"><div className="empty-icon">⚠️</div><h3>Failed to load</h3><button className="btn btn-primary btn-sm" onClick={() => refetch()}>Retry</button></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🏪" title="No dealers found" subtitle="Add your first dealer to your network." action="Add Dealer" onAction={() => { setDraft(EMPTY); setOpen(true); }} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--s4)" }}>
            {filtered.map((d: any) => (
              <div key={d.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--s3)" }}>
                  <Initials name={d.shop_name} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.shop_name}</div>
                    {d.contact_person && <div style={{ fontSize: 13, color: "var(--on-surface-2)", marginTop: 2, fontWeight: 600 }}>{d.contact_person}</div>}
                    {d.area && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{d.area}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "var(--s1)" }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(d)} title="Edit">✏️</button>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDeleteId(d.id)} title="Delete" style={{ color: "var(--error)" }}>🗑</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "var(--s2)", borderTop: "1px solid var(--divider)", paddingTop: "var(--s3)" }}>
                  <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => call(d.phone)}>📞 Call</button>
                  <button className="btn btn-sm" style={{ flex: 1, background: "#25D366", color: "#fff" }} onClick={() => whatsapp(d.whatsapp || d.phone)}>💬 WhatsApp</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2>{draft.id ? "Edit Dealer" : "Add Dealer"}</h2><button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button></div>
            <div className="modal-body">
              <div className="field"><label>Shop Name *</label><input className="input" value={draft.shop_name} onChange={e => setDraft({ ...draft, shop_name: e.target.value })} placeholder="Electronics store name" /></div>
              <div className="field"><label>Contact Person</label><input className="input" value={draft.contact_person} onChange={e => setDraft({ ...draft, contact_person: e.target.value })} placeholder="Owner name" /></div>
              <div className="grid-2">
                <div className="field"><label>Phone</label><input className="input" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} placeholder="10-digit number" /></div>
                <div className="field"><label>WhatsApp (optional)</label><input className="input" value={draft.whatsapp} onChange={e => setDraft({ ...draft, whatsapp: e.target.value })} placeholder="Defaults to phone" /></div>
              </div>
              <div className="field"><label>Area / Landmark</label><textarea className="input" value={draft.area} onChange={e => setDraft({ ...draft, area: e.target.value })} placeholder="Address or area" /></div>
              <div className="field"><label>Notes (optional)</label><input className="input" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Remarks" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : draft.id ? "Save Changes" : "Add Dealer"}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={!!deleteId} title="Remove dealer?" body="This will remove the dealer from your network." onConfirm={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }} onCancel={() => setDeleteId(null)} />
      <button className="fab" onClick={() => { setDraft(EMPTY); setOpen(true); }} title="Add dealer">+</button>
    </div>
  );
}
