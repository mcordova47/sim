import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { unsupportedChars } from "../render/font";
import { promptSize } from "../render/world-ui";
import { DESKTOP_VIEW, NARROW_VIEW, TILE } from "./config";
import { APARTMENT } from "./apartment";
import { AchievementsFeature } from "./achievements/feature";
import { FakeStorage } from "./achievements/fake-storage";
import { ExamineActivity, closeUp, examineLayout } from "./activities/examine";
import { Decor } from "./decor";
import { DECOR_DATA, DECOR_SLOTS, closeName } from "./decor-data";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { TASKS, examineTaskId } from "./tasks";
import { wrapText } from "./dialog";
import { textWidth } from "../render/font";

// Issue 185: the Examine task and its close-up card (stage B of docs/trinket-display-design.md).

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, cancelPressed: true };
const TAB: Controls = { ...NO_INPUT, keys: ["Tab"] };
const main = APARTMENT.rooms.main;
const ITEMS = DECOR_DATA.items.filter((i) => i.kind === "trinket" || i.kind === "instrument");
const EXAMINE = examineTaskId("trinket-desk");
const sprites = import.meta.glob("/art/src/*.sprite", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

function atDesk(owned: string[], placed?: string, col?: number) {
  const decor = new Decor();
  for (const id of owned) decor.own(id);
  if (placed) decor.place("trinket-desk", placed);
  const game = new Game(main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
  const spot = taskSpots(main).find((s) => s.id === EXAMINE)!;
  game.player.placeAt(col ?? spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  return { game, decor };
}
const cycle = (game: Game, id: string) => {
  for (let i = 0; i < 12; i++) {
    if (game.interaction.nearby?.id === id) return true;
    game.update(dt, TAB);
    game.update(dt, NO_INPUT);
  }
  return game.interaction.nearby?.id === id;
};

afterEach(() => vi.unstubAllGlobals());

describe("the Examine task", () => {
  const task = TASKS.find((t) => t.id === EXAMINE)!;

  it("is one task per trinket slot with the issue's wording and no pay, time or cooldown", () => {
    expect(task).toMatchObject({ name: "Examine trinket", prompt: "Examine trinket", itemWord: "trinket", heldSlot: "trinket-desk", duration: 0, points: 0, cooldown: 0, activity: { type: "examine" } });
    const slots = DECOR_SLOTS.filter((s) => s.object && !s.via && (s.kinds.includes("trinket") || s.kinds.includes("instrument")));
    for (const s of slots) expect(TASKS.some((t) => t.id === examineTaskId(s.id))).toBe(true);
  });

  it("is offered only when the slot holds an item, last but one just before the swap task", () => {
    const fresh = atDesk([]);
    expect(cycle(fresh.game, EXAMINE)).toBe(false);
    const { game } = atDesk(["trinket-worry-doll"], "trinket-worry-doll");
    expect(cycle(game, EXAMINE)).toBe(true);
    const desk = main.pieces.find((p) => p.name === "standing desk")!;
    const ids = main.interactables.filter((i) => i.zones.some((z) => z.x === 144 && z.y === desk.bounds.y)).map((i) => i.id);
    expect(ids.indexOf(EXAMINE)).toBe(ids.length - 2);
    expect(ids[ids.length - 1]).toBe("swap-trinket-desk");
  });

  it("is only on the one desk tile that holds the item (col 9), a subset of the desk's tiles", () => {
    const zones = main.interactables.find((i) => i.id === EXAMINE)!.zones;
    // The desk is two tiles deep: both tiles of col 9, none of the other columns.
    expect(zones.length).toBeGreaterThan(0);
    expect(zones.every((z) => z.x / TILE === 9)).toBe(true);
    expect(new Decor().swapProblems(main)).toEqual([]);
    const desk = main.pieces.find((p) => p.name === "standing desk")!;
    expect(desk.tiles.length).toBeGreaterThan(1);
    // Another desk tile does not offer it.
    const other = desk.tiles.find((t) => t.col !== 9)!;
    const { game } = atDesk(["trinket-worry-doll"], "trinket-worry-doll", other.col);
    expect(cycle(game, EXAMINE)).toBe(false);
  });

  it("is not part of 'every task'", () => {
    const game = new Game(main, { rooms: APARTMENT.rooms });
    const feature = new AchievementsFeature(game, { storage: new FakeStorage(), keys: undefined });
    const ctx = (feature as unknown as { ctx: { allTaskIds: string[] } }).ctx;
    expect(ctx.allTaskIds.some((id) => id.startsWith("examine-"))).toBe(false);
    expect(ctx.allTaskIds).toContain("coffee");
  });

  it("reads 'Examine <item>' for every trinket and instrument, and fits the narrow view with a choice", () => {
    for (const item of ITEMS) {
      expect(item.taskName, item.id).toBeTruthy();
      const { game, decor } = atDesk([item.id], item.id);
      cycle(game, EXAMINE);
      const nearby = game.interaction.nearby!;
      const prompt = decor.taskPrompt(nearby);
      expect(prompt).toBe(`Examine ${item.taskName}`);
      expect(prompt.length).toBeLessThanOrEqual(25);
      expect(unsupportedChars(prompt)).toEqual([]);
      expect(decor.taskName(nearby)).toBe(prompt);
      expect(promptSize({ ...nearby, prompt }, 0, null, false, false, { index: 1, count: 3 }).w, item.id).toBeLessThanOrEqual(NARROW_VIEW.width - 8);
    }
  });
});

describe("the Examine card", () => {
  function open(id = "trinket-worry-doll") {
    const { game, decor } = atDesk([id], id);
    expect(cycle(game, EXAMINE)).toBe(true);
    const before = { col: game.player.col, row: game.player.row, facing: game.player.facing };
    game.update(dt, press);
    return { game, decor, before };
  }

  it("opens on E, holds the clock, and E closes it quietly in the same room", () => {
    const { game, before } = open();
    const active = game.interaction.active!;
    expect(active.item.id).toBe(EXAMINE);
    expect(active.activity).toBeInstanceOf(ExamineActivity);
    expect(active.activity.holdsClock).toBe(true);
    expect(active.activity.readsKeys).toBe(true);
    game.update(dt, NO_INPUT);
    expect(game.interaction.active).not.toBeNull();
    game.update(dt, press);
    expect(game.interaction.active).toBeNull();
    game.update(dt, NO_INPUT);
    expect({ col: game.player.col, row: game.player.row, facing: game.player.facing }).toEqual({ col: before.col, row: before.row, facing: before.facing });
  });

  it("closes with E, with Escape and with a tap anywhere, and each is a quiet end (no points, no cancel)", () => {
    for (const how of ["e", "esc", "tap"]) {
      const { game, decor } = open();
      const events: string[] = [];
      game.events.on("taskCancelled", () => events.push("cancelled"));
      game.events.on("taskComplete", () => events.push("completed"));
      if (how === "e") game.update(dt, press);
      else if (how === "esc") game.update(dt, esc);
      else {
        const targets = game.tapTargets();
        expect(targets).toHaveLength(1);
        for (const [x, y] of [[0, 0], [100, 100], [319, 191]]) expect(x >= targets[0].x && x < targets[0].x + targets[0].w && y >= targets[0].y && y < targets[0].y + targets[0].h).toBe(true);
        targets[0].run();
        game.update(dt, NO_INPUT);
      }
      expect(game.interaction.active, how).toBeNull();
      expect(events, how).toEqual([]);
      // Nothing was stored or changed.
      expect(decor.heldIn("trinket-desk")?.id).toBe("trinket-worry-doll");
    }
  });

  it("starts nothing if the slot is empty", () => {
    const act = new ExamineActivity("trinket-desk", new Decor(), undefined);
    expect(act.done).toBe(true);
    expect(act.result).toEqual({ completed: false, quiet: true });
  });

  it("draws the close-up at 3x in its field with the name, the FROM line and the note", () => {
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) });
    const calls: { name: string; into: { width: number; height: number }; at: [number, number] }[] = [];
    const texts: string[] = [];
    let origin: [number, number] = [0, 0];
    const ctx = new Proxy({}, { get: (_t, k) => (k === "translate" ? (x: number, y: number) => (origin = [x, y]) : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D;
    const drawer = { has: () => true, draw: () => {}, drawRegion: (_c: unknown, name: string, _f: unknown, into: { width: number; height: number }) => void calls.push({ name, into, at: origin }) };
    const decor = new Decor();
    decor.own("trinket-raccoon-can");
    decor.place("trinket-desk", "trinket-raccoon-can");
    const act = new ExamineActivity("trinket-desk", decor, drawer);
    for (const view of [DESKTOP_VIEW, NARROW_VIEW]) {
      calls.length = 0;
      act.draw(ctx, view);
      expect(calls).toHaveLength(1);
      expect(calls[0].name).toBe("trinket-raccoon-can-close");
      expect(calls[0].into).toEqual({ width: 144, height: 144 });
      const lay = examineLayout(view);
      expect(calls[0].at).toEqual([lay.picture.x, lay.picture.y]);
    }
    void texts;
  });
});

describe("the card layouts", () => {
  const inside = (r: { x: number; y: number; w: number; h: number }, v: { width: number; height: number }) => r.x >= 0 && r.y >= 0 && r.x + r.w <= v.width && r.y + r.h <= v.height;

  it("matches the measured design on 320 x 192", () => {
    const l = examineLayout(DESKTOP_VIEW);
    expect(l.card).toEqual({ x: 12, y: 22, w: 296, h: 164 });
    expect(l.field).toEqual({ x: 20, y: 30, w: 148, h: 148 });
    expect(l.picture).toEqual({ x: 22, y: 32 });
    expect(l.name).toMatchObject({ x: 178, y: 32 });
    expect(l.from).toMatchObject({ x: 178, y: 42 });
    expect(l.note).toMatchObject({ x: 178, y: 60, pitch: 9 });
  });

  it("matches the measured design on 224 x 208", () => {
    const l = examineLayout(NARROW_VIEW);
    expect(l.card).toEqual({ x: 4, y: 16, w: 216, h: 190 });
    expect(l.field).toEqual({ x: 38, y: 19, w: 148, h: 148 });
    expect(l.name.y).toBe(170);
    expect(l.from.align).toBe("right");
    expect(l.note).toMatchObject({ y: 179, pitch: 9 });
  });

  it("fits every item's name, FROM line and note inside the card on both views", () => {
    for (const view of [DESKTOP_VIEW, NARROW_VIEW]) {
      const l = examineLayout(view);
      expect(inside(l.card, view)).toBe(true);
      expect(inside(l.field, view)).toBe(true);
      for (const item of ITEMS) {
        const note = wrapText(item.note ?? "", l.note.width);
        const bottom = l.note.y + (note.length - 1) * l.note.pitch + 7;
        expect(bottom, `${item.id} ${view.width}`).toBeLessThanOrEqual(l.card.y + l.card.h - 2);
        for (const line of note) expect(textWidth(line)).toBeLessThanOrEqual(l.note.width);
        if (view === DESKTOP_VIEW) expect(bottom, item.id).toBeLessThanOrEqual(l.field.y + l.field.h);
        // Name and FROM share a row on the phone: they must not touch.
        if (l.from.align === "right") expect(l.name.x + textWidth(item.name) + 6).toBeLessThan(l.from.x - textWidth(`FROM: ${item.from}`));
        else expect(l.name.x + textWidth(item.name)).toBeLessThanOrEqual(l.card.x + l.card.w - 8);
      }
    }
  });

  it("an 80-character note wraps inside the card even with long words", () => {
    for (const view of [DESKTOP_VIEW, NARROW_VIEW]) {
      const l = examineLayout(view);
      const lines = wrapText("A".repeat(10) + " " + "WORD ".repeat(14).trim(), l.note.width);
      expect(l.note.y + (lines.length - 1) * l.note.pitch + 7).toBeLessThanOrEqual(l.card.y + l.card.h);
    }
  });
});

describe("the close-up art convention", () => {
  it("every trinket and instrument has a <sprite>-close at exactly 48x48, palette only", () => {
    expect(ITEMS).toHaveLength(10);
    for (const item of ITEMS) {
      const src = sprites[`/art/src/${closeName(item.sprite)}.sprite`];
      expect(src, item.id).toBeDefined();
      const lines = src.split("\n").filter((l) => !l.startsWith("#") && l.length > 0);
      expect(lines[0]).toBe("size: 48x48");
      const rows = lines.slice(1);
      expect(rows).toHaveLength(48);
      for (const r of rows) expect(r).toMatch(/^[.0-9a-m]{48}$/);
    }
  });

  it("falls back to the small sprite at 8x while a close-up is missing", () => {
    expect(closeUp(() => true, "trinket-worry-doll")).toEqual({ name: "trinket-worry-doll-close", size: 48, scale: 3 });
    expect(closeUp((n) => !n.endsWith("-close"), "trinket-worry-doll")).toEqual({ name: "trinket-worry-doll", size: 16, scale: 8 });
  });
});

describe("Marc's own notes (after trying the card)", () => {
  const NOTES: Record<string, string> = {
    "trinket-finger-skateboard": "BEING AN ADULT MEANS NO ONE CAN TELL YOU WHAT TO SPEND YOUR MONEY ON.",
    "trinket-worry-doll": "A LITTLE DOLL FOR BIG WORRIES.",
    "trinket-raccoon-can": "THIS GUY ALWAYS WANTS SOMETHING FROM YOU.",
    "instrument-harmonica": "YOU DON'T HAVE TO PLAY WELL TO SOUND GOOD.",
    "trinket-alebrije-cat": "IT LOOKS LIKE IT'S UP TO SOME MISCHIEF.",
  };
  it("are the notes, each within 80 characters and drawable, and the longest fits the phone card", () => {
    for (const [id, note] of Object.entries(NOTES)) {
      const item = DECOR_DATA.items.find((i) => i.id === id)!;
      expect(item.note).toBe(note);
      expect(note.length).toBeLessThanOrEqual(80);
      expect(unsupportedChars(note)).toEqual([]);
      const l = examineLayout(NARROW_VIEW);
      const lines = wrapText(note, l.note.width);
      expect(l.note.y + (lines.length - 1) * l.note.pitch + 7).toBeLessThanOrEqual(l.card.y + l.card.h - 2);
    }
  });
});
