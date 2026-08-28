# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

**Arcade Vault** es una plataforma para jugar minijuegos arcade online y competir por puntuación. Es una app en Español (todos los textos de UI, nombres de rutas y datos de ejemplo están en Español).

El proyecto se desarrolla con **Spec Driven Design**, usando los comandos `/spec` y `/spec-impl` provistos por los skills de https://github.com/Klerith/fernando-skills (instalados vía `npx skills@latest add Klerith/fernando-skills`). El flujo esperado es: escribir/actualizar una spec, luego implementarla con `/spec-impl`, en lugar de codear features directamente sin pasar por ese proceso.

## Estado actual del código

`app/` ya implementa el MVP de pantallas visuales de Arcade Vault (spec `specs/01-mvp-pantallas-visuales.md`), traducido desde el mockup de referencia a Next.js/React 19 idiomático:

- `app/data/games.ts` — datos mock migrados (`GAMES`, `CATS`, `PLAYERS`, `seededScores`), tipados.
- `lib/storage.ts` / `lib/auth-context.tsx` — helpers de `localStorage` (`av_user`, `av_scores`) y `AuthProvider`/`useAuth()` (sesión simulada en cliente, vía `useSyncExternalStore`).
- `components/nav.tsx` — barra de navegación con drawer móvil.
- `app/page.tsx` + `components/library.tsx` + `components/game-card.tsx` — Biblioteca (`/`): buscador, chips de categoría, grid con tilt 3D.
- `app/games/[id]/page.tsx` — Detalle de un juego (ficha + leaderboard, `notFound()` si el `id` no existe).
- `app/games/[id]/play/page.tsx` + `components/game-player.tsx` — Reproductor (HUD, CRT decorativo, guardado simulado de puntaje).
- `app/auth/page.tsx` — Auth: login/registro simulado + invitado.
- `app/salon/page.tsx` — Salón de la Fama: tabs por juego, podio y tabla.

Ningún motor de juego real, backend, base de datos ni persistencia agregada de puntajes está implementado todavía (ver "Out of scope" en la spec 01); son candidatos para futuras specs.

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
