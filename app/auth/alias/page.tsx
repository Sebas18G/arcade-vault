"use client";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
const ALIAS_MIN = 3;
const ALIAS_MAX = 10;
// Primer login por OAuth (o registro que se quedó a medias): el usuario ya tiene
// sesión pero todavía no tiene fila en profiles. Aquí elige su alias.
function AliasCard() {
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/games";
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    async function guard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        router.replace("/auth");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile) {
        router.replace(next);
        return;
      }
      setChecking(false);
    }
    guard();
    return () => {
      cancelled = true;
    };
  }, [next, router]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const username = alias.trim().toUpperCase();
    if (username.length < ALIAS_MIN || username.length > ALIAS_MAX) {
      setError(
        `El alias debe tener entre ${ALIAS_MIN} y ${ALIAS_MAX} caracteres.`,
      );
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth");
        return;
      }
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, username });
      if (insertError) {
        console.error("[alias] no se pudo insertar el perfil:", insertError);
        setError(
          insertError.code === "23505"
            ? "Ese alias ya está tomado. Elige otro."
            : "No se pudo guardar el alias. Intenta de nuevo.",
        );
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ELIGE TU ALIAS</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ASÍ FIRMARÁS TUS PUNTAJES
          </div>
        </div>
        {checking ? (
          <div
            className="mono"
            style={{
              padding: "28px 0",
              textAlign: "center",
              fontSize: 11,
              color: "var(--ink-dim)",
              letterSpacing: "0.16em",
            }}
          >
            VERIFICANDO SESIÓN...
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>Alias</label>
              <input
                value={alias}
                onChange={(e) =>
                  setAlias(e.target.value.toUpperCase().slice(0, ALIAS_MAX))
                }
                placeholder="PX_KAI"
                maxLength={ALIAS_MAX}
                autoFocus
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
                {ALIAS_MIN}–{ALIAS_MAX} CARACTERES · NO SE PUEDE CAMBIAR DESPUÉS
              </div>
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
              {busy ? "GUARDANDO..." : "RESERVAR ALIAS"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
export default function AliasPage() {
  return (
    <Suspense fallback={<div className="av-auth-wrap fade-in" />}>
      <AliasCard />
    </Suspense>
  );
}
