import { handleMockApi } from "./mockData";

const BASE = import.meta.env.VITE_API_URL || "";
export const TOKEN_KEY = "soneja_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token === null) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const method = init.method || "GET";
  const body = init.body ? JSON.parse(init.body as string) : undefined;

  // Check if running on GitHub Pages or static host with no backend
  const isGitHubPages = typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
  const useMock = !BASE || isGitHubPages;

  if (useMock) {
    if (BASE) {
      try {
        const headers = new Headers(init.headers);
        headers.set("Content-Type", "application/json");
        if (token) headers.set("Authorization", `Bearer ${token}`);
        const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
        if (res.ok) {
          const text = await res.text();
          return (text ? JSON.parse(text) : null) as T;
        }
      } catch {
        // Fall back to client storage
      }
    }
    // Instant response from mock data store
    await new Promise((r) => setTimeout(r, 40));
    return handleMockApi(path, method, body) as T;
  }

  // Standard backend fetch
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  try {
    const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const detail = (data && (data.detail || data.message)) || "Request failed";
      throw new ApiError(typeof detail === "string" ? detail : "Request failed", res.status);
    }
    return data as T;
  } catch (err: any) {
    console.warn("Backend unavailable, using client store fallback:", err);
    return handleMockApi(path, method, body) as T;
  }
}

export const apiGet = <T = any>(p: string) => api<T>(p);
export const apiPost = <T = any>(p: string, body?: any) =>
  api<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const apiPut = <T = any>(p: string, body?: any) =>
  api<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T = any>(p: string, body?: any) =>
  api<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T = any>(p: string) => api<T>(p, { method: "DELETE" });
