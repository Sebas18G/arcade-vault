"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  InvasoresEngine,
  INVASORES_WIDTH,
  INVASORES_HEIGHT,
  type InvasoresInput,
} from "./engine";
import type {
  GameCanvasHandle,
  GameCanvasProps,
  InvasoresGameOverResult,
} from "@/components/games/shared/types";
import { DEFAULT_GAME_SKIN } from "@/components/games/shared/skins";
// Flechas y A/D en simultáneo, siguiendo el precedente de Snake (spec 08) y
// Frogger (spec 09). El disparo va en Space.
function inputFromKey(key: string): InvasoresInput | null {
  switch (key) {
    case "ArrowLeft":
    case "a":
    case "A":
      return "LEFT";
    case "ArrowRight":
    case "d":
    case "D":
      return "RIGHT";
    case " ":
    case "Spacebar":
      return "FIRE";
    default:
      return null;
  }
}
export const InvasoresCanvas = forwardRef<
  GameCanvasHandle,
  GameCanvasProps<InvasoresGameOverResult>
>(function InvasoresCanvas(
  {
    paused,
    skin = DEFAULT_GAME_SKIN,
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<InvasoresEngine | null>(null);
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
    const engine = new InvasoresEngine({
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
      const input = inputFromKey(e.key);
      if (!input) return;
      e.preventDefault();
      engine.keyDown(input);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const input = inputFromKey(e.key);
      if (!input) return;
      engine.keyUp(input);
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
    <canvas ref={canvasRef} width={INVASORES_WIDTH} height={INVASORES_HEIGHT} />
  );
});
