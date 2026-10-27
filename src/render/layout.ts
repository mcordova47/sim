import { VIEW } from "../game/config";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Screen area the HUD occupies. World labels (prompts, progress bars, popups)
// are kept out of it.
export const HUD_BOX: Box = { x: 0, y: 0, w: 152, h: 38 };

// Screen area of the clock, energy and mood meters, top right.
// It hugs the right edge of the view (x = 244 on the desktop's 320 px).
export const STATUS_BOX: Box = {
  get x() {
    return VIEW.width - 76;
  },
  y: 0,
  w: 76,
  h: 50,
};

const MARGIN = 2;

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

// Keeps `box` on screen and, if it still overlaps something in `avoid`, moves
// it the shortest way out: to the right of it or below it. If nothing clears
// everything, the on-screen position is returned.
export function fitBox(
  box: Box,
  view: { width: number; height: number },
  avoid: Box[] = [HUD_BOX],
): Box {
  const onScreen = (b: Box): Box => ({
    ...b,
    x: clamp(b.x, MARGIN, view.width - b.w - MARGIN),
    y: clamp(b.y, MARGIN, view.height - b.h - MARGIN),
  });
  const start = onScreen(box);
  const hits = avoid.filter((a) => intersects(start, a));
  if (hits.length === 0) return start;

  const moves = hits.flatMap((a) => [
    onScreen({ ...start, x: a.x + a.w + MARGIN }),
    onScreen({ ...start, y: a.y + a.h + MARGIN }),
  ]);
  const clear = moves.filter((m) => !avoid.some((a) => intersects(m, a)));
  const distance = (m: Box) => Math.abs(m.x - start.x) + Math.abs(m.y - start.y);
  return clear.sort((a, b) => distance(a) - distance(b))[0] ?? start;
}

// Places a label box of `size` near an anchor, centred on `anchor.x`. It tries
// above the anchor, then below it, and for each of those slides it clear of
// anything in `avoid` if needed. If that fails (a label too wide to slide
// aside), it tries the strip just under everything in `avoid`. The first spot
// that is on screen and clear wins; if none is, the label goes below the
// anchor, clamped on screen.
export function placeLabel(
  anchor: { x: number; top: number; bottom: number },
  size: { w: number; h: number },
  view: { width: number; height: number },
  avoid: Box[] = [HUD_BOX],
  gap = 3,
): Box {
  const maxX = view.width - size.w - MARGIN;
  const x = Math.min(Math.max(Math.round(anchor.x - size.w / 2), MARGIN), maxX);
  const clearX = Math.min(
    Math.max(MARGIN, ...avoid.map((b) => b.x + b.w + MARGIN)),
    maxX,
  );

  const aboveY = Math.round(anchor.top - gap - size.h);
  const belowY = Math.min(Math.round(anchor.bottom + gap), view.height - size.h - MARGIN);
  const underY = Math.max(MARGIN, ...avoid.map((b) => b.y + b.h + MARGIN));

  const candidates: Box[] = [
    { x, y: aboveY, ...size },
    { x, y: belowY, ...size },
    { x: clearX, y: aboveY, ...size },
    { x: clearX, y: belowY, ...size },
    { x, y: underY, ...size },
  ];

  const onScreen = (b: Box) => b.y >= MARGIN && b.y + b.h <= view.height - MARGIN;
  const fits = candidates.find((b) => onScreen(b) && !avoid.some((a) => intersects(b, a)));
  return fits ?? candidates[1];
}
