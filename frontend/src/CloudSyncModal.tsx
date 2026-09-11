import React, { useState, useEffect } from "react";
import {
  getSyncStatus,
  subscribeToSyncStatus,
  type SyncStatus,
  startRealtimeSync,
  stopRealtimeSync,
} from "./firebaseSync";
import {
  getActiveFirebaseConfig,
  saveFirebaseConfig,
  type FirebaseConfig,
  clearFirebaseConfig,
} from "./firebaseConfig";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "./toast";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloudSyncModal({ isOpen, onClose }: CloudSyncModalProps) {
  const qc = useQueryClient();
  const { show } = useToast();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [pastedCode, setPastedCode] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("soneja-electronics");
  const [appId, setAppId] = useState("");
  const [authDomain, setAuthDomain] = useState("soneja-electronics.firebaseapp.com");
  const [storageBucket, setStorageBucket] = useState("soneja-electronics.firebasestorage.app");
  const [messagingSenderId, setMessagingSenderId] = useState("");
  const [databaseURL, setDatabaseURL] = useState("");

  useEffect(() => {
    const unsub = subscribeToSyncStatus(setStatus);
    const existing = getActiveFirebaseConfig();
    if (existing) {
      setApiKey(existing.apiKey || "");
      setProjectId(existing.projectId || "soneja-electronics");
      setAppId(existing.appId || "");
      setAuthDomain(existing.authDomain || "soneja-electronics.firebaseapp.com");
      setStorageBucket(existing.storageBucket || "soneja-electronics.firebasestorage.app");
      setMessagingSenderId(existing.messagingSenderId || "");
      setDatabaseURL(existing.databaseURL || "");
    }
    return unsub;
  }, [isOpen]);

  // Handle parsing pasted Firebase config code
  function handlePasteParse(text: string) {
    setPastedCode(text);
    try {
      const apiMatch = text.match(/apiKey:\s*["']([^"']+)["']/);
      const projMatch = text.match(/projectId:\s*["']([^"']+)["']/);
      const appMatch = text.match(/appId:\s*["']([^"']+)["']/);
      const authMatch = text.match(/authDomain:\s*["']([^"']+)["']/);
      const storageMatch = text.match(/storageBucket:\s*["']([^"']+)["']/);
      const senderMatch = text.match(/messagingSenderId:\s*["']([^"']+)["']/);

      if (apiMatch) setApiKey(apiMatch[1]);
      if (projMatch) setProjectId(projMatch[1]);
      if (appMatch) setAppId(appMatch[1]);
      if (authMatch) setAuthDomain(authMatch[1]);
      if (storageMatch) setStorageBucket(storageMatch[1]);
      if (senderMatch) setMessagingSenderId(senderMatch[1]);
      const dbUrlMatch = text.match(/databaseURL:\s*["']([^"']+)["']/);
      if (dbUrlMatch) setDatabaseURL(dbUrlMatch[1]);

      if (apiMatch && projMatch) {
        show("Extracted Firebase credentials successfully!", "success");
      }
    } catch {
      // Ignored
    }
  }

  function handleSave() {
    if (!apiKey.trim()) {
      show("Please provide a valid Firebase API Key", "error");
      return;
    }
    if (!projectId.trim()) {
      show("Please provide your Firebase Project ID", "error");
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      appId: appId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.firebasestorage.app`,
      messagingSenderId: messagingSenderId.trim(),
      databaseURL: databaseURL.trim() || undefined,
    };

    saveFirebaseConfig(config);
    stopRealtimeSync();
    startRealtimeSync(qc);
    show("Cloud sync activated! Real-time syncing enabled.", "success");
    onClose();
  }

  function handleDisconnect() {
    clearFirebaseConfig();
    stopRealtimeSync();
    show("Cloud sync disconnected. Operating in local storage mode.", "info");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 560, width: "95%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>☁️</span>
            <div>
              <div className="modal-title">Cloud Sync & Real-Time Setup</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Universal data synchronization across all devices
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Status Card */}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              background: status.connected ? "rgba(34, 197, 94, 0.1)" : "rgba(234, 179, 8, 0.1)",
              border: `1px solid ${status.connected ? "rgba(34, 197, 94, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: status.connected ? "#22c55e" : "#eab308",
                  boxShadow: status.connected ? "0 0 8px #22c55e" : "none",
                  display: "inline-block",
                }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {status.connected ? "Cloud Synced (Live)" : "Local Storage (Not Connected)"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {status.connected
                    ? `Connected to Firebase project: ${status.projectId || "soneja-electronics"}`
                    : "Data is currently stored only in this browser."}
                </div>
              </div>
            </div>
            {status.lastSyncedAt && (
              <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "right" }}>
                <div>Last synced</div>
                <div>{new Date(status.lastSyncedAt).toLocaleTimeString()}</div>
              </div>
            )}
          </div>

          {status.connected && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                textAlign: "center",
                background: "var(--surface-sunken)",
                padding: "10px 8px",
                borderRadius: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Orders</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{status.activeCollectionCounts.orders}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Products</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{status.activeCollectionCounts.products}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Dealers</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{status.activeCollectionCounts.dealers}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Expenses</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{status.activeCollectionCounts.expenses}</div>
              </div>
            </div>
          )}

          {/* Paste Config block */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>
              Quick Paste: Firebase Config Snippet
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder={'Paste `const firebaseConfig = { apiKey: "...", ... }` here'}
              value={pastedCode}
              onChange={(e) => handlePasteParse(e.target.value)}
              style={{ fontSize: 11, fontFamily: "monospace" }}
            />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              Paste the code snippet from Firebase Console Step 2 and fields below will auto-fill.
            </span>
          </div>

          {/* Form fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11 }}>API Key (apiKey) *</label>
              <input
                type="text"
                className="form-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                style={{ fontSize: 12 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11 }}>Project ID *</label>
              <input
                type="text"
                className="form-input"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="soneja-electronics"
                style={{ fontSize: 12 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11 }}>App ID (appId)</label>
              <input
                type="text"
                className="form-input"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1:123456789:web:abcdef"
                style={{ fontSize: 12 }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 11 }}>Messaging Sender ID</label>
              <input
                type="text"
                className="form-input"
                value={messagingSenderId}
                onChange={(e) => setMessagingSenderId(e.target.value)}
                placeholder="1234567890"
                style={{ fontSize: 12 }}
              />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label className="form-label" style={{ fontSize: 11 }}>Database URL (for Realtime Database, optional)</label>
              <input
                type="text"
                className="form-input"
                value={databaseURL}
                onChange={(e) => setDatabaseURL(e.target.value)}
                placeholder="https://soneja-electronics-default-rtdb.firebaseio.com"
                style={{ fontSize: 12 }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between" }}>
          {status.connected ? (
            <button className="btn btn-danger" onClick={handleDisconnect} style={{ fontSize: 12 }}>
              Disconnect Cloud
            </button>
          ) : (
            <div />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save & Connect Cloud
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CloudSyncBadge({ onOpenModal }: { onOpenModal: () => void }) {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());

  useEffect(() => {
    return subscribeToSyncStatus(setStatus);
  }, []);

  return (
    <button
      onClick={onOpenModal}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        border: `1px solid ${status.connected ? "rgba(34, 197, 94, 0.4)" : "rgba(234, 179, 8, 0.4)"}`,
        background: status.connected ? "rgba(34, 197, 94, 0.12)" : "rgba(234, 179, 8, 0.12)",
        color: status.connected ? "#22c55e" : "#eab308",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      title={status.connected ? "Cloud Firestore is connected & syncing in real time" : "Click to connect Cloud Sync"}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: status.connected ? "#22c55e" : "#eab308",
          boxShadow: status.connected ? "0 0 6px #22c55e" : "none",
        }}
      />
      <span>{status.connected ? "Cloud Synced" : "Setup Cloud"}</span>
    </button>
  );
}
