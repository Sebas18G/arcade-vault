alter table "arcade-vault"."serpentina_scores" rename to "snake_scores";

drop trigger serpentina_mirror on "arcade-vault"."snake_scores";
create trigger snake_mirror after insert on "arcade-vault"."snake_scores"
  for each row execute function "arcade-vault".mirror_to_global_scores('snake');

alter policy serpentina_scores_select_public on "arcade-vault"."snake_scores" rename to snake_scores_select_public;
alter policy serpentina_scores_insert_public on "arcade-vault"."snake_scores" rename to snake_scores_insert_public;

update "arcade-vault".games set id = 'snake', title = 'SNAKE' where id = 'serpentina';
