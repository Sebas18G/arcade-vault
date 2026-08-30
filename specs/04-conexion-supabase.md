# SPEC 04 — Conexión a Supabase

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-08-29
> **Objective:** Conectar la aplicación Next.js al proyecto de Supabase ya referenciado en `.mcp.json` instalando los paquetes oficiales y creando clientes de navegador/servidor reutilizables, sin crear tablas ni implementar features (auth, tiempo real, edge functions) todavía.

## Why this spec exists

`.mcp.json` ya apunta a un proyecto Supabase real (`okqmxxqnmcqpqzusnype`), pero el código de la app no tiene ningún paquete de Supabase instalado ni forma de conectarse a él. Esta spec es deliberadamente angosta: deja la plomería de conexión lista y verificada para que specs futuras (auth real, puntajes en tiempo real, edge functions) puedan construir sobre una base ya probada, en vez de mezclar "conectar el SDK" con "implementar una feature" en un solo cambio grande.

## Scope

**In:**

- Instalar los paquetes oficiales `@supabase/supabase-js` y `@supabase/ssr` (dependencias nuevas de `package.json`).
- Crear `lib/supabase/client.ts`: factory `createClient()` que instancia un cliente de Supabase para **Client Components** (navegador), usando `createBrowserClient` de `@supabase/ssr`.
- Crear `lib/supabase/server.ts`: factory `createClient()` (async) que instancia un cliente de Supabase para **Server Components / Route Handlers**, usando `createServerClient` de `@supabase/ssr` con el adaptador de cookies de `next/headers`.
- Variables de entorno nuevas, documentadas en `.env.example` (sin valores reales): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `.env.local` (no versionado) con los valores **reales** del proyecto `okqmxxqnmcqpqzusnype`, obtenidos vía las herramientas MCP de Supabase (`get_project_url`, `get_publishable_keys`): URL del proyecto y la publishable key moderna (`sb_publishable_...`, no la legacy `anon` JWT).
- Verificación manual de la conexión: página temporal `app/debug/supabase/page.tsx` (Server Component) que usa el cliente de servidor y llama a `supabase.auth.getSession()` (no requiere tablas) para confirmar que no hay error de red/credenciales. Se elimina en el último paso del plan, una vez verificada.

**Out of scope (for future specs):**

- Crear cualquier tabla, esquema o política RLS en la base de datos. Esta spec no usa `list_tables`, `apply_migration` ni ninguna herramienta de esquema.
- Autenticación real (login/registro con Supabase Auth). El login/registro simulado (`av_user` en `localStorage`, `lib/auth-context.tsx`) no se toca.
- Migrar los puntajes (`av_scores` en `localStorage`) o el catálogo de juegos (`app/data/games.ts`) a Supabase.
- `middleware.ts` para refrescar tokens de sesión (patrón típico de `@supabase/ssr` con auth). No aplica todavía porque no hay auth real en esta spec; se agrega en la spec que implemente login con Supabase.
- Tiempo real (`supabase.channel`, `postgres_changes`) y Edge Functions. Mencionados por el usuario como motivación a futuro, pero no se implementan aquí.
- Tests automatizados (no hay test runner configurado todavía).
- Actualizar `CLAUDE.md` con el nuevo estado (se hace en un commit posterior, como en specs anteriores).

## Data model

Esta spec no introduce estructuras de datos ni tablas. Solo define las variables de entorno de conexión:

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

```bash
# .env.local (no versionado)
NEXT_PUBLIC_SUPABASE_URL=https://okqmxxqnmcqpqzusnype.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Ambas variables llevan el prefijo `NEXT_PUBLIC_` porque son seguras de exponer en el navegador: la publishable key está diseñada para usarse en cliente (equivalente moderno de la legacy `anon` key) y siempre queda sujeta a las políticas RLS del proyecto, que en esta spec ni siquiera existen (no hay tablas).

## Implementation plan

1. Instalar los paquetes: `npm install @supabase/supabase-js @supabase/ssr`.
2. Crear `.env.example` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vacías.
3. Crear `.env.local` (no versionado) con los valores reales del proyecto, obtenidos vía las herramientas MCP `get_project_url` y `get_publishable_keys` sobre el proyecto `okqmxxqnmcqpqzusnype`.
4. Crear `lib/supabase/client.ts` exportando `createClient()`, que llama a `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)` de `@supabase/ssr`.
5. Crear `lib/supabase/server.ts` exportando un `createClient()` async que arma el adaptador de cookies con `cookies()` de `next/headers` y llama a `createServerClient` de `@supabase/ssr` (misma URL/key), siguiendo el patrón oficial de Supabase para Next.js App Router.
6. Crear `app/debug/supabase/page.tsx`: Server Component que instancia el cliente de `lib/supabase/server.ts`, llama a `supabase.auth.getSession()` y renderiza si la llamada tuvo éxito o el error, para verificar manualmente la conexión en el navegador (`/debug/supabase`).
7. Verificación manual: correr `npm run dev`, visitar `/debug/supabase` y confirmar que no hay error de conexión (la sesión será `null` porque no hay usuario logueado, pero la llamada no debe fallar por credenciales/URL inválidas).
8. Eliminar `app/debug/supabase/page.tsx` (y la carpeta `app/debug/` si queda vacía) una vez verificado el paso anterior.
9. Correr `npm run lint` y `npm run build` sin errores como cierre de la spec.

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen como dependencias en `package.json`.
- [ ] `.env.example` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores reales.
- [ ] `.env.local` (no versionado) contiene los valores reales del proyecto `okqmxxqnmcqpqzusnype` y no aparece en `git status` como archivo trackeado.
- [ ] `lib/supabase/client.ts` exporta un `createClient()` funcional para Client Components.
- [ ] `lib/supabase/server.ts` exporta un `createClient()` funcional para Server Components/Route Handlers, usando cookies de `next/headers`.
- [ ] Al visitar `/debug/supabase` durante el paso de verificación manual, la llamada a `supabase.auth.getSession()` no lanza error de red ni de credenciales.
- [ ] `app/debug/supabase/page.tsx` no existe en el estado final del repo (se eliminó tras la verificación).
- [ ] No se creó ninguna tabla, migración ni política RLS en el proyecto de Supabase.
- [ ] `npm run lint` y `npm run build` terminan sin errores.

## Decisions

- **Sí:** instalar tanto `@supabase/supabase-js` como `@supabase/ssr`, aunque esta spec no implemente auth. Decisión explícita del usuario para dejar el patrón oficial de Next.js App Router (cliente navegador + cliente servidor con cookies) listo para specs futuras.
- **Sí:** separar `lib/supabase/client.ts` y `lib/supabase/server.ts` en archivos distintos (no un único `lib/supabase.ts`). Pedido explícito del usuario.
- **Sí:** usar la publishable key moderna (`sb_publishable_...`) en vez de la legacy `anon` JWT. Es la recomendada por Supabase para proyectos nuevos (mejor seguridad, rotación independiente); la legacy queda disponible en el dashboard si hiciera falta en el futuro.
- **Sí:** cargar `.env.local` con valores reales obtenidos vía MCP (`get_project_url`, `get_publishable_keys`) en esta misma spec, en vez de dejarlo como paso manual del usuario. Decisión explícita del usuario ("vamos a colocar ambas"): tanto `.env.example` (documentación) como `.env.local` (valores reales) se completan aquí.
- **No:** crear tablas, esquemas o políticas RLS. Pedido explícito del usuario ("lo único que quiero es la conexión, nada de creación de tablas").
- **No:** implementar autenticación real, tiempo real o edge functions en esta spec. El usuario los mencionó como motivación futura ("por ahora conectar supabase, en un futuro para real time y edge functions"), pero quedan fuera del alcance actual.
- **No:** agregar `middleware.ts` para refresco de sesión. Es parte del patrón de auth de `@supabase/ssr`, pero no aplica sin auth real implementada todavía.
- **No:** mantener `app/debug/supabase/page.tsx` como ruta permanente. Es solo un artefacto de verificación manual del plan; se elimina para no dejar una ruta de diagnóstico sin propósito de producto expuesta en el repo.

## Risks

| Risk                                                                                                                                                    | Mitigation                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.local` con la publishable key real podría commitearse por error.                                                                                  | `.env.local` ya está cubierto por el `.gitignore` de Next.js (como en la spec 03); se verifica con `git status` antes de cualquier commit de esta spec.                                                                               |
| La verificación con `getSession()` siempre resuelve exitosamente incluso si la URL/key fueran inválidas en algunos casos de red, dando falsa confianza. | Si `/debug/supabase` no muestra error pero hay dudas, se puede complementar con una llamada de red directa (ej. `fetch` al endpoint REST de Supabase) antes de eliminar la página de debug; no se automatiza como parte de esta spec. |
| Specs futuras de auth podrían necesitar reestructurar `lib/supabase/server.ts` (ej. agregar `middleware.ts` para refresco de tokens).                   | Aceptado: esta spec deja la base de conexión, no el flujo de auth completo; la spec de auth futura ajustará lo que haga falta.                                                                                                        |

## What is **not** in this spec

- Creación de tablas, esquemas o políticas RLS.
- Autenticación real con Supabase Auth (login/registro).
- Migración de puntajes (`av_scores`) o catálogo de juegos (`app/data/games.ts`) a Supabase.
- `middleware.ts` de refresco de sesión.
- Tiempo real y Edge Functions.
- Tests automatizados.
- Actualización de `CLAUDE.md` reflejando esta spec como implementada.

Cada uno de estos, si se necesita, va en su propia spec futura.
