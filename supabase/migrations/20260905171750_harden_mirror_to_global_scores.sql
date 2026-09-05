-- SPEC 13 — Endurecer la funcion existente (advisors 0011, 0028 y 0029 de Supabase).
-- El cuerpo ya califica "arcade-vault".global_scores, asi que search_path = '' no lo rompe.
-- El revoke incluye public porque anon/authenticated heredan de ahi el EXECUTE por defecto.
alter function "arcade-vault".mirror_to_global_scores() set search_path = '';

revoke execute on function "arcade-vault".mirror_to_global_scores() from public, anon, authenticated;
