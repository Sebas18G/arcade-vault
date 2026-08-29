# SPEC 02 — Home (landing)

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-08-28
> **Objective:** Implementar en Next.js la pantalla Home (landing) del mockup de referencia (`references/home-about/home.jsx`), moviendo la Biblioteca de `/` a `/games` y actualizando la navegación y los enlaces cruzados para reflejar ese nuevo ruteo.

## Scope

**In:**

- Nueva ruta `/` → **Home** (landing): hero con siluetas flotantes decorativas, CTAs, sección "¿Por qué Arcade Vault?" (4 feature cards), rail de juegos destacados (`GAMES.slice(0, 6)`), sección de stats, sección "Actividad en Vivo" (dos columnas: últimas puntuaciones + top jugadores), sección de precios (plan único gratis + FAQ) y CTA final — traducidos desde `references/home-about/home.jsx`.
- Mover la Biblioteca actual de `/` a `/games` (mismo componente `components/library.tsx`, sin cambios de contenido).
- Actualizar `components/nav.tsx` para agregar el enlace "Inicio" (`/`) al nav existente (Biblioteca, Salón de la Fama), tanto en el nav de escritorio como en el drawer móvil, y renombrar el destino de "Biblioteca" de `/` a `/games`.
- Actualizar todos los enlaces/redirecciones que hoy apuntan a `/` como "volver al catálogo" para que apunten a `/games`: `app/games/[id]/page.tsx` ("VOLVER AL VAULT"), `components/game-player.tsx` ("VOLVER AL VAULT"), `app/salon/page.tsx` ("VOLVER A LA BIBLIOTECA"), `app/auth/page.tsx` (redirect tras login/registro/invitado).
- Migrar a `app/globals.css` la sección `/* ===== HOME PAGE ===== */` de `references/home-about/styles.css` (selectores `.home*`, `.hero-*`, `.feature-*`, `.mini-*`, `.stat-*`, `.activity-*`, `.top-*`, `.tick-*`, `.pricing-*`, `.price-*`, `.faq-*`, `.reveal`), verbatim salvo ajustes de sintaxis si aplica.
- Reveal-on-scroll (clase `.reveal` + `IntersectionObserver`) en Home, igual que el mockup.

**Out of scope (for future specs):**

- La pantalla **Acerca de** (`references/home-about/about.jsx`, ruta `/about`, formulario de contacto, highlights, etc.). Queda completamente fuera de esta spec y se abordará en una spec propia.
- Derivar los datos de "Actividad en Vivo" (últimas puntuaciones, top jugadores) de `GAMES`/`PLAYERS`/`seededScores`. Quedan como arrays literales hardcodeados, copiados del mockup.
- Rediseño visual: no se cambia nada del diseño ya definido en `references/home-about/home.jsx`.
- Tests automatizados (no hay test runner configurado todavía).
- Actualizar `CLAUDE.md` con el nuevo estado implementado (se hace en un commit posterior, como en spec 01).

## Data model

No se introducen estructuras de datos nuevas. Se reutiliza `GAMES` de `app/data/games.ts` (sin cambios) para el rail de juegos destacados de Home. Los datos de la sección "Actividad en Vivo" (ticker de últimas puntuaciones y top jugadores) son arrays literales definidos dentro de `components/home.tsx`, copiados tal cual del mockup — no se leen de `app/data/games.ts` ni de `localStorage`.

## Implementation plan

1. Migrar a `app/globals.css` la sección CSS `HOME PAGE` de `references/home-about/styles.css` (verificado sin colisión de nombres de clase con el CSS actual).
2. Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (renderiza `<Library />`), dejando el sistema con la Biblioteca accesible en `/games` y `/` todavía sirviendo la Biblioteca (paso transitorio funcional).
3. Crear `components/home.tsx` (client component) traduciendo `references/home-about/home.jsx`: siluetas SVG decorativas, hero con CTAs (`Link` a `/games` y `/auth`), reveal-on-scroll vía `useEffect` + `IntersectionObserver`, feature grid con iconos SVG inline, mini-rail de `GAMES.slice(0, 6)` (cada `MiniCard` envuelta en `Link` a `/games/[id]`), sección de stats, sección de actividad en vivo (ticker de puntuaciones a la izquierda, top jugadores a la derecha con `Link` "VER SALÓN →" a `/salon`), sección de precios (CTA a `/auth`) y CTA final (`Link` a `/games`).
4. Reemplazar `app/page.tsx` para que renderice `<Home />` en vez de `<Library />` (la Biblioteca ya vive en `/games` desde el paso 2).
5. Actualizar `components/nav.tsx`: agregar el enlace "Inicio" (`/`) en el nav de escritorio y en el drawer móvil; actualizar `isActive` para distinguir `home` (`pathname === "/"`) de `biblioteca` (`pathname === "/games"` o `pathname.startsWith("/games/")`); actualizar el `href` de los enlaces "Biblioteca" de `/` a `/games`.
6. Actualizar los enlaces/redirecciones que hoy apuntan a `/` como "volver al catálogo": `app/games/[id]/page.tsx` ("VOLVER AL VAULT" → `/games`), `components/game-player.tsx` ("VOLVER AL VAULT" → `/games`), `app/salon/page.tsx` ("VOLVER A LA BIBLIOTECA" → `/games`), `app/auth/page.tsx` (los dos `router.push("/")` tras login/registro e invitado → `/games`).
7. Revisión final: recorrer manualmente Home → Biblioteca (`/games`) → Detalle → Reproductor → Salón → Auth → logout, verificando que el nav resalta el enlace activo correcto en cada ruta; correr `npm run lint` y `npm run build` sin errores.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/` muestra la pantalla Home (hero "EL ARCADE CLÁSICO ESTÁ DE VUELTA", siluetas flotantes, CTAs "EXPLORAR JUEGOS" y "CREAR CUENTA").
- [ ] `/games` muestra la Biblioteca (mismo comportamiento de buscador, chips y grid que antes en `/`).
- [ ] En Home, "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" y el CTA final navegan a `/games`.
- [ ] En Home, "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`.
- [ ] En Home, cada card del rail de juegos destacados navega a `/games/[id]` con el `id` correcto.
- [ ] En Home, "VER SALÓN →" navega a `/salon`.
- [ ] La sección "Actividad en Vivo" de Home muestra dos columnas: últimas puntuaciones (izquierda) y top jugadores (derecha), con los datos de ejemplo del mockup.
- [ ] Las secciones marcadas `reveal` en Home aparecen con la animación de aparición al hacer scroll hasta ellas.
- [ ] El `Nav` muestra los enlaces Inicio, Biblioteca y Salón de la Fama en escritorio y en el drawer móvil, y resalta como activo el que corresponde a la ruta actual (incluyendo `/games/[id]` y `/games/[id]/play` resaltando "Biblioteca").
- [ ] "VOLVER AL VAULT" desde Detalle y desde el Reproductor navegan a `/games`.
- [ ] "VOLVER A LA BIBLIOTECA" desde el Salón navega a `/games`.
- [ ] Iniciar sesión, registrarse o entrar como invitado desde `/auth` redirige a `/games`.

## Decisions

- **Sí:** `/` pasa a renderizar Home (landing) y la Biblioteca se muda a `/games`. Esto reemplaza explícitamente la decisión de spec 01 ("la home (/) renderiza la Biblioteca directamente"). Justificación del usuario: un landing en `/` es la convención estándar para cualquier producto web.
- **Sí:** los datos de "Actividad en Vivo" (últimas puntuaciones y top jugadores) quedan hardcodeados como arrays literales dentro de `components/home.tsx`, copiados del mockup, sin derivarse de `GAMES`/`PLAYERS`/`seededScores`. Justificación del usuario: son puramente decorativos; moverlos a `app/data/` añadiría estructura sin beneficio real hasta que exista un backend que los respalde.
- **Sí:** todos los enlaces que antes apuntaban a `/` como "volver al catálogo" (VOLVER AL VAULT, VOLVER A LA BIBLIOTECA, redirect post-login/invitado de Auth) se actualizan a `/games`, ya que semánticamente representan volver al catálogo de juegos, no a la landing de marketing.
- **No:** la pantalla Acerca de (`about.jsx`) queda fuera de esta spec por pedido explícito del usuario; se abordará en una spec futura independiente.
- **No:** no se modifica `app/data/games.ts` ni `lib/storage.ts` — no se necesitan estructuras de datos nuevas para esta spec.

## Risks

| Risk                                                                 | Mitigation                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Mover la Biblioteca de `/` a `/games` puede dejar enlaces internos o externos rotos apuntando a `/` esperando el catálogo. | Paso 6 audita explícitamente todos los enlaces "volver al catálogo" existentes; una búsqueda final de `href="/"` en el repo antes de cerrar la spec confirma que solo Home/logo apuntan ahí. |
| Migrar CSS nuevo a `app/globals.css` podría chocar con clases existentes si el archivo cambió desde esta spec. | Verificado sin colisión de nombres de clase al momento de escribir esta spec; repetir la verificación (`grep`) antes de pegar el CSS si el archivo fue editado por otra spec en el ínterin. |
| El nav de referencia (`nav.jsx`) incluye también "Acerca de", que no existe todavía en esta spec. | El paso 5 agrega solo "Inicio" al nav actual (Biblioteca, Salón); "Acerca de" se agrega en la spec futura que implemente `/about`, junto con su propio ajuste de `isActive`. |

## What is **not** in this spec

- La pantalla Acerca de (`/about`, formulario de contacto, highlights).
- Derivación de los datos de actividad en vivo a partir de datos reales del catálogo o de puntuaciones.
- Rediseño visual más allá de lo ya definido en `references/home-about/home.jsx`.
- Tests automatizados.
- Actualización de `CLAUDE.md` reflejando esta spec como implementada.

Cada uno de estos, si se necesita, va en su propia spec futura.
