import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth";
import { ToastProvider } from "./toast";
import { Spinner } from "./ui";

import Layout from "./Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrderList from "./pages/OrderList";
import OrderForm from "./pages/OrderForm";
import OrderDetail from "./pages/OrderDetail";
import Inventory from "./pages/Inventory";
import Products from "./pages/Products";
import Dealers from "./pages/Dealers";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Staff from "./pages/Staff";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface)",
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface)",
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              {/* Public route */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />

              {/* Protected app shell */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />

                {/* Sales */}
                <Route path="sales" element={<OrderList kind="sale" title="Sales Invoices" />} />
                <Route path="sales/new" element={<OrderForm kind="sale" />} />
                <Route path="sales/:id" element={<OrderDetail kind="sale" />} />
                <Route path="sales/:id/edit" element={<OrderForm kind="sale" />} />

                {/* Purchases */}
                <Route path="purchases" element={<OrderList kind="purchase" title="Purchase Orders" />} />
                <Route path="purchases/new" element={<OrderForm kind="purchase" />} />
                <Route path="purchases/:id" element={<OrderDetail kind="purchase" />} />
                <Route path="purchases/:id/edit" element={<OrderForm kind="purchase" />} />

                {/* Catalog & Operations */}
                <Route path="inventory" element={<Inventory />} />
                <Route path="products" element={<Products />} />
                <Route path="dealers" element={<Dealers />} />
                <Route path="expenses" element={<Expenses />} />

                {/* Reports & Staff */}
                <Route path="reports" element={<Reports />} />
                <Route path="staff" element={<Staff />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
