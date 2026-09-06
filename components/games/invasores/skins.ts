import type { GameSkin } from "@/components/games/shared/skins";
/**
 * `shadowBlur` por familia de elemento. 0 = sin brillo (classic y retro).
 * El motor siempre resetea `shadowBlur` a 0 después de dibujar, para que el
 * halo de una skin no se filtre al resto del frame.
 *
 * `invader` y `bunker` están en 0 en las **tres** skins a propósito, y no por
 * olvido: los invasores y los búnkeres se dibujan celda a celda con `fillRect`
 * (55 sprites de ~45 celdas + 4 máscaras de 22×16), así que encender el halo
 * ahí significaría entre 2 000 y 3 500 pasadas de blur por frame. El brillo se
 * reserva para los elementos de conteo bajo: cañón, UFO, restos y proyectiles.
 * Los campos existen igual para que subirlos sea un solo valor si algún día se
 * coalescen los sprites en runs horizontales.
 */
export type InvasoresGlowPalette = {
  /** Cañón del jugador. */
  cannon: number;
  /** Restos del cañón destruido. */
  wreck: number;
  /** Sprites de la formación. Ver nota de arriba: siempre 0 hoy. */
  invader: number;
  /** UFO de bonus. */
  ufo: number;
  /** Celdas de los búnkeres. Ver nota de arriba: siempre 0 hoy. */
  bunker: number;
  /** Proyectil del jugador. */
  playerBullet: number;
  /** Proyectiles alienígenas. */
  alienBullet: number;
  /** Línea del suelo. */
  ground: number;
};
export type InvasoresPalette = {
  /** Fondo que pinta el motor en cada frame. */
  bg: string;
  /** Línea del suelo, 2 px al pie del canvas. */
  ground: string;
  /** Cañón del jugador. */
  cannon: string;
  /** Restos del cañón durante la explosión de muerte. */
  wreck: string;
  /** Relleno de las celdas del búnker. */
  bunker: string;
  /**
   * Color de las celdas de búnker **expuestas** (las que tienen al menos un
   * vecino vacío o caen en el perímetro). Es lo que hace visible la erosión:
   * cada cráter nuevo abre un borde propio. `null` = búnker de un solo color,
   * que es exactamente el aspecto original y por eso lo usa `classic`.
   */
  bunkerEdge: string | null;
  /** Un color por fila de la formación, alineado con ROW_POINTS (30/20/20/10/10). */
  rows: readonly [string, string, string, string, string];
  /** UFO de bonus. */
  ufo: string;
  /** Proyectil del jugador. */
  playerBullet: string;
  /** Proyectiles alienígenas. */
  alienBullet: string;
  /**
   * Silueta del proyectil alienígena. `solid` es el rectángulo original;
   * `zigzag` lo parte en 4 segmentos alternados, como los "squiggly shots" del
   * arcade. Es la diferencia de **forma** que impide que el jugador confunda un
   * disparo enemigo con el suyo cuando solo mira de reojo.
   */
  alienBulletStyle: "solid" | "zigzag";
  glow: InvasoresGlowPalette;
};
const NO_GLOW: InvasoresGlowPalette = {
  cannon: 0,
  wreck: 0,
  invader: 0,
  ufo: 0,
  bunker: 0,
  playerBullet: 0,
  alienBullet: 0,
  ground: 0,
};
export const INVASORES_SKIN_PALETTES: Record<GameSkin, InvasoresPalette> = {
  /**
   * Los 9 valores de la constante `COLORS` del motor original, extraídos tal
   * cual. Es el control de regresión: con `classic` activa el juego dibuja las
   * mismas llamadas que antes de existir las skins (`bunkerEdge: null` conserva
   * el búnker monocromo y `alienBulletStyle: "solid"` el proyectil recto).
   */
  classic: {
    bg: "#04070a",
    ground: "#39ff14",
    cannon: "#39ff14",
    wreck: "#ff9f1c",
    bunker: "#39ff14",
    bunkerEdge: null,
    rows: ["#7df9ff", "#39ff14", "#39ff14", "#ffd166", "#ffd166"],
    ufo: "#ff2e88",
    playerBullet: "#eaffea",
    alienBullet: "#ff6b6b",
    alienBulletStyle: "solid",
    glow: NO_GLOW,
  },
  /**
   * Fósforo CRT cálido: ámbar, verde fósforo, lima y blanco hueso. Ni un azul.
   * Semántica: lo tuyo es blanco hueso (lo más luminoso de la pantalla), la
   * formación va en rampa lima → verde → ámbar, los búnkeres son tierra con el
   * canto iluminado y todo lo que puede matarte es rojo-naranja.
   */
  retro: {
    bg: "#0a0704",
    ground: "#ffb02e",
    cannon: "#fff4d6",
    wreck: "#ff5b3d",
    bunker: "#8c5a1e",
    bunkerEdge: "#ffe0a3",
    rows: ["#c9ff5e", "#7dff86", "#7dff86", "#ffd447", "#ffd447"],
    ufo: "#ff8a3d",
    playerBullet: "#fff9e6",
    alienBullet: "#ff5b3d",
    alienBulletStyle: "zigzag",
    glow: NO_GLOW,
  },
  /**
   * Paleta de la plataforma (`app/globals.css`) sobre su propio `--bg`.
   * Semántica de color explícita: **cian es tuyo** (cañón, suelo y canto de los
   * búnkeres), **amarillo es tu disparo** (lo único amarillo del canvas),
   * **verde es el bonus** (el UFO, lo único verde), la formación es magenta /
   * violeta / rosa y el peligro que baja es coral.
   */
  neon: {
    bg: "#0a0a0f",
    ground: "#00f5ff",
    cannon: "#00f5ff",
    wreck: "#ff8a3d",
    bunker: "#0a6f8c",
    bunkerEdge: "#7df9ff",
    rows: ["#c77dff", "#ff006e", "#ff006e", "#ff7ac6", "#ff7ac6"],
    ufo: "#00ff88",
    playerBullet: "#f5ff00",
    alienBullet: "#ff4d4d",
    alienBulletStyle: "zigzag",
    glow: {
      cannon: 12,
      wreck: 14,
      invader: 0,
      ufo: 14,
      bunker: 0,
      playerBullet: 12,
      alienBullet: 10,
      ground: 8,
    },
  },
};
