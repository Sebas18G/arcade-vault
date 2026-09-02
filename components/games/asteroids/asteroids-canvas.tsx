"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { AsteroidsEngine, ASTEROIDS_WIDTH, ASTEROIDS_HEIGHT } from "./engine";
import type {
  AsteroidsGameOverResult,
  GameCanvasHandle,
  GameCanvasProps,
} from "@/components/games/shared/types";
import type { GameSkin } from "@/components/games/shared/skins";
const CONTROL_KEYS = [
  "Space",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
];
type AsteroidsCanvasProps = GameCanvasProps<AsteroidsGameOverResult> & {
  skin?: GameSkin;
};
export const AsteroidsCanvas = forwardRef<
  GameCanvasHandle,
  AsteroidsCanvasProps
>(function AsteroidsCanvas(
  {
    paused,
    skin = "classic",
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const callbacksRef = useRef({
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
  });
  useEffect(() => {
    callbacksRef.current = {
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
    };
  }, [onScoreChange, onLivesChange, onLevelChange, onGameOver]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const engine = new AsteroidsEngine({
      onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
      onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
      onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
      onGameOver: (result) => callbacksRef.current.onGameOver(result),
    });
    engineRef.current = engine;
    engine.setSkin(skin);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && document.activeElement.tagName === "INPUT")
        return;
      if (CONTROL_KEYS.includes(e.code)) e.preventDefault();
      engine.keyDown(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (document.activeElement && document.activeElement.tagName === "INPUT")
        return;
      engine.keyUp(e.code);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    let rafId = 0;
    let lastTime: number | null = null;
    const loop = (ts: number) => {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      engine.update(dt);
      engine.draw(ctx);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
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
  useImperativeHandle(ref, () => ({
    restart: () => engineRef.current?.restart(),
  }));
  return (
    <canvas ref={canvasRef} width={ASTEROIDS_WIDTH} height={ASTEROIDS_HEIGHT} />
  );
});
