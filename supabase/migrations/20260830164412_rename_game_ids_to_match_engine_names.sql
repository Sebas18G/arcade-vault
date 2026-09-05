-- Nuevas filas en games con los ids definitivos (acordes a los motores implementados)
insert into "arcade-vault".games (id, title) values
  ('asteroids', 'ASTEROIDS'),
  ('tetris', 'TETRIS'),
  ('arkanoid', 'ARKANOID');

-- Reapuntar el historial ya guardado en global_scores a los nuevos ids
update "arcade-vault".global_scores set game_id = 'asteroids' where game_id = 'rocas';
update "arcade-vault".global_scores set game_id = 'tetris' where game_id = 'caida';
update "arcade-vault".global_scores set game_id = 'arkanoid' where game_id = 'bloque-buster';

-- Quitar las filas viejas de games (ya sin referencias)
delete from "arcade-vault".games where id in ('rocas', 'caida', 'bloque-buster');

-- Recrear los triggers de espejo con el nuevo game_id literal
drop trigger asteroids_mirror on "arcade-vault".asteroids_scores;
drop trigger tetris_mirror on "arcade-vault".tetris_scores;
drop trigger arkanoid_mirror on "arcade-vault".arkanoid_scores;

create trigger asteroids_mirror after insert on "arcade-vault".asteroids_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('asteroids');
create trigger tetris_mirror after insert on "arcade-vault".tetris_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('tetris');
create trigger arkanoid_mirror after insert on "arcade-vault".arkanoid_scores
  for each row execute function "arcade-vault".mirror_to_global_scores('arkanoid');
