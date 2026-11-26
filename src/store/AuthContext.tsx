import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import type { AdminMe } from "../lib/apiTypes";

interface LoginResult {
  ok: boolean;
  message?: string;
}

interface AuthContextValue {
  isAuthed: boolean;
  loading: boolean;
  adminNama: string;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith("/admin");
  const shouldCheck = isAdminArea && location.pathname !== "/admin/login";
  const [isAuthed, setIsAuthed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [adminNama, setAdminNama] = useState("Staf Basecamp");

  useEffect(() => {
    if (!shouldCheck) return;
    let active = true;
    api
      .get<{ data: AdminMe | null }>("/admin/me")
      .then((res) => {
        if (!active) return;
        if (res.data) {
          setIsAuthed(true);
          setAdminNama(res.data.nama || "Staf Basecamp");
        } else {
          setIsAuthed(false);
        }
      })
      .catch(() => {
        if (active) setIsAuthed(false);
      })
      .finally(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [shouldCheck]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      setPending(true);
      try {
        const res = await api.post<{ data: AdminMe }>("/admin/login", {
          email,
          password,
        });
        setIsAuthed(true);
        setAdminNama(res.data.nama || "Staf Basecamp");
        await client.invalidateQueries();
        return { ok: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Login gagal. Coba lagi.";
        return { ok: false, message };
      } finally {
        setPending(false);
      }
    },
    [client],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/admin/logout");
    } catch {
      /* sesi mungkin sudah berakhir */
    }
    setIsAuthed(false);
    client.clear();
  }, [client]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthed,
      loading: shouldCheck ? !checked || pending : pending,
      adminNama,
      login,
      logout,
    }),
    [isAuthed, shouldCheck, checked, pending, adminNama, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
