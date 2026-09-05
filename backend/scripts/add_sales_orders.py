"""One-off: add the user's provided sales orders (grouped one invoice per dealer).
New variant models are created as products (cost 0, editable later in the Cost Sheet).
Run: python /app/backend/scripts/add_sales_orders.py
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")
db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# dealer shop_name -> list of (model, qty, rate)
ORDERS = {
    "Seagull Electronics": [
        ("32 Glass 512", 1, 11400),
        ("32 Glass 1GB", 1, 12000),
        ("32 Glass BT", 1, 12600),
    ],
    "Torero Electroshoppee": [
        ("32 Glass BT", 3, 12350),
    ],
    "Keni Electronics": [
        ("43 Worldtech SM", 2, 16500),  # maps to existing cost-sheet model
    ],
    "Millennium Collection": [
        ("24 Worldtech", 2, 6000),      # maps to existing cost-sheet model
        ("32 BT VR", 1, 11500),
    ],
}


async def get_or_create_product(model, default_sell):
    p = await db.products.find_one({"model": model, "deleted_at": None})
    if p:
        return p
    pid = str(uuid.uuid4())
    doc = {
        "id": pid, "model": model, "sku": model.upper().replace(" ", "-")[:24],
        "category": "Television", "cost_price": 0, "sell_price": default_sell,
        "qty_on_hand": 0, "image": "", "deleted_at": None, "created_at": now_iso(),
    }
    await db.products.insert_one(doc)
    print(f"  + created product: {model}")
    return doc


async def main():
    # guard against duplicate runs
    if await db.orders.count_documents({"kind": "sale", "notes": "Imported sales order"}) > 0:
        print("Sales orders already imported. Skipping.")
        return

    for shop, lines in ORDERS.items():
        dealer = await db.dealers.find_one({"shop_name": shop, "deleted_at": None})
        if not dealer:
            print(f"! dealer not found: {shop} — skipping")
            continue
        items = []
        total = 0.0
        for model, qty, rate in lines:
            prod = await get_or_create_product(model, rate)
            cost = float(prod.get("cost_price", 0))
            amount = qty * rate
            total += amount
            items.append({"product_id": prod["id"], "model": model, "qty": qty,
                          "rate": rate, "cost": cost, "amount": amount})
            await db.products.update_one({"id": prod["id"]}, {"$inc": {"qty_on_hand": -qty}})
        order = {
            "id": str(uuid.uuid4()), "kind": "sale", "party_id": dealer["id"],
            "party_name": shop, "ref_no": None, "date": now_iso(),
            "notes": "Imported sales order", "items": items, "total": round(total, 2),
            "payments": [], "deleted_at": None, "created_at": now_iso(),
        }
        await db.orders.insert_one(order)
        print(f"Created sale order for {shop}: {len(items)} items, total {total}")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
    sys.exit(0)
