---
name: game-jam
description: Given a theme, picks one arcade game that embodies it and writes three complete, ready-to-review specs for it into specs/games-jam/ — engine, Supabase leaderboard, and themed polish — without asking the user anything. Use for a themed game jam; use /add-game instead when the game is already decided and a single spec is enough.
disable-model-invocation: true
argument-hint: "<theme for the jam, e.g. 'neon halloween' or 'deep space'>"
allowed-tools: Read, Glob, Grep, Write, Edit, WebSearch, WebFetch, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(grep:*), Bash(wc:*)
---

# /game-jam — Themed jam: one game, three specs, zero questions

## Session context

Today's date (use this for every spec header, never guess it):
!`date +%F`

Specs that already exist (top level):
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist yet"`

Specs already written by previous jams:
!`ls specs/games-jam/ 2>/dev/null || echo "specs/games-jam/ does not exist yet"`

Games already ported to React (real canvas engine):
!`ls components/games/ 2>/dev/null || echo "components/games/ does not exist yet"`

Catalog ids already in use (app/data/games.ts):
!`grep -n "id:" app/data/games.ts 2>/dev/null || echo "app/data/games.ts not found"`

Vanilla-JS sources available to port:
!`ls references/started_games/ 2>/dev/null || echo "references/started_games/ does not exist"`

---

This skill takes a **theme** and turns it into a finished, ready-to-review plan: it picks **one** arcade minigame that embodies that theme, and writes **three complete spec files** into `specs/games-jam/` — the engine, its Supabase leaderboard, and the themed layer that makes the game belong to the jam. **You don't write code here, and you don't ask the user anything.**

## Philosophy

This skill exists because `/spec` and `/add-game` are conversational by design: they stop and ask before writing. That is the right default when a human is sitting there to answer. A jam is the opposite situation — the user hands over a theme and expects to come back to three finished documents.

So the questions do not disappear, they change destination: **every decision you would have asked about, you make yourself and record in `## Decisions`** with the literal prefix `**Decisión autónoma del skill:**`. A decision written down can be reverted by editing the spec; a question asked mid-jam just blocks the run.

What this skill does **not** reinvent is the technical pattern. Specs 05, 06, 07 and 08 already established how an arcade game lives in this codebase, and `.claude/skills/add-game/recipe.md` captured it as a checklist. Read that file — do not re-derive it, and do not paraphrase it from memory.

## Command flow

Follow the phases in order. Your replies and the spec prose must be **in Spanish**, matching the existing specs (section headers and metadata labels stay in English — see Phase 4).

### Phase 1 — Read the format and the repo state (mandatory, every invocation)

Read these in full, live, on every run. Never work from a cached memory of their contents or from this file's summary of them:

1. `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` — the authoritative format of a spec in this repo: header labels, section order, valid states, saving mechanics.
2. `.claude/skills/add-game/recipe.md` — the technical pattern every arcade game must follow (file layout, canvas contract, engine conventions, leaderboard client, SQL migration template, platform wiring checklist, CSS Modules, risks).
3. `CLAUDE.md` — project memory.
4. `specs/05-juegos-arcade-reales.md`, `specs/06-leaderboards-supabase-juegos-reales.md`, `specs/07-mover-controles-skin-tema-tetris-hud.md` and `specs/08-snake-supabase.md` — the real precedent this skill's three-way split mirrors. Spec 08 is your formatting model; **spec 07 is the repo's one deviation (Spanish labels, no blockquote) — do not imitate it.**
5. `references/game-suggestion-todo.md` — the log of everything already suggested, accepted, discarded or implemented.
6. `references/implemented-games.md` — the catalog table (careful: it lists all 8 catalog entries, including the ones still simulated).

If `$ARGUMENTS` is empty, there is no theme and nothing to decide. Say so in one line and stop — that is the only situation in which this skill stops early.

### Phase 2 — Pick the game from the theme (no questions)

Score candidates against the fit criteria in `.claude/agents/game-planner.md` §Fase 2 — read that table rather than trusting this summary of it: deterministic 2D canvas, engine decoupled from the DOM, accumulable numeric score, keyboard/mouse controls, asset weight, retro/neon aesthetic fit, category, upgrade-vs-new-entry, extra stats, implementation size, VERSUS risk. Add one criterion of your own:

- **Fuerza temática (0–10)** — how much the game actually embodies the theme received in `$ARGUMENTS`. A game that touches the theme only through recoloring scores low; one whose core mechanic _is_ the theme scores high.

Evaluate 3 to 5 candidates, then commit to one. Hard rules for the choice:

- **Excluded outright:** any game with a folder in `components/games/`, and any game logged as `Descartado` or `Implementado` in `references/game-suggestion-todo.md`.
- **Check the id against `app/data/games.ts`.** If the id matches one of the still-simulated catalog entries, this is an **upgrade** case: the catalog entry already exists, the specs must say the simulated player is being replaced, and no new `GAMES` entry is created. If the id is free, the catalog entry is created fresh in spec 1.
- Use `WebSearch`/`WebFetch` to confirm the original's real mechanics, scoring rules and controls. **Never invent mechanics.** Anything you could not confirm goes into the spec under an explicit `**Pendiente de confirmar:**` bullet in `## Decisions`, never stated as fact.
- Ambiguity is resolved by you, not by the user, and recorded as `**Decisión autónoma del skill:**`.

### Phase 3 — Split the game into three specs

The split is fixed. It mirrors the real 05 → 06 → 07 sequence, so each spec leaves the system functional and commitable on its own:

| #   | File                           | What it covers                                                                                                                                                                                                                                                                                                                                                                              | `Depends on`                 |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | `NN-<id>-motor.md`             | `components/games/<id>/engine.ts` + `<id>-canvas.tsx`; the catalog entry in `app/data/games.ts` (new, or the id/title update in the upgrade case); wiring in `components/game-player.tsx` (`isX` flag, `isPortedGame`, the ternary branch, its own result state, `handleForceEnd` branch). Playable end to end, no persistence yet.                                                         | SPEC 01, SPEC 05             |
| 2   | `NN+1-<id>-leaderboard.md`     | `components/games/<id>/leaderboard.ts`; the SQL migration (table `"arcade-vault"."<id>_scores"`, seed row in `games`, `mirror_to_global_scores` trigger, RLS, `supabase_realtime` publication); `<Id>ScoreRow` in `lib/supabase/types.ts` and `<Id>GameOverResult` in `components/games/shared/types.ts`; `SCORE_TABLE` in **both** `app/games/[id]/page.tsx` **and** `app/salon/page.tsx`. | SPEC 04, SPEC 06, and spec 1 |
| 3   | `NN+2-<id>-<slug-temático>.md` | The layer that makes the game belong to the jam: themed palette/skins, theme-specific extra stats as new leaderboard columns, in-HUD controls or selectors (spec 07 precedent), themed modes or levels.                                                                                                                                                                                     | specs 1 and 2                |

Two rules on the split:

- **Spec 3 must carry real technical content derived from the theme.** If the game you picked cannot sustain a third spec that is more than filler, go back to Phase 2 and pick a different game. Never pad a spec to reach three.
- Each spec's `## Scope` must push the next spec's work into `**Out of scope (for future specs):**` explicitly, naming it (e.g. spec 1 states that the leaderboard lands in the following spec). That is what keeps the three from bleeding into each other during `/spec-impl`.

### Phase 4 — Write the three files

Format is copied from `specs/08-snake-supabase.md` — metadata labels and section headers in **English**, prose in **Spanish**:

```markdown
# SPEC NN — Título corto y descriptivo

> **Status:** Draft
> **Depends on:** SPEC 01, SPEC 05
> **Date:** AAAA-MM-DD
> **Objective:** Una sola frase.
```

Sections, in this exact order:

1. `## Why this spec exists` — always include one; the jam theme is the trigger and it belongs on the record.
2. `## Scope` — `**In:**` and `**Out of scope (for future specs):**`, both mandatory.
3. `## Data model` — real code blocks tagged with the file path in a comment (`-- migration`, `// lib/supabase/types.ts`, `// components/games/<id>/engine.ts`). If a spec introduces no new data, say so explicitly in prose.
4. `## Implementation plan` — numbered steps, each naming concrete files and closing with its own `Verificación:` sentence.
5. `## Acceptance criteria` — boolean checklist, every item written as `- [ ]` (never pre-checked).
6. `## Decisions` — `**Sí:**` / `**No:**` bullets with a reason each, plus the `**Decisión autónoma del skill:**` and `**Pendiente de confirmar:**` bullets from Phase 2.
7. `## Risks` — `| Risk | Mitigation |` table.
8. `## What is **not** in this spec` — the `**not**` is bold inside the header, literally. Closes with the literal line: `Cada uno de estos, si se necesita, va en su propia spec futura.`

Saving mechanics:

- **Numbering is global and continuous.** Take the highest `NN` across **both** `specs/*.md` and `specs/games-jam/*.md` (session context above), then use `NN+1`, `NN+2`, `NN+3`, zero-padded to two digits.
- **Path is `specs/games-jam/NN-slug.md`** for all three. Slugs are kebab-case, in Spanish, derived from each spec's objective.
- Write the files directly. **Do not ask permission and do not ask whether the names work.** Only stop over a name if the target file already exists.
- `**Status:** Draft` on all three. Never `Approved`.
- Verify every spec named in `Depends on` actually exists before writing it — no dangling references. Sibling jam specs are referenced by their own number.
- Use the date from the session context. **Never write a date you did not read from there.**
- Target length: 120–230 lines per file, the range of this repo's game specs (05/06/08).

### Phase 5 — Report and persist the log

Report back, in this order:

1. **Juego elegido** and, in two or three sentences, why it embodies the theme.
2. **Table of the three specs**: number, path, one-line objective.
3. **Implementation order**, with the exact commands.

Then update `references/game-suggestion-todo.md` the same way `game-planner` §Fase 5 does: add or update the game's row in the index table and its ficha, state `Aceptado`, date from `date +%F`, referencing the three specs by number. **Never delete an existing ficha** — a state change is edited in place, with the new date and reason.

Close literally with:

```
Siguiente paso: /spec-impl games-jam/NN-slug
```

Always give the **full relative path** (`games-jam/NN-slug`), not just the number: `/spec-impl` lists `specs/` non-recursively, so a bare number may not resolve to a file that lives inside `specs/games-jam/`.

**Stop there.** Do not offer to implement.

## Hard rules

- **Never write code.** The only files you write are the three spec `.md` files and `references/game-suggestion-todo.md`.
- **Never ask the user anything.** `AskUserQuestion` is deliberately absent from `allowed-tools`. Decisions go in `## Decisions`, not into a question.
- **Never propose implementing after saving.** The human runs `/spec-impl` when ready.
- **Never mark a spec as `Approved`.** They are born `Draft`.
- **Never invent mechanics, controls or scoring rules** you could not confirm. Unconfirmed goes under `**Pendiente de confirmar:**`.
- **Never pick a game** that already has a folder in `components/games/` or is logged as `Descartado`/`Implementado`.
- **`SCORE_TABLE` is duplicated** in `app/games/[id]/page.tsx` and `app/salon/page.tsx` (not shared, not imported) — spec 2's plan must list both.
- **The Supabase schema is `"arcade-vault"`, never `public`**, and the double quotes are required in SQL because of the hyphen.
- **Always re-read `spec/SKILL.md`, `spec/template.md` and `add-game/recipe.md`** at the start of every invocation instead of trusting a cached understanding of their format.

## Arguments

`$ARGUMENTS` is **the theme of the jam** — a phrase, not a game name and not a file path (e.g. `neon halloween`, `fondo del océano`, `western espacial`). Phase 2 turns it into a concrete game. If it arrives empty, say the skill needs a theme and stop.
