"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  dispatchGamepadKey,
  GAMEPAD_REPEAT_DELAY_MS,
  GAMEPAD_REPEAT_INTERVAL_MS,
  type GamepadButtonId,
  type GamepadLayout,
} from "@/components/games/shared/controls";
/**
 * Gamepad táctil en pantalla (spec 16), portado de
 * `references/gamepad-assets/gamepad.html`.
 *
 * Es genérico: lo único específico de cada juego es el `GamepadLayout` que
 * recibe. Traduce las pulsaciones a eventos de teclado sintéticos sobre
 * `window`, que es justo donde los canvas ya escuchan — por eso ningún motor ni
 * ningún `<juego>-canvas.tsx` cambia para soportar mobile.
 *
 * Se muestra por CSS con `(pointer: coarse), (max-width: 900px)`: un teléfono en
 * horizontal supera los 768 px, así que un breakpoint de ancho puro dejaría el
 * juego sin controles justo al rotar.
 */
type Timers = { delay?: number; interval?: number };
const DPAD_BUTTONS: { id: GamepadButtonId; aria: string; arrow: string }[] = [
  { id: "up", aria: "Arriba", arrow: "M12 4 L20 16 L4 16 Z" },
  { id: "right", aria: "Derecha", arrow: "M8 4 L20 12 L8 20 Z" },
  { id: "down", aria: "Abajo", arrow: "M4 8 L20 8 L12 20 Z" },
  { id: "left", aria: "Izquierda", arrow: "M16 4 L16 20 L4 12 Z" },
];
export function MobileGamepad({
  layout,
  locked,
  paused,
  onPauseToggle,
  onForceEnd,
  skinLabel,
  onSkinCycle,
  backHref,
}: {
  layout: GamepadLayout;
  /** Partida en pausa o terminada: el D-pad y A/B se apagan. */
  locked: boolean;
  paused: boolean;
  onPauseToggle: () => void;
  onForceEnd: () => void;
  /** `null` si el juego no tiene skins: el botón SKIN no se renderiza. */
  skinLabel: string | null;
  onSkinCycle?: () => void;
  backHref: string;
}) {
  const [active, setActive] = useState<Partial<Record<GamepadButtonId, true>>>(
    {},
  );
  // Refs para que press/release no se recreen (y para que los timers de
  // auto-repetición no se queden con un layout o un `locked` viejos dentro).
  const layoutRef = useRef(layout);
  const lockedRef = useRef(locked);
  // Se sincronizan en un efecto (y no en el cuerpo del render) porque escribir
  // un ref durante el render es justo lo que prohíbe `react-hooks/refs`. Los
  // handlers de puntero corren siempre después de los efectos, así que nunca
  // leen un valor viejo.
  useEffect(() => {
    layoutRef.current = layout;
    lockedRef.current = locked;
  }, [layout, locked]);
  /** Botones pulsados con sus timers. Tener entrada aquí equivale a estar pulsado. */
  const timersRef = useRef(new Map<GamepadButtonId, Timers>());
  /** Qué dedo mantiene qué botón, para no romper el multitáctil. */
  const pointersRef = useRef(new Map<number, GamepadButtonId>());
  const press = useCallback((id: GamepadButtonId) => {
    const binding = layoutRef.current.buttons[id];
    if (!binding || lockedRef.current) return;
    if (timersRef.current.has(id)) return;
    const timers: Timers = {};
    timersRef.current.set(id, timers);
    setActive((prev) => ({ ...prev, [id]: true }));
    dispatchGamepadKey("keydown", binding);
    if (binding.repeat) {
      timers.delay = window.setTimeout(() => {
        timers.interval = window.setInterval(
          () => dispatchGamepadKey("keydown", binding, { repeat: true }),
          GAMEPAD_REPEAT_INTERVAL_MS,
        );
      }, GAMEPAD_REPEAT_DELAY_MS);
    }
  }, []);
  const release = useCallback((id: GamepadButtonId) => {
    const timers = timersRef.current.get(id);
    if (!timers) return;
    if (timers.delay !== undefined) clearTimeout(timers.delay);
    if (timers.interval !== undefined) clearInterval(timers.interval);
    timersRef.current.delete(id);
    setActive((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const binding = layoutRef.current.buttons[id];
    if (binding) dispatchGamepadKey("keyup", binding);
  }, []);
  const releaseAll = useCallback(() => {
    for (const id of [...timersRef.current.keys()]) release(id);
    pointersRef.current.clear();
  }, [release]);
  // Al pausar o terminar la partida, y al desmontar, ninguna tecla puede quedar
  // trabada: el motor la seguiría leyendo como mantenida al reanudar.
  useEffect(() => {
    if (locked) releaseAll();
  }, [locked, releaseAll]);
  useEffect(() => releaseAll, [releaseAll]);
  const buttonAt = (target: EventTarget | null): GamepadButtonId | null => {
    if (!(target instanceof Element)) return null;
    const el = target.closest<HTMLElement>("[data-gp-button]");
    return (el?.dataset.gpButton as GamepadButtonId | undefined) ?? null;
  };
  // Los handlers viven en `.gp-body` y no en cada botón: así un dedo que se
  // desliza del D-pad de ← a ↑ cambia de dirección en vez de soltar el control.
  const handlePointerDown = (e: React.PointerEvent) => {
    const id = buttonAt(e.target);
    if (!id) return;
    e.preventDefault();
    pointersRef.current.set(e.pointerId, id);
    press(id);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const current = pointersRef.current.get(e.pointerId);
    if (!current) return;
    const next = buttonAt(document.elementFromPoint(e.clientX, e.clientY));
    if (next === current) return;
    release(current);
    pointersRef.current.delete(e.pointerId);
    if (next) {
      pointersRef.current.set(e.pointerId, next);
      press(next);
    }
  };
  const endPointer = (e: React.PointerEvent) => {
    const id = pointersRef.current.get(e.pointerId);
    if (!id) return;
    pointersRef.current.delete(e.pointerId);
    release(id);
  };
  // El teclado real sigue siendo el control de escritorio; estos botones son una
  // superficie táctil que lo duplica, así que quedan fuera del tabulado.
  const gameButton = (id: GamepadButtonId) => ({
    "data-gp-button": id,
    disabled: !layout.buttons[id] || locked,
    tabIndex: -1,
    type: "button" as const,
  });
  return (
    <div className="mobile-gamepad">
      <div className="gp" role="group" aria-label="Controles táctiles">
        <div className="gp-top">
          <button type="button" className="gp-sys" onClick={onPauseToggle}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          {skinLabel && onSkinCycle && (
            <button type="button" className="gp-sys" onClick={onSkinCycle}>
              SKIN · {skinLabel.toUpperCase()}
            </button>
          )}
          <button type="button" className="gp-sys magenta" onClick={onForceEnd}>
            FIN
          </button>
          <Link href={backHref} className="gp-sys ghost">
            SALIR
          </Link>
        </div>
        <div
          className="gp-body"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={endPointer}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="gp-dpad" aria-label="Cruceta">
            {DPAD_BUTTONS.map(({ id, aria, arrow }) => (
              <button
                key={id}
                {...gameButton(id)}
                className={`dp dp-${id}${active[id] ? " on" : ""}`}
                aria-label={aria}
              >
                <svg
                  className="dp-arrow"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d={arrow} fill="currentColor" />
                </svg>
              </button>
            ))}
            <div className="dp-hub" aria-hidden="true">
              <span className="dp-hub-gem" />
            </div>
          </div>
          <div className="gp-actions">
            {(["b", "a"] as const).map((id) => (
              <div className="gp-action" key={id}>
                <button
                  {...gameButton(id)}
                  className={`ab ${id}${active[id] ? " on" : ""}`}
                  aria-label={layout.buttons[id]?.label ?? id.toUpperCase()}
                >
                  <span className="ab-ring" />
                  <span className="ab-letter">{id.toUpperCase()}</span>
                </button>
                <span className="ab-caption">
                  {layout.buttons[id]?.label ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="gp-hint">{layout.hint}</p>
    </div>
  );
}
