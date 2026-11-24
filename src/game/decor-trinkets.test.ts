import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { unsupportedChars } from "../render/font";
import { APARTMENT } from "./apartment";
import { Decor, fits, validateDecorData } from "./decor";
import { DECOR_DATA, DECOR_SLOTS, NOTE_MAX, itemSprites } from "./decor-data";
import { CHECKPOINTS } from "./delivery-checkpoints";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { POSES } from "./poses";
import { TASKS } from "./tasks";

// Issue 167: the trinket slot on the desk's right corner, six trinkets and four display instruments.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const down: Controls = { ...NO_INPUT, dirPressed: "down", dir: "down", keys: ["KeyS"], keysDown: ["KeyS"] };
const TAB: Controls = { ...NO_INPUT, keys: ["Tab"] };

const TRINKETS = ["trinket-alebrije", "trinket-telescope", "trinket-finger-skateboard", "trinket-goose-egg", "trinket-worry-doll", "trinket-raccoon-can"];
const INSTRUMENTS = ["instrument-harmonica", "instrument-kalimba", "instrument-jaw-harp", "instrument-mini-keyboard"];
const ALL = [...TRINKETS, ...INSTRUMENTS];
const sprites = import.meta.glob("/art/src/*.sprite", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const readSprite = (name: string) => sprites[`/art/src/${name}.sprite`];
const slot = DECOR_SLOTS.find((s) => s.id === "trinket-desk")!;
const main = APARTMENT.rooms.main;

describe("the trinket-desk slot", () => {
  it("is the desk's right corner, empty on a fresh game, and its prop agrees with the map", () => {
    expect(slot).toMatchObject({ room: "main", kinds: ["trinket", "instrument"], object: "standing desk", area: { x: 140, y: 17, w: 16, h: 16 } });
    expect(slot.default).toBeUndefined();
    const decor = new Decor();
    expect(decor.heldIn("trinket-desk")).toBeUndefined();
    expect(decor.canChange("trinket-desk")).toBe(false);
    expect(() => decor.checkLevel(main)).not.toThrow();
    expect(decor.swapProblems(main)).toEqual([]);
    const prop = main.props!.find((p) => p.slot === "trinket-desk")!;
    expect(prop.area).toEqual(slot.area);
    expect(prop.sprite).toBeUndefined();
  });

  it("sits on bare desk wood: inside the desk, clear of the typing pose and of every task spot's tile", () => {
    const desk = main.pieces.find((p) => p.name === "standing desk")!;
    const a = slot.area;
    expect(a.x).toBeGreaterThanOrEqual(desk.bounds.x);
    expect(a.x + a.w).toBeLessThanOrEqual(desk.bounds.x + desk.bounds.w);
    expect(a.y).toBeGreaterThanOrEqual(desk.bounds.y);
    expect(a.y + a.h).toBeLessThanOrEqual(desk.bounds.y + desk.bounds.h);
    // The typing pose is drawn from desk-local (32, 16) down; the last row of the cell is desk-local y 16, so the art leaves it empty.
    const pose = POSES["type-desk"];
    const poseTop = desk.bounds.y + pose.at.y;
    for (const name of ALL) {
      const rows = readSprite(name).split("\n").filter((l: string) => /^[.0-9a-m]{16}$/.test(l));
      expect(rows.length, name).toBe(16);
      for (let r = 0; r < 16; r++) if (a.y + r >= poseTop) expect(rows[r], `${name} row ${r}`).toBe(".".repeat(16));
      // and its first row too, so the art stays on the desk top and not the wall.
      expect(rows[0], name).toBe(".".repeat(16));
    }
    for (const spot of taskSpots(main)) {
      const tile = { x: spot.stand.col * 16, y: spot.stand.row * 16 };
      const hit = tile.x < a.x + a.w && tile.x + 16 > a.x && tile.y < a.y + a.h && tile.y + 16 > a.y;
      expect(hit, `${spot.id} stands under the trinket`).toBe(false);
    }
  });

  it("has its swap task on the standing desk, named Change the trinket", () => {
    expect(TASKS.find((t) => t.id === "swap-trinket-desk")).toMatchObject({ name: "Change the trinket", prompt: "Change the trinket", points: 0 });
    expect(taskSpots(main).some((s) => s.id === "swap-trinket-desk")).toBe(true);
  });
});

describe("the ten items", () => {
  it("validate, are gifts from a package, fit the slot, and nothing is owned at the start", () => {
    expect(() => validateDecorData(DECOR_DATA)).not.toThrow();
    const fresh = new Decor();
    for (const id of ALL) {
      const item = fresh.item(id)!;
      expect(item, id).toBeDefined();
      expect(item).toMatchObject({ how: "gift", from: "A PACKAGE", w: 16, h: 16 });
      expect(item.kind).toBe(id.startsWith("trinket-") ? "trinket" : "instrument");
      expect(fits(slot, item)).toBe(true);
      expect(DECOR_SLOTS.filter((s) => fits(s, item)).map((s) => s.id)).toEqual(["trinket-desk"]);
      expect(fresh.owns(id)).toBe(false);
    }
  });

  it("have a deadpan capitals note (at most 80, the font), no digits, and a drawn palette-only sprite", () => {
    for (const id of ALL) {
      const item = DECOR_DATA.items.find((i) => i.id === id)!;
      expect(item.note!.length, id).toBeLessThanOrEqual(NOTE_MAX);
      expect(item.note, id).toBe(item.note!.toUpperCase());
      expect(unsupportedChars(item.note!), id).toEqual([]);
      expect(unsupportedChars(item.name), id).toEqual([]);
      expect(item.note, id).not.toMatch(/\d/);
      for (const name of itemSprites(item)) {
        const text = readSprite(name);
        expect(text, name).toMatch(/size: 16x16/);
      }
    }
  });

  it("the worry doll is plainly named in the list", () => {
    expect(DECOR_DATA.items.find((i) => i.id === "trinket-worry-doll")!.name).toBe("WORRY DOLL");
  });
});

describe("the gifts", () => {
  it("come every third day from day 81, trinkets first, after the outfits, and never on a day another list uses", () => {
    const mine = ALL.map((id) => CHECKPOINTS.find((c) => c.item === id)!);
    expect(mine.map((m) => m.atLeast)).toEqual([81, 84, 87, 90, 93, 96, 99, 102, 105, 108]);
    for (const m of mine) expect(m).toMatchObject({ stat: "days", delayHours: 2 });
    const others = CHECKPOINTS.filter((c) => !ALL.includes(c.item as string) && c.stat === "days").map((c) => c.atLeast);
    for (const m of mine) expect(others).not.toContain(m.atLeast);
    expect(Math.min(...mine.map((m) => Number(m.atLeast)))).toBeGreaterThan(72);
    expect(new Set(CHECKPOINTS.map((c) => c.id)).size).toBe(CHECKPOINTS.length);
  });
});

describe("changing the trinket in the game", () => {
  function atDesk(owned: string[]) {
    const decor = new Decor();
    for (const id of owned) decor.own(id);
    const game = new Game(main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
    const spot = taskSpots(main).find((s) => s.id === "swap-trinket-desk")!;
    game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
    game.update(dt, NO_INPUT);
    return { game, decor };
  }
  const offered = (game: Game) => {
    for (let i = 0; i < 12; i++) {
      if (game.interaction.nearby?.id === "swap-trinket-desk") return true;
      game.update(dt, TAB);
    }
    return false;
  };

  it("is not offered on a fresh game, so Tab does not grow", () => {
    const { game } = atDesk([]);
    expect(offered(game)).toBe(false);
  });

  it("puts a trinket on the desk, then NOTHING takes it down and it stays owned", () => {
    const { game, decor } = atDesk(["trinket-worry-doll"]);
    expect(offered(game)).toBe(true);
    game.update(dt, press); // open: the list starts on NOTHING (the slot is empty)
    game.update(dt, down); // preview the doll
    game.update(dt, press); // choose
    expect(decor.heldIn("trinket-desk")?.id).toBe("trinket-worry-doll");
    // Change it again: the NOTHING row takes it down.
    for (let i = 0; i < 12 && game.interaction.nearby?.id !== "swap-trinket-desk"; i++) game.update(dt, TAB);
    game.update(dt, NO_INPUT);
    game.update(dt, press);
    game.update(dt, NO_INPUT);
    game.update(dt, { ...NO_INPUT, dirPressed: "up", dir: "up", keys: ["KeyW"], keysDown: ["KeyW"] });
    game.update(dt, press);
    expect(decor.heldIn("trinket-desk")).toBeUndefined();
    expect(decor.owns("trinket-worry-doll")).toBe(true);
  });

  it("every item draws on the desk through the real room without throwing", () => {
    for (const id of ALL) {
      const { game, decor } = atDesk([id]);
      decor.place("trinket-desk", id);
      expect(decor.lookAt("trinket-desk", game.state)?.sprite).toBe(id);
    }
  });
});
