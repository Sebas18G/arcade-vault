-- =============================================================================
-- Arcade Vault — Bootstrap del proyecto de PRODUCCIÓN de Supabase
-- =============================================================================
--
-- Reproduce en una instancia limpia todo el esquema que en desarrollo se fue
-- construyendo con 15 migraciones incrementales (specs 04, 06, 08, 12, 13 y las
-- de games-jam). Es la consolidación de ese historial en un solo archivo.
--
-- CÓMO USARLO
--   1. ANTES de correr esto: en el dashboard de producción, Settings -> API ->
--      "Exposed schemas", agregar `arcade-vault`. Sin ese paso PostgREST
--      responde 404 a todas las consultas aunque las tablas existan, porque
--      lib/supabase/client.ts y server.ts usan db: { schema: "arcade-vault" }.
--   2. Pegar este archivo completo en el SQL Editor y ejecutarlo.
--   3. Ejecutar `verify.sql` y comparar contra los valores esperados.
--   4. Seguir con `references/migracion-produccion.md` (configuración de Auth).
--
-- Es idempotente: se puede volver a correr sobre una base ya migrada sin error.
-- Corre dentro de una transacción: si algo falla, no queda nada a medias.
--
-- NO incluye datos de desarrollo (usuarios, perfiles ni puntajes de prueba).
-- Lo único que siembra es el catálogo `games`, que la app necesita para
-- construir los tabs del Salón de la Fama.
--
-- El schema se llama con guion, así que SIEMPRE va entre comillas dobles.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Schema
-- -----------------------------------------------------------------------------

create schema if not exists "arcade-vault";

grant usage on schema "arcade-vault" to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Tablas
-- -----------------------------------------------------------------------------

-- Catálogo mínimo de los juegos con motor real y leaderboard propio. No duplica
-- app/data/games.ts: existe para que global_scores tenga a qué apuntar y para
-- que /salon construya sus tabs desde la base y no desde la constante del front.
create table if not exists "arcade-vault".games (
  id text primary key,
  title text not null,
  created_at timestamptz not null default now()
);

-- Alias del jugador. Fuente única de player_name en los leaderboards: el
-- trigger enforce_player_name lo copia desde aquí en cada INSERT de puntaje.
create table if not exists "arcade-vault".profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 10),
  created_at timestamptz not null default now()
);

-- Una tabla de puntajes por juego. Comparten las columnas base y cada una suma
-- las métricas propias de su motor.
create table if not exists "arcade-vault".asteroids_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  asteroids_destroyed integer not null default 0,
  best_combo integer not null default 0,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists "arcade-vault".tetris_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  lines integer not null default 0,
  best_combo integer not null default 0,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists "arcade-vault".arkanoid_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- En desarrollo esta tabla nació como `serpentina_scores` y se renombró, así que
-- allá sus constraints siguen llamándose serpentina_*. Aquí nacen con el nombre
-- definitivo. Es la única divergencia de nombres con dev, y es cosmética.
create table if not exists "arcade-vault".snake_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists "arcade-vault".frogger_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  frogs_home integer not null default 0,
  time_bonus integer not null default 0,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Espejo cross-juego. Nadie inserta aquí desde el cliente: la pueblan los
-- triggers AFTER INSERT de las 5 tablas de arriba.
create table if not exists "arcade-vault".global_scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references "arcade-vault".games(id),
  player_name text not null,
  score integer not null,
  level integer not null default 1,
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. Row Level Security
-- -----------------------------------------------------------------------------

alter table "arcade-vault".games            enable row level security;
alter table "arcade-vault".profiles         enable row level security;
alter table "arcade-vault".asteroids_scores enable row level security;
alter table "arcade-vault".tetris_scores    enable row level security;
alter table "arcade-vault".arkanoid_scores  enable row level security;
alter table "arcade-vault".snake_scores     enable row level security;
alter table "arcade-vault".frogger_scores   enable row level security;
alter table "arcade-vault".global_scores    enable row level security;

-- -----------------------------------------------------------------------------
-- 4. Policies
--
-- Lectura pública en todo (los leaderboards y el detalle de juego se ven sin
-- sesión). Escritura solo autenticada y solo a nombre propio: el user_id del
-- INSERT tiene que ser el del token. player_name además lo pisa un trigger,
-- así que lo que mande el cliente en ese campo da igual (spec 13).
-- -----------------------------------------------------------------------------

drop policy if exists games_select_public on "arcade-vault".games;
create policy games_select_public on "arcade-vault".games
  for select to anon, authenticated using (true);

drop policy if exists profiles_select_public on "arcade-vault".profiles;
create policy profiles_select_public on "arcade-vault".profiles
  for select using (true);

drop policy if exists profiles_insert_own on "arcade-vault".profiles;
create policy profiles_insert_own on "arcade-vault".profiles
  for insert to authenticated with check (id = auth.uid());

-- El UPDATE queda abierto para una futura pantalla de cuenta, pero el trigger
-- profiles_freeze_username impide que se use para cambiar el alias.
drop policy if exists profiles_update_own on "arcade-vault".profiles;
create policy profiles_update_own on "arcade-vault".profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists asteroids_scores_select_public on "arcade-vault".asteroids_scores;
create policy asteroids_scores_select_public on "arcade-vault".asteroids_scores
  for select to anon, authenticated using (true);

drop policy if exists asteroids_scores_insert_own on "arcade-vault".asteroids_scores;
create policy asteroids_scores_insert_own on "arcade-vault".asteroids_scores
  for insert to authenticated with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

drop policy if exists tetris_scores_select_public on "arcade-vault".tetris_scores;
create policy tetris_scores_select_public on "arcade-vault".tetris_scores
  for select to anon, authenticated using (true);

drop policy if exists tetris_scores_insert_own on "arcade-vault".tetris_scores;
create policy tetris_scores_insert_own on "arcade-vault".tetris_scores
  for insert to authenticated with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

drop policy if exists arkanoid_scores_select_public on "arcade-vault".arkanoid_scores;
create policy arkanoid_scores_select_public on "arcade-vault".arkanoid_scores
  for select to anon, authenticated using (true);

drop policy if exists arkanoid_scores_insert_own on "arcade-vault".arkanoid_scores;
create policy arkanoid_scores_insert_own on "arcade-vault".arkanoid_scores
  for insert to authenticated with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

drop policy if exists snake_scores_select_public on "arcade-vault".snake_scores;
create policy snake_scores_select_public on "arcade-vault".snake_scores
  for select to anon, authenticated using (true);

drop policy if exists snake_scores_insert_own on "arcade-vault".snake_scores;
create policy snake_scores_insert_own on "arcade-vault".snake_scores
  for insert to authenticated with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

drop policy if exists frogger_scores_select_public on "arcade-vault".frogger_scores;
create policy frogger_scores_select_public on "arcade-vault".frogger_scores
  for select to anon, authenticated using (true);

drop policy if exists frogger_scores_insert_own on "arcade-vault".frogger_scores;
create policy frogger_scores_insert_own on "arcade-vault".frogger_scores
  for insert to authenticated with check (
    user_id = auth.uid()
    and char_length(player_name) between 1 and 10
    and score >= 0
  );

-- global_scores solo se lee: no lleva policy de INSERT porque la escribe un
-- trigger SECURITY DEFINER, que no pasa por RLS.
drop policy if exists global_scores_select_public on "arcade-vault".global_scores;
create policy global_scores_select_public on "arcade-vault".global_scores
  for select to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- 5. Funciones
--
-- Las tres nacen con `set search_path = ''` y sin EXECUTE para anon/authenticated:
-- son funciones de trigger, nadie debería poder llamarlas como RPC (spec 13).
-- -----------------------------------------------------------------------------

-- Ancla player_name al alias del perfil de quien inserta. El valor que mande el
-- cliente se descarta, así que no se puede firmar un puntaje con el alias ajeno.
create or replace function "arcade-vault".enforce_player_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  select username into new.player_name
  from "arcade-vault".profiles
  where id = auth.uid();

  if new.player_name is null then
    raise exception 'No existe un perfil para el usuario actual';
  end if;

  return new;
end;
$function$;

-- Congela el alias: /auth/alias promete que no se puede cambiar después.
create or replace function "arcade-vault".freeze_username()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.username is distinct from old.username then
    raise exception 'El alias no se puede cambiar';
  end if;
  return new;
end;
$function$;

-- Copia cada puntaje nuevo a global_scores. El game_id llega como argumento del
-- trigger (TG_ARGV[0]), así que una sola función sirve a las 5 tablas.
create or replace function "arcade-vault".mirror_to_global_scores()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into "arcade-vault".global_scores (game_id, player_name, score, level, user_id, created_at)
  values (TG_ARGV[0], new.player_name, new.score, new.level, new.user_id, new.created_at);
  return new;
end;
$function$;

-- Hay que revocar de PUBLIC, no solo de anon/authenticated: Postgres concede
-- EXECUTE a PUBLIC en toda función nueva, y esos dos roles lo heredan de ahí.
-- Revocarles a ellos directamente no quita nada y las deja invocables como RPC
-- (comprobado: el ACL queda en `{=X/postgres,...}` en vez de `{postgres=X/postgres}`).
revoke execute on function "arcade-vault".enforce_player_name()     from public, anon, authenticated;
revoke execute on function "arcade-vault".freeze_username()         from public, anon, authenticated;
revoke execute on function "arcade-vault".mirror_to_global_scores() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Triggers
--
-- El de player_name es BEFORE y el de espejado AFTER, en ese orden a propósito:
-- así global_scores recibe el alias ya normalizado y no el que mandó el cliente.
-- -----------------------------------------------------------------------------

drop trigger if exists asteroids_enforce_player_name on "arcade-vault".asteroids_scores;
create trigger asteroids_enforce_player_name
  before insert on "arcade-vault".asteroids_scores
  for each row execute function "arcade-vault".enforce_player_name();

drop trigger if exists asteroids_mirror on "arcade-vault".asteroids_scores;
create trigger asteroids_mirror
  after insert on "arcade-vault".asteroids_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('asteroids');

drop trigger if exists tetris_enforce_player_name on "arcade-vault".tetris_scores;
create trigger tetris_enforce_player_name
  before insert on "arcade-vault".tetris_scores
  for each row execute function "arcade-vault".enforce_player_name();

drop trigger if exists tetris_mirror on "arcade-vault".tetris_scores;
create trigger tetris_mirror
  after insert on "arcade-vault".tetris_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('tetris');

drop trigger if exists arkanoid_enforce_player_name on "arcade-vault".arkanoid_scores;
create trigger arkanoid_enforce_player_name
  before insert on "arcade-vault".arkanoid_scores
  for each row execute function "arcade-vault".enforce_player_name();

drop trigger if exists arkanoid_mirror on "arcade-vault".arkanoid_scores;
create trigger arkanoid_mirror
  after insert on "arcade-vault".arkanoid_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('arkanoid');

drop trigger if exists snake_enforce_player_name on "arcade-vault".snake_scores;
create trigger snake_enforce_player_name
  before insert on "arcade-vault".snake_scores
  for each row execute function "arcade-vault".enforce_player_name();

drop trigger if exists snake_mirror on "arcade-vault".snake_scores;
create trigger snake_mirror
  after insert on "arcade-vault".snake_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('snake');

drop trigger if exists frogger_enforce_player_name on "arcade-vault".frogger_scores;
create trigger frogger_enforce_player_name
  before insert on "arcade-vault".frogger_scores
  for each row execute function "arcade-vault".enforce_player_name();

drop trigger if exists frogger_mirror on "arcade-vault".frogger_scores;
create trigger frogger_mirror
  after insert on "arcade-vault".frogger_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('frogger');

drop trigger if exists profiles_freeze_username on "arcade-vault".profiles;
create trigger profiles_freeze_username
  before update on "arcade-vault".profiles
  for each row execute function "arcade-vault".freeze_username();

-- -----------------------------------------------------------------------------
-- 7. Grants de tabla
--
-- Los GRANT abren la puerta y las policies deciden quién pasa: sin GRANT,
-- PostgREST rechaza la petición antes de siquiera evaluar RLS.
-- -----------------------------------------------------------------------------

grant select on "arcade-vault".games         to anon, authenticated;
grant select on "arcade-vault".global_scores to anon, authenticated;

grant select on "arcade-vault".profiles         to anon, authenticated;
grant insert, update on "arcade-vault".profiles to authenticated;

grant select, insert on "arcade-vault".asteroids_scores to anon, authenticated;
grant select, insert on "arcade-vault".tetris_scores    to anon, authenticated;
grant select, insert on "arcade-vault".arkanoid_scores  to anon, authenticated;
grant select, insert on "arcade-vault".snake_scores     to anon, authenticated;
grant select, insert on "arcade-vault".frogger_scores   to anon, authenticated;

-- Nota: el INSERT de `anon` es paridad con desarrollo y hoy no sirve de nada,
-- porque ninguna policy de INSERT admite a ese rol. Ver la sección
-- "Endurecimiento opcional" de references/migracion-produccion.md.

-- -----------------------------------------------------------------------------
-- 8. Realtime
--
-- /salon se suscribe a postgres_changes para insertar puntajes nuevos en vivo.
-- Sin esto la página funciona, pero solo se actualiza al recargar.
-- -----------------------------------------------------------------------------

do $realtime$
declare
  t text;
begin
  foreach t in array array[
    'asteroids_scores', 'tetris_scores', 'arkanoid_scores',
    'snake_scores', 'frogger_scores', 'global_scores'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'arcade-vault'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I.%I', 'arcade-vault', t);
    end if;
  end loop;
end;
$realtime$;

-- -----------------------------------------------------------------------------
-- 9. Seed del catálogo
--
-- Solo los juegos con motor real y leaderboard. Los 5 simulados
-- (serpentina, gloton, invasores, ranaria, duelo-pixel) no van aquí: viven en
-- app/data/games.ts y guardan puntaje en localStorage.
-- -----------------------------------------------------------------------------

insert into "arcade-vault".games (id, title) values
  ('arkanoid',  'ARKANOID'),
  ('asteroids', 'ASTEROIDS'),
  ('frogger',   'FROGGER'),
  ('snake',     'SNAKE'),
  ('tetris',    'TETRIS')
on conflict (id) do nothing;

commit;
