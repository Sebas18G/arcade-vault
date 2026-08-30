---
name: add-game
description: Generates a ready-to-approve spec for porting or creating a new arcade minigame (React/canvas) with its own Supabase leaderboard, following the pattern already established in specs 05 and 06 (Asteroids/Tetris/Arkanoid). Use when adding a new game to the catalog, whether it comes from references/started_games/ or not.
disable-model-invocation: true
argument-hint: "<folder in references/started_games/ or short description of the new game>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(wc:*), Bash(grep:*)
---

# /add-game — Spec generator for arcade games with their own leaderboard

## Session context

Today's date (use this for the spec header, never guess it):
!`date +%F`

Specs that already exist:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Reference game folders available to port:
!`ls references/started_games/ 2>/dev/null || echo "references/started_games/ does not exist"`

Games already ported to React (real canvas engine + own leaderboard):
!`ls components/games/ 2>/dev/null || echo "components/games/ does not exist yet"`

Catalog ids already in use (app/data/games.ts):
!`grep -n "id:" app/data/games.ts 2>/dev/null || echo "app/data/games.ts not found"`

---

This skill helps you produce a ready-to-approve spec for adding a new arcade minigame to Arcade Vault — porting (or building from scratch) a canvas game engine as a self-contained React component, plus its own Supabase-backed leaderboard, fully wired into the platform (catalog, `GamePlayer`, game detail page, Hall of Fame). **You don't write code here.** Same discipline as `/spec`: your job is to clarify what the user wants, ask when something is underspecified, and produce the spec file.

## Philosophy

Specs 05 and 06 already solved this exact problem twice (Asteroids/Tetris/Arkanoid ported, then all three wired to a real Supabase leaderboard) and paid down the cost of discovering the pattern. Re-deriving it from scratch for every new game risks subtle divergences — forgetting the `schema: "arcade-vault"` on a Realtime filter, mixing up the "reads fail silently / writes throw" convention, or accidentally touching `:root`/`document.body` in a themed game's CSS. `recipe.md` (in this skill's own directory) captures that pattern as a checklist and set of templates. Read it before drafting the Data model / Implementation plan sections.

This skill is a specialization of `/spec` for one recurring feature shape, not a replacement for it. **It must produce a spec that looks and behaves exactly like a spec written by `/spec`** — same header labels, same section order, same Phase 4 saving rules. That's why Phase 1 below starts by reading `/spec`'s own skill files live, every time, rather than working off a memorized copy of their format.

## Command flow

Follow the phases in order. Reuse `/spec`'s own rules on question density, tone, and when to write the whole spec at once vs. section-by-section — this skill only adds domain-specific content, it does not redefine that process.

Your replies must be in the same language the existing specs are written in for this repo (check specs 05/06 in Phase 1 — as of this writing they are in Spanish, with English section labels), unless the user's invocation is clearly in a different language.

### Phase 1 — Read the spec format, then the game's source

1. **Read `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` in full, on every invocation, before drafting anything.** They are the live, authoritative reference for this repo's spec format: header labels (`Status`/`Depends on`/`Date`/`Objective`), section order, the "write it all at once vs. section-by-section" rule, and the Phase 4 saving mechanics (numbering, slug, `Draft` state, `.spec-config.yml`). `recipe.md` next to this file complements that format with the game-porting-specific technical content — it does **not** replace `spec/template.md` as the source of truth for the document's general shape. If `spec`'s files change in the future, this skill must follow the new version, not a frozen copy made at authoring time.
2. Read the project-memory file, same as `/spec` does (`CLAUDE.md` first, falling back the same way `/spec` does if it's missing).
3. Read specs 05 and 06 in full — they are the authoritative precedent for every technical decision this skill pre-fills below (Supabase schema, leaderboard error-handling asymmetry, CSS scoping, keyboard listener lifecycle, etc.).
4. From `$ARGUMENTS` and the session context above, determine the game's source:
   - **A folder in `references/started_games/` not yet present in `components/games/`** → this is a port. Read its main JS/HTML file(s) to understand mechanics, controls, whether it has a "lives" concept, and what stats it tracks.
   - **A folder already present in `components/games/`** → the user is asking to re-spec an already-ported game. Confirm this is intentional before continuing; it's an edge case, not the common path.
   - **No reference folder** (a brand-new game with no vanilla-JS source) → ask the user to describe the mechanics, controls, and rules from scratch. Same hard rule as porting applies here: never invent gameplay the user hasn't confirmed.
5. Check whether the proposed `id` already exists in `app/data/games.ts` (session context above):
   - If it matches one of the currently-simulated catalog entries (e.g. `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel` as of specs 05/06 — re-check the live listing, this set can change): this is an **upgrade-to-real-engine** case — the catalog entry already exists, don't recreate it; the spec's Scope should say the simulated player is being replaced by the real canvas for that id.
   - If it's a new id: the catalog entry is created fresh as part of this spec.

### Phase 2 — Clarify through questions

Use `AskUserQuestion` in blocks of 3–5, exactly as `/spec` does. On top of `/spec`'s generic categories (scope, data, integration, persistence, UX/states, risks, closed decisions), always cover these game-specific ones:

- **Identity**: `id` (route slug), `title`, `cat` (does it match an existing category in `CATS` from `app/data/games.ts`, or is it new — meaning `CATS` also needs an entry?), `color`, `short`/`long` copy, `cover-*` class.
- **Mechanics**: does it have a "lives" concept? (if not, it always reports 0, like Tetris). Does it have levels? What extra stats — beyond `score`/`level` — feed its own leaderboard (lines, combo, enemies destroyed, etc.)? These become extra table columns and extra `XGameOverResult` fields.
- **Controls**: keyboard and/or mouse, exact keys — preserved exactly as in the source, no new touch controls (same precedent as spec 05).
- **Canvas**: fixed pixel dimensions.
- **In-screen UI beyond the canvas** (like Tetris's theme/skin selector): yes/no — if yes, it needs a CSS Module scoped to its own container, never `:root`/`body`.
- **Top-N counts**: confirm the precedent (5 in the game-over modal, 12 on the detail page and in the Hall of Fame) unless the user wants a different number.
- If porting from a reference: explicitly restate spec 05's hard rule ("whatever the game already does is preserved as-is, nothing new gets designed in") and get the user's explicit confirmation it applies here too.

### Phase 3 — Write the spec

Same rule as `/spec` Phase 3: if you can already answer which files change, what the first/last executable step is, and how to verify completion — write the whole spec at once and move to Phase 4. Otherwise, go section by section with confirmation, exactly as `/spec` does.

Section order matches `spec/template.md` (already read in Phase 1); fill each with content from `recipe.md`:

1. **Header** — same English labels as specs 01–06 (`Status`, `Depends on`, `Date`, `Objective`), content in the language established in Phase 1. `Depends on` typically includes SPEC 01 and, for an upgrade case, the spec that introduced the simulated entry being replaced.
2. **Why this spec exists** — always include; there's always a concrete trigger (new catalog game, or upgrading a simulated one).
3. **Scope** — In/Out, from `recipe.md` §6 (files under `components/games/<id>/`, the Supabase migration, wiring in `GamePlayer`/catalog/detail page/Hall of Fame, CSS). Out explicitly: new touch controls, mechanics absent from the source, touching other games, real auth.
4. **Data model** — the SQL template from `recipe.md` §5 (table `<id>_scores`, check constraints, reusing the `mirror_to_global_scores('<id>')` trigger, RLS, Realtime, `games` seed row) filled with this game's real columns; TS types (`<Id>ScoreRow` in `lib/supabase/types.ts`, `<Id>GameOverResult` in `shared/types.ts`).
5. **Implementation plan** — numbered steps combining the specs-05+06 sequence: port `engine.ts` + `<id>-canvas.tsx` + `leaderboard.ts`; apply the SQL migration; add/update the catalog entry; wire `GamePlayer` (new `isX` flag, ternary branch, own result state, `handleForceEnd` branch, `fit-canvas` className); add the game to `SCORE_TABLE` in **both** `app/games/[id]/page.tsx` and `app/salon/page.tsx`; manual verification + `npm run lint`/`npm run build`.
6. **Acceptance criteria** — boolean checklist adapted from specs 05/06 (engine playable, HUD live, pause works, modal shows its own top-N and lets the user save, "PLAY AGAIN"/"EXIT" stay clean, new tab in the Hall of Fame, detail page shows real top-12, canvas doesn't overflow, lint/build clean).
7. **Decisions** — pre-fill with the specs-05/06 precedent, explicitly marked as "follows spec 05/06 precedent unless overridden": one physical table per game + `global_scores` populated via trigger; `user_id` stays null; leaderboard reads fail silently to `[]`, writes throw; no `addScore()`/`av_scores` for real games; CSS Modules scoped to a container, never `:root`/`body`; keyboard listeners added/removed in a `useEffect` with an `INPUT`-focus guard; no server-side anti-cheat; Supabase schema is `"arcade-vault"`, never `public`.
8. **Risks** — reuse the relevant risks from `recipe.md` §8 (no-auth trust model on public inserts, Realtime needs `schema: "arcade-vault"` in its filter plus public `SELECT` policies, fixed-size canvas isn't responsive).
9. **What is not in this spec** — final reinforcement.

### Phase 4 — Save the spec

Identical mechanics to `/spec` Phase 4 (already re-read in Phase 1 — follow it exactly, don't improvise a different procedure): next sequential number from the `specs/` listing, kebab-case slug from the objective, date from session context, write `specs/NN-slug.md` directly without asking permission, state `Draft` (or the equivalent word already used by this repo's specs — check Phase 1's reading), verify any spec referenced in `Depends on` actually exists, seed `specs/.spec-config.yml` if missing (never touch it if it already exists), confirm the path to the user and remind them: run `/spec-impl NN-slug` once approved. **Stop there** — do not propose implementing.

## Hard rules

- **Never write code.** Only the spec's `.md` file, exactly like `/spec`.
- **Never propose implementing after saving.** The user runs `/spec-impl` when ready.
- **Never invent mechanics or rules** the user hasn't confirmed, or that aren't present in the ported source.
- **Never assume a convention different from `recipe.md`** without the user explicitly overriding it in Phase 2.
- **Remember `SCORE_TABLE` is duplicated** in `app/games/[id]/page.tsx` and `app/salon/page.tsx` (not shared/imported) — the implementation plan must list both, not just one.
- **Always re-read `spec/SKILL.md` and `spec/template.md` at the start of every invocation** (Phase 1, step 1) rather than relying on a cached understanding of their format from a previous session or from this file's own text.

## Arguments

`$ARGUMENTS` is either a folder name under `references/started_games/` or a short description of a brand-new game idea — Phase 1 determines which. If invoked with no arguments, ask which of the two applies.
