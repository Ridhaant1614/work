import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import { Spinner } from "../ui";
import { formatINR, toInputDate } from "../format";
import { useToast } from "../toast";
import {
  type BillData,
  generateWhatsAppBillText,
  sendWhatsAppBill,
  printThermalReceipt,
} from "../receipt";
import { WhatsAppModal } from "../WhatsAppModal";

type BillLine = {
  key: string;
  product_id: string;
  model: string;
  qty: number;
  rate: number;
  cost: number;
  stock: number;
};

export default function Billing() {
  const navigate = useNavigate();
  const { show } = useToast();
  const qc = useQueryClient();

  // Mode: "dealer" or "counter"
  const [customerType, setCustomerType] = useState<"dealer" | "counter">("dealer");
  const [dealerId, setDealerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [refNo, setRefNo] = useState(`BILL-${Math.floor(1000 + Math.random() * 9000)}`);
  const [billDate, setBillDate] = useState(toInputDate(null));
  const [payMethod, setPayMethod] = useState("UPI");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [notes, setNotes] = useState("1 Year Brand Warranty. Thank you for your business!");
  const [lines, setLines] = useState<BillLine[]>([]);

  // Post-submission modal
  const [completedBill, setCompletedBill] = useState<BillData | null>(null);

  // Dedicated WhatsApp prompt modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppModalBill, setWhatsAppModalBill] = useState<BillData | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiGet<any[]>("/products"),
  });

  const { data: dealers = [] } = useQuery({
    queryKey: ["dealers"],
    queryFn: () => apiGet<any[]>("/dealers"),
  });

  const selectedDealer = useMemo(
    () => dealers.find((d: any) => d.id === dealerId),
    [dealers, dealerId]
  );

  function selectDealer(id: string) {
    setDealerId(id);
    const d = dealers.find((x: any) => x.id === id);
    if (d) {
      setCustomerName(d.shop_name || "");
      setCustomerPhone(d.whatsapp || d.phone || "");
    }
  }

  const effectiveCustomerName = (customerName.trim() || (customerType === "dealer" ? selectedDealer?.shop_name : "") || "").trim();
  const effectivePhone = (customerPhone.trim() || (customerType === "dealer" ? (selectedDealer?.whatsapp || selectedDealer?.phone) : "") || "").trim();

  const totalAmount = useMemo(
    () => lines.reduce((sum, l) => sum + (l.qty * l.rate), 0),
    [lines]
  );

  const numericPaid = paidAmount === "" ? totalAmount : parseFloat(paidAmount) || 0;
  const balanceDue = Math.max(0, totalAmount - numericPaid);

  function addProduct(productId: string) {
    const p = products.find((x: any) => x.id === productId);
    if (!p) return;

    setLines((prev) => {
      const existing = prev.find((l) => l.product_id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.product_id === p.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [
        ...prev,
        {
          key: `${p.id}-${Date.now()}`,
          product_id: p.id,
          model: p.model,
          qty: 1,
          rate: Number(p.sell_price) || Number(p.cost_price) || 0,
          cost: Number(p.cost_price) || 0,
          stock: Number(p.qty_on_hand) || 0,
        },
      ];
    });
  }

  function updateQty(key: string, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.key === key) {
            const nextQty = Math.max(1, l.qty + delta);
            return { ...l, qty: nextQty };
          }
          return l;
        })
        .filter((l) => l.qty > 0)
    );
  }

  function updateRate(key: string, newRate: string) {
    const rateNum = parseFloat(newRate) || 0;
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, rate: rateNum } : l))
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function resetForm() {
    setRefNo(`BILL-${Math.floor(1000 + Math.random() * 9000)}`);
    setBillDate(toInputDate(null));
    setDealerId("");
    setCustomerName("");
    setCustomerPhone("");
    setPaidAmount("");
    setLines([]);
    setCompletedBill(null);
    setShowWhatsAppModal(false);
    setWhatsAppModalBill(null);
  }

  // Create Bill Mutation
  const mutation = useMutation({
    mutationFn: async (actionType: "save" | "thermal" | "whatsapp") => {
      if (!effectiveCustomerName.trim()) {
        throw new Error(customerType === "dealer" ? "Please select a dealer or enter customer name" : "Please enter customer name");
      }
      if (lines.length === 0) {
        throw new Error("Please add at least one product to the bill");
      }

      const isoDate = billDate
        ? (billDate.includes("T") ? billDate : `${billDate}T12:00:00.000Z`)
        : new Date().toISOString();

      const orderBody = {
        kind: "sale",
        party_id: customerType === "dealer" ? dealerId : null,
        party_name: effectiveCustomerName.trim(),
        ref_no: refNo.trim() || undefined,
        date: isoDate,
        notes: `${notes.trim()}${payMethod ? ` [Payment: ${payMethod}]` : ""}${effectivePhone ? ` [Phone: ${effectivePhone}]` : ""}`,
        items: lines.map((l) => ({
          product_id: l.product_id,
          model: l.model,
          qty: l.qty,
          rate: l.rate,
          cost: l.cost,
          amount: Math.round(l.qty * l.rate * 100) / 100,
        })),
        initial_payment: numericPaid,
      };

      const res = await apiPost("/sales", orderBody);

      const billData: BillData = {
        refNo: res.ref_no || refNo,
        date: isoDate,
        customerName: effectiveCustomerName,
        customerPhone: effectivePhone,
        items: lines.map((l) => ({
          model: l.model,
          qty: l.qty,
          rate: l.rate,
          amount: Math.round(l.qty * l.rate * 100) / 100,
        })),
        total: totalAmount,
        paid: numericPaid,
        balance: balanceDue,
        payMethod,
        notes,
      };

      return { res, billData, actionType };
    },
    onSuccess: ({ billData, actionType }) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reports"] });

      show("Bill created & inventory stock updated", "success");
      setCompletedBill(billData);

      if (actionType === "thermal") {
        printThermalReceipt(billData);
      } else if (actionType === "whatsapp") {
        const clean = (billData.customerPhone || "").replace(/[^0-9]/g, "");
        if (clean.length >= 10) {
          const text = generateWhatsAppBillText(billData);
          sendWhatsAppBill(billData.customerPhone, text);
        } else {
          // Explicitly ask for customer name and WhatsApp number via modal
          setWhatsAppModalBill(billData);
          setShowWhatsAppModal(true);
        }
      }
    },
    onError: (err: any) => {
      show(err?.message || "Failed to create bill", "error");
    },
  });

  function handleInitiateWhatsApp() {
    if (lines.length === 0) {
      show("Please add at least one product to the bill", "error");
      return;
    }
    const clean = effectivePhone.replace(/[^0-9]/g, "");
    if (!effectiveCustomerName || clean.length < 10) {
      // Prompt modal to ask for Customer Name & WhatsApp Number
      setWhatsAppModalBill(previewBillData);
      setShowWhatsAppModal(true);
    } else {
      mutation.mutate("whatsapp");
    }
  }

  const previewBillData: BillData = {
    refNo,
    date: billDate,
    customerName: effectiveCustomerName || "Customer Name",
    customerPhone: effectivePhone,
    items: lines.map((l) => ({
      model: l.model,
      qty: l.qty,
      rate: l.rate,
      amount: l.qty * l.rate,
    })),
    total: totalAmount,
    paid: numericPaid,
    balance: balanceDue,
    payMethod,
    notes,
  };

  const whatsAppPreviewText = generateWhatsAppBillText(previewBillData);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>⚡ Billing Software &amp; Fast POS</h1>
          <p>Instant retail/wholesale billing, WhatsApp bill delivery &amp; 80mm thermal receipt printing</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline btn-sm" onClick={resetForm}>
            ✕ Clear
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/sales")}>
            📋 View All Invoices
          </button>
        </div>
      </div>

      <div className="page-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--s5)", alignItems: "start" }}>
        {/* Left Column: Bill Input Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
          {/* Customer / WhatsApp Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title" style={{ marginBottom: 0 }}>1. Customer &amp; WhatsApp Details</div>
              <div className="chip-bar">
                <button
                  type="button"
                  className={`chip${customerType === "dealer" ? " active" : ""}`}
                  onClick={() => {
                    setCustomerType("dealer");
                    if (selectedDealer) {
                      setCustomerName(selectedDealer.shop_name || "");
                      setCustomerPhone(selectedDealer.whatsapp || selectedDealer.phone || "");
                    }
                  }}
                >
                  🏪 Dealer
                </button>
                <button
                  type="button"
                  className={`chip${customerType === "counter" ? " active" : ""}`}
                  onClick={() => setCustomerType("counter")}
                >
                  👤 Counter Sale
                </button>
              </div>
            </div>

            {customerType === "dealer" && (
              <div className="field">
                <label>Select Registered Dealer</label>
                <select
                  className="input"
                  value={dealerId}
                  onChange={(e) => selectDealer(e.target.value)}
                >
                  <option value="">Select registered dealer…</option>
                  {dealers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.shop_name} — {d.area || "Mumbai"}
                    </option>
                  ))}
                </select>
                {selectedDealer && (
                  <div style={{ fontSize: 12, color: "var(--muted)", background: "var(--surface-2)", padding: "6px 10px", borderRadius: "var(--r-sm)" }}>
                    📍 {selectedDealer.area} | 📞 Registered Phone: {selectedDealer.phone || selectedDealer.whatsapp || "No phone"}
                  </div>
                )}
              </div>
            )}

            <div className="grid-2">
              <div className="field">
                <label>
                  Customer / Party Name <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  className="input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={customerType === "dealer" ? "Dealer / Customer Name" : "e.g. Ramesh Patel"}
                />
              </div>
              <div className="field">
                <label>
                  WhatsApp Mobile Number <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0 8px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      fontWeight: 700,
                      fontSize: 12,
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
                    placeholder="10-digit WhatsApp number"
                  />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  Bill receipt will be sent directly to this WhatsApp number
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Bill / Invoice No.</label>
                <input
                  className="input"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                />
              </div>
              <div className="field">
                <label>Billing Date</label>
                <input
                  className="input"
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="section-title" style={{ marginBottom: 0 }}>2. Select Products</div>
              <span className="badge" style={{ background: "var(--surface-2)", color: "var(--on-surface)" }}>
                {lines.length} Item(s)
              </span>
            </div>

            <div className="field">
              <select
                className="input"
                value=""
                onChange={(e) => {
                  addProduct(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">+ Search and add TV model / product…</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.model} — {formatINR(p.sell_price)} (Stock: {p.qty_on_hand})
                  </option>
                ))}
              </select>
            </div>

            {lines.length === 0 ? (
              <div style={{ padding: "var(--s4)", textAlign: "center", color: "var(--muted)", background: "var(--surface-2)", borderRadius: "var(--r-md)", fontSize: 13 }}>
                🛒 No items added. Choose a product from the dropdown above to add it to the bill.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                {lines.map((l) => {
                  const lineTotal = l.qty * l.rate;
                  const isOverStock = l.qty > l.stock;

                  return (
                    <div
                      key={l.key}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--r-md)",
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{l.model}</span>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: "var(--error)", padding: 4 }}
                          onClick={() => removeLine(l.key)}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: "var(--s3)", alignItems: "center", flexWrap: "wrap" }}>
                        {/* Qty Counter */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 4 }}>Qty:</span>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: "2px 8px", minWidth: 28, height: 28 }}
                            onClick={() => updateQty(l.key, -1)}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 800, minWidth: 24, textAlign: "center" }}>{l.qty}</span>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: "2px 8px", minWidth: 28, height: 28 }}
                            onClick={() => updateQty(l.key, 1)}
                          >
                            +
                          </button>
                        </div>

                        {/* Rate */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 120 }}>
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>Rate: ₹</span>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            style={{ padding: "4px 8px", minHeight: 30, height: 30 }}
                            value={l.rate}
                            onChange={(e) => updateRate(l.key, e.target.value)}
                          />
                        </div>

                        {/* Amount */}
                        <div style={{ textAlign: "right", minWidth: 90 }}>
                          <span style={{ fontWeight: 800, color: "var(--brand)", fontSize: 15 }}>
                            {formatINR(lineTotal)}
                          </span>
                        </div>
                      </div>

                      {isOverStock && (
                        <div style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600 }}>
                          ⚠️ Warning: Godown stock is {l.stock} unit(s). Billing {l.qty} will set negative stock.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Details Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            <div className="section-title" style={{ marginBottom: 0 }}>3. Payment &amp; Settlement</div>

            <div className="grid-2">
              <div className="field">
                <label>Payment Mode</label>
                <select
                  className="input"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash at Counter</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit / Udhar">Credit / Udhar (Unpaid)</option>
                </select>
              </div>

              <div className="field">
                <label>Amount Paid Now (₹)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  placeholder={`Full: ${formatINR(totalAmount)}`}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label>Bill Terms / Notes</label>
              <input
                className="input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks or warranty terms"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Receipt Preview & Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)", position: "sticky", top: "calc(var(--topbar-h) + 16px)" }}>
          {/* Financial Summary Card */}
          <div className="card" style={{ background: "linear-gradient(145deg, var(--surface) 0%, var(--surface-2) 100%)", display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
              Bill Total Breakdown
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: 8 }}>
              <span style={{ color: "var(--muted)" }}>Subtotal ({lines.length} items)</span>
              <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatINR(totalAmount)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed var(--border)", paddingBottom: 8 }}>
              <span style={{ color: "var(--muted)" }}>Paid ({payMethod})</span>
              <span style={{ fontWeight: 700, color: "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                {formatINR(numericPaid)}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Balance Due</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: balanceDue > 0 ? "var(--error)" : "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                {formatINR(balanceDue)}
              </span>
            </div>

            {/* Fast Trigger Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)", marginTop: "var(--s2)" }}>
              <button
                className="btn btn-primary"
                style={{ padding: "12px", fontSize: 15, background: "var(--brand)" }}
                disabled={mutation.isPending || lines.length === 0}
                onClick={() => mutation.mutate("thermal")}
              >
                🖨 Save &amp; Print Thermal Slip (80mm)
              </button>

              <button
                className="btn btn-primary"
                style={{ padding: "12px", fontSize: 15, background: "#10b981", color: "#fff" }}
                disabled={mutation.isPending || lines.length === 0}
                onClick={handleInitiateWhatsApp}
              >
                📲 Save &amp; Send WhatsApp Bill
              </button>

              <button
                className="btn btn-outline"
                style={{ padding: "10px" }}
                disabled={mutation.isPending || lines.length === 0}
                onClick={() => mutation.mutate("save")}
              >
                ✓ Save Bill Only
              </button>
            </div>
          </div>

          {/* Thermal Slip Live Preview Card */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>🧾 Thermal Receipt Preview (80mm)</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => printThermalReceipt(previewBillData)}
                disabled={lines.length === 0}
                title="Print thermal test receipt"
              >
                🖨 Test Print
              </button>
            </div>

            <div className="thermal-receipt">
              <div className="thermal-center">
                <h3>SONEJA ELECTRONICS</h3>
                <div>Wholesale Distribution &amp; Retail</div>
                <div>Mumbai | 📞 9653190285</div>
              </div>
              <div className="thermal-dashed"></div>
              <div className="thermal-row">
                <span>Bill: {refNo}</span>
                <span>{billDate}</span>
              </div>
              <div className="thermal-row">
                <span>Party: {effectiveCustomerName || "Counter"}</span>
                <span>{effectivePhone || ""}</span>
              </div>
              <div className="thermal-dashed"></div>
              {lines.length === 0 ? (
                <div className="thermal-center" style={{ color: "#888", padding: "6px 0" }}>
                  (No items selected)
                </div>
              ) : (
                lines.map((it, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    <div className="thermal-bold">{it.model}</div>
                    <div className="thermal-row">
                      <span>{it.qty} x ₹{it.rate}</span>
                      <span className="thermal-bold">₹{it.qty * it.rate}</span>
                    </div>
                  </div>
                ))
              )}
              <div className="thermal-dashed"></div>
              <div className="thermal-row thermal-bold">
                <span>TOTAL:</span>
                <span>{formatINR(totalAmount)}</span>
              </div>
              <div className="thermal-row">
                <span>Paid ({payMethod}):</span>
                <span>{formatINR(numericPaid)}</span>
              </div>
              <div className="thermal-row thermal-bold" style={{ color: balanceDue > 0 ? "#b91c1c" : "#000" }}>
                <span>Balance Due:</span>
                <span>{formatINR(balanceDue)}</span>
              </div>
              <div className="thermal-double"></div>
              <div className="thermal-center" style={{ fontSize: 10 }}>
                *** THANK YOU FOR VISITING ***<br />
                Save Paper · Digital POS Slip
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Completed Success Modal */}
      {completedBill && (
        <div className="modal-overlay" onClick={() => setCompletedBill(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✅ Bill Saved Successfully!</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setCompletedBill(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 36 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)" }}>
                  {completedBill.refNo} — {formatINR(completedBill.total)}
                </div>
                <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                  Stock deducted automatically from inventory
                </p>
              </div>

              {/* Customer & WhatsApp Details in modal */}
              <div style={{ background: "var(--surface-2)", padding: "12px", borderRadius: "var(--r-md)", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Customer Name:</label>
                  <input
                    className="input"
                    value={completedBill.customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompletedBill(prev => prev ? { ...prev, customerName: val } : null);
                    }}
                    placeholder="Customer Name"
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>WhatsApp Number (for sending bill):</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "0 8px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", fontWeight: 700, fontSize: 12, color: "var(--muted)" }}>
                      +91
                    </span>
                    <input
                      className="input"
                      type="tel"
                      style={{ flex: 1 }}
                      value={completedBill.customerPhone || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompletedBill(prev => prev ? { ...prev, customerPhone: val } : null);
                      }}
                      placeholder="10-digit WhatsApp number"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Text Card */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>WhatsApp Message Preview:</label>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11 }}
                    onClick={() => {
                      const text = generateWhatsAppBillText(completedBill);
                      navigator.clipboard.writeText(text);
                      show("WhatsApp text copied to clipboard!", "success");
                    }}
                  >
                    📋 Copy Text
                  </button>
                </div>
                <textarea
                  className="input"
                  rows={6}
                  readOnly
                  value={generateWhatsAppBillText(completedBill)}
                  style={{ fontFamily: "monospace", fontSize: 11.5, background: "var(--surface-2)" }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
                <button
                  className="btn btn-primary"
                  style={{ background: "#25D366", color: "#fff", fontWeight: 700 }}
                  onClick={() => {
                    const text = generateWhatsAppBillText(completedBill);
                    if (!completedBill.customerPhone || completedBill.customerPhone.replace(/[^0-9]/g, "").length < 10) {
                      setWhatsAppModalBill(completedBill);
                      setShowWhatsAppModal(true);
                    } else {
                      sendWhatsAppBill(completedBill.customerPhone, text);
                      show(`Opening WhatsApp for +91 ${completedBill.customerPhone}...`, "success");
                    }
                  }}
                >
                  📲 Send Directly via WhatsApp {completedBill.customerPhone ? `(+91 ${completedBill.customerPhone})` : ""}
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => printThermalReceipt(completedBill)}
                >
                  🖨 Print Thermal Receipt (80mm)
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  resetForm();
                  setCompletedBill(null);
                }}
              >
                + Create Another Bill
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/sales")}
              >
                View Sales List →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated WhatsApp Prompt & Send Modal */}
      <WhatsAppModal
        open={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        bill={whatsAppModalBill || (completedBill ? completedBill : previewBillData)}
        onSent={(name, phone) => {
          setCustomerName(name);
          setCustomerPhone(phone);
          if (completedBill) {
            setCompletedBill((prev) => prev ? { ...prev, customerName: name, customerPhone: phone } : null);
          } else {
            // Save bill and dispatch
            mutation.mutate("save");
          }
        }}
      />
    </div>
  );
}
