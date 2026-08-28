## Arcade Vault

Plataforma para jugar minijuegos arcade online y competir por la mayor cantidad de puntos. App en Español, construida con Next.js 16 (App Router), React 19 y TypeScript.

## Estado del proyecto

El **MVP de pantallas visuales** (Biblioteca, Detalle, Reproductor, Auth y Salón de la Fama) ya está implementado siguiendo `specs/01-mvp-pantallas-visuales.md`. Sesión de usuario y puntajes guardados son simulados vía `localStorage`; todavía no hay backend, base de datos ni motor de juego real (ver la sección "Out of scope" de la spec).

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
