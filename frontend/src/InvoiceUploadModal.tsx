import React, { useState, useRef } from "react";
import {
  formatFileSize,
  compressImageIfNeeded,
  readFileAsDataUrl,
  saveInvoiceToIdb,
  type InvoiceAttachment,
} from "./invoiceStorage";
import { apiPost } from "./api";
import { useToast } from "./toast";
import { Spinner } from "./ui";

interface InvoiceUploadModalProps {
  order: any;
  onClose: () => void;
  onSuccess: (updatedOrder: any) => void;
}

export function InvoiceUploadModal({ order, onClose, onSuccess }: InvoiceUploadModalProps) {
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function handleFileSelected(file: File) {
    // Validate file type
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/jpg"];
    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    if (!validTypes.includes(file.type) && !isPdf) {
      show("Please upload a PDF or image file (JPG, PNG, WEBP)", "error");
      return;
    }
    // Validate size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      show("File size exceeds 10MB limit. Please upload a smaller file.", "error");
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function handleUpload() {
    if (!selectedFile) {
      show("Please select an invoice file to upload", "error");
      return;
    }

    setIsUploading(true);
    try {
      let finalDataUrl = "";
      let finalSize = selectedFile.size;

      if (selectedFile.type.startsWith("image/")) {
        // Compress high-res camera photos to ensure snappy load times and low memory
        const compressed = await compressImageIfNeeded(selectedFile);
        finalDataUrl = compressed.dataUrl;
        finalSize = compressed.size;
      } else {
        finalDataUrl = await readFileAsDataUrl(selectedFile);
      }

      const attachment: InvoiceAttachment = {
        name: selectedFile.name,
        type: selectedFile.type || (selectedFile.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        size: finalSize,
        data_url: finalDataUrl,
        uploaded_at: new Date().toISOString(),
      };

      // 1. Save directly into browser IndexedDB for unlimited capacity
      await saveInvoiceToIdb(order.id, attachment);

      // 2. Call API to update the order record and sync with RTDB
      // For RTDB and localStorage, keep attachment in order
      const res = await apiPost(`/orders/${order.id}/invoice`, {
        invoice_file: attachment,
      });

      show("Invoice uploaded and attached successfully", "success");
      onSuccess(res || { ...order, invoice_file: attachment });
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err);
      show(err?.message || "Failed to upload invoice", "error");
    } finally {
      setIsUploading(false);
    }
  }

  const isPdf = selectedFile?.name.toLowerCase().endsWith(".pdf") || selectedFile?.type === "application/pdf";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--s4)",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--s3)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>
              {order.invoice_file ? "🔄 Replace Invoice Document" : "📤 Upload Invoice Document"}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted)" }}>
              Sale Invoice: <strong>{order.ref_no || order.id}</strong> · {order.party_name}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={onClose}
            disabled={isUploading}
          >
            ✕
          </button>
        </div>

        {/* Existing file notice if replacing */}
        {order.invoice_file && !selectedFile && (
          <div
            style={{
              padding: "var(--s2) var(--s3)",
              background: "var(--surface-2)",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>📄 Current File:</span>
            <strong>{order.invoice_file.name}</strong>
            <span style={{ color: "var(--muted)" }}>({formatFileSize(order.invoice_file.size)})</span>
          </div>
        )}

        {/* Drag & Drop Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "var(--brand)" : selectedFile ? "var(--success)" : "var(--border)"}`,
            borderRadius: "var(--r-md)",
            padding: "var(--s5)",
            textAlign: "center",
            cursor: "pointer",
            background: isDragging
              ? "rgba(16, 185, 129, 0.08)"
              : selectedFile
              ? "var(--surface-2)"
              : "var(--surface-2)",
            transition: "all 0.2s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--s2)",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelected(e.target.files[0]);
              }
            }}
          />

          {selectedFile ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxHeight: 140,
                    maxWidth: "100%",
                    objectFit: "contain",
                    borderRadius: "var(--r-sm)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                />
              ) : (
                <div style={{ fontSize: 44 }}>{isPdf ? "📄" : "📎"}</div>
              )}
              <div style={{ fontWeight: 700, fontSize: 14, wordBreak: "break-all" }}>{selectedFile.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                {formatFileSize(selectedFile.size)} · {selectedFile.type || "Document"}
              </div>
              <button
                type="button"
                className="btn btn-outline btn-xs"
                style={{ marginTop: 4 }}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Change File
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 42, color: "var(--brand)" }}>📤</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Click to browse or drag &amp; drop invoice here</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Supports signed bill copy, delivery challan, or invoice in <strong>PDF, PNG, JPG, WEBP</strong> (up to 10MB)
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: 6 }}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Select File from Device
              </button>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--s2)", marginTop: "var(--s2)" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Spinner /> Attaching Invoice...
              </span>
            ) : (
              "Upload & Attach Invoice"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
