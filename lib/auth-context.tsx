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
    let resolvedId: string | null = null;
    // Un usuario autenticado sin fila en profiles es un estado válido (registro
    // a medias u OAuth recién estrenado): /auth/alias es quien lo resuelve.
    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[auth] no se pudo leer el perfil:", error);
        setUser(null);
        return;
      }
      setUser(data ? { id: userId, name: data.username } : null);
    }
    function handleSession(userId: string | undefined) {
      const id = userId ?? null;
      if (id === resolvedId) return;
      resolvedId = id;
      if (!id) {
        setUser(null);
        return;
      }
      // El callback de onAuthStateChange corre dentro del lock de auth de
      // supabase-js: consultar la base ahí dentro se queda esperando ese mismo
      // lock y la promesa nunca resuelve (el usuario quedaba en null pese a
      // tener sesión). Por eso la lectura del perfil se difiere fuera del lock.
      setTimeout(() => {
        if (!cancelled) loadProfile(id);
      }, 0);
    }
    supabase.auth
      .getSession()
      .then(({ data }) => handleSession(data.session?.user.id))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session?.user.id);
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
