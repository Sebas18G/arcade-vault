import type { GameSkin } from "@/components/games/shared/skins";
/** Tipos de power-up del motor. Vive aquí para que la paleta pueda tiparlos sin ciclo de imports. */
export type AsteroidsPowerUpType =
  "triple" | "shield" | "slowmo" | "nova" | "hyper";
export type AsteroidsPalette = {
  /** Fondo que pinta el motor en cada frame. */
  background: string;
  /** Silueta de la nave y de los iconos de vida. */
  ship: string;
  lifeIcon: string;
  /** Llama del propulsor (incluye su alpha original). */
  shipFlame: string;
  shipFlameHyper: string;
  /** Componentes "r, g, b" del escudo: su alpha late con el temporizador. */
  shieldRgb: string;
  asteroid: string;
  bullet: string;
  /** Componentes "r,g,b" de las partículas: su alpha decae con la vida. */
  particleRgb: string;
  powerups: Record<AsteroidsPowerUpType, string>;
  /** Componentes "r, g, b" de la onda expansiva de la bomba nova. */
  novaFlashRgb: string;
  hudText: string;
  hudTextDim: string;
  hudCombo: string;
  /**
   * Radio base de `shadowBlur` para el brillo neón. 0 = sin brillo.
   * Siempre se resetea a 0 tras dibujar cada elemento.
   */
  glow: number;
};
export const ASTEROIDS_SKIN_PALETTES: Record<GameSkin, AsteroidsPalette> = {
  // Extraída literal del motor original: vectores blancos sobre negro.
  classic: {
    background: "#000",
    ship: "#fff",
    lifeIcon: "#fff",
    shipFlame: "rgba(255, 130, 0, 0.85)",
    shipFlameHyper: "rgba(170, 90, 255, 0.9)",
    shieldRgb: "80, 200, 255",
    asteroid: "#fff",
    bullet: "#fff",
    particleRgb: "255,255,255",
    powerups: {
      triple: "#0ff",
      shield: "#5c8",
      slowmo: "#fc5",
      nova: "#ff5252",
      hyper: "#a5f",
    },
    novaFlashRgb: "255, 82, 82",
    hudText: "#fff",
    hudTextDim: "rgba(255,255,255,0.6)",
    hudCombo: "#ff9d3f",
    glow: 0,
  },
  // Fósforo CRT: ámbar dominante, verde fósforo para lo defensivo,
  // blanco hueso reservado a la nave (el elemento más luminoso de la pantalla).
  retro: {
    background: "#0a0704",
    ship: "#fff4d6",
    lifeIcon: "#fff4d6",
    shipFlame: "rgba(255, 176, 46, 0.9)",
    shipFlameHyper: "rgba(125, 255, 134, 0.9)",
    shieldRgb: "125, 255, 134",
    asteroid: "#ffb02e",
    bullet: "#fff9e6",
    particleRgb: "255,200,120",
    powerups: {
      triple: "#ffd447",
      shield: "#7dff86",
      slowmo: "#ff8a3d",
      nova: "#ff5b3d",
      hyper: "#c9ff5e",
    },
    novaFlashRgb: "255, 91, 61",
    hudText: "#ffcf70",
    hudTextDim: "rgba(255,207,112,0.6)",
    hudCombo: "#7dff86",
    glow: 0,
  },
  // Paleta de la plataforma (app/globals.css) reforzada con shadowBlur:
  // nave cian, rocas magenta, balas amarillas.
  neon: {
    background: "#0a0a0f",
    ship: "#00f5ff",
    lifeIcon: "#00f5ff",
    shipFlame: "rgba(245, 255, 0, 0.9)",
    shipFlameHyper: "rgba(255, 0, 110, 0.9)",
    shieldRgb: "0, 255, 136",
    asteroid: "#ff006e",
    bullet: "#f5ff00",
    particleRgb: "230,233,255",
    powerups: {
      triple: "#00f5ff",
      shield: "#00ff88",
      slowmo: "#f5ff00",
      nova: "#ff4d4d",
      hyper: "#c77dff",
    },
    novaFlashRgb: "255, 77, 77",
    hudText: "#e6e9ff",
    hudTextDim: "rgba(230,233,255,0.6)",
    hudCombo: "#f5ff00",
    glow: 10,
  },
};
