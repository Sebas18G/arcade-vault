# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

**Arcade Vault** es una plataforma para jugar minijuegos arcade online y competir por puntuación. Es una app en Español (todos los textos de UI, nombres de rutas y datos de ejemplo están en Español).

El proyecto se desarrolla con **Spec Driven Design**, usando los comandos `/spec` y `/spec-impl` provistos por los skills de https://github.com/Klerith/fernando-skills (instalados vía `npx skills@latest add Klerith/fernando-skills`). El flujo esperado es: escribir/actualizar una spec, luego implementarla con `/spec-impl`, en lugar de codear features directamente sin pasar por ese proceso.

Para **agregar un juego nuevo al catálogo** el flujo tiene un paso previo: el agente `game-planner` decide _qué_ juego encaja (ver "Agentes" más abajo), el skill `/add-game <id>` convierte esa decisión en una spec, y `/spec-impl NN-slug` la implementa.

## Estado actual del código

`app/` implementa Arcade Vault siguiendo las specs aprobadas hasta ahora (`specs/01` a `specs/07`, todas en estado Implementado), traducido desde el mockup de referencia a Next.js/React 19 idiomático:

- `app/data/games.ts` — datos mock migrados (`GAMES`, `CATS`, `PLAYERS`, `seededScores`), tipados. Los `id` de los 3 juegos con motor real son `asteroids`, `tetris` y `arkanoid` (coinciden con el nombre del motor/carpeta en `components/games/`, no con los nombres en Español del mockup original — renombrados en spec 06 a pedido explícito, ver esa spec).
- `lib/storage.ts` / `lib/auth-context.tsx` — helpers de `localStorage` (`av_user`, `av_scores`) y `AuthProvider`/`useAuth()` (sesión simulada en cliente, vía `useSyncExternalStore`).
- `lib/supabase/client.ts` / `lib/supabase/server.ts` — clientes de Supabase (navegador/servidor) conectados al proyecto ya referenciado en `.mcp.json` (spec 04), configurados con `db: { schema: "arcade-vault" }` — cualquier tabla nueva debe crearse en `"arcade-vault"` (con el schema entre comillas dobles en SQL, por el guion) o quedará invisible para `supabase-js`/PostgREST aunque exista y sea consultable por SQL directo. Todavía sin auth real ni edge functions.
- `lib/supabase/types.ts` — tipos de las filas de las tablas de leaderboards (`GameRow`, `AsteroidsScoreRow`, `TetrisScoreRow`, `ArkanoidScoreRow`, `GlobalScoreRow`; spec 06).
- `components/nav.tsx` — barra de navegación con drawer móvil; incluye breakpoints (`<480px`/`<400px`) para que logo + botón de sesión + hamburguesa no desborden en viewports angostos.
- `app/page.tsx` + `components/home.tsx` — Home/landing (spec 02).
- `app/games/page.tsx` + `components/library.tsx` + `components/game-card.tsx` — Biblioteca (`/games`): buscador, chips de categoría, grid con tilt 3D.
- `app/games/[id]/page.tsx` — Detalle de un juego (`notFound()` si el `id` no existe). Para `asteroids`/`tetris`/`arkanoid` la sección "MEJORES PUNTUACIONES" hace fetch server-side (`lib/supabase/server.ts`) del top-12 real de la tabla de scores correspondiente y "Mejor global" usa el puntaje real más alto cuando existe (spec 06); los otros 5 juegos siguen con `seededScores`/`game.best` estático.
- `app/games/[id]/play/page.tsx` + `components/game-player.tsx` — Reproductor (HUD, CRT decorativo). Para las entradas `asteroids`, `tetris` y `arkanoid` del catálogo monta un motor de canvas real (spec 05) con leaderboard propio persistido en Supabase (spec 06, ver abajo); los otros 5 juegos (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen con puntaje simulado vía `setInterval` y guardado en `av_scores` (`localStorage`), sin cambios. `GameOverModal` (dentro de `game-player.tsx`) maneja el guardado/lectura de los 3 juegos reales de forma asíncrona, con estado de carga y error inline si Supabase falla, sin bloquear "JUGAR DE NUEVO"/"SALIR". `GamePlayer` también posee el estado de `skin` (default seguro para SSR, corregido post-montaje desde `localStorage`) y expone un control "SKIN" en la fila de stats del HUD junto a Jugador/Puntuación/Vidas/Nivel — el canvas lo recibe como prop controlada en vez de manejarlo internamente (spec 07). Ese control ya no está gateado por `isTetris`: se renderiza para cualquier juego presente en el registro `SKINS_BY_GAME` de `game-player.tsx` (hoy `tetris` con sus 4 skins propias, y `asteroids` y `snake` con las 3 compartidas), y la preferencia se lee/escribe vía `SKIN_STORAGE`, que delega en el `leaderboard.ts` de cada juego con la clave `"<gameId>-skin"`. El control "TEMA" (claro/oscuro) sigue siendo **exclusivo de Tetris**, que es el único con CSS Module de tema.
- `components/games/` — games index + per-game, rutas como: 'arkanoid', 'asteroids', 'snake','tetris' y mas (busca la referencia 'references/implemented-games.md') cuando se necesite implementar un juego tienes la lista.
- `components/games/shared/skins.ts` — contrato de skins compartido: el tipo `GameSkin` (`classic` / `retro` / `neon`), `GAME_SKINS` (valores en inglés, etiquetas de UI en Español) y el validador `isGameSkin()`. `GameCanvasProps` (en `shared/types.ts`) declara `skin?: GameSkin` como **opcional**, porque `arkanoid` todavía no está migrado. Un juego "tiene skins" cuando cumple las tres cosas: `skins.ts` con las paletas, `setSkin()` en su `engine.ts` y prop `skin` en su `<id>-canvas.tsx` propagada al motor. Al día de hoy lo cumplen `asteroids` y `snake` (las 3 compartidas) y `tetris` (4 propias: `retro`, `neon`, `pastel`, `pixel`, anteriores al contrato y con su propio tipo `TetrisSkin`). En `snake` la **cuadrícula es parte de la paleta**, no un valor fijo: `SnakePalette` lleva sub-objetos `grid` (estilo `lines`/`dots`, color, grosor, tamaño de punto) y `board` (marco del tablero y su brillo), y `drawGrid()` despacha entre `drawGridLines()` y `drawGridDots()`. Reglas: la skin `classic` debe reproducir exactamente el aspecto original del juego; los motores reciben la paleta por `setSkin()` y **nunca** leen `document`/`window`/`localStorage`; las preferencias de skin van a `localStorage` desde el `leaderboard.ts` del juego, nunca a Supabase.
- `app/salon/page.tsx` — Salón de la Fama (spec 06): un tab por cada juego con motor real (`asteroids`/`tetris`/`arkanoid`, construidos desde la tabla `games` de Supabase, no desde `GAMES`), con top-12 real por juego, "TU MEJOR MARCA" con datos reales si hay sesión, y suscripción Realtime (`postgres_changes`) que inserta/reordena puntajes nuevos en vivo sin recargar. No hay un tab "GLOBAL" (se probó y se quitó por redundante con los tabs por juego — ver Decisions de spec 06); los 5 juegos simulados no tienen tab (siguen jugables normalmente, solo sin esta tabla).
- `app/about/page.tsx` + `components/about.tsx` — Acerca de (spec 03).
- `app/api/contact/route.ts` — ruta de servidor que envía el formulario de contacto por correo real vía Resend (spec 03).

Persistencia en Supabase (spec 06): 5 tablas en el schema `arcade-vault` — `games` (catálogo mínimo id/title, solo para los 3 juegos reales), `asteroids_scores`/`tetris_scores`/`arkanoid_scores` (una por juego, historial completo de partidas) y `global_scores` (poblada automáticamente por trigger `AFTER INSERT` en cada tabla de juego, no consultada actualmente por ningún componente pero disponible para un futuro resumen cross-juego). RLS habilitado: `SELECT` público en las 5; `INSERT` público solo en las 3 tablas de juego (con `check` de `player_name` 1–10 caracteres y `score >= 0`); `user_id` nullable, siempre `null` (no hay auth real todavía). Auth real, migrar los puntajes viejos de `localStorage`, validación anti-cheat de puntajes y persistencia para los 5 juegos simulados todavía no están implementados; son candidatos para futuras specs.

**Dos proyectos de Supabase.** Desarrollo (`okqmxxqnmcqpqzusnype`) es el que expone el MCP de `.mcp.json` y el único donde se usa `apply_migration`. Producción es un proyecto aparte que **no** está conectado al MCP: se opera desde el dashboard con los scripts de `supabase/prod/` (`bootstrap.sql` recrea el esquema completo de cero, `verify.sql` lo comprueba), siguiendo `references/migracion-produccion.md`. No hay `supabase/migrations/` ni CLI, así que **producción no se sincroniza sola**: todo cambio de esquema aplicado en dev hay que reflejarlo también en `bootstrap.sql` y aplicarlo a mano en producción. Al crear una función nueva, revocarle `EXECUTE` a `public` y no solo a `anon`/`authenticated` (Postgres se lo concede a `PUBLIC` por defecto y esos roles lo heredan de ahí).

`references/game-suggestion-todo.md` es la **bitácora de juegos candidatos**: la memoria persistente del agente `game-planner` (tabla índice + una ficha por juego, con estados `Candidato natural` / `Sugerido` / `Aceptado` / `Descartado` / `Implementado`). El agente la lee antes de evaluar y la actualiza al terminar, para no volver a proponer lo ya descartado. Es editable a mano: cambiar el estado de una ficha ahí veta o rehabilita ese juego en la siguiente corrida.

`references/skin-status.md` es la **bitácora de skins**: la memoria persistente del agente `skin-designer` (tabla índice + una ficha por juego, con estados `Cumple` / `Pendiente` / `Exento`), con las paletas ya decididas y sus razones de contraste. Estado actual: `asteroids` y `snake` **Cumplen**, `tetris` **Exento**, `arkanoid` **Pendiente**. También es editable a mano; si contradice al código, gana el código.

`references/templates/` contiene el **mockup/diseño de referencia** original de la app: un prototipo standalone en HTML + React 18 (vía CDN, con Babel standalone, sin build step) que define la UI, las pantallas y los datos de ejemplo. Se mantiene como fuente de verdad histórica para diseño visual y copy en Español al escribir nuevas specs:

- `Arcade Vault.html` — shell HTML que carga React/ReactDOM/Babel desde `unpkg` y cada `.jsx` como script `type="text/babel"`.
- `data.jsx` — datos mock: catálogo `GAMES` (id, título, categoría, color de neón, mejor puntaje, jugadas), `CATS` (categorías de filtro) y `seededScores` (generador determinista de tablas de puntajes para el Salón de la Fama).
- `app.jsx` — componente raíz `App`: enrutamiento manual basado en `location.hash` (serializa `{ name, ...params }` como JSON en el hash) y estado de usuario persistido en `localStorage` (`av_user`). Los puntajes jugados se guardan en `localStorage` bajo `av_scores`.
- `nav.jsx` — barra de navegación (`Nav`) con menú responsive (drawer móvil).
- `biblioteca.jsx` — pantalla `Library`: catálogo/grid de juegos (`GameCard`), pantalla inicial (ruta `biblioteca`).
- `detalle.jsx` — pantalla `GameDetail`: ficha de un juego (ruta `detalle`, param `id`).
- `reproductor.jsx` — pantalla `GamePlayer`: donde se juega el minijuego y se guarda el puntaje (ruta `player`, param `id`).
- `auth.jsx` — pantalla `Auth`: login/registro simulado (ruta `auth`).
- `salon.jsx` — pantalla `HallOfFame`: tabla de puntajes (ruta `salon`).
- `styles.css` — estética retro/neón (fuente pixel `Press Start 2P`, monoespaciadas, variables CSS de color por juego), ya portado a `app/globals.css`.

Al implementar nuevas features en `app/`, seguir usando `references/templates/` como fuente de verdad para diseño visual, copy en Español, nombres de pantallas/rutas y forma de los datos — pero traduciendo la arquitectura a componentes de Next.js/React 19 idiomáticos (no copiar el enrutamiento por hash ni los scripts Babel-en-navegador tal cual).

## Skills Usa /frontend-design para diseñar interfaces de usuario.

## Agentes

- **`game-planner`** (`.claude/agents/game-planner.md`) — decide **qué** minijuego agregar al catálogo, evaluándolo contra los criterios de encaje de la plataforma, y devuelve un brief técnico. No escribe código ni specs. Su memoria persistente es `references/game-suggestion-todo.md`, donde registra lo sugerido, aceptado y descartado para no repetirse entre sesiones. Cadena completa: `game-planner` (qué juego) → `/add-game <id>` (genera la spec) → `/spec-impl NN-slug` (la implementa).
- **`skin-designer`** (`.claude/agents/skin-designer.md`) — audita que cada juego con motor real tenga las 3 skins obligatorias (`classic` por defecto, `retro` y `neon`), legibles sobre el fondo oscuro de la app, y **las implementa** en **un** juego por corrida. Alcance cerrado: los juegos marcados `Implementado` en `references/game-suggestion-todo.md`. Tetris queda exento (su `retro` hace de clásico y ya tiene `neon`). Su memoria persistente es `references/skin-status.md`. Es una excepción consciente al flujo Spec Driven Design: edita código directamente, sin pasar por `/spec`.
- **`game-jam`** (`.claude/agents/game-jam.md`) — dado un juego a implementar, escribe sus specs completas listas para `/spec-impl`. No escribe código. Ojo: su definición apunta a `specs/game-jam/<game-id>/` (carpeta en singular, inexistente); la carpeta real del repo es `specs/games-jam/` con numeración global continua, y `/spec-impl-game` se lo corrige por prompt al invocarlo.

El comando **`/spec-impl-game <spec> <juego-siguiente>`** (`.claude/skills/spec-impl-game/SKILL.md`) es la variante de `/spec-impl` para specs de juegos: lee `.claude/skills/spec-impl/SKILL.md` y ejecuta sus mismas 4 fases (con la búsqueda extendida a `specs/games-jam/`), y al terminar la implementación encadena **en secuencia, nunca en paralelo** `skin-designer` (skins del juego recién implementado, previa promoción de su ficha a `Implementado` en `references/game-suggestion-todo.md`) y después `game-jam` (specs del juego siguiente). No puede invocar `/spec-impl` con la tool `Skill` porque ese skill tiene `disable-model-invocation: true`; por eso lo lee en vez de llamarlo.

## Comandos

```bash
npm run dev      # servidor de desarrollo (Next.js, con Turbopack por defecto en Next 16)
npm run build    # build de producción
npm run start    # sirve el build de producción
npm run lint     # ESLint (eslint.config.mjs, flat config basado en eslint-config-next)
```

No hay un test runner configurado en `package.json` todavía.

## Stack y configuración

- **Next.js 16** (App Router, carpeta `app/`), **React 19**, **TypeScript** con `strict: true`.
- **Tailwind CSS v4** vía `@tailwindcss/postcss` (sin `tailwind.config.js`; configuración de theme inline en `app/globals.css` con `@theme inline`).
- Alias de import `@/*` → raíz del proyecto (`tsconfig.json`).
- ESLint usa flat config extendiendo `eslint-config-next/core-web-vitals` y `eslint-config-next/typescript`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
