import { afterEach, describe, expect, it, vi } from "vitest";
import { APARTMENT } from "../game/apartment";
import { DESKTOP_VIEW, ENERGY, HUD, MOOD, NARROW_VIEW, setView, VIEW } from "../game/config";
import type { Scoreboard } from "../game/scoring";
import { formatClockShort, type ApartmentState } from "../game/state";
import { Camera } from "./camera";
import { GLYPH_H, textWidth } from "./font";
import { Hud, HUD_ICON_NAMES, energyIcon, moodIcon, stopHintAt, STOP_HINT, timeIcon } from "./hud";
import { HUD_BOX, STATUS_BOX, hudChips, leftChipWidth, RIGHT_CHIP_WIDTH, setScoreDigits, type Box } from "./layout";
import type { SpriteDrawer } from "./sprites";

// Text drawing needs a DOM canvas for its glyph cache; record the calls instead.
const texts: { text: string; x: number; y: number; align?: string }[] = [];
vi.mock("./font", async (original) => ({
  ...(await original<typeof import("./font")>()),
  drawText: (_c: unknown, text: string, x: number, y: number, o?: { align?: string }) => texts.push({ text, x, y, align: o?.align }),
}));

afterEach(() => {
  setView(DESKTOP_VIEW);
  setScoreDigits(0);
});

// Issue 086: the HUD ribbon.
const rects: Box[] = [];
const ctx = new Proxy({} as CanvasRenderingContext2D, {
  get: (_t, name) => (name === "fillRect" ? (x: number, y: number, w: number, h: number) => rects.push({ x, y, w, h }) : () => undefined),
  set: () => true,
});
const sprites = (loaded: boolean) => {
  const drawn: { name: string; x: number; y: number }[] = [];
  const source: SpriteDrawer = { has: () => loaded, draw: (_c, name, x, y) => void drawn.push({ name, x, y }) };
  return { source, drawn };
};
const board = (multiplier: number, left = 10): Scoreboard =>
  ({ multiplier: () => multiplier, comboTimeLeft: () => left }) as unknown as Scoreboard;
const state = (v: { clock: number; energy: number; mood?: number }): ApartmentState =>
  ({ get: (id: string) => (v as Record<string, number>)[id], has: (id: string) => id !== "mood" || v.mood !== undefined }) as unknown as ApartmentState;

// Everything one frame draws, as boxes (text with its 1 px shadow).
function frame(score: number, b: Scoreboard, s: ApartmentState, loaded = true) {
  rects.length = 0;
  texts.length = 0;
  const hud = new Hud();
  hud.update(100, score);
  const sp = sprites(loaded);
  hud.draw(ctx, b, 0, s, sp.source);
  const boxes: Box[] = [
    ...rects,
    ...texts.map((t) => ({ x: t.x, y: t.y, w: textWidth(t.text) + 1, h: GLYPH_H + 1 })),
    ...sp.drawn.map((d) => ({ x: d.x, y: d.y, w: HUD.iconSize, h: HUD.iconSize })),
  ];
  return { boxes, drawn: sp.drawn };
}

describe("icon choices", () => {
  it("shows the clock without AM or PM", () => {
    expect(formatClockShort(9 + 40 / 60)).toBe("9:40");
    expect(formatClockShort(0)).toBe("12:00");
    expect(formatClockShort(12)).toBe("12:00");
    expect(formatClockShort(23.99)).toBe("11:59");
  });
  it("picks sun by day, dusk at the edges and moon at night", () => {
    expect(timeIcon(12)).toBe("icon-sun");
    expect(timeIcon(6)).toBe("icon-dusk");
    expect(timeIcon(18.5)).toBe("icon-dusk");
    expect(timeIcon(23)).toBe("icon-moon");
    expect(timeIcon(2)).toBe("icon-moon");
    expect(timeIcon(25)).toBe(timeIcon(1));
  });
  it("makes low energy and low mood look different", () => {
    expect(energyIcon(ENERGY.lowBelow - 1)).toBe("icon-bolt-low");
    expect(energyIcon(ENERGY.lowBelow)).toBe("icon-bolt");
    expect(moodIcon(MOOD.lowBelow - 1)).toBe("icon-face-sad");
    expect(moodIcon(MOOD.lowBelow)).toBe("icon-face-flat");
    expect(moodIcon(HUD.happyFrom)).toBe("icon-face-happy");
  });
  it("loads every icon it can draw", () => {
    expect(new Set(HUD_ICON_NAMES).size).toBe(9);
  });
});

describe("the ribbon stays in the top band", () => {
  const states = [
    { clock: 9.67, energy: 80, mood: 60 },
    { clock: 23, energy: 3, mood: 0 },
    { clock: 12, energy: 100, mood: 100 },
    { clock: 0, energy: 0 }, // no mood var yet
  ];
  for (const [name, view] of [["desktop", DESKTOP_VIEW], ["narrow", NARROW_VIEW]] as const) {
    it(`draws nothing at or below y ${HUD.band} on the ${name} view, for any score, combo and state`, () => {
      setView(view);
      for (const score of [0, 7, 99999, 123456, 98765432]) {
        for (const b of [board(1), board(2.5, 25), board(3, 0)]) {
          for (const s of states) {
            for (const loaded of [true, false]) {
              for (const box of frame(score, b, state(s), loaded).boxes) {
                expect(box.y + box.h, `${name} score ${score}`).toBeLessThanOrEqual(HUD.band);
                expect(box.x).toBeGreaterThanOrEqual(0);
                expect(box.x + box.w).toBeLessThanOrEqual(view.width);
              }
            }
          }
        }
      }
    });
    it(`keeps the two chips apart on the ${name} view, even for a long score`, () => {
      setView(view);
      for (const digits of [5, 8, 10]) {
        const { left, right } = hudChips(view, digits);
        expect(left.x + left.w, `${digits} digits`).toBeLessThan(right.x);
      }
    });
  }

  it("draws the icons from sprites when loaded, and in text when not", () => {
    const loaded = frame(0, board(1), state({ clock: 9, energy: 10, mood: 10 }));
    expect(loaded.drawn.map((d) => d.name)).toEqual(["icon-star", "icon-sun", "icon-bolt-low", "icon-face-sad"]);
    expect(frame(0, board(1), state({ clock: 9, energy: 10, mood: 10 }), false).drawn).toEqual([]);
  });

  it("draws the clock as 9:40 and the score and combo", () => {
    frame(1234, board(1.5), state({ clock: 9 + 40 / 60, energy: 50, mood: 50 }));
    expect(texts.map((t) => t.text)).toEqual(["1234", "X1.5", "9:40"]);
  });

  it("shows the combo's time left only while a chain is on", () => {
    const bar = (b: Scoreboard) => (frame(0, b, state({ clock: 9, energy: 50, mood: 50 })), rects.filter((r) => r.h === 2).length);
    expect(bar(board(1))).toBe(0);
    expect(bar(board(2))).toBe(2);
  });

  it("sizes the score chip for five digits and widens it to the right after that", () => {
    expect(leftChipWidth(1)).toBe(leftChipWidth(5));
    expect(leftChipWidth(6)).toBe(leftChipWidth(5) + 6);
    const at = (d: number) => hudChips(DESKTOP_VIEW, d).left;
    expect(at(8).x).toBe(at(5).x);
    expect(at(8).w).toBeGreaterThan(at(5).w);
  });

  it("makes the avoid boxes follow the chips", () => {
    setScoreDigits(5);
    const { left, right } = hudChips(VIEW);
    expect(HUD_BOX.x).toBe(0);
    expect(HUD_BOX.x + HUD_BOX.w).toBeGreaterThanOrEqual(left.x + left.w);
    expect(HUD_BOX.y + HUD_BOX.h).toBeGreaterThanOrEqual(left.y + left.h);
    expect(STATUS_BOX.x).toBeLessThanOrEqual(right.x);
    expect(STATUS_BOX.x + STATUS_BOX.w).toBe(VIEW.width);
    expect(STATUS_BOX.y + STATUS_BOX.h).toBeGreaterThanOrEqual(right.y + right.h);
    const before = HUD_BOX.w;
    setScoreDigits(9);
    expect(HUD_BOX.w).toBeGreaterThan(before);
    expect(RIGHT_CHIP_WIDTH).toBe(right.w);
  });
});

describe("the stop hint", () => {
  for (const [name, view] of [["desktop", DESKTOP_VIEW], ["narrow", NARROW_VIEW]] as const) {
    it(`is clear of both chips on the ${name} view`, () => {
      for (const digits of [1, 5, 9]) {
        const { left, right } = hudChips(view, digits);
        const [cx, y] = stopHintAt(view, digits);
        const w = textWidth(STOP_HINT);
        const box = { x: cx - w / 2, y, w: w + 1, h: GLYPH_H + 1 };
        const hit = (c: Box) => box.x < c.x + c.w && box.x + box.w > c.x && box.y < c.y + c.h && box.y + box.h > c.y;
        expect(hit(left), `${name} ${digits} left`).toBe(false);
        expect(hit(right), `${name} ${digits} right`).toBe(false);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.w).toBeLessThanOrEqual(view.width);
        expect(box.y + box.h).toBeLessThanOrEqual(HUD.band);
      }
    });
  }
  it("sits in the gap on the desktop and on its own line on the narrow view", () => {
    expect(stopHintAt(DESKTOP_VIEW, 5)[1]).toBeLessThan(HUD.chipTop + HUD.chipHeight);
    expect(stopHintAt(NARROW_VIEW, 5)[1]).toBeGreaterThanOrEqual(HUD.chipTop + HUD.chipHeight);
  });
});

describe("rooms stay below the band", () => {
  // The HUD only draws above y 32, so no painting, door or prop is covered while every room is
  // drawn starting at y 32 or lower, wherever the camera is.
  for (const [name, view] of [["desktop", DESKTOP_VIEW], ["narrow", NARROW_VIEW]] as const) {
    it(`starts every room at or below y ${HUD.band} on the ${name} view`, () => {
      for (const [id, room] of Object.entries(APARTMENT.rooms)) {
        const camera = new Camera({ ...room.size }, { ...view });
        for (const [tx, ty] of [[0, 0], [room.size.width, room.size.height], [room.size.width / 2, 40]]) {
          camera.snapTo({ x: tx, y: ty });
          expect(-camera.position(1).y, `${id} ${name}`).toBeGreaterThanOrEqual(HUD.band);
        }
      }
    });
  }
});
