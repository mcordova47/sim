import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { ENERGY, TILE, WALK } from "./config";
import type { GameEvents } from "./events";
import { Game } from "./game";
import { Grid } from "./grid";
import type { Interactable } from "./interactable";
import { InteractionSystem } from "./interaction";
import { parseTileMap } from "./tilemap";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const hold = (dir: Controls["dir"]): Controls => ({ ...NO_INPUT, dir });

type Task = Omit<Interactable, "zone">;

const wash: Task = {
  id: "wash",
  name: "Do the dishes",
  prompt: "Do the dishes",
  duration: 0.5,
  points: 20,
  cooldown: 1,
  requires: [{ var: "dishes", min: 1, reason: "NO DIRTY DISHES" }],
  effects: [{ var: "dishes", set: 0 }],
  pointsBonus: { var: "dishes", perUnit: 10 },
};

// The player (@) faces right with the sink (S) on the next tile.
function room(tasks: Task[] = [wash], extra: Record<string, object> = {}) {
  return {
    ...parseTileMap(
      ["##########", "#........#", "#..@S....#", "#........#", "##########"],
      { S: { color: "mist", tasks }, ...extra },
    ),
    facing: "right" as const,
  };
}

function run(game: Game, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, controls);
}

function setDishes(game: Game, n: number) {
  game.state.applyEffects([{ var: "dishes", set: n }]);
}

afterEach(() => vi.restoreAllMocks());

describe("requirements and effects on tasks", () => {
  it("won't start a task whose requirement is unmet, says why, and announces the refusal", () => {
    const game = new Game(room());
    setDishes(game, 0);
    const blocked: GameEvents["taskBlocked"][] = [];
    game.events.on("taskBlocked", (b) => blocked.push(b));
    run(game, 0.1);
    expect(game.interaction.unavailableReason(game.interaction.nearby!)).toBe("NO DIRTY DISHES");
    game.update(dt, press);
    expect(game.interaction.busy).toBe(false);
    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toMatchObject({ reason: "requirement", message: "NO DIRTY DISHES" });
  });

  it("still names the task in the prompt when it can't be done", () => {
    const game = new Game(room());
    setDishes(game, 0);
    run(game, 0.1);
    expect(game.interaction.nearby?.id).toBe("wash");
  });

  it("applies effects when the task finishes, not when it starts", () => {
    const game = new Game(room());
    setDishes(game, 3);
    run(game, 0.1);
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);
    expect(game.state.get("dishes")).toBe(3);
    run(game, 0.6);
    expect(game.state.get("dishes")).toBe(0);
  });

  it("makes the points depend on state through the bonus, worked out before the effects", () => {
    const game = new Game(room());
    setDishes(game, 3);
    run(game, 0.1);
    game.update(dt, press);
    run(game, 0.6);
    expect(game.interaction.lastCompletion?.award).toMatchObject({ points: 20 + 30, basePoints: 50 });
  });

  it("offers the first task on an object that can be done now", () => {
    const wipe: Task = { id: "wipe", name: "Wipe it", prompt: "Wipe it", duration: 0.1, points: 5 };
    const game = new Game(room([wash, wipe]));
    setDishes(game, 0);
    run(game, 0.1);
    expect(game.interaction.nearby?.id).toBe("wipe");
    setDishes(game, 2);
    run(game, 0.1);
    expect(game.interaction.nearby?.id).toBe("wash");
  });

  it("complains if a task has requirements but the system has no state", () => {
    const sys = new InteractionSystem([]);
    expect(() => sys.unavailableReason({ ...wash, zone: { x: 0, y: 0, w: 1, h: 1 } })).toThrow(/state/);
  });

  it("keeps cooldown refusals separate from requirement refusals", () => {
    const game = new Game(room());
    setDishes(game, 2);
    run(game, 0.1);
    game.update(dt, press);
    run(game, 0.6);
    setDishes(game, 2);
    const blocked: GameEvents["taskBlocked"][] = [];
    game.events.on("taskBlocked", (b) => blocked.push(b));
    game.update(dt, press);
    expect(blocked[0]).toMatchObject({ reason: "cooldown" });
    expect(blocked[0].message).toBeUndefined();
  });
});

describe("the stateChanged event", () => {
  it("is announced for task effects, with the new and old values", () => {
    const game = new Game(room());
    setDishes(game, 2);
    const log: GameEvents["stateChanged"][] = [];
    game.events.on("stateChanged", (c) => log.push(c));
    run(game, 0.1);
    game.update(dt, press);
    run(game, 0.6);
    expect(log).toContainEqual({ id: "dishes", value: 0, previous: 2 });
  });

  it("is announced when the clock passes an hour", () => {
    const game = new Game(room());
    const hours: number[] = [];
    game.events.on("stateChanged", (c) => c.id === "clock" && hours.push(c.value));
    run(game, 40); // a bit over an hour of game time at the default speed
    expect(hours.length).toBeGreaterThanOrEqual(1);
  });
});

describe("energy", () => {
  it("slows walking when tired", () => {
    const walk = (energy: number) => {
      const game = new Game(room());
      game.state.applyEffects([{ var: "energy", set: energy }]);
      run(game, WALK.turnTime + WALK.stepTime * 1.2, hold("down"));
      return game.player.row;
    };
    const rested = walk(80);
    const tired = walk(ENERGY.lowBelow - 5);
    expect(rested).toBeGreaterThan(tired);
  });

  it("makes steps take longer in proportion", () => {
    const game = new Game(room());
    game.state.applyEffects([{ var: "energy", set: 5 }]);
    run(game, WALK.turnTime, hold("down"));
    run(game, WALK.stepTime * 1.1, hold("down"));
    expect(game.player.stepping).toBe(true); // an ordinary step would be done
    run(game, WALK.stepTime * (ENERGY.tiredStepFactor - 1.1) + 0.02, hold("down"));
    expect(game.player.row).toBeGreaterThanOrEqual(3);
  });

  it("shows a yawn when it drops below the tired line, once", () => {
    const game = new Game(room());
    game.state.applyEffects([{ var: "energy", set: ENERGY.lowBelow + 1 }]);
    const popups = (game as unknown as { popups: { count: number } }).popups;
    game.state.applyEffects([{ var: "energy", add: -2 }]);
    expect(popups.count).toBe(1);
    game.state.applyEffects([{ var: "energy", add: -2 }]);
    expect(popups.count).toBe(1);
  });

  it("is restored by sleeping, which also unmakes the bed and moves the clock on", () => {
    const sleep: Task = {
      id: "sleep",
      name: "Sleep",
      prompt: "Sleep",
      duration: 0.2,
      points: 5,
      requires: [{ var: "energy", max: 60, reason: "NOT TIRED YET" }],
      effects: [
        { var: "energy", set: 100 },
        { var: "bedMade", set: 0 },
        { var: "clock", add: 7 },
      ],
    };
    const game = new Game(room([sleep]));
    game.state.applyEffects([{ var: "bedMade", set: 1 }, { var: "energy", set: 20 }, { var: "clock", set: 23 }]);
    run(game, 0.1);
    game.update(dt, press);
    run(game, 0.3);
    expect(game.state.get("energy")).toBeGreaterThan(95);
    expect(game.state.get("bedMade")).toBe(0);
    expect(game.state.get("clock")).toBeCloseTo(6, 0);
  });
});

describe("walkability that follows state", () => {
  it("lets a Grid swap its solids", () => {
    const grid = new Grid({ width: 3 * TILE, height: TILE }, []);
    expect(grid.isBlocked(1, 0)).toBe(false);
    grid.setSolids([{ x: TILE, y: 0, w: TILE, h: TILE }]);
    expect(grid.isBlocked(1, 0)).toBe(true);
    grid.setSolids([]);
    expect(grid.isBlocked(1, 0)).toBe(false);
  });

  // A pile of laundry (L) that blocks the way until the bed is made, standing
  // in for a door that opens.
  const doorRoom = () => ({
    ...parseTileMap(["#####", "#@L.#", "#####"], {
      L: { color: "mist", blockedWhen: [{ var: "bedMade", max: 0 }] },
    }),
    facing: "right" as const,
  });

  it("blocks and unblocks a tile when the state changes", () => {
    const game = new Game(doorRoom());
    run(game, 0.5, hold("right"));
    expect(game.player.col).toBe(1); // blocked

    game.state.applyEffects([{ var: "bedMade", set: 1 }]);
    run(game, WALK.stepTime * 2 + 0.1, hold("right"));
    expect(game.player.col).toBeGreaterThan(1);

    run(game, 1, hold("left")); // back to the start tile
    expect(game.player.col).toBe(1);
    game.state.applyEffects([{ var: "bedMade", set: 0 }]);
    run(game, 0.5, hold("right"));
    expect(game.player.col).toBe(1); // blocked again
  });
});

describe("object appearance", () => {
  const bedRoom = () => ({
    ...parseTileMap(["#####", "#@B.#", "#####"], {
      B: {
        color: "brick",
        variants: [
          { sprite: "bed-made", when: [{ var: "bedMade", min: 1 }], label: "BED MADE", color: "leaf" as const },
          { sprite: "bed-unmade", label: "BED UNMADE", color: "brick" as const },
        ],
      },
    }),
  });

  function draw(game: Game) {
    const texts: string[] = [];
    const fills: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === "canvas") return {};
          return () => undefined;
        },
        set: (_t, prop, value) => {
          if (prop === "fillStyle") fills.push(String(value));
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    // The font draws each letter from a cache canvas; record the letters.
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
    });
    vi.spyOn(Game.prototype as never, "drawHud" as never).mockImplementation(() => undefined);
    game.render(ctx, 1);
    return { texts, fills };
  }

  it("hides the plain rectangle for an object that has variants", () => {
    const level = bedRoom();
    expect(level.solids.find((s) => s.x === TILE * 2 && s.y === TILE)?.hidden).toBe(true);
    expect(level.appearances).toHaveLength(1);
    expect(level.appearances![0].area).toEqual({ x: 2 * TILE, y: TILE, w: TILE, h: TILE });
  });

  it("paints the variant that matches the state each frame", () => {
    const game = new Game(bedRoom());
    const unmade = draw(game).fills;
    game.state.applyEffects([{ var: "bedMade", set: 1 }]);
    const made = draw(game).fills;
    expect(made).not.toEqual(unmade);
  });
});
