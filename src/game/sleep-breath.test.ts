import { describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { AchievementsFeature } from "./achievements/feature";
import { FakeStorage } from "./achievements/fake-storage";
import { APARTMENT } from "./apartment";
import { SLEEP, SLEEP_BREATH } from "./config";
import { Game } from "./game";
import { POSES, breathBand } from "./poses";
import { breathCycle, breathOffset, sleepSceneAt, sleepTotal } from "./sleep";
import { attachTimeOfDay } from "./time-of-day/feature";

// The breath, stage 3 (issue 078, docs/sleep.md section 5): a one pixel band of the
// covers on the bed, a whole-sprite bob on the sofa, and 0 whenever there is no scene.

const dt = 1 / 60;

describe("the breath (pure)", () => {
  for (const kind of ["sleep", "nap"] as const) {
    const s = SLEEP[kind];
    it(`${kind}: at rest at the start and the end, and all through the fall and the wake`, () => {
      expect(breathOffset(s, 0)).toBe(0);
      expect(breathOffset(s, sleepTotal(s))).toBe(0);
      for (let t = 0; t < s.fall; t += 0.05) expect(breathOffset(s, t)).toBe(0);
      for (let t = s.fall + s.asleep; t <= sleepTotal(s); t += 0.05) expect(breathOffset(s, t)).toBe(0);
      expect(breathCycle(s, 0)).toBeNull();
      expect(breathCycle(s, sleepTotal(s))).toBeNull();
    });
    it(`${kind}: only whole pixels, up for the middle of each breath and down for the rest`, () => {
      const values = new Set<number>();
      let up = 0;
      let n = 0;
      for (let t = s.fall; t < s.fall + s.asleep; t += 0.01) {
        const v = breathOffset(s, t);
        values.add(v);
        const p = breathCycle(s, t)!;
        expect(v, `t=${t}`).toBe(p >= SLEEP_BREATH.riseAt && p < SLEEP_BREATH.fallAt ? s.breathPixels : 0);
        if (v > 0) up++;
        n++;
      }
      expect([...values].sort()).toEqual([0, s.breathPixels]);
      expect(Number.isInteger(s.breathPixels)).toBe(true);
      expect(up / n).toBeGreaterThan(0.3); // up half the time, about
      expect(up / n).toBeLessThan(0.7);
    });
  }

  it("the scene carries it, and each breath is one period long", () => {
    const s = SLEEP.sleep;
    expect(sleepSceneAt("sleep", s.fall + 0.5 * s.breathPeriod, 8.5).breath).toBe(1);
    expect(sleepSceneAt("sleep", s.fall + 0.1 * s.breathPeriod, 8.5).breath).toBe(0);
    expect(sleepSceneAt("sleep", s.fall + 1.5 * s.breathPeriod, 8.5).breath).toBe(1);
    expect(sleepSceneAt("sleep", 0, 8.5).breath).toBe(0);
  });

  it("the bands are inside their pictures, and the sofa (the person alone) has none so the whole picture moves", () => {
    const bed = POSES["sleep-bed"];
    for (const [sprite, band] of [[bed.sprite, bed.breath!], [bed.variants![0].sprite, bed.variants![0].breath!]] as const) {
      expect(breathBand(bed, sprite)).toBe(band);
      expect(band.x).toBeGreaterThanOrEqual(0);
      expect(band.y).toBeGreaterThanOrEqual(1); // there is a row above it to rise into
      expect(band.x + band.w).toBeLessThanOrEqual(bed.size.w);
      expect(band.y + band.h).toBeLessThanOrEqual(bed.size.h);
    }
    expect(breathBand(POSES["sit-sofa"], "player-sit-sofa")).toBeNull();
  });
});

// Renders the real main room and logs the draw calls of one frame.
function frameAt(task: "sleep" | "nap", vars: Record<string, number>, seconds: number | null) {
  const lines: string[] = [];
  const sprites: SpriteDrawer = {
    has: () => true,
    draw: (_c, name, x, y) => void lines.push(`sprite ${name} ${x} ${y}`),
    drawRegion: (_c, name, from) => void lines.push(`region ${name} ${JSON.stringify(from)}`),
  };
  const ctx = new Proxy({}, {
    get: (_t, prop) => (...args: unknown[]) => void lines.push(`${String(prop)}(${args.map((a) => (typeof a === "object" ? "obj" : String(a))).join(",")})`),
    set: () => true,
  }) as unknown as CanvasRenderingContext2D;
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, sprites, random: () => 0.5 });
  new AchievementsFeature(game, { storage: new FakeStorage() });
  attachTimeOfDay(game);
  game.state.onChange = undefined;
  game.state.applyEffects(Object.entries(vars).map(([id, value]) => ({ var: id, set: value })));
  game.loadLevel(game.currentLevel, task === "sleep" ? 11 : 5, 4, task === "sleep" ? "right" : "down");
  game.update(dt, NO_INPUT);
  if (seconds !== null) {
    while (game.interaction.nearby?.id !== task) game.update(dt, { ...NO_INPUT, keys: ["Tab"] });
    game.update(dt, { ...NO_INPUT, interactPressed: true, keys: ["KeyE"] });
    for (let t = 0; t < seconds; t += dt) game.update(dt, NO_INPUT);
  }
  lines.length = 0;
  game.render(ctx, 0.5);
  vi.unstubAllGlobals();
  const bed = game.currentLevel.pieces.find((p) => p.sprite === "bed-made")!.bounds;
  return { lines, game, bed };
}
const spriteNamesIn = (lines: string[]) => lines.filter((l) => l.startsWith("sprite ")).map((l) => l.split(" ")[1]);
const callOf = (lines: string[], name: string) => lines.find((l) => l.startsWith(`sprite ${name} `))!;

describe("the breath on the bed (recorded draw calls)", () => {
  const night = { energy: 10, bedMade: 1, clock: 22 };

  it("cuts the covers band from the same sprite and draws it one pixel higher while the chest is up", () => {
    const rest = frameAt("sleep", night, 2.1);
    expect(rest.game.sleepScene!.breath).toBe(0);
    expect(rest.lines.some((l) => l.startsWith("region "))).toBe(false);

    const up = frameAt("sleep", night, 3.5); // 1.5 s into the first breath: up
    expect(up.game.sleepScene!.breath).toBe(1);
    const band = POSES["sleep-bed"].breath!;
    const at = up.lines.findIndex((l) => l.startsWith("region player-sleep-bed "));
    expect(at).toBeGreaterThan(0);
    expect(up.lines[at]).toBe(`region player-sleep-bed ${JSON.stringify(band)}`);
    // Drawn after the whole picture, translated to the band's place, one pixel up.
    const whole = up.lines.findIndex((l) => l.startsWith("sprite player-sleep-bed "));
    expect(whole).toBeLessThan(at);
    expect(up.lines[at - 1]).toBe(`translate(${up.bed.x + band.x},${up.bed.y + band.y - 1})`);
    // The bed itself does not move, and the order things are drawn in does not change.
    expect(callOf(up.lines, "player-sleep-bed")).toBe(callOf(rest.lines, "player-sleep-bed"));
    expect(spriteNamesIn(up.lines)).toEqual(spriteNamesIn(rest.lines));
  });

  it("the unmade bed breathes with its own band", () => {
    const up = frameAt("sleep", { ...night, bedMade: 0 }, 3.5);
    const band = POSES["sleep-bed"].variants![0].breath!;
    expect(up.lines.some((l) => l === `region player-sleep-bed-unmade ${JSON.stringify(band)}`)).toBe(true);
    expect(up.lines.some((l) => l.startsWith("region player-sleep-bed "))).toBe(false);
  });

  it("is at rest (no band) at the start, while falling asleep, when waking, and with no scene at all", () => {
    for (const t of [0, 1, 1.9, 7.1, 8.5, 8.99]) {
      const f = frameAt("sleep", night, t);
      expect(f.game.sleepScene?.breath ?? 0, `t=${t}`).toBe(0);
      expect(f.lines.some((l) => l.startsWith("region ")), `t=${t}`).toBe(false);
    }
    const none = frameAt("sleep", night, null);
    expect(none.game.sleepScene).toBeNull();
    expect(none.lines.some((l) => l.startsWith("region "))).toBe(false);
  });

  it("goes down again in the same breath", () => {
    const down = frameAt("sleep", night, 4.6); // p = 0.87
    expect(down.game.sleepScene!.breath).toBe(0);
    expect(down.lines.some((l) => l.startsWith("region "))).toBe(false);
  });
});

describe("the breath on the sofa nap (recorded draw calls)", () => {
  it("bobs the whole picture one pixel up while the chest is up, and not otherwise", () => {
    const day = { energy: 40, clock: 14 };
    const rest = frameAt("nap", day, 1.2);
    expect(rest.game.sleepScene!.breath).toBe(0);
    const up = frameAt("nap", day, 1.0 + 0.4 * SLEEP.nap.breathPeriod);
    expect(up.game.sleepScene!.breath).toBe(1);
    const [, , x, y0] = callOf(rest.lines, "player-sit-sofa").split(" ");
    const [, , x1, y1] = callOf(up.lines, "player-sit-sofa").split(" ");
    expect(x1).toBe(x);
    expect(Number(y1)).toBe(Number(y0) - 1);
    expect(up.lines.some((l) => l.startsWith("region "))).toBe(false);
    expect(spriteNamesIn(up.lines)).toEqual(spriteNamesIn(rest.lines));
  });
});
