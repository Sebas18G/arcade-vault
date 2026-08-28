# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es este proyecto

**Arcade Vault** es una plataforma para jugar minijuegos arcade online y competir por puntuación. Es una app en Español (todos los textos de UI, nombres de rutas y datos de ejemplo están en Español).

El proyecto se desarrolla con **Spec Driven Design**, usando los comandos `/spec` y `/spec-impl` provistos por los skills de https://github.com/Klerith/fernando-skills (instalados vía `npx skills@latest add Klerith/fernando-skills`). El flujo esperado es: escribir/actualizar una spec, luego implementarla con `/spec-impl`, en lugar de codear features directamente sin pasar por ese proceso.

## Estado actual del código

- `app/` contiene todavía el boilerplate por defecto de `create-next-app` (Next.js App Router). **No** es la implementación real de Arcade Vault todavía.
- `resources/templates/` contiene el **mockup/diseño de referencia** de la app real: un prototipo standalone en HTML + React 18 (vía CDN, con Babel standalone, sin build step) que define la UI, las pantallas y los datos de ejemplo que la implementación en Next.js debe reproducir/migrar:
  - `Arcade Vault.html` — shell HTML que carga React/ReactDOM/Babel desde `unpkg` y cada `.jsx` como script `type="text/babel"`.
  - `data.jsx` — datos mock: catálogo `GAMES` (id, título, categoría, color de neón, mejor puntaje, jugadas), `CATS` (categorías de filtro) y `seededScores` (generador determinista de tablas de puntajes para el Salón de la Fama).
  - `app.jsx` — componente raíz `App`: enrutamiento manual basado en `location.hash` (serializa `{ name, ...params }` como JSON en el hash) y estado de usuario persistido en `localStorage` (`av_user`). Los puntajes jugados se guardan en `localStorage` bajo `av_scores`.
  - `nav.jsx` — barra de navegación (`Nav`) con menú responsive (drawer móvil).
  - `biblioteca.jsx` — pantalla `Library`: catálogo/grid de juegos (`GameCard`), pantalla inicial (ruta `biblioteca`).
  - `detalle.jsx` — pantalla `GameDetail`: ficha de un juego (ruta `detalle`, param `id`).
  - `reproductor.jsx` — pantalla `GamePlayer`: donde se juega el minijuego y se guarda el puntaje (ruta `player`, param `id`).
  - `auth.jsx` — pantalla `Auth`: login/registro simulado (ruta `auth`).
  - `salon.jsx` — pantalla `HallOfFame`: tabla de puntajes (ruta `salon`).
  - `styles.css` — estética retro/neón (fuente pixel `Press Start 2P`, monoespaciadas, variables CSS de color por juego).

Al implementar features en `app/` (Next.js real), usar `resources/templates/` como fuente de verdad para diseño visual, copy en Español, nombres de pantallas/rutas y forma de los datos — pero traduciendo la arquitectura a componentes de Next.js/React 19 idiomáticos (no copiar el enrutamiento por hash ni los scripts Babel-en-navegador tal cual).

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
