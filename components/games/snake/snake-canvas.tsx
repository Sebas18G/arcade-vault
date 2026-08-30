"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  SerpentinaEngine,
  SERPENTINA_WIDTH,
  SERPENTINA_HEIGHT,
  type Direction,
} from "./engine";
import type {
  GameCanvasHandle,
  GameCanvasProps,
  GameOverResult,
} from "@/components/games/shared/types";
function directionFromKey(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "UP";
    case "ArrowDown":
    case "s":
    case "S":
      return "DOWN";
    case "ArrowLeft":
    case "a":
    case "A":
      return "LEFT";
    case "ArrowRight":
    case "d":
    case "D":
      return "RIGHT";
    default:
      return null;
  }
}
export const SerpentinaCanvas = forwardRef<
  GameCanvasHandle,
  GameCanvasProps<GameOverResult>
>(function SerpentinaCanvas(
  { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SerpentinaEngine | null>(null);
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
    const engine = new SerpentinaEngine({
      onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
      onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
      onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
      onGameOver: (result) => callbacksRef.current.onGameOver(result),
    });
    engineRef.current = engine;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && document.activeElement.tagName === "INPUT")
        return;
      const direction = directionFromKey(e.key);
      if (!direction) return;
      e.preventDefault();
      engine.keyDown(direction);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const direction = directionFromKey(e.key);
      if (!direction) return;
      engine.keyUp(direction);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    let rafId = 0;
    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
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
  }, []);
  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);
  useImperativeHandle(ref, () => ({
    restart: () => engineRef.current?.restart(),
  }));
  return (
    <canvas
      ref={canvasRef}
      width={SERPENTINA_WIDTH}
      height={SERPENTINA_HEIGHT}
    />
  );
});
