import type { GameSkin } from "@/components/games/shared/skins";
/**
 * Cómo dibuja la cuadrícula cada skin.
 * - `lines`: retícula completa de líneas verticales y horizontales (lo que hace el juego hoy).
 * - `dots`: solo un punto en cada intersección — mucho más tenue, no compite con las scanlines.
 */
export type SnakeGridStyle = "lines" | "dots";
export type SnakeGridPalette = {
  style: SnakeGridStyle;
  /** Trazo de las líneas o relleno de los puntos. Siempre de baja luminancia. */
  color: string;
  /** Grosor del trazo (solo `style: "lines"`). */
  lineWidth: number;
  /** Lado del punto en px (solo `style: "dots"`). */
  dotSize: number;
};
export type SnakeBoardPalette = {
  /** Marco del tablero. `null` = sin marco propio (classic solo tiene las líneas de grid). */
  border: string | null;
  borderWidth: number;
  /** `shadowBlur` del marco. 0 = sin brillo. */
  borderGlow: number;
};
export type SnakePalette = {
  /** Fondo que pinta el motor en cada frame. */
  background: string;
  grid: SnakeGridPalette;
  board: SnakeBoardPalette;
  snakeHead: string;
  snakeBody: string;
  /** `shadowBlur` base de los segmentos. 0 = sin brillo. Siempre se resetea tras dibujar. */
  snakeGlow: number;
  /** Relleno de reserva cuando el atlas de frutas todavía no cargó o falló. */
  fruitFallback: string;
  /** `shadowBlur` del sprite de fruta (usa su silueta alpha). 0 = sin brillo. */
  fruitGlow: number;
  fruitGlowColor: string;
  hudText: string;
  hudShadow: string;
  hudShadowBlur: number;
};
export const SNAKE_SKIN_PALETTES: Record<GameSkin, SnakePalette> = {
  // Extraída literal del motor original: serpiente verde sobre casi-negro,
  // retícula blanca al 5% y HUD blanco con halo suave. Control de regresión.
  classic: {
    background: "#0a0a0a",
    grid: {
      style: "lines",
      color: "rgba(255, 255, 255, 0.05)",
      lineWidth: 1,
      dotSize: 0,
    },
    board: { border: null, borderWidth: 0, borderGlow: 0 },
    snakeHead: "#0f0",
    snakeBody: "green",
    snakeGlow: 0,
    fruitFallback: "red",
    fruitGlow: 0,
    fruitGlowColor: "transparent",
    hudText: "#fff",
    hudShadow: "rgba(255, 255, 255, 0.5)",
    hudShadowBlur: 6,
  },
  // Fósforo CRT cálido, sin un solo azul. La retícula deja de ser una malla
  // completa y pasa a ser una trama de puntos ámbar al 12%: se lee el tablero
  // sin que las líneas peleen con las scanlines. El marco ámbar marca el borde
  // letal, que en classic apenas se intuye.
  retro: {
    background: "#0b0805",
    grid: {
      style: "dots",
      color: "rgba(255, 190, 90, 0.12)",
      lineWidth: 1,
      dotSize: 3,
    },
    board: { border: "rgba(255, 176, 46, 0.3)", borderWidth: 2, borderGlow: 0 },
    snakeHead: "#fff1c9",
    snakeBody: "#ffb02e",
    snakeGlow: 0,
    fruitFallback: "#ff6b2e",
    fruitGlow: 0,
    fruitGlowColor: "transparent",
    hudText: "#ffcf70",
    hudShadow: "rgba(255, 207, 112, 0.5)",
    hudShadowBlur: 6,
  },
  // Paleta de la plataforma (app/globals.css) reforzada con shadowBlur.
  // La retícula se mantiene como malla, pero en cian al 8%: por debajo del
  // rango de classic, para que el brillo de la serpiente no compita con ella.
  // El marco sí brilla, porque chocar contra él termina la partida.
  neon: {
    background: "#0a0a0f",
    grid: {
      style: "lines",
      color: "rgba(0, 245, 255, 0.08)",
      lineWidth: 1,
      dotSize: 0,
    },
    board: {
      border: "rgba(0, 245, 255, 0.45)",
      borderWidth: 2,
      borderGlow: 12,
    },
    snakeHead: "#f5ff00",
    snakeBody: "#00ff88",
    snakeGlow: 8,
    fruitFallback: "#ff006e",
    fruitGlow: 14,
    fruitGlowColor: "#ff006e",
    hudText: "#e6e9ff",
    hudShadow: "rgba(0, 245, 255, 0.5)",
    hudShadowBlur: 6,
  },
};
