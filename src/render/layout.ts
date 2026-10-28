import { HUD, VIEW } from "../game/config";
import { textWidth } from "./font";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The HUD is two chips in the empty top band of the picture (issue 086): score and combo at the
// left, clock, energy and mood at the right. The boxes below are what labels, popups and toasts
// keep clear of: each chip plus a 2 px margin. The left one widens with the score's digits.
const MARGIN = 2;
const CHIP_BOTTOM = HUD.chipTop + HUD.chipHeight;

// The text the clock field is sized for ("12:40"), so the chip does not change width as it ticks.
export const CLOCK_FIELD = "88:88";
export const COMBO_TEXT = "X1.0";

// Width of the left chip (star, score, combo) for a score of `digits` digits.
export function leftChipWidth(digits: number): number {
  const score = textWidth("8".repeat(Math.max(digits, HUD.scoreDigits)));
  return HUD.pad + HUD.iconSize + HUD.iconGap + score + HUD.groupGap + textWidth(COMBO_TEXT) + HUD.pad;
}

// Width of the right chip: time icon and clock, then an icon with a small bar for energy and for
// mood, then the phone slot (icon and bar).
export const RIGHT_CHIP_WIDTH =
  HUD.pad +
  HUD.iconSize + HUD.iconGap + textWidth(CLOCK_FIELD) +
  2 * (HUD.groupGap + HUD.iconSize + HUD.iconGap + HUD.barWidth) +
  HUD.phoneSlotWidth +
  HUD.pad;

let scoreDigits = HUD.scoreDigits;
// The HUD tells the layout how many digits the score being shown has.
export function setScoreDigits(digits: number): void {
  scoreDigits = Math.max(digits, HUD.scoreDigits);
}

// The chips themselves, for the current score and view width.
export function hudChips(view: { width: number }, digits = scoreDigits): { left: Box; right: Box } {
  const right = RIGHT_CHIP_WIDTH;
  return {
    left: { x: HUD.edge, y: HUD.chipTop, w: leftChipWidth(digits), h: HUD.chipHeight },
    right: { x: view.width - HUD.edge - right, y: HUD.chipTop, w: right, h: HUD.chipHeight },
  };
}

// Screen area of the score chip, top left. It widens with the score.
export const HUD_BOX: Box = {
  x: 0,
  y: 0,
  get w() {
    return HUD.edge + leftChipWidth(scoreDigits) + MARGIN;
  },
  h: CHIP_BOTTOM + MARGIN,
};

// Screen area of the clock, energy and mood chip, top right. It hugs the right edge of the
// current view (320 px on the desktop, 224 on the narrow view).
export const STATUS_BOX: Box = {
  get x() {
    return VIEW.width - HUD.edge - RIGHT_CHIP_WIDTH - MARGIN;
  },
  y: 0,
  get w() {
    return VIEW.width - this.x;
  },
  h: CHIP_BOTTOM + MARGIN,
};


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
