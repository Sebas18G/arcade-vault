"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
// El alias visible sale de "arcade-vault".profiles, no del correo ni de los
// metadatos de auth.users: es la fuente única de player_name en los leaderboards.
export type UserSession = { id: string; name: string } | null;
type AuthContextValue = {
  user: UserSession;
  loading: boolean;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    let cancelled = false;
    // Un usuario autenticado sin fila en profiles es un estado válido (registro
    // a medias u OAuth recién estrenado): /auth/alias es quien lo resuelve.
    async function resolve(userId: string | undefined) {
      if (!userId) {
        if (!cancelled) setUser(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      setUser(data ? { id: userId, name: data.username } : null);
    }
    supabase.auth
      .getSession()
      .then(({ data }) => resolve(data.session?.user.id))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolve(session?.user.id);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);
  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return ctx;
}
