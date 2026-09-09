import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiGet, apiPost, setToken, getToken } from "./api";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff";
  active: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const token = getToken();
      if (token) {
        const me = await apiGet<User>("/auth/me");
        setUser(me);
      }
    } catch {
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiPost<{ access_token: string; user: User }>("/auth/login", { email, password });
    setToken(res.access_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
