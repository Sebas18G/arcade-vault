"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import styles from "@/components/games/tetris/tetris.module.css";
import {
  TetrisEngine,
  TETRIS_BOARD_WIDTH,
  TETRIS_BOARD_HEIGHT,
} from "@/components/games/tetris/engine";
import type {
  TetrisClearEffect,
  TetrisPieceSnapshot,
  TetrisSkin,
} from "@/components/games/tetris/engine";
import { NextPieceCanvas } from "@/components/games/tetris/next-piece-canvas";
import { getTetrisStartLevel } from "@/components/games/tetris/leaderboard";
import type {
  GameCanvasHandle,
  GameCanvasProps,
  TetrisGameOverResult,
} from "@/components/games/shared/types";
// Tetris tiene sus propias 4 skins, así que reemplaza el `skin?: GameSkin`
// del contrato compartido en vez de intersecarlo.
type TetrisCanvasProps = Omit<GameCanvasProps<TetrisGameOverResult>, "skin"> & {
  skin: TetrisSkin;
  theme: "dark" | "light";
};
const FLASH_CLASS_MAP: Record<
  NonNullable<TetrisClearEffect["flashClass"]>,
  string
> = {
  "flash-normal": styles.flashNormal,
  "flash-tspin": styles.flashTspin,
  "flash-tetris": styles.flashTetris,
  "flash-b2b": styles.flashB2b,
  "flash-perfect": styles.flashPerfect,
};
const ACTION_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "KeyX",
  "Space",
];
export const TetrisCanvas = forwardRef<GameCanvasHandle, TetrisCanvasProps>(
  function TetrisCanvas(
    {
      paused,
      skin,
      theme,
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const boardCanvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<TetrisEngine | null>(null);
    const callbacksRef = useRef({
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
    });
    const [lines, setLines] = useState(0);
    const [combo, setCombo] = useState(0);
    const [freezeMs, setFreezeMs] = useState(0);
    const [nextPiece, setNextPiece] = useState<TetrisPieceSnapshot | null>(
      null,
    );
    const [comboToast, setComboToast] = useState<{
      text: string;
      visible: boolean;
    } | null>(null);
    const [powerupToast, setPowerupToast] = useState<{
      text: string;
      visible: boolean;
    } | null>(null);
    const [flashClass, setFlashClass] = useState<string | null>(null);
    const comboToastTimeoutRef = useRef<
      ReturnType<typeof setTimeout> | undefined
    >(undefined);
    const powerupToastTimeoutRef = useRef<
      ReturnType<typeof setTimeout> | undefined
    >(undefined);
    const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    useEffect(() => {
      callbacksRef.current = {
        onScoreChange,
        onLivesChange,
        onLevelChange,
        onGameOver,
      };
    }, [onScoreChange, onLivesChange, onLevelChange, onGameOver]);
    useEffect(() => {
      const canvas = boardCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const engine = new TetrisEngine(
        {
          onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
          onLinesChange: setLines,
          onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
          onComboChange: setCombo,
          onFreezeChange: setFreezeMs,
          onNextPieceChange: setNextPiece,
          onClearEffect: (effect: TetrisClearEffect) => {
            if (effect.toast) {
              setComboToast({ text: effect.toast, visible: true });
              clearTimeout(comboToastTimeoutRef.current);
              comboToastTimeoutRef.current = setTimeout(() => {
                setComboToast((prev) =>
                  prev ? { ...prev, visible: false } : prev,
                );
              }, 1100);
            }
            if (effect.flashClass) {
              setFlashClass(FLASH_CLASS_MAP[effect.flashClass]);
              clearTimeout(flashTimeoutRef.current);
              const duration =
                effect.flashClass === "flash-perfect" ? 600 : 500;
              flashTimeoutRef.current = setTimeout(
                () => setFlashClass(null),
                duration,
              );
            }
          },
          onPowerUpToast: (label) => {
            setPowerupToast({ text: label, visible: true });
            clearTimeout(powerupToastTimeoutRef.current);
            powerupToastTimeoutRef.current = setTimeout(() => {
              setPowerupToast((prev) =>
                prev ? { ...prev, visible: false } : prev,
              );
            }, 1200);
          },
          onGameOver: (result) => callbacksRef.current.onGameOver(result),
        },
        getTetrisStartLevel(),
      );
      engineRef.current = engine;
      engine.setSkin(skin);
      callbacksRef.current.onLivesChange(0);
      const handleKeyDown = (e: KeyboardEvent) => {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "SELECT") return;
        if (!ACTION_KEYS.includes(e.code)) return;
        if (e.code === "Space") e.preventDefault();
        switch (e.code) {
          case "ArrowLeft":
            engine.moveLeft();
            break;
          case "ArrowRight":
            engine.moveRight();
            break;
          case "ArrowDown":
            engine.softDrop();
            break;
          case "ArrowUp":
          case "KeyX":
            engine.rotate();
            break;
          case "Space":
            engine.hardDrop();
            break;
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      let rafId = 0;
      let lastTime: number | null = null;
      const loop = (ts: number) => {
        const dt = lastTime === null ? 0 : ts - lastTime;
        lastTime = ts;
        engine.update(dt);
        engine.draw(ctx);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", handleKeyDown);
        clearTimeout(comboToastTimeoutRef.current);
        clearTimeout(powerupToastTimeoutRef.current);
        clearTimeout(flashTimeoutRef.current);
        engineRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
      engineRef.current?.setPaused(paused);
    }, [paused]);
    useEffect(() => {
      engineRef.current?.setSkin(skin);
    }, [skin]);
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const gridColor = getComputedStyle(container)
        .getPropertyValue("--grid-color")
        .trim();
      if (gridColor) engineRef.current?.setGridColor(gridColor);
    }, [theme]);
    useImperativeHandle(ref, () => ({
      restart: () => engineRef.current?.restart(getTetrisStartLevel()),
    }));
    return (
      <div
        ref={containerRef}
        className={`${styles.container} ${theme === "light" ? styles.light : ""}`}
      >
        <div className={styles.gameRow}>
          <div className={styles.boardWrap}>
            <canvas
              ref={boardCanvasRef}
              width={TETRIS_BOARD_WIDTH}
              height={TETRIS_BOARD_HEIGHT}
              className={`${styles.board} ${flashClass ?? ""}`}
            />
            {comboToast && (
              <div
                className={`${styles.comboToast} ${comboToast.visible ? styles.show : ""}`}
              >
                {comboToast.text}
              </div>
            )}
            {powerupToast && (
              <div
                className={`${styles.powerupToast} ${powerupToast.visible ? styles.show : ""}`}
              >
                {powerupToast.text}
              </div>
            )}
          </div>
          <div className={styles.panel}>
            <div className={styles.panelSection}>
              <span className={styles.label}>LINES</span>
              <span className={styles.value}>{lines}</span>
            </div>
            {combo > 1 && (
              <div className={styles.panelSection}>
                <span className={styles.label}>COMBO</span>
                <span className={`${styles.value} ${styles.comboValue}`}>
                  x{combo}
                </span>
              </div>
            )}
            <div className={styles.panelSection}>
              <span className={styles.label}>NEXT</span>
              <NextPieceCanvas
                piece={nextPiece}
                skin={skin}
                className={styles.nextCanvas}
              />
            </div>
            {freezeMs > 0 && (
              <div className={styles.panelSection}>
                <span className={styles.label}>EFECTO</span>
                <span className={styles.value}>
                  ❄️ {(freezeMs / 1000).toFixed(1)}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
