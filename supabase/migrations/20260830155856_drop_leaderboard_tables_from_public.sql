drop trigger if exists asteroids_mirror on public.asteroids_scores;
drop trigger if exists tetris_mirror on public.tetris_scores;
drop trigger if exists arkanoid_mirror on public.arkanoid_scores;
drop function if exists public.mirror_to_global_scores();
drop table if exists public.global_scores;
drop table if exists public.asteroids_scores;
drop table if exists public.tetris_scores;
drop table if exists public.arkanoid_scores;
drop table if exists public.games;
