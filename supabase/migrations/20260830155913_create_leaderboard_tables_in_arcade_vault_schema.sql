-- Catálogo mínimo, solo para construir los tabs del Salón (no reemplaza app/data/games.ts)
create table "arcade-vault".games (
  id text primary key,           -- 'rocas' | 'caida' | 'bloque-buster'
  title text not null,           -- 'ASTEROIDS' | 'TETRIS' | 'ARKANOID'
  created_at timestamptz not null default now()
);

create table "arcade-vault".asteroids_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  asteroids_destroyed integer not null default 0,
  best_combo integer not null default 0,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

create table "arcade-vault".tetris_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  lines integer not null default 0,
  best_combo integer not null default 0,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

create table "arcade-vault".arkanoid_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Poblada solo por trigger, nunca por insert directo del cliente
create table "arcade-vault".global_scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references "arcade-vault".games(id),
  player_name text not null,
  score integer not null,
  level integer not null default 1,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Espejo automático hacia global_scores (una función, un trigger por tabla de juego)
create function "arcade-vault".mirror_to_global_scores() returns trigger
language plpgsql security definer as $$
begin
  insert into "arcade-vault".global_scores (game_id, player_name, score, level, user_id, created_at)
  values (TG_ARGV[0], new.player_name, new.score, new.level, new.user_id, new.created_at);
  return new;
end;
$$;

create trigger asteroids_mirror after insert on "arcade-vault".asteroids_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('rocas');
create trigger tetris_mirror after insert on "arcade-vault".tetris_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('caida');
create trigger arkanoid_mirror after insert on "arcade-vault".arkanoid_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('bloque-buster');

-- RLS
alter table "arcade-vault".games enable row level security;
alter table "arcade-vault".asteroids_scores enable row level security;
alter table "arcade-vault".tetris_scores enable row level security;
alter table "arcade-vault".arkanoid_scores enable row level security;
alter table "arcade-vault".global_scores enable row level security;

-- SELECT público en las 5 tablas
create policy "games_select_public" on "arcade-vault".games
  for select to anon, authenticated using (true);
create policy "asteroids_scores_select_public" on "arcade-vault".asteroids_scores
  for select to anon, authenticated using (true);
create policy "tetris_scores_select_public" on "arcade-vault".tetris_scores
  for select to anon, authenticated using (true);
create policy "arkanoid_scores_select_public" on "arcade-vault".arkanoid_scores
  for select to anon, authenticated using (true);
create policy "global_scores_select_public" on "arcade-vault".global_scores
  for select to anon, authenticated using (true);

-- INSERT público solo en las 3 tablas de juego (games y global_scores sin policy de INSERT para el cliente)
create policy "asteroids_scores_insert_public" on "arcade-vault".asteroids_scores
  for insert to anon, authenticated
  with check (char_length(player_name) between 1 and 10 and score >= 0);
create policy "tetris_scores_insert_public" on "arcade-vault".tetris_scores
  for insert to anon, authenticated
  with check (char_length(player_name) between 1 and 10 and score >= 0);
create policy "arkanoid_scores_insert_public" on "arcade-vault".arkanoid_scores
  for insert to anon, authenticated
  with check (char_length(player_name) between 1 and 10 and score >= 0);

-- Seed de los 3 juegos reales
insert into "arcade-vault".games (id, title) values
  ('rocas', 'ASTEROIDS'),
  ('caida', 'TETRIS'),
  ('bloque-buster', 'ARKANOID');

-- Grants: el rol anon/authenticated necesita USAGE en el schema y privilegios de tabla
-- (RLS ya restringe filas; esto habilita el acceso a nivel de schema/tabla que PostgREST requiere)
grant usage on schema "arcade-vault" to anon, authenticated;
grant select on "arcade-vault".games, "arcade-vault".asteroids_scores, "arcade-vault".tetris_scores, "arcade-vault".arkanoid_scores, "arcade-vault".global_scores to anon, authenticated;
grant insert on "arcade-vault".asteroids_scores, "arcade-vault".tetris_scores, "arcade-vault".arkanoid_scores to anon, authenticated;

-- Realtime en las 4 tablas de scores (no en games, es estática)
alter publication supabase_realtime add table "arcade-vault".asteroids_scores;
alter publication supabase_realtime add table "arcade-vault".tetris_scores;
alter publication supabase_realtime add table "arcade-vault".arkanoid_scores;
alter publication supabase_realtime add table "arcade-vault".global_scores;
