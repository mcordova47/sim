import { DESKTOP_VIEW as PICTURE } from "./config";

// A full-screen picture (an ad card, a cutscene view, the gallery wall) is always drawn at the
// desktop size, so its window arithmetic never follows the phone's narrower view (issue 090).

// The window of a full-screen picture that is on screen, in picture pixels.
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The whole picture (1x).
export const FULL_VIEW: ViewRect = { x: 0, y: 0, w: PICTURE.width, h: PICTURE.height };

// The scales a view may take: whole numbers, so every picture pixel stays a
// crisp square on screen.
export const ZOOM_SCALES = [1, 2, 4, 8];

// Why a rectangle is not a valid zoom target, or null if it is: it must be a
// whole-number window of the screen's shape at one of `ZOOM_SCALES`, inside the picture.
export function zoomProblem(r: unknown): string | null {
  if (typeof r !== "object" || r === null) return "zoom needs a target { x, y, w, h }";
  const { x, y, w, h } = r as Record<string, unknown>;
  if (![x, y, w, h].every((n) => Number.isInteger(n))) return "the zoom target needs whole numbers x, y, w and h";
  const [rx, ry, rw, rh] = [x, y, w, h] as number[];
  const scale = PICTURE.width / rw;
  if (!ZOOM_SCALES.includes(scale) || rh !== PICTURE.height / scale) {
    return `the zoom target must be ${ZOOM_SCALES.map((s) => `${PICTURE.width / s}x${PICTURE.height / s}`).join(", ")} (a whole-number zoom of the screen)`;
  }
  if (rx < 0 || ry < 0 || rx + rw > PICTURE.width || ry + rh > PICTURE.height) return "the zoom target must lie inside the picture";
  return null;
}

// The scales passed through on the way from one to another, the last one
// included, never the first: 1 to 8 goes 2, 4, 8.
function stages(from: number, to: number): number[] {
  const out: number[] = [];
  for (let s = from; s !== to; ) {
    s = to > from ? s * 2 : s / 2;
    out.push(s);
  }
  return out;
}

// What the view looks like `progress` (0 up to, not including, 1) of the way
// through a push from one window to another. It holds the old window for the
// first beat, then steps through each whole-number scale on the way, the
// center sliding as it goes. Never a blend, so every frame is crisp.
export function pushedView(from: ViewRect, to: ViewRect, progress: number): ViewRect {
  const scales = stages(PICTURE.width / from.w, PICTURE.width / to.w);
  const beat = Math.floor(Math.max(0, Math.min(0.999999, progress)) * (scales.length + 1));
  if (beat === 0) return from;
  const scale = scales[beat - 1];
  const w = PICTURE.width / scale;
  const h = PICTURE.height / scale;
  const cx = from.x + from.w / 2 + (to.x + to.w / 2 - (from.x + from.w / 2)) * progress;
  const cy = from.y + from.h / 2 + (to.y + to.h / 2 - (from.y + from.h / 2)) * progress;
  return {
    x: Math.min(PICTURE.width - w, Math.max(0, Math.round(cx - w / 2))),
    y: Math.min(PICTURE.height - h, Math.max(0, Math.round(cy - h / 2))),
    w,
    h,
  };
}
