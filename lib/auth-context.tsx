"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getUser, setUser as persistUser, type UserSession } from "@/lib/storage";

type AuthContextValue = {
  user: UserSession;
  login: (user: UserSession) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let cachedUser: UserSession = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): UserSession {
  return cachedUser;
}

function getServerSnapshot(): UserSession {
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const stored = getUser();
    if (stored?.name !== cachedUser?.name) {
      cachedUser = stored;
      notify();
    }
  }, []);

  const login = useCallback((nextUser: UserSession) => {
    persistUser(nextUser);
    cachedUser = nextUser;
    notify();
  }, []);

  const logout = useCallback(() => {
    persistUser(null);
    cachedUser = null;
    notify();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return ctx;
}
