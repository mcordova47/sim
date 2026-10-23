import { SCORING } from "../config";

// The numbers achievements are judged on. They are lifetime stats: they carry
// over between visits (see progress.ts). Plain data in, plain data out, so it
// is easy to test and to save.
export interface StatsData {
  // How many times each task has been completed, by task id.
  taskCounts: Record<string, number>;
  totalPoints: number;
  // The longest variety chain, and the most points from one task.
  bestChain: number;
  bestAward: number;
  // The highest running score reached in one visit.
  bestScore: number;
  steps: number;
  bumps: number;
  // Tasks backed out of.
  cancelled: number;
  // Completions that paid only the minimum because of repeats.
  minAwards: number;
  // Ids of the rooms the player has walked into.
  rooms: string[];
  // Seconds the game has been running, in total.
  playSeconds: number;
}

// The stats that are single numbers, which a condition can name.
export type NumberStat = Exclude<keyof StatsData, "taskCounts" | "rooms"> | "completions" | "roomsVisited";

export const emptyStats = (): StatsData => ({
  taskCounts: {},
  totalPoints: 0,
  bestChain: 0,
  bestAward: 0,
  bestScore: 0,
  steps: 0,
  bumps: 0,
  cancelled: 0,
  minAwards: 0,
  rooms: [],
  playSeconds: 0,
});

const count = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;

export class Stats {
  private data: StatsData = emptyStats();

  constructor(saved?: unknown) {
    if (saved !== undefined) this.load(saved);
  }

  // Takes saved data, keeping what is usable and defaulting the rest, so a
  // save from an older version or a damaged one never throws.
  load(saved: unknown): void {
    const next = emptyStats();
    if (typeof saved === "object" && saved !== null) {
      const s = saved as Record<string, unknown>;
      for (const key of ["totalPoints", "bestChain", "bestAward", "bestScore", "steps", "bumps", "cancelled", "minAwards"] as const) {
        next[key] = count(s[key]);
      }
      next.playSeconds = typeof s.playSeconds === "number" && Number.isFinite(s.playSeconds) && s.playSeconds >= 0 ? s.playSeconds : 0;
      if (typeof s.taskCounts === "object" && s.taskCounts !== null && !Array.isArray(s.taskCounts)) {
        for (const [id, n] of Object.entries(s.taskCounts)) {
          const c = count(n);
          if (c > 0) next.taskCounts[id] = c;
        }
      }
      if (Array.isArray(s.rooms)) next.rooms = [...new Set(s.rooms.filter((r): r is string => typeof r === "string"))];
    }
    this.data = next;
  }

  reset(): void {
    this.data = emptyStats();
  }

  // A copy of the data, for saving.
  toJSON(): StatsData {
    return { ...this.data, taskCounts: { ...this.data.taskCounts }, rooms: [...this.data.rooms] };
  }

  completed(task: { id: string }, award: { points: number; repeatFactor: number; chain: number }, score: number): void {
    const d = this.data;
    d.taskCounts[task.id] = (d.taskCounts[task.id] ?? 0) + 1;
    d.totalPoints += award.points;
    d.bestChain = Math.max(d.bestChain, award.chain);
    d.bestAward = Math.max(d.bestAward, award.points);
    d.bestScore = Math.max(d.bestScore, score);
    if (award.repeatFactor < 1 && award.points <= SCORING.minPoints) d.minAwards++;
  }

  cancel(): void {
    this.data.cancelled++;
  }

  stepped(): void {
    this.data.steps++;
  }

  bumped(): void {
    this.data.bumps++;
  }

  visited(room: string): void {
    if (!this.data.rooms.includes(room)) this.data.rooms.push(room);
  }

  played(seconds: number): void {
    if (seconds > 0 && Number.isFinite(seconds)) this.data.playSeconds += seconds;
  }

  taskCount(id: string): number {
    return this.data.taskCounts[id] ?? 0;
  }

  get completions(): number {
    return Object.values(this.data.taskCounts).reduce((a, b) => a + b, 0);
  }

  number(stat: NumberStat): number {
    if (stat === "completions") return this.completions;
    if (stat === "roomsVisited") return this.data.rooms.length;
    return this.data[stat];
  }
}
