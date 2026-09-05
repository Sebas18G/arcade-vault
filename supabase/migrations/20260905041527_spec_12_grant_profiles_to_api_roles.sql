-- El schema "arcade-vault" no tiene default privileges: cada tabla necesita su
-- GRANT explícito para los roles de la API, o PostgREST devuelve 42501
-- (permission denied) antes de evaluar RLS.
grant select on "arcade-vault"."profiles" to anon, authenticated;
grant insert, update on "arcade-vault"."profiles" to authenticated;
