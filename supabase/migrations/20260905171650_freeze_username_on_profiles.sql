-- SPEC 13 — Congelar el alias: la UI de /auth/alias promete que no se puede cambiar.
-- search_path fijado y sin EXECUTE para public/anon/authenticated, siguiendo la
-- regla de la spec de que toda funcion nueva nace endurecida.
create or replace function "arcade-vault".freeze_username()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    raise exception 'El alias no se puede cambiar';
  end if;
  return new;
end;
$$;

revoke execute on function "arcade-vault".freeze_username() from public, anon, authenticated;

create trigger profiles_freeze_username
  before update on "arcade-vault".profiles
  for each row execute function "arcade-vault".freeze_username();
