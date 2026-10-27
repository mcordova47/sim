import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { FakeStorage } from "../achievements/fake-storage";
import { CLOCK, MUSIC, SOUND } from "../config";
import { Game } from "../game";
import { dialogOf, type Interactable } from "../interactable";
import { RECORD_TASK, STOP_LABEL, TRACKS, recordMenu } from "../music/records";
import { parseTrack } from "../music/track";
import { TASKS } from "../tasks";
import { parseTileMap } from "../tilemap";
import { FakeAudioContext } from "./fake-audio";
import { SoundFeature, fit, type KeyEventLike, type Listenable } from "./feature";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const down: Controls = { ...NO_INPUT, dirPressed: "down", dir: "down" };
const escape: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };

class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string, repeat = false) {
    for (const fn of this.fns) fn({ code, repeat });
  }
}

type Task = Omit<Interactable, "zones">;
const task = (id: string): Task => {
  const t = TASKS.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};
const room = (t: Task): ReturnType<typeof parseTileMap> & { facing: "right" } => ({
  ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [t] } }),
  facing: "right",
});

const TWO = [
  parseTrack("title: One\n[a square]\nC4:1", "1.track", "one"),
  parseTrack("title: Two\n[a square]\nD4:1", "2.track", "two"),
];

function setup(taskId = RECORD_TASK, options: { storage?: FakeStorage | null; audio?: () => FakeAudioContext | null } = {}) {
  const ctx = new FakeAudioContext();
  const keys = new FakeKeys();
  const storage = options.storage === undefined ? new FakeStorage() : options.storage;
  // The real task, with a menu of the two test records.
  const real = task(taskId);
  const game = new Game(room(taskId === RECORD_TASK ? { ...real, dialog: recordMenu(TWO) } : real));
  const feature = new SoundFeature(game, {
    audio: options.audio ?? (() => ctx),
    storage,
    keys,
    random: () => 0.5,
    tracks: TWO,
    start: "main",
  });
  const run = (seconds: number, controls: Controls = NO_INPUT) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt, controls);
  };
  const unlock = () => keys.press("KeyZ");
  return { ctx, keys, storage, game, feature, run, unlock };
}

// Starts the record task and picks the menu entry at `index`.
function chooseRecord(s: ReturnType<typeof setup>, index: number) {
  s.run(0.2);
  s.game.update(dt, press);
  expect(s.game.dialogOpen).toBe(true);
  for (let i = 0; i < index; i++) s.game.update(dt, down);
  s.game.update(dt, press); // pick
  s.run(0.5); // let the reply type out
  // The task has no cooldown, so a press too many would open the menu again.
  for (let i = 0; i < 4 && s.game.dialogOpen; i++) {
    s.game.update(dt, press);
    s.run(0.1);
  }
  s.run(0.2);
}

const sounds = (ctx: FakeAudioContext) => ctx.started;

describe("starting audio", () => {
  it("makes no audio and no sound before the first key press", () => {
    const factory = vi.fn(() => new FakeAudioContext());
    const s = setup(RECORD_TASK, { audio: factory });
    s.game.events.emit("bump", { col: 1, row: 1, direction: "up" });
    s.run(0.2);
    expect(factory).not.toHaveBeenCalled();
  });

  it("starts and resumes audio on the first key press", () => {
    const s = setup();
    s.unlock();
    expect(s.ctx.resumed).toBe(1);
    s.game.events.emit("bump", { col: 1, row: 1, direction: "up" });
    expect(sounds(s.ctx)).toBeGreaterThan(0);
  });

  it("unlocks on a held-key repeat too, but never sounds from it", () => {
    const s = setup();
    s.keys.press("KeyM", true);
    expect(s.feature.muted).toBe(false);
    expect(s.ctx.resumed).toBe(1);
  });

  it("is silent and throws nothing when audio is missing or blocked", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const audio of [() => null, () => { throw new Error("no audio"); }]) {
      const s = setup(RECORD_TASK, { audio });
      expect(() => {
        s.unlock();
        s.game.events.emit("step", { col: 1, row: 1, direction: "up" });
        s.game.events.emit("taskComplete", { item: s.game.interaction.nearby ?? (task("coffee") as Interactable), award: { points: 1, basePoints: 1, repeatFactor: 1, multiplier: 1, chain: 3, qualityFactor: 1, timeFactor: 2 } });
        s.run(0.5);
        chooseRecord(s, 0);
      }).not.toThrow();
    }
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});

describe("effects from game events", () => {
  const award = (over = {}) => ({ points: 10, basePoints: 10, repeatFactor: 1, multiplier: 1, chain: 1, qualityFactor: 1, timeFactor: 1, ...over });

  it("plays a footstep for the floor of the room, and changes it through doors", () => {
    const s = setup();
    s.unlock();
    s.run(0.1);
    s.game.events.emit("step", { col: 1, row: 1, direction: "up" });
    expect(s.ctx.filters.at(-1)!.type).toBe("lowpass"); // wood
    s.game.events.emit("room", { id: "kitchen", level: s.game.currentLevel });
    s.game.events.emit("step", { col: 1, row: 1, direction: "up" });
    expect(s.ctx.filters.at(-1)!.type).toBe("bandpass"); // stone
    s.game.events.emit("room", { id: "bath", level: s.game.currentLevel });
    s.game.events.emit("step", { col: 1, row: 1, direction: "up" });
    expect(s.ctx.filters.at(-1)!.type).toBe("highpass"); // tile
  });

  it("starts in the room it is told and uses its floor", () => {
    const ctx = new FakeAudioContext();
    const game = new Game(room(task("coffee")));
    new SoundFeature(game, { audio: () => ctx, storage: null, keys: undefined, tracks: [], start: "kitchen" }).engine.unlock();
    game.events.emit("step", { col: 1, row: 1, direction: "up" });
    expect(ctx.filters.at(-1)!.type).toBe("bandpass");
  });

  it("makes footsteps quieter when tired", () => {
    const s = setup();
    s.unlock();
    s.game.events.emit("step", { col: 1, row: 1, direction: "up" });
    const normal = Math.max(...s.ctx.gains.at(-1)!.gain.calls.map((c) => c.value));
    s.game.state.applyEffects([{ var: "energy", set: 5 }]);
    s.game.events.emit("step", { col: 1, row: 1, direction: "up" });
    const tired = Math.max(...s.ctx.gains.at(-1)!.gain.calls.map((c) => c.value));
    expect(tired).toBeCloseTo(normal * SOUND.tiredStepGain, 6);
  });

  it("plays something for a bump, a start, a cancel, a block and a room change", () => {
    const s = setup();
    s.unlock();
    for (const [name, payload] of [
      ["bump", { col: 1, row: 1, direction: "up" }],
      ["taskStart", { item: task("coffee") }],
      ["taskCancelled", { item: task("coffee") }],
      ["taskBlocked", { item: task("coffee"), reason: "cooldown" }],
      ["room", { id: "bath", level: s.game.currentLevel }],
    ] as const) {
      s.ctx.currentTime += 5;
      const before = sounds(s.ctx);
      s.game.events.emit(name, payload as never);
      expect(sounds(s.ctx), name).toBeGreaterThan(before);
    }
  });

  it("plays the chime for a completion, adds the combo for a chain and the sparkle for a good hour", () => {
    const s = setup();
    s.unlock();
    const count = (a: object) => {
      s.ctx.currentTime += 5;
      const before = sounds(s.ctx);
      s.game.events.emit("taskComplete", { item: task("coffee") as Interactable, award: award(a) });
      return sounds(s.ctx) - before;
    };
    const plain = count({});
    expect(plain).toBe(SOUND.effects.taskComplete.voices.length);
    expect(count({ chain: 3 })).toBe(plain + SOUND.effects.combo.voices.length);
    expect(count({ timeFactor: 1.5 })).toBe(plain + SOUND.effects.goodHour.voices.length);
  });

  it("raises the combo's pitch with the chain, up to the cap", () => {
    const s = setup();
    s.unlock();
    const comboFreq = (chain: number) => {
      s.ctx.currentTime += 5;
      const before = s.ctx.oscillators.length;
      s.game.events.emit("taskComplete", { item: task("coffee") as Interactable, award: award({ chain }) });
      return s.ctx.oscillators[before + SOUND.effects.taskComplete.voices.length].frequency.calls[0].value;
    };
    const [f2, f3, f4] = [2, 3, 4].map(comboFreq);
    expect(f3).toBeGreaterThan(f2);
    expect(f4).toBeGreaterThan(f3);
    expect(comboFreq(SOUND.combo.maxSteps + 1)).toBe(comboFreq(SOUND.combo.maxSteps + 20));
  });

  it("plays the toast sound for the achievement cue and the needle for the record cue", () => {
    const s = setup();
    s.unlock();
    for (const name of ["achievement", "record-spin"]) {
      s.ctx.currentTime += 5;
      const before = sounds(s.ctx);
      s.game.events.emit("cue", { name });
      expect(sounds(s.ctx), name).toBeGreaterThan(before);
    }
    const before = sounds(s.ctx);
    s.game.events.emit("cue", { name: "something-else" });
    expect(sounds(s.ctx)).toBe(before);
  });

  it("blips as dialog text appears, then stops while it waits", () => {
    const s = setup(RECORD_TASK);
    s.unlock();
    s.game.openDialog({ type: "say", text: "Hello there, this is some text to read." });
    s.game.update(dt, NO_INPUT);
    const start = sounds(s.ctx);
    s.run(0.5);
    const typing = sounds(s.ctx) - start;
    expect(typing).toBeGreaterThan(3);
    s.run(3); // the page is fully shown
    s.ctx.currentTime += 10;
    const waiting = sounds(s.ctx);
    s.run(1);
    expect(sounds(s.ctx)).toBe(waiting);
  });

  it("plays a soft blip for each mumbled letter (issue 026), and nothing before audio is unlocked", () => {
    const s = setup(RECORD_TASK);
    s.game.events.emit("voice", { pitch: 1 });
    expect(sounds(s.ctx)).toBe(0);
    s.unlock();
    const before = sounds(s.ctx);
    s.game.events.emit("voice", { pitch: 1.25 });
    expect(sounds(s.ctx)).toBe(before + 1);
  });

  it("plays the named effect for a voice event, and ignores an unknown one", () => {
    const s = setup(RECORD_TASK);
    s.unlock();
    const before = sounds(s.ctx);
    s.game.events.emit("voice", { pitch: 1, effect: "voiceTrill" });
    expect(sounds(s.ctx)).toBe(before + SOUND.effects.voiceTrill.voices.length);
    const after = sounds(s.ctx);
    s.game.events.emit("voice", { pitch: 1, effect: "no-such-effect" });
    expect(sounds(s.ctx)).toBe(after);
  });

  it("passes a voice event's stretch on to the engine", () => {
    const s = setup(RECORD_TASK);
    s.unlock();
    const first = s.ctx.oscillators.length;
    s.game.events.emit("voice", { pitch: 1, effect: "voiceNasal" });
    s.game.events.emit("voice", { pitch: 1, effect: "voiceNasal", stretch: 2 });
    const [plain, slow] = s.ctx.oscillators.slice(first);
    // The nasal is 0.07 s long (plus the engine's 0.02 s tail), so stretched by 2 it is 0.07 s longer.
    expect(slow.stoppedAt! - slow.startedAt!).toBeCloseTo(plain.stoppedAt! - plain.startedAt! + SOUND.effects.voiceNasal.voices[0].length, 3);
  });

  it("keeps the voice count capped under a storm of events", () => {
    const s = setup();
    s.unlock();
    for (let i = 0; i < 200; i++) {
      s.game.events.emit("taskComplete", { item: task("coffee") as Interactable, award: award({ chain: 4, timeFactor: 2 }) });
      s.game.events.emit("step", { col: 1, row: 1, direction: "up" });
    }
    // Nothing ever advanced the clock, so every started voice is still counted.
    expect(s.ctx.oscillators.length + s.ctx.sources.length).toBeLessThanOrEqual(SOUND.maxVoices);
  });
});

describe("mini-game keys", () => {
  it("clicks for each typed key during the typing game", () => {
    const s = setup("work");
    s.unlock();
    s.run(0.2);
    s.game.update(dt, press);
    expect(s.game.interaction.active?.item.id).toBe("work");
    const before = sounds(s.ctx);
    s.keys.press("KeyQ");
    expect(sounds(s.ctx)).toBeGreaterThan(before);
    const after = sounds(s.ctx);
    s.keys.press("ArrowUp"); // not a typing key
    expect(sounds(s.ctx)).toBe(after);
  });

  it("plays a different note for each arrow in the notes game", () => {
    const s = setup("guitar");
    s.unlock();
    s.run(0.2);
    s.game.update(dt, press);
    expect(s.game.interaction.active?.item.id).toBe("guitar");
    const pitches = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].map((code) => {
      s.ctx.currentTime += 5;
      const before = s.ctx.oscillators.length;
      s.keys.press(code);
      expect(s.ctx.oscillators.length).toBe(before + 1);
      return s.ctx.oscillators.at(-1)!.frequency.calls[0].value;
    });
    expect(new Set(pitches).size).toBe(4);
    const n = s.ctx.oscillators.length;
    s.keys.press("KeyQ");
    expect(s.ctx.oscillators.length).toBe(n);
  });

  it("makes no key sounds when no mini-game is running", () => {
    const s = setup();
    s.unlock();
    const before = sounds(s.ctx);
    s.keys.press("KeyQ");
    s.keys.press("ArrowUp");
    expect(sounds(s.ctx)).toBe(before);
  });
});

describe("mute", () => {
  it("toggles on M, shows MUTE while muted and makes no effect sounds", () => {
    const s = setup();
    s.unlock();
    expect(s.feature.indicatorText()).toBeNull();
    s.keys.press(SOUND.muteKey);
    expect(s.feature.muted).toBe(true);
    expect(s.feature.indicatorText()).toBe("MUTE");
    const before = sounds(s.ctx);
    s.game.events.emit("bump", { col: 1, row: 1, direction: "up" });
    expect(sounds(s.ctx)).toBe(before);
    s.run(60); // the tag does not time out while muted
    expect(s.feature.indicatorText()).toBe("MUTE");
  });

  it("shows SOUND ON briefly after unmuting, then nothing", () => {
    const s = setup();
    s.unlock();
    s.keys.press(SOUND.muteKey);
    s.keys.press(SOUND.muteKey);
    expect(s.feature.muted).toBe(false);
    expect(s.feature.indicatorText()).toBe("SOUND ON");
    s.run(SOUND.indicatorSeconds + 0.5);
    expect(s.feature.indicatorText()).toBeNull();
  });

  it("is not a letter in the typing game, and a held key does not flicker it", () => {
    const s = setup("work");
    s.unlock();
    s.run(0.2);
    s.game.update(dt, press);
    s.keys.press(SOUND.muteKey);
    expect(s.feature.muted).toBe(false);
    const t = setup();
    t.unlock();
    t.keys.press(SOUND.muteKey);
    t.keys.press(SOUND.muteKey, true);
    expect(t.feature.muted).toBe(true);
  });

  it("works before audio has started, and keeps it muted once it does", () => {
    const s = setup();
    s.keys.press(SOUND.muteKey); // this press also unlocks
    expect(s.feature.muted).toBe(true);
    expect(s.ctx.gains[0].gain.calls.at(-1)).toMatchObject({ value: 0 });
  });

  it("is remembered across reloads", () => {
    const first = setup();
    first.unlock();
    first.keys.press(SOUND.muteKey);
    const again = setup(RECORD_TASK, { storage: first.storage });
    expect(again.feature.muted).toBe(true);
    again.unlock();
    again.game.events.emit("bump", { col: 1, row: 1, direction: "up" });
    expect(sounds(again.ctx)).toBe(0);
  });

  it("works with no storage, or storage that throws", () => {
    const none = setup(RECORD_TASK, { storage: null });
    expect(() => none.keys.press(SOUND.muteKey)).not.toThrow();
    expect(none.feature.muted).toBe(true);
    const boom = () => {
      throw new Error("blocked");
    };
    const ctx = new FakeAudioContext();
    const game = new Game(room(task("coffee")));
    const keys = new FakeKeys();
    const f = new SoundFeature(game, { audio: () => ctx, storage: { getItem: boom, setItem: boom, removeItem: boom }, keys, tracks: TWO });
    expect(() => keys.press(SOUND.muteKey)).not.toThrow();
    expect(f.muted).toBe(true);
  });

  it("does not use a key other features use", () => {
    expect(["Tab", "Escape", "KeyE", "KeyX", "KeyL", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD"]).not.toContain(SOUND.muteKey);
  });
});

describe("the record player", () => {
  it("starts with silence", () => {
    const s = setup();
    expect(s.feature.track).toBeNull();
    s.unlock();
    s.run(1);
    expect(s.ctx.oscillators.filter((o) => o.type === "square")).toHaveLength(0);
    expect(s.feature.nowPlayingText()).toBe("NOTHING PLAYING"); // facing the player
  });

  it("plays the record that was chosen and says what is playing", () => {
    const s = setup();
    s.unlock();
    chooseRecord(s, 1);
    expect(s.feature.track?.id).toBe("two");
    expect(s.feature.nowPlayingText()).toBe("NOW PLAYING: Two");
    expect(s.game.interaction.busy).toBe(false);
    s.run(0.5);
    const squares = s.ctx.oscillators.filter((o) => o.type === "square");
    expect(squares.some((o) => Math.round(o.frequency.calls[0].value) === 294)).toBe(true); // D4
  });

  it("pays points and a mood bump for choosing", () => {
    const s = setup();
    s.unlock();
    const before = s.game.state.get("mood");
    chooseRecord(s, 0);
    expect(s.game.interaction.scoreboard.score).toBeGreaterThan(0);
    expect(s.game.state.get("mood")).toBeGreaterThan(before);
  });

  it("switches records and stops with the last choice", () => {
    const s = setup();
    s.unlock();
    chooseRecord(s, 0);
    expect(s.feature.track?.id).toBe("one");
    s.run(15);
    chooseRecord(s, 1);
    expect(s.feature.track?.id).toBe("two");
    s.run(15);
    chooseRecord(s, 2);
    expect(s.feature.track).toBeNull();
    expect(s.feature.engine.music.track).toBeNull();
    expect(s.feature.nowPlayingText()).toBe("NOTHING PLAYING"); // facing the player
  });

  it("leaves things as they were when the player backs out", () => {
    const s = setup();
    s.unlock();
    chooseRecord(s, 0);
    s.run(15);
    s.game.update(dt, press);
    s.game.update(dt, down);
    s.game.update(dt, escape);
    s.run(0.5);
    expect(s.game.dialogOpen).toBe(false);
    expect(s.feature.track?.id).toBe("one");
  });

  it("drops a half-made choice if the action is cancelled after picking", () => {
    const s = setup();
    s.unlock();
    s.run(0.2);
    s.game.update(dt, press);
    s.game.update(dt, down);
    s.game.update(dt, press); // picked "Two", its reply is showing
    s.game.update(dt, escape); // Escape backs out of the whole action
    s.run(0.5);
    expect(s.feature.track).toBeNull();
  });

  it("remembers the record and plays it after a reload once a key is pressed", () => {
    const first = setup();
    first.unlock();
    chooseRecord(first, 1);
    const again = setup(RECORD_TASK, { storage: first.storage });
    expect(again.feature.track?.id).toBe("two");
    again.run(0.5);
    expect(again.ctx.started).toBe(0); // no audio yet
    again.unlock();
    again.run(0.5);
    expect(again.ctx.oscillators.some((o) => o.type === "square")).toBe(true);
  });

  it("forgets a saved record that no longer exists, and an old save with no music field", () => {
    const storage = new FakeStorage();
    storage.setItem(SOUND.storageKey, JSON.stringify({ muted: false, track: "gone" }));
    expect(setup(RECORD_TASK, { storage }).feature.track).toBeNull();
    storage.setItem(SOUND.storageKey, JSON.stringify({ muted: true }));
    const old = setup(RECORD_TASK, { storage });
    expect(old.feature.track).toBeNull();
    expect(old.feature.muted).toBe(true);
  });

  it("names what is playing, or that nothing is, when facing the record player", () => {
    const s = setup();
    s.run(0.2);
    expect(s.game.interaction.nearby?.id).toBe(RECORD_TASK);
    expect(s.feature.nowPlayingText()).toBe("NOTHING PLAYING");
    s.unlock();
    chooseRecord(s, 0);
    expect(s.feature.nowPlayingText()).toBe("NOW PLAYING: One");
  });

  it("keeps the music going while muted, so unmuting brings it back in time", () => {
    const s = setup();
    s.unlock();
    chooseRecord(s, 0);
    s.keys.press(SOUND.muteKey);
    expect(s.feature.track?.id).toBe("one");
    for (let t = 20; t < 21.5; t += 0.1) {
      s.ctx.currentTime = t;
      s.run(0.02);
    }
    // It carried on in time (not a burst of everything it missed).
    const late = s.ctx.oscillators.filter((o) => o.startedAt! >= 19);
    expect(late.length).toBeGreaterThan(0);
    expect(late.length).toBeLessThan(10);
  });
});

describe("music lifts mood", () => {
  // Mood is pinned at `start` so only the lift moves it.
  function lifted(seconds: number, start = 30) {
    const s = setup();
    s.feature.setTrack(TWO[0]);
    s.game.state.applyEffects([{ var: "mood", set: start }]);
    // Hold mood still against the slow drift toward the middle.
    let mood = start;
    s.game.state.onChange = undefined;
    for (let t = 0; t < seconds; t += 1) {
      s.feature.update(1);
      mood = s.game.state.get("mood");
    }
    return mood;
  }

  it("adds mood over game time while a record plays", () => {
    const seconds = (MUSIC.everyGameMinutes * 3) / CLOCK.minutesPerSecond;
    expect(lifted(seconds + 0.5)).toBe(30 + 3 * MUSIC.moodPerStep);
  });

  it("does nothing with no record", () => {
    const s = setup();
    s.game.state.applyEffects([{ var: "mood", set: 30 }]);
    for (let i = 0; i < 200; i++) s.feature.update(1);
    expect(s.game.state.get("mood")).toBe(30);
  });

  it("stops at the cap", () => {
    expect(lifted(10000, 70)).toBe(MUSIC.moodCap);
  });

  it("does not lift while a dialog has the clock stopped", () => {
    const s = setup();
    s.feature.setTrack(TWO[0]);
    s.game.state.applyEffects([{ var: "mood", set: 30 }]);
    s.game.openDialog({ type: "say", text: "Hi" });
    for (let i = 0; i < 500; i++) s.feature.update(1);
    expect(s.game.state.get("mood")).toBe(30);
  });
});

describe("drawing", () => {
  const ctx = () => {
    const calls: string[] = [];
    return {
      calls,
      c: new Proxy({}, { get: (_t, p) => (typeof p === "string" ? (..._a: unknown[]) => calls.push(p) : undefined), set: () => true }) as unknown as CanvasRenderingContext2D,
    };
  };

  afterEach(() => vi.unstubAllGlobals());

  it("draws nothing when there is nothing to say, and something when muted", () => {
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({ fillRect() {}, set fillStyle(_v: string) {} }) }) });
    const s = setup("coffee");
    const quiet = ctx();
    s.feature.drawHud(quiet.c);
    expect(quiet.calls).toHaveLength(0);
    s.keys.press(SOUND.muteKey);
    const muted = ctx();
    s.feature.drawHud(muted.c);
    expect(muted.calls).toContain("fillRect");
  });

  it("shortens a title too wide for the screen", () => {
    expect(fit("SHORT", 200)).toBe("SHORT");
    const long = fit("A".repeat(80), 100);
    expect(long.endsWith("...")).toBe(true);
    expect(long.length).toBeLessThan(80);
  });
});

describe("the real record list", () => {
  it("offers every track file plus stop in the real task's menu", () => {
    const menu = dialogOf(task(RECORD_TASK))!;
    expect(menu.type).toBe("menu");
    expect(menu.type === "menu" && menu.choices.map((c) => c.label)).toEqual([...TRACKS.map((t) => t.title), STOP_LABEL]);
  });
});

const SOURCES = import.meta.glob("../../**/*.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("removing the feature", () => {
  it("leaves nothing in the game importing sound code except features.ts", () => {
    const offenders = Object.entries(SOURCES)
      // Files of the sound folder itself have keys like "./synth.ts".
      .filter(([path]) => !path.startsWith("./") && !path.includes("/sound/") && !path.endsWith(".test.ts") && !path.endsWith("/features.ts"))
      .filter(([, text]) => /from\s+["'][^"']*\/sound\//.test(text) || /AudioContext|webkitAudioContext/.test(text))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it("runs the whole game without the sound feature", () => {
    const game = new Game(room(task("coffee")));
    for (let i = 0; i < 60; i++) game.update(dt, press);
    expect(game.interaction.scoreboard.score).toBeGreaterThanOrEqual(0);
  });
});

describe("modifier keys", () => {
  it("ignores Ctrl+M, Cmd+M and Alt+M", () => {
    const s = setup();
    for (const mod of ["ctrlKey", "metaKey", "altKey"]) for (const fn of s.keys.fns) fn({ code: SOUND.muteKey, [mod]: true });
    expect(s.feature.muted).toBe(false);
  });
});
