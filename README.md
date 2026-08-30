## Arcade Vault

Plataforma para jugar minijuegos arcade online y competir por la mayor cantidad de puntos. App en Español, construida con Next.js 16 (App Router), React 19 y TypeScript.

## Estado del proyecto

Las specs `01` a `05` (`specs/`) ya están implementadas:

- Biblioteca, Detalle, Reproductor, Auth y Salón de la Fama (spec 01).
- Home/landing en `/` (spec 02).
- Acerca de + formulario de contacto con envío real de correo vía Resend (spec 03).
- Conexión a Supabase — clientes de navegador/servidor listos, todavía sin tablas propias ni auth real (spec 04).
- Motores reales de **Asteroids**, **Tetris** y **Arkanoid** (entradas `rocas`, `caida` y `bloque-buster` del catálogo), portados a canvas/React desde `references/started_games/`, con su propio leaderboard en `localStorage` para Asteroids/Tetris (spec 05).

Los otros 5 juegos del catálogo siguen con un reproductor simulado (`setInterval` + guardado en `av_scores`). Sesión de usuario y esos puntajes se guardan vía `localStorage`; todavía no hay backend con persistencia real ni base de datos con tablas propias.

`references/templates/` contiene el mockup HTML/React standalone original, usado como referencia de diseño para nuevas specs.

## Comandos

```bash
npm run dev      # servidor de desarrollo (Turbopack)
npm run build    # build de producción
npm run start    # sirve el build de producción
npm run lint     # ESLint
```

## Usa Spec Driven Design

Basado en `/spec` y `/spec-impl`.

Siguiendo las buenas prácticas recomendadas aquí:
https://github.com/Klerith/fernando-skills

El flujo esperado es: escribir/actualizar una spec en `specs/`, luego implementarla con `/spec-impl`, en vez de codear features directamente.

## Skills usadas

```bash
npx skills@latest add Klerith/fernando-skills

npx skills add https://github.com/anthropics/skills --skill frontend-design
```
