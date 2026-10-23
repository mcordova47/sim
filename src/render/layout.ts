export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Screen area the HUD occupies. World labels (prompts, progress bars) are
// kept out of it.
export const HUD_BOX: Box = { x: 0, y: 0, w: 152, h: 38 };

const MARGIN = 2;

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Places a label box of `size` near an anchor, centred on `anchor.x`. It tries
// above the anchor, then below it, and for each of those slides it clear of
// anything in `avoid` if needed. The first spot that is on screen and clear
// wins; if none is, the label goes below the anchor, clamped on screen.
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

  const candidates: Box[] = [
    { x, y: aboveY, ...size },
    { x, y: belowY, ...size },
    { x: clearX, y: aboveY, ...size },
    { x: clearX, y: belowY, ...size },
  ];

  const onScreen = (b: Box) => b.y >= MARGIN && b.y + b.h <= view.height - MARGIN;
  const fits = candidates.find((b) => onScreen(b) && !avoid.some((a) => intersects(b, a)));
  return fits ?? candidates[1];
}
