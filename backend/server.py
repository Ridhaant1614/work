from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
TOKEN_MINUTES = int(os.environ.get('ACCESS_TOKEN_MINUTES', '43200'))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

app = FastAPI(title="Soneja CRM API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("soneja")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def days_since(iso: str) -> int:
    try:
        dt = datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0, (datetime.now(timezone.utc) - dt).days)
    except Exception:
        return 0


def clean(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class StaffCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=100)


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None


class ProductIn(BaseModel):
    model: str
    sku: Optional[str] = None
    category: str = "Television"
    cost_price: float = 0        # GST-inclusive purchase cost / unit
    sell_price: float = 0        # default selling price / unit (editable per order)
    qty_on_hand: Optional[float] = None
    image: Optional[str] = None


class DealerIn(BaseModel):
    shop_name: str
    contact_person: Optional[str] = ""
    phone: Optional[str] = ""
    whatsapp: Optional[str] = ""
    area: Optional[str] = ""
    notes: Optional[str] = ""


class LineItem(BaseModel):
    product_id: str
    model: str
    qty: float
    rate: float                  # per-unit price (GST inclusive)


class OrderIn(BaseModel):
    party_id: Optional[str] = None   # dealer_id for sales, blank for purchases
    party_name: str                  # dealer name / supplier name
    ref_no: Optional[str] = None     # invoice no / PO no
    date: Optional[str] = None
    notes: Optional[str] = ""
    items: List[LineItem]
    initial_payment: Optional[float] = 0


class PaymentIn(BaseModel):
    amount: float = Field(gt=0)
    date: Optional[str] = None
    note: Optional[str] = ""


class OrderEdit(BaseModel):
    ref_no: Optional[str] = None
    date: Optional[str] = None
    party_id: Optional[str] = None
    party_name: Optional[str] = None
    notes: Optional[str] = None


class ExpenseIn(BaseModel):
    category: str
    amount: float = Field(gt=0)
    date: Optional[str] = None
    note: Optional[str] = ""


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
def create_token(user: dict) -> str:
    now = datetime.now(timezone.utc)
    claims = {"sub": user["id"], "role": user["role"], "iat": now,
              "exp": now + timedelta(minutes=TOKEN_MINUTES)}
    return jwt.encode(claims, JWT_SECRET, algorithm=JWT_ALGORITHM)


def public_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "name": u["name"],
            "role": u["role"], "active": u.get("active", True)}


async def current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        uid = payload["sub"]
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    user = await db.users.find_one({"id": uid, "active": True})
    if not user:
        raise HTTPException(401, "User inactive or missing")
    return user


async def owner_only(user=Depends(current_user)):
    if user["role"] != "owner":
        raise HTTPException(403, "Owner role required")
    return user


@api_router.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    valid = pwd_context.verify(body.password, user["password_hash"]) if user else False
    if not user or not user.get("active", True) or not valid:
        raise HTTPException(401, "Incorrect email or password")
    return {"access_token": create_token(user), "user": public_user(user)}


@api_router.get("/auth/me")
async def me(user=Depends(current_user)):
    return public_user(user)


@api_router.get("/staff")
async def list_staff(_=Depends(owner_only)):
    rows = await db.users.find({"role": "staff", "deleted_at": None}).to_list(500)
    return [public_user(r) for r in rows]


@api_router.post("/staff", status_code=201)
async def create_staff(body: StaffCreate, _=Depends(owner_only)):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(409, "Email already exists")
    doc = {"id": new_id(), "email": body.email.lower(), "name": body.name,
           "password_hash": pwd_context.hash(body.password), "role": "staff",
           "active": True, "deleted_at": None, "created_at": now_iso()}
    await db.users.insert_one(doc)
    return public_user(doc)


@api_router.patch("/staff/{staff_id}")
async def update_staff(staff_id: str, body: StaffUpdate, _=Depends(owner_only)):
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if not changes:
        raise HTTPException(400, "No changes")
    r = await db.users.find_one_and_update({"id": staff_id, "role": "staff"},
                                           {"$set": changes}, return_document=True)
    if not r:
        raise HTTPException(404, "Staff not found")
    return public_user(r)


# ---------------------------------------------------------------------------
# Products
# ---------------------------------------------------------------------------
@api_router.get("/products")
async def list_products(user=Depends(current_user)):
    rows = await db.products.find({"deleted_at": None}).sort("model", 1).to_list(1000)
    return [clean(r) for r in rows]


@api_router.post("/products", status_code=201)
async def create_product(body: ProductIn, user=Depends(current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["sku"] = doc.get("sku") or doc["model"].upper().replace(" ", "-")[:24]
    doc["qty_on_hand"] = doc.get("qty_on_hand") or 0
    doc["deleted_at"] = None
    doc["created_at"] = now_iso()
    await db.products.insert_one(doc)
    return clean(doc)


@api_router.put("/products/{pid}")
async def update_product(pid: str, body: ProductIn, user=Depends(current_user)):
    changes = body.model_dump(exclude_unset=True)
    changes.pop("qty_on_hand", None) if changes.get("qty_on_hand") is None else None
    r = await db.products.find_one_and_update({"id": pid, "deleted_at": None},
                                              {"$set": changes}, return_document=True)
    if not r:
        raise HTTPException(404, "Product not found")
    return clean(r)


@api_router.delete("/products/{pid}")
async def delete_product(pid: str, user=Depends(current_user)):
    await db.products.update_one({"id": pid}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dealers
# ---------------------------------------------------------------------------
@api_router.get("/dealers")
async def list_dealers(user=Depends(current_user)):
    rows = await db.dealers.find({"deleted_at": None}).sort("shop_name", 1).to_list(1000)
    return [clean(r) for r in rows]


@api_router.post("/dealers", status_code=201)
async def create_dealer(body: DealerIn, user=Depends(current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["deleted_at"] = None
    doc["created_at"] = now_iso()
    await db.dealers.insert_one(doc)
    return clean(doc)


@api_router.put("/dealers/{did}")
async def update_dealer(did: str, body: DealerIn, user=Depends(current_user)):
    r = await db.dealers.find_one_and_update({"id": did, "deleted_at": None},
                                             {"$set": body.model_dump()}, return_document=True)
    if not r:
        raise HTTPException(404, "Dealer not found")
    return clean(r)


@api_router.delete("/dealers/{did}")
async def delete_dealer(did: str, user=Depends(current_user)):
    await db.dealers.update_one({"id": did}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Orders (sales + purchases share logic; kind = "sale" | "purchase")
# ---------------------------------------------------------------------------
def serialize_order(o: dict) -> dict:
    o = clean(o)
    payments = o.get("payments", [])
    paid = round(sum(p["amount"] for p in payments), 2)
    total = round(o.get("total", 0), 2)
    balance = round(total - paid, 2)
    if paid <= 0:
        pay_status = "unpaid"
    elif balance > 0.5:
        pay_status = "partial"
    else:
        pay_status = "cleared"
    o["amount_paid"] = paid
    o["balance"] = max(0, balance)
    o["pay_status"] = pay_status
    o["age_days"] = days_since(o.get("date", now_iso())) if balance > 0.5 else 0
    return o


async def _adjust_inventory(items: List[dict], sign: int):
    # sign +1 increases stock (purchase), -1 decreases (sale)
    for it in items:
        await db.products.update_one({"id": it["product_id"]},
                                     {"$inc": {"qty_on_hand": sign * it["qty"]}})


async def _create_order(kind: str, body: OrderIn):
    if not body.items:
        raise HTTPException(400, "Order must have at least one item")
    items = []
    total = 0.0
    for li in body.items:
        prod = await db.products.find_one({"id": li.product_id, "deleted_at": None})
        cost = float(prod.get("cost_price", 0)) if prod else 0.0
        amount = round(li.qty * li.rate, 2)
        total += amount
        items.append({"product_id": li.product_id, "model": li.model, "qty": li.qty,
                      "rate": li.rate, "cost": cost, "amount": amount})
    total = round(total, 2)
    payments = []
    if body.initial_payment and body.initial_payment > 0:
        payments.append({"id": new_id(), "amount": round(body.initial_payment, 2),
                         "date": body.date or now_iso(), "note": "Initial payment"})
    doc = {"id": new_id(), "kind": kind, "party_id": body.party_id,
           "party_name": body.party_name, "ref_no": body.ref_no,
           "date": body.date or now_iso(), "notes": body.notes or "",
           "items": items, "total": total, "payments": payments,
           "deleted_at": None, "created_at": now_iso()}
    await db.orders.insert_one(doc)
    await _adjust_inventory(items, +1 if kind == "purchase" else -1)
    return serialize_order(doc)


async def _update_order(oid: str, body: OrderIn):
    if not body.items:
        raise HTTPException(400, "Order must have at least one item")
    existing = await db.orders.find_one({"id": oid, "deleted_at": None})
    if not existing:
        raise HTTPException(404, "Order not found")
    kind = existing["kind"]
    sign = 1 if kind == "purchase" else -1
    # reverse the inventory effect of the old items, then apply the new items
    await _adjust_inventory(existing.get("items", []), -sign)
    items = []
    total = 0.0
    for li in body.items:
        prod = await db.products.find_one({"id": li.product_id, "deleted_at": None})
        cost = float(prod.get("cost_price", 0)) if prod else 0.0
        amount = round(li.qty * li.rate, 2)
        total += amount
        items.append({"product_id": li.product_id, "model": li.model, "qty": li.qty,
                      "rate": li.rate, "cost": cost, "amount": amount})
    await _adjust_inventory(items, sign)
    changes = {"party_id": body.party_id, "party_name": body.party_name,
               "ref_no": body.ref_no, "date": body.date or existing.get("date"),
               "notes": body.notes or "", "items": items, "total": round(total, 2)}
    await db.orders.update_one({"id": oid}, {"$set": changes})
    o = await db.orders.find_one({"id": oid})
    return serialize_order(o)


async def _list_orders(kind: str):
    rows = await db.orders.find({"kind": kind, "deleted_at": None}).sort("date", -1).to_list(2000)
    return [serialize_order(r) for r in rows]


# --- Sales ---
@api_router.get("/sales")
async def list_sales(user=Depends(current_user)):
    return await _list_orders("sale")


@api_router.post("/sales", status_code=201)
async def create_sale(body: OrderIn, user=Depends(current_user)):
    return await _create_order("sale", body)


@api_router.get("/sales/{oid}")
async def get_sale(oid: str, user=Depends(current_user)):
    o = await db.orders.find_one({"id": oid, "kind": "sale", "deleted_at": None})
    if not o:
        raise HTTPException(404, "Sale order not found")
    return serialize_order(o)


# --- Purchases ---
@api_router.get("/purchases")
async def list_purchases(user=Depends(current_user)):
    return await _list_orders("purchase")


@api_router.post("/purchases", status_code=201)
async def create_purchase(body: OrderIn, user=Depends(current_user)):
    return await _create_order("purchase", body)


@api_router.get("/purchases/{oid}")
async def get_purchase(oid: str, user=Depends(current_user)):
    o = await db.orders.find_one({"id": oid, "kind": "purchase", "deleted_at": None})
    if not o:
        raise HTTPException(404, "Purchase order not found")
    return serialize_order(o)


# --- Payments (shared) ---
@api_router.post("/orders/{oid}/payments", status_code=201)
async def add_payment(oid: str, body: PaymentIn, user=Depends(current_user)):
    o = await db.orders.find_one({"id": oid, "deleted_at": None})
    if not o:
        raise HTTPException(404, "Order not found")
    pay = {"id": new_id(), "amount": round(body.amount, 2),
           "date": body.date or now_iso(), "note": body.note or ""}
    await db.orders.update_one({"id": oid}, {"$push": {"payments": pay}})
    o = await db.orders.find_one({"id": oid})
    return serialize_order(o)


@api_router.patch("/orders/{oid}")
async def edit_order(oid: str, body: OrderEdit, user=Depends(current_user)):
    o = await db.orders.find_one({"id": oid, "deleted_at": None})
    if not o:
        raise HTTPException(404, "Order not found")
    changes = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not changes:
        raise HTTPException(400, "No changes")
    await db.orders.update_one({"id": oid}, {"$set": changes})
    o = await db.orders.find_one({"id": oid})
    return serialize_order(o)


@api_router.put("/orders/{oid}")
async def update_order(oid: str, body: OrderIn, user=Depends(current_user)):
    return await _update_order(oid, body)


@api_router.delete("/orders/{oid}")
async def delete_order(oid: str, user=Depends(current_user)):
    o = await db.orders.find_one({"id": oid, "deleted_at": None})
    if not o:
        raise HTTPException(404, "Order not found")
    await _adjust_inventory(o["items"], -1 if o["kind"] == "purchase" else +1)
    await db.orders.update_one({"id": oid}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------
@api_router.get("/expenses")
async def list_expenses(user=Depends(current_user)):
    rows = await db.expenses.find({"deleted_at": None}).sort("date", -1).to_list(2000)
    return [clean(r) for r in rows]


@api_router.post("/expenses", status_code=201)
async def create_expense(body: ExpenseIn, user=Depends(current_user)):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["date"] = doc.get("date") or now_iso()
    doc["deleted_at"] = None
    doc["created_at"] = now_iso()
    await db.expenses.insert_one(doc)
    return clean(doc)


@api_router.put("/expenses/{eid}")
async def update_expense(eid: str, body: ExpenseIn, user=Depends(current_user)):
    changes = body.model_dump()
    changes["date"] = changes.get("date") or now_iso()
    r = await db.expenses.find_one_and_update({"id": eid, "deleted_at": None},
                                              {"$set": changes}, return_document=True)
    if not r:
        raise HTTPException(404, "Expense not found")
    return clean(r)


@api_router.delete("/expenses/{eid}")
async def delete_expense(eid: str, user=Depends(current_user)):
    await db.expenses.update_one({"id": eid}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard + Reports
# ---------------------------------------------------------------------------
async def _compute_summary():
    sales = await db.orders.find({"kind": "sale", "deleted_at": None}).to_list(5000)
    purchases = await db.orders.find({"kind": "purchase", "deleted_at": None}).to_list(5000)
    expenses = await db.expenses.find({"deleted_at": None}).to_list(5000)
    products = await db.products.find({"deleted_at": None}).to_list(2000)

    total_sales = round(sum(o.get("total", 0) for o in sales), 2)
    total_purchases = round(sum(o.get("total", 0) for o in purchases), 2)
    total_expenses = round(sum(e.get("amount", 0) for e in expenses), 2)
    cogs = round(sum(li.get("cost", 0) * li.get("qty", 0) for o in sales for li in o.get("items", [])), 2)

    receivable = round(sum(max(0, o.get("total", 0) - sum(p["amount"] for p in o.get("payments", []))) for o in sales), 2)
    payable = round(sum(max(0, o.get("total", 0) - sum(p["amount"] for p in o.get("payments", []))) for o in purchases), 2)

    inventory_value = round(sum(p.get("qty_on_hand", 0) * p.get("cost_price", 0) for p in products), 2)
    units_in_stock = sum(p.get("qty_on_hand", 0) for p in products)
    net_profit = round(total_sales - cogs - total_expenses, 2)

    low_stock = [clean(p) for p in products if p.get("qty_on_hand", 0) <= 2]
    low_stock.sort(key=lambda p: p.get("qty_on_hand", 0))

    return {
        "total_sales": total_sales,
        "total_purchases": total_purchases,
        "total_expenses": total_expenses,
        "cogs": cogs,
        "gross_profit": round(total_sales - cogs, 2),
        "net_profit": net_profit,
        "receivable": receivable,
        "payable": payable,
        "inventory_value": inventory_value,
        "units_in_stock": units_in_stock,
        "sales_count": len(sales),
        "purchases_count": len(purchases),
        "low_stock": low_stock,
    }


@api_router.get("/dashboard")
async def dashboard(user=Depends(current_user)):
    summary = await _compute_summary()
    recent = await db.orders.find({"kind": "sale", "deleted_at": None}).sort("date", -1).limit(5).to_list(5)
    summary["recent_sales"] = [serialize_order(r) for r in recent]
    return summary


@api_router.get("/reports")
async def reports(user=Depends(current_user)):
    summary = await _compute_summary()
    sales = await db.orders.find({"kind": "sale", "deleted_at": None}).to_list(5000)
    purchases = await db.orders.find({"kind": "purchase", "deleted_at": None}).to_list(5000)
    expenses = await db.expenses.find({"deleted_at": None}).to_list(5000)

    # monthly buckets (last 6 months)
    def bucket(rows, key):
        out = {}
        for r in rows:
            try:
                dt = datetime.fromisoformat(r.get("date", now_iso()))
                mk = dt.strftime("%Y-%m")
            except Exception:
                mk = "unknown"
            out[mk] = round(out.get(mk, 0) + r.get(key, 0), 2)
        return out

    # top selling products by qty
    prod_qty = {}
    for o in sales:
        for li in o.get("items", []):
            prod_qty[li["model"]] = prod_qty.get(li["model"], 0) + li["qty"]
    top_products = sorted([{"model": k, "qty": v} for k, v in prod_qty.items()],
                          key=lambda x: x["qty"], reverse=True)[:8]

    # expense by category
    exp_cat = {}
    for e in expenses:
        exp_cat[e["category"]] = round(exp_cat.get(e["category"], 0) + e["amount"], 2)

    # overdue receivables/payables
    def overdue(rows):
        out = []
        for o in rows:
            bal = o.get("total", 0) - sum(p["amount"] for p in o.get("payments", []))
            if bal > 0.5:
                out.append({"id": o["id"], "party_name": o.get("party_name"),
                            "ref_no": o.get("ref_no"), "balance": round(bal, 2),
                            "age_days": days_since(o.get("date", now_iso()))})
        out.sort(key=lambda x: x["age_days"], reverse=True)
        return out

    return {
        "summary": summary,
        "sales_by_month": bucket(sales, "total"),
        "purchases_by_month": bucket(purchases, "total"),
        "top_products": top_products,
        "expense_by_category": exp_cat,
        "overdue_receivables": overdue(sales),
        "overdue_payables": overdue(purchases),
    }


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------
SEED_PRODUCTS = [
    ("32 Worldtech SM", 9200), ("24 Worldtech", 4800), ("32 Worldtech BT", 10100),
    ("32 Worldtech Glsm BT", 11200), ("43 Worldtech SM", 14600), ("43 Worldtech BT", 15800),
    ("43 Worldtech Glass BT", 16700), ("43 Worldtech Webos 4K", 19000),
    ("50 Worldtech Qled Webos", 25300), ("58 Worldtech 4K QLED Webos", 31500),
    ("65 Worldtech Qled 4K Webos", 42500), ("43 Worldtech 2K Webos", 17000),
]
SEED_PO_QTY = {
    "32 Worldtech SM": 12, "24 Worldtech": 5, "32 Worldtech BT": 12,
    "32 Worldtech Glsm BT": 12, "43 Worldtech SM": 10, "43 Worldtech BT": 10,
    "43 Worldtech Glass BT": 10, "43 Worldtech Webos 4K": 4,
    "50 Worldtech Qled Webos": 4, "58 Worldtech 4K QLED Webos": 2,
    "65 Worldtech Qled 4K Webos": 2, "43 Worldtech 2K Webos": 4,
}
SEED_DEALERS = [
    ("Shree Samartha Electronics", "Nitin Mane", "9653190285", "Tagore Nagar, Vikhroli (E), Mumbai - 400083"),
    ("Hreenkar Electronics", "Sales", "9321934104", "Gokhale Rd (S), Prabhadevi, Mumbai - 25"),
    ("Keni Electronics", "Rohit / Chinmay", "9870456654", "Opp. Sahakar Cinema, Tilak Nagar, Chembur, Mumbai - 89"),
    ("Maruti Electronics", "R.C. Purohit", "9022237138", "Dharavi Main Road, Mumbai - 17"),
    ("Darsh Electronics", "Owner", "9820958939", "Sardar Nagar No. 2, Sion (E), Mumbai - 400022"),
    ("Sagar Electronics", "Babubhai Jain", "8291255388", "Sane Guruji Road, Mumbai - 400011"),
    ("Seagull Electronics", "V. Thangamani", "7498127917", "Antop Hill, Sion-Koliwada, Mumbai - 400037"),
    ("Samsung Smart Plaza (Samyak Sales)", "Sales", "08080032950", "Lalbaug, Mumbai - 400012"),
    ("Sona Electronics", "Suresh J. Surana", "7208560043", "Lower Parel (E), Mumbai - 400013"),
    ("Rishabh Appliances", "Hardik Jain", "8879252866", "Antop Hill, Mumbai - 400037"),
    ("Relation Electronics", "Boss", "9821357913", "M. G. Road, Ghatkopar (W), Mumbai - 86"),
    ("Jai Bhavani Mobile NX", "Owner", "9152568204", "Mulund Check Naka, Thane (W) - 400604"),
    ("Maharashtra Radio Electronics", "Ramakant Sharma", "9892144704", "L. J. Road, Mahim (W), Mumbai - 400016"),
    ("Torero Electroshoppee", "Naresh Jain", "9323004243", "Mumbai"),
    ("Veer LED TV Screen Guard", "Subhash Sonawane", "9224686091", "LBS Marg, Kurla (W), Mumbai - 400070"),
    ("Millennium Collection", "Owner", "9158021000", "Sewri Naka, Sewri, Mumbai - 15"),
]


async def seed():
    # Owner user
    if not await db.users.find_one({"email": "owner@soneja.com"}):
        await db.users.insert_one({
            "id": new_id(), "email": "owner@soneja.com", "name": "Soneja Owner",
            "password_hash": pwd_context.hash("Soneja@123"), "role": "owner",
            "active": True, "deleted_at": None, "created_at": now_iso()})
        logger.info("Seeded owner user")

    # Products
    prod_map = {}
    if await db.products.count_documents({"deleted_at": None}) == 0:
        for model, cost in SEED_PRODUCTS:
            pid = new_id()
            await db.products.insert_one({
                "id": pid, "model": model, "sku": model.upper().replace(" ", "-")[:24],
                "category": "Television", "cost_price": cost,
                "sell_price": round(cost * 1.1 / 100) * 100, "qty_on_hand": 0,
                "image": "", "deleted_at": None, "created_at": now_iso()})
            prod_map[model] = pid
        logger.info("Seeded products")
    else:
        for p in await db.products.find({"deleted_at": None}).to_list(1000):
            prod_map[p["model"]] = p["id"]

    # Dealers
    if await db.dealers.count_documents({"deleted_at": None}) == 0:
        for shop, person, phone, area in SEED_DEALERS:
            await db.dealers.insert_one({
                "id": new_id(), "shop_name": shop, "contact_person": person,
                "phone": phone, "whatsapp": phone, "area": area, "notes": "",
                "deleted_at": None, "created_at": now_iso()})
        logger.info("Seeded dealers")

    # First purchase order (sets inventory)
    if await db.orders.count_documents({"kind": "purchase", "deleted_at": None}) == 0:
        items = []
        total = 0.0
        cost_by_model = dict(SEED_PRODUCTS)
        for model, qty in SEED_PO_QTY.items():
            rate = cost_by_model[model]
            amount = qty * rate
            total += amount
            pid = prod_map.get(model)
            items.append({"product_id": pid, "model": model, "qty": qty,
                          "rate": rate, "cost": rate, "amount": amount})
            if pid:
                await db.products.update_one({"id": pid}, {"$inc": {"qty_on_hand": qty}})
        await db.orders.insert_one({
            "id": new_id(), "kind": "purchase", "party_id": None,
            "party_name": "Worldtech Distributor", "ref_no": "PO-27.08.26",
            "date": "2026-08-27T00:00:00+00:00", "notes": "Opening purchase order",
            "items": items, "total": round(total, 2), "payments": [],
            "deleted_at": None, "created_at": now_iso()})
        logger.info("Seeded opening purchase order")


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await seed()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
