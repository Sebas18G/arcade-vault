# Migración a producción — Supabase

Runbook para poner en marcha el proyecto de **producción** de Supabase y dejarlo
funcionalmente idéntico al de desarrollo.

Arcade Vault vive sobre dos proyectos de Supabase:

| Entorno       | Project ref            | Cómo se opera                                            |
| ------------- | ---------------------- | -------------------------------------------------------- |
| Desarrollo    | `okqmxxqnmcqpqzusnype` | MCP de Supabase (`.mcp.json`), `apply_migration`          |
| Producción    | `<PROJECT-REF-PROD>`   | Dashboard + los scripts de `supabase/prod/` — **nunca por MCP** |

El MCP apunta solo a desarrollo, a propósito: así ningún `apply_migration` puede
caer por accidente en producción.

**Producción arranca vacía.** No se migran los usuarios, perfiles ni puntajes de
desarrollo: son datos de prueba y sus `user_id` apuntan a cuentas que no existen
en el proyecto nuevo. Lo único que se siembra es el catálogo `games`.

---

## Paso 1 — Exponer el schema en la API

Dashboard de producción → **Settings → API → Exposed schemas** → agregar
`arcade-vault` y guardar.

Va **antes** que el SQL. `lib/supabase/client.ts`, `lib/supabase/server.ts` y
`proxy.ts` crean sus clientes con `db: { schema: "arcade-vault" }`; si el schema
no está expuesto, PostgREST responde 404 a todas las consultas aunque las tablas
existan y sean visibles por SQL directo.

- [ ] `arcade-vault` aparece en la lista de Exposed schemas

## Paso 2 — Correr el bootstrap

Dashboard → **SQL Editor** → pegar el contenido completo de
[`supabase/prod/bootstrap.sql`](../supabase/prod/bootstrap.sql) → Run.

Crea el schema, las 9 tablas, RLS con sus 17 policies, las 4 funciones, los 14
triggers, los grants, la publicación de Realtime y las 6 filas de `games`.

De esos 14 triggers, 13 cuelgan de tablas de `"arcade-vault"` y **uno cuelga de
`auth.users`**: `on_auth_user_created`, que crea el perfil dentro de la misma
transacción que el usuario (spec 17). Es el único que toca un schema ajeno.

Corre dentro de una transacción y es idempotente: si algo falla no queda nada a
medias, y volver a ejecutarlo sobre una base ya migrada no rompe nada.

- [ ] El script terminó sin errores

## Paso 3 — Verificar

SQL Editor → pegar [`supabase/prod/verify.sql`](../supabase/prod/verify.sql) → Run.

Devuelve 11 filas. **Todas deben decir `OK`.** Si alguna dice `FALLA`, la columna
`real` señala qué faltó; volver a correr el bootstrap completo es seguro.

- [ ] Las 11 filas dicen OK

## Paso 4 — Configurar Auth

Todo esto vive en la configuración del proyecto, no en el SQL, así que no viaja
en ningún script y hay que hacerlo a mano.

**Authentication → Sign In / Providers → Email**

- [ ] **"Confirm email" desactivado.** Las specs 12 y 17 lo exigen: el registro
      deja sesión activa de inmediato y `/auth` no tiene pantalla de "revisa tu
      correo". Con esto encendido, `signUp()` devuelve `session = null` y el
      jugador acaba desviado a `/auth/alias` sin sesión que verificar.

      Es el paso que en desarrollo se olvidó durante toda la spec 12 y que la 17
      tuvo que ir a arreglar. **Verificación objetiva**, tras el primer registro
      de prueba: `email_confirmed_at` y `created_at` del usuario nuevo difieren
      en milisegundos. Si difieren en segundos, hubo un clic en un correo y el
      toggle sigue encendido.

      ```sql
      select email, created_at, email_confirmed_at,
             email_confirmed_at - created_at as delta
      from auth.users order by created_at desc limit 1;
      ```

**Authentication → Passwords**

- [ ] **"Leaked password protection" activado** (contrasta contra HaveIBeenPwned).
      Es el paso 7 de la spec 13, que en desarrollo quedó pendiente. En producción
      se hace bien desde el arranque.

**Authentication → URL Configuration**

- [ ] Site URL: `https://<TU-DOMINIO>`
- [ ] Redirect URLs: `https://<TU-DOMINIO>/auth/callback`
- [ ] Si el host genera previews por rama (Vercel y similares), agregar también su
      patrón de wildcard, o el login fallará en cada preview.

## Paso 5 — OAuth de Google y GitHub

`app/auth/page.tsx` ofrece los dos providers. Necesitan credenciales **propias de
producción**: no reutilices las de desarrollo, porque comparten la lista de
redirect URIs y un cambio en una afecta a la otra.

Hay **dos** URLs distintas y confundirlas es el error clásico:

| Dónde se registra                       | Qué URL va                                          |
| --------------------------------------- | --------------------------------------------------- |
| Google Cloud Console / GitHub OAuth App | `https://<PROJECT-REF-PROD>.supabase.co/auth/v1/callback` |
| Supabase → Authentication → URL Configuration | `https://<TU-DOMINIO>/auth/callback`           |

La primera es a dónde vuelve el proveedor después del login (siempre a Supabase).
La segunda es a dónde Supabase devuelve al usuario, y es la ruta que implementa
`app/auth/callback/route.ts`.

- [ ] Google: credencial OAuth creada, redirect URI de Supabase registrada,
      Client ID + Secret pegados en Authentication → Providers → Google
- [ ] GitHub: OAuth App creada, callback URL de Supabase registrada,
      Client ID + Secret pegados en Authentication → Providers → GitHub

## Paso 6 — Variables de entorno

Del dashboard de producción, **Settings → API**, copiar la Project URL y la
publishable key (`anon`).

```
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT-REF-PROD>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key de producción>
RESEND_API_KEY=<api key de Resend>
RESEND_FROM_EMAIL=<remitente con dominio verificado en Resend>
CONTACT_TO_EMAIL=<destino del formulario de contacto>
```

Ver [`.env.example`](../.env.example) para la lista completa comentada.

Dos avisos:

- **`RESEND_FROM_EMAIL` necesita un dominio verificado en Resend.** El remitente
  de pruebas `onboarding@resend.dev` solo entrega a tu propia dirección, así que
  en producción el formulario de `/about` parecería funcionar sin que llegue nada.
- **`SUPABASE_DB_PASSWORD` no la usa la app.** Solo hace falta si algún día
  conectas el CLI o `psql`. No la cargues en el host.

- [ ] Variables cargadas en el host (o en `.env.local` si aún corres en local)

## Paso 7 — Smoke test

Con la app apuntando a producción:

- [ ] `/games` carga el catálogo, y `/salon` redirige a `/auth` sin sesión
      (valida `proxy.ts` y que el schema esté expuesto)
- [ ] Registro con correo + contraseña → entra de inmediato, sin correo de
      confirmación, y crea fila en `auth.users` **y** en `"arcade-vault".profiles`
      en el mismo instante (valida `on_auth_user_created`)
- [ ] Registro con un alias ya tomado → mensaje en Español y **ningún usuario
      nuevo** en `auth.users`: el trigger revierte el alta entera. Comprobarlo con
      `select count(*) from auth.users;` antes y después
- [ ] Login con Google y con GitHub en ventana anónima → primera vez aterriza en
      `/auth/alias`, segunda vez entra directo a `/games`. El trigger no debe
      estorbar aquí: OAuth no manda `username` en los metadatos
- [ ] Guardar puntaje en los 6 juegos con leaderboard (asteroids, tetris,
      arkanoid, snake, frogger, invasores) → cada fila queda en su tabla con el
      alias del perfil **y** espejada en `global_scores` (valida los 12 triggers
      de puntajes)
- [ ] Con `/salon` abierto en otra pestaña, guardar un puntaje → aparece en vivo
      sin recargar (valida Realtime)
- [ ] Formulario de `/about` → el correo llega (valida Resend en producción)
- [ ] Dashboard → **Advisors → Security** no reporta nada

---

## Rollback

Producción nace vacía, así que rehacerla es barato mientras no haya jugadores
reales. En el SQL Editor:

```sql
drop schema "arcade-vault" cascade;
```

Eso borra tablas, funciones, triggers y policies, y saca las tablas de la
publicación de Realtime. El `cascade` alcanza también a `on_auth_user_created`,
que vive en `auth.users` pero depende de una función del schema: desaparece con
él, y hasta que no se rehaga el bootstrap **los registros nuevos no crearán
perfil** (el alta en sí seguirá funcionando).

Las cuentas de `auth.users` **no** se borran (viven en otro schema): si quieres
partir de cero del todo, elimínalas desde Authentication → Users. Después, volver
al paso 2.

**Ojo:** en cuanto haya puntajes reales de jugadores, esto deja de ser un
rollback y pasa a ser una pérdida de datos.

---

## Cambios futuros

Mientras no exista una carpeta `supabase/migrations/`, **producción no se
sincroniza sola**. El flujo para cualquier cambio de esquema es:

1. Aplicarlo en desarrollo como siempre (spec → `/spec-impl` → `apply_migration`).
2. Guardar el SQL **exacto** que se aplicó en `supabase/dev/NN-slug.sql`, con el
   nombre y la versión de la migración en la cabecera. Es el historial legible
   que sustituye a `supabase/migrations/` mientras no haya CLI.
3. Reflejar el mismo cambio en `supabase/prod/bootstrap.sql`, manteniéndolo
   idempotente y en la sección que le corresponde.
4. Actualizar los conteos esperados de `supabase/prod/verify.sql` si cambió el
   número de tablas, policies, funciones o triggers, y añadir un chequeo nuevo si
   el objeto no encaja en ninguno (como el trigger de `auth.users` de la spec 17).
5. Actualizar este runbook si cambian los conteos del Paso 2, el número de filas
   del Paso 3, o los pasos manuales de Auth.
6. Aplicar en producción: el `alter`/`create` concreto en el SQL Editor, o el
   bootstrap completo (es idempotente, pero no borra lo que ya no debería estar —
   un `drop policy` viejo hay que ejecutarlo a mano).

### Delta pendiente: spec 17 sobre una producción ya migrada

Si producción se montó **antes** del 2026-09-06, le falta el trigger que crea el
perfil. Correr el `bootstrap.sql` completo vale (es idempotente) y es lo más
seguro; si prefieres aplicar solo el delta, pega esto en el SQL Editor — es el
contenido de [`supabase/dev/17-registro-con-correo-y-pulido-auth.sql`](../supabase/dev/17-registro-con-correo-y-pulido-auth.sql):

```sql
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

revoke execute on function "arcade-vault".handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function "arcade-vault".handle_new_user();
```

Y comprobar que el toggle **"Confirm email"** del Paso 4 sigue desactivado: sin
él, el trigger crea el perfil igual pero la sesión no queda activa.

Las cuentas que ya existan en producción sin fila en `profiles` no se reparan
solas — el trigger solo gobierna las altas nuevas. Esas siguen entrando por
`/auth/alias`, que es justo para lo que está.

Cuando el ritmo de cambios haga esto pesado, la salida natural es migrar al
Supabase CLI: `supabase link` + `supabase db push` contra cada proyecto, con las
migraciones versionadas en el repo. Este archivo y `bootstrap.sql` serían
entonces el punto de partida de la migración inicial.

## Endurecimiento opcional

`bootstrap.sql` reproduce los grants de desarrollo tal cual, incluido
`grant insert ... to anon` en las 6 tablas de puntajes. Ese permiso **no sirve de
nada hoy**: ninguna policy de `INSERT` admite al rol `anon`, así que RLS lo frena
igual. Es un resto de las specs 06/08, anteriores a que existiera autenticación.

Si quieres cerrarlo, en **ambos** proyectos (para que no diverjan):

```sql
revoke insert on "arcade-vault".asteroids_scores from anon;
revoke insert on "arcade-vault".tetris_scores    from anon;
revoke insert on "arcade-vault".arkanoid_scores  from anon;
revoke insert on "arcade-vault".snake_scores     from anon;
revoke insert on "arcade-vault".frogger_scores   from anon;
revoke insert on "arcade-vault".invasores_scores from anon;
```

No cambia el comportamiento de la app: los puntajes se guardan siempre con sesión
activa, es decir con el rol `authenticated`.

---

## Nota sobre `revoke` en funciones

Si algún día agregas una función nueva, revócale el `EXECUTE` **a `public`**, no
solo a `anon` y `authenticated`:

```sql
revoke execute on function "arcade-vault".mi_funcion() from public, anon, authenticated;
```

Postgres concede `EXECUTE` a `PUBLIC` en toda función nueva, y `anon` y
`authenticated` lo heredan de ahí. Revocárselo solo a ellos no quita nada: la
función queda invocable como RPC en `/rest/v1/rpc/mi_funcion` igual. La diferencia
se ve en el ACL — `{postgres=X/postgres}` es correcto, `{=X/postgres,...}` significa
que PUBLIC todavía la puede llamar.
