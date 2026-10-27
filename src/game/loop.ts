import { MAX_FRAME_TIME, TIMESTEP } from "./config";

interface LoopHandlers {
  update(dt: number): void;
  render(alpha: number): void;
}

// What the loop needs from the page, so a test can stand in for it.
export interface LoopEnv {
  raf(callback: (nowMs: number) => void): number;
  cancel(id: number): void;
  now(): number;
  // The page's visibility: `hidden` now, and a way to hear it change.
  hidden(): boolean;
  onVisibility(listener: () => void): void;
}

const browserEnv = (): LoopEnv => ({
  raf: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
  now: () => performance.now(),
  hidden: () => typeof document !== "undefined" && document.hidden,
  onVisibility: (listener) => document.addEventListener("visibilitychange", listener),
});

// Drawing is capped near 60 a second (a 120 Hz phone would otherwise heat up for nothing).
// A little under 1000/60 so a steady 60 Hz display, whose frames jitter, is never halved.
export const RENDER_INTERVAL_MS = 1000 / 60 - 1.5;

// Fixed-timestep simulation with a separate render step. `alpha` is how far we
// are between the last and next update, for interpolating drawn positions.
// Stops while the page is hidden and carries on, without a jump, when it is back.
export function startLoop({ update, render }: LoopHandlers, env: LoopEnv = browserEnv()): () => void {
  let last = env.now() / 1000;
  let lastRender = -Infinity;
  let accumulator = 0;
  let frame: number | null = null;
  let stopped = false;

  const tick = (nowMs: number) => {
    frame = null;
    if (stopped || env.hidden()) return;
    const now = nowMs / 1000;
    accumulator += Math.min(now - last, MAX_FRAME_TIME);
    last = now;

    while (accumulator >= TIMESTEP) {
      update(TIMESTEP);
      accumulator -= TIMESTEP;
    }

    if (nowMs - lastRender >= RENDER_INTERVAL_MS) {
      lastRender = nowMs;
      render(accumulator / TIMESTEP);
    }
    frame = env.raf(tick);
  };

  env.onVisibility(() => {
    if (stopped || env.hidden() || frame !== null) return;
    // Back from hidden: forget the time away.
    last = env.now() / 1000;
    frame = env.raf(tick);
  });

  if (!env.hidden()) frame = env.raf(tick);
  return () => {
    stopped = true;
    if (frame !== null) env.cancel(frame);
  };
}
