import { describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { APARTMENT } from "./apartment";
import { PLANT } from "./config";
import { Decor, fits } from "./decor";
import { DECOR_DATA, DECOR_SLOTS, FAMILIES, itemSprites } from "./decor-data";
import { Game } from "./game";
import { settlePlant } from "./plant";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";

// Issue 149: the pothos and monstera grow past four stages, the late stages are taller than the slot and
// drawn over the bookshelf's top; the snake plant and spider plant are as they were.

const shelf = DECOR_SLOTS.find((s) => s.id === "plant-shelf")!;
const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });
const spriteExists = (name: string) => `/public/sprites/${name}.png` in spriteFiles;
const stateWith = (stage: number, dry = 0) => {
  const s = new ApartmentState(STATE_VARS);
  s.applyEffects([{ var: "plantStage", set: stage }, { var: "plantDry", set: dry }]);
  return s;
};
const holding = (id: string) => {
  const d = new Decor();
  d.own(id);
  d.place("plant-shelf", id);
  return d;
};
// The drawn size of a sprite, from the size line of its source file.
const sources = import.meta.glob("/art/src/*.sprite", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const size = (name: string) => {
  const m = /^size: (\d+)x(\d+)/m.exec(sources[`/art/src/${name}.sprite`] ?? "");
  return { w: Number(m?.[1]), h: Number(m?.[2]) };
};

describe("stages are per family", () => {
  it("the snake plant and spider plant keep four stages and the shared thresholds", () => {
    expect(FAMILIES.plant).toEqual({ stages: 4, droops: true });
    expect(FAMILIES.spider).toEqual({ stages: 4, droops: true });
    expect(new Decor().growth("plant-shelf")).toEqual({ lastStage: PLANT.lastStage, wateringsToGrow: PLANT.wateringsToGrow });
    expect(holding("plant-spider").growth("plant-shelf")).toEqual({ lastStage: 3, wateringsToGrow: [2, 3, 4] });
  });

  it("the pothos has six stages and the monstera five, each with its own thresholds", () => {
    expect(FAMILIES.pothos.stages).toBe(6);
    expect(FAMILIES.pothos.wateringsToGrow).toEqual([2, 3, 4, 6, 8]);
    expect(FAMILIES.monstera.stages).toBe(5);
    expect(FAMILIES.monstera.wateringsToGrow).toEqual([2, 3, 4, 7]);
    const growthMax = STATE_VARS.find((v) => v.id === "plantGrowth")!.max;
    for (const f of [FAMILIES.pothos, FAMILIES.monstera]) {
      expect(f.wateringsToGrow).toHaveLength(f.stages - 1);
      // The first three steps are the snake plant's, so nothing earlier changes.
      expect(f.wateringsToGrow!.slice(0, 3)).toEqual(PLANT.wateringsToGrow);
      expect(Math.max(...f.wateringsToGrow!)).toBeLessThanOrEqual(growthMax);
    }
    // The stage variable's maximum follows the longest family.
    expect(STATE_VARS.find((v) => v.id === "plantStage")!.max).toBe(Math.max(...Object.values(FAMILIES).map((f) => f.stages)) - 1);
  });

  it("the pothos and monstera reach every stage by their own waterings, one stage at a time", () => {
    for (const [id, family] of [["plant-pothos", "pothos"], ["plant-monstera", "monstera"]] as const) {
      const decor = holding(id);
      const rules = FAMILIES[family];
      const s = stateWith(0);
      const seen = [0];
      for (let stage = 0; stage < rules.stages - 1; stage++) {
        for (let n = 0; n < rules.wateringsToGrow![stage]; n++) {
          expect(s.get("plantStage")).toBe(stage);
          s.applyEffects([{ var: "plantGrowth", add: 1 }]);
          settlePlant(s, decor.growth("plant-shelf"));
        }
        seen.push(s.get("plantStage"));
        expect(decor.look("plant-shelf", s).sprite).toBe(`${family}-${stage + 1}`);
      }
      expect(seen).toEqual([...Array(rules.stages).keys()]);
      // The last stage is as far as it goes, and the count is cleared.
      s.applyEffects([{ var: "plantGrowth", add: 5 }]);
      settlePlant(s, decor.growth("plant-shelf"));
      expect(s.get("plantStage")).toBe(rules.stages - 1);
      expect(s.get("plantGrowth")).toBe(0);
    }
  });

  it("the snake plant and the spider plant still stop at flowering", () => {
    for (const id of ["plant-snake", "plant-spider"]) {
      const decor = holding(id);
      const s = stateWith(3);
      s.applyEffects([{ var: "plantGrowth", add: 4 }]);
      settlePlant(s, decor.growth("plant-shelf"));
      expect(s.get("plantStage")).toBe(3);
      expect(s.get("plantGrowth")).toBe(0);
    }
  });

  it("a stage above the family's last is drawn as the last and cut down, never an error", () => {
    for (const [id, last, family] of [["plant-snake", 3, "plant"], ["plant-spider", 3, "spider"], ["plant-monstera", 4, "monstera"], ["plant-pothos", 5, "pothos"]] as const) {
      const decor = holding(id);
      const s = stateWith(5);
      expect(decor.look("plant-shelf", s).sprite).toBe(`${family}-${last}`);
      s.applyEffects([{ var: "plantGrowth", add: 1 }]);
      expect(() => settlePlant(s, decor.growth("plant-shelf"))).not.toThrow();
      expect(s.get("plantStage")).toBe(last);
    }
    expect(holding("plant-pothos").look("plant-shelf", stateWith(99)).sprite).toBe("pothos-5");
    expect(holding("plant-pothos").look("plant-shelf", stateWith(-4)).sprite).toBe("pothos-0");
  });

  it("a game settles with the held plant's rules", () => {
    const decor = holding("plant-monstera");
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
    game.state.applyEffects([{ var: "plantStage", set: 3 }]);
    game.state.applyEffects([{ var: "plantGrowth", add: 7 }]);
    expect(game.state.get("plantStage")).toBe(4);
    game.state.applyEffects([{ var: "plantGrowth", add: 9 }]);
    expect(game.state.get("plantStage")).toBe(4);
    expect(game.state.get("plantGrowth")).toBe(0);
    // The snake plant at flowering stops there.
    const snake = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, random: () => 0.5 });
    snake.state.applyEffects([{ var: "plantStage", set: 3 }, { var: "plantGrowth", add: 9 }]);
    expect(snake.state.get("plantStage")).toBe(3);
  });
});

describe("the taller stages", () => {
  it("name their height in data, and only for the late stages", () => {
    expect(FAMILIES.pothos.overhang).toEqual({ 4: 16, 5: 16 });
    expect(FAMILIES.monstera.overhang).toEqual({ 4: 16 });
    expect(FAMILIES.plant.overhang).toBeUndefined();
    expect(FAMILIES.spider.overhang).toBeUndefined();
  });

  it("every stage has a sprite and a drooping sprite, the tall ones the size the data says", () => {
    for (const [id, family] of [["plant-pothos", "pothos"], ["plant-monstera", "monstera"]] as const) {
      const rules = FAMILIES[family];
      const names = itemSprites(DECOR_DATA.items.find((i) => i.id === id)!);
      const wilted = Object.keys(rules.overhang!).map((n) => `${family}-wilted-${n}`);
      expect(names).toEqual(expect.arrayContaining([...Array(rules.stages).keys()].map((n) => `${family}-${n}`).concat(`${family}-wilted`, ...wilted)));
      for (const name of names) expect(spriteExists(name), name).toBe(true);
      for (let stage = 0; stage < rules.stages; stage++) {
        const up = rules.overhang?.[stage] ?? 0;
        expect(size(`${family}-${stage}`), `${family}-${stage}`).toEqual({ w: 16, h: 16 + up });
        if (up) expect(size(`${family}-wilted-${stage}`)).toEqual({ w: 16, h: 16 + up });
      }
      expect(size(`${family}-wilted`)).toEqual({ w: 16, h: 16 });
    }
  });

  it("the look says how far up the sprite reaches, and drooping picks that stage's own sprite", () => {
    const pothos = holding("plant-pothos");
    for (let stage = 0; stage < 6; stage++) {
      const grown = pothos.look("plant-shelf", stateWith(stage));
      const droop = pothos.look("plant-shelf", stateWith(stage, PLANT.droopAfterHours));
      const up = FAMILIES.pothos.overhang![stage];
      expect(grown.sprite).toBe(`pothos-${stage}`);
      expect(grown.up).toBe(up);
      expect(droop.sprite).toBe(up ? `pothos-wilted-${stage}` : "pothos-wilted");
      expect(droop.up).toBe(up);
    }
    const monstera = holding("plant-monstera");
    expect(monstera.look("plant-shelf", stateWith(4)).up).toBe(16);
    expect(monstera.look("plant-shelf", stateWith(4, 200)).sprite).toBe("monstera-wilted-4");
    expect(monstera.look("plant-shelf", stateWith(3, 200)).sprite).toBe("monstera-wilted");
    expect(monstera.look("plant-shelf", stateWith(3)).up).toBeUndefined();
    for (const id of ["plant-snake", "plant-spider"]) {
      for (let stage = 0; stage < 4; stage++) expect(holding(id).look("plant-shelf", stateWith(stage)).up).toBeUndefined();
    }
  });

  it("still fit the slot by its 16x16 footprint", () => {
    for (const id of ["plant-pothos", "plant-monstera"]) expect(fits(shelf, DECOR_DATA.items.find((i) => i.id === id)!)).toBe(true);
    expect(shelf.area).toMatchObject({ w: 16, h: 16 });
  });

  it("are drawn at the slot's place moved up by the extra height, after the bookshelf", () => {
    const draws: { name: string; x: number; y: number }[] = [];
    const sprites: SpriteDrawer = {
      has: () => true,
      draw: (_c, name, x, y) => void draws.push({ name, x, y }),
      drawRegion: () => {},
    };
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    try {
      for (const [stage, dry, expected, up] of [
        [3, 0, "pothos-3", 0], [4, 0, "pothos-4", 16], [5, 0, "pothos-5", 16], [5, 200, "pothos-wilted-5", 16], [2, 200, "pothos-wilted", 0],
      ] as const) {
        const decor = holding("plant-pothos");
        const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, sprites, random: () => 0.5 });
        game.state.onChange = undefined;
        game.state.applyEffects([{ var: "plantStage", set: stage }, { var: "plantDry", set: dry }]);
        draws.length = 0;
        game.update(1 / 60, NO_INPUT);
        game.render(ctx, 0.5);
        const at = draws.filter((d) => d.name === expected);
        expect(at, expected).toHaveLength(1);
        expect(at[0].x).toBe(shelf.area.x);
        expect(at[0].y).toBe(shelf.area.y - up);
        const order = draws.map((d) => d.name);
        expect(order.indexOf(expected)).toBeGreaterThan(order.indexOf("bookshelf"));
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("stay on the bookshelf's top: only the shelf's own tasks and no other prop under the extra rows", () => {
    const main = APARTMENT.rooms.main;
    const piece = main.pieces.find((p) => p.name === "cube bookshelf")!;
    const reach = { x: shelf.area.x, y: shelf.area.y - 16, w: 16, h: 16 };
    expect(reach.y).toBeGreaterThanOrEqual(piece.bounds.y);
    expect(reach.x).toBeGreaterThanOrEqual(piece.bounds.x);
    expect(reach.x + reach.w).toBeLessThanOrEqual(piece.bounds.x + piece.bounds.w);
    const overlap = (a: { x: number; y: number; w: number; h: number }) =>
      a.x < reach.x + reach.w && a.x + a.w > reach.x && a.y < reach.y + reach.h && a.y + a.h > reach.y;
    for (const i of main.interactables) {
      if (i.zones.some(overlap)) expect(i.id).toMatch(/plant|records|swap-plant-shelf/);
    }
    for (const p of main.props ?? []) {
      if (p.slot !== "plant-shelf") expect(overlap(p.area), `prop ${p.slot}`).toBe(false);
    }
  });
});

describe("a fresh game", () => {
  it("nobody owns the pothos or monstera at the start, so the room is unchanged", () => {
    const d = new Decor();
    expect(d.owns("plant-pothos")).toBe(false);
    expect(d.owns("plant-monstera")).toBe(false);
    expect(d.look("plant-shelf", stateWith(1)).sprite).toBe("plant-1");
  });
});
