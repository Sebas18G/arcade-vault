"use client";
import { useEffect, useRef } from "react";
import {
  TETRIS_NEXT_SIZE,
  drawTetrisPreview,
} from "@/components/games/tetris/engine";
import type {
  TetrisPieceSnapshot,
  TetrisSkin,
} from "@/components/games/tetris/engine";
export function NextPieceCanvas({
  piece,
  skin,
  className,
}: {
  piece: TetrisPieceSnapshot | null;
  skin: TetrisSkin;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawTetrisPreview(ctx, piece, skin);
  }, [piece, skin]);
  return (
    <canvas
      ref={canvasRef}
      width={TETRIS_NEXT_SIZE}
      height={TETRIS_NEXT_SIZE}
      className={className}
    />
  );
}
