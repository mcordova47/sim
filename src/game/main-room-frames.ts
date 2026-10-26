import { vi } from "vitest";
import { NO_INPUT } from "../input/controls";
import type { SpriteDrawer } from "../render/sprites";
import { AchievementsFeature } from "./achievements/feature";
import { FakeStorage } from "./achievements/fake-storage";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import { attachTimeOfDay } from "./time-of-day/feature";

// Test helper (issue 062): renders the real main room headless and logs every
// drawing call, so two builds can be compared call for call.

export interface Scenario {
  name: string;
  vars: Record<string, number>;
  // Where the player stands, as tile column and row.
  at: [number, number];
}

// The look of the room across the things that change it: the plant's stages and
// drooping, night with the lamp glow, the bed, the dishes and the blinds.
export const SCENARIOS: Scenario[] = [
  { name: "start", vars: {}, at: [5, 4] },
  { name: "plant-0", vars: { plantStage: 0 }, at: [9, 4] },
  { name: "plant-1", vars: { plantStage: 1 }, at: [9, 4] },
  { name: "plant-2", vars: { plantStage: 2 }, at: [9, 4] },
  { name: "plant-3", vars: { plantStage: 3 }, at: [9, 4] },
  { name: "plant-wilted", vars: { plantStage: 2, plantDry: 120 }, at: [9, 4] },
  { name: "night", vars: { clock: 22 }, at: [8, 5] },
  { name: "dusk-blinds", vars: { clock: 19.5, blinds: 1, bedMade: 1, dishes: 5 }, at: [11, 6] },
  { name: "plate", vars: { plate: 1, clock: 19 }, at: [2, 3] },
  { name: "blinds-closed-day", vars: { clock: 12, blinds: 0 }, at: [17, 4] },
  { name: "morning", vars: { clock: 6.5, mood: 90, energy: 20 }, at: [3, 3] },
];

// A small string hash (cyrb53), so the log can be compared without node APIs.
function hash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export interface FrameLog {
  scenario: string;
  frame: number;
  calls: number;
  hash: string;
}

// Draw calls in order: every canvas call with its arguments, every property
// set (the fill colour and so on) and every sprite the game asks for.
export function recordFrames(frames = 4, scenarios: Scenario[] = SCENARIOS): { logs: FrameLog[]; text: Record<string, string> } {
  const logs: FrameLog[] = [];
  const text: Record<string, string> = {};
  for (const s of scenarios) {
    const lines: string[] = [];
    const sprites: SpriteDrawer = {
      has: () => true,
      draw: (_c, name, x, y, _size, flip) => void lines.push(`sprite ${name} ${x} ${y} ${flip ? "flip" : ""}`),
      drawRegion: (_c, name, from, into) => void lines.push(`region ${name} ${JSON.stringify(from)} ${JSON.stringify(into)}`),
    };
    const ctx = new Proxy(
      {},
      {
        get: (_t, prop) => (...args: unknown[]) => void lines.push(`${String(prop)}(${args.map((a) => (typeof a === "object" ? "obj" : String(a))).join(",")})`),
        set: (_t, prop, value) => {
          lines.push(`${String(prop)}=${String(value)}`);
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) });
    const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, sprites, random: () => 0.5 });
    new AchievementsFeature(game, { storage: new FakeStorage() });
    attachTimeOfDay(game);
    game.state.onChange = undefined;
    game.state.applyEffects(Object.entries(s.vars).map(([id, value]) => ({ var: id, set: value })));
    game.loadLevel(game.currentLevel, s.at[0], s.at[1], "down");
    for (let f = 0; f < frames; f++) {
      lines.length = 0;
      game.update(1 / 60, NO_INPUT);
      game.render(ctx, 0.5);
      const body = lines.join("\n");
      logs.push({ scenario: s.name, frame: f, calls: lines.length, hash: hash(body) });
      text[`${s.name}#${f}`] = body;
    }
  }
  vi.unstubAllGlobals();
  return { logs, text };
}
