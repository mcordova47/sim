import { describe, expect, it, vi } from "vitest";
import { APARTMENT } from "../apartment";
import { ACHIEVEMENTS_UI as UI, TILE } from "../config";
import { Game } from "../game";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./feature";
import { FakeStorage } from "./fake-storage";

class FakeTarget<E> implements Listenable<E> {
  listeners = new Map<string, ((e: E) => void)[]>();
  hidden = false;
  addEventListener(type: string, fn: (e: E) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string, e: E) {
    for (const fn of this.listeners.get(type) ?? []) fn(e);
  }
}

const KEY = "life.progress.v1";

function setup(storage: FakeStorage | null = new FakeStorage(), vars?: ConstructorParameters<typeof ApartmentState>[0]) {
  const keys = new FakeTarget<KeyEventLike>();
  const visibility = new FakeTarget<unknown>();
  const game = new Game(APARTMENT.rooms[APARTMENT.start], {
    rooms: APARTMENT.rooms,
    state: new ApartmentState(vars ?? STATE_VARS),
  });
  const feature = new AchievementsFeature(game, { storage, keys, visibility });
  const press = (code: string, extra: Partial<KeyEventLike> = {}) => keys.fire("keydown", { code, ...extra });
  return { game, feature, keys, visibility, press, storage };
}

const item = (id: string) => {
  for (const level of Object.values(APARTMENT.rooms)) {
    const found = level.interactables.find((i) => i.id === id);
    if (found) return found;
  }
  throw new Error(id);
};
const complete = (game: Game, id: string, points = 10, chain = 1, repeatFactor = 1) =>
  game.events.emit("taskComplete", { item: item(id), award: { points, basePoints: points, repeatFactor, multiplier: 1, chain, qualityFactor: 1, timeFactor: 1 } });
const toastTitles = (f: AchievementsFeature) => {
  f.toasts.update(0);
  return f.toasts.views().map((v) => v.title);
};

describe("AchievementsFeature", () => {
  it("counts task completions from the game's events and unlocks with a toast", () => {
    const { game, feature } = setup();
    complete(game, "doomscroll");
    complete(game, "doomscroll");
    expect(feature.unlocks.has("doomscroll-3")).toBe(false);
    complete(game, "doomscroll");
    expect(feature.unlocks.has("doomscroll-3")).toBe(true);
    expect(toastTitles(feature)).toContain("One More Scroll");
  });

  it("does not unlock twice, even after more completions", () => {
    const { game, feature } = setup();
    for (let i = 0; i < 6; i++) complete(game, "doomscroll");
    const titles: string[] = [];
    for (let t = 0; t < 30; t += 0.25) {
      feature.toasts.update(0.25);
      titles.push(...new Set(feature.toasts.views().map((v) => v.title)));
    }
    // It shows once (for its whole time on screen), then never comes back.
    const first = titles.indexOf("One More Scroll");
    const last = titles.lastIndexOf("One More Scroll");
    expect(first).toBeGreaterThanOrEqual(0);
    expect(titles.slice(first, last + 1).every((t) => t === "One More Scroll")).toBe(true);
  });

  it("tracks steps, bumps, cancelled tasks and rooms", () => {
    const { game, feature } = setup();
    const before = feature.stats.number("steps");
    game.events.emit("step", { col: 1, row: 1, direction: "up" });
    game.events.emit("bump", { col: 1, row: 1, direction: "up" });
    game.events.emit("taskCancelled", { item: item("work") });
    game.events.emit("room", { id: "kitchen", level: APARTMENT.rooms.kitchen });
    expect(feature.stats.number("steps")).toBe(before + 1);
    expect(feature.stats.number("bumps")).toBe(1);
    expect(feature.stats.number("cancelled")).toBe(1);
    expect(feature.stats.number("roomsVisited")).toBe(2); // main, then the kitchen
  });

  it("saves when a task finishes, and loads on the next visit without unlocking again", () => {
    const first = setup();
    for (let i = 0; i < 3; i++) complete(first.game, "coffee", 70);
    expect(first.storage!.data.has(KEY)).toBe(true);
    expect(toastTitles(first.feature)).toEqual(["Regular Order"]);

    const second = setup(first.storage);
    expect(second.feature.unlocks.has("coffee-3")).toBe(true);
    expect(second.feature.stats.taskCount("coffee")).toBe(3);
    expect(second.feature.stats.number("bestScore")).toBe(0);
    expect(toastTitles(second.feature)).toEqual([]);
    complete(second.game, "coffee");
    expect(toastTitles(second.feature)).toEqual([]);
  });

  it("saves the best score and the running score still starts at zero", () => {
    const first = setup();
    first.game.interaction.scoreboard.score = 240;
    complete(first.game, "work", 80);
    const second = setup(first.storage);
    expect(second.feature.stats.number("bestScore")).toBe(240);
    expect(second.game.interaction.scoreboard.score).toBe(0);
  });

  it("saves and restores the apartment state and where the player stands", () => {
    const first = setup();
    first.game.state.applyEffects([
      { var: "dishes", set: 5 },
      { var: "bedMade", set: 1 },
      { var: "energy", set: 12 },
      { var: "clock", set: 15.5 },
    ]);
    first.game.events.emit("room", { id: "kitchen", level: APARTMENT.rooms.kitchen });
    first.game.loadLevel(APARTMENT.rooms.kitchen, APARTMENT.rooms.kitchen.spawn.x / TILE, APARTMENT.rooms.kitchen.spawn.y / TILE, "up");
    first.feature.save();
    const second = setup(first.storage);
    expect(second.game.state.get("dishes")).toBe(5);
    expect(second.game.state.get("bedMade")).toBe(1);
    expect(second.game.state.get("energy")).toBe(12);
    expect(second.game.state.get("clock")).toBe(15.5);
    expect(second.game.player.facing).toBe("up");
    expect(second.game.player.col).toBe(APARTMENT.rooms.kitchen.spawn.x / TILE);
  });

  it("saves the dinner plate, and an old save without it starts with no plate (issue 065)", () => {
    const first = setup();
    first.game.state.applyEffects([{ var: "plate", set: 1 }]);
    first.feature.save();
    expect(setup(first.storage).game.state.get("plate")).toBe(1);
    const old = new FakeStorage();
    old.setItem(KEY, JSON.stringify({ version: 1, unlocked: [], stats: {}, world: { vars: { dishes: 2 }, room: "main", col: 3, row: 4, facing: "left" } }));
    expect(setup(old).game.state.get("plate")).toBe(0);
  });

  it("accepts a save from before a variable existed, and ignores unknown or bad ones", () => {
    const storage = new FakeStorage();
    storage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        unlocked: [],
        stats: {},
        world: { vars: { dishes: 4, oldVariable: 9, energy: "tired", mood: 9999 }, room: "main", col: 3, row: 4, facing: "left" },
      }),
    );
    const { game } = setup(storage);
    expect(game.state.get("dishes")).toBe(4);
    expect(game.state.get("energy")).toBe(STATE_VARS.find((v) => v.id === "energy")!.initial);
    expect(game.state.get("mood")).toBe(100); // clamped to its range
    // A variable the save does not have keeps its starting value.
    expect(game.state.get("blinds")).toBe(0);
  });

  it("copes with a variable the game has that the save does not, and one the save has that the game lost", () => {
    const storage = new FakeStorage();
    storage.setItem(KEY, JSON.stringify({ version: 1, unlocked: [], stats: {}, world: { vars: { dishes: 3, gone: 1 }, room: "main", col: 3, row: 4, facing: "down" } }));
    const vars = [...STATE_VARS, { id: "extra", initial: 2, min: 0, max: 5, meaning: "test" }];
    const { game } = setup(storage, vars);
    expect(game.state.get("extra")).toBe(2);
    expect(game.state.get("dishes")).toBe(3);
    expect(game.state.has("gone")).toBe(false);
  });

  it("starts at the beginning when the saved room is unknown or the tile is blocked or a doorway", () => {
    const start = APARTMENT.rooms[APARTMENT.start];
    const world = (room: string, col: number, row: number) =>
      JSON.stringify({ version: 1, unlocked: [], stats: {}, world: { vars: {}, room, col, row, facing: "left" } });
    const doorway = APARTMENT.rooms.main.doors[0];
    for (const w of [world("nowhere", 3, 4), world("main", 0, 0), world("main", 999, 4), world("main", -1, 2), world("main", doorway.col, doorway.row)]) {
      const storage = new FakeStorage();
      storage.setItem(KEY, w);
      const { game } = setup(storage);
      expect(game.player.col).toBe(Math.round(start.spawn.x / TILE));
      expect(game.player.row).toBe(Math.round(start.spawn.y / TILE));
    }
  });

  it("ignores a corrupt save and still plays", () => {
    const storage = new FakeStorage();
    storage.setItem(KEY, "{{{ not json");
    const { game, feature } = setup(storage);
    expect(feature.unlocks.count).toBe(0);
    complete(game, "coffee");
    expect(feature.stats.taskCount("coffee")).toBe(1);
  });

  it("works with no storage at all, and with storage that throws", () => {
    const { game, feature } = setup(null);
    for (let i = 0; i < 3; i++) complete(game, "coffee");
    expect(feature.unlocks.has("coffee-3")).toBe(true);
    expect(() => feature.update(UI.saveEvery + 1)).not.toThrow();

    const broken = new FakeStorage();
    broken.setItem = () => {
      throw new Error("quota");
    };
    broken.getItem = () => {
      throw new Error("blocked");
    };
    const other = setup(broken);
    for (let i = 0; i < 3; i++) complete(other.game, "coffee");
    expect(other.feature.unlocks.has("coffee-3")).toBe(true);
  });

  it("saves every few seconds and when the page is hidden", () => {
    const { feature, storage, visibility } = setup();
    feature.update(UI.saveEvery - 1);
    expect(storage!.data.has(KEY)).toBe(false);
    feature.update(1.01);
    expect(storage!.data.has(KEY)).toBe(true);
    storage!.data.clear();
    visibility.hidden = false;
    visibility.fire("visibilitychange", {});
    expect(storage!.data.has(KEY)).toBe(false);
    visibility.hidden = true;
    visibility.fire("visibilitychange", {});
    expect(storage!.data.has(KEY)).toBe(true);
  });

  it("counts time played and unlocks the one for it", () => {
    const { feature } = setup();
    feature.update(1800);
    feature.update(UI.checkEvery);
    expect(feature.unlocks.has("time-30")).toBe(true);
  });

  describe("the list screen", () => {
    it("opens and closes with the list key and takes the controls while open", () => {
      const { game, feature, press } = setup();
      expect(feature.listVisible).toBe(false);
      press(UI.listKey);
      expect(feature.listVisible).toBe(true);
      expect(game.inputLocked).toBe(true);
      press(UI.listKey);
      expect(feature.listVisible).toBe(false);
      expect(game.inputLocked).toBe(false);
      press(UI.listKey);
      press("Escape");
      expect(feature.listVisible).toBe(false);
      expect(game.inputLocked).toBe(false);
    });

    it("uses a key the rest of the game does not", () => {
      expect(["Tab", "Escape", "KeyE", "KeyX", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"]).not.toContain(UI.listKey);
    });

    it("does not open during a dialog or while a task runs", () => {
      const { game, feature, press } = setup();
      game.openDialog({ type: "say", text: "hi" } as never);
      press(UI.listKey);
      expect(feature.listVisible).toBe(false);
      vi.spyOn(game.interaction, "busy", "get").mockReturnValue(true);
      game.update(0, { dir: null, dirPressed: null, interactPressed: false, cancelPressed: false, keys: [], keysDown: [], keysReleased: [] });
      press(UI.listKey);
      expect(feature.listVisible).toBe(false);
    });

    it("moves a cursor with the arrows and wraps", () => {
      const { feature, press } = setup();
      press(UI.listKey);
      const up = { preventDefault: vi.fn() };
      press("ArrowUp", up);
      expect(up.preventDefault).toHaveBeenCalled();
      press("ArrowDown");
      expect(feature.listVisible).toBe(true);
    });

    it("draws without throwing, locked ones as question marks", () => {
      const { feature, press, game } = setup();
      complete(game, "coffee");
      press(UI.listKey);
      const texts: string[] = [];
      vi.stubGlobal("document", {
        createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillStyle: "", fillRect: () => {} }) }),
      });
      const ctx = new Proxy({ globalAlpha: 1, fillStyle: "", drawImage: (_g: unknown, x: number) => void texts.push(String(x)) } as never, {
        get: (t: Record<string, unknown>, k: string) => t[k] ?? (() => {}),
        set: (t: Record<string, unknown>, k: string, v) => ((t[k] = v), true),
      });
      expect(() => feature.drawHud(ctx as unknown as CanvasRenderingContext2D)).not.toThrow();
      expect(texts.length).toBeGreaterThan(0);
      vi.unstubAllGlobals();
    });
  });

  describe("the dialog voice key (issue 075)", () => {
    const fakeVoice = () => {
      let mode = "BEEP";
      return { label: () => `DIALOG VOICE: ${mode}`, toggle: () => void (mode = mode === "BEEP" ? "LETTERS" : "BEEP") };
    };

    it("D switches the dialog voice while the list is open, and does nothing when it is closed", () => {
      const { game, press } = setup();
      game.dialogVoice = fakeVoice();
      press("KeyD");
      expect(game.dialogVoice.label()).toBe("DIALOG VOICE: BEEP");
      press("KeyL");
      press(UI.dialogVoiceKey);
      expect(game.dialogVoice.label()).toBe("DIALOG VOICE: LETTERS");
      press("KeyD");
      expect(game.dialogVoice.label()).toBe("DIALOG VOICE: BEEP");
    });

    it("is not one of the other list keys, and without the sound feature does nothing", () => {
      expect(["KeyL", "KeyR", "KeyY", "Escape", "ArrowUp", "ArrowDown"]).not.toContain(UI.dialogVoiceKey);
      const { press, feature } = setup();
      press("KeyL");
      expect(() => press("KeyD")).not.toThrow();
      expect(feature.listVisible).toBe(true);
    });
  });

  describe("resetting progress", () => {
    it("needs Shift+R and then Y with the list open", () => {
      const { game, feature, press, storage } = setup();
      for (let i = 0; i < 3; i++) complete(game, "coffee");
      press("KeyR", { shiftKey: true });
      press("KeyY");
      expect(feature.unlocks.has("coffee-3")).toBe(true); // list was not open
      press(UI.listKey);
      press("KeyY");
      expect(feature.unlocks.has("coffee-3")).toBe(true); // no question asked
      press("KeyR"); // Shift not held
      press("KeyY");
      expect(feature.unlocks.has("coffee-3")).toBe(true);
      press("KeyR", { shiftKey: true });
      press("ArrowDown"); // something else in between cancels it
      press("KeyY");
      expect(feature.unlocks.has("coffee-3")).toBe(true);
      press("KeyR", { shiftKey: true });
      press("KeyY");
      expect(feature.unlocks.count).toBe(0);
      expect(feature.stats.taskCount("coffee")).toBe(0);
      expect(storage!.data.has(KEY)).toBe(false);
    });

    it("can be called directly, and sets the apartment back to its start", () => {
      const { game, feature, storage } = setup();
      for (let i = 0; i < 3; i++) complete(game, "coffee");
      game.state.applyEffects([{ var: "dishes", set: 8 }]);
      feature.reset();
      expect(feature.unlocks.count).toBe(0);
      expect(feature.toasts.idle).toBe(true);
      expect(game.state.get("dishes")).toBe(STATE_VARS.find((v) => v.id === "dishes")!.initial);
      expect(storage!.data.has(KEY)).toBe(false);
      // A new visit starts from nothing.
      expect(setup(storage).feature.unlocks.count).toBe(0);
    });

    it("lets things unlock again after a reset", () => {
      const { game, feature } = setup();
      for (let i = 0; i < 3; i++) complete(game, "coffee");
      feature.reset();
      for (let i = 0; i < 3; i++) complete(game, "coffee");
      expect(feature.unlocks.has("coffee-3")).toBe(true);
    });
  });

  it("saves the decor right after a swap, and a reset does not write a save", () => {
    const storage = new FakeStorage();
    const { game, feature } = setup(storage);
    const swap = game.decor.testItemIds().find((id) => id.startsWith("art-"))!;
    game.decor.own(swap);
    expect(game.decor.place("art-table", swap)).toBe(true);
    const saved = JSON.parse(storage.getItem(KEY)!);
    expect(saved.decor.placed["art-table"]).toBe(swap);
    storage.removeItem(KEY);
    feature.reset();
    expect(storage.getItem(KEY)).toBeNull();
  });
});
