# Soneja Electronics — Distribution CRM & Inventory Master

A modern, production-grade **Full-Stack Web Application** engineered specifically for consumer electronics and television wholesale distributors. Built with high performance, rich aesthetics, and complete multi-device responsiveness (Desktop, Tablet, Mobile browser).

---

## 🚀 Key Modules & Capabilities

### 1. Executive Dashboard (`/`)
- **Live KPI Grid**: Real-time rollups for Total Sales, Net Profit, Dealer Receivables, Supplier Payables, Total Inventory Valuation, and Units in Stock.
- **Quick Action Bar**: One-click navigation to create Sales, log Purchases, add Expenses, inspect Inventory, or review Financial Reports.
- **Critical Stock Alerts**: Real-time badges for TV models with low inventory (≤ 2 units) with instant re-stock indicators.
- **Recent Activity**: Live stream of latest customer billing records with color-coded settlement badges (`cleared`, `partial`, `unpaid`).

### 2. Sales Invoicing & Receivables (`/sales`)
- **Interactive Invoicing**: Create sales orders with dealer dropdowns, multi-item line picker, dynamic quantity/rate math, and initial payment recording.
- **Instant Printable Invoices**: Pre-formatted commercial distribution bills ready to print or save as PDF with buyer info, line item breakdown, and balance due.
- **Partial Payment Tracking**: Record subsequent payments against open invoices with real-time balance calculations.
- **Inventory Auto-Sync**: Automatically deducts units from stock upon sale confirmation and restores units upon order deletion.

### 3. Purchase Orders & Inventory Intake (`/purchases`)
- **Supplier Procurement**: Manage supplier purchase orders and stock arrivals.
- **Automatic Stock Inflow**: Receiving purchase orders instantly increments stock on hand across affected television SKUs.
- **Supplier Payables**: Track accounts payable aging and log supplier settlements.

### 4. Inventory Master & Cost Sheet (`/inventory`, `/products`)
- **Catalog Management**: Add, update, and categorize TV models (Screen size, display technology, Smart OS).
- **Cost vs. Sell Margin**: Automatically computes gross margin (₹ and %) per unit based on wholesale cost and selling price.
- **Live Stock Levels**: Searchable and filterable by model name, SKU, or category.

### 5. Dealer Directory & WhatsApp Integration (`/dealers`)
- **Directory**: Comprehensive records of Mumbai retail partners and authorized dealers.
- **One-Click WhatsApp & Phone**: Direct `https://wa.me/...` links to start WhatsApp conversations or dial phone numbers directly from the browser.
- **Outstanding Balance Indicators**: Instantly view unsettled receivables per dealer.

### 6. Daily Operating Expenses (`/expenses`)
- **Categorized Tracking**: Transport & Freight, Rent, Staff Salaries, Utilities, Marketing, and Miscellaneous.
- **Summary Cards & Filters**: Fast entry modal with date pickers and category pills.

### 7. Financial Reports & Business Intelligence (`/reports`)
- **P&L Statement**: Waterfall statement showing Revenue − COGS = Gross Profit − Expenses = Net Profit.
- **Monthly Volume Comparison**: Visual side-by-side comparison bars for monthly sales vs. procurement.
- **Top Models Leaderboard**: High-volume television models ranked by sales velocity.
- **Aging Receivables & Payables**: Filtered tables displaying exact overdue aging days for dealers and suppliers.

### 8. Staff & Permissions Control (`/staff`)
- **Role-Based Access Control**: Owner-only portal to invite staff members, set credentials, and toggle account activation.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, TanStack Query v5, React Router v7, Vanilla CSS Design System with Plus Jakarta Sans typography.
- **Backend**: FastAPI, Motor (Async MongoDB driver), Python-JOSE / PyJWT, Passlib (Bcrypt), Pydantic v2.
- **Database**: MongoDB (Local or MongoDB Atlas).
- **Deployment**: Docker, Docker Compose, Vercel SPA configuration (`vercel.json`), Nginx container configuration.

---

## 📦 Default Seed Data & Demo Access

Upon initial launch, the database automatically seeds:
- **Default Owner Account**:
  - **Email**: `owner@soneja.com`
  - **Password**: `Soneja@123`
- **12 Worldtech TV Models**: 24" to 65" (Smart, BT, Frameless, 4K WebOS, QLED).
- **16 Mumbai Electronics Dealers**: Pre-populated with contact persons, phone numbers, and locations.
- **Opening Purchase Order**: Initial stock intake of 87 television units.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- MongoDB 6.0+ (running locally or MongoDB Atlas connection string)

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env (copy from .env.example)
cp .env.example .env

# Run FastAPI server
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be available at: `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).

### 2. Web Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Frontend will be available at: `http://localhost:5173` (Vite automatically proxies `/api` to `http://127.0.0.1:8000`).

---

## 🐳 Docker Deployment (One-Command Launch)

To run the entire stack (MongoDB + FastAPI + Web Frontend) with Docker Compose:

```bash
docker-compose up --build -d
```

- **Web App**: `http://localhost:3000`
- **API Backend**: `http://localhost:8000`
- **MongoDB**: `localhost:27017`

---

## 🌐 Remote Cloud Deployment Guide

### Frontend Deployment (Vercel)
1. Import the GitHub repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Set Environment Variable:
   - `VITE_API_URL`: `https://your-backend-domain.com`
4. Click **Deploy**. Vercel will automatically handle client-side routing via `vercel.json`.

### Backend Deployment (Render / Railway)
1. Create a new **Web Service** pointing to the `backend` folder.
2. Set Environment Variables:
   - `MONGO_URL`: `mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority`
   - `DB_NAME`: `soneja_crm`
   - `JWT_SECRET`: `<generate-a-secure-random-secret>`
   - `ACCESS_TOKEN_MINUTES`: `43200`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn server:app --host 0.0.0.0 --port 8000`

---

## 📄 License
Private and Proprietary — Soneja Electronics Distribution CRM.
