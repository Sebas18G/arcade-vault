import type { GameSkin } from "@/components/games/shared/skins";
/**
 * `shadowBlur` por familia de elemento. 0 = sin brillo (classic y retro).
 * El motor siempre resetea `shadowBlur` a 0 después de dibujar, para que el
 * halo de una skin no se filtre al resto del frame.
 */
export type FroggerGlowPalette = {
  /** Rana del jugador y ranas ya guardadas en su nenúfar. */
  frog: number;
  /** Plataformas del río: troncos y tortugas. */
  platform: number;
  /** Coches y camiones de la carretera. */
  vehicle: number;
  /** Nenúfares de la fila de casas. */
  lily: number;
  /** Rana rosa y mosca. */
  bonus: number;
  /** Relleno de la barra de temporizador. */
  timer: number;
};
export type FroggerPalette = {
  /** Banda del río (filas 1–5). */
  water: string;
  /** Banda de la carretera (filas 7–11). */
  road: string;
  /** Líneas discontinuas entre carriles de carretera. */
  laneMark: string;
  /** Orillas seguras: mediana (fila 6) y fila de salida (fila 12). */
  safe: string;
  /** Matorral de la fila de casas (fila 0): pisarlo es muerte. */
  bush: string;
  /** Cuadrado de cada casa, recortado sobre el matorral. */
  home: string;
  /** Nenúfar circular dentro de cada casa. */
  homeLily: string;
  log: string;
  /** Veta central y tapas de los extremos del tronco. */
  logDark: string;
  turtle: string;
  turtleShell: string;
  /** Un color por coche, ciclado por fila e índice dentro del carril. */
  car: readonly string[];
  /** Vehículos de más de una celda de largo. */
  truck: string;
  /** Parabrisas de coches y camiones. */
  vehicleGlass: string;
  frog: string;
  frogLeg: string;
  frogEye: string;
  /** Rana rosa (bonus que viaja sobre un tronco). */
  lady: string;
  fly: string;
  flyWing: string;
  timerTrack: string;
  timerFill: string;
  /** Relleno del temporizador en su último cuarto. */
  timerLow: string;
  glow: FroggerGlowPalette;
};
const NO_GLOW: FroggerGlowPalette = {
  frog: 0,
  platform: 0,
  vehicle: 0,
  lily: 0,
  bonus: 0,
  timer: 0,
};
export const FROGGER_SKIN_PALETTES: Record<GameSkin, FroggerPalette> = {
  // Extraída literal de la constante COLORS del motor de la spec 09, color por
  // color, incluido el "#1a1a1a" del parabrisas que estaba inline. Es el
  // control de regresión: con classic el juego se ve exactamente igual.
  classic: {
    water: "#0b2a63",
    road: "#2b2b2b",
    laneMark: "#4a4a4a",
    safe: "#1d3b2a",
    bush: "#14401f",
    home: "#0b2a63",
    homeLily: "#2fbf5f",
    log: "#8b5a2b",
    logDark: "#6b4420",
    turtle: "#3fae6a",
    turtleShell: "#2a7d4b",
    car: ["#e0473e", "#f2c14e", "#4ea8de", "#c46bd6", "#ff8c42"],
    truck: "#d9d9d9",
    vehicleGlass: "#1a1a1a",
    frog: "#7fe86b",
    frogLeg: "#4fb83c",
    frogEye: "#0d1a0d",
    lady: "#ff7ac6",
    fly: "#1a1a1a",
    flyWing: "#e8e8e8",
    timerTrack: "#1a1a1a",
    timerFill: "#3fae6a",
    timerLow: "#e0473e",
    glow: NO_GLOW,
  },
  // Fósforo CRT cálido: ámbar, verde fósforo y blanco hueso, sin un solo azul.
  // Rompe a propósito los dos choques verde-sobre-verde de classic: la rana
  // pasa a blanco hueso (el elemento más luminoso del tablero) sobre un
  // matorral marrón, y las tortugas verdes quedan sobre un río casi negro.
  retro: {
    water: "#0a1c11",
    road: "#1b1409",
    laneMark: "rgba(255, 207, 112, 0.22)",
    safe: "#3a2a0c",
    bush: "#241605",
    home: "#0a1c11",
    homeLily: "#7dff86",
    log: "#b3701f",
    logDark: "#82500f",
    turtle: "#7dff86",
    turtleShell: "#3f9e52",
    car: ["#ff5b3d", "#ffd447", "#ff8a3d", "#e07b2e", "#ffb02e"],
    truck: "#d9b169",
    vehicleGlass: "#2a1400",
    frog: "#fff4d6",
    frogLeg: "#ffb02e",
    frogEye: "#2a1400",
    lady: "#ff7a5c",
    fly: "#2a1400",
    flyWing: "#fff4d6",
    timerTrack: "#1b1409",
    timerFill: "#7dff86",
    timerLow: "#ff5b3d",
    glow: NO_GLOW,
  },
  // Paleta de la plataforma (app/globals.css) reforzada con shadowBlur.
  // Semántica de color: la rana es la única cosa amarilla del tablero, lo
  // seguro es frío (troncos verdes, tortugas cian, nenúfares verdes) y lo
  // letal es cálido (coches magenta/rojo/violeta/naranja).
  neon: {
    water: "#071b2e",
    road: "#121019",
    laneMark: "rgba(0, 245, 255, 0.12)",
    safe: "#0c2018",
    bush: "#170b20",
    home: "#071b2e",
    homeLily: "#00ff88",
    log: "#00ff88",
    logDark: "#00b35f",
    turtle: "#00f5ff",
    turtleShell: "#0090a8",
    car: ["#ff006e", "#ff4d4d", "#c77dff", "#ff8a3d", "#ff2ec4"],
    truck: "#ffe1ef",
    vehicleGlass: "#0a0a0f",
    frog: "#f5ff00",
    frogLeg: "#c9d400",
    frogEye: "#0a0a0f",
    lady: "#ff6ec7",
    fly: "#ff006e",
    flyWing: "#ffd6ea",
    timerTrack: "#141420",
    timerFill: "#00ff88",
    timerLow: "#ff006e",
    glow: {
      frog: 12,
      platform: 8,
      vehicle: 8,
      lily: 10,
      bonus: 10,
      timer: 8,
    },
  },
};
