import { describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import { spriteNames } from "../render/sprite-names";
import { FakeStorage } from "./achievements/fake-storage";
import { AchievementsFeature } from "./achievements/feature";
import { APARTMENT } from "./apartment";
import { Decor } from "./decor";
import { CLOCK, PARTICLES, PLANT } from "./config";
import { Game } from "./game";
import { attachParticles } from "./particles/feature";
import { seeded } from "./particles/seeded";
import { settlePlant, STAGE_NAMES } from "./plant";
import { taskSpots } from "./plan-checks";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";

// Issue 063: the snake plant grows with watering and time, droops when left
// dry, and never dies. Everything runs on the game clock, so it is exact.

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });
const dt = 1 / 60;
const press = { ...NO_INPUT, interactPressed: true };
const rooms = APARTMENT.rooms;
const hoursToSeconds = (h: number) => (h * 60) / CLOCK.minutesPerSecond;
const newState = () => new ApartmentState(STATE_VARS);
const newGame = () => new Game(rooms.main, { rooms, random: () => 0.5 });
const run = (game: Game, hours: number) => {
  // The game ticks in frames; a whole number of them is close enough that the
  // tests only look at thresholds with a margin.
  for (let i = 0; i < Math.round(hoursToSeconds(hours) / dt); i++) game.update(dt, NO_INPUT);
};
const set = (s: ApartmentState, id: string, value: number) => s.applyEffects([{ var: id, set: value }]);

// Stand at the bookshelf's south end, press E and let the task finish. Returns
// the id of the task that ran, or null if nothing started.
function waterNow(game: Game): string | null {
  const spot = taskSpots(rooms.main).find((s) => s.id === "water-plant")!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  const ran: string[] = [];
  game.events.on("taskStart", ({ item }) => ran.push(item.id));
  game.update(dt, press);
  for (let i = 0; i < 60 * 20 && game.interaction.busy; i++) {
    game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
  }
  return ran[0] ?? null;
}
// What E would start at the bookshelf's plant spot.
const offered = (game: Game) => {
  const spot = taskSpots(rooms.main).find((s) => s.id === "water-plant")!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  return game.interaction.nearby?.id;
};
// The bookshelf also offers records; take them out so only the plant is here.
function plantOnly(): Game {
  const main = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => /plant/.test(i.id)) };
  return new Game(main, { rooms: { ...rooms, main }, random: () => 0.5 });
}
// The plant's sprite now comes from the plant item in the decor slot (issue 062).
const plantSprite = (s: ApartmentState) => new Decor().look("plant-shelf", s).sprite;
const stageOf = (g: Game) => g.state.get("plantStage");

describe("the state", () => {
  it("starts small, with no progress, and some time since it was watered", () => {
    const s = newState();
    expect(s.get("plantStage")).toBe(1);
    expect(s.get("plantGrowth")).toBe(0);
    expect(s.get("plantDry")).toBeGreaterThanOrEqual(PLANT.dampHours);
    expect(s.get("plantDry")).toBeLessThan(PLANT.droopAfterHours);
    expect(STAGE_NAMES).toHaveLength(PLANT.lastStage + 1);
  });

  it("an old save without the plant variables keeps their starting values", () => {
    const storage = new FakeStorage();
    storage.setItem(
      "life.progress.v1",
      JSON.stringify({ version: 1, unlocked: [], stats: {}, world: { vars: { dishes: 4 }, room: "main", col: 3, row: 4, facing: "down" } }),
    );
    const game = newGame();
    new AchievementsFeature(game, { storage, keys: { addEventListener() {} }, visibility: { addEventListener() {} } });
    expect(game.state.get("dishes")).toBe(4);
    expect(game.state.get("plantStage")).toBe(1);
    expect(game.state.get("plantDry")).toBe(12);
  });

  it("a saved plant comes back as it was", () => {
    const storage = new FakeStorage();
    storage.setItem(
      "life.progress.v1",
      JSON.stringify({ version: 1, unlocked: [], stats: {}, world: { vars: { plantStage: 3, plantGrowth: 0, plantDry: 120 }, room: "main", col: 3, row: 4, facing: "down" } }),
    );
    const game = newGame();
    new AchievementsFeature(game, { storage, keys: { addEventListener() {} }, visibility: { addEventListener() {} } });
    expect(stageOf(game)).toBe(3);
    expect(game.state.get("plantDry")).toBe(120);
  });

  it("the soil dries as the game clock runs, hour for hour, and stops at the cap", () => {
    const s = newState();
    set(s, "plantDry", 0);
    s.tick(hoursToSeconds(10));
    expect(s.get("plantDry")).toBeCloseTo(10, 6);
    s.tick(hoursToSeconds(5000));
    expect(s.get("plantDry")).toBe(PLANT.maxDryHours);
  });
});

describe("growing", () => {
  it("moves up a stage after the listed waterings, one stage at a time, and stops at flowering", () => {
    const game = newGame();
    game.state.applyEffects([{ var: "plantStage", set: 0 }]);
    const seen: number[] = [];
    for (let stage = 0; stage < PLANT.lastStage; stage++) {
      for (let n = 0; n < PLANT.wateringsToGrow[stage]; n++) {
        expect(stageOf(game), `before watering ${n + 1} at stage ${stage}`).toBe(stage);
        game.state.applyEffects([{ var: "plantGrowth", add: 1 }]);
      }
      seen.push(stageOf(game));
      expect(game.state.get("plantGrowth")).toBe(0);
    }
    expect(seen).toEqual([1, 2, 3]);
    // The last stage is as far as it goes, and its count is simply cleared.
    game.state.applyEffects([{ var: "plantGrowth", add: 4 }]);
    expect(stageOf(game)).toBe(PLANT.lastStage);
    expect(game.state.get("plantGrowth")).toBe(0);
  });

  it("settlePlant keeps leftover waterings", () => {
    const s = newState();
    set(s, "plantStage", 0);
    set(s, "plantGrowth", PLANT.wateringsToGrow[0] + 1);
    expect(settlePlant(s)).toBe(true);
    expect(s.get("plantStage")).toBe(1);
    expect(s.get("plantGrowth")).toBe(1);
    expect(settlePlant(s)).toBe(false);
  });

  it("is driven by real watering tasks, spaced by the game clock", () => {
    const game = plantOnly();
    game.state.applyEffects([{ var: "plantStage", set: 0 }]);
    const stages: number[] = [];
    for (let n = 0; n < PLANT.wateringsToGrow[0]; n++) {
      run(game, PLANT.dampHours + 0.5);
      expect(waterNow(game)).toBe("water-plant");
      stages.push(stageOf(game));
    }
    expect(stages).toEqual([0, 1]);
    expect(game.state.get("plantDry")).toBeCloseTo(0, 1);
  });

  it("is the same every time: two games given the same waterings end the same", () => {
    const play = () => {
      const game = plantOnly();
      for (let n = 0; n < 5; n++) {
        run(game, PLANT.dampHours + 1);
        waterNow(game);
      }
      return [stageOf(game), game.state.get("plantGrowth"), game.state.get("plantDry")];
    };
    expect(play()).toEqual(play());
  });
});

describe("watering", () => {
  it("says the plant is fine while the soil is still damp, and does not move it on", () => {
    const game = plantOnly();
    run(game, PLANT.dampHours + 0.5);
    expect(waterNow(game)).toBe("water-plant");
    const growth = game.state.get("plantGrowth");
    const stage = stageOf(game);
    const water = rooms.main.interactables.find((i) => i.id === "water-plant")!;
    expect(game.interaction.unavailableReason(water)).toBe("SOIL IS STILL DAMP");
    expect(offered(game)).toBe("check-plant");
    run(game, 70); // plenty of cooldown; the soil is still damp for dampHours
    set(game.state, "plantDry", 1);
    expect(offered(game)).toBe("check-plant");
    expect(waterNow(game)).toBe("check-plant");
    expect(game.state.get("plantGrowth")).toBe(growth);
    expect(stageOf(game)).toBe(stage);
    expect(game.state.get("plantDry")).toBeGreaterThanOrEqual(1);
  });

  it("offers watering again once the soil has dried", () => {
    const game = plantOnly();
    set(game.state, "plantDry", PLANT.dampHours - 0.01);
    expect(offered(game)).toBe("check-plant");
    set(game.state, "plantDry", PLANT.dampHours);
    expect(offered(game)).toBe("water-plant");
  });

  it("a flowering plant can still be watered, and stays flowering", () => {
    const game = plantOnly();
    set(game.state, "plantStage", PLANT.lastStage);
    set(game.state, "plantDry", 30);
    expect(waterNow(game)).toBe("water-plant");
    expect(stageOf(game)).toBe(PLANT.lastStage);
    expect(game.state.get("plantDry")).toBeCloseTo(0, 1);
  });
});

describe("drooping", () => {
  it("droops only after the long gap, by the clock", () => {
    const s = newState();
    set(s, "plantDry", 0);
    s.tick(hoursToSeconds(PLANT.droopAfterHours - 1));
    const sprite = () => plantSprite(s);
    expect(sprite()).toBe("plant-1");
    s.tick(hoursToSeconds(2));
    expect(sprite()).toBe("plant-wilted");
  });

  it("never dies and never loses a stage, however long it is left", () => {
    const s = newState();
    set(s, "plantStage", 2);
    set(s, "plantDry", 0);
    s.tick(hoursToSeconds(100_000));
    expect(s.get("plantStage")).toBe(2);
    expect(s.get("plantGrowth")).toBe(0);
    expect(plantSprite(s)).toBe("plant-wilted");
  });

  it("one watering perks it up, with its own task, and it keeps the stage it had", () => {
    const game = plantOnly();
    set(game.state, "plantStage", 2);
    set(game.state, "plantDry", PLANT.droopAfterHours + 10);
    expect(offered(game)).toBe("water-plant-droop");
    expect(waterNow(game)).toBe("water-plant-droop");
    expect(stageOf(game)).toBe(2);
    expect(game.state.get("plantDry")).toBeCloseTo(0, 1);
    expect(plantSprite(game.state)).toBe("plant-2");
  });

  it("sleeping and napping let the soil dry for the hours they skip", () => {
    for (const id of ["sleep", "nap"]) {
      const task = rooms.main.interactables.find((i) => i.id === id)!;
      const state = newState();
      set(state, "plantDry", 0);
      state.applyEffects(task.effects);
      const hours = task.effects!.find((e) => e.var === "clock")!.add!;
      expect(state.get("plantDry"), id).toBe(hours);
    }
  });
});

describe("how it looks", () => {
  const look = (stage: number, dry = 0) => {
    const s = newState();
    set(s, "plantStage", stage);
    set(s, "plantDry", dry);
    return plantSprite(s);
  };

  it("has a look for each stage and for drooping, chosen from state", () => {
    expect([0, 1, 2, 3].map((n) => look(n))).toEqual(["plant-0", "plant-1", "plant-2", "plant-3"]);
    expect([0, 1, 2, 3].map((n) => look(n, PLANT.droopAfterHours))).toEqual(Array(4).fill("plant-wilted"));
  });

  it("is its own piece on the bookshelf in the `plant-shelf` slot, not part of its sprite", () => {
    const prop = rooms.main.props![0];
    expect(prop.slot).toBe("plant-shelf");
    expect(prop.on.sprite).toBe("bookshelf");
    expect(prop.area).toMatchObject({ w: 16, h: 16 });
    expect(prop.area.x).toBe(prop.on.bounds.x);
    expect(prop.area.y).toBeGreaterThan(prop.on.bounds.y);
    expect(prop.area.y + prop.area.h).toBeLessThanOrEqual(prop.on.bounds.y + prop.on.bounds.h);
    // It blocks nothing and has no tiles of its own.
    expect(rooms.main.pieces.filter((p) => p.name === "snake plant")).toHaveLength(0);
  });

  it("every sprite it can use is loaded and has a file", () => {
    const names = spriteNames(Object.values(rooms));
    for (const n of ["plant-0", "plant-1", "plant-2", "plant-3", "plant-wilted"]) {
      expect(names).toContain(n);
      expect(`/public/sprites/${n}.png` in spriteFiles, n).toBe(true);
    }
  });

  it("draws in the room without a sprite source, from the placeholder", () => {
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }),
    });
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    expect(() => newGame().render(ctx, 1)).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe("the particles", () => {
  function setup() {
    const game = plantOnly();
    const feature = attachParticles(game, { random: seeded(5) });
    return { game, feature };
  }

  it("a few bits drift up when it grows", () => {
    const { game, feature } = setup();
    set(game.state, "plantStage", 0);
    const before = feature.pool.count;
    game.state.applyEffects([{ var: "plantGrowth", set: PLANT.wateringsToGrow[0] }]);
    expect(stageOf(game)).toBe(1);
    expect(feature.pool.count - before).toBeGreaterThanOrEqual(PARTICLES.plantGrow.count[0]);
  });

  it("and when it perks up, but not for an ordinary watering", () => {
    const { game, feature } = setup();
    set(game.state, "plantDry", 30);
    game.state.applyEffects([{ var: "plantDry", set: 0 }]);
    expect(feature.pool.count).toBe(0);
    set(game.state, "plantDry", PLANT.droopAfterHours + 1);
    game.state.applyEffects([{ var: "plantDry", set: 0 }]);
    expect(feature.pool.count).toBeGreaterThan(0);
  });

  it("sit on the plant: inside the bookshelf piece", () => {
    const { game, feature } = setup();
    set(game.state, "plantStage", 0);
    game.state.applyEffects([{ var: "plantGrowth", set: PLANT.wateringsToGrow[0] }]);
    const shelf = game.currentLevel.pieces.find((p) => p.sprite === "bookshelf")!.bounds;
    for (const p of feature.pool.particles()) {
      expect(p.x).toBeGreaterThan(shelf.x);
      expect(p.x).toBeLessThan(shelf.x + shelf.w);
      expect(p.y).toBeGreaterThan(shelf.y);
      expect(p.y).toBeLessThan(shelf.y + shelf.h);
    }
  });
});
