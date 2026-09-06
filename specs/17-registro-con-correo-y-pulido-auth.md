# SPEC 17 — Arreglar el registro con correo y pulir la pantalla de acceso

> **Status:** Aprobado
> **Depends on:** SPEC 12, SPEC 13
> **Date:** 2026-09-06
> **Objective:** Dejar que crear una cuenta con correo + contraseña funcione de punta a punta —alias incluido y sesión activa al instante— moviendo la creación del perfil a un trigger de `auth.users`, cerrando el hueco del login sin perfil, y puliendo la tarjeta de `/auth` dentro de su estética retro/neón actual.

## Why this spec exists

Hoy en Arcade Vault **solo se puede entrar con Google o con GitHub**. El registro con correo y contraseña está roto, y el fallo es reproducible y está diagnosticado:

**1. "Confirm email" sigue activado en Supabase.** El paso 0 de la spec 12 pedía desactivarlo y nunca se ejecutó. La evidencia está en la base de datos de desarrollo: el único usuario con `provider = 'email'` se creó a las `04:10:25` y se confirmó a las `04:10:50` — 25 segundos después, o sea que hubo un clic en un enlace de correo. Los dos usuarios de OAuth, en cambio, tienen `created_at` y `confirmed_at` idénticos al milisegundo.

**2. Con la confirmación activa, `signUp()` devuelve `data.session === null`** y `app/auth/page.tsx:79` corta ahí con el mensaje _"La cuenta se creó pero la sesión no quedó activa. Inicia sesión con tu correo y contraseña."_ — y **nunca ejecuta el `insert` en `profiles`**. El alias que el jugador acaba de escribir se pierde.

**3. `signIn()` no comprueba si hay perfil.** Cuando ese mismo usuario vuelve y entra con correo + contraseña, `app/auth/page.tsx:53` hace `router.replace(next)` sin más. Queda autenticado y sin alias. Se salva de raspón porque `requirePlayer()` (spec 12/13) sí redirige a `/auth/alias` al entrar a una ruta protegida, pero mientras tanto el nav lo muestra como anónimo (`lib/auth-context.tsx` pone `user = null` cuando no hay fila en `profiles`) y `/games` lo deja navegando en un limbo sin identidad. En la base de datos se ve el remiendo: el perfil `SEBASN8N` se creó **7 minutos después** de la cuenta, a mano desde `/auth/alias`.

OAuth funciona porque Google y GitHub entregan el correo ya verificado, así que la sesión existe al volver, y `app/auth/callback/route.ts` sí consulta `profiles` y desvía a `/auth/alias` cuando falta.

El arreglo de fondo no es apagar un toggle y ya: mientras la fila de `profiles` la inserte el cliente en un segundo paso, la ventana "usuario en `auth.users` sin perfil" sigue existiendo cada vez que ese segundo paso no llega a ejecutarse. Esta spec mueve esa creación a un trigger de la base de datos, que es el único lugar donde puede ser atómica con el alta del usuario.

## Scope

**In:**

- **Desactivar "Confirm email"** en el dashboard de Supabase de **desarrollo** (Authentication → Sign In / Providers → Email). Paso manual, no automatizable desde el repo.
- **Función y trigger `"arcade-vault".handle_new_user()`**, `AFTER INSERT` sobre `auth.users`: si `raw_user_meta_data->>'username'` viene con valor, normaliza a MAYÚSCULAS y crea la fila de `"arcade-vault".profiles`. Si no viene (el caso de OAuth), no hace nada y el flujo de `/auth/alias` sigue igual que hoy. Nace con `security definer`, `set search_path = ''` y sin `EXECUTE` para `public`/`anon`/`authenticated`, como exige `CLAUDE.md`.
- **`app/auth/page.tsx` — registro:** `signUp()` pasa el alias en `options.data.username` y **deja de insertar en `profiles`** (lo hace el trigger). El bloque de "sesión no activa" se conserva como fail-safe pero pasa a mandar a `/auth/alias` en vez de dejar al usuario en un mensaje sin salida.
- **`app/auth/page.tsx` — login:** tras `signInWithPassword()` se consulta `profiles`; sin fila, `router.replace("/auth/alias?next=…")`. Cierra el hueco descrito arriba.
- **`app/auth/page.tsx` — errores:** `translateAuthError()` gana el caso `database error saving new user` → _"Ese alias ya está tomado o no es válido. Elige otro."_, que es como se manifiesta un choque de `unique` cuando el fallo ocurre dentro del trigger.
- **Chequeo de alias como aviso, no como garantía:** el `select` sobre `profiles` se conserva en el registro para dar feedback inmediato, con un comentario explícito de que es solo UX — la garantía real es el `unique` de la tabla.
- **Pulido visual de `/auth` y `/auth/alias`**, dentro de la estética actual (`auth-card`, `auth-tabs`, `auth-divider`, `social` en `app/globals.css:1351-1470`), sin replantear el layout:
  - Botón de mostrar/ocultar contraseña dentro del campo.
  - Estado de carga por botón: solo el botón pulsado muestra spinner; los demás quedan deshabilitados sin cambiar su texto.
  - Validación del alias en vivo: contador `n/10` y color del borde según si cumple 3–10 caracteres.
  - Iconos SVG inline de Google y GitHub en lugar de `◆` y `▣`.
  - Mensajes de error con más contraste y `role="alert"`.
- **`supabase/prod/bootstrap.sql`**: se añade la función y el trigger nuevos, en su sección correspondiente, para que producción quede completa cuando el usuario la migre a mano.

**Out of scope (for future specs):**

- Aplicar nada en el proyecto de **producción**. Esta spec deja el SQL en `bootstrap.sql` y el usuario lo migra manualmente cuando decida; el toggle de "Confirm email" de producción ya está documentado en `references/migracion-produccion.md` (Paso 4).
- Recuperación de contraseña (`resetPasswordForEmail` y su pantalla). Sigue fuera de alcance como en la spec 12.
- Pantalla de cuenta/perfil y cambio de alias (lo bloquea `profiles_freeze_username` desde la spec 13).
- Rediseñar el layout de `/auth` (columnas, arte de fondo, animaciones de entrada). Si se quiere, va en su propia spec con `/frontend-design`.
- Confirmación de correo, verificación de identidad, 2FA.
- Providers OAuth distintos de Google y GitHub.
- Validación anti-cheat de puntajes y cota superior de `score`.
- Corregir o reclamar los perfiles y puntajes ya existentes: se quedan como están.
- Tests automatizados (no hay test runner configurado todavía).
- Actualizar `CLAUDE.md` (se hace en un commit posterior, como en specs anteriores).

## Data model

No se crean tablas ni columnas. Se agrega una función y un trigger; `"arcade-vault".profiles` no cambia de forma.

```sql
-- Crea el perfil en el mismo momento en que nace el usuario, así no existe una
-- ventana en la que auth.users tenga una fila sin alias por un segundo paso del
-- cliente que no llegó a ejecutarse.
--
-- Solo actúa si el alta trae username en los metadatos: es el caso del registro
-- por correo, donde el jugador ya lo escribió. En OAuth no viene, la función no
-- hace nada, y /auth/callback sigue mandando a /auth/alias como hasta ahora.
create or replace function "arcade-vault".handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- Toda función nueva nace sin EXECUTE para los roles del cliente (spec 13).
-- Postgres se lo concede a PUBLIC por defecto y anon/authenticated lo heredan
-- de ahí, así que revocárselo solo a ellos no quitaría nada.
revoke execute on function "arcade-vault".handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function "arcade-vault".handle_new_user();
```

El `check (char_length(username) between 3 and 10)` y el `unique` de `profiles` siguen siendo la única fuente de verdad de la validez del alias. Si el alias está tomado o no cumple la longitud, el `insert` del trigger falla, la transacción del alta se revierte completa y **no queda un usuario huérfano en `auth.users`** — GoTrue devuelve entonces un error genérico (`database error saving new user`), que la UI traduce.

```ts
// app/auth/page.tsx — el alias viaja en los metadatos del alta, no en un
// insert posterior.
const { data, error } = await supabase.auth.signUp({
  email: email.trim(),
  password: pass,
  options: { data: { username } },
});
```

Los 3 usuarios y 3 perfiles existentes no se tocan: el trigger solo gobierna las altas posteriores a esta spec.

## Implementation plan

1. **Paso manual del usuario, previo a todo lo demás:** en el dashboard de Supabase de **desarrollo** (`okqmxxqnmcqpqzusnype`), Authentication → Sign In / Providers → Email, desactivar **"Confirm email"**. Verificación: registrar un correo de prueba desde `/auth` y comprobar en `auth.users` que `created_at` y `email_confirmed_at` coinciden al milisegundo (hoy difieren en 25 s).
2. Migración SQL vía `apply_migration`: crear `"arcade-vault".handle_new_user()` con `security definer` + `set search_path = ''`, revocarle `EXECUTE` a `public`/`anon`/`authenticated`, y crear el trigger `on_auth_user_created` `AFTER INSERT` sobre `auth.users`. Verificación: `select tgname from pg_trigger where tgrelid = 'auth.users'::regclass` devuelve `on_auth_user_created`; `get_advisors type=security` no reporta lints nuevos.
3. Reflejar exactamente esa función y ese trigger en `supabase/prod/bootstrap.sql`, en las secciones donde ya viven `enforce_player_name`/`freeze_username` y sus triggers, respetando el estilo idempotente del archivo (`create or replace` + `drop trigger if exists`). Verificación: el archivo sigue siendo re-ejecutable de principio a fin sin error.
4. Actualizar el registro en `app/auth/page.tsx`: `signUp()` con `options.data.username`, eliminar el `insert` en `profiles`, y cambiar la rama de "sesión no activa" para que redirija a `/auth/alias` en lugar de dejar un mensaje sin salida. Marcar el `select` previo del alias como aviso de UX con un comentario. Verificación manual: crear una cuenta nueva y comprobar que aparece en `auth.users` **y** en `profiles` en el mismo instante, y que el navegador aterriza directamente en `next` con el alias ya activo en el nav.
5. Cerrar el hueco del login en `app/auth/page.tsx`: tras `signInWithPassword()` consultar `profiles` y, si no hay fila, `router.replace("/auth/alias?next=…")` con el `next` ya pasado por `safeNext()`. Verificación manual: entrar con una cuenta sin perfil aterriza en `/auth/alias`, no en `/games`.
6. Añadir a `translateAuthError()` el caso `database error saving new user` → _"Ese alias ya está tomado o no es válido. Elige otro."_. Verificación manual: intentar registrarse con un alias ya existente burlando el aviso previo (dos pestañas en paralelo) muestra ese mensaje y **no** crea el usuario.
7. Pulido visual de `app/auth/page.tsx` y `app/auth/alias/page.tsx` + los estilos de `app/globals.css:1351-1470`: mostrar/ocultar contraseña, spinner solo en el botón pulsado, contador y borde de validación del alias en vivo, iconos SVG de Google y GitHub, errores con `role="alert"` y más contraste. Verificación: la tarjeta conserva su marco neón, sus tabs y su divisor; se revisa en escritorio y en un viewport de 360 px.
8. Verificación final end-to-end (ver criterios de aceptación) más `npm run lint` y `npm run build`.

## Acceptance criteria

- [ ] Crear una cuenta desde `/auth` con usuario + correo + contraseña deja sesión activa **sin** correo de confirmación, y crea en el mismo instante una fila en `auth.users` y otra en `"arcade-vault".profiles` con el alias en MAYÚSCULAS.
- [ ] Tras ese registro, el navegador aterriza en la ruta `next` (o `/games`) con el alias ya visible en el nav, sin pasar por `/auth/alias`.
- [ ] En `auth.users`, el usuario recién creado tiene `created_at` y `email_confirmed_at` iguales (ya no difieren como el usuario `email` actual).
- [ ] Registrarse con un alias ya tomado no crea usuario en `auth.users` (la transacción se revierte) y muestra un mensaje en Español, tanto si lo atrapa el aviso previo como si lo atrapa el trigger.
- [ ] Registrarse con un alias de menos de 3 o más de 10 caracteres es rechazado antes de llamar a `signUp()`.
- [ ] Iniciar sesión con correo + contraseña con una cuenta **sin** fila en `profiles` redirige a `/auth/alias`, y el `next` original se conserva al terminar de elegir el alias.
- [ ] Iniciar sesión con una cuenta **con** perfil sigue yendo directo a `next` sin pasar por `/auth/alias`.
- [ ] Entrar por primera vez con Google o con GitHub sigue redirigiendo a `/auth/alias` (el trigger no interfiere: OAuth no manda `username` en los metadatos), y en el segundo login entra directo.
- [ ] Los 3 perfiles ya existentes conservan su `username` y sus puntajes siguen visibles en `/games/<id>` y en `/salon`.
- [ ] `handle_new_user` no es invocable como RPC por `anon` ni por `authenticated`, y `get_advisors type=security` no reporta ningún lint sobre ella.
- [ ] `supabase/prod/bootstrap.sql` contiene la función y el trigger nuevos, y el archivo completo sigue siendo re-ejecutable sobre una base ya migrada sin error.
- [ ] El campo de contraseña tiene un control de mostrar/ocultar que funciona en ambas tabs.
- [ ] Al pulsar un botón, solo ese botón muestra el estado de carga; los otros quedan deshabilitados sin cambiar de texto.
- [ ] El campo de alias muestra el contador de caracteres y cambia de borde al cumplir 3–10, tanto en `/auth` como en `/auth/alias`.
- [ ] Los botones sociales muestran los logos SVG de Google y GitHub, no `◆` ni `▣`.
- [ ] La tarjeta conserva su estética retro/neón (marco, tabs, divisor "O CONTINÚA CON") y no desborda en un viewport de 360 px.
- [ ] `npm run build` termina sin errores; `npm run lint` no introduce errores nuevos respecto al estado actual del repo.

## Decisions

- **Sí:** se desactiva "Confirm email" en desarrollo. Es lo que la spec 12 ya había decidido y documentado ("es un portal de arcade; la fricción del correo de verificación cuesta más registros de lo que aporta"), solo que su paso 0 nunca se ejecutó. Se descartó rediseñar el flujo alrededor de la confirmación (pantalla "revisa tu correo" + ruta de confirmación + creación diferida del perfil): son cuatro piezas nuevas que dependen del SMTP por defecto de Supabase, fuertemente limitado en envíos por hora.
- **Sí:** el perfil lo crea un **trigger `AFTER INSERT` sobre `auth.users`**, no el cliente. Es el único punto donde la creación del perfil es atómica con el alta del usuario. Con el `insert` en el cliente, cualquier corte entre los dos pasos —red, cierre de pestaña, sesión que no llega— deja un usuario sin alias, que es exactamente el estado en el que está hoy la cuenta de correo existente.
- **Sí:** el trigger **no hace nada** cuando no viene `username` en los metadatos. Es lo que mantiene intacto el camino de OAuth: Google y GitHub no pueden aportar un alias de arcade de 3–10 caracteres, y derivar uno del correo daría un `SEBASN8NTE` autogenerado, que la spec 12 ya descartó por peor experiencia que una pantalla de un solo campo.
- **Sí:** el `select` previo del alias **se conserva**, pero degradado a aviso de UX. Con el trigger, un choque de `unique` ya no llega como un `23505` legible sobre `profiles`, sino como un error genérico de GoTrue al fallar el alta entera. Ver "ese alias ya está tomado" mientras se escribe es mucho mejor que verlo después de enviar el formulario. La garantía sigue siendo el `unique`, no el `select`: el aviso puede perder una carrera y no pasa nada.
- **Sí:** se traduce también el `database error saving new user`, aunque sea un texto genérico de Supabase que podría cambiar entre versiones. El fallback de `translateAuthError()` ("No se pudo completar la operación") ya cubre el caso de que cambie, así que el riesgo de la traducción específica es que deje de acertar, no que rompa nada.
- **Sí:** el chequeo de perfil tras el login vive en `app/auth/page.tsx`, no en `proxy.ts`. El portero corre en cada request que matchee y consultar `profiles` ahí añadiría un viaje a la base por request protegida; además `getClaims()` está elegido justamente para no pagar red en el portero. La red de seguridad para quien llega a una ruta protegida sin perfil ya existe y es `requirePlayer()`.
- **Sí:** se descartó el RPC `alias_disponible(text)`. Permitiría cerrar el `SELECT` público de `profiles` en el futuro, pero hoy ese `SELECT` es público **por diseño** (el Salón de la Fama lee aliases ajenos) y la spec 13 decidió explícitamente no restringirlo. Un RPC nuevo es superficie nueva que endurecer, a cambio de nada que se necesite hoy.
- **Sí:** la rama de "sesión no activa" tras `signUp()` se conserva aunque con la confirmación desactivada no debería dispararse nunca. Si alguien vuelve a encender el toggle, el usuario acaba en `/auth/alias` —donde puede terminar de configurarse— en vez de en un mensaje sin salida.
- **Sí:** el pulido visual se queda dentro de la tarjeta actual. Los cinco cambios elegidos (contraseña visible, carga por botón, validación en vivo, logos reales, contraste de error) son los que quitan fricción real al registro; mover el layout es otra conversación y merece `/frontend-design` en su propia spec.
- **No:** no se aplica nada en producción en esta spec. El SQL queda en `supabase/prod/bootstrap.sql` para que el usuario lo migre a mano, que es como se opera ese proyecto (no está conectado al MCP). Se descartó dejar producción sin el cambio en `bootstrap.sql`: sería exactamente la desincronización que `CLAUDE.md` advierte.
- **No:** no entra recuperación de contraseña. Sigue siendo la misma dependencia del SMTP limitado que la mantuvo fuera de la spec 12, y esta spec ya toca registro, login y perfil.
- **No:** no se corrigen las cuentas existentes. El único perfil creado a destiempo (`SEBASN8N`, 7 minutos después de su cuenta) ya está bien formado; no hay nada que reparar.

## Risks

| Risk                                                                                                                                                         | Mitigation                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un fallo dentro de `handle_new_user()` revierte el alta completa: si la función tiene un bug, **nadie puede registrarse por ningún método**, OAuth incluido. | La función devuelve `new` sin tocar nada cuando no hay `username`, así que el camino de OAuth ni siquiera entra en la lógica de `insert`. Los criterios de aceptación exigen probar los tres caminos (correo, Google, GitHub) antes de dar la spec por terminada. |
| El error de alias duplicado llega como texto genérico de GoTrue y no como código, así que la traducción depende de un mensaje que Supabase puede cambiar.    | El aviso previo atrapa el caso normal; el mensaje traducido solo cubre la carrera. Si el texto cambiara, cae al fallback genérico de `translateAuthError()` y el usuario sigue viendo un error en Español, solo que menos específico.                             |
| El paso 1 es manual y fuera del repo. Si no se ejecuta, `signUp()` sigue sin devolver sesión y el registro sigue roto pese al trigger.                       | Con el trigger, el escenario degradado ya es mejor que hoy: el perfil se crea igual, así que el alias no se pierde. El criterio de aceptación de `created_at` = `email_confirmed_at` verifica el toggle de forma objetiva.                                        |
| `set search_path = ''` obliga a calificar cada nombre; un descuido rompe la función solo en tiempo de ejecución, es decir en el primer registro real.        | El cuerpo califica los dos objetos que usa (`"arcade-vault".profiles` y las columnas de `NEW`). El paso 4 del plan lo verifica en la práctica: si estuviera mal, el registro fallaría de inmediato.                                                               |
| `supabase/prod/bootstrap.sql` y el proyecto de producción quedan desincronizados hasta que el usuario ejecute la migración a mano.                           | Es una decisión explícita del usuario, y el archivo es idempotente: se puede pegar completo en el SQL Editor cuando toque. `references/migracion-produccion.md` ya cubre el toggle de Auth en el Paso 4.                                                          |

## What is **not** in this spec

- Aplicar los cambios en el proyecto de producción de Supabase.
- Recuperación de contraseña y su pantalla de reseteo.
- Pantalla de cuenta/perfil y flujo legítimo de cambio de alias.
- Rediseño del layout de `/auth`.
- Confirmación de correo, verificación de identidad, 2FA.
- Providers OAuth distintos de Google y GitHub.
- Validación anti-cheat de puntajes.
- Corregir o reclamar perfiles y puntajes ya existentes.
- Tests automatizados.
- Actualización de `CLAUDE.md` reflejando esta spec como implementada.

Cada uno de estos, si se necesita, va en su propia spec futura.
