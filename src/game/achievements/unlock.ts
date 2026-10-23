import type { Achievement, Condition } from "./data";
import type { Stats } from "./stats";

// What conditions need to know that is not a stat.
export interface UnlockContext {
  // Every task id in the game, for "do every task".
  allTaskIds: readonly string[];
}

export function isMet(when: Condition, stats: Stats, ctx: UnlockContext): boolean {
  if ("stat" in when) return stats.number(when.stat) >= when.atLeast;
  if ("task" in when) return stats.taskCount(when.task) >= when.atLeast;
  if ("tasks" in when) return when.tasks.every((id) => stats.taskCount(id) > 0);
  return ctx.allTaskIds.length > 0 && ctx.allTaskIds.every((id) => stats.taskCount(id) > 0);
}

// Keeps the set of unlocked achievements. An achievement can only unlock once:
// it stays in the set, including across saves and loads.
export class Unlocks {
  private readonly done = new Set<string>();

  constructor(private readonly list: readonly Achievement[]) {}

  has(id: string): boolean {
    return this.done.has(id);
  }

  get count(): number {
    return this.done.size;
  }

  ids(): string[] {
    return this.list.filter((a) => this.done.has(a.id)).map((a) => a.id);
  }

  // Marks saved ids as unlocked, ignoring anything that is not a known achievement.
  load(saved: unknown): void {
    this.done.clear();
    if (!Array.isArray(saved)) return;
    const known = new Set(this.list.map((a) => a.id));
    for (const id of saved) if (typeof id === "string" && known.has(id)) this.done.add(id);
  }

  clear(): void {
    this.done.clear();
  }

  // Unlocks everything whose condition is now met and returns just the ones
  // that were not unlocked before.
  check(stats: Stats, ctx: UnlockContext): Achievement[] {
    const fresh: Achievement[] = [];
    for (const a of this.list) {
      if (this.done.has(a.id) || !isMet(a.when, stats, ctx)) continue;
      this.done.add(a.id);
      fresh.push(a);
    }
    return fresh;
  }
}
