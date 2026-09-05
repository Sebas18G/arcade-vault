-- SPEC 12 — Autenticación real con Supabase
-- 1) Tabla de perfiles: fuente de verdad del alias del jugador.
create table if not exists "arcade-vault"."profiles" (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 10),
  created_at timestamptz not null default now()
);

alter table "arcade-vault"."profiles" enable row level security;

-- SELECT público: el Salón de la Fama y el HUD muestran alias de otros jugadores.
drop policy if exists "profiles_select_public" on "arcade-vault"."profiles";
create policy "profiles_select_public" on "arcade-vault"."profiles"
  for select using (true);

-- Solo se puede crear/editar la fila propia.
drop policy if exists "profiles_insert_own" on "arcade-vault"."profiles";
create policy "profiles_insert_own" on "arcade-vault"."profiles"
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on "arcade-vault"."profiles";
create policy "profiles_update_own" on "arcade-vault"."profiles"
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 2) Endurecer el INSERT de las 5 tablas de scores: solo usuarios autenticados
--    y solo a nombre propio (user_id = auth.uid()).
drop policy if exists "asteroids_scores_insert_public" on "arcade-vault"."asteroids_scores";
create policy "asteroids_scores_insert_own" on "arcade-vault"."asteroids_scores"
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

drop policy if exists "tetris_scores_insert_public" on "arcade-vault"."tetris_scores";
create policy "tetris_scores_insert_own" on "arcade-vault"."tetris_scores"
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

drop policy if exists "arkanoid_scores_insert_public" on "arcade-vault"."arkanoid_scores";
create policy "arkanoid_scores_insert_own" on "arcade-vault"."arkanoid_scores"
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

drop policy if exists "snake_scores_insert_public" on "arcade-vault"."snake_scores";
create policy "snake_scores_insert_own" on "arcade-vault"."snake_scores"
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

drop policy if exists "frogger_scores_insert_public" on "arcade-vault"."frogger_scores";
create policy "frogger_scores_insert_own" on "arcade-vault"."frogger_scores"
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );
