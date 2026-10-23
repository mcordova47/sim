import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { unsupportedChars } from "../render/font";
import { CutsceneActivity } from "./activities";
import { fakeHost } from "./activities/fake-host";
import { APARTMENT } from "./apartment";
import { ART_PIECES, ART_SCENES, zoomRect } from "./art-pieces";
import { VIEW } from "./config";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { TASKS } from "./tasks";
import { FULL_VIEW, ZOOM_SCALES, pushedView, zoomProblem, type ViewRect } from "./view-zoom";

// Issue 061: "Admire the art" pushes in on one of ten pieces.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const rooms = APARTMENT.rooms;

afterEach(() => vi.unstubAllGlobals());
const stubDocument = () =>
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }),
  });
const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;

const isIntegerScale = (r: ViewRect) => ZOOM_SCALES.includes(VIEW.width / r.w) && r.h === VIEW.height / (VIEW.width / r.w);
const inside = (r: ViewRect) => r.x >= 0 && r.y >= 0 && r.x + r.w <= VIEW.width && r.y + r.h <= VIEW.height;

describe("zoom targets", () => {
  it("accepts whole-number windows inside the picture and rejects the rest", () => {
    expect(zoomProblem({ x: 0, y: 0, w: 320, h: 192 })).toBeNull();
    expect(zoomProblem({ x: 100, y: 50, w: 80, h: 48 })).toBeNull();
    expect(zoomProblem({ x: 280, y: 168, w: 40, h: 24 })).toBeNull();
    for (const bad of [
      null, 5, {}, { x: 0, y: 0, w: 100, h: 60 }, { x: 0, y: 0, w: 3 * 40, h: 72 }, { x: 0, y: 0, w: 160, h: 100 },
      { x: 0.5, y: 0, w: 160, h: 96 }, { x: -1, y: 0, w: 160, h: 96 }, { x: 161, y: 0, w: 160, h: 96 },
      { x: 0, y: 97, w: 160, h: 96 }, { x: 0, y: 0, w: 640, h: 384 }, { x: 0, y: 0, w: NaN, h: NaN },
      { x: 0, y: 0, w: 106, h: 64 }, { x: "0", y: 0, w: 160, h: 96 },
    ]) {
      expect(zoomProblem(bad), JSON.stringify(bad)).not.toBeNull();
    }
  });

  it("the cutscene rejects bad zoom steps at load", () => {
    // The constructor does not validate; the activity factory does.
    const task = (step: unknown) => ({ ...TASKS[0], activity: { type: "cutscene", steps: [step] } });
    const findTask = (step: unknown) => () => validateTask(task(step));
    expect(findTask({ zoom: { to: { x: 0, y: 0, w: 100, h: 60 }, ms: 100 } })).toThrow(/zoom target/);
    expect(findTask({ zoom: { to: { x: 0, y: 0, w: 160, h: 96 }, ms: -1 } })).toThrow(/ms/);
    expect(findTask({ zoom: { to: { x: 0, y: 0, w: 160, h: 96 } } })).toThrow(/ms/);
    expect(findTask({ zoom: { to: { x: 0, y: 0, w: 160, h: 96 }, ms: 100 } })).not.toThrow();
    expect(findTask({ pick: { var: "nope", scenes: [[{ wait: 1 }]] } })).toThrow(/unknown state/);
    expect(findTask({ pick: { var: "artPiece", scenes: [] } })).toThrow();
    expect(findTask({ pick: { var: "artPiece", scenes: [[{ zoom: { to: { x: 1, y: 1, w: 7, h: 7 }, ms: 1 } }]] } })).toThrow(/zoom target/);
  });

  it("every piece, its scene and its windows are valid", () => {
    expect(ART_PIECES).toHaveLength(10);
    expect(ART_SCENES).toHaveLength(10);
    for (const p of ART_PIECES) {
      expect(inside({ ...p.at }), p.id).toBe(true);
      for (const s of [2, 4, 8]) {
        const r = zoomRect(p.at, s);
        expect(zoomProblem(r), `${p.id} ${s}x`).toBeNull();
        expect(r.w).toBe(VIEW.width / s);
      }
    }
    for (const scene of ART_SCENES) for (const step of scene) if ("zoom" in step) expect(zoomProblem(step.zoom.to)).toBeNull();
    // The real task validates (a bad window would throw at load).
    expect(() => validateTask(TASKS.find((t) => t.id === "admire-art")!)).not.toThrow();
  });

  it("at 8x the piece's center is on screen and above where the dialog covers", () => {
    for (const p of ART_PIECES) {
      const r = zoomRect(p.at, 8);
      const cx = p.at.x + p.at.w / 2;
      const cy = p.at.y + p.at.h / 2;
      expect(cx).toBeGreaterThanOrEqual(r.x);
      expect(cx).toBeLessThan(r.x + r.w);
      expect(cy - r.y, p.id).toBeGreaterThanOrEqual(0);
      expect((cy - r.y) / r.h, p.id).toBeLessThan(0.6);
    }
  });

  it("a push only ever shows whole-number scales inside the picture, with whole-number positions", () => {
    const wall = FULL_VIEW;
    for (const p of ART_PIECES) {
      const stops = [wall, zoomRect(p.at, 2), zoomRect(p.at, 4), zoomRect(p.at, 8)];
      for (let a = 0; a < stops.length; a++) {
        for (let b = 0; b < stops.length; b++) {
          if (a === b) continue;
          for (let i = 0; i < 200; i++) {
            const v = pushedView(stops[a], stops[b], i / 200);
            expect(isIntegerScale(v), `${p.id} ${a}->${b} at ${i}`).toBe(true);
            expect(inside(v)).toBe(true);
            expect(Number.isInteger(v.x) && Number.isInteger(v.y)).toBe(true);
          }
        }
      }
    }
  });
});

describe("the text", () => {
  it("is three plain lines per piece, in the pixel font, no names", () => {
    const ids = new Set<string>();
    for (const p of ART_PIECES) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.lines).toHaveLength(3);
      for (const line of p.lines) {
        expect(unsupportedChars(line), line).toEqual([]);
        expect(line, "the narrator never mentions the medium").not.toMatch(/pixel|square|block|scale|zoom|resolution|closer|grid|bitmap|sprite|game|screen/i);
        expect(line.length).toBeGreaterThan(20);
        expect(line.length).toBeLessThanOrEqual(130);
      }
    }
  });
});

// Runs a task's activity spec through the same check the game uses at load.
import { validateActivity } from "./activity";
function validateTask(task: { id: string; activity?: unknown }) {
  validateActivity(task as never, { hasState: (id: string) => id === "artPiece" || id === "mood" });
}

// Plays the real task in the real game, with a sprite stub that records what is drawn.
function admireGame() {
  stubDocument();
  const drawn: string[] = [];
  const regions: ViewRect[] = [];
  const sprites = {
    has: () => true,
    draw: (_c: unknown, name: string) => void drawn.push(name),
    drawRegion: (_c: unknown, name: string, r: ViewRect) => {
      drawn.push(name);
      regions.push({ ...r });
    },
  };
  const spot = taskSpots(rooms.main).find((s) => s.id === "admire-art")!;
  const main = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => i.id === "admire-art") };
  const game = new Game(main, { rooms: { ...rooms, main }, random: () => 0.5, sprites });
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  const frame = () => {
    drawn.length = 0;
    regions.length = 0;
    game.render(ctx, 1);
    return { shown: drawn.includes("view-gallery-wall"), region: regions.at(-1) };
  };
  return { game, frame, drawn };
}

describe("playing it", () => {
  it("goes through the ten pieces in turn, never the same twice in a row, then round again", () => {
    const { game, frame } = admireGame();
    const seen: number[] = [];
    for (let run = 0; run < 12; run++) {
      const before = game.state.get("artPiece");
      game.update(dt, press);
      expect(game.interaction.busy).toBe(true);
      let last: ViewRect | undefined;
      let levels = new Set<number>();
      for (let i = 0; i < 60 * 60 && game.interaction.busy; i++) {
        game.update(dt, game.dialogOpen && i % 15 === 0 ? press : NO_INPUT);
        const f = frame();
        if (f.region) {
          last = f.region;
          levels.add(VIEW.width / f.region.w);
        }
      }
      expect(game.interaction.busy).toBe(false);
      // It visited 2x, 4x and 8x, ending at the 8x window of this piece.
      expect([...levels].sort()).toEqual([2, 4, 8]);
      expect(last).toEqual(zoomRect(ART_PIECES[before].at, 8));
      seen.push(before);
      // Wait out the cooldown.
      for (let i = 0; i < 70 * 60; i++) game.update(dt, NO_INPUT);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1]);
  });

  it("the picture is only shown while the scene runs, and the player does not move", () => {
    const { game, frame } = admireGame();
    expect(frame().shown).toBe(false);
    const at = { c: game.player.col, r: game.player.row };
    game.update(dt, press);
    let showed = false;
    for (let i = 0; i < 60 * 60 && game.interaction.busy; i++) {
      game.update(dt, game.dialogOpen && i % 15 === 0 ? press : NO_INPUT);
      expect(frame().shown).toBe(game.interaction.busy);
      showed ||= frame().shown;
      expect({ c: game.player.col, r: game.player.row }).toEqual(at);
    }
    expect(showed).toBe(true);
    expect(frame().shown).toBe(false);
    expect(game.inputLocked).toBe(false);
  });

  it("Escape at every frame of the whole scene restores everything", () => {
    // One run to find how long the scene is when read at a steady pace.
    const total = (() => {
      const { game } = admireGame();
      game.update(dt, press);
      let n = 0;
      for (; game.interaction.busy && n < 6000; n++) game.update(dt, game.dialogOpen && n % 15 === 0 ? press : NO_INPUT);
      return n;
    })();
    expect(total).toBeGreaterThan(200);
    for (let at = 0; at <= total; at += 3) {
      const { game, frame } = admireGame();
      const score = game.interaction.scoreboard.score;
      const mood = game.state.get("mood");
      const piece = game.state.get("artPiece");
      game.update(dt, press);
      for (let i = 0; i < at && game.interaction.busy; i++) game.update(dt, game.dialogOpen && i % 15 === 0 ? press : NO_INPUT);
      if (!game.interaction.busy) continue;
      game.update(dt, esc);
      for (let i = 0; i < 3; i++) game.update(dt, NO_INPUT);
      expect(game.interaction.busy, `at ${at}`).toBe(false);
      expect(game.dialogOpen).toBe(false);
      expect(game.inputLocked).toBe(false);
      expect(frame().shown).toBe(false);
      expect(game.interaction.scoreboard.score).toBe(score);
      expect(game.state.get("mood")).toBeCloseTo(mood, 0);
      expect(game.state.get("artPiece")).toBe(piece);
      // And it can be started again at once.
      game.update(dt, press);
      expect(game.interaction.busy).toBe(true);
    }
  });
});

describe("fuzz: random Escape timing and input locks", () => {
  // A small seeded generator, so a failure can be replayed.
  function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  for (let seed = 1; seed <= 60; seed++) {
    it(`seed ${seed}`, () => {
      const r = rng(seed);
      const { game, frame } = admireGame();
      const releases: (() => void)[] = [];
      // Do the task a few times (skipping some by Escape), skipping the cooldown by waiting.
      for (let round = 0; round < 3; round++) {
        game.update(dt, press);
        if (!game.interaction.busy) {
          for (let i = 0; i < 70 * 60; i++) game.update(dt, NO_INPUT);
          game.update(dt, press);
        }
        expect(game.interaction.busy, `seed ${seed} round ${round} start`).toBe(true);
        const escapeAt = r() < 0.25 ? Infinity : Math.floor(r() * 900);
        for (let i = 0; i < 6000 && game.interaction.busy; i++) {
          // Randomly take an outside lock (another screen opening), release some.
          if (r() < 0.01) releases.push(game.lockInput());
          if (r() < 0.02 && releases.length) releases.pop()!();
          const roll = r();
          const c: Controls = i >= escapeAt && roll < 0.7 ? esc : roll < 0.85 ? press : NO_INPUT;
          // Escape and E at random, even in the same frame.
          game.update(dt, roll > 0.97 ? { ...esc, interactPressed: true } : c);
          const f = frame();
          // The picture is only ever up while the task runs.
          if (f.shown) expect(game.interaction.busy).toBe(true);
          if (f.region) {
            expect(isIntegerScale(f.region)).toBe(true);
            expect(inside(f.region)).toBe(true);
          }
        }
        // Let go of every outside lock; then it must end if it has not, promptly, with Escape.
        while (releases.length) releases.pop()!();
        for (let i = 0; i < 4000 && game.interaction.busy; i++) game.update(dt, i % 5 === 0 ? esc : press);
        for (let i = 0; i < 3; i++) game.update(dt, NO_INPUT);
        expect(game.interaction.busy, `seed ${seed} round ${round} end`).toBe(false);
        expect(game.dialogOpen).toBe(false);
        expect(game.inputLocked).toBe(false);
        expect(frame().shown).toBe(false);
        for (let i = 0; i < 70 * 60; i++) game.update(dt, NO_INPUT);
      }
    });
  }
});

describe("the cutscene alone", () => {
  it("shows the whole picture at first and each zoom lands exactly on its window", () => {
    const f = fakeHost();
    f.host.getState = () => 3;
    const target = zoomRect(ART_PIECES[3].at, 2);
    const cs = new CutsceneActivity([{ view: "v" }, { zoom: { to: target, ms: 300 } }, { say: "x" }], f.host);
    cs.update(0, NO_INPUT);
    expect(cs.shownView).toEqual(FULL_VIEW);
    for (let i = 0; i < 10; i++) cs.update(0.05, NO_INPUT);
    expect(cs.shownView).toEqual(target);
    expect(f.dialogs).toHaveLength(1);
    cs.cancel();
    expect(cs.shownView).toEqual(FULL_VIEW);
  });

  it("pick plays the scene the variable points at, wrapping", () => {
    for (const [value, expected] of [[0, "a"], [1, "b"], [2, "a"], [-1, "b"]] as const) {
      const f = fakeHost();
      f.host.getState = () => value;
      const cs = new CutsceneActivity([{ pick: { var: "v", scenes: [[{ cue: "a" }], [{ cue: "b" }]] } }, { cue: "end" }], f.host);
      cs.update(0.1, NO_INPUT);
      expect(f.cues).toEqual([expected, "end"]);
      expect(cs.done).toBe(true);
    }
  });
});
