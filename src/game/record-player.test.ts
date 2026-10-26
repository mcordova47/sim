import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { AchievementsFeature } from "./achievements/feature";
import { FakeStorage } from "./achievements/fake-storage";
import { CLOCK, MAKE_TRACKS as M, MUSIC, SOUND } from "./config";
import { Game } from "./game";
import type { Interactable } from "./interactable";
import { DemoStore } from "./music/demo-store";
import { setDemoStore } from "./music/demo-library";
import { emptyGrid, placeNote } from "./music/demos";
import { RECORD_TASK, STOP_LABEL, TRACKS } from "./music/records";
import { FakeAudioContext } from "./sound/fake-audio";
import { SoundFeature, type KeyEventLike, type Listenable } from "./sound/feature";
import { SettingsStore } from "./sound/settings";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";

// The record player's payout rules (issue 068), run against the real Game, the real
// task and the real sound feature.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const down: Controls = { ...NO_INPUT, dirPressed: "down", dir: "down" };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const back: Controls = { ...NO_INPUT, cancelPressed: true };

type Task = Omit<Interactable, "zones">;
const real = (id: string): Task => TASKS.find((t) => t.id === id)!;

class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string) {
    for (const fn of this.fns) fn({ code });
  }
}

let store: DemoStore;
beforeEach(() => {
  store = new DemoStore(new FakeStorage(), M.storageKey, { reserved: () => [STOP_LABEL, ...TRACKS.map((t) => t.title)], log: () => {} });
  setDemoStore(store);
});
afterEach(() => setDemoStore(null));

function demo(title: string): void {
  const g = emptyGrid(title);
  placeNote(g, "melody", 0, 60, 1);
  expect(store.save(null, g).ok).toBe(true);
}

function setup(soundStorage: FakeStorage = new FakeStorage()) {
  const level = {
    ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [real(RECORD_TASK)] } }),
    facing: "right" as const,
  };
  const game = new Game(level, { random: () => 0.5 });
  const keys = new FakeKeys();
  const feature = new SoundFeature(game, { audio: () => new FakeAudioContext(), storage: soundStorage, keys, random: () => 0.5, demos: store, start: "main" });
  const ach = new AchievementsFeature(game, { storage: new FakeStorage(), keys: undefined, visibility: undefined });
  const events: string[] = [];
  game.events.on("taskComplete", () => events.push("complete"));
  game.events.on("taskCancelled", () => events.push("cancelled"));
  keys.press("KeyZ");
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  const item = game.interaction.nearby!;
  return { game, feature, ach, keys, events, item, soundStorage };
}
type S = ReturnType<typeof setup>;

const frames = (s: S, n: number, c: Controls = NO_INPUT) => {
  for (let i = 0; i < n; i++) s.game.update(dt, c);
};
const score = (s: S) => s.game.interaction.scoreboard.score;
const mood = (s: S) => s.game.state.get("mood");

// Opens the menu, picks the entries at `indexes` and reads the reply to its end.
function choose(s: S, ...indexes: number[]) {
  s.game.update(dt, press);
  expect(s.game.dialogOpen).toBe(true);
  for (const index of indexes) {
    for (let i = 0; i < index; i++) s.game.update(dt, down);
    s.game.update(dt, press);
  }
  frames(s, 40);
  for (let i = 0; i < 4 && s.game.dialogOpen; i++) {
    s.game.update(dt, press);
    frames(s, 6);
  }
  expect(s.game.dialogOpen).toBe(false);
  frames(s, 6);
}

const STOP = (hasDemos = false) => TRACKS.length + (hasDemos ? 1 : 0);
// Game minutes to seconds of play.
const secondsFor = (minutes: number) => minutes / CLOCK.minutesPerSecond + 0.5;

describe("the record player's payout", () => {
  it("has no cooldown: two choices in a row both open the menu", () => {
    const s = setup();
    expect(s.item.id).toBe(RECORD_TASK);
    expect(real(RECORD_TASK).cooldown).toBe(0);
    choose(s, 0);
    expect(s.game.interaction.cooldownRemaining(s.item)).toBe(0);
    s.game.update(dt, press);
    expect(s.game.dialogOpen).toBe(true);
  });

  it("pays points and mood for starting a record when nothing was playing", () => {
    const s = setup();
    const m = mood(s);
    choose(s, 0);
    expect(s.feature.track?.id).toBe(TRACKS[0].id);
    expect(score(s)).toBeGreaterThan(0);
    expect(mood(s)).toBeGreaterThanOrEqual(m + 4);
    expect(s.events).toEqual(["complete"]);
  });

  it("pays for a different record after the window, and not inside it", () => {
    const s = setup();
    choose(s, 0);
    const first = score(s);
    // Inside the window: switches, silently.
    choose(s, 1);
    expect(s.feature.track?.id).toBe(TRACKS[1].id);
    expect(score(s)).toBe(first);
    expect(s.events).toEqual(["complete"]);
    // Past the window: a change pays again.
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    choose(s, 2);
    expect(s.feature.track?.id).toBe(TRACKS[2].id);
    expect(score(s)).toBeGreaterThan(first);
    expect(s.events).toEqual(["complete", "complete"]);
  });

  it("does not pay for the record already playing, and does not touch mood or cooldown", () => {
    const s = setup();
    choose(s, 0);
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    const [sc, m] = [score(s), mood(s)];
    choose(s, 0);
    expect(score(s)).toBe(sc);
    expect(mood(s)).toBeLessThanOrEqual(m + 1); // only the slow lift
    expect(s.feature.track?.id).toBe(TRACKS[0].id);
    expect(s.events).toEqual(["complete"]);
    expect(s.game.interaction.cooldownRemaining(s.item)).toBe(0);
  });

  it("does not pay for Stop the music, and it stops", () => {
    const s = setup();
    choose(s, 0);
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    const sc = score(s);
    choose(s, STOP());
    expect(s.feature.track).toBeNull();
    expect(s.feature.engine.music.track).toBeNull();
    expect(score(s)).toBe(sc);
    expect(s.events).toEqual(["complete"]);
    // Stop with nothing playing is also just quiet.
    choose(s, STOP());
    expect(score(s)).toBe(sc);
    expect(s.events).toEqual(["complete"]);
  });

  it("stopping does not start the payout window, and the next record after it pays", () => {
    const s = setup();
    choose(s, 0);
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    choose(s, STOP());
    const sc = score(s);
    choose(s, 1);
    expect(score(s)).toBeGreaterThan(sc);
  });

  it("backing out, in the menu or on the reply, is quiet: no payout, no change, no cancel", () => {
    const s = setup();
    choose(s, 0);
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    const [sc, m] = [score(s), mood(s)];
    // Escape in the menu.
    s.game.update(dt, press);
    s.game.update(dt, esc);
    frames(s, 4);
    expect(s.game.dialogOpen).toBe(false);
    expect(s.game.interaction.busy).toBe(false);
    // The cancel key at the top of the menu.
    s.game.update(dt, press);
    s.game.update(dt, back);
    frames(s, 4);
    expect(s.game.dialogOpen).toBe(false);
    // Escape on the reply line: the pick is dropped.
    s.game.update(dt, press);
    s.game.update(dt, down);
    s.game.update(dt, press);
    frames(s, 10);
    s.game.update(dt, esc);
    frames(s, 4);
    expect(s.game.interaction.busy).toBe(false);
    expect(s.feature.track?.id).toBe(TRACKS[0].id);
    expect(score(s)).toBe(sc);
    expect(mood(s)).toBeLessThanOrEqual(m + 1);
    expect(s.events).toEqual(["complete"]);
    expect(s.ach.stats.number("cancelled")).toBe(0);
    expect(s.game.interaction.cooldownRemaining(s.item)).toBe(0);
    // Escape never starts the menu again.
    frames(s, 20);
    expect(s.game.dialogOpen).toBe(false);
  });

  it("the quiet paths never raise the cancelled stat", () => {
    const s = setup();
    choose(s, 0);
    for (let i = 0; i < 5; i++) {
      choose(s, 0); // same
      choose(s, STOP());
      s.game.update(dt, press);
      s.game.update(dt, esc);
      frames(s, 4);
    }
    expect(s.ach.stats.number("cancelled")).toBe(0);
    expect(s.events.filter((e) => e === "cancelled")).toEqual([]);
  });

  it("treats a demo as a record", () => {
    demo("My first");
    demo("Second");
    const s = setup();
    const withDemos = TRACKS.length; // index of Demos...
    choose(s, withDemos, 0);
    expect(s.feature.track?.id).toBe("demo-1");
    const first = score(s);
    expect(first).toBeGreaterThan(0);
    // A different demo inside the window switches silently.
    choose(s, withDemos, 1);
    expect(s.feature.track?.id).toBe("demo-2");
    expect(score(s)).toBe(first);
    // The same demo again, after the window: no payout.
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    choose(s, withDemos, 1);
    expect(score(s)).toBe(first);
    // A record after the window pays; so does a demo after another window.
    choose(s, 0);
    const second = score(s);
    expect(second).toBeGreaterThan(first);
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    choose(s, withDemos, 0);
    expect(score(s)).toBeGreaterThan(second);
  });

  it("a deleted demo stops, so choosing a record after that pays as from silence", () => {
    demo("My first");
    const s = setup();
    choose(s, TRACKS.length, 0);
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    store.remove("demo-1");
    frames(s, 3);
    expect(s.feature.track).toBeNull();
    const sc = score(s);
    choose(s, 0);
    expect(score(s)).toBeGreaterThan(sc);
  });

  it("does not move the good-hour or combo logic: a paid choice is an ordinary award", () => {
    const s = setup();
    choose(s, 0);
    expect(s.game.interaction.lastCompletion?.award.points).toBeGreaterThan(0);
    expect(s.game.interaction.lastCompletion?.award.chain).toBe(1);
  });
});

describe("the payout window is saved", () => {
  it("is written with the sound settings and a reload keeps the wait", () => {
    const a = setup();
    choose(a, 0);
    const saved = new SettingsStore(a.soundStorage, SOUND.storageKey).load();
    expect(saved.payoutLeft).toBeGreaterThan(MUSIC.payoutEveryMinutes - 1);
    const b = setup(a.soundStorage);
    expect(b.feature.track?.id).toBe(TRACKS[0].id);
    const sc = score(b);
    choose(b, 1); // inside the saved window: switches, no payout
    expect(b.feature.track?.id).toBe(TRACKS[1].id);
    expect(score(b)).toBe(sc);
  });

  it("is tolerant of damaged saves", () => {
    for (const bad of [-5, 1e300, "x", null, NaN, Infinity, [], {}]) {
      const st = new FakeStorage();
      st.setItem(SOUND.storageKey, JSON.stringify({ muted: false, track: null, payoutLeft: bad }));
      const s = setup(st);
      choose(s, 0);
      expect(Number.isFinite(score(s))).toBe(true);
      const left = new SettingsStore(st, SOUND.storageKey).load().payoutLeft;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(MUSIC.payoutEveryMinutes);
    }
    // A save from before this change has no payoutLeft: ready at once.
    const old = new FakeStorage();
    old.setItem(SOUND.storageKey, JSON.stringify({ muted: false, track: null }));
    const s = setup(old);
    choose(s, 0);
    expect(score(s)).toBeGreaterThan(0);
  });

  it("a huge saved wait can never block payouts for longer than the window", () => {
    const st = new FakeStorage();
    st.setItem(SOUND.storageKey, JSON.stringify({ muted: false, track: null, payoutLeft: 1e300 }));
    const s = setup(st);
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    choose(s, 0);
    expect(score(s)).toBeGreaterThan(0);
  });

  it("does not run down while a dialog is open", () => {
    const s = setup();
    choose(s, 0);
    s.game.update(dt, press); // menu open, clock stands still
    frames(s, Math.round(secondsFor(MUSIC.payoutEveryMinutes) * 60));
    expect(s.game.dialogOpen).toBe(true);
    s.game.update(dt, esc);
    frames(s, 4);
    const sc = score(s);
    choose(s, 1);
    expect(score(s)).toBe(sc);
  });
});

describe("the record task without the sound feature", () => {
  it("still pays for a choice, as a game with no player state cannot know what is on", () => {
    const level = {
      ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [real(RECORD_TASK)] } }),
      facing: "right" as const,
    };
    const game = new Game(level, { random: () => 0.5 });
    for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
    game.update(dt, press);
    game.update(dt, press);
    for (let i = 0; i < 60; i++) game.update(dt, i % 8 === 0 ? press : NO_INPUT);
    expect(Number.isFinite(game.interaction.scoreboard.score)).toBe(true);
  });
});

// A seeded random run of everything the player can do near the record player.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let totalPayouts = 0;
describe("random play at the record player", () => {
  for (let seed = 1; seed <= 40; seed++) {
    it(`keeps the rules (seed ${seed})`, () => {
      const r = rng(seed);
      const s = setup();
      let lastScore = score(s);
      let playing = s.feature.track?.id ?? null;
      // Game minutes counted since the last payout (upper bound: the dialog clock stands still).
      let sincePayout = Infinity;
      let payouts = 0;
      let paid = false;
      s.game.events.on("taskComplete", ({ item }) => {
        if (item.id === RECORD_TASK) paid = true;
      });
      let paidFrom: string | null | undefined;
      s.game.events.on("record", ({ id, paid: p }) => {
        if (p) paidFrom = playing === id ? "same" : "different";
      });
      for (let i = 0; i < 4000; i++) {
        const roll = r();
        let c: Controls = NO_INPUT;
        if (roll < 0.12) c = press;
        else if (roll < 0.25) c = down;
        else if (roll < 0.3) c = esc;
        else if (roll < 0.34) c = back;
        else if (roll < 0.36) s.keys.press(SOUND.muteKey);
        else if (roll < 0.375 && store.tracks().length < M.maxTracks) {
          const g = emptyGrid(`D${i}`);
          placeNote(g, "melody", 0, 60, 1);
          store.save(null, g);
        } else if (roll < 0.39) {
          const list = store.tracks();
          if (list.length) {
            store.remove(list[Math.floor(r() * list.length)].id);
          }
        } else if (roll < 0.4) {
          // A sleep or a long wait: the clock jumps and a lot of time passes.
          s.game.state.applyEffects([{ var: "clock", add: 7 }, { var: "energy", set: 100 }]);
          for (let k = 0; k < 600; k++) s.game.update(dt, NO_INPUT);
          sincePayout += 600 * dt * CLOCK.minutesPerSecond;
        }
        const wasOpen = s.game.dialogOpen;
        s.game.update(dt, c);
        if (!s.game.dialogOpen && !wasOpen) sincePayout += dt * CLOCK.minutesPerSecond;
        playing = s.feature.track?.id ?? null;
        const now = score(s);
        // No payout without a real change.
        if (paid) {
          expect(paidFrom).toBe("different");
          expect(playing).not.toBeNull();
          expect(sincePayout).toBeGreaterThanOrEqual(MUSIC.payoutEveryMinutes - 0.5);
          sincePayout = 0;
          payouts++;
          paid = false;
          paidFrom = undefined;
          expect(now).toBeGreaterThan(lastScore);
        } else expect(now).toBe(lastScore);
        lastScore = now;
        // No cooldown, no cancels, always finite.
        expect(s.game.interaction.cooldownRemaining(s.item)).toBe(0);
        expect(s.ach.stats.number("cancelled")).toBe(0);
        expect(Number.isFinite(mood(s))).toBe(true);
        expect(Number.isFinite(now)).toBe(true);
      }
      expect(s.events.filter((e) => e === "cancelled")).toEqual([]);
      expect(payouts).toBe(s.events.filter((e) => e === "complete").length);
      totalPayouts += payouts;
      expect(paidFrom === undefined || paid === false).toBe(true);
    });
  }
  it("paid now and then across the seeds, so the run was not idle", () => {
    expect(totalPayouts).toBeGreaterThan(5);
  });
});
