import { VIEW } from "../game/config";

export interface Screen {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

// Sets up a fixed-resolution canvas and keeps it scaled to the window using
// the largest whole-number factor, so pixels stay crisp.
export function createScreen(canvas: HTMLCanvasElement): Screen {
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context not available");
  ctx.imageSmoothingEnabled = false;

  const fit = () => {
    const scale = Math.max(
      1,
      Math.floor(
        Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height),
      ),
    );
    canvas.style.width = `${VIEW.width * scale}px`;
    canvas.style.height = `${VIEW.height * scale}px`;
  };
  fit();
  window.addEventListener("resize", fit);

  return { canvas, ctx };
}
