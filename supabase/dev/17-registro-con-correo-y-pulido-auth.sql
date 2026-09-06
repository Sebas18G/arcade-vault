-- =============================================================================
-- SPEC 17 — Perfil creado por trigger al nacer el usuario
-- =============================================================================
--
-- Script EXACTO aplicado al proyecto de DESARROLLO (okqmxxqnmcqpqzusnype) el
-- 2026-09-06 con `apply_migration` del MCP de Supabase, bajo el nombre de
-- migración `handle_new_user_trigger` (versión 20260906164748).
--
-- Se guarda versionado porque los dos proyectos de Supabase NO se sincronizan
-- solos: no hay CLI ni supabase/migrations/. Para PRODUCCIÓN no se corre este
-- archivo, se corre supabase/prod/bootstrap.sql (que ya lo incluye) desde el
-- dashboard, siguiendo references/migracion-produccion.md.
--
-- QUÉ ARREGLA
--   Hasta ahora la fila de "arcade-vault".profiles la insertaba el cliente en un
--   segundo paso, después de signUp(). Cada vez que ese paso no llegaba a
--   ejecutarse —confirmación de correo activa, red caída, pestaña cerrada— el
--   usuario quedaba en auth.users sin alias. Con el trigger, el perfil nace
--   dentro de la misma transacción que el usuario: o están los dos, o no está
--   ninguno.
--
-- OJO: este es el único trigger del proyecto que NO cuelga de una tabla de
-- "arcade-vault", sino de auth.users. Por eso verify.sql lo cuenta aparte.
--
-- PASO MANUAL QUE LO ACOMPAÑA (no es SQL, va en el dashboard):
--   Authentication -> Sign In / Providers -> Email -> "Confirm email" DESACTIVADO.
--   Sin eso, signUp() devuelve session = null y el registro parece colgado.
--
-- El schema se llama con guion, así que SIEMPRE va entre comillas dobles.
-- =============================================================================

-- Solo actúa si el alta trae username en los metadatos: es el caso del registro
-- por correo, donde el jugador ya lo escribió. En OAuth no viene, la función no
-- hace nada, y /auth/callback sigue mandando a /auth/alias como hasta ahora.
--
-- Si el alias está tomado o no cumple 3-10 caracteres, el insert falla, el alta
-- entera se revierte y no queda un usuario huérfano en auth.users. GoTrue
-- propaga entonces el error de Postgres (23505 o 23514), que traduce a Español
-- translateAuthError() en app/auth/page.tsx.
create or replace function "arcade-vault".handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  alias text := upper(trim(new.raw_user_meta_data->>'username'));
begin
  if alias is null or alias = '' then
    return new;
  end if;

  insert into "arcade-vault".profiles (id, username)
  values (new.id, alias);

  return new;
end;
$function$;

-- Hay que revocar de PUBLIC, no solo de anon/authenticated: Postgres concede
-- EXECUTE a PUBLIC en toda función nueva y esos dos roles lo heredan de ahí
-- (spec 13). ACL correcto tras esto: {postgres=X/postgres}.
revoke execute on function "arcade-vault".handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function "arcade-vault".handle_new_user();
