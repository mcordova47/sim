import { ENCOUNTERS } from "./config";
import { COLOR, paletteColor } from "../render/colors";

// How an ad encounter's card comes and goes (issue 080): a pure timeline from a frame count, and a
// small draw function, so both are tested without a canvas. `enter` runs a buzz with two flashes,
// then bars slide across and cover the screen and part to show the card. `exit` is the same wipe,
// quicker, back to the room. With reduced motion there is no shake, flash or bars: a plain fade.

export type Phase = "enter" | "exit";

export interface TransitionFrame {
  // Pixels to move the whole screen this frame.
  shake: { x: number; y: number };
  // 0 or 1: a white flash over everything.
  flash: number;
  // Bars covering the screen: 0..1 how far they have slid in (cover) and how far they have slid out the far side (part).
  cover: number;
  part: number;
  // Whether the card is drawn, and how opaque (below 1 only in the reduced fade).
  card: boolean;
  cardAlpha: number;
  // The phase has run its course.
  done: boolean;
}

const E = ENCOUNTERS.entrance;

// Frames before the bars start: the buzz and the flashes.
const LEAD = Math.max(E.shakeFrames, ...E.flashes.map(([at, n]) => at + n));

export function entranceFrames(reduced: boolean): number {
  return reduced ? E.fadeInFrames : LEAD + E.coverFrames + E.partFrames;
}

export function exitFrames(reduced: boolean): number {
  return reduced ? E.fadeOutFrames : E.exitCoverFrames + E.exitPartFrames;
}

// Where the screen is on frame `frame` (0 is the first frame shown) of the phase.
export function transitionFrame(phase: Phase, frame: number, reduced: boolean): TransitionFrame {
  const f = Math.max(0, Math.floor(frame));
  const total = phase === "enter" ? entranceFrames(reduced) : exitFrames(reduced);
  const done = f >= total;
  if (reduced) {
    const t = Math.min(1, f / total);
    return { shake: { x: 0, y: 0 }, flash: 0, cover: 0, part: 0, card: phase === "enter" ? f > 0 : !done, cardAlpha: phase === "enter" ? t : 1 - t, done };
  }
  if (phase === "enter") {
    // The buzz and the flashes come first, then the bars.
    const lead = LEAD;
    const shaking = f < E.shakeFrames;
    const flash = E.flashes.some(([at, n]) => f >= at && f < at + n) ? 1 : 0;
    const cover = Math.min(1, Math.max(0, (f - lead + 1) / E.coverFrames));
    const part = Math.min(1, Math.max(0, (f - lead - E.coverFrames + 1) / E.partFrames));
    return {
      shake: shaking ? { x: f % 2 === 0 ? E.shakePixels : -E.shakePixels, y: f % 4 < 2 ? 0 : E.shakePixels } : { x: 0, y: 0 },
      flash,
      cover,
      part,
      card: f >= lead + E.coverFrames,
      cardAlpha: 1,
      done,
    };
  }
  const cover = Math.min(1, (f + 1) / E.exitCoverFrames);
  const part = Math.min(1, Math.max(0, (f - E.exitCoverFrames + 1) / E.exitPartFrames));
  return { shake: { x: 0, y: 0 }, flash: 0, cover, part, card: f < E.exitCoverFrames && !done, cardAlpha: 1, done };
}

// The bars as rectangles: even bars slide in from the left and out the right, odd bars the other way.
export function barRects(cover: number, part: number, screen: { width: number; height: number }): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  if (cover <= 0 && part <= 0) return out;
  const n = E.bars;
  for (let i = 0; i < n; i++) {
    const y = Math.round((i * screen.height) / n);
    const h = Math.round(((i + 1) * screen.height) / n) - y;
    const fromLeft = i % 2 === 0;
    // Covered: from the entry edge. Parting: only what has not yet slid out the far side.
    const covered = part > 0 ? 1 - part : cover;
    const w = Math.round(covered * screen.width);
    if (w <= 0) continue;
    const entersLeft = fromLeft;
    // While parting, the bar's remaining part is at the far edge of its way through.
    const x = part > 0 ? (entersLeft ? screen.width - w : 0) : entersLeft ? 0 : screen.width - w;
    out.push({ x, y, w, h });
  }
  return out;
}

// Draws the bars and the flash of `t` over whatever is on the canvas, and moves the screen by its shake.
// Call it after the card (or the room) is drawn.
export function drawTransition(ctx: CanvasRenderingContext2D, t: TransitionFrame, screen: { width: number; height: number }): void {
  if (t.shake.x !== 0 || t.shake.y !== 0) ctx.drawImage(ctx.canvas, t.shake.x, t.shake.y);
  for (const r of barRects(t.cover, t.part, screen)) {
    ctx.fillStyle = paletteColor(E.barColor);
    ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  if (t.flash > 0) {
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(0, 0, screen.width, screen.height);
  }
}
