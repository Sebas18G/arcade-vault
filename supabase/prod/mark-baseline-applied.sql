-- =============================================================================
-- Arcade Vault — Registrar la línea base como aplicada en PRODUCCIÓN
-- =============================================================================
--
-- Se corre en el SQL Editor de producción UNA SOLA VEZ, justo después de
-- `bootstrap.sql`.
--
-- `bootstrap.sql` deja el esquema equivalente a las 15 primeras migraciones,
-- pero no las anota en ningún lado. Este script las marca como aplicadas para
-- que producción y desarrollo compartan el mismo punto de partida: sin esto,
-- producción "no sabe" qué tiene y cualquier herramienta de migraciones (o tú
-- dentro de seis meses) intentaría aplicarle de nuevo migraciones que ya están.
--
-- NO ejecutar si en lugar de `bootstrap.sql` aplicaste las 15 migraciones una
-- por una: en ese caso regístralas conforme las vayas aplicando.
--
-- Solo anota las versiones; deja `statements` vacío. El SQL real vive en
-- supabase/migrations/, que es la fuente de verdad.
-- =============================================================================

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text,
  created_by text,
  idempotency_key text,
  rollback text[]
);

insert into supabase_migrations.schema_migrations (version, name, statements) values
  ('20260830072239', 'create_arcade_vault_schema_games_scores',            '{}'),
  ('20260830154840', 'create_leaderboard_tables',                          '{}'),
  ('20260830155856', 'drop_leaderboard_tables_from_public',                '{}'),
  ('20260830155913', 'create_leaderboard_tables_in_arcade_vault_schema',   '{}'),
  ('20260830164412', 'rename_game_ids_to_match_engine_names',              '{}'),
  ('20260830183026', 'create_serpentina_scores_table',                     '{}'),
  ('20260830183336', 'rename_serpentina_to_snake',                         '{}'),
  ('20260830184732', 'grant_snake_scores_privileges',                      '{}'),
  ('20260905031920', 'create_frogger_scores_table',                        '{}'),
  ('20260905035941', 'spec_12_profiles_and_authenticated_score_inserts',   '{}'),
  ('20260905041527', 'spec_12_grant_profiles_to_api_roles',                '{}'),
  ('20260905171450', 'enforce_player_name_on_score_inserts',               '{}'),
  ('20260905171557', 'revoke_public_execute_on_enforce_player_name',       '{}'),
  ('20260905171650', 'freeze_username_on_profiles',                        '{}'),
  ('20260905171750', 'harden_mirror_to_global_scores',                     '{}')
on conflict (version) do nothing;

-- Verificación: debe devolver 15.
select count(*) as migraciones_registradas
from supabase_migrations.schema_migrations;
