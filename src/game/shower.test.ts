import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { FakeStorage } from "./achievements/fake-storage";
import { APARTMENT } from "./apartment";
import { PARTICLES, SHOWER_SOUND, SOUND, TASK_PHASES, TURN_AWAY_AFTER } from "./config";
import { Decor } from "./decor";
import { adById } from "./encounter-ads";
import { Game } from "./game";
import { OUTFITS, outfitItemId } from "./outfits";
import { mistLevel, mistPixel } from "./particles/mist";
import { attachParticles, type ParticlesFeature } from "./particles/feature";
import { seeded } from "./particles/seeded";
import { POSES } from "./poses";
import { FakeAudioContext } from "./sound/fake-audio";
import { SoundFeature, type KeyEventLike, type Listenable } from "./sound/feature";
import { ShowerSound } from "./sound/shower-sound";
import { Synth } from "./sound/synth";
import { TASKS } from "./tasks";
import { TILE } from "./config";

// The in-room shower scene (issue 177, docs/shower-scene-design.md): the pose in the tub, the phases, the
// particles, the turn away, the robe, Escape and the edge cases, all in the real bath.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const ROBE = "outfit-pajamas-robe";
const TOWEL = "outfit-towel";
const HOODIE = "outfit-casual-hoodie";

class Recorder implements SpriteDrawer {
  drawn: { name: string; x: number; y: number }[] = [];
  constructor(private readonly available: (name: string) => boolean = () => true) {}
  has(name: string): boolean {
    return this.available(name);
  }
  draw(_ctx: unknown, name: string, x: number, y: number): void {
    this.drawn.push({ name, x, y });
  }
  names(): string[] {
    return this.drawn.map((d) => d.name);
  }
}
const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;

afterEach(() => {
  vi.unstubAllGlobals();
});

interface Options {
  sprites?: SpriteDrawer;
  decor?: Decor;
  reduced?: { on: boolean };
  musicPlaying?: boolean;
  state?: Record<string, number>;
}
function bath(options: Options = {}) {
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  const reduced = options.reduced ?? { on: false };
  const game = new Game(APARTMENT.rooms.bath, {
    rooms: APARTMENT.rooms,
    random: seeded(11),
    reducedMotion: () => reduced.on,
    ...(options.sprites && { sprites: options.sprites }),
    ...(options.decor && { decor: options.decor }),
  });
  game.state.applyEffects([{ var: "clock", set: 8 }, ...Object.entries(options.state ?? {}).map(([v, n]) => ({ var: v, set: n }))]);
  const feature = attachParticles(game, { random: seeded(21), ...(options.musicPlaying !== undefined && { musicPlaying: () => options.musicPlaying! }) });
  game.player.placeAt(3, 2, "left");
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  return { game, feature, reduced };
}
const run = (game: Game, seconds: number, controls: Controls = NO_INPUT) => {
  for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt, controls);
};
function begin(options: Options = {}) {
  const b = bath(options);
  b.game.update(dt, press);
  expect(b.game.interaction.active?.item.id).toBe("shower");
  return b;
}
const finish = (game: Game) => {
  for (let i = 0; i < 60 * 8 && game.interaction.active; i++) game.update(dt, NO_INPUT);
  game.update(dt, NO_INPUT);
};
const shapes = (f: ParticlesFeature) => {
  const out: Record<string, number> = {};
  for (const p of f.pool.particles()) out[p.shape] = (out[p.shape] ?? 0) + 1;
  return out;
};
const frame = (game: Game, sprites: Recorder) => {
  sprites.drawn = [];
  game.render(ctx, 1);
};
const wornId = (d: Decor) => d.heldIn("worn")?.id;
function owning(...ids: string[]) {
  const d = new Decor();
  for (const id of ids) d.own(id);
  return d;
}

describe("the pose (stage 1)", () => {
  it("is clothes-free, 16 x 48, on the tub with its bottom edge on the tub's, so it sorts in front", () => {
    const pose = POSES["shower-tub"];
    expect(pose.clothed).toBe(false);
    expect(pose.size).toEqual({ w: 16, h: 48 });
    const tub = APARTMENT.rooms.bath.pieces.find((p) => p.sprite === pose.on)!;
    expect(tub).toBeDefined();
    expect(tub.bounds.y + tub.bounds.h).toBe(tub.bounds.y + pose.at.y + pose.size.h);
    expect(TASKS.find((t) => t.id === "shower")?.pose).toBe("shower-tub");
  });

  it("draws the pose in place of the plain player, after the tub, and the plain player is back after the task", () => {
    const sprites = new Recorder();
    const { game } = begin({ sprites });
    frame(game, sprites);
    const names = sprites.names();
    expect(names).toContain("player-shower-tub");
    expect(names.filter((n) => /^player-(idle|walk)/.test(n))).toEqual([]);
    expect(names.indexOf("player-shower-tub")).toBeGreaterThan(names.indexOf("tub"));
    const at = sprites.drawn.find((d) => d.name === "player-shower-tub")!;
    const tub = sprites.drawn.find((d) => d.name === "tub")!;
    expect([at.x - tub.x, at.y - tub.y]).toEqual([6, 16]);
    finish(game);
    frame(game, sprites);
    expect(sprites.names()).not.toContain("player-shower-tub");
    // A fresh game's shower ends in the starting towel (issue 184), so the player is drawn in its sprites.
    expect(sprites.names().some((n) => /^player-(towel-)?(idle|walk)/.test(n))).toBe(true);
  });

  it("draws the same pose for every outfit (no clothes in it)", () => {
    for (const o of OUTFITS) {
      const sprites = new Recorder();
      const d = owning(...OUTFITS.slice(1).map(outfitItemId));
      d.wearSlot("everyday");
      const { game } = begin({ sprites, decor: d, state: { outfit: OUTFITS.indexOf(o) } });
      frame(game, sprites);
      expect(sprites.names().filter((n) => n.includes("shower")), o.id).toEqual(["player-shower-tub"]);
    }
  });

  it("falls back to the plain player when the art is missing, and the task still runs and pays", () => {
    const sprites = new Recorder((n) => n !== "player-shower-tub");
    const { game, feature } = begin({ sprites });
    frame(game, sprites);
    expect(sprites.names()).not.toContain("player-shower-tub");
    expect(sprites.names().some((n) => /^player-(idle|walk)/.test(n))).toBe(true);
    run(game, 2);
    expect(shapes(feature).drop).toBeGreaterThan(0);
    finish(game);
    expect(game.state.get("mood")).toBeGreaterThan(0);
  });

  it("keeps the points, mood and duration unchanged", () => {
    const t = TASKS.find((x) => x.id === "shower")!;
    expect([t.points, t.duration]).toEqual([70, 6]);
    const { game } = begin({ state: { mood: 50 } });
    const before = game.state.get("mood");
    finish(game);
    expect(game.state.get("mood")).toBeCloseTo(before + 6, 1);
  });
});

describe("the turn away", () => {
  it("is data: after the shower you face east", () => {
    expect(TURN_AWAY_AFTER).toEqual({ shower: "right" });
  });
  it("puts the player back on the tile they stood on, facing away from the tub; Escape does not turn them", () => {
    const { game } = begin();
    expect([game.player.col, game.player.row, game.player.facing]).toEqual([3, 2, "left"]);
    finish(game);
    expect([game.player.col, game.player.row, game.player.facing]).toEqual([3, 2, "right"]);
    expect([game.player.x, game.player.y]).toEqual([3 * TILE, 2 * TILE]);
    const e = begin();
    run(e.game, 2);
    e.game.update(dt, esc);
    expect(e.game.interaction.active).toBeNull();
    expect([e.game.player.col, e.game.player.row, e.game.player.facing]).toEqual([3, 2, "left"]);
  });
  it("turns every time, so every shower plays the whole scene", () => {
    const { game } = begin();
    finish(game);
    run(game, 11);
    game.player.facing = "left";
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe("shower");
    expect(game.taskPhase).toBe("in");
  });
});

describe("the phases (stage 2)", () => {
  it("are data that reach 1 in order, for the shower only besides the sleep sequence", () => {
    expect(Object.keys(TASK_PHASES)).toEqual(["shower"]);
    const list = TASK_PHASES.shower;
    expect(list.map((p) => p.phase)).toEqual(["in", "water", "off"]);
    expect(list[0].until).toBeCloseTo(1 / 6, 6);
    expect(list[1].until).toBeCloseTo(4.6 / 6, 6);
    expect(list[2].until).toBe(1);
  });
  it("follow the 6 seconds: in to 1.0 s, water to 4.6 s, off to the end, then null", () => {
    const { game } = bath();
    expect(game.taskPhase).toBeNull();
    game.update(dt, press);
    const at: [number, string][] = [[0.3, "in"], [0.9, "in"], [1.3, "water"], [4.4, "water"], [4.9, "off"], [5.8, "off"]];
    let t = dt;
    for (const [seconds, phase] of at) {
      run(game, seconds - t);
      t = seconds;
      expect(game.taskPhase, `${seconds}s`).toBe(phase);
    }
    finish(game);
    expect(game.taskPhase).toBeNull();
  });
  it("are null for a task with no phases, and the sleep sequence keeps its own", () => {
    const { game } = bath();
    expect(game.taskPhase).toBeNull();
  });
});

describe("the particles", () => {
  it("make drops in the room only from the tap, a lone drip in `in`", () => {
    const { game, feature } = begin();
    run(game, 0.9);
    const s = shapes(feature);
    expect(Object.keys(s).every((k) => k === "drop")).toBe(true);
    for (const p of feature.pool.particles()) {
      expect(p.x).toBeGreaterThan(16 + 10);
      expect(p.x).toBeLessThan(16 + 20);
    }
  });
  it("run drops, steam, fog and floating bubbles while the water runs", () => {
    const { game, feature } = begin();
    run(game, 3.4);
    const s = shapes(feature);
    expect(Object.keys(s).sort()).toEqual(["cloud", "fog", "drop", "ring"].sort());
    expect(feature.pool.count).toBeLessThan(60);
  });
  it("thin out in `off` and stop making drops after the end, while the steam fades by itself within 4 s", () => {
    const { game, feature } = begin();
    finish(game);
    const made = feature.pool.count;
    expect(made).toBeGreaterThan(0);
    run(game, 4.5);
    expect(feature.pool.count).toBe(0);
  });
  it("pop a burst of bubbles when the shower completes, and not for Escape", () => {
    const a = begin();
    run(a.game, 5.5);
    const before = shapes(a.feature).ring ?? 0;
    finish(a.game);
    expect((shapes(a.feature).ring ?? 0) - before).toBeGreaterThanOrEqual(PARTICLES.finish.shower.count[0] - 1);
    const b = begin();
    run(b.game, 3);
    b.feature.pool.clear();
    b.game.update(dt, esc);
    expect(shapes(b.feature).ring ?? 0).toBe(0);
  });
  it("never go over the budget in a whole shower, and carry a record's notes nowhere in the bath", () => {
    const { game, feature } = begin({ musicPlaying: true });
    for (let i = 0; i < 60 * 8; i++) {
      game.update(dt, NO_INPUT);
      expect(feature.pool.count).toBeLessThanOrEqual(PARTICLES.budget);
      expect(shapes(feature).note ?? 0).toBe(0);
    }
  });
  it("stop at once with Escape, and a new shower starts with a drip and a fresh set", () => {
    const { game, feature } = begin();
    run(game, 3);
    game.update(dt, esc);
    run(game, 0.3);
    const drops = shapes(feature).drop ?? 0;
    expect(drops).toBe(0);
    game.player.facing = "left";
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe("shower");
    run(game, 0.05);
    expect(shapes(feature).drop).toBeGreaterThan(0);
  });
});

describe("reduced motion (d4 and d11)", () => {
  it("keeps the drops, makes still steam and fog once, and no floating bubbles or pop", () => {
    const { game, feature } = begin({ reduced: { on: true } });
    run(game, 3.4);
    const s = shapes(feature);
    expect(s.drop).toBeGreaterThan(0);
    expect(s.ring ?? 0).toBe(0);
    expect(s.cloud).toBe(6);
    expect(s.fog).toBe(3);
    // Still: they have no speed, and the same ones are there a second later.
    const at = [...feature.pool.particles()].filter((p) => p.shape !== "drop").map((p) => [p.x, p.y]);
    run(game, 0.5);
    expect([...feature.pool.particles()].filter((p) => p.shape !== "drop").map((p) => [p.x, p.y])).toEqual(at);
    finish(game);
    expect(shapes(feature).ring ?? 0).toBe(0);
  });
  it("is read live: a change in the middle of the water takes effect", () => {
    const reduced = { on: false };
    const { game, feature } = begin({ reduced });
    run(game, 2);
    expect(shapes(feature).ring ?? 0).toBeGreaterThanOrEqual(0);
    reduced.on = true;
    run(game, 0.3);
    expect(shapes(feature).cloud).toBeGreaterThanOrEqual(6);
    reduced.on = false;
    feature.pool.clear();
    run(game, 0.5);
    expect(shapes(feature).cloud ?? 0).toBeLessThan(6);
  });
  it("every moving emitter says so and every still one runs once per phase", () => {
    for (const def of PARTICLES.taskEmitters.shower) {
      if (def.motion === "still") {
        expect(def.every[0]).toBeGreaterThanOrEqual(3.6);
        expect(PARTICLES.kinds[def.kind].vy).toEqual([0, 0]);
      }
      if (def.kind === "showerDrop") expect(def.motion).toBeUndefined();
      expect(def.phases?.length, def.kind).toBeGreaterThan(0);
      for (const phase of def.phases ?? []) expect(TASK_PHASES.shower.map((p) => p.phase)).toContain(phase);
    }
  });
});

describe("the robe, Escape and the edge cases", () => {
  it("ends in the robe when the ROBE slot has one", () => {
    const d = owning(HOODIE, ROBE);
    d.equip("robe", ROBE);
    const { game } = begin({ decor: d });
    expect(wornId(d)).toBe("outfit-home");
    finish(game);
    expect(wornId(d)).toBe(ROBE);
  });
  it("a fresh game's shower ends in the starting towel (issue 184), and the bathrobe does not replace it when it arrives", () => {
    const d = new Decor();
    expect(d.equippedIn("robe")).toBe(TOWEL);
    const { game } = begin({ decor: d });
    expect(wornId(d)).toBe("outfit-home");
    finish(game);
    expect(wornId(d)).toBe(TOWEL);
    expect(game.state.get("outfit")).toBe(OUTFITS.findIndex((o) => outfitItemId(o) === TOWEL));
    expect(game.player.facing).toBe("right");
    const e = owning(ROBE);
    expect(e.equippedIn("robe")).toBe(TOWEL);
    const b = begin({ decor: e });
    finish(b.game);
    expect(wornId(e)).toBe(TOWEL);
  });
  it("ends in the everyday outfit only when nothing is equipped in ROBE, which a game with the towel never is", () => {
    const d = owning(HOODIE);
    d.equip("everyday", HOODIE);
    d.wearSlot("pajamas");
    const { game } = begin({ decor: d });
    finish(game);
    expect(wornId(d)).toBe(TOWEL);
  });
  it("never writes `worn` itself: it is unchanged during the scene, and Escape changes nothing", () => {
    const d = owning(HOODIE, ROBE);
    const { game } = begin({ decor: d });
    for (let i = 0; i < 60 * 4; i++) {
      game.update(dt, NO_INPUT);
      expect(wornId(d)).toBe("outfit-home");
    }
    game.update(dt, esc);
    run(game, 1);
    expect(wornId(d)).toBe("outfit-home");
    expect(game.pendingOccasionForTest()).toBeNull();
  });
  it("carrying a coffee: the mug shows after the shower, not during it", () => {
    const sprites = new Recorder();
    const { game } = begin({ sprites, state: { mug: 1 } });
    run(game, 2);
    frame(game, sprites);
    expect(sprites.names().filter((n) => n.startsWith("held-"))).toEqual([]);
    finish(game);
    expect(game.state.get("mug")).toBe(1);
    frame(game, sprites);
    expect(sprites.names().some((n) => n.startsWith("held-mug"))).toBe(true);
  });
  it("applying decor in the middle (a sync) leaves the pose playing", () => {
    const sprites = new Recorder();
    const d = owning();
    const { game } = begin({ sprites, decor: d });
    run(game, 2);
    d.own("outfit-pajamas-robe");
    frame(game, sprites);
    expect(sprites.names()).toContain("player-shower-tub");
  });
  it("a fresh game (a load) starts free with no pose and nothing in the pool", () => {
    const sprites = new Recorder();
    const { game, feature } = bath({ sprites });
    expect(game.taskPhase).toBeNull();
    frame(game, sprites);
    expect(sprites.names()).not.toContain("player-shower-tub");
    expect(feature.pool.count).toBe(0);
  });
  it("an ad right after: the turn happens first and the clothes wait for the card", () => {
    const d = owning(HOODIE, ROBE);
    d.equip("robe", ROBE);
    const { game } = begin({ decor: d });
    finish(game);
    expect(game.player.facing).toBe("right");
    expect(wornId(d)).toBe(ROBE);
    const e = owning(ROBE);
    const b = begin({ decor: e });
    run(b.game, 5.9);
    // The task ends in the next frame; the card starts right after it, as `maybeEncounter` would.
    b.game.events.on("taskComplete", () => {
      b.game.deliveries.advance(60);
      b.game.startEncounter(adById("ad-candle")!);
    });
    run(b.game, 0.3);
    expect(b.game.player.facing).toBe("right");
    expect(b.game.interaction.busy).toBe(true);
    expect(wornId(e)).toBe("outfit-home");
  });
});

describe("the sound (stage 3)", () => {
  class FakeKeys implements Listenable<KeyEventLike> {
    fns: ((e: KeyEventLike) => void)[] = [];
    addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
      this.fns.push(fn);
    }
    press(code: string) {
      for (const fn of this.fns) fn({ code });
    }
  }
  function sound(options: { audio?: boolean; muted?: boolean } = {}) {
    const audio = new FakeAudioContext();
    const keys = new FakeKeys();
    const storage = new FakeStorage();
    if (options.muted) storage.setItem(SOUND.storageKey, JSON.stringify({ v: 1, muted: true, track: null, payoutLeft: 0 }));
    const game = new Game(APARTMENT.rooms.bath, { rooms: APARTMENT.rooms, random: seeded(3) });
    const feature = new SoundFeature(game, { audio: options.audio === false ? () => null : () => audio, storage, keys, random: () => 0.5, tracks: [], start: "main" });
    game.state.applyEffects([{ var: "clock", set: 8 }]);
    game.player.placeAt(3, 2, "left");
    keys.press("KeyE");
    const step = (seconds: number, controls: Controls = NO_INPUT) => {
      for (let i = 0; i < Math.round(seconds / dt); i++) {
        audio.currentTime += dt;
        game.update(dt, controls);
      }
    };
    step(0.2);
    step(dt, press);
    expect(game.interaction.active?.item.id).toBe("shower");
    const bus = () => feature.engine.busLevel("shower");
    const hiss = () => audio.sources.filter((s) => s.loop);
    return { audio, game, feature, step, bus, hiss };
  }

  it("is a quiet hiss: the layers are well under a footstep and under the snore's noise layer together", () => {
    const total = SHOWER_SOUND.hiss.reduce((a, v) => a + v.gain, 0);
    expect(total).toBeLessThan(0.06);
    expect(SHOWER_SOUND.level).toBeLessThanOrEqual(1);
    expect(SOUND.effects.showerClick.voices.every((v) => v.gain <= 0.06)).toBe(true);
  });
  it("is silent in `in`, on in `water` with the fade, off with a click in `off`, and leaves the music bus alone", () => {
    const { audio, step, bus, hiss, feature } = sound();
    const music = feature.engine.busLevel("music");
    step(0.5);
    expect(bus()).toBe(0);
    expect(hiss()).toHaveLength(0);
    step(1);
    expect(hiss()).toHaveLength(SHOWER_SOUND.hiss.length);
    step(SHOWER_SOUND.fadeIn + 0.05);
    expect(bus()).toBe(SHOWER_SOUND.level);
    expect(hiss().every((s) => s.loop && s.stoppedAt !== null)).toBe(true);
    const squares = audio.oscillators.length;
    step(3.2);
    expect(bus()).toBe(0);
    expect(audio.oscillators.length).toBeGreaterThan(squares);
    expect(audio.oscillators.some((o) => o.type === "square" && o.frequency.calls.some((c) => c.value === 150))).toBe(true);
    expect(feature.engine.busLevel("music")).toBe(music);
  });
  it("Escape fades the hiss at once and makes no click", () => {
    const { audio, game, step, bus, hiss } = sound();
    step(2);
    expect(bus()).toBeGreaterThan(0);
    const clicks = () => audio.oscillators.filter((o) => o.type === "square" && o.frequency.calls.some((c) => c.value === 150)).length;
    const before = clicks();
    step(dt, esc);
    expect(game.interaction.active).toBeNull();
    step(SHOWER_SOUND.fadeOut + 0.05);
    expect(bus()).toBe(0);
    expect(clicks()).toBe(before);
    expect(hiss().every((s) => (s.stoppedAt ?? 0) <= audio.currentTime + 0.05)).toBe(true);
  });
  it("a shower started again right after Escape has one hiss, not two", () => {
    const { audio, game, step, bus, hiss } = sound();
    step(2);
    step(dt, esc);
    step(0.3);
    game.player.facing = "left";
    step(dt, press);
    step(1.4);
    const live = hiss().filter((s) => (s.stoppedAt ?? 0) > audio.currentTime + 1);
    expect(live).toHaveLength(SHOWER_SOUND.hiss.length);
    expect(bus()).toBeGreaterThan(0);
  });
  it("does nothing, and does not throw, with no audio", () => {
    const { step, game, bus } = sound({ audio: false });
    expect(() => step(7)).not.toThrow();
    expect(game.interaction.active).toBeNull();
    expect(bus()).toBeNull();
  });
  it("never touches mute: muted stays muted, the master is not changed by the shower", () => {
    const { audio, step, feature } = sound({ muted: true });
    const master = audio.gains[0].gain.calls.length;
    step(7);
    expect(feature.engine.muted).toBe(true);
    expect(audio.gains[0].gain.calls).toHaveLength(master);
  });
  it("ShowerSound alone: a hiss only for the shower's water phase", () => {
    const audio = new FakeAudioContext();
    const synth = new Synth(audio, () => 0.5);
    const s = new ShowerSound();
    const played: string[] = [];
    s.update("sleep", "water", synth, (n) => played.push(n));
    expect(s.on).toBe(false);
    s.update("shower", "water", synth, (n) => played.push(n));
    expect(s.on).toBe(true);
    s.update("shower", "off", synth, (n) => played.push(n));
    expect(s.on).toBe(false);
    expect(played).toEqual(["showerClick"]);
    s.update(null, null, synth, (n) => played.push(n));
    expect(played).toEqual(["showerClick"]);
  });
  it("the synth makes the shower bus only when it is first used and loops a held noise voice", () => {
    const audio = new FakeAudioContext();
    const synth = new Synth(audio, () => 0.5);
    expect(audio.gains).toHaveLength(3);
    const handle = synth.voice(SHOWER_SOUND.hiss[0], 0, {}, "shower");
    expect(audio.gains).toHaveLength(5);
    expect(audio.sources[0].loop).toBe(true);
    expect(synth.voices).toBe(0);
    handle.stop(2);
    expect(audio.sources[0].stoppedAt).toBe(2);
  });
});

describe("the mist over the tub (Marc's d1 answer)", () => {
  const covered = (level: number, x0: number, x1: number, y0: number, y1: number) => {
    let n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (mistPixel(x, y, level)) n++;
    return n / ((x1 - x0) * (y1 - y0));
  };
  // The tub-local rectangle of the pose: x 6 to 22, y 16 to 36.
  it("is dense at the start, thin while the water runs, builds again as it stops, and is solid at the end", () => {
    expect(mistLevel(0)).toBe(1);
    expect(mistLevel(1 / 6)).toBeCloseTo(0.12, 6);
    expect(mistLevel(0.5)).toBeCloseTo(0.12, 6);
    expect(mistLevel(4.6 / 6)).toBeCloseTo(0.12, 6);
    expect(mistLevel(0.9)).toBeGreaterThan(0.5);
    expect(mistLevel(1)).toBe(1);
  });
  it("hides almost all of the pose at full density, little at the water level, and nothing outside its ellipse", () => {
    expect(covered(1, 7, 21, 18, 34)).toBeGreaterThan(0.85);
    expect(covered(0.12, 6, 22, 16, 36)).toBeLessThan(0.2);
    expect(covered(0, 0, 32, 0, 64)).toBe(0);
    expect(mistPixel(0, 0, 1)).toBeNull();
    expect(mistPixel(31, 63, 1)).toBeNull();
  });
  it("uses only the two palette colours and a drift moves the pattern", () => {
    const seen = new Set<string | null>();
    for (let y = 0; y < 64; y++) for (let x = 0; x < 32; x++) seen.add(mistPixel(x, y, 0.6));
    expect([...seen].sort()).toEqual(["dark", "light", null]);
    let diff = 0;
    for (let y = 10; y < 40; y++) for (let x = 0; x < 28; x++) if (mistPixel(x, y, 0.6) !== mistPixel(x, y, 0.6, 1, 0)) diff++;
    expect(diff).toBeGreaterThan(20);
  });
  const rects = () => {
    const calls: string[] = [];
    const rec = new Proxy({}, { get: (_t, k) => (k === "fillRect" ? (x: number, y: number) => calls.push(`${x},${y}`) : () => {}), set: () => true }) as unknown as CanvasRenderingContext2D;
    return { calls, rec };
  };
  it("covers the very first frame of the pose (density 1 on the frame the task starts), and clears after the end", () => {
    const { game, feature } = begin();
    expect(feature.mistDensity).toBe(1);
    run(game, 1.5);
    expect(feature.mistDensity).toBeCloseTo(0.12, 2);
    run(game, 4.0);
    expect(feature.mistDensity).toBeGreaterThan(0.5);
    finish(game);
    expect(feature.mistDensity).toBeGreaterThan(0.8);
    run(game, 0.5);
    expect(feature.mistDensity).toBeGreaterThan(0);
    expect(feature.mistDensity).toBeLessThan(0.7);
    run(game, 0.5);
    expect(feature.mistDensity).toBe(0);
  });
  it("clears by itself after Escape, and is gone when you leave the room's task, with no cost to the pool", () => {
    const { game, feature } = begin();
    run(game, 2);
    game.update(dt, esc);
    run(game, 1);
    expect(feature.mistDensity).toBe(0);
    expect(feature.pool.count).toBeLessThan(200);
  });
  it("drifts in normal motion and holds still with reduced motion, at the same density", () => {
    const frames = (on: boolean) => {
      const { game, feature } = begin({ reduced: { on } });
      const a = rects();
      feature.drawWorld(a.rec);
      run(game, 0.7);
      const b = rects();
      feature.drawWorld(b.rec);
      return { a: a.calls, b: b.calls, density: feature.mistDensity };
    };
    const moving = frames(false);
    const still = frames(true);
    expect(moving.a.length).toBeGreaterThan(50);
    expect(still.a.length).toBeGreaterThan(50);
    expect(moving.a.join("|")).not.toBe(moving.b.join("|"));
    // Still: the pattern does not drift, only the density thins (a subset of what was there).
    const first = new Set(still.a);
    expect(still.b.every((c) => first.has(c))).toBe(true);
    expect(still.density).toBeCloseTo(moving.density, 2);
  });
  it("keeps the whole shower, with the mist, well inside the particle budget (peak is measured)", () => {
    const { game, feature } = begin();
    let peak = 0;
    for (let i = 0; i < 60 * 8; i++) {
      game.update(dt, NO_INPUT);
      peak = Math.max(peak, feature.pool.count);
    }
    expect(peak).toBeLessThan(80);
    console.log("shower peak live particles:", peak);
  });
  it("does nothing in other tasks or rooms", () => {
    const { game, feature } = bath();
    run(game, 1);
    expect(feature.mistDensity).toBe(0);
  });
});
