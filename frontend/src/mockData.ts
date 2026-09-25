// In-browser mock data store for GitHub Pages live demo with Firebase Cloud Sync
import {
  syncOrderToFirestore,
  deleteOrderFromFirestore,
  syncProductToFirestore,
  syncProductsBatchToFirestore,
  deleteProductFromFirestore,
  syncDealerToFirestore,
  deleteDealerFromFirestore,
  syncExpenseToFirestore,
  deleteExpenseFromFirestore,
  getLocalDeletedIds,
  recordLocalDeletedId,
} from "./firebaseSync";

export const SEED_PRODUCTS = [
  { id: "p1", model: "32 Worldtech SM", sku: "32-WORLDTECH-SM", category: "Television", cost_price: 9200, sell_price: 10100, qty_on_hand: 12 },
  { id: "p2", model: "24 Worldtech", sku: "24-WORLDTECH", category: "Television", cost_price: 4800, sell_price: 5300, qty_on_hand: 5 },
  { id: "p3", model: "32 Worldtech BT", sku: "32-WORLDTECH-BT", category: "Television", cost_price: 10100, sell_price: 11100, qty_on_hand: 12 },
  { id: "p4", model: "32 Worldtech Glsm BT", sku: "32-WORLDTECH-GLSM-BT", category: "Television", cost_price: 11200, sell_price: 12300, qty_on_hand: 12 },
  { id: "p5", model: "43 Worldtech SM", sku: "43-WORLDTECH-SM", category: "Television", cost_price: 14600, sell_price: 16100, qty_on_hand: 10 },
  { id: "p6", model: "43 Worldtech BT", sku: "43-WORLDTECH-BT", category: "Television", cost_price: 15800, sell_price: 17400, qty_on_hand: 10 },
  { id: "p7", model: "43 Worldtech Glass BT", sku: "43-WORLDTECH-GLASS-BT", category: "Television", cost_price: 16700, sell_price: 18400, qty_on_hand: 10 },
  { id: "p8", model: "43 Worldtech Webos 4K", sku: "43-WORLDTECH-WEBOS-4K", category: "Television", cost_price: 19000, sell_price: 20900, qty_on_hand: 4 },
  { id: "p9", model: "50 Worldtech Qled Webos", sku: "50-WORLDTECH-QLED-WEBOS", category: "Television", cost_price: 25300, sell_price: 27800, qty_on_hand: 4 },
  { id: "p10", model: "58 Worldtech 4K QLED Webos", sku: "58-WORLDTECH-4K-QLED-WE", category: "Television", cost_price: 31500, sell_price: 34700, qty_on_hand: 2 },
  { id: "p11", model: "65 Worldtech Qled 4K Webos", sku: "65-WORLDTECH-QLED-4K-WE", category: "Television", cost_price: 42500, sell_price: 46800, qty_on_hand: 2 },
  { id: "p12", model: "43 Worldtech 2K Webos", sku: "43-WORLDTECH-2K-WEBOS", category: "Television", cost_price: 17000, sell_price: 18700, qty_on_hand: 4 },
];

export const SEED_DEALERS = [
  { id: "d1", shop_name: "Shree Samartha Electronics", contact_person: "Nitin Mane", phone: "9653190285", whatsapp: "9653190285", area: "Tagore Nagar, Vikhroli (E), Mumbai - 400083", notes: "" },
  { id: "d2", shop_name: "Hreenkar Electronics", contact_person: "Sales", phone: "9321934104", whatsapp: "9321934104", area: "Gokhale Rd (S), Prabhadevi, Mumbai - 25", notes: "" },
  { id: "d3", shop_name: "Keni Electronics", contact_person: "Rohit / Chinmay", phone: "9870456654", whatsapp: "9870456654", area: "Opp. Sahakar Cinema, Tilak Nagar, Chembur, Mumbai - 89", notes: "" },
  { id: "d4", shop_name: "Maruti Electronics", contact_person: "R.C. Purohit", phone: "9022237138", whatsapp: "9022237138", area: "Dharavi Main Road, Mumbai - 17", notes: "" },
  { id: "d5", shop_name: "Darsh Electronics", contact_person: "Owner", phone: "9820958939", whatsapp: "9820958939", area: "Sardar Nagar No. 2, Sion (E), Mumbai - 400022", notes: "" },
  { id: "d6", shop_name: "Sagar Electronics", contact_person: "Babubhai Jain", phone: "8291255388", whatsapp: "8291255388", area: "Sane Guruji Road, Mumbai - 400011", notes: "" },
  { id: "d7", shop_name: "Seagull Electronics", contact_person: "V. Thangamani", phone: "7498127917", whatsapp: "7498127917", area: "Antop Hill, Sion-Koliwada, Mumbai - 400037", address: "Shop NO A/41, Motial Nehru Nagar, Sion Koliwada Antop Hill, Mumbai - 400037", gstin: "27AGTPD8605K1ZX", notes: "" },
  { id: "d8", shop_name: "Samsung Smart Plaza (Samyak Sales)", contact_person: "Sales", phone: "08080032950", whatsapp: "08080032950", area: "Lalbaug, Mumbai - 400012", notes: "" },
  { id: "d9", shop_name: "Sona Electronics", contact_person: "Suresh J. Surana", phone: "7208560043", whatsapp: "7208560043", area: "Lower Parel (E), Mumbai - 400013", notes: "" },
  { id: "d10", shop_name: "Rishabh Appliances", contact_person: "Hardik Jain", phone: "8879252866", whatsapp: "8879252866", area: "Antop Hill, Mumbai - 400037", notes: "" },
  { id: "d11", shop_name: "Relation Electronics", contact_person: "Boss", phone: "9821357913", whatsapp: "9821357913", area: "M. G. Road, Ghatkopar (W), Mumbai - 86", notes: "" },
  { id: "d12", shop_name: "Jai Bhavani Mobile NX", contact_person: "Owner", phone: "9152568204", whatsapp: "9152568204", area: "Mulund Check Naka, Thane (W) - 400604", notes: "" },
  { id: "d13", shop_name: "Maharashtra Radio Electronics", contact_person: "Ramakant Sharma", phone: "9892144704", whatsapp: "9892144704", area: "L. J. Road, Mahim (W), Mumbai - 400016", notes: "" },
  { id: "d14", shop_name: "Torero Electroshoppee", contact_person: "Naresh Jain", phone: "9323004243", whatsapp: "9323004243", area: "Mumbai", notes: "" },
  { id: "d15", shop_name: "Veer LED TV Screen Guard", contact_person: "Subhash Sonawane", phone: "9224686091", whatsapp: "9224686091", area: "LBS Marg, Kurla (W), Mumbai - 400070", notes: "" },
  { id: "d16", shop_name: "Millennium Collection", contact_person: "Owner", phone: "9158021000", whatsapp: "9158021000", area: "Sewri Naka, Sewri, Mumbai - 15", notes: "" },
];

export const SEED_EXPENSES = [
  { id: "e1", category: "Transport", amount: 4500, note: "Tempo delivery to Vikhroli & Chembur", date: new Date().toISOString() },
  { id: "e2", category: "Salary", amount: 18000, note: "Warehouse assistant advance", date: new Date().toISOString() },
  { id: "e3", category: "Utilities", amount: 3200, note: "Godown electricity bill", date: new Date().toISOString() },
];

export const SEED_ORDERS = [
  {
    id: "po-init",
    kind: "purchase",
    party_id: null,
    party_name: "Worldtech Distributor",
    ref_no: "PO-27.08.26",
    date: "2026-08-27T00:00:00+00:00",
    notes: "Opening stock purchase order",
    items: SEED_PRODUCTS.map((p) => ({
      product_id: p.id,
      model: p.model,
      qty: p.qty_on_hand,
      rate: p.cost_price,
      cost: p.cost_price,
      amount: p.qty_on_hand * p.cost_price,
    })),
    total: 1253600,
    payments: [{ amount: 1253600, date: "2026-08-27T00:00:00+00:00", note: "RTGS settlement" }],
  },
  {
    id: "so-1",
    kind: "sale",
    party_id: "d1",
    party_name: "Shree Samartha Electronics",
    ref_no: "INV-2026-001",
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    notes: "Delivery via Chhota Hathi",
    items: [
      { product_id: "p1", model: "32 Worldtech SM", qty: 2, rate: 10100, cost: 9200, amount: 20200 },
      { product_id: "p5", model: "43 Worldtech SM", qty: 1, rate: 16100, cost: 14600, amount: 16100 },
    ],
    total: 36300,
    payments: [{ amount: 20000, date: new Date(Date.now() - 2 * 86400000).toISOString(), note: "Part payment cash" }],
  },
];

const STORAGE_PREFIX = "soneja_demo_";

function getStored<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && ["orders", "products", "dealers", "expenses"].includes(key)) {
      const deletedIds = getLocalDeletedIds(key);
      return parsed.filter((item: any) => item && item.id && !deletedIds.has(item.id) && !item.deleted_at) as T;
    }
    return parsed;
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T) {
  try {
    if (Array.isArray(val) && ["orders", "products", "dealers", "expenses"].includes(key)) {
      const deletedIds = getLocalDeletedIds(key);
      const filtered = val.filter((item: any) => item && item.id && !deletedIds.has(item.id) && !item.deleted_at);
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(filtered));
      return;
    }
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
  } catch {}
}

// Recalculate inventory dynamically based on purchases and sales ledger
export function recalculateAllInventory(products: any[], orders: any[]): any[] {
  const pList = Array.isArray(products) ? products : [];
  const oList = Array.isArray(orders) ? orders : [];

  return pList.map((p) => {
    let purchased = 0;
    let sold = 0;

    oList.forEach((o) => {
      if (o.deleted_at) return;
      const kind = o.kind || (o.party_id ? "sale" : "purchase");
      (o.items || []).forEach((it: any) => {
        const matchesId = it.product_id && String(it.product_id) === String(p.id);
        const matchesModel = it.model && p.model && it.model.toLowerCase().trim() === p.model.toLowerCase().trim();
        if (matchesId || matchesModel) {
          const qty = Number(it.qty) || 0;
          if (kind === "purchase") purchased += qty;
          else if (kind === "sale") sold += qty;
        }
      });
    });

    const opening = Math.max(0, Number(p.opening_stock) || 0);
    const inStock = opening + purchased - sold;

    return {
      ...p,
      opening_stock: opening,
      purchased_qty: purchased,
      sold_qty: sold,
      qty_on_hand: inStock,
    };
  });
}

export function handleMockApi(path: string, method = "GET", body?: any): any {
  // Normalize path
  const p = path.replace(/^\/api/, "");

  if (p === "/auth/login") {
    const { email, password } = body || {};
    if (email === "owner@soneja.com" && password === "Soneja@123") {
      return {
        access_token: "demo-jwt-token-owner",
        user: { id: "u_owner", email: "owner@soneja.com", name: "Soneja Owner", role: "owner", active: true },
      };
    }
    // Allow any staff login for testing
    return {
      access_token: "demo-jwt-token-staff",
      user: { id: "u_staff", email: email || "staff@soneja.com", name: "Staff Member", role: "staff", active: true },
    };
  }

  if (p === "/auth/me") {
    return { id: "u_owner", email: "owner@soneja.com", name: "Soneja Owner", role: "owner", active: true };
  }

  // Helper: serialize order with financial status
  function serializeOrder(o: any) {
    const payments = o.payments || [];
    const paid = Math.round(payments.reduce((s: number, pm: any) => s + (Number(pm.amount) || 0), 0) * 100) / 100;
    const total = Math.round((Number(o.total) || 0) * 100) / 100;
    const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
    const pay_status = balance <= 0.5 ? "cleared" : paid > 0 ? "partial" : "unpaid";
    const dateStr = o.date || new Date().toISOString();
    let age_days = 0;
    try {
      const dt = new Date(dateStr);
      age_days = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 86400000));
    } catch {}
    return {
      ...o,
      total,
      paid,
      amount_paid: paid,
      balance,
      pay_status,
      age_days: balance > 0.5 ? age_days : 0,
    };
  }

  // Helper: create order in store
  function createOrderInStore(kind: "sale" | "purchase", ordBody: any) {
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    const products = getStored<any[]>("products", SEED_PRODUCTS);

    const items = (ordBody.items || []).map((it: any) => {
      const prod = products.find((pr) => pr.id === it.product_id || pr.model === it.model);
      const cost = prod ? Number(prod.cost_price) || 0 : Number(it.cost) || 0;
      const qty = Number(it.qty) || 0;
      const rate = Number(it.rate) || 0;
      return {
        product_id: it.product_id || (prod ? prod.id : "p_" + Date.now()),
        model: it.model || (prod ? prod.model : "Item"),
        qty,
        rate,
        cost,
        amount: Math.round(qty * rate * 100) / 100,
      };
    });

    const total = Math.round(items.reduce((s: number, it: any) => s + it.amount, 0) * 100) / 100;
    const payments: any[] = [];
    const initPay = Number(ordBody.initial_payment);
    if (initPay > 0) {
      payments.push({
        id: "pm_" + Date.now(),
        amount: initPay,
        date: ordBody.date || new Date().toISOString(),
        note: "Initial payment",
      });
    }

    const refPrefix = kind === "sale" ? "INV-" : "PO-";
    const newOrder = {
      ...ordBody,
      id: (kind === "sale" ? "so_" : "po_") + Date.now(),
      kind,
      party_id: kind === "sale" ? (ordBody.party_id || null) : null,
      party_name: ordBody.party_name || (kind === "sale" ? "Dealer" : "Supplier"),
      ref_no: ordBody.ref_no || `${refPrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      date: ordBody.date || new Date().toISOString(),
      notes: ordBody.notes || "",
      items,
      total,
      payments,
      created_at: new Date().toISOString(),
    };

    orders.unshift(newOrder);
    setStored("orders", orders);

    // Ledger-based inventory recomputation: Inventory = Purchases - Sales
    const updatedProducts = recalculateAllInventory(products, orders);
    setStored("products", updatedProducts);
    syncOrderToFirestore(newOrder);
    syncProductsBatchToFirestore(updatedProducts);

    return serializeOrder(newOrder);
  }

  // Helper: update existing order in store
  function updateOrderInStore(oid: string, ordBody: any) {
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    const idx = orders.findIndex((item) => item.id === oid);
    if (idx === -1) throw new Error("Order not found: " + oid);

    const existing = orders[idx];
    const products = getStored<any[]>("products", SEED_PRODUCTS);

    // Parse new line items
    const newItems = (ordBody.items || []).map((it: any) => {
      const prod = products.find((pr) => pr.id === it.product_id || pr.model === it.model);
      const cost = prod ? Number(prod.cost_price) || 0 : Number(it.cost) || 0;
      const qty = Number(it.qty) || 0;
      const rate = Number(it.rate) || 0;
      return {
        product_id: it.product_id || (prod ? prod.id : "p_" + Date.now()),
        model: it.model || (prod ? prod.model : "Item"),
        qty,
        rate,
        cost,
        amount: Math.round(qty * rate * 100) / 100,
      };
    });

    const total = Math.round(newItems.reduce((s: number, it: any) => s + it.amount, 0) * 100) / 100;

    // Update order, updating/preserving payments and id
    let payments = existing.payments || [];
    if (ordBody.payment_status !== undefined || ordBody.amount_paid !== undefined) {
      const pStatus = (ordBody.payment_status || "").toLowerCase().trim();
      if (pStatus === "cleared") {
        payments = [{ id: "pm_" + Date.now(), amount: total, date: ordBody.date || new Date().toISOString(), note: "Full payment" }];
      } else if (pStatus === "unpaid") {
        payments = [];
      } else if (pStatus === "partial" || ordBody.amount_paid !== undefined) {
        const amt = Number(ordBody.amount_paid) || 0;
        payments = amt > 0 ? [{ id: "pm_" + Date.now(), amount: amt, date: ordBody.date || new Date().toISOString(), note: "Updated payment" }] : [];
      }
    }

    const updated = {
      ...existing,
      party_id: ordBody.party_id !== undefined ? ordBody.party_id : existing.party_id,
      party_name: ordBody.party_name !== undefined ? ordBody.party_name : existing.party_name,
      ref_no: ordBody.ref_no !== undefined ? ordBody.ref_no : existing.ref_no,
      date: ordBody.date || existing.date,
      notes: ordBody.notes !== undefined ? ordBody.notes : existing.notes,
      items: newItems,
      total,
      payments,
      updated_at: new Date().toISOString(),
    };

    orders[idx] = updated;
    setStored("orders", orders);

    // Ledger-based inventory recomputation: Inventory = Purchases - Sales
    const updatedProducts = recalculateAllInventory(products, orders);
    setStored("products", updatedProducts);
    syncOrderToFirestore(updated);
    syncProductsBatchToFirestore(updatedProducts);

    return serializeOrder(updated);
  }

  // Products
  if (p === "/products") {
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    let products = getStored<any[]>("products", SEED_PRODUCTS);
    products = recalculateAllInventory(products, orders);
    setStored("products", products);

    if (method === "GET") return products;
    if (method === "POST") {
      const np = {
        ...body,
        id: "p_" + Date.now(),
        sku: body.sku || (body.model ? body.model.toUpperCase().replace(/\s+/g, "-").slice(0, 24) : `SKU-${Date.now()}`),
        category: body.category || "Television",
        cost_price: Number(body.cost_price) || 0,
        sell_price: Number(body.sell_price) || 0,
        opening_stock: Math.max(0, Number(body.opening_stock ?? body.qty_on_hand) || 0),
        qty_on_hand: Math.max(0, Number(body.opening_stock ?? body.qty_on_hand) || 0),
        purchased_qty: 0,
        sold_qty: 0,
      };
      products.unshift(np);
      products = recalculateAllInventory(products, orders);
      setStored("products", products);
      syncProductToFirestore(np);
      return np;
    }
  }

  // Adjust stock endpoint: /products/:pid/adjust-stock
  const adjustStockMatch = p.match(/^\/products\/([^/]+)\/adjust-stock$/);
  if (adjustStockMatch && method === "POST") {
    const pid = adjustStockMatch[1];
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    let products = getStored<any[]>("products", SEED_PRODUCTS);
    products = recalculateAllInventory(products, orders);
    const prod = products.find((pr) => pr.id === pid);
    if (!prod) throw new Error("Product not found: " + pid);

    const targetQty = Math.max(0, body.new_qty !== undefined && body.new_qty !== null && body.new_qty !== ""
      ? (Number(body.new_qty) || 0)
      : ((Number(prod.qty_on_hand) || 0) + (Number(body.qty_delta) || 0)));

    // Adjust opening stock so that opening + purchased - sold = targetQty
    const netPurchasedMinusSold = (Number(prod.purchased_qty) || 0) - (Number(prod.sold_qty) || 0);
    prod.opening_stock = Math.max(0, targetQty - netPurchasedMinusSold);
    prod.qty_on_hand = targetQty;

    setStored("products", products);
    syncProductToFirestore(prod);
    return prod;
  }

  const pMatch = p.match(/^\/products\/([^/]+)$/);
  if (pMatch) {
    const pid = pMatch[1];
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    let products = getStored<any[]>("products", SEED_PRODUCTS);
    if (method === "PUT") {
      let updatedProd = null;
      products = products.map((item) => {
        if (item.id === pid) {
          const opening = body.opening_stock !== undefined
            ? Math.max(0, Number(body.opening_stock) || 0)
            : (item.opening_stock || 0);
          updatedProd = {
            ...item,
            ...body,
            id: pid,
            cost_price: body.cost_price !== undefined ? Number(body.cost_price) : item.cost_price,
            sell_price: body.sell_price !== undefined ? Number(body.sell_price) : item.sell_price,
            opening_stock: opening,
          };
          return updatedProd;
        }
        return item;
      });
      products = recalculateAllInventory(products, orders);
      setStored("products", products);
      const saved = products.find((item) => item.id === pid) || updatedProd;
      if (saved) syncProductToFirestore(saved);
      return saved;
    }
    if (method === "DELETE") {
      recordLocalDeletedId("products", pid);
      products = products.filter((item) => item.id !== pid);
      setStored("products", products);
      deleteProductFromFirestore(pid);
      return { ok: true };
    }
  }

  // Dealers
  if (p === "/dealers") {
    const dealers = getStored("dealers", SEED_DEALERS);
    if (method === "GET") return dealers;
    if (method === "POST") {
      const nd = { ...body, id: "d_" + Date.now() };
      dealers.unshift(nd);
      setStored("dealers", dealers);
      syncDealerToFirestore(nd);
      return nd;
    }
  }

  const dMatch = p.match(/^\/dealers\/([^/]+)$/);
  if (dMatch) {
    const did = dMatch[1];
    let dealers = getStored("dealers", SEED_DEALERS);
    if (method === "PUT") {
      dealers = dealers.map((item) => (item.id === did ? { ...item, ...body, id: did } : item));
      setStored("dealers", dealers);
      const updatedD = dealers.find((item) => item.id === did);
      if (updatedD) syncDealerToFirestore(updatedD);
      return body;
    }
    if (method === "DELETE") {
      recordLocalDeletedId("dealers", did);
      dealers = dealers.filter((item) => item.id !== did);
      setStored("dealers", dealers);
      deleteDealerFromFirestore(did);
      return { ok: true };
    }
  }

  // Expenses
  if (p === "/expenses") {
    const expenses = getStored("expenses", SEED_EXPENSES);
    if (method === "GET") return expenses;
    if (method === "POST") {
      const ne = { ...body, id: "e_" + Date.now(), date: body.date || new Date().toISOString() };
      expenses.unshift(ne);
      setStored("expenses", expenses);
      syncExpenseToFirestore(ne);
      return ne;
    }
  }

  const eMatch = p.match(/^\/expenses\/([^/]+)$/);
  if (eMatch) {
    const eid = eMatch[1];
    let expenses = getStored("expenses", SEED_EXPENSES);
    if (method === "PUT") {
      expenses = expenses.map((item) => (item.id === eid ? { ...item, ...body, id: eid } : item));
      setStored("expenses", expenses);
      const updatedE = expenses.find((item) => item.id === eid);
      if (updatedE) syncExpenseToFirestore(updatedE);
      return body;
    }
    if (method === "DELETE") {
      recordLocalDeletedId("expenses", eid);
      expenses = expenses.filter((item) => item.id !== eid);
      setStored("expenses", expenses);
      deleteExpenseFromFirestore(eid);
      return { ok: true };
    }
  }

  // Orders: List or Create (/sales, /purchases, /orders)
  if (p === "/sales" || p === "/purchases") {
    const kind = p.includes("sale") ? "sale" : "purchase";
    if (method === "POST") {
      return createOrderInStore(kind, body);
    }
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    return orders.filter((o) => o.kind === kind).map(serializeOrder);
  }

  if (p === "/orders") {
    if (method === "POST") {
      return createOrderInStore(body?.kind || "sale", body);
    }
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    return orders.map(serializeOrder);
  }

  // Order Details / Edit / Delete (/sales/:id, /purchases/:id, /orders/:id)
  const orderMatch = p.match(/^\/(sales|purchases|orders)\/([^/]+)$/);
  if (orderMatch) {
    const oid = orderMatch[2];
    if (method === "PUT") {
      return updateOrderInStore(oid, body);
    }
    if (method === "DELETE") {
      recordLocalDeletedId("orders", oid);
      let orders = getStored<any[]>("orders", SEED_ORDERS);
      orders = orders.filter((item) => item.id !== oid);
      setStored("orders", orders);
      deleteOrderFromFirestore(oid);

      // Ledger-based inventory recomputation: Inventory = Purchases - Sales
      const products = getStored<any[]>("products", SEED_PRODUCTS);
      const updatedProducts = recalculateAllInventory(products, orders);
      setStored("products", updatedProducts);
      syncProductsBatchToFirestore(updatedProducts);

      return { ok: true };
    }
    // GET single order
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    const o = orders.find((item) => item.id === oid);
    if (!o) throw new Error("Order not found: " + oid);
    return serializeOrder(o);
  }

  // Add Payment: /orders/:id/payments
  const payMatch = p.match(/^\/orders\/([^/]+)\/payments$/);
  if (payMatch) {
    const oid = payMatch[1];
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    const o = orders.find((item) => item.id === oid);
    if (o) {
      o.payments = o.payments || [];
      o.payments.push({
        id: "pm_" + Date.now(),
        amount: Number(body.amount) || 0,
        note: body.note || "",
        date: body.date || new Date().toISOString(),
      });
      setStored("orders", orders);
      syncOrderToFirestore(o);
      return serializeOrder(o);
    }
    throw new Error("Order not found for payment: " + oid);
  }

  // Update Payment Status: /(orders|purchases|sales)/:id/payment-status
  const statusMatch = p.match(/^\/(orders|purchases|sales)\/([^/]+)\/payment-status$/);
  if (statusMatch && (method === "PATCH" || method === "POST")) {
    const oid = statusMatch[2];
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    const o = orders.find((item) => item.id === oid);
    if (!o) throw new Error("Order not found: " + oid);

    const status = (body?.status || "").toLowerCase().trim();
    const total = Number(o.total) || 0;
    o.payments = o.payments || [];
    const currentPaid = o.payments.reduce((s: number, pm: any) => s + (Number(pm.amount) || 0), 0);

    if (status === "cleared") {
      const remaining = Math.round((total - currentPaid) * 100) / 100;
      if (remaining > 0) {
        o.payments.push({ id: "pm_" + Date.now(), amount: remaining, note: body?.note || "Payment cleared", date: new Date().toISOString() });
      } else if (remaining < 0 || o.payments.length === 0) {
        o.payments = [{ id: "pm_" + Date.now(), amount: total, note: body?.note || "Payment cleared", date: new Date().toISOString() }];
      }
    } else if (status === "unpaid") {
      o.payments = [];
    } else if (status === "partial") {
      const amt = Number(body?.amount_paid !== undefined ? body.amount_paid : currentPaid) || 0;
      o.payments = amt > 0 ? [{ id: "pm_" + Date.now(), amount: amt, note: body?.note || "Partial payment", date: new Date().toISOString() }] : [];
    }
    setStored("orders", orders);
    syncOrderToFirestore(o);
    return serializeOrder(o);
  }

  // Edit or Delete Payment: /orders/:id/payments/:pid
  const payItemMatch = p.match(/^\/orders\/([^/]+)\/payments\/([^/]+)$/);
  if (payItemMatch) {
    const oid = payItemMatch[1];
    const pid = payItemMatch[2];
    const orders = getStored<any[]>("orders", SEED_ORDERS);
    const o = orders.find((item) => item.id === oid);
    if (!o) throw new Error("Order not found: " + oid);
    o.payments = o.payments || [];

    if (method === "PUT") {
      const pIndex = o.payments.findIndex((item: any) => item.id === pid);
      if (pIndex === -1) throw new Error("Payment not found: " + pid);
      o.payments[pIndex].amount = Number(body?.amount) || 0;
      if (body?.note !== undefined) o.payments[pIndex].note = body.note;
      if (body?.date) o.payments[pIndex].date = body.date;
      setStored("orders", orders);
      syncOrderToFirestore(o);
      return serializeOrder(o);
    }
    if (method === "DELETE") {
      o.payments = o.payments.filter((item: any) => item.id !== pid);
      setStored("orders", orders);
      syncOrderToFirestore(o);
      return serializeOrder(o);
    }
  }

  // Dashboard & Reports
  if (p === "/dashboard" || p === "/reports") {
    const orders = getStored("orders", SEED_ORDERS);
    let products = getStored<any[]>("products", SEED_PRODUCTS);
    products = recalculateAllInventory(products, orders);
    setStored("products", products);
    const expenses = getStored("expenses", SEED_EXPENSES);

    const sales = orders.filter((o) => o.kind === "sale");
    const purchases = orders.filter((o) => o.kind === "purchase");

    const total_sales = sales.reduce((s, o) => s + (o.total || 0), 0);
    const total_purchases = purchases.reduce((s, o) => s + (o.total || 0), 0);
    const total_expenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    const cogs = sales.reduce(
      (s, o) => s + (o.items || []).reduce((liS: number, it: any) => liS + (it.cost || it.rate * 0.9) * it.qty, 0),
      0
    );

    const receivable = sales.reduce((s, o) => {
      const paid = (o.payments || []).reduce((pmS: number, pm: any) => pmS + pm.amount, 0);
      return s + Math.max(0, o.total - paid);
    }, 0);

    const payable = purchases.reduce((s, o) => {
      const paid = (o.payments || []).reduce((pmS: number, pm: any) => pmS + pm.amount, 0);
      return s + Math.max(0, o.total - paid);
    }, 0);

    const inventory_value = products.reduce((s, p) => s + Math.max(0, p.qty_on_hand || 0) * (p.cost_price || 0), 0);
    const units_in_stock = products.reduce((s, p) => s + Math.max(0, p.qty_on_hand || 0), 0);
    const net_profit = total_sales - cogs - total_expenses;

    const low_stock = products.filter((p) => (Number(p.qty_on_hand) || 0) > 0 && (Number(p.qty_on_hand) || 0) <= 2);
    const out_of_stock = products.filter((p) => (Number(p.qty_on_hand) || 0) === 0);
    const negative_stock = products.filter((p) => (Number(p.qty_on_hand) || 0) < 0);

    const recent_sales = sales.slice(0, 5).map((o) => {
      const paid = (o.payments || []).reduce((s: number, pm: any) => s + pm.amount, 0);
      const balance = Math.max(0, o.total - paid);
      const pay_status = balance <= 0.5 ? "cleared" : paid > 0 ? "partial" : "unpaid";
      return { ...o, paid, balance, pay_status };
    });

    // Available stock details for the dashboard
    const available_stock = products.map((p) => {
      const q = Number(p.qty_on_hand) || 0;
      return {
        id: p.id,
        model: p.model,
        sku: p.sku || "",
        category: p.category || "Television",
        purchased_qty: Number((p as any).purchased_qty) || 0,
        sold_qty: Number((p as any).sold_qty) || 0,
        qty_on_hand: q,
        cost_price: Number(p.cost_price) || 0,
        sell_price: Number(p.sell_price) || 0,
        status: q < 0 ? "negative" : q === 0 ? "out" : q <= 2 ? "low" : "available",
      };
    });

    const summary = {
      total_sales,
      total_purchases,
      total_expenses,
      cogs,
      gross_profit: total_sales - cogs,
      net_profit,
      receivable,
      payable,
      inventory_value,
      units_in_stock,
      sales_count: sales.length,
      purchases_count: purchases.length,
      low_stock,
      negative_stock,
      available_stock,
      recent_sales,
    };

    if (p === "/dashboard") return summary;

    // Reports additions: Dynamic Month Aggregation
    const getMonthKey = (dateStr?: string) => {
      try {
        if (!dateStr) return new Date().toISOString().slice(0, 7);
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 7);
      } catch {}
      return new Date().toISOString().slice(0, 7);
    };

    const sales_by_month: Record<string, number> = {};
    const purchases_by_month: Record<string, number> = {};
    const sales_units_by_month: Record<string, number> = {};
    const model_monthly_map: Record<string, Record<string, { qty: number; amount: number }>> = {};
    const monthly_metrics: Record<string, { month: string; sales: number; purchases: number; cogs: number; gross_profit: number; units: number; top_model?: string }> = {};

    sales.forEach((o) => {
      const m = getMonthKey(o.date);
      sales_by_month[m] = Math.round(((sales_by_month[m] || 0) + (Number(o.total) || 0)) * 100) / 100;

      if (!monthly_metrics[m]) {
        monthly_metrics[m] = { month: m, sales: 0, purchases: 0, cogs: 0, gross_profit: 0, units: 0 };
      }
      monthly_metrics[m].sales = Math.round((monthly_metrics[m].sales + (Number(o.total) || 0)) * 100) / 100;

      (o.items || []).forEach((it: any) => {
        const itQty = Number(it.qty) || 0;
        const itRate = Number(it.rate) || 0;
        const itAmt = Number(it.amount) || (itQty * itRate);
        const itCost = (Number(it.cost) || itRate * 0.9) * itQty;

        sales_units_by_month[m] = (sales_units_by_month[m] || 0) + itQty;
        monthly_metrics[m].units += itQty;
        monthly_metrics[m].cogs = Math.round((monthly_metrics[m].cogs + itCost) * 100) / 100;

        const modelName = it.model || "Unknown";
        if (!model_monthly_map[modelName]) {
          model_monthly_map[modelName] = {};
        }
        if (!model_monthly_map[modelName][m]) {
          model_monthly_map[modelName][m] = { qty: 0, amount: 0 };
        }
        model_monthly_map[modelName][m].qty += itQty;
        model_monthly_map[modelName][m].amount = Math.round((model_monthly_map[modelName][m].amount + itAmt) * 100) / 100;
      });
    });

    purchases.forEach((o) => {
      const m = getMonthKey(o.date);
      purchases_by_month[m] = Math.round(((purchases_by_month[m] || 0) + (Number(o.total) || 0)) * 100) / 100;

      if (!monthly_metrics[m]) {
        monthly_metrics[m] = { month: m, sales: 0, purchases: 0, cogs: 0, gross_profit: 0, units: 0 };
      }
      monthly_metrics[m].purchases = Math.round((monthly_metrics[m].purchases + (Number(o.total) || 0)) * 100) / 100;
    });

    // Compute gross profit and find top model per month
    Object.keys(monthly_metrics).forEach((m) => {
      monthly_metrics[m].gross_profit = Math.round((monthly_metrics[m].sales - monthly_metrics[m].cogs) * 100) / 100;

      let topM = "";
      let topQty = 0;
      Object.entries(model_monthly_map).forEach(([model, mData]) => {
        if (mData[m] && mData[m].qty > topQty) {
          topQty = mData[m].qty;
          topM = model;
        }
      });
      monthly_metrics[m].top_model = topM || "None";
    });

    // Sorted months list
    const monthKeys = Array.from(
      new Set([...Object.keys(sales_by_month), ...Object.keys(purchases_by_month)])
    ).filter(Boolean).sort();

    // Model monthly series for line graphs
    const model_series = Object.entries(model_monthly_map).map(([model, mData]) => {
      const totalUnits = Object.values(mData).reduce((sum, v) => sum + v.qty, 0);
      const totalRevenue = Object.values(mData).reduce((sum, v) => sum + v.amount, 0);
      return {
        model,
        monthly_data: mData,
        total_units: totalUnits,
        total_revenue: totalRevenue,
      };
    }).sort((a, b) => b.total_units - a.total_units);

    // Month-over-Month Comparison
    const monthly_breakdown = monthKeys.map((m) => monthly_metrics[m] || {
      month: m,
      sales: sales_by_month[m] || 0,
      purchases: purchases_by_month[m] || 0,
      cogs: 0,
      gross_profit: 0,
      units: sales_units_by_month[m] || 0,
      top_model: "None",
    });

    let mom_comparison: any = null;
    if (monthly_breakdown.length >= 2) {
      const current = monthly_breakdown[monthly_breakdown.length - 1];
      const previous = monthly_breakdown[monthly_breakdown.length - 2];
      const salesGrowth = previous.sales > 0 ? ((current.sales - previous.sales) / previous.sales) * 100 : current.sales > 0 ? 100 : 0;
      const unitsGrowth = previous.units > 0 ? ((current.units - previous.units) / previous.units) * 100 : current.units > 0 ? 100 : 0;
      mom_comparison = {
        current_month: current.month,
        previous_month: previous.month,
        current_sales: current.sales,
        previous_sales: previous.sales,
        sales_growth_pct: Math.round(salesGrowth * 10) / 10,
        current_units: current.units,
        previous_units: previous.units,
        units_growth_pct: Math.round(unitsGrowth * 10) / 10,
        current_profit: current.gross_profit,
        previous_profit: previous.gross_profit,
      };
    }

    const exp_cat: Record<string, number> = {};
    expenses.forEach((e) => {
      exp_cat[e.category] = (exp_cat[e.category] || 0) + e.amount;
    });

    const prod_qty: Record<string, number> = {};
    sales.forEach((o) => {
      (o.items || []).forEach((it: any) => {
        prod_qty[it.model] = (prod_qty[it.model] || 0) + it.qty;
      });
    });
    const top_products = Object.entries(prod_qty).map(([model, qty]) => ({ model, qty }));

    // Top Wholesale Dealers Performance Leaderboard
    const dealer_map: Record<string, { party_name: string; party_id: string | null; orders_count: number; total_revenue: number; total_units: number; amount_paid: number; balance: number }> = {};
    sales.forEach((o) => {
      const pName = o.party_name || "Unknown Dealer";
      const pId = o.party_id || pName;
      if (!dealer_map[pId]) {
        dealer_map[pId] = {
          party_name: pName,
          party_id: o.party_id || null,
          orders_count: 0,
          total_revenue: 0,
          total_units: 0,
          amount_paid: 0,
          balance: 0,
        };
      }
      dealer_map[pId].orders_count += 1;
      dealer_map[pId].total_revenue = Math.round((dealer_map[pId].total_revenue + (Number(o.total) || 0)) * 100) / 100;
      const paid = (o.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0);
      dealer_map[pId].amount_paid = Math.round((dealer_map[pId].amount_paid + paid) * 100) / 100;
      const bal = Math.max(0, (Number(o.total) || 0) - paid);
      dealer_map[pId].balance = Math.round((dealer_map[pId].balance + bal) * 100) / 100;
      (o.items || []).forEach((it: any) => {
        dealer_map[pId].total_units += (Number(it.qty) || 0);
      });
    });
    const top_dealers = Object.values(dealer_map).sort((a, b) => b.total_revenue - a.total_revenue);

    // Screen Size & Category Market Share Breakdown
    const cat_map: Record<string, { category: string; units: number; revenue: number; share_pct: number }> = {};
    let totalSalesUnits = 0;
    let totalSalesRevenue = 0;
    sales.forEach((o) => {
      (o.items || []).forEach((it: any) => {
        const model = it.model || "";
        let cat = "Other TV";
        if (/32\b/i.test(model)) cat = '32" HD/Smart';
        else if (/43\b/i.test(model)) cat = '43" FHD/4K Smart';
        else if (/50\b/i.test(model)) cat = '50" 4K Smart';
        else if (/55\b/i.test(model)) cat = '55" 4K UHD';
        else if (/58\b/i.test(model)) cat = '58" 4K QLED';
        else if (/65\b/i.test(model)) cat = '65" 4K QLED/WebOS';
        else if (/75\b/i.test(model)) cat = '75" Ultra Premium';

        const qty = Number(it.qty) || 0;
        const amt = Number(it.amount) || (qty * (Number(it.rate) || 0));
        totalSalesUnits += qty;
        totalSalesRevenue += amt;

        if (!cat_map[cat]) {
          cat_map[cat] = { category: cat, units: 0, revenue: 0, share_pct: 0 };
        }
        cat_map[cat].units += qty;
        cat_map[cat].revenue = Math.round((cat_map[cat].revenue + amt) * 100) / 100;
      });
    });
    const category_breakdown = Object.values(cat_map).map((c) => ({
      ...c,
      share_pct: totalSalesRevenue > 0 ? Math.round((c.revenue / totalSalesRevenue) * 1000) / 10 : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // Executive Distribution KPIs
    const totalPaid = sales.reduce((acc, o) => acc + (o.payments || []).reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0), 0);
    const sortedByRevenue = [...model_series].sort((a, b) => b.total_revenue - a.total_revenue);
    const executive_kpis = {
      top_model_by_volume: model_series[0] ? { model: model_series[0].model, units: model_series[0].total_units } : null,
      top_model_by_revenue: sortedByRevenue[0] ? { model: sortedByRevenue[0].model, revenue: sortedByRevenue[0].total_revenue } : null,
      avg_order_value: sales.length > 0 ? Math.round((totalSalesRevenue / sales.length) * 100) / 100 : 0,
      collection_rate: totalSalesRevenue > 0 ? Math.round((totalPaid / totalSalesRevenue) * 1000) / 10 : 0,
      total_sales_units: totalSalesUnits,
      total_collected: Math.round(totalPaid * 100) / 100,
    };

    return {
      summary,
      sales_by_month,
      purchases_by_month,
      sales_units_by_month,
      month_keys: monthKeys,
      model_series,
      monthly_breakdown,
      mom_comparison,
      top_products,
      top_dealers,
      category_breakdown,
      executive_kpis,
      expense_by_category: exp_cat,
      overdue_receivables: sales
        .filter((o) => o.total - (o.payments || []).reduce((s: number, p: any) => s + p.amount, 0) > 0.5)
        .map((o) => ({
          id: o.id,
          party_name: o.party_name,
          ref_no: o.ref_no,
          balance: o.total - (o.payments || []).reduce((s: number, p: any) => s + p.amount, 0),
          age_days: 3,
        })),
      overdue_payables: [],
    };
  }

  // Staff
  if (p === "/staff") {
    const staff = getStored("staff", [
      { id: "s1", name: "Rahul Sharma", email: "rahul@soneja.com", role: "staff", active: true },
      { id: "s2", name: "Amit Verma", email: "amit@soneja.com", role: "staff", active: true },
    ]);
    if (method === "GET") return staff;
    if (method === "POST") {
      const ns = { id: "s_" + Date.now(), ...body, role: "staff", active: true };
      staff.push(ns);
      setStored("staff", staff);
      return ns;
    }
  }

  const staffMatch = p.match(/^\/staff\/([^/]+)$/);
  if (staffMatch) {
    const sid = staffMatch[1];
    let staff = getStored<any[]>("staff", []);
    staff = staff.map((s) => (s.id === sid ? { ...s, ...body } : s));
    setStored("staff", staff);
    return { ok: true };
  }

  return { ok: true };
}
