import { describe, expect, it, vi } from "vitest";
import palette from "../../../art/palette.json";
import { NO_INPUT, type Controls } from "../../input/controls";
import { COLOR } from "../../render/colors";
import { GOOD_HOUR_HINT, promptSize } from "../../render/world-ui";
import { unsupportedChars } from "../../render/font";
import { APARTMENT } from "../apartment";
import { CLOCK, TIME_DEV, TIME_OF_DAY, VIEW } from "../config";
import { say } from "../dialog";
import { Game } from "../game";
import type { Interactable } from "../interactable";
import { Popups } from "../../render/popups";
import { parseTileMap } from "../tilemap";
import { TASKS } from "../tasks";
import { TimeOfDayFeature, type KeyEventLike } from "./feature";
import { inAnyWindow, inWindow, windowProblem } from "./hours";
import { lightAt, roomWashes } from "./tint";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const run = (game: Game, seconds: number, c: Controls = NO_INPUT) => {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, c);
};

type Task = Omit<Interactable, "zones">;
const tea: Task = {
  id: "tea", name: "Make tea", prompt: "Make tea", duration: 0.2, points: 100, cooldown: 1,
  goodHours: [{ from: 6, to: 10 }],
};
// The player (@) faces right with the task object (S) on the next tile.
function room(task: Task = tea) {
  return {
    ...parseTileMap(["##########", "#........#", "#..@S....#", "#........#", "##########"], {
      S: { color: "mist", tasks: [task.id] },
    }, { tasks: [task] }),
    facing: "right" as const,
  };
}
const setHour = (game: Game, hour: number) => game.state.applyEffects([{ var: "clock", set: hour }]);

describe("the game clock", () => {
  it("advances with game time at the configured speed and wraps past midnight", () => {
    const game = new Game(room());
    setHour(game, 23.5);
    run(game, 60); // a minute of play is CLOCK.minutesPerSecond * 60 game minutes
    const expected = (23.5 + (CLOCK.minutesPerSecond * 60) / 60) % 24;
    expect(game.state.get("clock")).toBeCloseTo(expected, 1);
    expect(game.state.get("clock")).toBeLessThan(24);
    expect(game.state.get("clock")).toBeGreaterThanOrEqual(0);
  });

  it("pauses with the game (a dialog open stops it)", () => {
    const game = new Game(room());
    run(game, 1);
    game.openDialog(say("A long thought.".repeat(8)));
    const clock = game.state.get("clock");
    run(game, 5);
    expect(game.dialogOpen).toBe(true);
    expect(game.state.get("clock")).toBe(clock);
  });
});

describe("hour windows", () => {
  it("include the start and not the end", () => {
    expect(inWindow(6, { from: 6, to: 10 })).toBe(true);
    expect(inWindow(9.99, { from: 6, to: 10 })).toBe(true);
    expect(inWindow(10, { from: 6, to: 10 })).toBe(false);
    expect(inWindow(5.99, { from: 6, to: 10 })).toBe(false);
  });

  it("wrap past midnight", () => {
    const night = { from: 22, to: 4 };
    for (const h of [22, 23.5, 0, 1, 3.99]) expect(inWindow(h, night), String(h)).toBe(true);
    for (const h of [4, 12, 21.99]) expect(inWindow(h, night), String(h)).toBe(false);
    // A window that ends exactly at midnight.
    expect(inWindow(23.9, { from: 20, to: 24 })).toBe(true);
    expect(inWindow(0, { from: 20, to: 24 })).toBe(false);
  });

  it("match any of several, and none when there are none", () => {
    const two = [{ from: 5, to: 8 }, { from: 20, to: 24 }];
    expect(inAnyWindow(6, two)).toBe(true);
    expect(inAnyWindow(21, two)).toBe(true);
    expect(inAnyWindow(12, two)).toBe(false);
    expect(inAnyWindow(12, undefined)).toBe(false);
    expect(inAnyWindow(12, [])).toBe(false);
  });

  it("flag windows that make no sense", () => {
    expect(windowProblem({ from: 6, to: 10 })).toBeNull();
    expect(windowProblem({ from: 22, to: 4 })).toBeNull();
    expect(windowProblem({ from: 5, to: 5 })).not.toBeNull();
    expect(windowProblem({ from: -1, to: 5 })).not.toBeNull();
    expect(windowProblem({ from: 24, to: 5 })).not.toBeNull();
    expect(windowProblem({ from: 5, to: 25 })).not.toBeNull();
    expect(windowProblem({ from: NaN, to: 5 })).not.toBeNull();
  });
});

describe("the tint", () => {
  const hexes = new Set(Object.values(palette.colors).map((c) => c.hex));
  // The color a wash lays over white, to measure how much the look changes.
  function over(hour: number) {
    const rgb = [255, 255, 255];
    for (const w of lightAt(hour).washes) {
      const n = parseInt(COLOR[w.color].slice(1), 16);
      const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      for (let i = 0; i < 3; i++) rgb[i] = rgb[i] * (1 - w.alpha) + c[i] * w.alpha;
    }
    return rgb;
  }

  it("is a palette color with an alpha in range at every time of day", () => {
    for (let h = 0; h <= 24; h += 0.05) {
      const light = lightAt(h);
      expect(light.washes.length).toBeGreaterThan(0);
      expect(light.washes.length).toBeLessThanOrEqual(2);
      for (const w of light.washes) {
        expect(hexes.has(COLOR[w.color]), `${h} ${w.color}`).toBe(true);
        expect(w.alpha).toBeGreaterThanOrEqual(0);
        expect(w.alpha).toBeLessThanOrEqual(0.6);
      }
      expect(light.lamps).toBeGreaterThanOrEqual(0);
      expect(light.lamps).toBeLessThanOrEqual(1);
    }
  });

  it("never gets dark enough to lose the furniture (alpha stays moderate)", () => {
    for (let h = 0; h < 24; h += 0.1) {
      const total = lightAt(h).washes.reduce((s, w) => s + w.alpha, 0);
      expect(total).toBeLessThanOrEqual(0.5);
    }
  });

  it("changes smoothly across the day, and the day comes round at midnight", () => {
    let worst = 0;
    for (let h = 0; h < 24; h += 0.05) {
      const a = over(h);
      const b = over(h + 0.05);
      worst = Math.max(worst, ...a.map((v, i) => Math.abs(v - b[i])));
    }
    // About 100 shades over a few hours: a step of 0.05 h changes well under 5.
    expect(worst).toBeLessThan(5);
    // Midnight: the last instant of one day matches the start of the next.
    const end = over(23.9999);
    const start = over(0);
    for (let i = 0; i < 3; i++) expect(Math.abs(end[i] - start[i])).toBeLessThan(0.5);
    expect(lightAt(24)).toEqual(lightAt(0));
  });

  it("is bright at noon, dark at midnight and warm at dusk", () => {
    expect(lightAt(12).washes.every((w) => w.alpha === 0)).toBe(true);
    expect(lightAt(12).lamps).toBe(0);
    expect(lightAt(0).washes[0]).toMatchObject({ color: "night" });
    expect(lightAt(0).lamps).toBe(1);
    expect(lightAt(19.5).washes.map((w) => w.color)).toContain("tangerine");
  });

  it("lights the bath less than the main room, and closed blinds dim the main room by day", () => {
    const night = lightAt(0);
    const total = (room: string, open: boolean) =>
      roomWashes(night, room, open).reduce((s, w) => s + w.alpha, 0);
    expect(total("bath", true)).toBeLessThan(total("main", true));
    const noon = lightAt(12);
    expect(roomWashes(noon, "main", true)).toEqual([]);
    expect(roomWashes(noon, "main", false)).toHaveLength(1);
    expect(roomWashes(noon, "kitchen", false)).toEqual([]);
    // At night there is no daylight for the blinds to keep out.
    expect(total("main", false)).toBeCloseTo(total("main", true), 5);
  });
});

describe("task bonuses", () => {
  function finish(hour: number, task: Task = tea) {
    const game = new Game(room(task));
    setHour(game, hour);
    game.state.applyEffects([{ var: "energy", set: 100 }]);
    game.update(dt, press);
    run(game, 0.5);
    return game.interaction.lastCompletion!;
  }

  it("multiplies the points only inside the task's good hours", () => {
    const good = finish(8);
    const bad = finish(15);
    expect(good.award.timeFactor).toBe(TIME_OF_DAY.bonusMultiplier);
    expect(good.award.points).toBe(Math.round(100 * TIME_OF_DAY.bonusMultiplier));
    expect(bad.award.timeFactor).toBe(1);
    expect(bad.award.points).toBe(100);
  });

  it("applies in a window that wraps past midnight, and not at its edges", () => {
    const night: Task = { ...tea, goodHours: [{ from: 22, to: 4 }] };
    expect(finish(1, night).award.timeFactor).toBeGreaterThan(1);
    expect(finish(23, night).award.timeFactor).toBeGreaterThan(1);
    expect(finish(5, night).award.timeFactor).toBe(1);
    expect(finish(21, night).award.timeFactor).toBe(1);
  });

  it("is not given to tasks with no good hours", () => {
    const { goodHours: _gone, ...plain } = tea;
    expect(finish(8, plain).award.timeFactor).toBe(1);
  });

  it("uses the hour the task finishes at, before its own effects move the clock", () => {
    const nap: Task = { ...tea, effects: [{ var: "clock", add: 6 }] };
    expect(finish(7, nap).award.timeFactor).toBeGreaterThan(1);
  });

  it("adds a line to the award popup saying the bonus applied, in the font", () => {
    const add = vi.spyOn(Popups.prototype, "add");
    const game = new Game(room());
    setHour(game, 8);
    game.update(dt, press);
    run(game, 0.5);
    const lines = add.mock.calls.flatMap((c) => c[2].map((l) => l.text));
    expect(lines).toContain("GOOD HOUR X1.5");
    for (const text of lines) expect(unsupportedChars(text), text).toEqual([]);
    expect(unsupportedChars(GOOD_HOUR_HINT)).toEqual([]);

    add.mockClear();
    const late = new Game(room());
    setHour(late, 15);
    late.update(dt, press);
    run(late, 0.5);
    expect(add.mock.calls.flatMap((c) => c[2].map((l) => l.text)).some((t) => t.startsWith("GOOD HOUR"))).toBe(false);
    add.mockRestore();
  });
});

describe("the prompt hint", () => {
  it("shows only at good hours, and only while the task can start", () => {
    const game = new Game(room());
    setHour(game, 8);
    run(game, 0.1);
    const item = game.interaction.nearby!;
    expect(game.interaction.isGoodTime(item)).toBe(true);
    setHour(game, 15);
    expect(game.interaction.isGoodTime(item)).toBe(false);
    setHour(game, 10);
    expect(game.interaction.isGoodTime(item)).toBe(false);
  });

  it("makes the prompt wider, and still fits the screen for every real task", () => {
    const item = { ...tea, zones: [] } as Interactable;
    expect(promptSize(item, 0, null, true).w).toBeGreaterThan(promptSize(item, 0, null, false).w);
    for (const t of TASKS.filter((x) => x.goodHours)) {
      const w = promptSize({ ...t, zones: [] }, 0, null, true).w;
      expect(w, t.id).toBeLessThan(VIEW.width - 8);
    }
  });
});

describe("good hours on the real tasks", () => {
  const withHours = TASKS.filter((t) => t.goodHours);

  it("are valid windows", () => {
    expect(withHours.length).toBeGreaterThan(15);
    for (const t of withHours) for (const w of t.goodHours!) expect(windowProblem(w), t.id).toBeNull();
  });

  it("put the morning tasks in the morning and the evening ones in the evening", () => {
    const at = (id: string, hour: number) => inAnyWindow(hour, TASKS.find((t) => t.id === id)?.goodHours);
    for (const id of ["make-bed", "coffee", "drink-coffee", "mirror-morning", "open-blinds"]) {
      expect(at(id, 8), id).toBe(true);
      expect(at(id, 15), id).toBe(false);
    }
    for (const id of ["cook", "eat-dinner", "dishes"]) {
      expect(at(id, 19), id).toBe(true);
      expect(at(id, 8), id).toBe(false);
    }
    expect(at("shower", 8)).toBe(true);
    expect(at("shower", 21)).toBe(true);
    expect(at("shower", 14)).toBe(false);
    expect(at("sleep", 1)).toBe(true);
  });

  it("only name tasks that exist", () => {
    const ids = new Set(TASKS.map((t) => t.id));
    expect(ids.size).toBe(TASKS.length);
  });
});

// A canvas that remembers what was filled.
function fakeCtx() {
  const fills: { style: unknown; args: number[] }[] = [];
  const ctx = {
    fillStyle: "" as unknown,
    fillRect: vi.fn(function (this: { fillStyle: unknown }, ...args: number[]) {
      fills.push({ style: this.fillStyle, args });
    }),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills, raw: ctx };
}

describe("the lighting layer", () => {
  function setup(options = {}) {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    const feature = new TimeOfDayFeature(game, options);
    return { game, feature };
  }

  it("draws nothing by day (blinds open) and a tint over the view at night", () => {
    const { game, feature } = setup();
    game.state.applyEffects([{ var: "blinds", set: 1 }]);
    setHour(game, 12);
    const day = fakeCtx();
    feature.drawWorld(day.ctx, { x: 0, y: 0 });
    expect(day.fills).toEqual([]);

    setHour(game, 0);
    const night = fakeCtx();
    feature.drawWorld(night.ctx, { x: 5, y: 7 });
    expect(night.fills[0].args).toEqual([5, 7, VIEW.width, VIEW.height]);
    expect(String(night.fills[0].style)).toMatch(/^rgba\(/);
    // Lamps are lit in the main room at night.
    expect(night.raw.arc).toHaveBeenCalled();
  });

  it("has no lamp glow by day or in the other rooms", () => {
    const { game, feature } = setup();
    setHour(game, 12);
    const day = fakeCtx();
    feature.drawWorld(day.ctx, { x: 0, y: 0 });
    expect(day.raw.arc).not.toHaveBeenCalled();

    game.loadLevel(APARTMENT.rooms.kitchen, 9, 3, "left");
    setHour(game, 0);
    const kitchen = fakeCtx();
    feature.drawWorld(kitchen.ctx, { x: 0, y: 0 });
    expect(kitchen.fills.length).toBeGreaterThan(0);
    expect(kitchen.raw.arc).not.toHaveBeenCalled();
  });

  it("follows the clock every frame, not only on the hour", () => {
    const { game, feature } = setup();
    game.state.applyEffects([{ var: "blinds", set: 1 }]);
    const alphas = [7.3, 7.6].map((h) => {
      setHour(game, h);
      const f = fakeCtx();
      feature.drawWorld(f.ctx, { x: 0, y: 0 });
      return f.fills.map((x) => String(x.style));
    });
    expect(alphas[0]).not.toEqual(alphas[1]);
  });

  it("is drawn by the game in the world pass, before the prompts, HUD and dialogs", () => {
    const { game, feature } = setup();
    const order: string[] = [];
    vi.spyOn(feature, "drawWorld").mockImplementation(() => void order.push("tint"));
    // A canvas that accepts every call and records the first text-ish draw.
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (t, k: string) => (k in t ? t[k] : () => (k === "measureText" ? { width: 0 } : undefined)),
      set: (t, k: string, v) => ((t[k] = v), true),
    }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    try {
      game.render(ctx, 0);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(order).toEqual(["tint"]);
  });
});

describe("developer shortcuts", () => {
  function keys() {
    const listeners: ((e: KeyEventLike) => void)[] = [];
    return {
      target: { addEventListener: (_: string, l: (e: KeyEventLike) => void) => listeners.push(l) },
      press: (code: string, repeat = false) => listeners.forEach((l) => l({ code, repeat })),
      count: () => listeners.length,
    };
  }

  it("do nothing unless dev is on", () => {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    const k = keys();
    new TimeOfDayFeature(game, { dev: false, search: "?hour=20&room=bath", keys: k.target });
    expect(game.state.get("clock")).toBe(8);
    expect(game.currentLevel.id).toBe("main");
    expect(k.count()).toBe(0);
  });

  it("start at ?hour= and in ?room=, ignoring nonsense", () => {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    new TimeOfDayFeature(game, { dev: true, search: "?hour=20.5&room=bath" });
    expect(game.state.get("clock")).toBe(20.5);
    expect(game.currentLevel.id).toBe("bath");

    const other = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    new TimeOfDayFeature(other, { dev: true, search: "?hour=abc&room=nowhere" });
    expect(other.state.get("clock")).toBe(8);
    expect(other.currentLevel.id).toBe("main");
    new TimeOfDayFeature(other, { dev: true, search: "?hour=" });
    expect(other.state.get("clock")).toBe(8);
  });

  it("wraps an hour outside the day instead of failing", () => {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    new TimeOfDayFeature(game, { dev: true, search: `?${TIME_DEV.hourParam}=25` });
    expect(game.state.get("clock")).toBe(1);
  });

  it("move the clock an hour with the bracket keys, and not while a task or dialog has the keyboard", () => {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    const k = keys();
    new TimeOfDayFeature(game, { dev: true, keys: k.target });
    k.press(TIME_DEV.forwardKey);
    expect(game.state.get("clock")).toBe(9);
    k.press(TIME_DEV.backKey);
    k.press(TIME_DEV.backKey);
    expect(game.state.get("clock")).toBe(7);
    k.press(TIME_DEV.forwardKey, true);
    expect(game.state.get("clock")).toBe(7);
    game.openDialog(say("Hello."));
    k.press(TIME_DEV.forwardKey);
    expect(game.state.get("clock")).toBe(7);
  });

  it("wrap past midnight with the keys", () => {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    const k = keys();
    new TimeOfDayFeature(game, { dev: true, keys: k.target });
    setHour(game, 23.5);
    k.press(TIME_DEV.forwardKey);
    expect(game.state.get("clock")).toBeCloseTo(0.5, 5);
  });
});
