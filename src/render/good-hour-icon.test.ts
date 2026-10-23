import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { APARTMENT } from "../game/apartment";
import { VIEW } from "../game/config";
import { Game } from "../game/game";
import type { Interactable } from "../game/interactable";
import { parseTileMap } from "../game/tilemap";
import { TASKS } from "../game/tasks";
import { drawList, LEGEND_TEXT } from "../game/achievements/draw";
import { textWidth } from "./font";
import { Popups } from "./popups";
import { spriteNames } from "./sprite-names";
import type { SpriteDrawer } from "./sprites";
import { GOOD_HOUR_ICON, GOOD_HOUR_ICON_SIZE, drawPrompt, promptSize } from "./world-ui";

// Text drawing needs a DOM canvas for its glyph cache; only the sprite calls matter here.
vi.mock("./font", async (original) => ({ ...(await original<typeof import("./font")>()), drawText: vi.fn() }));

// Issue 055: the good-hour hint is a small icon, with the words as the fallback.

// A canvas that accepts every call, and a sprite source that records draws.
function fakeCtx() {
  return new Proxy({} as CanvasRenderingContext2D, { get: () => () => undefined, set: () => true });
}
function drawer(loaded: boolean) {
  const draw = vi.fn();
  const source: SpriteDrawer = { has: () => loaded, draw };
  return { source, draw };
}

const longest = [...TASKS]
  .map((t) => ({ ...t, zones: [] }) as Interactable)
  .sort((a, b) => promptSize(b, 0).w - promptSize(a, 0).w)[0];

describe("the prompt hint", () => {
  it("is the icon's width when the sprite is loaded, and the words' width when not", () => {
    const base = promptSize(longest, 0, null, false).w;
    expect(promptSize(longest, 0, null, true, true).w).toBe(base + 5 + GOOD_HOUR_ICON_SIZE);
    expect(promptSize(longest, 0, null, true, false).w).toBeGreaterThan(promptSize(longest, 0, null, true, true).w);
  });

  it("fits on one line at the view width with the longest real task name, icon or words", () => {
    for (const icon of [true, false]) {
      for (const t of TASKS) {
        const w = promptSize({ ...t, zones: [] } as Interactable, 0, null, true, icon).w;
        expect(w, `${t.id} icon=${icon}`).toBeLessThan(VIEW.width - 8);
      }
    }
  });

  it("draws the icon sprite when it has loaded, and no words", () => {
    const { source, draw } = drawer(true);
    drawPrompt(fakeCtx(), { x: 100, y: 100, w: 16, h: 16 }, longest, 0, VIEW, [], null, true, source);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(draw.mock.calls[0][1]).toBe(GOOD_HOUR_ICON);
  });

  it("falls back to the words when the sprite is missing", () => {
    const { source, draw } = drawer(false);
    drawPrompt(fakeCtx(), { x: 100, y: 100, w: 16, h: 16 }, longest, 0, VIEW, [], null, true, source);
    drawPrompt(fakeCtx(), { x: 100, y: 100, w: 16, h: 16 }, longest, 0, VIEW, [], null, true);
    expect(draw).not.toHaveBeenCalled();
  });

  it("draws nothing extra when it is not a good hour", () => {
    const { source, draw } = drawer(true);
    drawPrompt(fakeCtx(), { x: 100, y: 100, w: 16, h: 16 }, longest, 0, VIEW, [], null, false, source);
    expect(draw).not.toHaveBeenCalled();
  });
});

describe("the award popup line", () => {
  it("is wider with an icon than without, by the icon and its gap", () => {
    const plain = new Popups();
    const iconic = new Popups();
    plain.add(160, 96, [{ text: "X1.5", color: "#fff" }]);
    iconic.add(160, 96, [{ text: "X1.5", color: "#fff", icon: { name: GOOD_HOUR_ICON, size: GOOD_HOUR_ICON_SIZE } }]);
    const [a] = plain.boxes(VIEW);
    const [b] = iconic.boxes(VIEW);
    expect(b.w).toBe(a.w + GOOD_HOUR_ICON_SIZE + 2);
    expect(b.h).toBe(Math.max(a.h, GOOD_HOUR_ICON_SIZE));
  });

  it("draws the icon in the popup", () => {
    const { source, draw } = drawer(true);
    const popups = new Popups(source);
    popups.add(160, 96, [{ text: "X1.5", color: "#fff", icon: { name: GOOD_HOUR_ICON, size: GOOD_HOUR_ICON_SIZE } }]);
    popups.draw(fakeCtx(), VIEW);
    expect(draw).toHaveBeenCalledTimes(1);
  });
});

describe("the award popup in the game", () => {
  const press: Controls = { ...NO_INPUT, interactPressed: true };
  const tea = { id: "tea", name: "Make tea", prompt: "Make tea", duration: 0.2, points: 100, cooldown: 1, goodHours: [{ from: 6, to: 10 }] };
  const level = () => ({
    ...parseTileMap(["##########", "#........#", "#..@S....#", "#........#", "##########"], {
      S: { color: "mist", tasks: ["tea"] },
    }, { tasks: [tea] }),
    facing: "right" as const,
  });
  const lines = (sprites: SpriteDrawer | undefined) => {
    const add = vi.spyOn(Popups.prototype, "add");
    const game = new Game(level(), { sprites });
    game.state.applyEffects([{ var: "clock", set: 8 }]);
    game.update(1 / 60, press);
    for (let i = 0; i < 40; i++) game.update(1 / 60, NO_INPUT);
    const out = add.mock.calls.flatMap((c) => c[2]);
    add.mockRestore();
    return out;
  };

  it("uses the icon and a short multiplier when the sprite has loaded", () => {
    const line = lines(drawer(true).source).find((l) => l.icon);
    expect(line?.text).toBe("X1.5");
    expect(line?.icon?.name).toBe(GOOD_HOUR_ICON);
  });

  it("says GOOD HOUR in words when the sprite is missing or there are no sprites", () => {
    for (const sprites of [drawer(false).source, undefined]) {
      const all = lines(sprites);
      expect(all.some((l) => l.icon)).toBe(false);
      expect(all.map((l) => l.text)).toContain("GOOD HOUR X1.5");
    }
  });
});

describe("the legend and the sprite", () => {
  it("shows a legend in the achievements list only when the icon can be drawn", () => {
    const view = { achievements: [], unlocked: () => false, cursor: 0, message: null };
    const yes = drawer(true);
    drawList(fakeCtx(), { ...view, sprites: yes.source });
    expect(yes.draw).toHaveBeenCalledTimes(1);
    const no = drawer(false);
    drawList(fakeCtx(), { ...view, sprites: no.source });
    drawList(fakeCtx(), view);
    expect(no.draw).not.toHaveBeenCalled();
    expect(textWidth(LEGEND_TEXT) + GOOD_HOUR_ICON_SIZE + 3 + 6 * 2).toBeLessThan(VIEW.width);
  });

  it("is loaded with the other sprites", () => {
    expect(spriteNames(Object.values(APARTMENT.rooms))).toContain(GOOD_HOUR_ICON);
  });
});
