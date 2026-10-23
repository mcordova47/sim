import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { MAKE_TRACKS as M, MUSIC, CLOCK, SOUND } from "./config";
import { dialogOf, type Interactable } from "./interactable";
import { Game } from "./game";
import { DemoStore } from "./music/demo-store";
import { setDemoStore, currentRecordMenu, reservedNames } from "./music/demo-library";
import { emptyGrid, placeNote } from "./music/demos";
import { DEMOS_LABEL, RECORD_TASK, STOP_LABEL, TRACKS, recordMenu } from "./music/records";
import { FakeAudioContext } from "./sound/fake-audio";
import { SoundFeature, type KeyEventLike, type Listenable } from "./sound/feature";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";
import { AchievementsFeature } from "./achievements/feature";
import { DemoStore as Store } from "./music/demo-store";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const down: Controls = { ...NO_INPUT, dirPressed: "down", dir: "down" };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const keys = (...codes: string[]): Controls => ({ ...NO_INPUT, keys: codes });

type Task = Omit<Interactable, "zones">;
const real = (id: string): Task => TASKS.find((t) => t.id === id)!;
const level = (task: Task) => ({
  ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [task] } }),
  facing: "right" as const,
});

let storage: FakeStorage;
let store: DemoStore;
beforeEach(() => {
  storage = new FakeStorage();
  store = new DemoStore(storage, M.storageKey, { reserved: () => [STOP_LABEL, ...TRACKS.map((t) => t.title)], log: () => {} });
  setDemoStore(store);
});
afterEach(() => setDemoStore(null));

function start(task = real("make-track")) {
  const game = new Game(level(task), { random: () => 0.5 });
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  game.update(dt, press);
  return game;
}
const frames = (game: Game, n: number, c: Controls = NO_INPUT) => {
  for (let i = 0; i < n; i++) game.update(dt, c);
};
const tap = (game: Game, ...codes: string[]) => {
  for (const c of codes) {
    game.update(dt, keys(c));
    game.update(dt, NO_INPUT);
  }
};

// Eight notes on two channels: enough to be paid for.
function worthSaving(game: Game) {
  tap(game, "KeyE");
  for (let i = 0; i < 4; i++) tap(game, "ArrowRight", "ArrowRight", "KeyE");
  tap(game, "Digit2");
  for (let i = 0; i < 4; i++) tap(game, "ArrowRight", "ArrowRight", "KeyE");
}

describe("the task at the desk", () => {
  it("is a real task with no points, no cooldown and the editor as its activity", () => {
    const t = real("make-track");
    expect(t.activity).toEqual({ type: "make-track" });
    expect(t.cooldown).toBe(0);
    expect(t.points).toBe(0);
    expect(t.name).toBe("Make a track");
  });

  it("starts at once with no saved tracks, and the player stays where they stand", () => {
    const game = start();
    expect(game.interaction.busy).toBe(true);
    const { col, row } = game.player;
    frames(game, 5, { ...NO_INPUT, dir: "down", dirPressed: "down", keys: ["ArrowDown"] });
    frames(game, 60, { ...NO_INPUT, dir: "left", keysDown: ["ArrowLeft"] });
    expect(game.player.col).toBe(col);
    expect(game.player.row).toBe(row);
    expect(game.dialogOpen).toBe(false);
  });
});

describe("the clock is held still while editing", () => {
  it("keeps the time, energy and mood where they were, and starts them again on leaving", () => {
    const game = start();
    game.state.applyEffects([{ var: "mood", set: 70 }]);
    const before = { clock: game.state.get("clock"), energy: game.state.get("energy"), mood: game.state.get("mood") };
    frames(game, 600);
    expect(game.interaction.busy).toBe(true);
    expect(game.state.get("clock")).toBe(before.clock);
    expect(game.state.get("energy")).toBe(before.energy);
    expect(game.state.get("mood")).toBe(before.mood);
    game.update(dt, esc);
    frames(game, 120);
    expect(game.state.get("clock")).toBeGreaterThan(before.clock);
  });

  it("holds it while the start menu or a question is open as well (dialogs hold it already)", () => {
    const g = emptyGrid("One");
    placeNote(g, "melody", 0, 60, 1);
    store.save(null, g);
    const game = start();
    expect(game.dialogOpen).toBe(true);
    const clock = game.state.get("clock");
    frames(game, 300);
    expect(game.state.get("clock")).toBe(clock);
  });
});

describe("saving pays through the normal scoring path", () => {
  it("pays 90 points and +6 mood for a worthwhile save, once, with the task still open", () => {
    const game = start();
    const done: string[] = [];
    game.events.on("taskComplete", ({ item }) => done.push(item.id));
    game.state.applyEffects([{ var: "mood", set: 50 }]);
    worthSaving(game);
    tap(game, "KeyS");
    expect(game.interaction.scoreboard.score).toBe(90);
    expect(game.state.get("mood")).toBe(56);
    expect(done).toEqual(["make-track"]);
    expect(game.interaction.busy).toBe(true);
    // Saved again: no more points.
    tap(game, "KeyS");
    expect(game.interaction.scoreboard.score).toBe(90);
    expect(done).toHaveLength(1);
    expect(store.count).toBe(1);
  });

  it("does not pay for a short track, and pays later for a longer one", () => {
    const game = start();
    tap(game, "KeyE", "KeyS");
    expect(game.interaction.scoreboard.score).toBe(0);
    expect(store.count).toBe(1);
    worthSaving(game);
    tap(game, "KeyS");
    expect(game.interaction.scoreboard.score).toBe(90);
  });

  it("pays again after six game hours have passed (the clock held while editing does not count)", () => {
    const game = start();
    worthSaving(game);
    tap(game, "KeyS");
    expect(game.interaction.scoreboard.score).toBe(90);
    // A long time editing counts for nothing.
    frames(game, 60 * 60);
    tap(game, "ArrowRight", "KeyE", "KeyS");
    expect(game.interaction.scoreboard.score).toBe(90);
    // Leave, let six game hours go by, come back.
    game.update(dt, esc);
    frames(game, Math.ceil(((M.reward.cooldownHours * 60) / CLOCK.minutesPerSecond) * 60) + 120);
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);
    game.update(dt, keys("KeyE"));
    game.update(dt, NO_INPUT);
    expect(game.dialogOpen).toBe(true);
  });

  it("leaves with Escape paying nothing, and can be opened again at once", () => {
    const game = start();
    const events: string[] = [];
    game.events.on("taskCancelled", () => events.push("cancelled"));
    game.events.on("taskComplete", () => events.push("complete"));
    worthSaving(game);
    game.update(dt, esc);
    frames(game, 3);
    expect(game.interaction.busy).toBe(false);
    expect(game.interaction.scoreboard.score).toBe(0);
    expect(events).toEqual([]); // leaving is a quiet end, not a cancel
    expect(store.count).toBe(0);
    expect(store.draft()).not.toBeNull();
    game.update(dt, press);
    expect(game.interaction.busy).toBe(true);
  });
});

describe("Escape leaves cleanly at every moment", () => {
  const moments: { name: string; prep?: () => void; run: (game: Game) => void; dialog?: boolean }[] = [
    { name: "just after starting", run: () => {} },
    { name: "placing notes", run: (g) => tap(g, "KeyE", "ArrowRight", "KeyE") },
    { name: "playing", run: (g) => tap(g, "KeyE", "KeyP") },
    { name: "typing a name", run: (g) => tap(g, "KeyN", "KeyA", "KeyB") },
    {
      name: "in the delete question",
      run: (g) => {
        tap(g, "KeyE", "KeyS", "KeyD");
      },
      dialog: true,
    },
    {
      name: "in the start menu",
      prep: () => {
        const g = emptyGrid("One");
        placeNote(g, "melody", 0, 60, 1);
        store.save(null, g);
      },
      run: () => {},
      dialog: true,
    },
    { name: "mid paste", run: (g) => tap(g, "KeyV") },
    { name: "after a save", run: (g) => tap(g, "KeyE", "KeyS") },
  ];

  for (const m of moments) {
    it(m.name, () => {
      m.prep?.();
      const game = start();
      const scoreBefore = game.interaction.scoreboard.score;
      m.run(game);
      expect(game.interaction.busy).toBe(true);
      if (m.dialog) expect(game.dialogOpen).toBe(true);
      const mood = game.state.get("mood");
      game.update(dt, esc);
      frames(game, 3);
      expect(game.interaction.busy).toBe(false);
      expect(game.dialogOpen).toBe(false);
      expect(game.inputLocked).toBe(false);
      expect(game.interaction.scoreboard.score).toBe(scoreBefore);
      expect(game.state.get("mood")).toBeGreaterThanOrEqual(mood - 1);
      // And the player can walk again.
      const { col } = game.player;
      frames(game, 30, { ...NO_INPUT, dir: "down", keysDown: ["ArrowDown"] });
      expect(game.player.row).toBeGreaterThan(2);
      expect(game.player.col).toBe(col);
    });
  }
});

describe("random keys through the real game (fuzz)", () => {
  function rng(seed: number) {
    let x = seed >>> 0;
    return () => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      return x / 4294967296;
    };
  }
  const CODES = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyE", "KeyP", "KeyS", "KeyD", "KeyN", "KeyC", "KeyV", "KeyT", "KeyM", "KeyL", "KeyX", "Digit1", "Digit2", "Digit3", "Enter", "Backspace", "Minus", "Equal", "Comma", "Period", "Space", "Tab", "KeyA", "Escape"];

  it("never throws, never leaves the game locked, and never writes a track that does not parse", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const random = rng(seed);
      const storage = new FakeStorage();
      const local = new DemoStore(storage, M.storageKey, { reserved: () => [STOP_LABEL], log: () => {} });
      setDemoStore(local);
      if (seed % 2) {
        const g = emptyGrid("Saved");
        placeNote(g, "melody", 0, 60, 1);
        local.save(null, g);
      }
      const game = new Game(level(real("make-track")), { random });
      let errors = 0;
      const err = console.error;
      console.error = () => void errors++;
      try {
        for (let i = 0; i < 700; i++) {
          const roll = random();
          let c: Controls = NO_INPUT;
          if (roll < 0.3) c = press;
          else if (roll < 0.4) c = down;
          else if (roll < 0.75) {
            const code = CODES[Math.floor(random() * CODES.length)];
            c = { ...NO_INPUT, keys: [code], cancelPressed: code === "Escape" || code === "KeyX", dirPressed: code === "ArrowDown" ? "down" : code === "ArrowUp" ? "up" : null };
          }
          game.update(dt, c);
        }
      } finally {
        console.error = err;
      }
      expect(errors, `seed ${seed}`).toBe(0);
      game.update(dt, esc);
      frames(game, 3);
      expect(game.interaction.busy, `seed ${seed}`).toBe(false);
      expect(game.dialogOpen, `seed ${seed}`).toBe(false);
      expect(game.inputLocked, `seed ${seed}`).toBe(false);
      for (const d of local.list()) expect(d.track.channels.length, `seed ${seed}`).toBe(3);
      expect(local.list().length).toBe(local.count);
      expect(local.count).toBeLessThanOrEqual(M.maxTracks);
    }
  });
});

// -- Demos in the record player --------------------------------------------------

class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string) {
    for (const fn of this.fns) fn({ code });
  }
}

function demo(title: string, key = 60): void {
  const g = emptyGrid(title);
  placeNote(g, "melody", 0, key, 1);
  expect(store.save(null, g).ok).toBe(true);
}

function player(task: Task = real(RECORD_TASK), soundStorage = new FakeStorage()) {
  const ctx = new FakeAudioContext();
  const keysFake = new FakeKeys();
  const game = new Game(level(task), { random: () => 0.5 });
  const feature = new SoundFeature(game, { audio: () => ctx, storage: soundStorage, keys: keysFake, random: () => 0.5, demos: store, start: "main" });
  keysFake.press("KeyZ");
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  return { ctx, game, feature, keys: keysFake, soundStorage };
}

// Opens the menu and picks by index at each level, then reads the reply.
function pick(p: ReturnType<typeof player>, ...indexes: number[]) {
  p.game.update(dt, press);
  expect(p.game.dialogOpen).toBe(true);
  for (const index of indexes) {
    for (let i = 0; i < index; i++) p.game.update(dt, down);
    p.game.update(dt, press);
  }
  frames(p.game, 40);
  p.game.update(dt, press);
  p.game.update(dt, press);
  frames(p.game, 12);
}

describe("Demos in the record player menu", () => {
  it("leaves the menu exactly as it was when there are no demos", () => {
    expect(currentRecordMenu()).toEqual(recordMenu(TRACKS));
    const labels = currentRecordMenu().choices.map((c) => c.label);
    expect(labels).toEqual([...TRACKS.map((t) => t.title), STOP_LABEL]);
  });

  it("lists Demos... between the records and Stop the music when there are demos", () => {
    demo("My first");
    demo("Second one");
    const labels = currentRecordMenu().choices.map((c) => c.label);
    expect(labels).toEqual([...TRACKS.map((t) => t.title), DEMOS_LABEL, STOP_LABEL]);
    const sub = currentRecordMenu().choices.find((c) => c.label === DEMOS_LABEL)!.next!;
    expect(sub.type === "menu" && sub.choices.map((c) => c.label)).toEqual(["My first", "Second one"]);
  });

  it("is built when the player presses E, not at load: a demo made after the game began is there", () => {
    const task = real(RECORD_TASK);
    const game = new Game(level(task), { random: () => 0.5 });
    expect(typeof task.dialog).toBe("function");
    for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
    demo("Made later");
    game.update(dt, press);
    expect(game.dialogView?.kind === "menu" && game.dialogView.choices).toContain("Demos...");
    expect(dialogOf(task)).toBeDefined();
  });

  it("plays the chosen demo like a record: sound, now playing line, points and mood", () => {
    demo("My first", 67);
    demo("Second one", 72);
    const p = player();
    p.game.state.applyEffects([{ var: "mood", set: 50 }]);
    // Records are 0..2, Demos... is 3, Stop is 4.
    pick(p, TRACKS.length, 1);
    expect(p.feature.track?.id).toBe("demo-2");
    expect(p.feature.engine.music.track?.title).toBe("Second one");
    expect(p.feature.nowPlayingText()).toBe("NOW PLAYING: Second one");
    expect(p.game.interaction.scoreboard.score).toBeGreaterThan(0);
    expect(p.game.state.get("mood")).toBeGreaterThan(54);
    expect(p.game.interaction.busy).toBe(false);
  });

  it("remembers a demo on the player between visits", () => {
    demo("My first");
    const p = player();
    pick(p, TRACKS.length, 0);
    expect(p.feature.track?.id).toBe("demo-1");
    const again = player(real(RECORD_TASK), p.soundStorage);
    expect(again.feature.track?.id).toBe("demo-1");
  });

  it("lifts mood over game time while a demo plays, as for a record", () => {
    demo("My first");
    const p = player(real("coffee"));
    p.feature.setTrack(store.tracks()[0]);
    p.game.state.applyEffects([{ var: "mood", set: 30 }]);
    const seconds = (MUSIC.everyGameMinutes * 3) / CLOCK.minutesPerSecond + 0.5;
    for (let t = 0; t < seconds; t++) p.feature.update(1);
    expect(p.game.state.get("mood")).toBe(30 + 3 * MUSIC.moodPerStep);
  });

  it("backs out of Demos... with Escape: nothing picked, nothing paid, the record stays", () => {
    demo("My first");
    const p = player();
    pick(p, 0);
    expect(p.feature.track?.id).toBe(TRACKS[0].id);
    const score = p.game.interaction.scoreboard.score;
    frames(p.game, 60 * 12); // past the task's cooldown
    p.game.update(dt, press);
    for (let i = 0; i < TRACKS.length; i++) p.game.update(dt, down);
    p.game.update(dt, press); // opens Demos...
    expect(p.game.dialogView?.kind === "menu" && p.game.dialogView.choices).toEqual(["My first"]);
    p.game.update(dt, esc);
    frames(p.game, 3);
    expect(p.game.dialogOpen).toBe(false);
    expect(p.game.interaction.busy).toBe(false);
    expect(p.feature.track?.id).toBe(TRACKS[0].id);
    expect(p.game.interaction.scoreboard.score).toBe(score);
  });

  it("goes back one menu with the cancel key and picks from the records afterwards", () => {
    demo("My first");
    const p = player();
    p.game.update(dt, press);
    for (let i = 0; i < TRACKS.length; i++) p.game.update(dt, down);
    p.game.update(dt, press);
    expect(p.game.dialogView?.kind === "menu" && p.game.dialogView.choices).toEqual(["My first"]);
    p.game.update(dt, { ...NO_INPUT, cancelPressed: true });
    expect(p.game.dialogOpen).toBe(true);
    expect(p.game.dialogView?.kind === "menu" && p.game.dialogView.choices).toContain("Demos...");
    p.game.update(dt, { ...NO_INPUT, cancelPressed: true });
    expect(p.game.dialogOpen).toBe(false);
    expect(p.feature.track).toBeNull();
  });

  it("stops when the demo on the player is deleted, and plays the new version when it is changed", () => {
    demo("My first", 60);
    const p = player();
    pick(p, TRACKS.length, 0);
    const first = p.feature.track;
    expect(first?.id).toBe("demo-1");
    // Changed: saved again with a different note.
    const g = emptyGrid("My first");
    placeNote(g, "melody", 0, 72, 1);
    store.save("demo-1", g);
    p.game.update(dt, NO_INPUT);
    expect(p.feature.track?.id).toBe("demo-1");
    expect(p.feature.track).not.toBe(first);
    expect(p.feature.engine.music.track).toBe(p.feature.track);
    // Deleted.
    store.remove("demo-1");
    p.game.update(dt, NO_INPUT);
    expect(p.feature.track).toBeNull();
    expect(p.feature.engine.music.track).toBeNull();
    expect(JSON.parse(p.soundStorage.getItem(SOUND.storageKey)!).track).toBeNull();
  });

  it("treats a remembered demo that no longer exists as silence", () => {
    const soundStorage = new FakeStorage();
    soundStorage.setItem(SOUND.storageKey, JSON.stringify({ muted: false, track: "demo-9" }));
    const p = player(real(RECORD_TASK), soundStorage);
    expect(p.feature.track).toBeNull();
  });

  it("keeps a record playing when a different demo is deleted", () => {
    demo("My first");
    const p = player();
    pick(p, 0);
    store.remove("demo-1");
    p.game.update(dt, NO_INPUT);
    expect(p.feature.track?.id).toBe(TRACKS[0].id);
  });

  it("cannot be given the name of a record, Stop the music or Demos...", () => {
    const real = new DemoStore(new FakeStorage(), M.storageKey, { reserved: reservedNames, log: () => {} });
    for (const name of [TRACKS[0].title, TRACKS[0].title.toUpperCase(), STOP_LABEL, DEMOS_LABEL, "New track", "Continue your draft", "Cancel"]) {
      const g = emptyGrid(name);
      placeNote(g, "melody", 0, 60, 1);
      expect(real.save(null, g), name).toMatchObject({ ok: false, code: "taken" });
    }
  });
});

describe("the editor and the sound", () => {
  function editor() {
    const p = player(real("make-track"));
    p.game.update(dt, press);
    expect(p.game.interaction.busy).toBe(true);
    return p;
  }
  const music = (p: ReturnType<typeof player>) => p.feature.engine.music.track;

  it("plays the preview over the record and puts the record back when leaving", () => {
    const p = editor();
    p.feature.setTrack(TRACKS[1]);
    tap(p.game, "KeyE", "KeyP");
    expect(music(p)?.id).toBe("preview");
    expect(p.feature.track?.id).toBe(TRACKS[1].id); // the record on the player is unchanged
    tap(p.game, "KeyP");
    expect(music(p)?.id).toBe(TRACKS[1].id);
    tap(p.game, "KeyP");
    p.game.update(dt, esc);
    frames(p.game, 3);
    expect(music(p)?.id).toBe(TRACKS[1].id);
  });

  it("goes back to silence if no record was on", () => {
    const p = editor();
    tap(p.game, "KeyE", "KeyP");
    expect(music(p)?.id).toBe("preview");
    p.game.update(dt, esc);
    frames(p.game, 3);
    expect(music(p)).toBeNull();
  });

  it("keeps the preview going when it pays for a save, and puts the record back after", () => {
    const p = editor();
    p.feature.setTrack(TRACKS[0]);
    worthSaving(p.game);
    tap(p.game, "KeyP");
    tap(p.game, "KeyS");
    expect(p.game.interaction.scoreboard.score).toBe(90);
    expect(music(p)?.id).toBe("preview");
    p.game.update(dt, esc);
    frames(p.game, 3);
    expect(music(p)?.id).toBe(TRACKS[0].id);
  });

  it("gives no mood from the music while the editor is open", () => {
    const p = editor();
    p.feature.setTrack(TRACKS[0]);
    p.game.state.applyEffects([{ var: "mood", set: 30 }]);
    for (let i = 0; i < 500; i++) p.feature.update(1);
    expect(p.game.state.get("mood")).toBe(30);
  });

  it("sounds a short note for each note placed", () => {
    const p = editor();
    const before = p.ctx.started;
    tap(p.game, "KeyE");
    expect(p.ctx.started).toBeGreaterThan(before);
  });

  it("lets M mute except while a name is typed", () => {
    const p = editor();
    p.keys.press("KeyM");
    expect(p.feature.muted).toBe(true);
    p.keys.press("KeyM");
    expect(p.feature.muted).toBe(false);
    tap(p.game, "KeyN");
    p.keys.press("KeyM");
    expect(p.feature.muted).toBe(false);
  });
});

describe("leaving the editor is not a cancelled task", () => {
  it("three visits leave the cancelled stat at 0 and 'Changed My Mind' locked", () => {
    const game = new Game(level(real("make-track")), { random: () => 0.5 });
    const feature = new AchievementsFeature(game, { storage: new FakeStorage(), keys: undefined, visibility: undefined });
    const cancelled: string[] = [];
    game.events.on("taskCancelled", () => cancelled.push("x"));
    for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
    for (let visit = 0; visit < 3; visit++) {
      game.update(dt, press);
      expect(game.interaction.busy).toBe(true);
      tap(game, "KeyE", "KeyP");
      game.update(dt, esc);
      frames(game, 3);
      expect(game.interaction.busy).toBe(false);
      expect(game.inputLocked).toBe(false);
      expect(game.dialogOpen).toBe(false);
    }
    expect(cancelled).toEqual([]);
    expect(feature.stats.number("cancelled")).toBe(0);
    expect(feature.unlocks.ids()).not.toContain("cancel-3");
    expect(game.interaction.scoreboard.score).toBe(0);
    expect(store.draft()).not.toBeNull();
  });

  it("other activities still count Escape as a cancel", () => {
    const game = new Game(level(real("work")), { random: () => 0.5 });
    const feature = new AchievementsFeature(game, { storage: new FakeStorage(), keys: undefined, visibility: undefined });
    for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
    game.update(dt, press);
    game.update(dt, esc);
    expect(feature.stats.number("cancelled")).toBe(1);
  });
});

describe("hand-edited storage is capped on load", () => {
  it("limits the track count, the text size and the cooldown", () => {
    const g = emptyGrid("Ok");
    placeNote(g, "melody", 0, 60, 1);
    const good = new Store(new FakeStorage(), M.storageKey, { reserved: () => [], log: () => {} });
    good.save(null, g);
    const text = good.list()[0].text;
    const tracks = Array.from({ length: 40 }, (_, i) => ({ id: `demo-${i + 1}`, text: text.replace("Ok", `T${i}`), made: 1 }));
    tracks.splice(1, 0, { id: "demo-99", text: "title: " + "x".repeat(M.maxTextBytes + 5), made: 1 });
    const st = new FakeStorage();
    st.setItem(M.storageKey, JSON.stringify({ version: 1, tracks, nextId: 100, reward: { cooldownLeft: 1e300, times: 1 } }));
    const loaded = new Store(st, M.storageKey, { reserved: () => [], log: () => {} });
    expect(loaded.count).toBe(M.maxTracks);
    expect(loaded.list().every((d) => d.text.length <= M.maxTextBytes)).toBe(true);
    expect(loaded.rewardLeft()).toBeLessThanOrEqual(M.reward.cooldownHours * 60);
  });
});
