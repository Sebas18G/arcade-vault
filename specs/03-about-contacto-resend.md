# SPEC 03 — Acerca de + contacto con Resend

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-08-28
> **Objective:** Implementar la pantalla Acerca de (`/about`) traducida fielmente desde `references/home-about/about.jsx`, con un formulario de contacto que envía correos reales mediante la API de Resend a través de una nueva ruta de servidor.

## Why this spec exists

Esta es la primera funcionalidad del proyecto que necesita un backend real (una API route de Next.js que llama a un servicio externo con una API key secreta). Rompe el patrón de las specs 01 y 02, donde todo era estático/`localStorage` en cliente. Por eso conviene dejar explícito qué vive en servidor, qué variables de entorno se necesitan y qué pasa cuando el envío falla — algo que no existía antes en el proyecto.

## Scope

**In:**

- Nueva ruta `/about` → pantalla **Acerca de**, traducida desde `references/home-about/about.jsx`: hero con misión del proyecto, fila de 3 highlights con iconos SVG inline, separador decorativo animado (`about-divider`, `reveal`), y sección de contacto de dos columnas (intro + tips a la izquierda, formulario a la derecha).
- Formulario de contacto (nombre, correo, mensaje) que, al enviarse, hace una petición real a una nueva API route de Next.js (`app/api/contact/route.ts`), la cual usa el SDK de Resend para enviar un correo real.
- Instalar el paquete `resend` (dependencia nueva de `package.json`).
- Variables de entorno nuevas, documentadas en un `.env.example` (sin valores reales): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_TO_EMAIL`. Se usan solo en servidor (sin prefijo `NEXT_PUBLIC_`).
- Estados del formulario: `idle` (formulario visible, igual al mockup), `sending` (deshabilitado con indicador de envío mientras espera la respuesta del `fetch`), `success` (el mismo panel `terminal-success` del mockup, con botón "ENVIAR OTRO MENSAJE" que vuelve a `idle` con campos vacíos), `error` (panel de terminal en variante de error, con el mensaje de fallo y un botón "REINTENTAR" que vuelve a `idle` **sin perder** lo que el usuario ya escribió).
- Validación en el servidor (`app/api/contact/route.ts`): nombre y mensaje no vacíos, y correo con formato válido (regex simple). Si falla, la API responde 400 y el cliente lo trata igual que un error de envío.
- Validación en cliente: se mantiene igual que el mockup (shake + no permite enviar si `name`/`email`/`msg` están vacíos) antes de llamar al `fetch`.
- Actualizar `components/nav.tsx`: agregar el enlace "Acerca de" (`/about`) en el nav de escritorio y en el drawer móvil, y agregar `"about"` a `isActive`.
- Migrar a `app/globals.css` la sección `/* ===== ABOUT PAGE ===== */` de `references/home-about/styles.css` (selectores `.about-*`, `.highlight*`, `.contact-*`, `.terminal-success`, `.shake`) — verificado sin colisión con clases existentes.
- Agregar una variante visual nueva `.terminal-error` en `app/globals.css` (mismo estilo que `.terminal-success` pero con acento rojo/magenta en vez de verde), ya que el mockup original no tiene estado de error — el formulario ahí siempre "funciona" porque no llama a ningún backend real.
- Reveal-on-scroll (clase `.reveal` + `IntersectionObserver`, ya migrada en spec 02) aplicado en `/about` igual que en el mockup.

**Out of scope (for future specs):**

- Protección anti-spam del endpoint de contacto (honeypot, rate limiting, CAPTCHA). Se documenta como riesgo aceptado, no se implementa.
- Persistencia de los mensajes de contacto en alguna base de datos o log estructurado. El único efecto es el envío del correo; si Resend confirma éxito, el mensaje no se guarda en ningún otro lado.
- Verificar un dominio propio en Resend. Se usa `onboarding@resend.dev` como remitente de pruebas; cambiar a un dominio propio es solo actualizar `RESEND_FROM_EMAIL` cuando el usuario lo tenga listo, sin cambios de código.
- Reintentos automáticos o backoff ante fallos de Resend. El botón "REINTENTAR" es una acción manual del usuario, no hay reintento automático.
- Notificaciones o confirmación por correo hacia quien llenó el formulario (solo se le notifica a `CONTACT_TO_EMAIL`, no se le manda copia al remitente del formulario).
- Rediseño visual: no se cambia nada del diseño ya definido en `references/home-about/about.jsx`, salvo el nuevo estado de error descrito arriba (inevitable porque el mockup no contempla un backend real que pueda fallar).
- Tests automatizados (no hay test runner configurado todavía).
- Actualizar `CLAUDE.md` con el nuevo estado implementado (se hace en un commit posterior, como en specs 01 y 02).

## Data model

Esta spec no introduce estructuras de datos persistentes nuevas (no hay `localStorage` ni base de datos involucrados). Sí define la forma del payload entre cliente y servidor:

```ts
// app/api/contact/route.ts

type ContactRequest = {
  name: string;
  email: string;
  msg: string;
};

type ContactResponse =
  | { ok: true }
  | { ok: false; error: string };
```

```bash
# .env.example
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
CONTACT_TO_EMAIL=
```

`.env.local` (no versionado, ya está cubierto por el `.gitignore` de Next.js) es donde el usuario coloca sus valores reales: su `RESEND_API_KEY` y `CONTACT_TO_EMAIL=sebasn8ntest1@gmail.com`.

## Implementation plan

1. Instalar el paquete `resend` (`npm install resend`) y crear `.env.example` con las tres variables documentadas arriba (sin valores reales, salvo el `RESEND_FROM_EMAIL` de pruebas que sí puede quedar como default sugerido).
2. Migrar a `app/globals.css` la sección CSS `ABOUT PAGE` de `references/home-about/styles.css` (`.about-*`, `.highlight*`, `.contact-*`, `.terminal-success`, `.shake`), y agregar la variante nueva `.terminal-error` junto a `.terminal-success`.
3. Crear `app/api/contact/route.ts`: `POST` handler que parsea el body JSON, valida `name`/`msg` no vacíos y `email` con formato válido (400 si falla), y si es válido llama al SDK de `resend` con `from: process.env.RESEND_FROM_EMAIL`, `to: process.env.CONTACT_TO_EMAIL`, `replyTo: email`, y un cuerpo de texto simple con nombre/correo/mensaje. Responde `{ ok: true }` en éxito o `{ ok: false, error }` (500/502) si Resend falla.
4. Crear `components/about.tsx` (client component) traduciendo `references/home-about/about.jsx`: hero + highlights (con `HighlightIcon` SVG inline igual que el mockup), divider decorativo con `reveal`, sección de contacto con `contact-intro` (tips) y el formulario controlado (`name`, `email`, `msg`).
5. Implementar en `components/about.tsx` la máquina de estados del formulario: `idle → sending` al enviar (tras pasar la validación de campos no vacíos, igual que el mockup), `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })`, `sending → success` si la respuesta es `{ ok: true }` (renderiza `terminal-success` como el mockup, con botón "ENVIAR OTRO MENSAJE" que resetea a `idle` con el formulario vacío), `sending → error` si la respuesta es `{ ok: false }` o el `fetch` lanza (renderiza `terminal-error` con el mensaje y un botón "REINTENTAR" que vuelve a `idle` conservando `form` intacto).
6. Crear `app/about/page.tsx` que renderiza `<About />`.
7. Actualizar `components/nav.tsx`: agregar el enlace "Acerca de" (`/about`) en el nav de escritorio y en el drawer móvil, y agregar el caso `"about"` a `isActive` (`pathname === "/about"`).
8. Revisión final: crear `.env.local` local (no versionado) con una API key real de Resend y `CONTACT_TO_EMAIL=sebasn8ntest1@gmail.com`, probar manualmente el envío real (caso éxito) y forzar un caso de error (ej. `RESEND_API_KEY` inválida temporalmente) para verificar el estado `error` y "REINTENTAR"; correr `npm run lint` y `npm run build` sin errores.

## Acceptance criteria

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/about` muestra el hero "ACERCA DE ARCADE VAULT", los 3 highlights, el divisor decorativo y la sección de contacto (intro + tips + formulario), igual que `references/home-about/about.jsx`.
- [ ] Las secciones marcadas `reveal` en `/about` aparecen con la animación de aparición al hacer scroll hasta ellas.
- [ ] Enviar el formulario con algún campo vacío (`name`, `email` o `msg`) aplica el efecto `shake` y no dispara la petición a `/api/contact`.
- [ ] Enviar el formulario completo con datos válidos muestra un estado de envío (`sending`) mientras espera la respuesta.
- [ ] Si `POST /api/contact` responde éxito, se muestra el panel `terminal-success` con el nombre del remitente en mayúsculas, y el botón "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [ ] Si `POST /api/contact` responde error (o la red falla), se muestra el panel `terminal-error` con un mensaje de fallo, y el botón "REINTENTAR" vuelve al formulario **con los datos que el usuario había escrito**.
- [ ] `POST /api/contact` con `name`/`msg` vacíos o `email` con formato inválido responde 400 sin llamar a Resend.
- [ ] `POST /api/contact` con datos válidos y una `RESEND_API_KEY` real configurada en `.env.local` envía un correo real a `CONTACT_TO_EMAIL`, visible en el dashboard de Resend y/o en la bandeja de entrada configurada.
- [ ] El `Nav` muestra el enlace "Acerca de" en escritorio y en el drawer móvil, y lo resalta como activo cuando la ruta actual es `/about`.

## Decisions

- **Sí:** el formulario llama a una API route real (`app/api/contact/route.ts`) que usa el SDK de `resend`, en vez de simular el envío como hace `about.jsx`. Es el pedido explícito del usuario: "vamos a implementar resend para el envío de correos".
- **Sí:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y `CONTACT_TO_EMAIL` viven en variables de entorno de servidor (`.env.local`, no versionado), documentadas en `.env.example` sin valores reales. Es la única forma segura de manejar una API key secreta en Next.js.
- **Sí:** `onboarding@resend.dev` como remitente por defecto (`RESEND_FROM_EMAIL`). El usuario no tiene todavía un dominio verificado en Resend; este remitente de pruebas permite implementar y probar el flujo completo hoy mismo, sin bloquear la spec en un trámite de DNS.
- **Sí:** se agrega un estado `error` nuevo (`terminal-error`) que no existe en el mockup original. Justificación: `about.jsx` es 100% simulado y nunca falla; al conectar un servicio externo real, un fallo (red, API key inválida, límite de Resend) es un caso posible que necesita una UX explícita, no solo un mensaje genérico del navegador.
- **Sí:** el botón "REINTENTAR" conserva los datos ya escritos en el formulario. Evita que el usuario tenga que reescribir su mensaje si el fallo fue transitorio.
- **Sí:** validación de formato de email también en el servidor (no solo `required` como en el mockup), para no gastar llamadas a la API de Resend con datos claramente inválidos.
- **Sí:** se agrega el enlace "Acerca de" al `Nav` en esta misma spec, ya que sin él la ruta `/about` quedaría inaccesible desde la navegación normal.
- **No:** protección anti-spam (honeypot, rate limiting, CAPTCHA). Queda fuera de esta spec por decisión explícita del usuario; se revisita si aparece abuso real.
- **No:** persistir los mensajes de contacto en una base de datos o log propio. El único efecto del envío exitoso es el correo entregado por Resend.
- **No:** verificar un dominio propio en Resend como parte de esta spec. Es un trámite externo (DNS) que el usuario puede hacer después; el código ya queda preparado para el cambio vía `RESEND_FROM_EMAIL`.

## Risks

| Risk                                                                 | Mitigation                                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| El usuario aún no tiene cuenta ni API key de Resend, por lo que el envío real no se puede probar hasta que la cree. | El paso 8 del plan asume que el usuario crea su cuenta y coloca la key en `.env.local` antes de la revisión final; hasta entonces, el flujo se puede validar simulando la respuesta de `/api/contact` manualmente. |
| `onboarding@resend.dev` en modo pruebas de Resend solo entrega a la dirección asociada a la cuenta de Resend del usuario, no a cualquier `CONTACT_TO_EMAIL`. | Documentado en la spec: mientras no haya un dominio verificado, `CONTACT_TO_EMAIL` debe coincidir con el email de la cuenta de Resend usada para generar la API key. |
| Sin protección anti-spam, el endpoint podría recibir envíos automatizados que agoten la cuota gratuita de Resend. | Riesgo aceptado explícitamente en esta spec (ver Decisions); se aborda en una spec futura si ocurre. |
| Migrar CSS nuevo a `app/globals.css` podría chocar con clases existentes si el archivo cambió desde esta spec. | Verificado sin colisión de nombres de clase al momento de escribir esta spec (`.about-*`, `.highlight*`, `.contact-*`, `.terminal-success`, `.shake` no existen todavía en `app/globals.css`); repetir la verificación antes de pegar el CSS si el archivo fue editado por otra spec en el ínterin. |

## What is **not** in this spec

- Protección anti-spam del formulario de contacto (honeypot, rate limiting, CAPTCHA).
- Persistencia de los mensajes de contacto fuera del envío del correo.
- Verificación de un dominio propio en Resend.
- Reintentos automáticos ante fallos de envío.
- Correo de confirmación hacia quien llenó el formulario.
- Rediseño visual más allá del nuevo estado de error, no contemplado en el mockup.
- Tests automatizados.
- Actualización de `CLAUDE.md` reflejando esta spec como implementada.

Cada uno de estos, si se necesita, va en su propia spec futura.
