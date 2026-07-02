import { useEffect, useRef } from 'react';
import { Engine } from '../game/engine';
import { computeViewport, render } from '../render/draw';

interface Props {
  engine: Engine;
  onTap: () => void;
}

// Owns the canvas and the requestAnimationFrame loop. The engine mutates its
// own state each tick; React never re-renders for gameplay frames.
export function GameCanvas({ engine, onTap }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let vp = computeViewport(innerWidth, innerHeight);

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2.5);
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      vp = computeViewport(innerWidth, innerHeight);
    };
    resize();
    addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      engine.tick(dt);
      render(ctx, engine, vp, innerWidth, innerHeight);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
    };
  }, [engine]);

  return <canvas id="game" ref={ref} onPointerDown={onTap} />;
}
