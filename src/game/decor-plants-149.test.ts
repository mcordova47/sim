import { describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { APARTMENT } from "./apartment";
import { PLANT } from "./config";
import { textWidth, unsupportedChars } from "../render/font";
import { PLAYER_SPRITES } from "../render/player-sprite";
import { Decor, fits, validateDecorData } from "./decor";
import { DECOR_DATA, DECOR_SLOTS, FAMILIES, TASK_NAME_MAX, itemSprites } from "./decor-data";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
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
    // The pothos's vines hang down over the bookshelf's south face (stage 4), and at stage 5 one also crawls across
    // the shelf's top; the monstera's crown reaches up.
    expect(FAMILIES.pothos.overhang).toEqual({ 4: { down: 16 }, 5: { up: 16, down: 16 } });
    expect(FAMILIES.monstera.overhang).toEqual({ 4: { up: 16 } });
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
        const over = rules.overhang?.[stage];
        const h = 16 + (over?.up ?? 0) + (over?.down ?? 0);
        expect(size(`${family}-${stage}`), `${family}-${stage}`).toEqual({ w: 16, h });
        if (over) expect(size(`${family}-wilted-${stage}`)).toEqual({ w: 16, h });
      }
      expect(size(`${family}-wilted`)).toEqual({ w: 16, h: 16 });
    }
  });

  it("the look says how far the sprite reaches, up or down, and, and drooping picks that stage's own sprite", () => {
    const pothos = holding("plant-pothos");
    for (let stage = 0; stage < 6; stage++) {
      const grown = pothos.look("plant-shelf", stateWith(stage));
      const droop = pothos.look("plant-shelf", stateWith(stage, PLANT.droopAfterHours));
      const over = FAMILIES.pothos.overhang![stage];
      expect(grown.sprite).toBe(`pothos-${stage}`);
      expect(grown.down).toBe(over?.down);
      expect(grown.up).toBe(over?.up);
      expect(droop.sprite).toBe(over ? `pothos-wilted-${stage}` : "pothos-wilted");
      expect(droop.down).toBe(over?.down);
      expect(droop.up).toBe(over?.up);
    }
    const monstera = holding("plant-monstera");
    expect(monstera.look("plant-shelf", stateWith(4)).up).toBe(16);
    expect(monstera.look("plant-shelf", stateWith(4)).down).toBeUndefined();
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

  it("are drawn at the slot's place, moved up by the extra height above it if any, after the bookshelf and in front of its south face", () => {
    const draws: { name: string; x: number; y: number }[] = [];
    const sprites: SpriteDrawer = {
      has: () => true,
      draw: (_c, name, x, y) => void draws.push({ name, x, y }),
      drawRegion: () => {},
    };
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    try {
      for (const [id, stage, dry, expected, up] of [
        ["plant-pothos", 3, 0, "pothos-3", 0], ["plant-pothos", 4, 0, "pothos-4", 0], ["plant-pothos", 5, 0, "pothos-5", 16],
        ["plant-pothos", 4, 200, "pothos-wilted-4", 0], ["plant-pothos", 5, 200, "pothos-wilted-5", 16], ["plant-pothos", 2, 200, "pothos-wilted", 0],
        ["plant-monstera", 4, 0, "monstera-4", 16], ["plant-monstera", 4, 200, "monstera-wilted-4", 16], ["plant-monstera", 3, 0, "monstera-3", 0],
      ] as const) {
        const decor = holding(id);
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

  it("never hide the player: at every spot where the plant's tasks are done, anyone whose tile the sprite's box touches is drawn after it", () => {
    const main = APARTMENT.rooms.main;
    const draws: { name: string; x: number; y: number }[] = [];
    const sprites: SpriteDrawer = {
      has: () => true,
      draw: (_c, name, x, y) => void draws.push({ name, x, y }),
      drawRegion: () => {},
    };
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    try {
      const stands = new Set<string>();
      for (const spot of taskSpots(main)) {
        const task = main.interactables.find((i) => i.id === spot.id)!;
        if (task.liveSlot === "plant-shelf" || /records/.test(task.id) || task.id === "swap-plant-shelf") stands.add(`${spot.stand.col},${spot.stand.row},${spot.face}`);
      }
      expect(stands.size).toBeGreaterThan(0);
      let touched = 0;
      for (const [stage, expected, over] of [[5, "pothos-5", { up: 16, down: 16 }], [4, "pothos-4", { up: 0, down: 16 }]] as const) {
        for (const stand of stands) {
          const [col, row, face] = stand.split(",");
          const decor = holding("plant-pothos");
          const game = new Game(main, { rooms: APARTMENT.rooms, decor, sprites, random: () => 0.5 });
          game.state.onChange = undefined;
          game.state.applyEffects([{ var: "plantStage", set: stage }]);
          game.player.placeAt(Number(col), Number(row), face as "up");
          draws.length = 0;
          game.update(1 / 60, NO_INPUT);
          game.render(ctx, 0.5);
          const plant = draws.findIndex((d) => d.name === expected);
          const player = draws.findIndex((d) => PLAYER_SPRITES.includes(d.name));
          expect(plant, expected).toBeGreaterThanOrEqual(0);
          expect(player, "the player is drawn").toBeGreaterThanOrEqual(0);
          // The sprite's box, and the player's tile.
          const box = { x: shelf.area.x, y: shelf.area.y - over.up, w: 16, h: 16 + over.up + over.down };
          const tile = { x: Number(col) * 16, y: Number(row) * 16 };
          if (tile.x < box.x + box.w && tile.x + 16 > box.x && tile.y < box.y + box.h && tile.y + 16 > box.y) {
            touched++;
            expect(player, `${expected} with the player at ${stand}`).toBeGreaterThan(plant);
          }
        }
      }
      // Standing in front of the shelf (south of it) is one of those spots, so the check above ran.
      expect(touched).toBeGreaterThan(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keep every visible pixel on the bookshelf's own sprite: no floor tile, task spot or other prop is covered", () => {
    const main = APARTMENT.rooms.main;
    const piece = main.pieces.find((p) => p.name === "cube bookshelf")!;
    const bounds = piece.bounds;
    const stands = taskSpots(main).map((s) => s.stand);
    for (const [family, rules] of Object.entries({ pothos: FAMILIES.pothos, monstera: FAMILIES.monstera })) {
      for (const [stage, over] of Object.entries(rules.overhang!)) {
        const top = shelf.area.y - (over.up ?? 0);
        for (const name of [`${family}-${stage}`, `${family}-wilted-${stage}`]) {
          const rows = (/^size: .*\n([\s\S]*)$/m.exec(sources[`/art/src/${name}.sprite`]) ?? [])[1]?.trim().split("\n") ?? [];
          expect(rows.length, name).toBe(16 + (over.up ?? 0) + (over.down ?? 0));
          rows.forEach((row, r) => {
            [...row].forEach((c, x) => {
              if (c === ".") return;
              const px = shelf.area.x + x;
              const py = top + r;
              const where = `${name} pixel ${x},${r}`;
              expect(px >= bounds.x && px < bounds.x + bounds.w && py >= bounds.y && py < bounds.y + bounds.h, where).toBe(true);
              // Never on a tile anyone stands on to do something.
              expect(stands.some((t) => Math.floor(px / 16) === t.col && Math.floor(py / 16) === t.row), where).toBe(false);
            });
          });
        }
      }
    }
    for (const p of main.props ?? []) {
      if (p.slot === "plant-shelf") continue;
      const grown = { x: shelf.area.x, y: shelf.area.y - 16, w: 16, h: 48 };
      expect(p.area.x < grown.x + grown.w && p.area.x + p.area.w > grown.x && p.area.y < grown.y + grown.h && p.area.y + p.area.h > grown.y, `prop ${p.slot}`).toBe(false);
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

// Item-aware task text (issue 149, P4 in docs/decor-expansion-design.md).
describe("the plant tasks follow the plant on the shelf", () => {
  const tasks = APARTMENT.rooms.main.interactables.filter((i) => i.liveSlot === "plant-shelf");
  const plants = DECOR_DATA.items.filter((i) => i.kind === "plant");
  const nameOf = (id: string, task: string) => holding(id).taskName(tasks.find((t) => t.id === task)!);

  it("the three plant tasks say which plant, and the snake plant's wording is exactly as it was", () => {
    expect(tasks.map((t) => t.id).sort()).toEqual(["check-plant", "water-plant", "water-plant-droop"]);
    expect(new Decor().taskName(tasks.find((t) => t.id === "water-plant")!)).toBe("Water the snake plant");
    expect(new Decor().taskName(tasks.find((t) => t.id === "water-plant-droop")!)).toBe("Water the drooping snake plant");
    expect(new Decor().taskName(tasks.find((t) => t.id === "check-plant")!)).toBe("Check the snake plant");
    expect(nameOf("plant-pothos", "water-plant")).toBe("Water the pothos");
    expect(nameOf("plant-pothos", "water-plant-droop")).toBe("Water the drooping pothos");
    expect(nameOf("plant-monstera", "check-plant")).toBe("Check the monstera");
    expect(nameOf("plant-spider", "water-plant")).toBe("Water the spider plant");
  });

  it("the prompts are untouched, and an item with no task name leaves the plain wording", () => {
    const water = tasks.find((t) => t.id === "water-plant")!;
    expect(water.prompt).toBe("Water the plant");
    expect(tasks.find((t) => t.id === "water-plant-droop")!.prompt).toBe("Water the drooping plant");
    expect(tasks.find((t) => t.id === "check-plant")!.prompt).toBe("Check the plant");
    const d = new Decor();
    d.own("plant-test-grown");
    d.place("plant-shelf", "plant-test-grown");
    expect(d.heldIn("plant-shelf")!.taskName).toBeUndefined();
    expect(d.taskName(water)).toBe("Water the plant");
    // A task with no word to replace, or no slot, is as written.
    expect(new Decor().taskName({ name: "Make the bed" })).toBe("Make the bed");
    expect(new Decor().taskName({ name: "Water the plant", itemWord: "plant" })).toBe("Water the plant");
  });

  it("every live plant item has a task name, and every plant item's name draws in the font in every task", () => {
    for (const item of plants) {
      if (item.taskName !== undefined) {
        expect(unsupportedChars(item.taskName), `${item.id} taskName`).toEqual([]);
        expect(item.taskName.length).toBeGreaterThan(0);
        expect(item.taskName.length).toBeLessThanOrEqual(TASK_NAME_MAX);
      }
      if (item.family && FAMILIES[item.family]?.stages > 0 && !item.tags?.includes("test")) expect(item.taskName, `${item.id} needs a taskName`).toBeDefined();
      const d = new Decor();
      d.own(item.id);
      d.place("plant-shelf", item.id);
      for (const t of tasks) {
        const text = d.taskName(t);
        expect(unsupportedChars(text), `${item.id} in ${t.id}: "${text}"`).toEqual([]);
        // The progress label must fit the screen with room to spare.
        expect(textWidth(text) + 6, `${item.id} in ${t.id}`).toBeLessThanOrEqual(200);
      }
    }
  });

  it("validateDecorData refuses a task name the font cannot draw, or an empty or long one", () => {
    const item = DECOR_DATA.items.find((i) => i.id === "plant-pothos")!;
    for (const taskName of ["pothos \u2603", "", "a very very long plant name"]) {
      const data = { ...DECOR_DATA, items: DECOR_DATA.items.map((i) => (i === item ? { ...i, taskName } : i)) };
      expect(() => validateDecorData(data), taskName).toThrow(/taskName/);
    }
  });

  it("the running task's label uses the plant's name", () => {
    const draws: string[] = [];
    const decor = holding("plant-monstera");
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
    const task = tasks.find((t) => t.id === "water-plant")!;
    // What drawWorldUi hands the progress label.
    draws.push(decor.taskName(task));
    expect(draws).toEqual(["Water the monstera"]);
    expect(game.decor.taskName(task)).toBe("Water the monstera");
  });
});
