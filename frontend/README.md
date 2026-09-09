# Soneja Electronics CRM — Web Frontend

Modern React 19 + TypeScript + Vite web client for the Soneja Electronics Distribution CRM.

## Features
- **Responsive Navigation**: Desktop sidebar with grouped navigation and mobile responsive topbar / bottom nav.
- **Dark & Light Mode Design System**: Rich modern aesthetics with custom HSL tokens, glassmorphic cards, and micro-animations.
- **Sales & Purchases Workflow**: Line item billing, dealer auto-complete, printable invoices, and balance tracking.
- **Inventory & Cost Sheet**: Real-time stock levels, margin calculations, and low-stock alerts.
- **Dealer Book**: WhatsApp direct messaging (`wa.me`) and direct phone dialing (`tel:`).
- **Financial Analytics**: P&L waterfall breakdown, monthly sales vs. purchases comparison bars, and aging receivables.
- **Staff Administration**: Owner-guarded team management and account control.

## Development

```bash
# Install dependencies
npm install

# Start Vite dev server with proxy to backend (http://127.0.0.1:8000)
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```

## Environment Variables
Create `.env` in this directory:
```env
# Optional: Set remote backend URL for production deployment.
# Leave empty during local development to use the Vite local proxy.
VITE_API_URL=
```
