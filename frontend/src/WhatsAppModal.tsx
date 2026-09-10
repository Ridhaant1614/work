import React, { useState, useEffect, useMemo } from "react";
import {
  type BillData,
  generateWhatsAppBillText,
  sendWhatsAppBill,
  cleanWhatsAppNumber,
} from "./receipt";
import { useToast } from "./toast";

export interface WhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  bill: BillData | null;
  onSent?: (customerName: string, customerPhone: string) => void;
}

export function WhatsAppModal({ open, onClose, bill, onSent }: WhatsAppModalProps) {
  const { show } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (bill) {
      setCustomerName(bill.customerName || "");
      setCustomerPhone(bill.customerPhone || "");
      setCopied(false);
    }
  }, [bill, open]);

  const activeBillData: BillData = useMemo(() => {
    if (!bill) {
      return {
        refNo: "BILL",
        customerName: customerName || "Customer",
        customerPhone: customerPhone || "",
        items: [],
        total: 0,
        paid: 0,
        balance: 0,
      };
    }
    return {
      ...bill,
      customerName: customerName.trim() || bill.customerName || "Customer",
      customerPhone: customerPhone.trim() || bill.customerPhone || "",
    };
  }, [bill, customerName, customerPhone]);

  const messageText = useMemo(
    () => generateWhatsAppBillText(activeBillData),
    [activeBillData]
  );

  const cleanNum = cleanWhatsAppNumber(customerPhone);
  const isValidPhone = cleanNum.length >= 10;

  if (!open || !bill) return null;

  function handleSend() {
    if (!customerName.trim()) {
      show("Please enter customer name", "error");
      return;
    }
    if (!customerPhone.trim()) {
      show("Please enter customer WhatsApp number", "error");
      return;
    }
    if (!isValidPhone) {
      show("Please enter a valid 10-digit mobile number", "error");
      return;
    }

    sendWhatsAppBill(customerPhone, messageText);
    show(`Opening WhatsApp for +${cleanNum}...`, "success");
    if (onSent) {
      onSent(customerName.trim(), customerPhone.trim());
    }
    onClose();
  }

  function handleCopy() {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    show("WhatsApp bill message copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 520, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>📲</span>
            <div>
              <h2 style={{ fontSize: 18, margin: 0 }}>Send Bill via WhatsApp</h2>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Bill #{bill.refNo} · Amount: ₹{bill.total.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
          {/* Customer Inputs */}
          <div style={{ background: "var(--surface-2)", padding: "14px", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>
                👤 Customer / Party Name <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <input
                className="input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Patel or Shop Name"
                autoFocus
              />
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>
                💬 WhatsApp Mobile Number <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0 10px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  🇮🇳 +91
                </span>
                <input
                  className="input"
                  type="tel"
                  style={{ flex: 1 }}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 9820012345"
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                Enter 10-digit Indian WhatsApp mobile number for instant 1-click delivery.
              </div>
            </div>
          </div>

          {/* Live Message Preview */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
                Live Message Preview:
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: "2px 8px" }}
                onClick={handleCopy}
              >
                {copied ? "✓ Copied!" : "📋 Copy Text"}
              </button>
            </div>
            <textarea
              className="input"
              rows={7}
              readOnly
              value={messageText}
              style={{
                fontFamily: "monospace",
                fontSize: 11.5,
                background: "var(--surface-2)",
                lineHeight: 1.4,
              }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--s2)", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleCopy}
            >
              📋 Copy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                background: "#25D366",
                color: "#fff",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
              }}
              onClick={handleSend}
            >
              <span>📲 Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
