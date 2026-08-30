"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { ArkanoidEngine, ARKANOID_WIDTH, ARKANOID_HEIGHT } from "./engine";
import type {
  GameCanvasHandle,
  GameCanvasProps,
} from "@/components/games/shared/types";
export const ArkanoidCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function ArkanoidCanvas(
    { paused, onScoreChange, onLivesChange, onLevelChange, onGameOver },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<ArkanoidEngine | null>(null);
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
      const engine = new ArkanoidEngine({
        onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
        onLivesChange: (lives) => callbacksRef.current.onLivesChange(lives),
        onLevelChange: (level) => callbacksRef.current.onLevelChange(level),
        onGameOver: (result) => callbacksRef.current.onGameOver(result),
      });
      engineRef.current = engine;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          document.activeElement &&
          document.activeElement.tagName === "INPUT"
        )
          return;
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
          engine.setKey("left", true);
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
          engine.setKey("right", true);
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          engine.confirmLevelComplete();
        }
      };
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
          engine.setKey("left", false);
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
          engine.setKey("right", false);
      };
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = ARKANOID_WIDTH / rect.width;
        const x = (e.clientX - rect.left) * scaleX;
        engine.setPaddleFromPointer(x);
      };
      canvas.addEventListener("mousemove", handleMouseMove);
      let rafId = 0;
      const loop = () => {
        engine.update();
        engine.draw(ctx);
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        canvas.removeEventListener("mousemove", handleMouseMove);
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
      <canvas ref={canvasRef} width={ARKANOID_WIDTH} height={ARKANOID_HEIGHT} />
    );
  },
);
