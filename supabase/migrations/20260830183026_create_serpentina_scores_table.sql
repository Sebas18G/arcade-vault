create table "arcade-vault"."serpentina_scores" (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) >= 1 and char_length(player_name) <= 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table "arcade-vault"."serpentina_scores" enable row level security;

create policy serpentina_scores_select_public
  on "arcade-vault"."serpentina_scores"
  for select
  to anon, authenticated
  using (true);

create policy serpentina_scores_insert_public
  on "arcade-vault"."serpentina_scores"
  for insert
  to anon, authenticated
  with check (char_length(player_name) >= 1 and char_length(player_name) <= 10 and score >= 0);

insert into "arcade-vault".games (id, title) values ('serpentina', 'SERPENTINA');

create trigger serpentina_mirror after insert on "arcade-vault"."serpentina_scores"
  for each row execute function "arcade-vault".mirror_to_global_scores('serpentina');

alter publication supabase_realtime add table "arcade-vault"."serpentina_scores";
