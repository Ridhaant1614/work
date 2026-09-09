import React from "react";

export function Spinner() {
  return <div className="spinner"><div className="spin" /></div>;
}

export function Badge({ label, tone }: { label: string; tone: "success" | "error" | "warning" | "info" | "brand" | "muted" }) {
  return <span className={`badge badge-${tone}`}>{label}</span>;
}

export function PayBadge({ status }: { status: string }) {
  const tone = status === "cleared" ? "success" : status === "partial" ? "warning" : "error";
  return <Badge label={status} tone={tone} />;
}

export function Initials({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="avatar-initials" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

export function EmptyState({ icon = "📦", title, subtitle, action, onAction }:
  { icon?: string; title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {action && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>{action}</button>
      )}
    </div>
  );
}

export function ConfirmModal({ open, title, body, onConfirm, onCancel, danger = true }:
  { open: boolean; title: string; body: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-body" style={{ alignItems: "center", textAlign: "center", gap: "var(--s3)" }}>
          <div style={{ fontSize: 40 }}>{danger ? "⚠️" : "❓"}</div>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{title}</h2>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{body}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
