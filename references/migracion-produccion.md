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

Crea el schema, las 8 tablas, RLS con sus 15 policies, las 3 funciones, los 11
triggers, los grants, la publicación de Realtime y las 5 filas de `games`.

Corre dentro de una transacción y es idempotente: si algo falla no queda nada a
medias, y volver a ejecutarlo sobre una base ya migrada no rompe nada.

- [ ] El script terminó sin errores

## Paso 3 — Verificar

SQL Editor → pegar [`supabase/prod/verify.sql`](../supabase/prod/verify.sql) → Run.

Devuelve 10 filas. **Todas deben decir `OK`.** Si alguna dice `FALLA`, la columna
`real` señala qué faltó; volver a correr el bootstrap completo es seguro.

- [ ] Las 10 filas dicen OK

## Paso 4 — Configurar Auth

Todo esto vive en la configuración del proyecto, no en el SQL, así que no viaja
en ningún script y hay que hacerlo a mano.

**Authentication → Sign In / Providers → Email**

- [ ] **"Confirm email" desactivado.** La spec 12 lo exige: el registro deja
      sesión activa de inmediato y `/auth` no tiene pantalla de "revisa tu correo".
      Con esto encendido, el registro parece colgado.

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
- [ ] Login con Google y con GitHub en ventana anónima → primera vez aterriza en
      `/auth/alias`, segunda vez entra directo a `/games`
- [ ] Guardar puntaje en los 5 juegos con leaderboard (asteroids, tetris,
      arkanoid, snake, frogger) → cada fila queda en su tabla con el alias del
      perfil **y** espejada en `global_scores` (valida los 10 triggers)
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
publicación de Realtime. Las cuentas de `auth.users` **no** se borran (viven en
otro schema): si quieres partir de cero del todo, elimínalas desde
Authentication → Users. Después, volver al paso 2.

**Ojo:** en cuanto haya puntajes reales de jugadores, esto deja de ser un
rollback y pasa a ser una pérdida de datos.

---

## Cambios futuros

Mientras no exista una carpeta `supabase/migrations/`, **producción no se
sincroniza sola**. El flujo para cualquier cambio de esquema es:

1. Aplicarlo en desarrollo como siempre (spec → `/spec-impl` → `apply_migration`).
2. Reflejar el mismo cambio en `supabase/prod/bootstrap.sql`, manteniéndolo
   idempotente y en la sección que le corresponde.
3. Actualizar los conteos esperados de `supabase/prod/verify.sql` si cambió el
   número de tablas, policies, funciones o triggers.
4. Aplicar en producción: el `alter`/`create` concreto en el SQL Editor, o el
   bootstrap completo (es idempotente, pero no borra lo que ya no debería estar —
   un `drop policy` viejo hay que ejecutarlo a mano).

Cuando el ritmo de cambios haga esto pesado, la salida natural es migrar al
Supabase CLI: `supabase link` + `supabase db push` contra cada proyecto, con las
migraciones versionadas en el repo. Este archivo y `bootstrap.sql` serían
entonces el punto de partida de la migración inicial.

## Endurecimiento opcional

`bootstrap.sql` reproduce los grants de desarrollo tal cual, incluido
`grant insert ... to anon` en las 5 tablas de puntajes. Ese permiso **no sirve de
nada hoy**: ninguna policy de `INSERT` admite al rol `anon`, así que RLS lo frena
igual. Es un resto de las specs 06/08, anteriores a que existiera autenticación.

Si quieres cerrarlo, en **ambos** proyectos (para que no diverjan):

```sql
revoke insert on "arcade-vault".asteroids_scores from anon;
revoke insert on "arcade-vault".tetris_scores    from anon;
revoke insert on "arcade-vault".arkanoid_scores  from anon;
revoke insert on "arcade-vault".snake_scores     from anon;
revoke insert on "arcade-vault".frogger_scores   from anon;
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
