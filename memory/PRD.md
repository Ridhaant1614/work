# Soneja Electronics — Distribution CRM (PRD)

## Original Problem Statement
Build a CRM for Soneja Electronics, a distributor of home appliances (Worldtech TVs). Needs trackers for daily expenses, purchase orders (auto-updating inventory), sales orders, live inventory by SKU/model with quantities, editable SKU/model/costing cost sheet, dealer network directory, a home dashboard with total sales, a summarized report (sales/purchases/inventory/net profit) updated on every change, and receivables/payables tracking with aging (invoice vs payment received; supplier side too).

## User Choices
- Multi-user: owner + staff, JWT email/password login.
- Prices are GST-inclusive.
- Sales orders: invoice total + amount received → auto receivable balance + aging; supports multiple part-payments.
- Inventory auto-adjusts on purchase (increase) and sales (decrease) orders.
- Clean professional blue/teal theme.

## Architecture
- Backend: FastAPI + MongoDB (motor async), JWT (pyjwt) + passlib bcrypt. UUID string ids, soft deletes (deleted_at), all routes under /api.
- Frontend: Expo Router (React Native), @tanstack/react-query, react-native-keyboard-controller, @react-native-vector-icons/material-design-icons, theme tokens in src/theme.ts.
- Tabs: Home, Sales, Purchases, More. Stack screens: inventory, products, dealers, expenses, reports, staff, sales/new, sales/[id], purchases/new, purchases/[id], login.

## Personas
- Owner: full access incl. staff management.
- Staff: operational access (orders, inventory, dealers, expenses, reports); no staff management.

## Core Requirements (static)
- Dashboard KPIs; sales/purchase orders with part-payments + aging; auto inventory; product/cost-sheet CRUD; dealer directory with call/WhatsApp; expenses; reports; auth + roles.

## Implemented (2026-06)
- JWT auth (owner seeded: owner@soneja.com / Soneja@123), /auth/me, staff CRUD (owner-only, RBAC).
- Products CRUD + cost sheet (12 Worldtech models seeded, GST-inclusive cost + sell + qty).
- Dealers CRUD (16 seeded) with call/WhatsApp deep links.
- Sales & Purchase orders: create with line items, initial payment, auto inventory adjust, part-payments endpoint, pay_status + aging, soft-delete reverses stock. Opening PO seeded (87 units).
- Expenses CRUD.
- Dashboard (total sales, net profit, receivable, payable, inventory value, units in stock, low stock, recent sales).
- Reports (summary, sales/purchases by month, top products, expense by category, overdue receivables/payables).
- Toasts, loading/empty/error states, filter chips, FAB, safe-area handling, light/dark theme.
- Tested end-to-end via testing_agent (backend 19/20 pass — the 1 miss was a parallel test race; frontend all critical flows pass).

## Backlog / Remaining
- P1: Edit existing orders (currently create + delete only).
- P1: Date picker on orders (currently uses today).
- P2: Export/share invoice as PDF/image.
- P2: Supplier directory (payables currently keyed off free-text supplier name on POs).
- P2: Dealer-wise / supplier-wise outstanding statement screen.
- P2: Object storage for product images.

## Next Tasks
- Gather feedback on dashboard KPIs and reports; consider date filters on reports.
