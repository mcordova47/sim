import { DIRECTIONS, type Direction } from "../direction";
import type { StatsData } from "./stats";

// The part of localStorage the game uses, so tests can pass a fake and a
// browser with storage blocked can pass nothing.
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// Where the player was and what the apartment was like.
export interface WorldSave {
  // State variable values by id. Only ids the game knows are used on load, and
  // a variable missing from the save keeps its starting value.
  vars: Record<string, number>;
  room: string;
  col: number;
  row: number;
  facing: Direction;
}

export interface SavedProgress {
  unlocked: string[];
  // Lifetime stats, including the best score. Loaded by Stats, which is tolerant.
  stats: unknown;
  world: WorldSave | null;
  // The optional `decor` field, as saved. Read by Decor.load, which is tolerant
  // (an old save has none: the room is today's).
  decor?: unknown;
  // The optional `deliveries` field (issue 062 stage 3a), read by Deliveries.load, which is tolerant.
  deliveries?: unknown;
}

const VERSION = 1;

export const emptyProgress = (): SavedProgress => ({ unlocked: [], stats: undefined, world: null });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Reads a saved world, keeping only what is usable. Returns null if the
// position or room is missing or damaged. Variables are filtered one by one.
export function parseWorld(raw: unknown): WorldSave | null {
  if (!isRecord(raw)) return null;
  const { room, col, row, facing } = raw;
  if (typeof room !== "string" || !Number.isInteger(col) || !Number.isInteger(row)) return null;
  if (typeof facing !== "string" || !DIRECTIONS.includes(facing as Direction)) return null;
  const vars: Record<string, number> = {};
  if (isRecord(raw.vars)) {
    for (const [id, value] of Object.entries(raw.vars)) {
      if (typeof value === "number" && Number.isFinite(value)) vars[id] = value;
    }
  }
  return { vars, room, col: col as number, row: row as number, facing: facing as Direction };
}

// Saves and loads progress under one versioned key. Every read and write is
// wrapped, so storage that is blocked, full or missing never breaks the game,
// and a saved value that is corrupt is ignored (the game starts fresh).
export class ProgressStore {
  constructor(
    private readonly storage: KeyValueStorage | null,
    private readonly key: string,
  ) {}

  load(): SavedProgress {
    try {
      const text = this.storage?.getItem(this.key);
      if (!text) return emptyProgress();
      const raw: unknown = JSON.parse(text);
      if (!isRecord(raw) || raw.version !== VERSION) return emptyProgress();
      return {
        unlocked: Array.isArray(raw.unlocked) ? raw.unlocked.filter((id): id is string => typeof id === "string") : [],
        stats: raw.stats,
        world: parseWorld(raw.world),
        decor: raw.decor,
        deliveries: raw.deliveries,
      };
    } catch {
      return emptyProgress();
    }
  }

  // Returns false if it could not save (nowhere to save to, or a write error).
  // `decor` is left out of the saved value when not given.
  save(unlocked: string[], stats: StatsData, world: WorldSave | null, decor?: unknown, deliveries?: unknown): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(
        this.key,
        JSON.stringify({ version: VERSION, unlocked, stats, world, ...(decor !== undefined && { decor }), ...(deliveries !== undefined && { deliveries }) }),
      );
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      // Nothing to do: the game works without storage.
    }
  }
}
