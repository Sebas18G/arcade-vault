-- SPEC 13 — Ancla player_name al alias del perfil de auth.uid().
-- SECURITY DEFINER para que siga funcionando si en el futuro se restringe el
-- SELECT publico sobre profiles; search_path fijado porque toda funcion
-- SECURITY DEFINER debe llevarlo.
create or replace function "arcade-vault".enforce_player_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select username into new.player_name
  from "arcade-vault".profiles
  where id = auth.uid();

  if new.player_name is null then
    raise exception 'No existe un perfil para el usuario actual';
  end if;

  return new;
end;
$$;

revoke execute on function "arcade-vault".enforce_player_name() from anon, authenticated;

-- BEFORE INSERT: el AFTER INSERT <juego>_mirror ya copia hacia global_scores
-- el player_name normalizado.
create trigger asteroids_enforce_player_name
  before insert on "arcade-vault".asteroids_scores
  for each row execute function "arcade-vault".enforce_player_name();

create trigger tetris_enforce_player_name
  before insert on "arcade-vault".tetris_scores
  for each row execute function "arcade-vault".enforce_player_name();

create trigger arkanoid_enforce_player_name
  before insert on "arcade-vault".arkanoid_scores
  for each row execute function "arcade-vault".enforce_player_name();

create trigger snake_enforce_player_name
  before insert on "arcade-vault".snake_scores
  for each row execute function "arcade-vault".enforce_player_name();

create trigger frogger_enforce_player_name
  before insert on "arcade-vault".frogger_scores
  for each row execute function "arcade-vault".enforce_player_name();
