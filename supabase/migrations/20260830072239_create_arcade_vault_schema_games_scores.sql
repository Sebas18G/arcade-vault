create schema if not exists "arcade-vault";

create table "arcade-vault"."games" (
  id text primary key,
  title text not null,
  cat text not null,
  created_at timestamptz not null default now()
);

create table "arcade-vault"."scores" (
  id bigint generated always as identity primary key,
  game_id text not null references "arcade-vault"."games" (id),
  player_name text not null check (char_length(trim(player_name)) > 0),
  score integer not null check (score >= 0),
  level integer not null default 1 check (level >= 1),
  user_id uuid,
  created_at timestamptz not null default now()
);

create index scores_game_id_score_idx on "arcade-vault"."scores" (game_id, score desc);
create index scores_score_idx on "arcade-vault"."scores" (score desc);

alter table "arcade-vault"."games" enable row level security;
alter table "arcade-vault"."scores" enable row level security;

create policy "games_arcade-vault_read" on "arcade-vault"."games"
  for select using (true);

create policy "scores_arcade-vault_read" on "arcade-vault"."scores"
  for select using (true);

create policy "scores_arcade-vault_insert" on "arcade-vault"."scores"
  for insert with check (user_id is null);

grant usage on schema "arcade-vault" to anon, authenticated, service_role;
grant select on "arcade-vault"."games" to anon, authenticated, service_role;
grant select, insert on "arcade-vault"."scores" to anon, authenticated, service_role;
grant usage, select on all sequences in schema "arcade-vault" to anon, authenticated, service_role;

insert into "arcade-vault"."games" (id, title, cat) values
  ('bloque-buster', 'BLOQUE BUSTER', 'ARCADE'),
  ('caida', 'CAÍDA', 'PUZZLE'),
  ('serpentina', 'SERPENTINA', 'ARCADE'),
  ('gloton', 'GLOTÓN', 'ARCADE'),
  ('invasores', 'INVASORES', 'SHOOTER'),
  ('rocas', 'ROCAS', 'SHOOTER'),
  ('ranaria', 'RANARIA', 'ARCADE'),
  ('duelo-pixel', 'DUELO PIXEL', 'VERSUS');
