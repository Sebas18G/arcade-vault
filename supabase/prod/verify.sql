-- =============================================================================
-- Arcade Vault — Verificación post-bootstrap del proyecto de PRODUCCIÓN
-- =============================================================================
--
-- Se corre en el SQL Editor DESPUÉS de bootstrap.sql. No modifica nada.
-- Devuelve una sola tabla: cada fila es un chequeo con su valor esperado, su
-- valor real y un veredicto. Todas las filas deben decir OK.
--
-- Si alguna dice FALLA, la columna `real` indica qué quedó a medias; volver a
-- correr bootstrap.sql completo es seguro (es idempotente).
-- =============================================================================

with chequeos as (

  select 1 as orden, 'Tablas en el schema arcade-vault' as chequeo, 8 as esperado,
    (select count(*) from pg_tables where schemaname = 'arcade-vault')::int as real_

  union all
  select 2, 'Tablas con RLS habilitado', 8,
    (select count(*) from pg_tables
     where schemaname = 'arcade-vault' and rowsecurity)::int

  union all
  select 3, 'Policies de RLS', 15,
    (select count(*) from pg_policies where schemaname = 'arcade-vault')::int

  union all
  select 4, 'Funciones', 3,
    (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'arcade-vault' and p.prokind = 'f')::int

  union all
  select 5, 'Triggers (5 enforce + 5 mirror + 1 freeze)', 11,
    (select count(*) from pg_trigger t
     join pg_class c on c.oid = t.tgrelid
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'arcade-vault' and not t.tgisinternal)::int

  union all
  select 6, 'Tablas publicadas en Realtime', 6,
    (select count(*) from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'arcade-vault')::int

  union all
  select 7, 'Filas sembradas en games', 5,
    (select count(*) from "arcade-vault".games)::int

  -- Spec 13: toda función del schema debe tener search_path fijado. Un
  -- SECURITY DEFINER sin search_path resuelve nombres según el del invocador,
  -- que el cliente controla.
  union all
  select 8, 'Funciones con search_path fijado', 3,
    (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'arcade-vault' and p.prokind = 'f'
       and array_to_string(coalesce(p.proconfig, '{}'), ',') like '%search_path=%')::int

  -- Spec 13: son funciones de trigger, no RPC. Si anon o authenticated
  -- conservan EXECUTE, quedan expuestas en /rest/v1/rpc/<nombre>.
  union all
  select 9, 'Funciones invocables como RPC por anon/authenticated', 0,
    (select count(*) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     cross join unnest(array['anon', 'authenticated']) as rol
     where n.nspname = 'arcade-vault' and p.prokind = 'f'
       and has_function_privilege(rol, p.oid, 'EXECUTE'))::int

  -- Los datos de prueba de desarrollo no deben haber viajado.
  union all
  select 10, 'Puntajes precargados (debe arrancar vacío)', 0,
    (select count(*) from "arcade-vault".global_scores)::int

)
select
  orden,
  chequeo,
  esperado,
  real_ as real,
  case when esperado = real_ then 'OK' else 'FALLA' end as veredicto
from chequeos
order by orden;

-- -----------------------------------------------------------------------------
-- Chequeos de detalle (opcionales, para inspección manual)
-- -----------------------------------------------------------------------------

-- Las 5 filas del catálogo:
--   select * from "arcade-vault".games order by id;
--   -> arkanoid / asteroids / frogger / snake / tetris

-- Los 11 triggers, tabla por tabla:
--   select c.relname, t.tgname
--   from pg_trigger t
--   join pg_class c on c.oid = t.tgrelid
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'arcade-vault' and not t.tgisinternal
--   order by 1, 2;

-- Las 15 policies con su condición:
--   select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname = 'arcade-vault' order by 1, 2;

-- El schema está expuesto en la API (paso de dashboard, no de SQL). La prueba
-- real es que la app lea /games sin error 404 de PostgREST.
