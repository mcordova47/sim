import { ACHIEVEMENTS } from "../achievements/data";
import { DECOR_DATA } from "../decor-data";
import { STATE_VARS } from "../state-vars";
import { CHECKPOINTS } from "../delivery-checkpoints";
import { ADS } from "../encounter-ads";
import { SYNC } from "../config";
import { normaliseDoc, type SyncDoc } from "./merge";

// A seeded random generator and random saves, for the property tests of the merge (no extra dependency).
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  return {
    next,
    int: (n: number) => Math.floor(next() * n),
    pick: <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)],
    some: <T>(list: readonly T[], chance = 0.5): T[] => list.filter(() => next() < chance),
  };
}

export const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const NOTES = ["C4", "D4", "E4", "G4", "A4", "F4"];

// A valid track text for body number `n` with a given title.
export function trackText(title: string, n: number): string {
  const notes = [NOTES[n % 6], NOTES[(n >> 1) % 6], NOTES[(n >> 2) % 6], NOTES[(n >> 3) % 6]].join(" ");
  return `title: ${title}\ntempo: ${60 + (n % 20) * 4}\n[melody square 0.6]\n${notes}\n`;
}

export function randomDoc(r: ReturnType<typeof rng>, opts: { devices?: string[]; trackPool?: number } = {}): SyncDoc {
  const devices = opts.devices ?? ["aaa", "bbb", "ccc"];
  const items = DECOR_DATA.items.map((i) => i.id);
  const slots = DECOR_DATA.slots;
  const owned = r.some(items, 0.4);
  const placed: Record<string, string> = {};
  for (const slot of r.some(slots, 0.3)) placed[slot.id] = r.pick(items);
  const queue = r.some(items, 0.2);
  const hours = r.int(4) * 24 + r.int(24);
  const vars: Record<string, number> = {};
  for (const v of r.some(STATE_VARS, 0.6)) vars[v.id] = r.int(100);
  const rooms = ["main", "kitchen", "bath", "porch"];
  const tasks = ["coffee", "doomscroll", "dishes", "guitar", "nap", "x"];
  const poolSize = opts.trackPool ?? 20;
  const tracks = Array.from({ length: r.int(8) }, () => {
    const n = r.int(poolSize);
    return { text: trackText(r.pick(["Foo", "Bar", "Foo 2", "Baz"]), n), made: r.int(4) * 1000 };
  });
  const raw = {
    app: "life",
    format: 1,
    device: r.pick(devices),
    activeAt: r.pick([0, 0, NOW - 5 * DAY, NOW - DAY, NOW, NOW + DAY / 2, NOW + 5 * DAY, NOW + 400 * DAY, -5, Number.NaN]),
    progress: {
      unlocked: r.some(ACHIEVEMENTS.map((a) => a.id), 0.3),
      stats: {
        taskCounts: Object.fromEntries(r.some(tasks, 0.5).map((t) => [t, 1 + r.int(9)])),
        totalPoints: r.int(1000),
        bestChain: r.int(9),
        bestAward: r.int(50),
        bestScore: r.int(500),
        steps: r.int(5000),
        bumps: r.int(50),
        cancelled: r.int(9),
        minAwards: r.int(9),
        rooms: r.some(rooms, 0.5),
        playSeconds: r.int(100000) / 7,
      },
      world: { vars, room: r.pick(["main", "kitchen"]), col: r.int(8), row: r.int(8), facing: r.pick(["up", "down", "left", "right"]) },
      decor: { owned, placed },
      deliveries: {
        hours,
        pending: queue.slice(0, 3).map((id) => ({ id, at: hours + r.int(30) })),
        waiting: queue.slice(3, 5),
        fired: r.some(CHECKPOINTS.map((c) => c.id), 0.4),
      },
      encounters: { last: r.int(hours + 1), day: r.int(5), today: r.int(3), soon: r.next() < 0.3, seen: r.some(ADS.map((a) => a.id), 0.3) },
    },
    tracks,
  };
  const read = normaliseDoc(raw);
  if (!read.ok) throw new Error("generator made an invalid doc");
  return read.doc;
}

export const emptyDoc = (): SyncDoc => {
  const read = normaliseDoc({ app: SYNC.app, format: SYNC.format });
  if (!read.ok) throw new Error("empty doc");
  return read.doc;
};
