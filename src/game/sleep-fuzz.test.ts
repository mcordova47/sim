import { afterAll, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { CLOCK, SLEEP, SLEEP_WAKE, SOUND } from "./config";
import { parseTrack } from "./music/track";
import { FakeAudioContext } from "./sound/fake-audio";
import { SoundFeature, type KeyEventLike } from "./sound/feature";
import { choice, menu, say } from "./dialog";
import { Game } from "./game";
import { wakeJump } from "./state";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";
import { TimeOfDayFeature } from "./time-of-day/feature";

// A fuzz of the sleep sequence against the real Game (issue 078): random Escape
// timing, input locks, dialogs and repeated sleeps and naps, with the invariants
// checked every frame and at the end.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const seen = { complete: 0, cancel: 0, dialogs: 0, locks: 0, dialogDuringSleep: 0, ducked: 0, mutes: 0, snores: 0, silent: 0 };
const RECORD = parseTrack("title: One\n[a square]\nC4:1 D4:1", "1.track", "one");

describe("sleep fuzz", () => {
  afterAll(() => {
    // The fuzz must actually reach every outcome, or it proves nothing.
    expect(seen.complete).toBeGreaterThan(10);
    expect(seen.cancel).toBeGreaterThan(10);
    expect(seen.dialogDuringSleep).toBeGreaterThan(10);
    expect(seen.locks).toBeGreaterThan(10);
    // The sound side too: records ducked, mute pressed during sleeps, snores heard, runs with no audio.
    expect(seen.ducked).toBeGreaterThan(5);
    expect(seen.mutes).toBeGreaterThan(10);
    expect(seen.snores).toBeGreaterThan(5);
    expect(seen.silent).toBeGreaterThan(5);
  });

  for (let seed = 1; seed <= 150; seed++) {
    it(`seed ${seed}`, () => {
      const r = rng(seed * 7919);
      const kind = r() < 0.5 ? "sleep" : "nap";
      const level = parseTileMap(["#####", "#.@X#", "#####"], { X: { tasks: [kind] } }, { tasks: TASKS });
      const game = new Game({ ...level, facing: "right" }, { random: r });
      const light = new TimeOfDayFeature(game);
      const hour = Math.floor(r() * 24 * 4) / 4;
      game.state.applyEffects([{ var: "clock", set: hour }, { var: "energy", set: 10 + Math.floor(r() * 40) }]);
      const advance = vi.spyOn(game.deliveries, "advance");

      // The sound: a fake audio context that is unlocked at a random frame (or never),
      // a record playing or not, and mute pressed at random.
      const ctx = new FakeAudioContext();
      const storage = new FakeStorage();
      const keyFns: ((e: KeyEventLike) => void)[] = [];
      const sound = new SoundFeature(game, {
        audio: () => ctx,
        storage,
        keys: { addEventListener: (_t, fn) => void keyFns.push(fn) },
        random: r,
        tracks: [RECORD],
        start: "main",
      });
      const hasRecord = r() < 0.6;
      if (hasRecord) sound.setTrack(RECORD);
      let muted = false;
      const unlockAt = r() < 0.2 ? Infinity : Math.floor(r() * 600);
      const key = (code: string) => keyFns.forEach((fn) => fn({ code }));

      let open = 0; // starts minus ends
      let starts = 0;
      let completes = 0;
      let cancels = 0;
      game.events.on("taskStart", () => { open++; starts++; expect(open).toBeLessThanOrEqual(1); });
      game.events.on("taskComplete", () => { open--; completes++; });
      game.events.on("taskCancelled", () => { open--; cancels++; });

      // How often Escape is pressed varies by run, so some runs finish and some are cut short.
      const escRate = [0, 0.0005, 0.002, 0.01][Math.floor(r() * 4)];
      const locks: (() => void)[] = [];
      // Per run: when the run's first sleep started, the values then.
      let startClock = 0;
      let startEnergy = 0;
      let wasBusy = false;
      let runElapsed = 0;
      let advanceBefore = 0;
      const checkRun = (ended: "complete" | "cancel") => {
        if (ended === "complete") {
          expect(game.state.get("energy")).toBeGreaterThanOrEqual(kind === "sleep" ? 100 : Math.min(100, startEnergy + 25) - 5);
          const jumped = (game.state.get("clock") - startClock + 24) % 24;
          expect(jumped).toBeGreaterThanOrEqual(kind === "sleep" ? 7 - 1e-6 : 1 - 1e-6);
          if (kind === "sleep") expect(jumped).toBeCloseTo(wakeJump(startClock, SLEEP_WAKE), 3);
          expect(advance.mock.calls.slice(advanceBefore).some((c) => Math.abs(c[0] - (kind === "sleep" ? wakeJump(startClock, SLEEP_WAKE) : 1)) < 1e-6)).toBe(true);
        } else {
          // Cancelled: no jump. Only the ordinary ticking since waking can have moved the clock.
          const moved = (game.state.get("clock") - startClock + 24) % 24;
          expect(moved).toBeLessThanOrEqual(((runElapsed * CLOCK.minutesPerSecond) / 60) + 0.01);
          expect(advance.mock.calls.slice(advanceBefore).some((c) => c[0] >= 1)).toBe(false);
          expect(game.state.get("energy")).toBeLessThanOrEqual(startEnergy);
        }
      };

      for (let f = 0; f < 60 * 40; f++) {
        const roll = r();
        let c: Controls = NO_INPUT;
        if (roll < escRate) c = esc;
        else if (roll < 0.14 && roll >= 0.1) c = press;
        else if (roll >= 0.14 && roll < 0.1405) { locks.push(game.lockInput()); seen.locks++; }
        else if (roll >= 0.15 && roll < 0.16 && locks.length) locks.pop()!();
        else if (roll >= 0.2 && roll < 0.2015 && !game.dialogOpen) { seen.dialogs++; if (game.interaction.busy) seen.dialogDuringSleep++; game.openDialog(r() < 0.5 ? say("zzz. ".repeat(10)) : menu("Pick", [choice("A"), choice("B")])); }
        else if (roll >= 0.3 && roll < 0.33 && game.dialogOpen) c = press;
        if (f === unlockAt) key("KeyA");
        // Mute pressed now and then, whatever is going on (not while the dialog or a lock has the keys: it is a key press all the same).
        if (r() < 0.002) { key("KeyM"); muted = !muted; seen.mutes++; }
        const busyBefore = game.interaction.busy;
        const c0 = completes;
        const x0 = cancels;
        ctx.currentTime += dt;
        game.update(dt, c);
        const busy = game.interaction.busy;
        // Whatever happens, the sequence never touches mute or the record, and the buses stay inside their range.
        expect(sound.muted).toBe(muted);
        expect(sound.track).toBe(hasRecord ? RECORD : null);
        if (sound.engine.ready) {
          const music = sound.engine.busLevel("music")!;
          const lull = sound.engine.busLevel("sleep")!;
          expect(music).toBeGreaterThanOrEqual(SOUND.musicLevel * Math.min(SLEEP.sleep.duckTo, 1) - 1e-9);
          expect(music).toBeLessThanOrEqual(SOUND.musicLevel + 1e-9);
          expect(lull).toBeGreaterThanOrEqual(-1e-9);
          expect(lull).toBeLessThanOrEqual(SLEEP.sleep.lullabyGain + 1e-9);
          if (busy && kind === "sleep" && hasRecord && game.sleepScene!.t > SLEEP.sleep.duckDown + 0.1 && game.sleepScene!.phase !== "wake" && sound.engine.sleep.state === "sleeping") {
            expect(music).toBeCloseTo(SOUND.musicLevel * SLEEP.sleep.duckTo, 6);
            seen.ducked++;
          }
          if (kind === "nap") expect(music).toBe(SOUND.musicLevel);
        } else if (busy) seen.silent++;
        if (!wasBusy && busy) {
          startClock = game.state.get("clock");
          startEnergy = game.state.get("energy");
          advanceBefore = advance.mock.calls.length;
          runElapsed = 0;
        }
        if (busy) {
          runElapsed = 0;
          // While it runs the clock is held exactly, locks and dialogs or not.
          expect(game.state.get("clock")).toBe(startClock);
          expect(game.sleepScene).not.toBeNull();
          expect(game.sleepScene!.dark).toBeGreaterThanOrEqual(0);
          expect(game.sleepScene!.dark).toBeLessThanOrEqual(1);
          expect(light.sleepDark).toBeLessThanOrEqual(1);
        } else {
          expect(game.sleepScene).toBeNull();
          runElapsed += dt;
          if ((completes > c0 || cancels > x0) && busyBefore) {
            // Checked the frame it ended (runElapsed is one frame of ordinary ticking at most).
            seen[completes > c0 ? "complete" : "cancel"]++;
            checkRun(completes > c0 ? "complete" : "cancel");
            runElapsed = 0;
          }
        }
        wasBusy = busy;
        expect(open).toBeGreaterThanOrEqual(0);
        expect(open).toBe(busy ? 1 : 0);
        expect(starts).toBe(completes + cancels + open);
        if (!busy) {
          // Another attempt: restart it sometimes (the cooldown after a finish refuses it).
          wasBusy = false;
        }
      }

      // Let everything settle: release every lock, close any dialog, then finish or cancel.
      while (locks.length) locks.pop()!();
      for (let i = 0; i < 400 && game.dialogOpen; i++) game.update(dt, i % 2 ? press : esc);
      for (let i = 0; i < 60 * 12 && game.interaction.busy; i++) game.update(dt, i === 0 && r() < 0.5 ? esc : NO_INPUT);
      expect(game.interaction.busy).toBe(false);
      expect(game.inputLocked).toBe(false);
      expect(game.dialogOpen).toBe(false);
      expect(open).toBe(0);
      expect(starts).toBe(completes + cancels);
      expect(game.sleepScene).toBeNull();
      // The light is back to normal within a second, however it ended.
      for (let i = 0; i < 60; i++) { ctx.currentTime += dt; game.update(dt, NO_INPUT); }
      // And so is the sound: the record at its level, the lullaby gone and stopped, mute as the player left it.
      expect(sound.engine.sleep.state).toBe("idle");
      expect(sound.engine.sleep.player.track).toBeNull();
      expect(sound.muted).toBe(muted);
      expect(sound.track).toBe(hasRecord ? RECORD : null);
      if (sound.engine.ready) {
        expect(sound.engine.busLevel("music")).toBeCloseTo(SOUND.musicLevel, 9);
        expect(sound.engine.busLevel("sleep")).toBeCloseTo(0, 9);
      }
      seen.snores += ctx.oscillators.filter((o) => o.type === "sawtooth").length > 0 ? 1 : 0;
      // What is saved is what the player did (mute, the record): never a duck.
      const saved = storage.getItem(SOUND.storageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        expect(parsed.muted).toBe(muted);
        expect(parsed.track).toBe(hasRecord ? "one" : null);
        expect(saved).not.toMatch(/duck|sleep/i);
      }
      expect(light.sleepDark).toBe(0);
      expect(light.sleepMorning).toBe(0);
      // No payout without a completion.
      if (completes === 0) expect(game.interaction.scoreboard.score).toBe(0);
      else expect(game.interaction.scoreboard.score).toBeGreaterThan(0);
    });
  }
});
