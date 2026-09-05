# Base de datos — flujo de migraciones

**Regla del proyecto: todo cambio de esquema en la base de datos nace como un
archivo de migración en `supabase/migrations/`.** Nada de SQL suelto aplicado
solo a desarrollo.

El motivo es concreto: el esquema se construyó con 15 cambios aplicados por MCP
que nunca existieron como archivos, así que su única copia vivía dentro de la
base de desarrollo. Al crear el proyecto de producción no había nada
reproducible con qué poblarlo y hubo que reconstruirlo a mano. Las migraciones
existen para que eso no vuelva a pasar: **lo que se aplica en desarrollo es
exactamente el archivo que después se aplica en producción.**

## Qué hay aquí

| Ruta                                | Qué es                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `migrations/`                       | **La fuente de verdad del esquema.** Una migración por archivo, en orden cronológico.       |
| `prod/bootstrap.sql`                | Snapshot equivalente a las 15 primeras migraciones. Atajo para levantar producción de cero. |
| `prod/mark-baseline-applied.sql`    | Marca esas 15 como aplicadas en producción, después de correr el bootstrap.                 |
| `prod/verify.sql`                   | Chequeos post-migración.                                                                    |
| `../references/migracion-produccion.md` | Runbook completo de producción (Auth, OAuth, variables de entorno).                     |

## Nombre de archivo

```
migrations/<version>_<nombre>.sql
```

`<version>` es un timestamp UTC `YYYYMMDDHHMMSS` y `<nombre>` va en
`snake_case`. Es la convención del CLI de Supabase, así que adoptar el CLI más
adelante no obliga a renombrar nada. El orden alfabético de los archivos es el
orden de aplicación.

## Crear una migración

1. **Escribe primero el archivo** en `migrations/` con el timestamp actual.
2. **Aplícalo en desarrollo** con `apply_migration` del MCP, usando el mismo
   nombre que el archivo (sin `.sql`) y el mismo SQL, sin editarlo por el camino.
   Para DDL nunca uses `execute_sql`: no queda registrado en el historial y el
   archivo y la base se separan en silencio.
3. **Verifica** que quedó como esperabas y corre `get_advisors type=security`.
4. **Commitea el archivo** junto con el código que lo necesita.

Producción se actualiza aparte, cuando toque desplegar (ver abajo).

## Reglas para el SQL

- **El schema lleva guion**, así que siempre entre comillas dobles:
  `"arcade-vault".mi_tabla`. Sin comillas, Postgres lo lee como una resta.
- **Toda tabla nueva necesita `GRANT` explícito** para `anon`/`authenticated`.
  El schema no tiene default privileges: sin el grant, PostgREST responde 42501
  antes siquiera de evaluar RLS.
- **Toda tabla nueva necesita RLS habilitado y sus policies.** Sin policies, con
  RLS activo, no se ve nada.
- **Toda función nueva** nace con `security definer` (si lo necesita),
  `set search_path = ''`, y se le revoca `EXECUTE` **a `public`**, no solo a
  `anon`/`authenticated`: Postgres se lo concede a `PUBLIC` por defecto y esos
  roles lo heredan de ahí, así que revocárselo solo a ellos no quita nada y la
  función queda invocable como RPC. Ese es justo el bug que corrigió la
  migración `20260905171557`.
- **Si la tabla se lee en vivo** (`/salon`), agregarla a la publicación:
  `alter publication supabase_realtime add table "arcade-vault".mi_tabla;`

## Aplicar en producción

Producción **no** se sincroniza sola. Cuando haya migraciones nuevas sin aplicar:

1. Mira qué tiene producción:
   `select version, name from supabase_migrations.schema_migrations order by version;`
2. Por cada archivo de `migrations/` posterior a esa última versión, en orden:
   pega su contenido en el SQL Editor de producción y ejecútalo.
3. Regístralo, para que el historial siga cuadrando:
   ```sql
   insert into supabase_migrations.schema_migrations (version, name, statements)
   values ('<version>', '<nombre>', '{}');
   ```
4. Corre `prod/verify.sql` y actualiza sus conteos esperados si el cambio agregó
   tablas, policies, funciones o triggers.

**Producción desde cero** (proyecto nuevo y vacío): correr `prod/bootstrap.sql`,
después `prod/mark-baseline-applied.sql`, y luego las migraciones posteriores a
`20260905171750` una por una. El runbook lo detalla junto con la configuración
de Auth, que no viaja en ningún SQL.

## Relación entre `bootstrap.sql` y `migrations/`

`bootstrap.sql` es una foto del estado a `20260905171750`, no una fuente de
verdad paralela. Reproduce el resultado de las 15 migraciones sin repetir su
historia (crear tablas en `public` para borrarlas después, renombrar
`serpentina` a `snake`, etc.).

Cuando agregues una migración, **no** hace falta tocar `bootstrap.sql`: para
levantar producción de cero se corre el bootstrap y después las migraciones
posteriores, que es exactamente el flujo de arriba. Si algún día el archivo se
queda tan atrás que el trámite molesta, regenéralo desde el esquema de dev y
mueve la marca de la línea base en `mark-baseline-applied.sql`.

## Cuando el CLI valga la pena

Con el CLI (`supabase link` + `supabase db push`) se acaban el copiar y pegar y
el registro manual: aplica solo lo pendiente en cada proyecto y lleva la cuenta
él mismo. `migrations/` ya usa su convención de nombres, así que adoptarlo es
`supabase init`, enlazar los dos proyectos y seguir. Hoy se opera a mano por
decisión explícita, no por falta de preparación.
