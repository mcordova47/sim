import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import { textWidth, unsupportedChars } from "../render/font";
import { createActivity } from "./activity";
import { TypingActivity } from "./activities";
import { fakeHost } from "./activities/fake-host";
import { APARTMENT } from "./apartment";
import { NAP, TYPING } from "./config";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { TASKS } from "./tasks";
import { CODE_LINES, EMAIL_LINES, MIXED_LINES } from "./typing-text";

// Issue 035: tasks that match what they say, alternate by state, and cycle.

const dt = 1 / 60;

afterEach(() => vi.unstubAllGlobals());
const stubDocument = () =>
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }),
  });
const press = { ...NO_INPUT, interactPressed: true };
const rooms = APARTMENT.rooms;

function newGame(): Game {
  return new Game(rooms.main, { rooms, random: () => 0.5 });
}

// The main room with only these tasks offered. An object offers the first task
// that can start, so to try one that sits behind others (the sofa's nap behind
// doomscrolling) the others are taken out.
function onlyGame(...ids: string[]): Game {
  const main = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => ids.includes(i.id)) };
  return new Game(main, { rooms: { ...rooms, main }, random: () => 0.5 });
}

function run(game: Game, seconds: number) {
  for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt, NO_INPUT);
}

// Stand where the task can be done, press E, and let it finish (reading any
// dialog pages). Returns false if it did not start.
function doTask(game: Game, id: string, room = "main"): boolean {
  const spot = taskSpots(rooms[room]).find((s) => s.id === id)!;
  expect(spot, `a spot for ${id}`).toBeDefined();
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  let started = false;
  game.events.on("taskStart", () => (started = true));
  game.update(dt, press);
  for (let i = 0; i < 60 * 30 && game.interaction.busy; i++) {
    game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
  }
  expect(game.interaction.busy, `${id} finished`).toBe(false);
  return started;
}

// What E would start at the spot for `id`.
function offered(game: Game, id: string): string | undefined {
  const spot = taskSpots(rooms.main).find((s) => s.id === id)!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  return game.interaction.nearby?.id;
}

describe("typing text matches the task", () => {
  const lines = (id: string) => {
    const item = rooms.main.interactables.find((i) => i.id === id)!;
    return (createActivity(item, fakeHost(3).host) as TypingActivity).lines;
  };

  it("types emails at the desk, code on the couch and a mix in bed", () => {
    for (const line of lines("work")) expect(EMAIL_LINES).toContain(line);
    for (const line of lines("work-sofa")) expect(CODE_LINES).toContain(line);
    for (const line of lines("work-bed")) expect(MIXED_LINES).toContain(line);
  });

  it("does not repeat a line within one go while there are lines left", () => {
    for (let seed = 1; seed < 20; seed++) {
      const item = { ...rooms.main.interactables.find((i) => i.id === "work")!, activity: { type: "typing", lines: 6, text: EMAIL_LINES } };
      const got = (createActivity(item, fakeHost(seed).host) as TypingActivity).lines;
      expect(new Set(got).size, `seed ${seed}`).toBe(6);
    }
  });

  it("only uses characters the font can draw, and fits the screen", () => {
    for (const line of [...CODE_LINES, ...EMAIL_LINES, ...MIXED_LINES]) {
      expect(unsupportedChars(line), line).toEqual([]);
      expect(textWidth(line), line).toBeLessThanOrEqual(TYPING.maxLineWidth);
    }
  });

  it("rejects a bad text list when the room is built", () => {
    const bad = (text: unknown) => {
      const task = { ...TASKS.find((t) => t.id === "work")!, activity: { type: "typing", text } };
      return () => new Game({ ...rooms.main, interactables: [{ ...rooms.main.interactables[0], ...task }] });
    };
    expect(bad([])).toThrow(/Task "work": typing text needs a list/);
    expect(bad("hello")).toThrow(/needs a list/);
    expect(bad([""])).toThrow(/not empty/);
    expect(bad([3])).toThrow(/not empty/);
    expect(bad(["café"])).toThrow(/can't draw/);
    expect(bad(["W".repeat(80)])).toThrow(/too wide/);
    expect(bad(["fine"])).not.toThrow();
  });
});

describe("tasks that alternate by state", () => {
  it("opens and closes the blinds", () => {
    const game = newGame();
    expect(game.state.get("blinds")).toBe(0);
    expect(offered(game, "open-blinds")).toBe("open-blinds");
    expect(doTask(game, "open-blinds")).toBe(true);
    expect(game.state.get("blinds")).toBe(1);
    expect(offered(game, "open-blinds")).toBe("close-blinds");
    run(game, 20);
    expect(doTask(game, "close-blinds")).toBe(true);
    expect(game.state.get("blinds")).toBe(0);
    run(game, 20);
    expect(offered(game, "open-blinds")).toBe("open-blinds");
  });

  it("shows the blinds state on the window", () => {
    const main = rooms.main.appearances!;
    const win = main.find((a) => a.variants.some((v) => v.when?.some((c) => c.var === "blinds")))!;
    expect(win).toBeDefined();
    expect(win.variants.at(-1)!.when).toBeUndefined();
  });

  it("makes coffee, then drinks it, then makes it again", () => {
    const game = newGame();
    game.state.applyEffects([{ var: "dishes", set: 0 }]);
    expect(offered(game, "coffee")).toBe("coffee");
    doTask(game, "coffee");
    expect(game.state.get("mug")).toBe(1);
    expect(game.state.get("dishes")).toBe(1);
    // Making it again is not on offer while the mug is full: the drink is.
    expect(offered(game, "coffee")).toBe("drink-coffee");
    run(game, 20);
    const before = game.state.get("energy");
    doTask(game, "drink-coffee");
    expect(game.state.get("mug")).toBe(0);
    expect(game.state.get("energy")).toBeGreaterThan(before);
    run(game, 20);
    expect(offered(game, "coffee")).toBe("coffee");
  });

  it("cannot drink coffee that was not made", () => {
    const game = newGame();
    const drink = rooms.main.interactables.find((i) => i.id === "drink-coffee")!;
    expect(game.interaction.unavailableReason(drink)).toBe("NO COFFEE MADE");
  });

  it("cycles the records: alphabetical, year, favorites, color, and round again", () => {
    const game = onlyGame("sort-records", "sort-records-year", "sort-records-fav", "sort-records-color");
    const order = ["sort-records", "sort-records-year", "sort-records-fav", "sort-records-color", "sort-records"];
    order.forEach((id, i) => {
      run(game, 50);
      expect(game.state.get("recordSort"), `before ${id}`).toBe(i % 4);
      // The bookshelf also offers the plant; the records come up on their turn.
      const item = rooms.main.interactables.find((t) => t.id === id)!;
      expect(game.interaction.unavailableReason(item), id).toBeNull();
      for (const other of order.slice(0, 4).filter((o) => o !== id)) {
        const o = rooms.main.interactables.find((t) => t.id === other)!;
        expect(game.interaction.unavailableReason(o), `${other} out of turn`).not.toBeNull();
      }
      expect(doTask(game, id)).toBe(true);
    });
    expect(game.state.get("recordSort")).toBe(1);
  });
});

describe("the desk and the sofa", () => {
  it("cleaning the desk changes no apartment state and has a long cooldown", () => {
    const game = onlyGame("tidy-desk");
    const snapshot = () => ["dishes", "bedMade", "blinds", "mug", "recordSort"].map((v) => game.state.get(v));
    const before = snapshot();
    expect(rooms.main.interactables.find((i) => i.id === "tidy-desk")!.effects).toBeUndefined();
    expect(doTask(game, "tidy-desk")).toBe(true);
    expect(snapshot()).toEqual(before);
    expect(game.interaction.scoreboard.score).toBeGreaterThan(0);
    const item = rooms.main.interactables.find((i) => i.id === "tidy-desk")!;
    expect(game.interaction.cooldownRemaining(item)).toBeGreaterThan(60);
  });

  it("naps restore some energy, pass an hour and leave the bed alone, only when sleepy", () => {
    const game = onlyGame("nap");
    const nap = rooms.main.interactables.find((i) => i.id === "nap")!;
    game.state.applyEffects([{ var: "bedMade", set: 1 }, { var: "energy", set: 90 }]);
    expect(game.interaction.unavailableReason(nap)).toBe("NOT SLEEPY ENOUGH");
    game.state.applyEffects([{ var: "energy", set: 40 }, { var: "clock", set: 13 }]);
    expect(doTask(game, "nap")).toBe(true);
    expect(game.state.get("bedMade")).toBe(1);
    expect(game.state.get("energy")).toBeGreaterThanOrEqual(40 + NAP.energy - 2);
    expect(game.state.get("energy")).toBeLessThan(100);
    expect(game.state.get("clock")).toBeGreaterThanOrEqual(13 + NAP.hours);
  });

  it("shows the gallery wall view in place, with the player not moving, then restores the normal view", () => {
    const sofaSpots = taskSpots(rooms.main).filter((s) => s.id === "admire-art");
    expect(sofaSpots.length).toBeGreaterThan(1);
    for (const spot of sofaSpots) {
      stubDocument();
      const drawn: string[] = [];
      const sprites = { has: () => true, draw: (_c: unknown, name: string) => void drawn.push(name) };
      const main = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => i.id === "admire-art") };
      const game = new Game(main, { rooms: { ...rooms, main }, random: () => 0.5, sprites });
      const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
      game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
      game.update(dt, NO_INPUT);
      game.update(dt, press);
      expect(game.interaction.active?.item.id).toBe("admire-art");
      let shown = false;
      for (let i = 0; i < 60 * 40 && game.interaction.busy; i++) {
        expect({ c: game.player.col, r: game.player.row, f: game.player.facing }).toEqual({ c: spot.stand.col, r: spot.stand.row, f: spot.face });
        if (game.dialogOpen) {
          drawn.length = 0;
          game.render(ctx, 1);
          if (drawn.includes("view-gallery-wall")) shown = true;
        }
        game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
      }
      expect(shown).toBe(true);
      expect(game.interaction.busy).toBe(false);
      drawn.length = 0;
      game.render(ctx, 1);
      expect(drawn).not.toContain("view-gallery-wall");
      expect(game.inputLocked).toBe(false);
      expect(game.state.get("bedMade")).toBe(0);
    }
  });

  it("puts the normal view back when Escape skips the scene", () => {
    stubDocument();
    const spot = taskSpots(rooms.main).find((s) => s.id === "admire-art")!;
    const drawn: string[] = [];
    const sprites = { has: () => true, draw: (_c: unknown, name: string) => void drawn.push(name) };
    const main = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => i.id === "admire-art") };
    const game = new Game(main, { rooms: { ...rooms, main }, random: () => 0.5, sprites });
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
    game.update(dt, NO_INPUT);
    game.update(dt, press);
    run(game, 0.2);
    expect(game.interaction.busy).toBe(true);
    game.render(ctx, 1);
    expect(drawn).toContain("view-gallery-wall");
    game.update(dt, { ...NO_INPUT, keys: ["Escape"] });
    // The dialog has the controls first; close it, then skip.
    for (let i = 0; i < 600 && game.interaction.busy; i++) {
      game.update(dt, game.dialogOpen ? press : { ...NO_INPUT, keys: ["Escape"] });
    }
    expect(game.interaction.busy).toBe(false);
    drawn.length = 0;
    game.render(ctx, 1);
    expect(drawn).not.toContain("view-gallery-wall");
    expect(game.inputLocked).toBe(false);
  });
});

describe("the new tasks", () => {
  it("pay in the same range as the others, and all have a place", () => {
    const old = TASKS.filter((t) => !["tidy-desk", "nap", "admire-art", "work-sofa", "work-bed", "drink-coffee", "close-blinds", "sort-records-year", "sort-records-fav", "sort-records-color"].includes(t.id));
    const lo = Math.min(...old.map((t) => t.points));
    const hi = Math.max(...old.map((t) => t.points));
    for (const id of ["tidy-desk", "nap", "admire-art", "work-sofa", "work-bed", "drink-coffee", "close-blinds", "sort-records-year", "sort-records-fav", "sort-records-color"]) {
      const t = TASKS.find((x) => x.id === id)!;
      expect(t.points, id).toBeGreaterThanOrEqual(lo);
      expect(t.points, id).toBeLessThanOrEqual(hi);
    }
  });
});
