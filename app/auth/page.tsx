"use client";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";
const ALIAS_MIN = 3;
const ALIAS_MAX = 10;
// El destino original tiene que sobrevivir al desvío por /auth/alias, igual que
// hace app/auth/callback/route.ts con el retorno de OAuth.
function aliasHref(next: string): string {
  return `/auth/alias?next=${encodeURIComponent(next)}`;
}
// Los mensajes de Supabase Auth llegan en inglés: se traducen aquí para que la
// tarjeta hable siempre en Español.
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed"))
    return "Este correo todavía no está confirmado.";
  if (
    m.includes("user already registered") ||
    m.includes("already been registered")
  )
    return "Ese correo ya está registrado. Inicia sesión.";
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "El correo no tiene un formato válido.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera un momento y vuelve a probar.";
  return "No se pudo completar la operación. Intenta de nuevo.";
}
function AuthCard() {
  const [tab, setTab] = useState<"in" | "up">("in");
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const switchTab = (value: "in" | "up") => {
    setTab(value);
    setError(null);
  };
  const signIn = async () => {
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      {
        email: email.trim(),
        password: pass,
      },
    );
    if (signInError) {
      setError(translateAuthError(signInError.message));
      return;
    }
    // Una cuenta anterior al trigger puede estar en auth.users sin fila en
    // profiles. Sin alias el nav la muestra como anónima y /games la deja en un
    // limbo sin identidad, así que se desvía igual que el retorno de OAuth.
    // requirePlayer() es la red de seguridad, no el primer filtro.
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile) {
      router.replace(aliasHref(next));
      return;
    }
    router.replace(next);
    router.refresh();
  };
  const signUp = async () => {
    const supabase = createClient();
    const username = alias.trim().toUpperCase();
    if (username.length < ALIAS_MIN || username.length > ALIAS_MAX) {
      setError(
        `El alias debe tener entre ${ALIAS_MIN} y ${ALIAS_MAX} caracteres.`,
      );
      return;
    }
    // Solo un aviso de UX: ver "ese alias ya está tomado" mientras se escribe es
    // mejor que verlo después de enviar el formulario. La garantía sigue siendo
    // el `unique` de profiles, que el trigger hace valer dentro del alta; este
    // select puede perder una carrera y no pasa nada.
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (taken) {
      setError("Ese alias ya está tomado. Elige otro.");
      return;
    }
    // El alias viaja en los metadatos del alta: la fila de profiles la crea el
    // trigger "arcade-vault".handle_new_user() dentro de la misma transacción
    // que el usuario. Así no existe la ventana en la que auth.users tiene una
    // fila y profiles no, que es lo que dejaba cuentas sin alias (spec 17).
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: pass,
      options: { data: { username } },
    });
    if (signUpError) {
      setError(translateAuthError(signUpError.message));
      return;
    }
    if (!data.session || !data.user) {
      // Fail-safe: con "Confirm email" desactivado esto no debería dispararse.
      // Si alguien vuelve a encender el toggle, el alias ya no se pierde (lo
      // guardó el trigger) y esto manda a /auth/alias, que reenvía a `next` en
      // cuanto haya sesión, en vez de dejar un mensaje sin acción posible.
      router.replace(aliasHref(next));
      return;
    }
    router.replace(next);
    router.refresh();
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (tab === "in") await signIn();
      else await signUp();
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };
  const signInWithOAuth = async (provider: "google" | "github") => {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
    if (oauthError) {
      setError("No se pudo abrir el proveedor. Intenta de nuevo.");
      setBusy(false);
    }
  };
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>
        <div className="auth-tabs">
          <button
            type="button"
            className={tab === "in" ? "on" : ""}
            onClick={() => switchTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            className={tab === "up" ? "on" : ""}
            onClick={() => switchTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>
        <form onSubmit={submit}>
          {tab === "up" && (
            <div className="field slide-in">
              <label>Usuario</label>
              <input
                value={alias}
                onChange={(e) =>
                  setAlias(e.target.value.toUpperCase().slice(0, ALIAS_MAX))
                }
                placeholder="PX_KAI"
                maxLength={ALIAS_MAX}
                autoComplete="username"
              />
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                  marginTop: 6,
                }}
              >
                {ALIAS_MIN}–{ALIAS_MAX} CARACTERES · ASÍ TE VERÁ EL SALÓN DE LA
                FAMA
              </div>
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === "in" ? "current-password" : "new-password"}
              required
            />
          </div>
          {error && (
            <div
              className="mono"
              style={{
                marginTop: 12,
                fontSize: 11,
                color: "var(--magenta)",
                letterSpacing: "0.08em",
              }}
            >
              ▸ {error}
            </div>
          )}
          <button
            className="btn lg"
            type="submit"
            disabled={busy}
            style={{ width: "100%", marginTop: 8 }}
          >
            {busy
              ? "CONECTANDO..."
              : tab === "in"
                ? "ENTRAR AL VAULT"
                : "CREAR Y JUGAR"}
          </button>
        </form>
        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            onClick={() => signInWithOAuth("google")}
          >
            ◆ GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            onClick={() => signInWithOAuth("github")}
          >
            ▣ GITHUB
          </button>
        </div>
        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
export default function AuthPage() {
  return (
    <Suspense fallback={<div className="av-auth-wrap fade-in" />}>
      <AuthCard />
    </Suspense>
  );
}
