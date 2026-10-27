import { afterAll, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { CLOCK } from "./config";
import { choice, menu, say } from "./dialog";
import { Game } from "./game";
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

const seen = { complete: 0, cancel: 0, dialogs: 0, locks: 0, dialogDuringSleep: 0 };

describe("sleep fuzz", () => {
  afterAll(() => {
    // The fuzz must actually reach every outcome, or it proves nothing.
    expect(seen.complete).toBeGreaterThan(10);
    expect(seen.cancel).toBeGreaterThan(10);
    expect(seen.dialogDuringSleep).toBeGreaterThan(10);
    expect(seen.locks).toBeGreaterThan(10);
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
          expect(advance.mock.calls.slice(advanceBefore).some((c) => c[0] === (kind === "sleep" ? 7 : 1))).toBe(true);
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
        const busyBefore = game.interaction.busy;
        const c0 = completes;
        const x0 = cancels;
        game.update(dt, c);
        const busy = game.interaction.busy;
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
      for (let i = 0; i < 60; i++) game.update(dt, NO_INPUT);
      expect(light.sleepDark).toBe(0);
      expect(light.sleepMorning).toBe(0);
      // No payout without a completion.
      if (completes === 0) expect(game.interaction.scoreboard.score).toBe(0);
      else expect(game.interaction.scoreboard.score).toBeGreaterThan(0);
    });
  }
});
