import { describe, expect, it, vi } from "vitest";
import goldenText from "./golden/sleep-frames.json?raw";
import { NO_INPUT } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { AchievementsFeature } from "./achievements/feature";
import { FakeStorage } from "./achievements/fake-storage";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import { hash } from "./main-room-frames";
import { attachTimeOfDay } from "./time-of-day/feature";

// Issue 078 stage 2: the draw calls of the real main room at the moments of the
// sleep sequence (docs/sleep.md section 13), so later changes to how it looks are
// deliberate. Record again with UPDATE_GOLDEN=1 after looking at the frames.
type Env = { env: Record<string, string | undefined> };
const env = (globalThis as unknown as { process?: Env }).process?.env ?? {};
const dt = 1 / 60;

function record(task: "sleep" | "nap", at: [number, number], vars: Record<string, number>, times: number[]) {
  const lines: string[] = [];
  const sprites: SpriteDrawer = {
    has: () => true,
    draw: (_c, name, x, y, _size, flip) => void lines.push(`sprite ${name} ${x} ${y} ${flip ? "flip" : ""}`),
    drawRegion: (_c, name, from, into) => void lines.push(`region ${name} ${JSON.stringify(from)} ${JSON.stringify(into)}`),
  };
  const ctx = new Proxy({}, {
    get: (_t, prop) => (...args: unknown[]) => void lines.push(`${String(prop)}(${args.map((a) => (typeof a === "object" ? "obj" : String(a))).join(",")})`),
    set: (_t, prop, value) => {
      lines.push(`${String(prop)}=${String(value)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
  const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, sprites, random: () => 0.5 });
  new AchievementsFeature(game, { storage: new FakeStorage() });
  attachTimeOfDay(game);
  game.state.onChange = undefined;
  game.state.applyEffects(Object.entries(vars).map(([id, value]) => ({ var: id, set: value })));
  game.loadLevel(game.currentLevel, at[0], at[1], task === "sleep" ? "right" : "down");
  game.update(dt, NO_INPUT);
  // Pick the task by cycling to it, then press the key.
  while (game.interaction.nearby?.id !== task) game.update(dt, { ...NO_INPUT, keys: ["Tab"] });
  game.update(dt, { ...NO_INPUT, interactPressed: true, keys: ["KeyE"] });
  const logs: { task: string; t: number; calls: number; hash: string }[] = [];
  let elapsed = 0;
  for (const t of times) {
    while (elapsed + dt / 2 < t) {
      game.update(dt, NO_INPUT);
      elapsed += dt;
    }
    lines.length = 0;
    game.render(ctx, 0.5);
    logs.push({ task, t, calls: lines.length, hash: hash(lines.join("\n")) });
  }
  vi.unstubAllGlobals();
  return logs;
}

describe("sleep sequence frames", () => {
  it("draw exactly the calls recorded when the look was approved", async () => {
    const logs = [
      ...record("sleep", [11, 4], { energy: 10, bedMade: 1, clock: 22 }, [0, 1, 2, 4, 7, 8, 8.9]),
      ...record("nap", [5, 4], { energy: 40, clock: 14 }, [0, 1, 2.5, 4, 4.9]),
    ];
    if (env.UPDATE_GOLDEN === "1") {
      // @ts-ignore node module, only used when asked to write files
      const fs = await import("node:fs");
      fs.writeFileSync(new URL("./golden/sleep-frames.json", import.meta.url), JSON.stringify(logs, null, 1) + "\n");
      return;
    }
    expect(logs).toEqual(JSON.parse(goldenText));
    // The frames really differ (the dark is drawn): no two of the sleep frames at 0 and 2 s match.
    expect(logs[0].hash).not.toBe(logs[2].hash);
  });
});
