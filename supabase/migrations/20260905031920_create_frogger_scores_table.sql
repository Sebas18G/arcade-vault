create table "arcade-vault"."frogger_scores" (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 10),
  score integer not null check (score >= 0),
  level integer not null default 1,
  frogs_home integer not null default 0,
  time_bonus integer not null default 0,
  user_id uuid null references auth.users(id),
  created_at timestamptz not null default now()
);

insert into "arcade-vault".games (id, title) values ('frogger', 'FROGGER');

create trigger frogger_mirror after insert on "arcade-vault"."frogger_scores"
  for each row execute function "arcade-vault".mirror_to_global_scores('frogger');

alter table "arcade-vault"."frogger_scores" enable row level security;

create policy "frogger_scores_select_public"
  on "arcade-vault"."frogger_scores" for select
  to anon, authenticated
  using (true);

create policy "frogger_scores_insert_public"
  on "arcade-vault"."frogger_scores" for insert
  to anon, authenticated
  with check (char_length(player_name) between 1 and 10 and score >= 0);

grant select, insert on "arcade-vault"."frogger_scores" to anon, authenticated;

alter publication supabase_realtime add table "arcade-vault"."frogger_scores";
