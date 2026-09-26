// Soneja Electronics - IndexedDB & Client-side Storage for Invoice Attachments
export interface InvoiceAttachment {
  name: string;
  type: string;
  size: number;
  data_url: string;
  uploaded_at: string;
}

const DB_NAME = "soneja_invoices_db";
const DB_VERSION = 1;
const STORE_NAME = "invoices";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "order_id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

export async function saveInvoiceToIdb(orderId: string, invoice: InvoiceAttachment): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ order_id: orderId, invoice });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to write invoice to IndexedDB:", err);
  }
}

export async function getInvoiceFromIdb(orderId: string): Promise<InvoiceAttachment | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(orderId);
      req.onsuccess = () => {
        resolve(req.result ? req.result.invoice : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteInvoiceFromIdb(orderId: string): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(orderId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Compress images automatically so camera snapshots (e.g. 5MB) scale cleanly to ~150-300KB
export async function compressImageIfNeeded(
  file: File,
  maxDim = 1600,
  quality = 0.82
): Promise<{ dataUrl: string; size: number }> {
  if (!file.type.startsWith("image/") || file.type.includes("svg")) {
    const rawData = await readFileAsDataUrl(file);
    return { dataUrl: rawData, size: file.size };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const fallback = e.target?.result as string;
          return resolve({ dataUrl: fallback, size: file.size });
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
        const compressed = canvas.toDataURL(mime, quality);
        // Estimate size from base64 string
        const base64Len = compressed.length - (compressed.indexOf(",") + 1);
        const estSize = Math.round((base64Len * 3) / 4);

        resolve({ dataUrl: compressed, size: estSize });
      };
      img.onerror = () => {
        const fallback = e.target?.result as string;
        resolve({ dataUrl: fallback, size: file.size });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
