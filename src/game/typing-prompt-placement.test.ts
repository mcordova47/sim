import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import { COLOR } from "../render/colors";
import { GLYPH_H } from "../render/font";
import { APARTMENT } from "./apartment";
import { TypingActivity } from "./activities/typing";
import { DESKTOP_VIEW, NARROW_VIEW, TILE, TYPING, VIEW, setView } from "./config";
import { Game } from "./game";
import { POSES } from "./poses";

// Issue 100: the typing prompt must not cover the seated player (the desk pose), on the desktop
// view and on the narrow phone view.
const dt = 1 / 60;
type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function playTyping(view: { width: number; height: number }) {
  setView(view);
  const rects: (Rect & { style: string })[] = [];
  let style = "";
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) =>
        prop === "fillRect"
          ? (x: number, y: number, w: number, h: number) => rects.push({ x, y, w, h, style })
          : () => {},
      set: (_t, prop, value) => {
        if (prop === "fillStyle") style = String(value);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  const sprites = { has: () => true, draw: () => {}, drawRegion: () => {} };
  const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, sprites });
  const p = game.player;
  p.col = 6;
  p.row = 3;
  p.x = p.prevX = 6 * TILE;
  p.y = p.prevY = 3 * TILE;
  p.facing = "up";
  game.update(dt, { ...NO_INPUT, interactPressed: true });
  expect(game.interaction.active?.item.id).toBe("work");
  for (let i = 0; i < 90; i++) game.update(dt, NO_INPUT);
  rects.length = 0;
  game.render(ctx, 1);
  const cam = (game as unknown as { camera: { position(a: number): { x: number; y: number } } }).camera.position(1);
  // The pose picture, from the pose table and the desk's tile position (col 6, row 1).
  const def = POSES["type-desk"];
  const seated = { x: 6 * TILE + def.at.x - cam.x, y: 1 * TILE + def.at.y - cam.y, w: def.size.w, h: def.size.h };
  // The prompt: an ink rect with a night-coloured rect one pixel inside it.
  const box = rects.find((r, i) => r.style === COLOR.ink && r.w > 60 && rects[i + 1]?.style === COLOR.night && rects[i + 1].x === r.x + 1)!;
  return { box, seated, game };
}

afterEach(() => {
  setView(DESKTOP_VIEW);
  vi.unstubAllGlobals();
});

describe("the typing prompt and the seated player", () => {
  it.each([
    ["desktop", DESKTOP_VIEW],
    ["narrow phone", NARROW_VIEW],
  ])("keeps clear of the seated player on the %s view", (_n, view) => {
    const { box, seated, game } = playTyping(view);
    expect(box).toBeDefined();
    expect(game.playerScreenRect({ x: 0, y: 0 }).w).toBe(16);
    expect(overlaps(box, seated)).toBe(false);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.h).toBeLessThanOrEqual(view.height);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.w).toBeLessThanOrEqual(view.width);
  });

  it.each([
    ["desktop", DESKTOP_VIEW, 64],
    ["narrow phone", NARROW_VIEW, 80],
  ])("also clears the pose with the longest prompt (%s)", (_n, view, seatedTop) => {
    const seated = { x: Math.round(view.width / 2) - 8, y: seatedTop, w: 16, h: 32 };
    const h = TYPING.maxLines * (GLYPH_H + 3) + 22;
    for (const w of [60, view.width - 24]) {
      const place = TypingActivity.boxPlace(view, w, h, seated);
      expect(overlaps({ ...place, w, h }, seated)).toBe(false);
      expect(place.y + h).toBeLessThanOrEqual(view.height);
    }
  });

  it("is centred when nobody is in the way", () => {
    expect(TypingActivity.boxPlace(VIEW, 100, 40)).toEqual({ x: 110, y: 76 });
  });
});
