import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api";

export type UserRole = "admin" | "organizer" | "staff" | "speaker" | "attendee" | "sponsor";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  organization?: string;
  bio?: string;
}

const TOKEN_KEY = "eventforge_token";
const USER_KEY = "eventforge_user";

interface AuthResponse {
  user: AuthUser & { _id?: string };
  token: string;
}

function normalizeUser(raw: AuthUser & { _id?: string }): AuthUser {
  const { _id, ...rest } = raw;
  return { ...rest, id: rest.id ?? _id ?? "" };
}

function readStored(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    const user = rawUser ? (JSON.parse(rawUser) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function persist(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearStored() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<AuthUser>;
  logout: () => void;
  initials: string;
  displayRole: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = readStored();
    setToken(stored.token);
    setUser(stored.user);
    if (!stored.token) return;
    api
      .get<AuthUser & { _id?: string }>("/api/auth/me")
      .then((me) => {
        const normalized = normalizeUser(me);
        setUser(normalized);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(normalized));
        } catch {
          /* ignore */
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.message.includes("401")) {
          clearStored();
          setToken(null);
          setUser(null);
        }
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/auth/login", { email, password });
    const normalized = normalizeUser(res.user);
    persist(res.token, normalized);
    setToken(res.token);
    setUser(normalized);
    return normalized;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    const res = await api.post<AuthResponse>("/api/auth/register", { email, password, name, role });
    const normalized = normalizeUser(res.user);
    persist(res.token, normalized);
    setToken(res.token);
    setUser(normalized);
    return normalized;
  }, []);

  const logout = useCallback(() => {
    clearStored();
    setToken(null);
    setUser(null);
  }, []);

  const initials = useMemo(() => {
    if (!user?.name) return "";
    return user.name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  const displayRole = useMemo(() => {
    if (!user?.role) return "";
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }, [user?.role]);

  const value = useMemo(
    () => ({ user, token, login, register, logout, initials, displayRole }),
    [user, token, login, register, logout, initials, displayRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
