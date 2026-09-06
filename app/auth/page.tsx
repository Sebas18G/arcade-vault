"use client";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safe-next";
const ALIAS_MIN = 3;
const ALIAS_MAX = 10;
// Logos de marca en vez de los ◆ / ▣ del mockup: son los dos botones que más
// confianza tienen que transmitir. Google va con sus cuatro colores oficiales;
// GitHub, monocromo, hereda el color del botón para no romper el tema.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285f4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82z"
      />
      <path
        fill="#34a853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.76-2.11-6.71-4.94H1.29v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#fbbc05"
        d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1z"
      />
      <path
        fill="#ea4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l4 3.1C6.24 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}
function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 .3a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58l-.01-2.05c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.93.43.37.82 1.1.82 2.22l-.01 3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3z"
      />
    </svg>
  );
}
// Ojo abierto / tachado para el control de mostrar contraseña. Trazo fino en
// currentColor, para que herede el cyan al enfocar el botón.
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1.8 12S5.4 5.4 12 5.4 22.2 12 22.2 12 18.6 18.6 12 18.6 1.8 12 1.8 12z" />
      <circle cx="12" cy="12" r="3.2" />
      {off && <path d="M3.5 3.5 20.5 20.5" />}
    </svg>
  );
}
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
  // Choque de `unique` (o del check de longitud) dentro de handle_new_user: el
  // alta entera se revierte y no queda usuario en auth.users. El GoTrue de hoy
  // propaga el 23505 de Postgres tal cual —comprobado contra /auth/v1/signup—,
  // pero otras versiones lo envuelven en un genérico. Se cubren los dos; si
  // ninguno acierta, queda el fallback de abajo, también en Español.
  if (
    m.includes("database error saving new user") ||
    m.includes("profiles_username_key") ||
    m.includes("duplicate key value")
  )
    return "Ese alias ya está tomado o no es válido. Elige otro.";
  return "No se pudo completar la operación. Intenta de nuevo.";
}
function AuthCard() {
  const [tab, setTab] = useState<"in" | "up">("in");
  const [alias, setAlias] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  // Qué botón está trabajando, no si "algo" está trabajando: así solo el pulsado
  // muestra el spinner y los otros dos se limitan a deshabilitarse.
  const [pending, setPending] = useState<"form" | "google" | "github" | null>(
    null,
  );
  const busy = pending !== null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const aliasLength = alias.trim().length;
  const aliasValid = aliasLength >= ALIAS_MIN && aliasLength <= ALIAS_MAX;
  // Un campo vacío que todavía nadie tocó no está "mal", solo está vacío.
  const aliasState = aliasLength === 0 ? "" : aliasValid ? "valid" : "invalid";
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
    setPending("form");
    try {
      if (tab === "in") await signIn();
      else await signUp();
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setPending(null);
    }
  };
  const signInWithOAuth = async (provider: "google" | "github") => {
    setError(null);
    setPending(provider);
    const supabase = createClient();
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    });
    if (oauthError) {
      setError("No se pudo abrir el proveedor. Intenta de nuevo.");
      setPending(null);
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
                className={aliasState && `is-${aliasState}`}
                aria-invalid={aliasState === "invalid"}
              />
              <div className="field-hint">
                <span>
                  {ALIAS_MIN}–{ALIAS_MAX} CARACTERES · ASÍ TE VERÁ EL SALÓN DE
                  LA FAMA
                </span>
                <span
                  className={`field-count ${aliasState && `is-${aliasState}`}`}
                >
                  {aliasLength}/{ALIAS_MAX}
                </span>
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
            <div className="field-control">
              <input
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete={
                  tab === "in" ? "current-password" : "new-password"
                }
                required
              />
              <button
                type="button"
                className="field-reveal"
                onClick={() => setShowPass((v) => !v)}
                aria-label={
                  showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPass}
              >
                <EyeIcon off={showPass} />
              </button>
            </div>
          </div>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          <button
            className="btn lg"
            type="submit"
            disabled={busy}
            aria-busy={pending === "form"}
            style={{ width: "100%", marginTop: 8 }}
          >
            {pending === "form" && <span className="spinner" />}
            {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>
        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            aria-busy={pending === "google"}
            onClick={() => signInWithOAuth("google")}
          >
            {pending === "google" ? (
              <span className="spinner" />
            ) : (
              <GoogleIcon />
            )}
            GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            disabled={busy}
            aria-busy={pending === "github"}
            onClick={() => signInWithOAuth("github")}
          >
            {pending === "github" ? (
              <span className="spinner" />
            ) : (
              <GithubIcon />
            )}
            GITHUB
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
