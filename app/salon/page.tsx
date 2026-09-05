"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { GameRow } from "@/lib/supabase/types";
const SCORE_TABLE: Record<string, string> = {
  asteroids: "asteroids_scores",
  tetris: "tetris_scores",
  arkanoid: "arkanoid_scores",
  snake: "snake_scores",
  frogger: "frogger_scores",
};
type SalonRow = { id: string; name: string; score: number; date: string };
function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}
function mapRows(
  data:
    | { id: string; player_name: string; score: number; created_at: string }[]
    | null,
): SalonRow[] {
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.player_name,
    score: r.score,
    date: formatDate(r.created_at),
  }));
}
export default function HallOfFamePage() {
  const { user } = useAuth();
  const [games, setGames] = useState<GameRow[]>([]);
  const [tab, setTab] = useState("");
  const [rows, setRows] = useState<SalonRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [youRow, setYouRow] = useState<SalonRow | null>(null);
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("games")
      .select("id, title, created_at")
      .then(({ data }) => {
        if (cancelled) return;
        const list = (data ?? []) as GameRow[];
        setGames(list);
        setTab((current) => current || list[0]?.id || "");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    async function load() {
      const table = SCORE_TABLE[tab];
      if (!table) {
        setRows([]);
        setRowsLoading(false);
        return;
      }
      setRowsLoading(true);
      const { data } = await supabase
        .from(table)
        .select("id, player_name, score, created_at")
        .order("score", { ascending: false })
        .limit(12);
      if (!cancelled) setRows(mapRows(data));
    }
    load().finally(() => {
      if (!cancelled) setRowsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tab]);
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    async function load() {
      const table = SCORE_TABLE[tab];
      if (!user || !table) {
        setYouRow(null);
        return;
      }
      const { data } = await supabase
        .from(table)
        .select("id, player_name, score, created_at")
        .eq("user_id", user.id)
        .order("score", { ascending: false })
        .limit(1);
      if (!cancelled) setYouRow(mapRows(data)[0] ?? null);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tab, user]);
  useEffect(() => {
    const table = SCORE_TABLE[tab];
    if (!table) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`salon-${table}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "arcade-vault", table },
        (payload) => {
          const row = payload.new as {
            id: string;
            player_name: string;
            score: number;
            created_at: string;
          };
          setRows((prev) => {
            if (prev.some((r) => r.id === row.id)) return prev;
            const next = [...prev, mapRows([row])[0]];
            next.sort((a, b) => b.score - a.score);
            return next.slice(0, 12);
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tab]);
  const activeGame = games.find((g) => g.id === tab);
  const visibleYouRow = user ? youRow : null;
  const youRankInList = visibleYouRow
    ? rows.findIndex((r) => r.id === visibleYouRow.id)
    : -1;
  const youRankLabel =
    youRankInList >= 0 ? String(youRankInList + 1).padStart(2, "0") : ">12";
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>
      {!rowsLoading && rows.length > 0 && (
        <div className="podium">
          {rows[1] && (
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <div className="name">{rows[1].name}</div>
              <div className="score">
                {rows[1].score.toLocaleString("es-ES")}
              </div>
              <div className="date">{rows[1].date}</div>
            </div>
          )}
          {rows[0] && (
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{
                  fontSize: 9,
                  color: "var(--gold)",
                  letterSpacing: "0.18em",
                }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0].name}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {rows[0].score.toLocaleString("es-ES")}
              </div>
              <div className="date">{rows[0].date}</div>
            </div>
          )}
          {rows[2] && (
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <div className="name">{rows[2].name}</div>
              <div className="score">
                {rows[2].score.toLocaleString("es-ES")}
              </div>
              <div className="date">{rows[2].date}</div>
            </div>
          )}
        </div>
      )}
      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rowsLoading ? (
          <div
            className="mono"
            style={{
              padding: "24px 18px",
              textAlign: "center",
              color: "var(--ink-dim)",
            }}
          >
            CARGANDO...
          </div>
        ) : rows.length === 0 ? (
          <div
            className="mono"
            style={{
              padding: "24px 18px",
              textAlign: "center",
              color: "var(--ink-dim)",
            }}
          >
            AÚN SIN PUNTAJES
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.id}
              className={
                "tr" +
                (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{r.date}</div>
            </div>
          ))
        )}
        {visibleYouRow && (
          <>
            <div className="tr you-label">
              ▸ TU MEJOR MARCA EN {activeGame?.title ?? tab}
            </div>
            <div
              className="tr you"
              style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
            >
              <div className="rk" style={{ color: "var(--yellow)" }}>
                #{youRankLabel}
              </div>
              <div className="pl" style={{ color: "var(--yellow)" }}>
                {visibleYouRow.name}
              </div>
              <div
                className="sc"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                {visibleYouRow.score.toLocaleString("es-ES")}
              </div>
              <div className="dt">{visibleYouRow.date}</div>
            </div>
          </>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
