-- SPEC 13 — El revoke a anon/authenticated no basta: Postgres otorga EXECUTE a
-- PUBLIC por defecto en toda funcion nueva, y ambos roles lo heredan de ahi.
revoke execute on function "arcade-vault".enforce_player_name() from public;
