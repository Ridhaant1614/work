// Soneja Electronics - Firebase Real-Time Synchronization Engine
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import {
  getDatabase,
  type Database,
  ref,
  set,
  remove,
  onValue,
  get,
} from "firebase/database";
import type { QueryClient } from "@tanstack/react-query";
import {
  getActiveFirebaseConfig,
  type FirebaseConfig,
} from "./firebaseConfig";
import {
  SEED_PRODUCTS,
  SEED_DEALERS,
  SEED_ORDERS,
  SEED_EXPENSES,
} from "./mockData";

let firestoreInstance: Firestore | null = null;
let rtdbInstance: Database | null = null;
let firebaseAppInstance: FirebaseApp | null = null;
let activeUnsubscribers: (() => void)[] = [];
let isSeeding = false;
let syncStatusListeners: ((status: SyncStatus) => void)[] = [];
let activeMode: "firestore" | "rtdb" | "none" = "none";

export interface SyncStatus {
  connected: boolean;
  mode: "firestore" | "rtdb" | "none";
  projectId: string;
  lastSyncedAt: Date | null;
  activeCollectionCounts: {
    orders: number;
    products: number;
    dealers: number;
    expenses: number;
  };
  error: string | null;
}

let currentStatus: SyncStatus = {
  connected: false,
  mode: "none",
  projectId: "",
  lastSyncedAt: null,
  activeCollectionCounts: { orders: 0, products: 0, dealers: 0, expenses: 0 },
  error: null,
};

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function subscribeToSyncStatus(listener: (status: SyncStatus) => void): () => void {
  syncStatusListeners.push(listener);
  listener(currentStatus);
  return () => {
    syncStatusListeners = syncStatusListeners.filter((l) => l !== listener);
  };
}

function notifyStatusUpdate(patch: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...patch };
  syncStatusListeners.forEach((l) => l(currentStatus));
}

function sanitizeForFirebase(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirebase);
  if (typeof obj === "object" && !(obj instanceof Date)) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = sanitizeForFirebase(v);
      }
    }
    return res;
  }
  return obj;
}

export function initFirebase(): { firestore: Firestore | null; rtdb: Database | null } {
  if (firestoreInstance || rtdbInstance) {
    return { firestore: firestoreInstance, rtdb: rtdbInstance };
  }

  const config = getActiveFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    notifyStatusUpdate({ connected: false, mode: "none", error: "Firebase credentials missing" });
    return { firestore: null, rtdb: null };
  }

  try {
    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    firebaseAppInstance = app;

    // If databaseURL is specified or provided, initialize Realtime Database
    if (config.databaseURL) {
      try {
        rtdbInstance = getDatabase(app, config.databaseURL);
        activeMode = "rtdb";
      } catch (e) {
        console.warn("RTDB init warning:", e);
      }
    }

    // Initialize Firestore as primary or fallback
    try {
      firestoreInstance = getFirestore(app);
      if (activeMode === "none") activeMode = "firestore";
    } catch (e) {
      console.warn("Firestore init warning:", e);
    }

    // Default to RTDB if databaseURL is available or firestore is unavailable
    if (!firestoreInstance && !rtdbInstance) {
      try {
        const defaultRtdbUrl = `https://${config.projectId}-default-rtdb.firebaseio.com`;
        rtdbInstance = getDatabase(app, defaultRtdbUrl);
        activeMode = "rtdb";
      } catch {}
    }

    notifyStatusUpdate({
      connected: true,
      mode: activeMode,
      projectId: config.projectId,
      error: null,
    });

    return { firestore: firestoreInstance, rtdb: rtdbInstance };
  } catch (err: any) {
    console.error("Firebase init failed:", err);
    notifyStatusUpdate({ connected: false, mode: "none", error: err.message || "Failed to initialize Firebase" });
    return { firestore: null, rtdb: null };
  }
}

export function isFirebaseConnected(): boolean {
  return firestoreInstance !== null || rtdbInstance !== null;
}

export function startRealtimeSync(queryClient: QueryClient) {
  stopRealtimeSync();

  const { firestore, rtdb } = initFirebase();
  const STORAGE_PREFIX = "soneja_demo_";

  function updateLocalStore(key: string, data: any[]) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    } catch {}
  }

  // --- Realtime Database (RTDB) Mode ---
  if (rtdb && (activeMode === "rtdb" || !firestore)) {
    // 1. Orders
    const unsubOrders = onValue(
      ref(rtdb, "orders"),
      (snapshot) => {
        const val = snapshot.val();
        if (!val && !isSeeding) {
          seedRtdb(rtdb, queryClient);
          return;
        }
        const orders = val ? Object.values(val) : [];
        orders.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        updateLocalStore("orders", orders);

        notifyStatusUpdate({
          mode: "rtdb",
          lastSyncedAt: new Date(),
          activeCollectionCounts: {
            ...currentStatus.activeCollectionCounts,
            orders: orders.length,
          },
        });

        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
      },
      (err) => {
        console.warn("RTDB orders error:", err);
      }
    );
    activeUnsubscribers.push(unsubOrders);

    // 2. Products
    const unsubProducts = onValue(ref(rtdb, "products"), (snapshot) => {
      const val = snapshot.val();
      if (!val && !isSeeding) {
        seedRtdb(rtdb, queryClient);
        return;
      }
      const products = val ? Object.values(val) : [];
      updateLocalStore("products", products);

      notifyStatusUpdate({
        lastSyncedAt: new Date(),
        activeCollectionCounts: {
          ...currentStatus.activeCollectionCounts,
          products: products.length,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });
    activeUnsubscribers.push(unsubProducts);

    // 3. Dealers
    const unsubDealers = onValue(ref(rtdb, "dealers"), (snapshot) => {
      const val = snapshot.val();
      if (!val && !isSeeding) {
        seedRtdb(rtdb, queryClient);
        return;
      }
      const dealers = val ? Object.values(val) : [];
      updateLocalStore("dealers", dealers);

      notifyStatusUpdate({
        lastSyncedAt: new Date(),
        activeCollectionCounts: {
          ...currentStatus.activeCollectionCounts,
          dealers: dealers.length,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["dealers"] });
    });
    activeUnsubscribers.push(unsubDealers);

    // 4. Expenses
    const unsubExpenses = onValue(ref(rtdb, "expenses"), (snapshot) => {
      const val = snapshot.val();
      const expenses = val ? Object.values(val) : [];
      expenses.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      updateLocalStore("expenses", expenses);

      notifyStatusUpdate({
        lastSyncedAt: new Date(),
        activeCollectionCounts: {
          ...currentStatus.activeCollectionCounts,
          expenses: expenses.length,
        },
      });

      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    });
    activeUnsubscribers.push(unsubExpenses);

    return;
  }

  // --- Cloud Firestore Mode ---
  if (firestore) {
    const unsubOrders = onSnapshot(
      collection(firestore, "orders"),
      (snapshot) => {
        if (snapshot.empty && !isSeeding) {
          seedFirestore(firestore, queryClient);
          return;
        }
        const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        orders.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        updateLocalStore("orders", orders);

        notifyStatusUpdate({
          mode: "firestore",
          lastSyncedAt: new Date(),
          activeCollectionCounts: {
            ...currentStatus.activeCollectionCounts,
            orders: orders.length,
          },
        });

        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
      },
      (err) => {
        console.warn("Firestore orders sync error (switching to RTDB check):", err);
        notifyStatusUpdate({ error: err.message });
      }
    );
    activeUnsubscribers.push(unsubOrders);

    const unsubProducts = onSnapshot(
      collection(firestore, "products"),
      (snapshot) => {
        if (snapshot.empty && !isSeeding) {
          seedFirestore(firestore, queryClient);
          return;
        }
        const products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        updateLocalStore("products", products);

        notifyStatusUpdate({
          lastSyncedAt: new Date(),
          activeCollectionCounts: {
            ...currentStatus.activeCollectionCounts,
            products: products.length,
          },
        });

        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      },
      (err) => console.warn(err)
    );
    activeUnsubscribers.push(unsubProducts);

    const unsubDealers = onSnapshot(
      collection(firestore, "dealers"),
      (snapshot) => {
        if (snapshot.empty && !isSeeding) {
          seedFirestore(firestore, queryClient);
          return;
        }
        const dealers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        updateLocalStore("dealers", dealers);

        notifyStatusUpdate({
          lastSyncedAt: new Date(),
          activeCollectionCounts: {
            ...currentStatus.activeCollectionCounts,
            dealers: dealers.length,
          },
        });

        queryClient.invalidateQueries({ queryKey: ["dealers"] });
      },
      (err) => console.warn(err)
    );
    activeUnsubscribers.push(unsubDealers);

    const unsubExpenses = onSnapshot(
      collection(firestore, "expenses"),
      (snapshot) => {
        const expenses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        expenses.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        updateLocalStore("expenses", expenses);

        notifyStatusUpdate({
          lastSyncedAt: new Date(),
          activeCollectionCounts: {
            ...currentStatus.activeCollectionCounts,
            expenses: expenses.length,
          },
        });

        queryClient.invalidateQueries({ queryKey: ["expenses"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
      },
      (err) => console.warn(err)
    );
    activeUnsubscribers.push(unsubExpenses);
  }
}

export function stopRealtimeSync() {
  activeUnsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch {}
  });
  activeUnsubscribers = [];
}

// Initial seeders
async function seedFirestore(db: Firestore, queryClient: QueryClient) {
  if (isSeeding) return;
  isSeeding = true;
  try {
    const prodSnap = await getDocs(collection(db, "products"));
    if (prodSnap.empty) {
      const batch = writeBatch(db);
      for (const p of SEED_PRODUCTS) batch.set(doc(db, "products", p.id), sanitizeForFirebase(p));
      for (const d of SEED_DEALERS) batch.set(doc(db, "dealers", d.id), sanitizeForFirebase(d));
      for (const o of SEED_ORDERS) batch.set(doc(db, "orders", o.id), sanitizeForFirebase(o));
      for (const e of SEED_EXPENSES) batch.set(doc(db, "expenses", e.id), sanitizeForFirebase(e));
      await batch.commit();
      queryClient.invalidateQueries();
    }
  } catch (err) {
    console.warn("Firestore seeding error:", err);
  } finally {
    isSeeding = false;
  }
}

async function seedRtdb(db: Database, queryClient: QueryClient) {
  if (isSeeding) return;
  isSeeding = true;
  try {
    const prodSnap = await get(ref(db, "products"));
    if (!prodSnap.exists()) {
      const pMap: Record<string, any> = {};
      SEED_PRODUCTS.forEach((p) => { pMap[p.id] = sanitizeForFirebase(p); });
      const dMap: Record<string, any> = {};
      SEED_DEALERS.forEach((d) => { dMap[d.id] = sanitizeForFirebase(d); });
      const oMap: Record<string, any> = {};
      SEED_ORDERS.forEach((o) => { oMap[o.id] = sanitizeForFirebase(o); });
      const eMap: Record<string, any> = {};
      SEED_EXPENSES.forEach((e) => { eMap[e.id] = sanitizeForFirebase(e); });

      await set(ref(db, "products"), pMap);
      await set(ref(db, "dealers"), dMap);
      await set(ref(db, "orders"), oMap);
      await set(ref(db, "expenses"), eMap);
      queryClient.invalidateQueries();
    }
  } catch (err) {
    console.warn("RTDB seeding error:", err);
  } finally {
    isSeeding = false;
  }
}

// Write-through mutations (supports Firestore and RTDB simultaneously)
export async function syncOrderToFirestore(order: any) {
  const { firestore, rtdb } = initFirebase();
  const sanitized = sanitizeForFirebase(order);
  if (firestore) {
    try {
      await setDoc(doc(firestore, "orders", String(order.id)), sanitized, { merge: true });
    } catch {}
  }
  if (rtdb) {
    try {
      await set(ref(rtdb, `orders/${order.id}`), sanitized);
    } catch {}
  }
}

export async function deleteOrderFromFirestore(orderId: string) {
  const { firestore, rtdb } = initFirebase();
  if (firestore) {
    try {
      await deleteDoc(doc(firestore, "orders", String(orderId)));
    } catch {}
  }
  if (rtdb) {
    try {
      await remove(ref(rtdb, `orders/${orderId}`));
    } catch {}
  }
}

export async function syncProductToFirestore(product: any) {
  const { firestore, rtdb } = initFirebase();
  const sanitized = sanitizeForFirebase(product);
  if (firestore) {
    try {
      await setDoc(doc(firestore, "products", String(product.id)), sanitized, { merge: true });
    } catch {}
  }
  if (rtdb) {
    try {
      await set(ref(rtdb, `products/${product.id}`), sanitized);
    } catch {}
  }
}

export async function syncProductsBatchToFirestore(products: any[]) {
  const { firestore, rtdb } = initFirebase();
  if (firestore) {
    try {
      const batch = writeBatch(firestore);
      for (const p of products) {
        if (p.id) batch.set(doc(firestore, "products", String(p.id)), sanitizeForFirebase(p), { merge: true });
      }
      await batch.commit();
    } catch {}
  }
  if (rtdb) {
    try {
      const pMap: Record<string, any> = {};
      products.forEach((p) => {
        if (p.id) pMap[p.id] = sanitizeForFirebase(p);
      });
      await set(ref(rtdb, "products"), pMap);
    } catch {}
  }
}

export async function deleteProductFromFirestore(productId: string) {
  const { firestore, rtdb } = initFirebase();
  if (firestore) {
    try {
      await deleteDoc(doc(firestore, "products", String(productId)));
    } catch {}
  }
  if (rtdb) {
    try {
      await remove(ref(rtdb, `products/${productId}`));
    } catch {}
  }
}

export async function syncDealerToFirestore(dealer: any) {
  const { firestore, rtdb } = initFirebase();
  const sanitized = sanitizeForFirebase(dealer);
  if (firestore) {
    try {
      await setDoc(doc(firestore, "dealers", String(dealer.id)), sanitized, { merge: true });
    } catch {}
  }
  if (rtdb) {
    try {
      await set(ref(rtdb, `dealers/${dealer.id}`), sanitized);
    } catch {}
  }
}

export async function deleteDealerFromFirestore(dealerId: string) {
  const { firestore, rtdb } = initFirebase();
  if (firestore) {
    try {
      await deleteDoc(doc(firestore, "dealers", String(dealerId)));
    } catch {}
  }
  if (rtdb) {
    try {
      await remove(ref(rtdb, `dealers/${dealerId}`));
    } catch {}
  }
}

export async function syncExpenseToFirestore(expense: any) {
  const { firestore, rtdb } = initFirebase();
  const sanitized = sanitizeForFirebase(expense);
  if (firestore) {
    try {
      await setDoc(doc(firestore, "expenses", String(expense.id)), sanitized, { merge: true });
    } catch {}
  }
  if (rtdb) {
    try {
      await set(ref(rtdb, `expenses/${expense.id}`), sanitized);
    } catch {}
  }
}

export async function deleteExpenseFromFirestore(expenseId: string) {
  const { firestore, rtdb } = initFirebase();
  if (firestore) {
    try {
      await deleteDoc(doc(firestore, "expenses", String(expenseId)));
    } catch {}
  }
  if (rtdb) {
    try {
      await remove(ref(rtdb, `expenses/${expenseId}`));
    } catch {}
  }
}
