# Recipe: an arcade game with its own Supabase leaderboard

This file is the technical reference the `/add-game` skill consults when filling in a new game's spec (Data model, Implementation plan, Decisions, and Risks sections). **It is not text to copy verbatim into the spec** — it's the shape and precedent to respect, established by specs 05 and 06 (Asteroids, Tetris, Arkanoid) and verified against the current code as of that work.

Every `<id>` below is the game's catalog slug (`asteroids`, `tetris`, `arkanoid`, ...); `<Id>` is its PascalCase form for type/function names; `<TITLE>` is the uppercase display title.

---

## 1. File layout per game

```
components/games/<id>/
  <id>-canvas.tsx    # React wrapper: refs, RAF loop, listeners, imperative handle
  engine.ts           # ported game logic, DOM-decoupled
  leaderboard.ts       # Supabase CRUD for this game's own table
```

Extra files only if the game needs in-screen UI beyond the canvas itself (Tetris is the only precedent for this): a second small canvas (e.g. a "next piece" preview) and/or a CSS Module (`<id>.module.css`) for controls like a theme/skin toggle.

`components/games/shared/types.ts` is the one file every game's components import from — extend it, don't duplicate it.

---

## 2. Canvas component contract

Shared types (already defined in `shared/types.ts`, reuse as-is):

```ts
export type GameCanvasProps<TResult extends GameOverResult = GameOverResult> = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void; // report 0 if the game has no lives concept
  onLevelChange: (level: number) => void;
  onGameOver: (result: TResult) => void;
};
export type GameCanvasHandle = { restart: () => void };
```

Wrapper pattern (`forwardRef<GameCanvasHandle, GameCanvasProps<XGameOverResult>>`):

- `engineRef = useRef<XEngine | null>(null)` holds the live engine instance.
- A `callbacksRef` mirrors the latest `onScoreChange`/etc. props via a `useEffect` on every render, so the engine (constructed once) never calls a stale closure.
- Keyboard/mouse listeners are added in a mount-only `useEffect(() => {...}, [])`. Handlers early-return when `document.activeElement?.tagName === "INPUT"` (so typing initials into the game-over modal doesn't also drive the game). The same effect's cleanup does `cancelAnimationFrame`, removes every listener, and nulls `engineRef.current`.
- A separate `useEffect(() => { engineRef.current?.setPaused(paused); }, [paused])` is a thin proxy — the engine's own `update()` early-returns while its internal `paused` flag is true. `GamePlayer` passes `paused={paused || over}` so the engine also freezes once game-over fires.
- `useImperativeHandle(ref, () => ({ restart: () => engineRef.current?.restart() }))` — restart never remounts the component, it re-runs the engine's own init routine.
- Render output is just `<canvas ref={canvasRef} width={W} height={H} />` (plus, only for a themed game, a wrapping `<div>` with its own controls, styled via the game's CSS Module).

---

## 3. Engine conventions

One exported class (`XEngine`) with a minimal public surface: `constructor(callbacks)`, `restart()`, `setPaused(paused)`, some form of `keyDown(code)`/`keyUp(code)` (or equivalent input methods), `update(dt)`, `draw(ctx)`. Internally it may use private helper classes per entity (bullets, enemies, particles...) if the source does — port the structure close to 1:1, don't redesign it; this is a **port**, not a rewrite.

The engine must never touch `document`/`window`/`localStorage` directly:

- `ctx` arrives only as a `draw(ctx)` parameter — never queried from the DOM by the engine itself.
- Keyboard/mouse state arrives via methods the React wrapper calls from its own listeners; the engine keeps its own internal key-state map.
- Callbacks (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) are injected at construction; the engine calls them, it never imports React.
- Canvas dimensions are module-level constants exported from `engine.ts` itself (e.g. `export const <ID>_WIDTH = 800`) — the single source of truth the wrapper's `<canvas width/height>` reads from.

Persistence (leaderboard, UI prefs) lives entirely outside the engine, in `leaderboard.ts`. The engine only produces a `GameOverResult`-shaped object passed to `onGameOver`.

---

## 4. Leaderboard client

```ts
// components/games/<id>/leaderboard.ts
import { createClient } from "@/lib/supabase/client";

const MAX_ENTRIES = 5;

export async function get<Id>Leaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("<id>_scores")
    .select("id, player_name, score, level /*, extra stat columns */")
    .order("score", { ascending: false })
    .limit(MAX_ENTRIES);
  if (error || !data) return []; // reads fail silently
  return data.map((row) => ({
    id: row.id,
    name: row.player_name,
    score: row.score,
    level: row.level,
    // ...extra stats, snake_case -> camelCase
  }));
}

export async function add<Id>Score(
  name: string,
  result: <Id>GameOverResult,
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  const { error } = await supabase.from("<id>_scores").insert({
    player_name: name,
    score: result.score,
    level: result.level,
    // ...extra stat columns
  });
  if (error) throw error; // writes DO throw
  return get<Id>Leaderboard();
}
```

The read/write asymmetry is deliberate: a failed read degrades to an empty leaderboard, a failed write surfaces as an inline error in `GamePlayer` without blocking "PLAY AGAIN"/"EXIT". Keep it for every new game.

If the game needs UI-preference persistence (a remembered player name, a theme/skin choice, a starting level) — that's plain `localStorage`, wrapped in try/catch, living in this same file (Tetris's `getTetrisTheme`/`setTetrisTheme`/`getTetrisSkin`/etc. are the precedent). Never put UI prefs in Supabase; never put scores in `localStorage`.

---

## 5. Supabase migration template

Reuses the existing `mirror_to_global_scores` function — **do not** recreate it, it already exists and is generic over `game_id` via its trigger argument.

```sql
create table "arcade-vault"."<id>_scores" (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  -- extra game-specific stat columns here, each `not null default 0` or similar
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

insert into "arcade-vault".games (id, title) values ('<id>', '<TITLE>');

create trigger <id>_mirror after insert on "arcade-vault"."<id>_scores"
  for each row execute function "arcade-vault".mirror_to_global_scores('<id>');

-- RLS: enable on the new table.
-- Policy: public SELECT.
-- Policy: public INSERT, with check (char_length(player_name) between 1 and 10 and score >= 0).
-- Add the table to the supabase_realtime publication.
```

**Non-negotiable**: the schema is `"arcade-vault"`, never `public` — a table created in `public` is invisible to `supabase-js`/PostgREST in this project (documented in `CLAUDE.md` and spec 06). Every identifier that references the schema name needs the double quotes, because of the hyphen in `arcade-vault`.

---

## 6. Platform wiring checklist

- `components/game-player.tsx`: add `isX = game.id === "<id>"`; fold it into `isPortedGame`; add the ternary branch mounting `<XCanvas ... />`; add a dedicated `xResult` state slice (its `GameOverResult` subtype has its own extra fields); add a branch in `handleForceEnd`; build the `leaderboard={{ entries, loading, fetchError, onSaveName }}` prop from `getXLeaderboard`/`addXScore`; `className={"crt-screen" + (isPortedGame ? " fit-canvas" : "")}` already works generically off `isPortedGame`, no per-game change needed there.
- `app/data/games.ts`: add a new entry (or edit one of the simulated ones, for an upgrade) — `{ id, title, short, long, cat, cover, color, best, plays }`. If `cat` is new, it must also be added to `CATS`.
- `app/games/[id]/page.tsx`: add `<id>: "<id>_scores"` to its `SCORE_TABLE`.
- `app/salon/page.tsx`: add `<id>: "<id>_scores"` to **its own** `SCORE_TABLE` — it's a separate map, not imported from the other file. Its tab appears automatically once the `games` row exists in Supabase (the migration step), no extra Salón-side code needed for that part.
- `lib/supabase/types.ts`: add `<Id>ScoreRow`.
- `components/games/shared/types.ts`: add `<Id>GameOverResult = GameOverResult & { /* extra stats */ }`.
- `app/globals.css`: the `.crt-screen canvas { max-width: 100%; height: auto; }` and `.fit-canvas` rules are already generic — no change needed unless this game needs a genuinely different layout.
- Binary assets (sprites, sound): copy the clean files (watch out for duplicated `assets/assets/`/`__MACOSX/` junk from zip extraction, as happened with Arkanoid) to `public/games/<id>/`.

---

## 7. CSS Modules for in-screen UI (only if the game has controls beyond the canvas)

Scope every theme variable to the module's own root class, never `:root`/`document.body`:

```css
.container {
  --bg: #0f0f17;
  --text: #e0e0e0;
  /* ...layout... */
}
.container.light {
  --bg: #f0f0f5;
  --text: #24243a;
  /* same variable names, light-theme values */
}
```

Toggle the modifier class (`.light`) on the component's own root element — never mutate `document.body` or redefine `:root`. This is exactly why Tetris needed its CSS rewritten during spec 05: the original reference redefined `--bg` in `:root` and toggled `body.light-theme`, which collided with `app/globals.css`.

---

## 8. Risks to carry into the spec

| Risk                                                                                                                                                                              | Mitigation                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No server-side auth on score inserts — a fake score can be posted directly against the public API, bypassing the UI entirely.                                                     | Accepted precedent from specs 05/06: same trust model the old localStorage leaderboards already had, just now shared between players. `check` constraints (`player_name` 1–10 chars, `score >= 0`) block obvious garbage only, not a plausible-looking fake score. |
| Realtime subscriptions silently receive nothing if the channel filter's `schema` isn't `"arcade-vault"`, or if the `SELECT` policy doesn't allow the `anon` role to see the rows. | Verify explicitly during implementation: open the Hall of Fame in two tabs, save a score in one, confirm it appears live in the other without a reload.                                                                                                            |
| Fixed-pixel canvas isn't responsive beyond "doesn't overflow its container" on narrow viewports.                                                                                  | Accepted precedent — redesigning the canvas to be responsive is out of scope; only the overflow guard already in `app/globals.css` is required.                                                                                                                    |
