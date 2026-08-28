# SPEC 01 — MVP de pantallas visuales de Arcade Vault

> **Status:** Draft
> **Depends on:** (ninguna)
> **Date:** 2026-08-27
> **Objective:** Implementar en Next.js (App Router) las cinco pantallas del mockup de referencia (Biblioteca, Detalle, Reproductor, Auth y Salón de la Fama), reproduciendo fielmente su diseño visual, copy y flujos de navegación, sin implementar ningún motor de juego real.

## Scope

**In:**

- Layout raíz (`app/layout.tsx`) completo: envuelve las pantallas con un proveedor de sesión simulada y renderiza `Nav` + footer (hoy solo tiene los fondos `av-bg`/`av-noise`).
- Rutas del App Router, todas en Español:
  - `/` → **Biblioteca** (catálogo con buscador y chips de categoría).
  - `/games/[id]` → **Detalle** del juego (ficha + tabla de mejores puntuaciones).
  - `/games/[id]/play` → **Reproductor** (HUD, pantalla CRT decorativa, modal de fin de partida).
  - `/auth` → **Auth** (login/registro simulado + invitado).
  - `/salon` → **Salón de la Fama** (podio + tabla por juego).
- Sesión de usuario simulada (sin backend): un `AuthProvider` de cliente respaldado por `localStorage` (clave `av_user`), consumido por `Nav` y por Auth/Reproductor.
- Guardado simulado de puntaje al finalizar una partida en `localStorage` (clave `av_scores`), igual que el mockup: se escribe pero **no** se refleja en las tablas mostradas (siguen viniendo de `seededScores`).
- Reproductor con la misma simulación decorativa del mockup: puntaje que sube solo, nivel, vidas, pausa/reanudar, y modal de fin de partida con input de iniciales.
- Buscador y filtro de categorías de la Biblioteca, funcionales en cliente sobre el catálogo estático.
- Migración de los datos mock (`GAMES`, `CATS`, `PLAYERS`, `seededScores`) desde `references/templates/data.jsx` a un módulo TypeScript en `app/data/games.ts`.
- Reutilización de las clases ya portadas en `app/globals.css` (`av-nav`, `card`, `chip`, `crt`, `modal`, etc.); cualquier ajuste de layout nuevo que no exista ahí se resuelve con utilidades de Tailwind v4 directamente en el JSX, no agregando más CSS a `globals.css`.
- Reemplazo del boilerplate de `create-next-app` en `app/page.tsx` por la pantalla Biblioteca real.

**Out of scope (for future specs):**

- Cualquier lógica de juego real (colisiones, físicas, input de teclado/táctil jugable). El Reproductor es 100% decorativo, igual que en el mockup.
- Backend real de autenticación, base de datos o rutas API. Los datos siguen siendo un módulo estático en `app/data/games.ts`.
- Persistencia real de puntuaciones agregadas al Salón de la Fama o al Detalle (las tablas siguen generándose con `seededScores`, determinista por id de juego).
- Sistema de créditos funcional: el contador "CRÉDITOS · 03" del `Nav` permanece estático/decorativo.
- Tests automatizados (no hay test runner configurado en el proyecto todavía).
- Rediseño visual: no se cambia nada del diseño ya definido en el mockup y ya portado a `app/globals.css`.
- Internacionalización o soporte multi-idioma.

## Data model

```ts
// app/data/games.ts
export type Category = "TODOS" | "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: Exclude<Category, "TODOS">;
  cover: string; // nombre de la clase CSS "cover-*" ya definida en globals.css
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
};

export const GAMES: Game[];
export const CATS: Category[];
export const PLAYERS: string[];

export type ScoreRow = { rank: number; name: string; score: number; date: string };
export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// lib/storage.ts
export type UserSession = { name: string } | null;

export function getUser(): UserSession;
export function setUser(user: UserSession): void; // null = invitado/logout, borra la clave
export function addScore(entry: { game: string; score: number; name: string }): void;
```

- `localStorage["av_user"]`: JSON de `UserSession`, igual formato que el mockup.
- `localStorage["av_scores"]`: array JSON de `{ game, score, name, at }`, se solo agrega (append), nunca se lee de vuelta en esta spec.
- `lib/auth-context.tsx` expone un `AuthProvider` (client component) y un hook `useAuth()` que lee/escribe con `lib/storage.ts` y mantiene el estado en memoria para que `Nav` se actualice sin recargar la página.

## Implementation plan

1. Crear `app/data/games.ts` con los tipos de arriba y los datos migrados literalmente desde `references/templates/data.jsx` (`GAMES`, `CATS`, `PLAYERS`, `seededScores`).
2. Crear `lib/storage.ts` con los helpers de `localStorage` (`getUser`, `setUser`, `addScore`) y `lib/auth-context.tsx` con `AuthProvider`/`useAuth` (client component, hidrata el usuario en un `useEffect` tras montar para evitar mismatch de hidratación).
3. Actualizar `app/layout.tsx`: envolver `{children}` con `<AuthProvider>`, renderizar `<Nav />` antes del contenido y un `<footer>` (texto igual al de `app.jsx`) después, manteniendo los divs `av-bg`/`av-noise` ya existentes.
4. Crear `components/nav.tsx` (client component) traduciendo `nav.jsx`: enlaces con `next/link`, estado activo vía `usePathname()`, drawer móvil con el mismo comportamiento, botón "Iniciar Sesión" / `{user.name} ▾` (cierra sesión con `useAuth`), contador de créditos estático.
5. Reemplazar `app/page.tsx` por la pantalla Biblioteca: hero con "ARCADE VAULT" (animación `flicker` ya definida en `globals.css`), buscador y chips de categoría en un client component (`components/library.tsx`), grid de `GameCard` (`components/game-card.tsx`, client component) con efecto tilt 3D al mover el mouse, que enlaza a `/games/[id]`.
6. Crear `app/games/[id]/page.tsx` (Detalle): lee el `id` desde los params de la ruta, busca el juego correspondiente en `GAMES`, llama `notFound()` si no existe, renderiza ficha + `leaderboard` con 10 entradas de `seededScores(id.length * 17 + 3, 10)`, botón "Jugar ahora" a `/games/[id]/play` y "Volver al Vault" a `/`.
7. Crear `app/games/[id]/play/page.tsx` (Reproductor, client component): HUD con nombre del jugador (`useAuth().user?.name ?? "INVITADO"`), puntuación, vidas y nivel; marco CRT decorativo con enemigos/nave estáticos animados por CSS; ticker de puntaje por `setInterval` (igual que `reproductor.jsx`); botón "Pausa"/"Reanudar" que muestra/oculta el overlay de pausa; botón "Fin" que muestra el overlay de game over con campo editable de nombre y botón de guardar (llama a `addScore` de `lib/storage.ts`); botón "Salir" a `/games/[id]` y "Volver al Vault" del overlay a `/`.
8. Crear `app/auth/page.tsx` (Auth): tabs "Iniciar sesión"/"Crear cuenta", botón "Jugar como invitado", el submit llama `useAuth().login(...)` y redirige a `/` con `useRouter().push`.
9. Crear `app/salon/page.tsx` (Salón de la Fama): tabs por juego (`GAMES`), podio top-3 y tabla con `seededScores`, fila "tu mejor marca" solo si `useAuth().user` existe.
10. Revisión final: recorrer manualmente la navegación completa (Biblioteca → Detalle → Reproductor → fin de partida → Salón → Auth → logout), correr `npm run lint` y `npm run build` sin errores.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/` muestra el hero con el texto "ARCADE VAULT" con la animación `flicker`.
- [ ] Seleccionar una categoría en los chips oculta del grid las cards que no pertenecen a esa categoría.
- [ ] Escribir en el buscador filtra las cards por título en tiempo real (sin submit ni recarga).
- [ ] Mover el mouse sobre una card aplica el efecto tilt 3D según la posición del cursor (igual que `biblioteca.jsx`), y se resetea al salir.
- [ ] El botón "JUGAR" de cada `GameCard` navega a `/games/[id]` con el `id` correcto.
- [ ] `/games/[id]` muestra la ficha y el leaderboard correspondientes al `id` de la URL (título, descripción, mejor puntaje y tabla coinciden con ese juego).
- [ ] El leaderboard lateral de `/games/[id]` muestra exactamente 10 entradas generadas con `seededScores`; un `id` inexistente muestra la página 404 de Next.
- [ ] Desde Detalle, "JUGAR AHORA" navega a `/games/[id]/play`.
- [ ] Desde Detalle, "VOLVER AL VAULT" navega a `/`.
- [ ] El HUD de `/games/[id]/play` muestra el nombre del jugador (usuario logueado o "INVITADO"), la puntuación, las vidas y el nivel, y el puntaje sube solo cada ~220ms.
- [ ] El botón "PAUSA" muestra el overlay de pausa y detiene el incremento de puntaje; el mismo botón (ahora "REANUDAR") oculta el overlay y reanuda el incremento.
- [ ] El botón "FIN" muestra el overlay de fin de partida (game over) con el puntaje final.
- [ ] El overlay de game over tiene un campo editable con el nombre del jugador y un botón para guardar el puntaje.
- [ ] Guardar el puntaje escribe una entrada nueva en `localStorage["av_scores"]` (con el nombre editado) y muestra el mensaje de confirmación, sin alterar ninguna tabla visible.
- [ ] El botón "SALIR" navega a `/games/[id]`, y "VOLVER AL VAULT" del overlay de game over navega a `/`.
- [ ] `/auth` permite iniciar sesión con cualquier usuario/contraseña o "Jugar como invitado"; tras hacerlo, `Nav` muestra el nombre de usuario (o vuelve a "Iniciar Sesión" si fue invitado) y persiste tras recargar la página.
- [ ] Cerrar sesión desde `Nav` borra `localStorage["av_user"]` y el botón vuelve a "Iniciar Sesión".
- [ ] `/salon` permite cambiar de juego con los tabs, muestra podio + tabla, y agrega la fila "tu mejor marca" solo cuando hay sesión iniciada.
- [ ] El menú de `Nav` colapsa a drawer móvil por debajo de 840px de ancho, igual que el mockup.

## Decisions

- **Sí:** el Reproductor replica la simulación decorativa del mockup (puntaje automático, sin juego real). Es lo que ya existe en `reproductor.jsx`; no es un motor de juego, es la pieza visual a reproducir.
- **No:** pantalla de Reproductor estática/congelada. Se descartó porque el flujo completo (jugar → fin de partida → guardar puntaje) es parte del valor visual del mockup.
- **Sí:** persistencia real en `localStorage` para sesión y puntajes guardados (claves `av_user` / `av_scores`), igual que el mockup. Permite probar el flujo completo y que sobreviva a un reload.
- **Sí:** login/registro simulado sin backend ni validación real, incluyendo "Jugar como invitado".
- **Sí:** datos mock en un módulo TypeScript estático (`app/data/games.ts`), sin rutas API. Eventualmente vendrán de una base de datos, pero no en esta spec.
- **Sí:** rutas en Español para Auth y Salón (`/auth`, `/salon`), consistente con que toda la UI de Arcade Vault está en Español.
- **Sí (excepción explícita):** Detalle y Reproductor viven bajo el prefijo en inglés `/games/[id]` y `/games/[id]/play`, por pedido puntual del usuario, aunque rompe la convención de rutas en Español del resto de la app.
- **Sí:** la home (`/`) renderiza la Biblioteca directamente, sin redirect intermedio a `/biblioteca`.
- **Sí:** reutilizar `app/globals.css` (ya migrado del mockup casi literal) para todo el diseño existente; usar utilidades Tailwind v4 solo para lo que no esté ya cubierto ahí, en vez de seguir agregando CSS custom.
- **Sí:** reemplazar el boilerplate de `create-next-app` (`app/page.tsx`) por la Biblioteca real; `app/layout.tsx` ya fue adaptado parcialmente (fuentes + fondos) y se completa en el paso 3.
- **No:** exponer los datos mock vía route handlers (`app/api/...`). Se descartó por ser innecesario para un MVP solo visual sin backend.

## Risks

| Risk                                                                 | Mitigation                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Leer `localStorage` durante el render del servidor rompe la hidratación | `AuthProvider` inicializa el usuario en `useEffect` (solo cliente) y renderiza "sin sesión" hasta montar. |
| `localStorage` deshabilitado (modo privado)                          | Los helpers de `lib/storage.ts` envuelven cada acceso en try/catch; si falla, la sesión/puntaje simplemente no persiste pero la UI sigue funcionando. |

## What is **not** in this spec

- Cualquier lógica de juego real o jugable (colisiones, físicas, input).
- Backend, base de datos o rutas API para datos, autenticación o puntuaciones.
- Persistencia real de puntuaciones en las tablas del Salón de la Fama o Detalle.
- Sistema de créditos funcional.
- Tests automatizados.
- Rediseño visual más allá de lo ya definido en el mockup.

Cada uno de estos, si se necesita, va en su propia spec futura.
