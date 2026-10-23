import { MAX_FRAME_TIME, TIMESTEP } from "./config";

interface LoopHandlers {
  update(dt: number): void;
  render(alpha: number): void;
}

// Fixed-timestep simulation with a separate render step. `alpha` is how far we
// are between the last and next update, for interpolating drawn positions.
export function startLoop({ update, render }: LoopHandlers): () => void {
  let last = performance.now() / 1000;
  let accumulator = 0;
  let frame = 0;

  const tick = (nowMs: number) => {
    const now = nowMs / 1000;
    accumulator += Math.min(now - last, MAX_FRAME_TIME);
    last = now;

    while (accumulator >= TIMESTEP) {
      update(TIMESTEP);
      accumulator -= TIMESTEP;
    }

    render(accumulator / TIMESTEP);
    frame = requestAnimationFrame(tick);
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}
