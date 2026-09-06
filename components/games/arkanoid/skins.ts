import type { GameSkin } from "@/components/games/shared/skins";
/** Los 6 colores de bloque rompible, en el orden en que se reparten por fila. */
export type ArkanoidBlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
/** Las 4 texturas de bloque indestructible del spritesheet original. */
export type ArkanoidIndestructibleTexture =
  "wood" | "brick_red" | "stone" | "brick_dark";
/**
 * Cómo dibuja la skin las piezas (pala, bola, bloques, explosiones).
 * - `sprite`: recorta el spritesheet `/games/arkanoid/spritesheet-breakout.png`,
 *   que es lo que hace el juego hoy. Los colores de pieza de la paleta se ignoran.
 * - `solid`: dibujo procedural con los colores de la paleta. Es la única forma de
 *   que una skin cambie de verdad el aspecto de este juego: el PNG no se recolorea.
 */
export type ArkanoidRenderMode = "sprite" | "solid";
export type ArkanoidPiecePalette = {
  /** Relleno de la pieza. */
  fill: string;
  /** Contorno de 2 px, para separar la pieza del fondo y de sus vecinas. */
  edge: string;
  /** `shadowBlur` de la pieza. 0 = sin brillo. Siempre se resetea tras dibujar. */
  glow: number;
};
export type ArkanoidHudPalette = {
  score: string;
  level: string;
  lives: string;
  shadow: string;
  shadowBlur: number;
};
export type ArkanoidOverlayPalette = {
  /** Velo sobre el tablero en la pantalla de "NIVEL COMPLETADO". */
  fill: string;
  text: string;
};
export type ArkanoidPalette = {
  render: ArkanoidRenderMode;
  /** Fondo que pinta el motor en cada frame. */
  background: string;
  paddle: ArkanoidPiecePalette;
  ball: ArkanoidPiecePalette;
  blocks: Record<ArkanoidBlockColor, ArkanoidPiecePalette>;
  indestructible: Record<ArkanoidIndestructibleTexture, ArkanoidPiecePalette>;
  /** `shadowBlur` del destello de rotura (usa el color del bloque roto). */
  explosionGlow: number;
  hud: ArkanoidHudPalette;
  overlay: ArkanoidOverlayPalette;
};
export const ARKANOID_SKIN_PALETTES: Record<GameSkin, ArkanoidPalette> = {
  // Extraída literal del motor original: fondo azul `#1414a0`, piezas del
  // spritesheet y HUD blanco con halo suave. Control de regresión: con esta
  // skin el juego se ve exactamente igual que antes de la corrida de skins.
  // Los `fill`/`edge` de pieza NO se dibujan aquí (`render: "sprite"`): están
  // solo para describir el sprite y como red de seguridad si algún día se
  // permitiera el modo solid con esta paleta.
  classic: {
    render: "sprite",
    background: "#1414a0",
    paddle: { fill: "#c0c0c0", edge: "#8a8a8a", glow: 0 },
    ball: { fill: "#ffffff", edge: "#ffffff", glow: 0 },
    blocks: {
      red: { fill: "red", edge: "#7a1610", glow: 0 },
      yellow: { fill: "yellow", edge: "#8a7a00", glow: 0 },
      cyan: { fill: "cyan", edge: "#00767a", glow: 0 },
      magenta: { fill: "magenta", edge: "#7a007a", glow: 0 },
      hotpink: { fill: "hotpink", edge: "#a33f6a", glow: 0 },
      green: { fill: "green", edge: "#004d00", glow: 0 },
    },
    indestructible: {
      wood: { fill: "#8a5a2b", edge: "#523418", glow: 0 },
      brick_red: { fill: "#9c4425", edge: "#5c2412", glow: 0 },
      stone: { fill: "#7a7a7a", edge: "#4a4a4a", glow: 0 },
      brick_dark: { fill: "#4a3018", edge: "#2a1b0d", glow: 0 },
    },
    explosionGlow: 0,
    hud: {
      score: "#fff",
      level: "#fff",
      lives: "#ff3b3b",
      shadow: "rgba(255, 255, 255, 0.5)",
      shadowBlur: 6,
    },
    overlay: { fill: "rgba(0, 0, 0, 0.7)", text: "#fff" },
  },
  // Fósforo CRT cálido: ámbar, verde fósforo y blanco hueso, sin un solo azul.
  // Las 6 filas se separan por tono Y por luminancia; la pala es lo más claro
  // de la mitad inferior y la bola lo más claro de todo el tablero.
  retro: {
    render: "solid",
    background: "#140d04",
    paddle: { fill: "#ffb02e", edge: "#fff4d6", glow: 0 },
    ball: { fill: "#fff9e6", edge: "#ffd447", glow: 0 },
    blocks: {
      red: { fill: "#ff5b3d", edge: "#8c2a12", glow: 0 },
      yellow: { fill: "#ffd447", edge: "#8c6a10", glow: 0 },
      cyan: { fill: "#7dff86", edge: "#2f8c39", glow: 0 },
      magenta: { fill: "#ff8a3d", edge: "#8c4310", glow: 0 },
      hotpink: { fill: "#ffe0a3", edge: "#8c7040", glow: 0 },
      green: { fill: "#c9ff5e", edge: "#6b8c26", glow: 0 },
    },
    indestructible: {
      wood: { fill: "#7a4a14", edge: "#c98b3a", glow: 0 },
      brick_red: { fill: "#8c3a1e", edge: "#d2764a", glow: 0 },
      stone: { fill: "#6b5f4c", edge: "#b3a68c", glow: 0 },
      brick_dark: { fill: "#4a2e10", edge: "#9c6a2e", glow: 0 },
    },
    explosionGlow: 0,
    hud: {
      score: "#ffcf70",
      level: "#ffcf70",
      lives: "#ff5b3d",
      shadow: "rgba(255, 207, 112, 0.5)",
      shadowBlur: 6,
    },
    overlay: { fill: "rgba(20, 13, 4, 0.78)", text: "#fff4d6" },
  },
  // Paleta de la plataforma (`app/globals.css`) reforzada con `shadowBlur`.
  // Semántica de color: la bola es lo único amarillo y la pala lo único cian,
  // así que los dos elementos que el jugador controla nunca se confunden con
  // un bloque. El fondo es el `--bg` de la app, para no pelear con el marco CRT.
  neon: {
    render: "solid",
    background: "#0a0a0f",
    paddle: { fill: "#00f5ff", edge: "#b8fcff", glow: 12 },
    ball: { fill: "#f5ff00", edge: "#ffffff", glow: 14 },
    blocks: {
      red: { fill: "#ff4d4d", edge: "#ffc2c2", glow: 8 },
      yellow: { fill: "#ffb02e", edge: "#ffe0b0", glow: 8 },
      cyan: { fill: "#c77dff", edge: "#ecd6ff", glow: 8 },
      magenta: { fill: "#ff006e", edge: "#ff9dc6", glow: 8 },
      hotpink: { fill: "#ff7ac6", edge: "#ffd6ee", glow: 8 },
      green: { fill: "#00ff88", edge: "#c2ffe2", glow: 8 },
    },
    indestructible: {
      wood: { fill: "#1e2438", edge: "#5f7fb8", glow: 0 },
      brick_red: { fill: "#33202c", edge: "#a85f86", glow: 0 },
      stone: { fill: "#242433", edge: "#8a8ab0", glow: 0 },
      brick_dark: { fill: "#20202e", edge: "#6a6a99", glow: 0 },
    },
    explosionGlow: 16,
    hud: {
      score: "#e6e9ff",
      level: "#e6e9ff",
      lives: "#ff006e",
      shadow: "rgba(0, 245, 255, 0.5)",
      shadowBlur: 6,
    },
    overlay: { fill: "rgba(10, 10, 15, 0.78)", text: "#e6e9ff" },
  },
};
