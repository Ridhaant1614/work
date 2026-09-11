"""Full backend API test suite for Soneja CRM"""
import requests
import pytest


# --- Auth ---
class TestAuth:
    def test_login_owner_success(self, api):
        r = requests.post(f"{api}/auth/login", json={"email": "owner@soneja.com", "password": "Soneja@123"})
        assert r.status_code == 200
        j = r.json()
        assert "access_token" in j and j["user"]["role"] == "owner"

    def test_login_invalid_creds(self, api):
        r = requests.post(f"{api}/auth/login", json={"email": "owner@soneja.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me_authenticated(self, api, owner_headers):
        r = requests.get(f"{api}/auth/me", headers=owner_headers)
        assert r.status_code == 200
        assert r.json()["email"] == "owner@soneja.com"

    def test_me_no_token(self, api):
        r = requests.get(f"{api}/auth/me")
        assert r.status_code == 401


# --- Products ---
class TestProducts:
    def test_seeded_products(self, api, owner_headers):
        r = requests.get(f"{api}/products", headers=owner_headers)
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) >= 12
        total_qty = sum(p.get("qty_on_hand", 0) for p in prods)
        assert total_qty >= 87, f"expected seeded 87 units, got {total_qty}"
        # ensure _id not exposed
        assert all("_id" not in p for p in prods)

    def test_product_crud(self, api, owner_headers):
        payload = {"model": "TEST_MODEL_X", "sku": "TEST-X", "category": "Television",
                   "cost_price": 1000, "sell_price": 1200, "qty_on_hand": 5}
        c = requests.post(f"{api}/products", headers=owner_headers, json=payload)
        assert c.status_code == 201
        pid = c.json()["id"]
        # update
        u = requests.put(f"{api}/products/{pid}", headers=owner_headers,
                         json={**payload, "sell_price": 1500})
        assert u.status_code == 200
        assert u.json()["sell_price"] == 1500
        # verify persisted via GET list
        lst = requests.get(f"{api}/products", headers=owner_headers).json()
        found = next((p for p in lst if p["id"] == pid), None)
        assert found and found["sell_price"] == 1500
        # delete
        d = requests.delete(f"{api}/products/{pid}", headers=owner_headers)
        assert d.status_code == 200


# --- Dealers ---
class TestDealers:
    def test_seeded_dealers(self, api, owner_headers):
        r = requests.get(f"{api}/dealers", headers=owner_headers)
        assert r.status_code == 200
        assert len(r.json()) >= 16

    def test_dealer_crud(self, api, owner_headers):
        c = requests.post(f"{api}/dealers", headers=owner_headers,
                          json={"shop_name": "TEST_Dealer", "phone": "9999999999", "area": "TestArea"})
        assert c.status_code == 201
        did = c.json()["id"]
        u = requests.put(f"{api}/dealers/{did}", headers=owner_headers,
                         json={"shop_name": "TEST_Dealer2", "phone": "8888888888"})
        assert u.status_code == 200 and u.json()["shop_name"] == "TEST_Dealer2"
        d = requests.delete(f"{api}/dealers/{did}", headers=owner_headers)
        assert d.status_code == 200


# --- Sales / Purchases / Payments / Inventory adjust ---
class TestOrders:
    def _get_first_product(self, api, headers):
        prods = requests.get(f"{api}/products", headers=headers).json()
        return next(p for p in prods if p.get("qty_on_hand", 0) >= 5 and "TEST_" not in p["model"])

    def test_create_sale_decrements_inventory(self, api, owner_headers):
        prod = self._get_first_product(api, owner_headers)
        before_qty = prod["qty_on_hand"]
        payload = {
            "party_name": "Test Dealer", "ref_no": "TEST-INV-1",
            "items": [{"product_id": prod["id"], "model": prod["model"], "qty": 2, "rate": prod["sell_price"]}],
            "initial_payment": 100,
        }
        r = requests.post(f"{api}/sales", headers=owner_headers, json=payload)
        assert r.status_code == 201, r.text
        order = r.json()
        assert order["pay_status"] == "partial"
        assert order["amount_paid"] == 100
        assert order["balance"] == round(order["total"] - 100, 2)
        oid = order["id"]

        # inventory decremented
        prods = requests.get(f"{api}/products", headers=owner_headers).json()
        updated = next(p for p in prods if p["id"] == prod["id"])
        assert updated["qty_on_hand"] == before_qty - 2

        # get sale by id
        g = requests.get(f"{api}/sales/{oid}", headers=owner_headers)
        assert g.status_code == 200 and g.json()["id"] == oid

        # add payment to fully clear
        remain = order["balance"]
        p = requests.post(f"{api}/orders/{oid}/payments", headers=owner_headers,
                          json={"amount": remain, "note": "TEST_final"})
        assert p.status_code == 201
        assert p.json()["pay_status"] == "cleared"
        assert p.json()["balance"] == 0

        # delete order restores inventory
        d = requests.delete(f"{api}/orders/{oid}", headers=owner_headers)
        assert d.status_code == 200
        prods = requests.get(f"{api}/products", headers=owner_headers).json()
        restored = next(p for p in prods if p["id"] == prod["id"])
        assert restored["qty_on_hand"] == before_qty

    def test_create_purchase_increments_inventory(self, api, owner_headers):
        prod = self._get_first_product(api, owner_headers)
        before = prod["qty_on_hand"]
        payload = {
            "party_name": "TEST Supplier", "ref_no": "TEST-PO-1",
            "items": [{"product_id": prod["id"], "model": prod["model"], "qty": 3, "rate": prod["cost_price"]}],
        }
        r = requests.post(f"{api}/purchases", headers=owner_headers, json=payload)
        assert r.status_code == 201
        oid = r.json()["id"]
        assert r.json()["pay_status"] == "unpaid"
        prods = requests.get(f"{api}/products", headers=owner_headers).json()
        after = next(p for p in prods if p["id"] == prod["id"])["qty_on_hand"]
        assert after == before + 3
        # cleanup
        requests.delete(f"{api}/orders/{oid}", headers=owner_headers)

    def test_purchase_payment_status_edit(self, api, owner_headers):
        prod = self._get_first_product(api, owner_headers)
        payload = {
            "party_name": "TEST Supplier Electronics", "ref_no": "TEST-PO-PAY-1",
            "items": [{"product_id": prod["id"], "model": prod["model"], "qty": 2, "rate": prod["cost_price"]}],
            "initial_payment": 0,
        }
        r = requests.post(f"{api}/purchases", headers=owner_headers, json=payload)
        assert r.status_code == 201
        order = r.json()
        oid = order["id"]
        total = order["total"]
        assert order["pay_status"] == "unpaid"
        assert order["amount_paid"] == 0

        # 1. Update payment status to "cleared"
        patch_cleared = requests.patch(
            f"{api}/purchases/{oid}/payment-status",
            headers=owner_headers,
            json={"payment_status": "cleared", "note": "Marked fully paid by bank transfer"}
        )
        assert patch_cleared.status_code == 200, patch_cleared.text
        cleared_data = patch_cleared.json()
        assert cleared_data["pay_status"] == "cleared"
        assert cleared_data["amount_paid"] == total
        assert cleared_data["balance"] == 0
        assert len(cleared_data["payments"]) >= 1
        pid = cleared_data["payments"][-1]["id"]

        # 2. Edit the payment entry via PUT /orders/{oid}/payments/{pid}
        half_amt = round(total / 2, 2)
        put_pmt = requests.put(
            f"{api}/orders/{oid}/payments/{pid}",
            headers=owner_headers,
            json={"amount": half_amt, "note": "Updated partial payment", "method": "Bank Transfer"}
        )
        assert put_pmt.status_code == 200, put_pmt.text
        put_data = put_pmt.json()
        assert put_data["pay_status"] == "partial"
        assert put_data["amount_paid"] == half_amt
        assert put_data["balance"] == round(total - half_amt, 2)

        # 3. Update payment status to "partial" with specific amount
        quarter_amt = round(total / 4, 2)
        patch_partial = requests.patch(
            f"{api}/purchases/{oid}/payment-status",
            headers=owner_headers,
            json={"payment_status": "partial", "amount_paid": quarter_amt, "note": "Quarter advance"}
        )
        assert patch_partial.status_code == 200
        part_data = patch_partial.json()
        assert part_data["pay_status"] == "partial"
        assert part_data["amount_paid"] == quarter_amt

        # 4. Update payment status to "unpaid"
        patch_unpaid = requests.patch(
            f"{api}/purchases/{oid}/payment-status",
            headers=owner_headers,
            json={"payment_status": "unpaid"}
        )
        assert patch_unpaid.status_code == 200
        unpaid_data = patch_unpaid.json()
        assert unpaid_data["pay_status"] == "unpaid"
        assert unpaid_data["amount_paid"] == 0
        assert unpaid_data["balance"] == total

        # 5. Delete payment record via DELETE /orders/{oid}/payments/{pid}
        if unpaid_data.get("payments"):
            first_pid = unpaid_data["payments"][0]["id"]
            del_pmt = requests.delete(f"{api}/orders/{oid}/payments/{first_pid}", headers=owner_headers)
            assert del_pmt.status_code == 200

        # Cleanup order
        requests.delete(f"{api}/orders/{oid}", headers=owner_headers)

    def test_purchase_create_with_cleared_payment_status(self, api, owner_headers):
        prod = self._get_first_product(api, owner_headers)
        payload = {
            "party_name": "TEST Cash Supplier", "ref_no": "TEST-PO-CASH-1",
            "items": [{"product_id": prod["id"], "model": prod["model"], "qty": 1, "rate": prod["cost_price"]}],
            "payment_status": "cleared"
        }
        r = requests.post(f"{api}/purchases", headers=owner_headers, json=payload)
        assert r.status_code == 201
        order = r.json()
        oid = order["id"]
        assert order["pay_status"] == "cleared"
        assert order["balance"] == 0
        assert order["amount_paid"] == order["total"]

        # Cleanup
        requests.delete(f"{api}/orders/{oid}", headers=owner_headers)

    def test_list_sales_purchases(self, api, owner_headers):
        assert requests.get(f"{api}/sales", headers=owner_headers).status_code == 200
        p = requests.get(f"{api}/purchases", headers=owner_headers)
        assert p.status_code == 200
        # opening PO exists
        assert any(o.get("ref_no") == "PO-27.08.26" for o in p.json())


# --- Expenses ---
class TestExpenses:
    def test_expense_flow(self, api, owner_headers):
        c = requests.post(f"{api}/expenses", headers=owner_headers,
                          json={"category": "TEST_Rent", "amount": 500, "note": "TEST"})
        assert c.status_code == 201
        eid = c.json()["id"]
        lst = requests.get(f"{api}/expenses", headers=owner_headers).json()
        assert any(e["id"] == eid for e in lst)
        d = requests.delete(f"{api}/expenses/{eid}", headers=owner_headers)
        assert d.status_code == 200


# --- Dashboard & Reports ---
class TestDashboardReports:
    def test_dashboard(self, api, owner_headers):
        r = requests.get(f"{api}/dashboard", headers=owner_headers)
        assert r.status_code == 200
        j = r.json()
        for key in ("total_sales", "net_profit", "receivable", "payable",
                    "inventory_value", "units_in_stock", "low_stock", "recent_sales"):
            assert key in j
        assert j["units_in_stock"] >= 0

    def test_reports(self, api, owner_headers):
        r = requests.get(f"{api}/reports", headers=owner_headers)
        assert r.status_code == 200
        j = r.json()
        for key in ("summary", "sales_by_month", "purchases_by_month",
                    "top_products", "expense_by_category",
                    "overdue_receivables", "overdue_payables"):
            assert key in j


# --- Staff (owner only) ---
class TestStaff:
    _staff_id = None
    _staff_token = None

    def test_owner_can_create_staff(self, api, owner_headers):
        payload = {"email": "TEST_staff1@soneja.com", "password": "Staff@123", "name": "TEST Staff"}
        # cleanup pre-existing if any
        r = requests.post(f"{api}/staff", headers=owner_headers, json=payload)
        if r.status_code == 409:
            # already exists from previous run - skip creation but proceed
            lst = requests.get(f"{api}/staff", headers=owner_headers).json()
            existing = next((s for s in lst if s["email"] == "test_staff1@soneja.com"), None)
            assert existing, "409 but not in list"
            TestStaff._staff_id = existing["id"]
        else:
            assert r.status_code == 201, r.text
            TestStaff._staff_id = r.json()["id"]

    def test_duplicate_email_returns_409(self, api, owner_headers):
        r = requests.post(f"{api}/staff", headers=owner_headers,
                          json={"email": "TEST_staff1@soneja.com", "password": "Staff@123", "name": "dup"})
        assert r.status_code == 409

    def test_list_staff(self, api, owner_headers):
        r = requests.get(f"{api}/staff", headers=owner_headers)
        assert r.status_code == 200

    def test_staff_cannot_access_staff_endpoints(self, api):
        login = requests.post(f"{api}/auth/login",
                              json={"email": "TEST_staff1@soneja.com", "password": "Staff@123"})
        assert login.status_code == 200
        token = login.json()["access_token"]
        staff_headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{api}/staff", headers=staff_headers)
        assert r.status_code == 403
        r2 = requests.post(f"{api}/staff", headers=staff_headers,
                           json={"email": "TEST_staff2@soneja.com", "password": "x123456", "name": "x"})
        assert r2.status_code == 403

    def test_patch_staff(self, api, owner_headers):
        assert TestStaff._staff_id
        r = requests.patch(f"{api}/staff/{TestStaff._staff_id}",
                           headers=owner_headers, json={"name": "TEST Staff Updated"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST Staff Updated"

    def test_deactivate_staff(self, api, owner_headers):
        assert TestStaff._staff_id
        r = requests.patch(f"{api}/staff/{TestStaff._staff_id}",
                           headers=owner_headers, json={"active": False})
        assert r.status_code == 200
