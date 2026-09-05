---
name: spec-impl-game
description: Implementa una spec de juego siguiendo exactamente el mismo flujo que /spec-impl y, al terminar la implementación, encadena en secuencia los agentes skin-designer y game-jam.
disable-model-invocation: true
argument-hint: <NN-slug | games-jam/NN-slug> <juego-siguiente>
---

# /spec-impl-game — Implementa una spec de juego y encadena skin-designer → game-jam

## Session context

Estado actual del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs de nivel superior:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Specs de game jam:
!`ls specs/games-jam/ 2>/dev/null || echo "specs/games-jam/ no existe"`

Configuración de creación de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, sin archivo de config)"`

Fecha de hoy (úsala para la bitácora, nunca la inventes):
!`date +%F`

Juegos con motor real ya en el repo:
!`ls components/games/ 2>/dev/null || echo "components/games/ no existe"`

---

## Qué es este comando

`/spec-impl-game` es la variante de `/spec-impl` para las specs de **juegos**. Hace exactamente lo mismo que `/spec-impl` — no reimplementa sus fases, **las lee y las ejecuta** — y cuando la implementación termina, encadena dos agentes **en secuencia, nunca en paralelo**:

1. **`skin-designer`** — le da al juego recién implementado sus 3 skins obligatorias.
2. **`game-jam`** — escribe las specs del **siguiente** juego que se quiere implementar.

Escribes y respondes **en Español**, igual que el resto del proyecto.

## Argumentos

`$ARGUMENTS` trae dos valores separados por espacio:

| Posición | Valor                               | Ejemplo                      |
| -------- | ----------------------------------- | ---------------------------- |
| 1º       | La spec a implementar               | `games-jam/09-frogger-motor` |
| 2º       | El juego siguiente, para `game-jam` | `invasores`                  |

El 1º es obligatorio. El 2º puede faltar: en ese caso se pregunta en la Fase 6, no se inventa.

---

## Fase 0 — Delegar en /spec-impl (obligatorio, en cada invocación)

Lee **`.claude/skills/spec-impl/SKILL.md` completo, en vivo, ahora**. No trabajes desde una memoria cacheada de su contenido ni desde el resumen de este archivo: ese archivo es la única fuente de verdad de las 4 fases.

Ejecuta sus **Fases 1 a 4 tal cual**, con estos dos únicos ajustes:

1. **Fase 1 — localizar la spec.** La búsqueda se extiende a `specs/games-jam/`, no solo a `specs/`. Acepta cualquiera de estas formas del primer argumento: `games-jam/09-frogger-motor`, `09-frogger-motor`, `09` o `frogger-motor`. Si el mismo número existe en las dos carpetas, muestra las dos rutas y pide que se desambigüe. Si no encuentras nada, lista ambas carpetas y pide que se corrija el nombre.

2. **Fase 3 — nombre de rama.** Sigue siendo `spec-NN-slug`, derivado del **nombre del archivo** sin extensión y **sin el prefijo de carpeta**:
   - `specs/games-jam/09-frogger-motor.md` → rama `spec-09-frogger-motor`
   - `specs/08-snake-supabase.md` → rama `spec-08-snake-supabase`

**Todo lo demás se hereda sin cambios y no se reescribe aquí:** el bloqueo si el estado no significa "Approved" en cualquier idioma, el chequeo del árbol de trabajo sucio antes de cambiar de rama, el flag `AutoCreateBranch`, el resumen de objetivo/alcance/plan/criterios antes de empezar, la implementación paso a paso con pausa para revisar el diff en cada paso, y la regla de **nunca commitear automáticamente**.

> **Regla dura:** si la Fase 2 heredada bloquea (estado `Draft`, `Implementado`, no reconocido…), este comando **termina ahí**. Muestras el mensaje de error estándar de `/spec-impl` y **no lanzas ningún agente**. Las specs de game jam nacen `Draft` a propósito: aprobarlas es decisión del humano.

Solo cuando el **último paso** del plan de implementación quedó completo y confirmado por el usuario, pasas a la Fase 5.

---

## Fase 5 — Resolver el game-id y promover la bitácora

1. **Resuelve el `<game-id>`.** Léelo de las rutas `components/games/<id>/` que la propia spec nombra, y contrástalo con la lista de `components/games/` del session context. Si no puedes resolverlo con certeza, **dilo y pregunta**; no lo adivines a partir del slug del archivo.

2. **Recuerda los criterios de aceptación**, con el mensaje de cierre de `/spec-impl`:

   ```
   ✅ Todos los pasos del plan están implementados.

   Siguiente paso: verificar los criterios de aceptación de la spec uno por uno.
   Si todos pasan, actualiza el estado de la spec a "Implementado" y haz el commit
   final antes de mergear esta rama.
   ```

3. **Promueve el juego en `references/game-suggestion-todo.md`.** `skin-designer` tiene un alcance de lista cerrada: solo trabaja juegos marcados `Implementado` ahí. Si no lo promueves, se planta y la corrida se pierde.
   - Edita **la fila del índice** y **la ficha** del juego: estado → `Implementado`, fecha → la de `date +%F` del session context.
   - **Nunca borres fichas existentes.** Un cambio de estado se edita en su sitio, con la fecha nueva y la razón (la spec que lo implementó).
   - Si el juego ya figura `Implementado`, no toques nada y sigue.

---

## Fase 6 — Encadenar los dos agentes, en este orden

> **Regla dura: los dos agentes van en llamadas separadas y consecutivas. Nunca en el mismo bloque de tool calls, nunca en paralelo.** El segundo no arranca hasta que el primero devolvió su informe. Si los lanzas juntos, `game-jam` puede escribir sobre un árbol que `skin-designer` todavía está tocando.

### 6.1 — Primero: `skin-designer`

Lánzalo con la tool de subagentes, `subagent_type: skin-designer`, pasándole el `<game-id>` resuelto en la Fase 5 como objetivo explícito.

Cuando vuelva, **relaya al usuario** lo que importa de su informe:

- juego intervenido y por qué ese,
- las 3 paletas (`classic`, `retro`, `neon`) con su justificación de contraste,
- archivos tocados,
- resultado **literal** de `npm run lint` y `npm run build`,
- el checklist manual para `/games/<id>/play`.

**Si `skin-designer` reporta fallo de lint/build, o dice que no puede trabajar ese juego: para y pregunta antes de seguir.** No encadenes `game-jam` sobre un árbol roto.

### 6.2 — Después: `game-jam`

Solo cuando 6.1 terminó bien. Lánzalo con `subagent_type: game-jam`.

- **Entrada:** el 2º argumento del comando — el juego que se quiere implementar a continuación. **Si vino vacío, pregúntalo con `AskUserQuestion`** antes de lanzar; el agente no acepta entrada vacía y no debe inventarla.
- **En el prompt del Agent, indícale explícitamente dos cosas:**
  1. Que escriba las specs en **`specs/games-jam/`** (carpeta en plural, la que existe en el repo), no en `specs/game-jam/<game-id>/`.
  2. Que numere de forma **global y continua**: toma el `NN` más alto entre `specs/*.md` y `specs/games-jam/*.md`, y usa `NN+1`, `NN+2`, con dos dígitos.

  Su archivo de definición dice otra cosa; se corrige aquí, por prompt, sin editarlo.

Cuando vuelva, relaya la tabla de specs creadas con sus rutas relativas completas.

---

## Fase 7 — Informe final

Cierra con una tabla:

| Concepto          | Resultado                               |
| ----------------- | --------------------------------------- |
| Spec implementada | `specs/games-jam/NN-slug.md`            |
| Rama activa       | `spec-NN-slug`                          |
| Bitácora          | `<JUEGO>` → `Implementado` (AAAA-MM-DD) |
| `skin-designer`   | veredicto + lint/build                  |
| `game-jam`        | specs nuevas creadas                    |

Y el siguiente comando a ejecutar, con **ruta relativa completa** (`/spec-impl` lista `specs/` de forma no recursiva, un número pelado puede no resolver a un archivo dentro de `specs/games-jam/`):

```
Siguiente paso: /spec-impl-game games-jam/NN-slug <siguiente-juego>
```

---

## Reglas duras

- **Nunca commitees automáticamente.** Ni por paso, ni al final. El commit es decisión y comando del humano.
- **Nunca lances los dos agentes en paralelo.** Primero `skin-designer`, y solo cuando terminó, `game-jam`.
- **Nunca lances ningún agente si la spec no estaba `Approved`.** El bloqueo de la Fase 2 termina la corrida.
- **Nunca marques una spec como `Approved`.** Eso lo hace el humano, a mano.
- **Nunca inventes la fecha.** Sale de `date +%F`, en el session context.
- **Una sola spec por corrida.** Si el juego tiene specs hermanas (motor, leaderboard, capa temática), se implementan en corridas separadas.
- **Implementa lo que la spec dice.** Si algo te parece subóptimo, lo mencionas como observación e implementas lo acordado. Los cambios a la spec van a la spec, no al código por sorpresa.
- **Relee `.claude/skills/spec-impl/SKILL.md` en cada invocación** en vez de confiar en lo que recuerdas de su formato.
