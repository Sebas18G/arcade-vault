-- =============================================================================
-- SPEC 15 — Leaderboard propio de Invasores
-- =============================================================================
--
-- Script EXACTO aplicado al proyecto de DESARROLLO (okqmxxqnmcqpqzusnype) el
-- 2026-09-05 con `apply_migration` del MCP de Supabase, bajo el nombre de
-- migración `invasores_leaderboard` (versión 20260906020424).
--
-- Se guarda versionado porque los dos proyectos de Supabase NO se sincronizan
-- solos: no hay CLI ni supabase/migrations/. Para PRODUCCIÓN no se corre este
-- archivo, se corre supabase/prod/bootstrap.sql (que ya lo incluye) desde el
-- dashboard, siguiendo references/migracion-produccion.md.
--
-- Reusa las funciones genéricas ya existentes enforce_player_name() y
-- mirror_to_global_scores(): no crea ninguna función nueva.
--
-- El schema se llama con guion, así que SIEMPRE va entre comillas dobles.
-- =============================================================================

create table "arcade-vault"."invasores_scores" (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  aliens_killed integer not null default 0,
  ufos_hit integer not null default 0,
  shots_fired integer not null default 0,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Hace aparecer el tab en /salon, que construye sus tabs desde esta tabla.
insert into "arcade-vault".games (id, title) values ('invasores', 'INVASORES')
  on conflict (id) do nothing;

-- BEFORE: ancla player_name al alias del perfil. AFTER: espeja a global_scores.
-- El orden importa: así global_scores recibe el alias ya normalizado (spec 13).
create trigger invasores_enforce_player_name
  before insert on "arcade-vault"."invasores_scores"
  for each row execute function "arcade-vault".enforce_player_name();

create trigger invasores_mirror
  after insert on "arcade-vault"."invasores_scores"
  for each row execute function "arcade-vault".mirror_to_global_scores('invasores');

alter table "arcade-vault"."invasores_scores" enable row level security;

create policy invasores_scores_select_public on "arcade-vault"."invasores_scores"
  for select to anon, authenticated using (true);

create policy invasores_scores_insert_own on "arcade-vault"."invasores_scores"
  for insert to authenticated with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

-- Sin GRANT, PostgREST rechaza antes de evaluar RLS.
grant select, insert on "arcade-vault"."invasores_scores" to anon, authenticated;

alter publication supabase_realtime add table "arcade-vault"."invasores_scores";
