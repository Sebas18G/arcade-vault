"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getUser, setUser as persistUser, type UserSession } from "@/lib/storage";

type AuthContextValue = {
  user: UserSession;
  login: (user: UserSession) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const login = (nextUser: UserSession) => {
    setUser(nextUser);
    persistUser(nextUser);
  };

  const logout = () => {
    setUser(null);
    persistUser(null);
  };

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
