import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
export const TOKEN_KEY = "soneja_token";

export async function getToken(): Promise<string | null> {
  return storage.secureGet<string>(TOKEN_KEY, "");
}
export async function setToken(token: string | null): Promise<void> {
  if (token === null) await storage.secureRemove(TOKEN_KEY);
  else await storage.secureSet(TOKEN_KEY, token);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const detail = (data && (data.detail || data.message)) || "Request failed";
    throw new ApiError(typeof detail === "string" ? detail : "Request failed", res.status);
  }
  return data as T;
}

export const apiGet = <T = any>(p: string) => api<T>(p);
export const apiPost = <T = any>(p: string, body?: any) =>
  api<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const apiPut = <T = any>(p: string, body?: any) =>
  api<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T = any>(p: string, body?: any) =>
  api<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T = any>(p: string) => api<T>(p, { method: "DELETE" });
