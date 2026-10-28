import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { APARTMENT } from "../apartment";
import { DIALOG, ENERGY, MOOD, PARTICLES, SLEEP, TILE, WALK } from "../config";
import type { Direction } from "../direction";
import { attachFeatures } from "../features";
import { Game } from "../game";
import { choice, menu, say } from "../dialog";
import type { Interactable } from "../interactable";
import type { Level } from "../level";
import { parseTileMap } from "../tilemap";
import { boundsOf } from "../world";
import { ParticlesFeature, attachParticles, type ParticlesOptions } from "./feature";
import { seeded } from "./seeded";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const hold = (dir: Direction): Controls => ({ ...NO_INPUT, dir, dirPressed: dir });

function setup(options: ParticlesOptions = {}, room: keyof typeof APARTMENT.rooms = "main") {
  const game = new Game(APARTMENT.rooms[room], { rooms: APARTMENT.rooms, random: seeded(11) });
  const feature = attachParticles(game, { random: seeded(21), ...options });
  return { game, feature };
}
const run = (game: Game, seconds: number, controls: Controls = NO_INPUT) => {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) game.update(dt, controls);
};
const set = (game: Game, id: string, value: number) => game.state.applyEffects([{ var: id, set: value }]);
const kinds = (f: ParticlesFeature) => new Set([...f.pool.particles()].map((p) => p.shape));
// How many particles were made, however many are still alive.
function countSpawns(f: ParticlesFeature) {
  const spawn = f.pool.spawn.bind(f.pool);
  const made = { n: 0 };
  f.pool.spawn = (s) => {
    made.n++;
    spawn(s);
  };
  return made;
}
const item = (game: Game, id: string) => {
  const found = game.currentLevel.interactables.find((i) => i.id === id);
  if (!found) throw new Error(id);
  return found;
};
const award = (over: object = {}) => ({
  points: 10, basePoints: 10, repeatFactor: 1, multiplier: 1, chain: 1, qualityFactor: 1, timeFactor: 1, ...over,
});

describe("the layer", () => {
  it("is a world layer only: nothing in the HUD pass, so full-screen views and dialogs are never covered", () => {
    const { feature } = setup();
    expect(feature.drawWorld).toBeTypeOf("function");
    expect((feature as unknown as { drawHud?: unknown }).drawHud).toBeUndefined();
  });

  it("is added after the time of day in features.ts, so it draws over the tint", () => {
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms });
    attachFeatures(game);
    const names = (game as unknown as { layers: { name?: string }[] }).layers.map((l) => l.name);
    expect(names).toContain("particles");
    expect(names.indexOf("particles")).toBeGreaterThan(names.indexOf("time-of-day"));
  });
});

describe("walking", () => {
  it("kicks up dust at the feet on a step on wood, behind the walker", () => {
    const { game, feature } = setup();
    game.player.placeAt(9, 4, "left");
    run(game, WALK.stepTime * 2.5, hold("left"));
    expect(feature.pool.count).toBeGreaterThan(0);
    for (const p of feature.pool.particles()) {
      expect(p.y).toBeGreaterThan(4 * TILE); // at foot height, in this row
      expect(p.y).toBeLessThan(5 * TILE + 8);
    }
  });

  it("puffs on stone in the kitchen and not at all on the bath's tile", () => {
    const kitchen = setup({}, "kitchen");
    kitchen.game.player.placeAt(10, 2, "left");
    run(kitchen.game, WALK.stepTime * 2.5, hold("left"));
    expect(kitchen.feature.pool.count).toBeGreaterThan(0);

    const bath = setup({}, "bath");
    bath.game.player.placeAt(6, 3, "left");
    run(bath.game, WALK.stepTime * 2.5, hold("left"));
    expect(bath.game.player.col).toBeLessThan(6); // it did walk, and did not reach the tub
    expect(bath.feature.pool.count).toBe(0);
  });

  it("makes no dust when tired and shuffling", () => {
    const { game, feature } = setup();
    set(game, "energy", ENERGY.lowBelow - 5);
    game.player.placeAt(9, 4, "left");
    run(game, WALK.stepTime * ENERGY.tiredStepFactor * 3 + 0.2, hold("left"));
    expect(game.player.col).toBeLessThan(9);
    expect(feature.pool.count).toBe(0);
  });

  it("makes a bump puff once for one push against a wall, however long the key is held", () => {
    const { game, feature } = setup();
    // Straight up the lane west of the bed to the wall.
    game.player.placeAt(11, 1, "up");
    const made = countSpawns(feature);
    run(game, 3, hold("up"));
    expect(game.player.row).toBe(1);
    const [lo, hi] = PARTICLES.bump.count;
    expect(made.n).toBeGreaterThanOrEqual(lo);
    expect(made.n).toBeLessThanOrEqual(hi);
    // Let go and push again: a second puff.
    run(game, 0.2);
    run(game, 0.5, hold("up"));
    expect(made.n).toBeGreaterThanOrEqual(lo * 2);
    expect(made.n).toBeLessThanOrEqual(hi * 2);
  });

  it("clears when the player changes room, and makes no dust at the doorway for the old room", () => {
    const { game, feature } = setup();
    game.player.placeAt(9, 4, "left");
    run(game, WALK.stepTime * 2.5, hold("left"));
    expect(feature.pool.count).toBeGreaterThan(0);
    game.events.emit("room", { id: "kitchen", level: APARTMENT.rooms.kitchen });
    expect(feature.pool.count).toBe(0);
  });
});

describe("task completion", () => {
  it("bursts from the task's zone, bigger and more colorful for a longer chain", () => {
    const { game, feature } = setup();
    const t = item(game, "coffee");
    const zone = boundsOf(t.zones);
    game.events.emit("taskComplete", { item: t, award: award() });
    const one = [...feature.pool.particles()];
    for (const p of one) {
      expect(p.x).toBeGreaterThanOrEqual(zone.x);
      expect(p.x).toBeLessThanOrEqual(zone.x + zone.w);
      expect(p.y).toBeGreaterThanOrEqual(zone.y);
      expect(p.y).toBeLessThanOrEqual(zone.y + zone.h);
    }
    feature.pool.clear();
    game.events.emit("taskComplete", { item: t, award: award({ chain: 4, multiplier: 2.5 }) });
    const long = [...feature.pool.particles()];
    expect(long.length).toBeGreaterThan(one.length);
    expect(new Set(long.map((p) => p.color)).size).toBeGreaterThan(new Set(one.map((p) => p.color)).size);
    expect(new Set(long.map((p) => p.color)).size).toBeGreaterThanOrEqual(4);
  });

  it("makes a smaller, duller burst for a repeat", () => {
    const { game, feature } = setup();
    const t = item(game, "coffee");
    game.events.emit("taskComplete", { item: t, award: award() });
    const first = feature.pool.count;
    feature.pool.clear();
    game.events.emit("taskComplete", { item: t, award: award({ repeatFactor: 0.5 }) });
    expect(feature.pool.count).toBeLessThan(first);
    expect([...feature.pool.particles()].every((p) => ["mist", "taupe"].includes(p.color))).toBe(true);
  });

  it("makes nothing when a task is cancelled or blocked", () => {
    const { game, feature } = setup();
    const t = item(game, "coffee");
    game.events.emit("taskCancelled", { item: t });
    game.events.emit("taskBlocked", { item: t, reason: "cooldown" });
    game.events.emit("taskBlocked", { item: t, reason: "requirement", message: "NOPE" });
    game.events.emit("taskStart", { item: t });
    expect(feature.pool.count).toBe(0);
  });

  it("sparkles at the popup only when the good hour applies", () => {
    const { game, feature } = setup();
    const t = item(game, "coffee");
    game.events.emit("taskComplete", { item: t, award: award() });
    expect(kinds(feature).has("sparkle")).toBe(false);
    feature.pool.clear();
    game.events.emit("taskComplete", { item: t, award: award({ timeFactor: 1.5 }) });
    expect(kinds(feature).has("sparkle")).toBe(true);
  });

  it("makes a real completion burst in a real game", () => {
    const { game, feature } = setup();
    game.player.placeAt(2, 3, "up");
    game.update(dt, press);
    run(game, item(game, "coffee").duration + 0.5);
    expect(game.state.get("mug")).toBe(1);
    expect(feature.pool.count).toBeGreaterThan(0);
  });
});

describe("task effects", () => {
  it("steams over the table while the coffee is made, and stops after", () => {
    const { game, feature } = setup();
    game.player.placeAt(2, 3, "up");
    run(game, 0.05);
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe("coffee");
    const zone = boundsOf(item(game, "coffee").zones);
    run(game, 1.5);
    const steam = [...feature.pool.particles()].filter((p) => p.shape === "dot2");
    expect(steam.length).toBeGreaterThan(2);
    for (const p of steam) {
      expect(p.x).toBeGreaterThan(zone.x);
      expect(p.x).toBeLessThan(zone.x + zone.w);
      expect(p.y).toBeLessThan(zone.y + zone.h);
    }
  });

  it("steams over the mug while it waits, and only while the player is free", () => {
    const { game, feature } = setup();
    set(game, "mug", 1);
    game.player.placeAt(6, 4, "down");
    const made = countSpawns(feature);
    run(game, 3);
    expect(made.n).toBeGreaterThan(3);
    // Over the hands: right at the player's tile.
    for (const p of feature.pool.particles()) {
      expect(Math.abs(p.x - (game.player.x + 8))).toBeLessThan(16);
    }
    set(game, "mug", 0);
    const before = made.n;
    run(game, 2);
    expect(made.n).toBe(before);
  });

  it("rises as bubbles from the sink while doing the dishes", () => {
    const { game, feature } = setup({}, "kitchen");
    game.player.placeAt(1, 2, "down");
    run(game, 0.05);
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe("dishes");
    const made = countSpawns(feature);
    run(game, 2);
    expect(made.n).toBeGreaterThan(3);
    const zone = boundsOf(item(game, "dishes").zones);
    for (const p of feature.pool.particles()) {
      expect(p.x).toBeGreaterThan(zone.x - 4);
      expect(p.x).toBeLessThan(zone.x + zone.w + 4);
      expect(["sky", "teal"]).toContain(p.color);
    }
  });

  it("drifts a z from the bed while sleeping and from the sofa on a nap", () => {
    const sleep = setup();
    set(sleep.game, "energy", 30);
    set(sleep.game, "bedMade", 1);
    sleep.game.player.placeAt(11, 5, "right");
    run(sleep.game, 0.05);
    sleep.game.update(dt, press);
    expect(sleep.game.interaction.active?.item.id).toBe("sleep");
    // The z comes only once asleep (after the 2 s of falling asleep): none before.
    run(sleep.game, 1.5);
    expect([...sleep.feature.pool.particles()].some((p) => p.shape === "z")).toBe(false);
    run(sleep.game, 2);
    const zs = [...sleep.feature.pool.particles()].filter((p) => p.shape === "z");
    expect(zs.length).toBeGreaterThan(0);
    for (const p of zs) {
      expect(p.x).toBeGreaterThan(192); // over the bed (x 192 to 272)
      expect(p.x).toBeLessThan(272 + 16);
    }

    const nap = setup();
    set(nap.game, "energy", 30);
    // Keep the sofa's other tasks out of the way, as the first startable one wins.
    for (const id of ["doomscroll", "contemplate", "work-sofa"]) {
      const items = (nap.game.interaction as unknown as { items: Interactable[] }).items;
      for (const t of items.filter((i) => i.id === id)) t.requires = [{ var: "dishes", min: 99, reason: "NO" }];
    }
    nap.game.player.placeAt(6, 4, "down");
    run(nap.game, 0.05);
    nap.game.update(dt, press);
    expect(nap.game.interaction.active?.item.id).toBe("nap");
    run(nap.game, 2);
    expect([...nap.feature.pool.particles()].some((p) => p.shape === "z")).toBe(true);
  });

  it("makes the z only in the asleep phase: none while falling asleep or waking, and the gap is the one in SLEEP", () => {
    const { game, feature } = setup();
    set(game, "energy", 30);
    set(game, "bedMade", 1);
    game.player.placeAt(11, 5, "right");
    run(game, 0.05);
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe("sleep");
    const made = countSpawns(feature);
    const stamps: number[] = [];
    const spawn = feature.pool.spawn.bind(feature.pool);
    let t = 0;
    feature.pool.spawn = (s) => {
      if (s.kind === PARTICLES.kinds.z) stamps.push(t);
      spawn(s);
    };
    for (; t < 9.2 && game.interaction.busy; t += dt) game.update(dt, NO_INPUT);
    expect(made.n).toBeGreaterThan(0);
    expect(stamps.length).toBeGreaterThanOrEqual(2);
    for (const s of stamps) {
      expect(s).toBeGreaterThanOrEqual(2 - dt);
      expect(s).toBeLessThanOrEqual(7 + dt);
    }
    // The first one comes the moment it is asleep, the rest 1.4 to 2.2 s apart.
    expect(stamps[0]).toBeLessThan(2.1);
    for (let i = 1; i < stamps.length; i++) {
      expect(stamps[i] - stamps[i - 1]).toBeGreaterThanOrEqual(SLEEP.sleep.zEvery[0] - 2 * dt);
      expect(stamps[i] - stamps[i - 1]).toBeLessThanOrEqual(SLEEP.sleep.zEvery[1] + 2 * dt);
    }
  });

  it("an emitter with no phases goes on as long as the task runs (the guitar's notes)", () => {
    expect(PARTICLES.taskEmitters.guitar.every((d) => d.phases === undefined)).toBe(true);
    expect(PARTICLES.taskEmitters.sleep[0].phases).toEqual(["asleep"]);
    expect(PARTICLES.taskEmitters.nap[0].phases).toEqual(["asleep"]);
  });

  it("sends notes from the guitar while it is played", () => {
    const { game, feature } = setup();
    game.player.placeAt(1, 5, "down");
    run(game, 0.05);
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe("guitar");
    run(game, 3);
    expect([...feature.pool.particles()].some((p) => p.shape === "note")).toBe(true);
  });

  it("sends a note from the record player every second or two, only while a record plays", () => {
    let playing = false;
    const { game, feature } = setup({ musicPlaying: () => playing });
    game.player.placeAt(9, 4, "right");
    const made = countSpawns(feature);
    run(game, 10);
    expect(made.n).toBe(0); // nothing playing
    playing = true;
    run(game, 10);
    expect(made.n).toBeGreaterThanOrEqual(5); // 10 seconds, one every 1 to 2
    expect(made.n).toBeLessThanOrEqual(11);
    const stand = game.currentLevel.pieces.find((p) => p.sprite === "record-stand")!;
    for (const p of feature.pool.particles()) {
      expect(p.x).toBeGreaterThan(stand.bounds.x - 8);
      expect(p.x).toBeLessThan(stand.bounds.x + 40);
    }
    playing = false;
    const before = made.n;
    run(game, 5);
    expect(made.n).toBe(before);
  });

  it("makes no notes from the record player in a room that has none", () => {
    const { game, feature } = setup({ musicPlaying: () => true }, "kitchen");
    const made = countSpawns(feature);
    run(game, 5);
    expect(made.n).toBe(0);
  });

  it("never makes a task effect for a task that is not running or has none", () => {
    const { game, feature } = setup();
    game.player.placeAt(6, 4, "down");
    run(game, 5);
    expect(feature.pool.count).toBe(0);
  });
});

describe("low mood", () => {
  it("sighs once, as mood crosses below the line, and not while it stays low", () => {
    const { game, feature } = setup();
    set(game, "mood", MOOD.lowBelow + 5);
    expect(feature.pool.count).toBe(0);
    set(game, "mood", MOOD.lowBelow - 1);
    const n = feature.pool.count;
    expect(n).toBeGreaterThan(0);
    set(game, "mood", 5);
    set(game, "mood", 0);
    expect(feature.pool.count).toBe(n);
    // Up again, then down again: another sigh.
    set(game, "mood", 60);
    set(game, "mood", 10);
    expect(feature.pool.count).toBeGreaterThan(n);
  });
});

describe("pausing", () => {
  it("stands still while a dialog is open (game time), and carries on after", () => {
    const { game, feature } = setup();
    game.events.emit("taskComplete", { item: item(game, "coffee"), award: award({ chain: 3 }) });
    const before = [...feature.pool.particles()].map((p) => [p.x, p.y, p.age]);
    game.openDialog(menu("Pick", [choice("A", say("ok")), choice("B")]));
    expect(game.dialogOpen).toBe(true);
    run(game, 3);
    expect(DIALOG.pauseClock).toBe(true);
    expect([...feature.pool.particles()].map((p) => [p.x, p.y, p.age])).toEqual(before);
  });

  it("stands still while something else has the controls and no task is running", () => {
    const { game, feature } = setup();
    game.events.emit("taskComplete", { item: item(game, "coffee"), award: award() });
    const release = game.lockInput();
    const n = [...feature.pool.particles()].map((p) => p.age);
    run(game, 1);
    expect([...feature.pool.particles()].map((p) => p.age)).toEqual(n);
    release();
    run(game, 0.1);
    expect(Math.max(...[...feature.pool.particles()].map((p) => p.age))).toBeGreaterThan(Math.max(...n));
  });

  it("empties on its own: everything made is gone a few seconds later", () => {
    const { game, feature } = setup();
    game.events.emit("taskComplete", { item: item(game, "coffee"), award: award({ chain: 9, timeFactor: 1.5 }) });
    expect(feature.pool.count).toBeGreaterThan(0);
    run(game, 3);
    expect(feature.pool.count).toBe(0);
  });
});

describe("the budget", () => {
  it("never holds more than the fixed number, however many effects fire", () => {
    const { game, feature } = setup({ capacity: 60 });
    for (let i = 0; i < 300; i++) {
      game.events.emit("taskComplete", { item: item(game, "coffee"), award: award({ chain: 9, timeFactor: 1.5 }) });
      expect(feature.pool.count).toBeLessThanOrEqual(60);
    }
    expect(feature.pool.count).toBe(60);
  });

  it("uses the config's budget by default", () => {
    const { feature } = setup();
    expect(feature.pool.capacity).toBe(PARTICLES.budget);
  });
});

describe("drawing in a game", () => {
  afterEach(() => vi.unstubAllGlobals());

  // A canvas that records every call, with what the fill style was.
  function recorder() {
    const calls: { op: string; args: unknown[]; style: unknown }[] = [];
    const state = { fillStyle: "" as unknown, globalAlpha: 1 };
    const ctx = new Proxy(state, {
      get: (t, name: string) =>
        name in t ? (t as Record<string, unknown>)[name] : (...args: unknown[]) => calls.push({ op: name, args, style: t.fillStyle }),
      set: (t, name: string, v) => {
        (t as Record<string, unknown>)[name] = v;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }

  // A tiny level, so the only 1 by 1 fills are particles.
  const tiny: Level = {
    ...parseTileMap(
      ["##################", "#................#", "#.....@..........#", "#................#", "##################"],
      {},
      { tasks: [] },
    ),
    facing: "right",
  };

  const particleFills = (calls: ReturnType<typeof recorder>["calls"]) =>
    calls.filter((c) => c.op === "fillRect" && c.args[2] === 1 && c.args[3] === 1);

  it("draws inside the camera transform, after the player, and draws nothing once expired", () => {
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => recorder().ctx }) });
    const game = new Game(tiny, { random: seeded(1) });
    const feature = attachParticles(game, { random: seeded(2) });
    game.events.emit("taskComplete", { item: { id: "x", name: "x", prompt: "x", duration: 0, points: 1, zones: [{ x: 96, y: 32, w: 16, h: 16 }] }, award: award({ chain: 4 }) });
    expect(feature.pool.count).toBeGreaterThan(0);

    const live = recorder();
    game.render(live.ctx, 1);
    const cam = game.camera.position(1);
    const translate = live.calls.findIndex((c) => c.op === "translate" && c.args[0] === -cam.x && c.args[1] === -cam.y);
    const restore = live.calls.findIndex((c, i) => i > translate && c.op === "restore");
    expect(translate).toBeGreaterThanOrEqual(0);
    const dots = particleFills(live.calls);
    expect(dots.length).toBeGreaterThan(0);
    for (const dot of dots) {
      const at = live.calls.indexOf(dot);
      expect(at).toBeGreaterThan(translate);
      expect(at).toBeLessThan(restore);
      expect(dot.args.every((a) => Number.isInteger(a))).toBe(true);
    }

    run(game, 5);
    expect(feature.pool.count).toBe(0);
    const later = recorder();
    game.render(later.ctx, 1);
    expect(particleFills(later.calls)).toHaveLength(0);
  });

  it("keeps the canvas balanced: as many restores as saves, and the alpha back to 1", () => {
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => recorder().ctx }) });
    const game = new Game(tiny, { random: seeded(1) });
    const feature = attachParticles(game, { random: seeded(2) });
    game.events.emit("taskComplete", { item: { id: "x", name: "x", prompt: "x", duration: 0, points: 1, zones: [{ x: 96, y: 32, w: 16, h: 16 }] }, award: award({ chain: 4, timeFactor: 1.5 }) });
    run(game, 0.5);
    const { ctx, calls } = recorder();
    (ctx as unknown as { globalAlpha: number }).globalAlpha = 1;
    feature.drawWorld(ctx);
    expect(calls.filter((c) => c.op === "save").length).toBe(calls.filter((c) => c.op === "restore").length);
    expect((ctx as unknown as { globalAlpha: number }).globalAlpha).toBe(1);
    // No clipping, shadows or filters (the canvas reset between layers does not cover them).
    expect(calls.some((c) => ["clip", "createPattern"].includes(c.op))).toBe(false);
  });
});
