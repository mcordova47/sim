import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { AchievementsFeature } from "./achievements/feature";
import { APARTMENT } from "./apartment";
import { Decor } from "./decor";
import { ownFromSearch } from "./decor-dev";
import { DECOR_DATA, DECOR_SLOTS, TEST_ITEMS, isTestItem } from "./decor-data";
import { choice, menu, say } from "./dialog";
import { Game } from "./game";
import { seeded } from "./particles/seeded";
import { taskSpots } from "./plan-checks";
import { TASKS, swapTaskId } from "./tasks";

// Issue 062 stage 2: the swap task. Real main room, real tasks.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const key = (code: string): Controls => ({ ...NO_INPUT, keys: [code], cancelPressed: code === "Escape" || code === "KeyX" });
const esc = key("Escape");
const down: Controls = { ...NO_INPUT, dirPressed: "down", dir: "down", keys: ["KeyS"], keysDown: ["KeyS"] };
const up: Controls = { ...NO_INPUT, dirPressed: "up", dir: "up", keys: ["KeyW"], keysDown: ["KeyW"] };
const TAB = key("Tab");

afterEach(() => vi.unstubAllGlobals());

function setup(owned: string[] = [], decor = new Decor()) {
  for (const id of owned) decor.own(id);
  const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
  return { game, decor };
}

// Stand where the given task can be done and face it.
function standAt(game: Game, id: string) {
  const spot = taskSpots(APARTMENT.rooms.main).find((s) => s.id === id);
  if (!spot) throw new Error(`no spot for ${id}`);
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
}

const TEST = TEST_ITEMS.map((i) => i.id);

function log(game: Game) {
  const events: string[] = [];
  for (const n of ["taskStart", "taskComplete", "taskCancelled", "dialogClose"] as const) game.events.on(n, () => events.push(n));
  return events;
}

describe("the swap tasks", () => {
  it("exist for each slot with an object, have no points, no cooldown and are named plainly", () => {
    const swaps = TASKS.filter((t) => t.decorSlot);
    expect(swaps.map((t) => t.id).sort()).toEqual(DECOR_SLOTS.filter((s) => s.object).map((s) => swapTaskId(s.id)).sort());
    expect(swaps.map((t) => t.prompt)).toContain("Change the painting");
    for (const t of swaps) {
      expect(t.points).toBe(0);
      expect(t.cooldown).toBe(0);
      expect(t.effects).toBeUndefined();
      expect(t.activity).toEqual({ type: "swap-decor" });
    }
  });

  it("are on the object each slot names, and nowhere else", () => {
    expect(new Decor().swapProblems(APARTMENT.rooms.main)).toEqual([]);
    const moved = { ...APARTMENT.rooms.main, interactables: APARTMENT.rooms.main.interactables.filter((i) => i.id !== "swap-art-desk") };
    expect(new Decor().swapProblems(moved).join()).toContain("art-desk");
    const wrongZones = {
      ...APARTMENT.rooms.main,
      interactables: APARTMENT.rooms.main.interactables.map((i) => (i.id === "swap-lamp-sofa" ? { ...i, zones: [{ x: 0, y: 0, w: 16, h: 16 }] } : i)),
    };
    expect(new Decor().swapProblems(wrongZones).join()).toContain("lamp-sofa");
  });

  it("are not offered in a fresh game: no prompt, not in the cycle", () => {
    const { game } = setup();
    for (const t of TASKS.filter((x) => x.decorSlot)) {
      standAt(game, t.id);
      expect(game.interaction.choices.map((c) => c.id)).not.toContain(t.id);
      expect(game.interaction.nearby?.id).not.toBe(t.id);
    }
    // The table keeps its four tasks and no cycle entry for the art.
    standAt(game, "swap-art-table");
    expect(game.interaction.nearby?.id).toBe("coffee");
    // The nightstand offers only the phone charger (issue 088) and the lamp table has nothing at all to do.
    standAt(game, "swap-art-bed");
    expect(game.interaction.nearby?.id).toBe("charge-phone");
    standAt(game, "swap-lamp-sofa");
    expect(game.interaction.nearby).toBeNull();
  });

  it("appear in the choice cycle once there is something to swap to, last", () => {
    const { game } = setup(["art-test-barn"]);
    standAt(game, "swap-art-table");
    expect(game.interaction.choices.map((c) => c.id)).toEqual(["coffee", "drink-coffee", "reheat", "eat-dinner", "swap-art-table"].filter((id) => game.interaction.choices.some((c) => c.id === id)));
    expect(game.interaction.choices.at(-1)?.id).toBe("swap-art-table");
    // Tab to it.
    for (let i = 0; i < 6 && game.interaction.nearby?.id !== "swap-art-table"; i++) game.update(dt, TAB);
    expect(game.interaction.nearby?.id).toBe("swap-art-table");
    // The other walls still have nothing (the barn test item fits the table and the desk, not the bed).
    standAt(game, "swap-art-bed");
    expect(game.interaction.nearby?.id).toBe("charge-phone");
  });

  it("are offered for one fitting item only at the slots it fits", () => {
    const { game } = setup(["lamp-test-stool"]);
    standAt(game, "swap-lamp-sofa");
    expect(game.interaction.nearby?.id).toBe("swap-lamp-sofa");
    standAt(game, "swap-plant-shelf");
    expect(game.interaction.choices.some((c) => c.id === "swap-plant-shelf")).toBe(false);
  });
});

describe("the swap list", () => {
  const start = (owned = ["art-test-barn", "art-test-desk"], id = "swap-art-table") => {
    const s = setup(owned);
    standAt(s.game, id);
    const events = log(s.game);
    // Make it the picked task, then start it.
    for (let i = 0; i < 6 && s.game.interaction.nearby?.id !== id; i++) s.game.update(dt, TAB);
    s.game.update(dt, press);
    expect(s.game.interaction.active?.item.id).toBe(id);
    return { ...s, events };
  };

  it("previews each item in the room as the highlight moves, without placing it", () => {
    const { game, decor } = start();
    const before = JSON.stringify(decor);
    expect(decor.itemIn("art-table").id).toBe("art-barn");
    game.update(dt, down);
    expect(decor.itemIn("art-table").id).not.toBe("art-barn");
    expect(decor.placedIn("art-table").id).toBe("art-barn");
    expect(JSON.stringify(decor)).toBe(before); // nothing saved changes
    expect(decor.previewing).toBe(true);
    game.update(dt, up);
    expect(decor.itemIn("art-table").id).toBe("art-barn");
  });

  it("E puts the item up: placed, no points, no mood, no cooldown, no completion or cancel", () => {
    const { game, decor, events } = start();
    const mood = game.state.get("mood");
    game.update(dt, down);
    game.update(dt, down); // past the gold abstract (shown on the desk wall) to the first spare one
    const shown = decor.itemIn("art-table").id;
    expect(shown).toBe("art-test-desk");
    game.update(dt, press);
    expect(decor.placedIn("art-table").id).toBe(shown);
    expect(decor.previewing).toBe(false);
    expect(game.interaction.busy).toBe(false);
    expect(game.inputLocked).toBe(false);
    expect(game.interaction.scoreboard.score).toBe(0);
    expect(game.state.get("mood")).toBe(mood);
    expect(events).toEqual(["taskStart"]);
    expect(JSON.parse(JSON.stringify(decor)).placed).toEqual({ "art-table": shown });
    expect(decor.inventory().map((i) => i.id)).toContain("art-barn");
    // The same E must not start it again, and there is no cooldown to wait out.
    for (let i = 0; i < 5; i++) game.update(dt, NO_INPUT);
    expect(game.interaction.busy).toBe(false);
  });

  it("E on the item already there changes nothing", () => {
    const { game, decor, events } = start();
    const before = JSON.stringify(decor);
    game.update(dt, press);
    expect(JSON.stringify(decor)).toBe(before);
    expect(events).toEqual(["taskStart"]);
    expect(game.interaction.busy).toBe(false);
  });

  it("Escape puts the room back, pays nothing and is not a cancelled task", () => {
    const { game, decor, events } = start();
    const before = JSON.stringify(decor);
    game.update(dt, down);
    game.update(dt, down);
    expect(decor.previewing).toBe(true);
    game.update(dt, esc);
    expect(decor.previewing).toBe(false);
    expect(decor.itemIn("art-table").id).toBe("art-barn");
    expect(JSON.stringify(decor)).toBe(before);
    expect(events).toEqual(["taskStart"]);
    expect(game.interaction.scoreboard.score).toBe(0);
    expect(game.inputLocked).toBe(false);
    // And it can start again at once.
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);
  });

  it("the X key leaves too, and an E pressed with Escape does not choose", () => {
    const a = start();
    a.game.update(dt, down);
    a.game.update(dt, key("KeyX"));
    expect(a.decor.itemIn("art-table").id).toBe("art-barn");
    expect(a.game.interaction.busy).toBe(false);
    const b = start();
    b.game.update(dt, down);
    b.game.update(dt, { ...esc, interactPressed: true, keys: ["Escape", "KeyE"] });
    expect(b.decor.placedIn("art-table").id).toBe("art-barn");
    expect(b.decor.previewing).toBe(false);
    for (let i = 0; i < 30; i++) b.game.update(dt, NO_INPUT);
    expect(b.game.interaction.busy).toBe(false);
  });

  it("the list wraps and shows the item names in the room", () => {
    const { game, decor } = start();
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) {
      game.update(dt, down);
      seen.add(decor.itemIn("art-table").id);
    }
    // The barn drawing (here), the gold abstract (shown on the desk wall: a swap) and the two spare ones.
    expect(seen).toEqual(new Set(["art-barn", "art-abstract", "art-test-barn", "art-test-desk"]));
  });

  it("the game clock and the apartment stand still while choosing", () => {
    const { game } = start();
    const clock = game.state.get("clock");
    for (let i = 0; i < 600; i++) game.update(dt, NO_INPUT);
    expect(game.state.get("clock")).toBe(clock);
  });

  it("a still item standing in the plant slot keeps the live plant's state, and it freezes (issue 105)", () => {
    const { game, decor } = start(["plant-dried"], "swap-plant-shelf");
    game.state.applyEffects([{ var: "plantStage", set: 2 }, { var: "plantDry", set: 5 }, { var: "plantGrowth", set: 1 }]);
    game.update(dt, down);
    game.update(dt, press);
    expect(decor.placedIn("plant-shelf").id).toBe("plant-dried");
    expect([game.state.get("plantStage"), game.state.get("plantDry"), game.state.get("plantGrowth")]).toEqual([2, 5, 1]);
    // Time, a nap and a night's sleep do not dry it, and the plant tasks are not offered.
    game.state.tick(3600);
    game.state.applyEffects([{ var: "clock", add: 3 }, { var: "plantDry", add: 3 }]);
    expect(game.state.get("plantDry")).toBe(5);
    const plantTasks = APARTMENT.rooms.main.interactables.filter((i) => i.liveSlot);
    expect(plantTasks.map((i) => i.id).sort()).toEqual(["check-plant", "water-plant", "water-plant-droop"]);
    for (const t of plantTasks) expect(game.interaction.hidden?.(t)).toBe(true);
    // Back to the snake plant: its state is as it was, it dries again and the tasks return.
    standAt(game, "swap-plant-shelf");
    for (let i = 0; i < 6 && game.interaction.nearby?.id !== "swap-plant-shelf"; i++) game.update(dt, TAB);
    expect(game.interaction.nearby?.id).toBe("swap-plant-shelf");
    game.update(dt, press);
    game.update(dt, up);
    game.update(dt, press);
    expect(decor.placedIn("plant-shelf").id).toBe("plant-snake");
    expect(game.state.get("plantStage")).toBe(2);
    expect(game.state.get("plantDry")).toBe(5);
    expect(game.state.get("plantGrowth")).toBe(1);
    game.state.tick(3600);
    expect(game.state.get("plantDry")).toBeGreaterThan(5);
    for (const t of plantTasks) expect(game.interaction.hidden?.(t)).toBe(false);
  });

  it("escaping a plant swap leaves the plant as it grew", () => {
    const { game, decor } = start(["plant-test-grown"], "swap-plant-shelf");
    game.state.applyEffects([{ var: "plantStage", set: 3 }]);
    game.update(dt, down);
    game.update(dt, esc);
    expect(game.state.get("plantStage")).toBe(3);
    expect(decor.placedIn("plant-shelf").id).toBe("plant-snake");
  });

  it("a saved swap loads back and the preview is never saved", () => {
    const storage = new FakeStorage();
    const decor = new Decor();
    decor.own("art-test-barn");
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
    const feature = new AchievementsFeature(game, { storage, keys: undefined });
    standAt(game, "swap-art-table");
    for (let i = 0; i < 6 && game.interaction.nearby?.id !== "swap-art-table"; i++) game.update(dt, TAB);
    game.update(dt, press);
    game.update(dt, down);
    game.update(dt, down); // past the gold abstract
    expect(decor.itemIn("art-table").id).toBe("art-test-barn");
    feature.save(); // saved while the list is open
    expect(JSON.parse(storage.data.get("life.progress.v1")!).decor.placed).toEqual({});
    game.update(dt, press); // choose
    feature.save();
    expect(JSON.parse(storage.data.get("life.progress.v1")!).decor.placed).toEqual({ "art-table": "art-test-barn" });
    const again = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, random: () => 0.5 });
    new AchievementsFeature(again, { storage, keys: undefined });
    expect(again.decor.itemIn("art-table").id).toBe("art-test-barn");
  });

  it("is not part of 'every task' (it never completes)", () => {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    const feature = new AchievementsFeature(game, { storage: new FakeStorage(), keys: undefined });
    const ctx = (feature as unknown as { ctx: { allTaskIds: string[] } }).ctx;
    expect(ctx.allTaskIds.some((id) => id.startsWith("swap-"))).toBe(false);
    expect(ctx.allTaskIds).toContain("coffee");
  });

  it("is drawn: a title, rows and the footer, and the preview sprite in the room", () => {
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }),
    });
    const { game } = start();
    game.update(dt, down);
    const drawn: string[] = [];
    const ctx = new Proxy({}, { get: (_t, k) => (k === "drawImage" ? () => drawn.push("g") : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D;
    expect(() => game.render(ctx, 1)).not.toThrow();
    expect(drawn.length).toBeGreaterThan(80);
  });
});

describe("Escape always leaves the room as it was (fuzz)", () => {
  const KEYS = ["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "KeyE", "Tab", "KeyQ", "Escape", "KeyX", "KeyL", "KeyM", "Enter", "Space"];
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`random keys, locks, dialogs and saves, seed ${seed}`, () => {
      const rand = seeded(seed);
      const storage = new FakeStorage();
      const decor = new Decor();
      for (const id of TEST) decor.own(id);
      const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: rand });
      const feature = new AchievementsFeature(game, { storage, keys: undefined });
      const swaps = TASKS.filter((t) => t.decorSlot).map((t) => t.id);
      let releaseLock: (() => void) | null = null;
      for (let step = 0; step < 400; step++) {
        const roll = rand();
        // Put the player at a swap object now and then, and sometimes open a dialog or take the controls.
        if (roll < 0.04) standAt(game, swaps[Math.floor(rand() * swaps.length)]);
        else if (roll < 0.06 && !game.dialogOpen && !game.interaction.busy) game.openDialog(menu("Hi", [choice("A", say("a")), choice("B")]));
        else if (roll < 0.08 && !releaseLock) releaseLock = game.lockInput();
        else if (roll < 0.1 && releaseLock) {
          releaseLock();
          releaseLock = null;
        } else if (roll < 0.12) feature.save();
        const code = KEYS[Math.floor(rand() * KEYS.length)];
        const controls: Controls = {
          ...NO_INPUT,
          keys: [code],
          keysDown: [code],
          interactPressed: code === "KeyE",
          cancelPressed: code === "Escape" || code === "KeyX",
          dirPressed: code === "KeyW" || code === "ArrowUp" ? "up" : code === "KeyS" || code === "ArrowDown" ? "down" : null,
        };
        // (While something else holds the controls nothing can be pressed, as for every task.)
        const swapping = game.interaction.active?.item.decorSlot !== undefined && !game.inputLocked;
        const saved = JSON.stringify(decor);
        game.update(dt, controls);
        // The preview exists only while a swap list is open.
        if (decor.previewing) expect(game.interaction.active?.item.decorSlot, `step ${step}`).toBeDefined();
        // Escape while a list is open always leaves things as they were.
        if (swapping && code === "Escape" && !game.dialogOpen) {
          expect(game.interaction.active, `step ${step}`).toBeNull();
          expect(decor.previewing).toBe(false);
          expect(JSON.stringify(decor), `step ${step}`).toBe(saved);
        }
        // What is saved never contains a preview: every placement is owned and fits.
        for (const [slot, item] of Object.entries(JSON.parse(JSON.stringify(decor)).placed as Record<string, string>)) {
          expect(decor.choices(slot).some((i) => i.id === item), `step ${step}`).toBe(true);
        }
      }
      // Drop everything, let it settle, and nothing is left previewing.
      releaseLock?.();
      for (let i = 0; i < 5; i++) game.update(dt, esc);
      for (let i = 0; i < 5; i++) game.update(dt, NO_INPUT);
      expect(decor.previewing).toBe(false);
      expect(game.interaction.scoreboard.score).toBeGreaterThanOrEqual(0);
    });
  }

  it("a preview left behind by anything else is cleared on the next frame", () => {
    const { game, decor } = setup(["art-test-barn"]);
    decor.preview("art-table", "art-test-barn");
    expect(decor.itemIn("art-table").id).toBe("art-test-barn");
    game.update(dt, NO_INPUT);
    expect(decor.previewing).toBe(false);
  });

  it("reset and load clear a preview, and a preview of something not owned or not fitting is refused", () => {
    const decor = new Decor();
    expect(decor.preview("art-table", "art-test-barn")).toBe(false); // not owned
    decor.own("art-test-barn");
    expect(decor.preview("art-bed", "art-test-barn")).toBe(false); // does not fit
    expect(decor.preview("nope", "art-test-barn")).toBe(false);
    expect(decor.preview("art-table", "art-test-barn")).toBe(true);
    decor.reset();
    expect(decor.previewing).toBe(false);
    decor.own("art-test-barn");
    decor.preview("art-table", "art-test-barn");
    decor.load({ owned: [], placed: {} });
    expect(decor.previewing).toBe(false);
  });

  it("the list closes quietly if the choices vanish while it is open", () => {
    const { game, decor } = setup(["plant-test-grown"]);
    standAt(game, "swap-plant-shelf");
    for (let i = 0; i < 6 && game.interaction.nearby?.id !== "swap-plant-shelf"; i++) game.update(dt, TAB);
    game.update(dt, press);
    game.update(dt, down);
    decor.reset(); // owned items gone (a reset from the achievements list)
    game.update(dt, NO_INPUT);
    expect(game.interaction.busy).toBe(false);
    expect(decor.previewing).toBe(false);
    expect(decor.itemIn("plant-shelf").id).toBe("plant-snake");
  });
});

describe("TEST items and ?own=", () => {
  it("are all clearly marked, use existing sprites and fit a slot", () => {
    expect(TEST_ITEMS.length).toBeGreaterThanOrEqual(3);
    for (const i of TEST_ITEMS) {
      expect(isTestItem(i)).toBe(true);
      expect(i.id).toContain("-test-");
      expect(i.name.startsWith("TEST ")).toBe(true);
      expect(i.how).toBeUndefined();
    }
    const real = DECOR_DATA.items.filter((i) => !isTestItem(i));
    expect(real.every((i) => !i.id.includes("-test-"))).toBe(true);
    expect(new Decor().starting().some((id) => id.includes("-test-"))).toBe(false);
  });

  it("are not owned by default, so a fresh game has no swap offered", () => {
    const decor = new Decor();
    for (const slot of DECOR_SLOTS) expect(decor.canChange(slot.id), slot.id).toBe(false);
    expect(decor.inventory()).toEqual([]);
  });

  it("?own=test owns every test item; ids work; junk and repeats are ignored", () => {
    const a = new Decor();
    expect(ownFromSearch(a, "?own=test").sort()).toEqual([...TEST].sort());
    expect(ownFromSearch(a, "?own=test")).toEqual([]);
    const b = new Decor();
    expect(ownFromSearch(b, "?own=art-test-barn,nope,,__proto__,art-test-barn")).toEqual(["art-test-barn"]);
    expect(ownFromSearch(b, "?set=plantStage:3")).toEqual([]);
    expect(ownFromSearch(b, "")).toEqual([]);
  });

  it("only the dev server uses it (main.ts checks import.meta.env.DEV)", async () => {
    // @ts-ignore node module, test only
    const fs = await import("node:fs");
    const main = fs.readFileSync(new URL("../main.ts", import.meta.url), "utf8") as string;
    expect(main).toMatch(/import\.meta\.env\.DEV\)\s*ownFromSearch/);
  });
});
