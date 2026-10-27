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

// Drawing is paced to 60 a second whatever the display's refresh rate (120, 144, 75 Hz), so a
// phone does not heat up drawing the same state. The next draw time moves on by exactly one
// interval each draw (no drift), and a frame within half a display frame of it counts as on time,
// so a 60 Hz display with jittery frame times is never halved.
export const RENDER_INTERVAL_MS = 1000 / 60;

// Fixed-timestep simulation with a separate render step. `alpha` is how far we
// are between the last and next update, for interpolating drawn positions.
// Stops while the page is hidden and carries on, without a jump, when it is back.
export function startLoop({ update, render }: LoopHandlers, env: LoopEnv = browserEnv()): () => void {
  let last = env.now() / 1000;
  let nextRender = -Infinity;
  let lastTick = env.now();
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

    const half = Math.min(nowMs - lastTick, RENDER_INTERVAL_MS) / 2;
    lastTick = nowMs;
    if (nowMs + half >= nextRender) {
      nextRender = nextRender === -Infinity ? nowMs : nextRender;
      nextRender += RENDER_INTERVAL_MS;
      // Far behind (slow frames): drop the lag instead of drawing back to back.
      if (nextRender < nowMs - RENDER_INTERVAL_MS) nextRender = nowMs;
      render(accumulator / TIMESTEP);
    }
    frame = env.raf(tick);
  };

  env.onVisibility(() => {
    if (stopped || env.hidden() || frame !== null) return;
    // Back from hidden: forget the time away.
    last = env.now() / 1000;
    lastTick = env.now();
    nextRender = -Infinity;
    frame = env.raf(tick);
  });

  if (!env.hidden()) frame = env.raf(tick);
  return () => {
    stopped = true;
    if (frame !== null) env.cancel(frame);
  };
}
