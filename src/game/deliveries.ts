import { DELIVERIES } from "./config";
import type { Decor } from "./decor";
import { CHECKPOINTS } from "./delivery-checkpoints";

// The delivery queue (issue 062 stage 3a, docs/decor.md). Anything that wants to
// give you a decor item calls `deliver(itemId, delayHours)`; some game hours
// later a package turns up by the front door, and opening it (E) adds the item
// to what you own. Nothing here is a goal: no counter is shown, nothing is
// missed forever (a package waits until you open it, and a failed delivery just
// returns false).
//
// Time is a running total of game hours, `hours`. It moves only when the game
// clock does (`Game` calls `advance` from the same place the clock ticks, so it
// stands still while a dialog or the track editor holds the clock) and when
// sleeping or napping skips hours (`State.onClockSkip`). The total is saved, so
// a reload picks up where it left off.

export interface Pending {
  id: string;
  // Arrival time, in total game hours.
  at: number;
}

// What is saved, as the optional `deliveries` field of the progress save.
export interface DeliverySave {
  hours: number;
  pending: Pending[];
  // Arrived and not opened yet.
  waiting: string[];
  // Milestone ids that have already fired (each fires once).
  fired: string[];
}

// A checkpoint: the first time a number reaches `atLeast` (`stat`), or the first
// time an achievement is unlocked (`achievement`, an id from achievements/data.ts),
// deliver `item`. A list of items is "the first one you do not own"; if you own the
// item (or all of them) it gives nothing, and the checkpoint still counts as fired
// (docs/random-encounters.md section 3: only new things arrive).
export type MilestoneStat = "points" | "days" | "tasks";
export interface Milestone {
  id: string;
  stat?: MilestoneStat;
  atLeast?: number;
  achievement?: string;
  item: string | string[];
  delayHours: number;
}

// What `check` is told: the current numbers, and which achievements are unlocked.
export type MilestoneValues = Readonly<Record<MilestoneStat, number>>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const goodId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;

export const emptyDeliveries = (): DeliverySave => ({ hours: 0, pending: [], waiting: [], fired: [] });

// Reads a saved value, never throwing. Anything unusable is dropped: a bad hours
// total becomes 0, entries need a short id and a finite time, repeats are
// dropped, and the lists are cut to their caps.
export function parseDeliveries(raw: unknown): DeliverySave {
  const out = emptyDeliveries();
  if (!isRecord(raw)) return out;
  if (typeof raw.hours === "number" && Number.isFinite(raw.hours) && raw.hours >= 0) out.hours = Math.min(raw.hours, DELIVERIES.maxHours);
  const seen = new Set<string>();
  if (Array.isArray(raw.waiting)) {
    for (const id of raw.waiting.slice(0, DELIVERIES.maxQueued)) {
      if (goodId(id) && !seen.has(id) && seen.size < DELIVERIES.maxQueued) {
        seen.add(id);
        out.waiting.push(id);
      }
    }
  }
  if (Array.isArray(raw.pending)) {
    for (const p of raw.pending.slice(0, DELIVERIES.maxQueued * 2)) {
      if (seen.size >= DELIVERIES.maxQueued) break;
      if (!isRecord(p) || !goodId(p.id) || seen.has(p.id)) continue;
      if (typeof p.at !== "number" || !Number.isFinite(p.at)) continue;
      seen.add(p.id);
      out.pending.push({ id: p.id, at: Math.min(Math.max(p.at, 0), DELIVERIES.maxHours + DELIVERIES.maxDelayHours) });
    }
  }
  if (Array.isArray(raw.fired)) {
    const fired = new Set<string>();
    for (const id of raw.fired.slice(0, DELIVERIES.maxFired)) if (goodId(id)) fired.add(id);
    out.fired = [...fired];
  }
  return out;
}

export class Deliveries {
  // Told after anything changes (to save).
  onChange?: () => void;
  // Told when packages arrive, with the item ids (for the one plain line).
  onArrive?: (ids: string[]) => void;
  // Asked before a package arrives; false holds it back (still queued) until it is true.
  // The game uses it so a box never appears on the tile the player is standing on.
  canArrive?: () => boolean;
  // The checkpoints in use. The production list is in delivery-checkpoints.ts.
  milestones: readonly Milestone[] = CHECKPOINTS;

  private total = 0;
  private pending: Pending[] = [];
  private waitingIds: string[] = [];
  private fired = new Set<string>();

  constructor(private readonly decor: Decor) {}

  get hours(): number {
    return this.total;
  }

  // True while a package is waiting to be opened.
  get waiting(): boolean {
    return this.waitingIds.length > 0;
  }

  get waitingItems(): readonly string[] {
    return this.waitingIds;
  }

  get pendingItems(): readonly Pending[] {
    return this.pending;
  }

  // Queues `itemId` to arrive in `delayHours` game hours (cut to 0..maxDelayHours;
  // NaN counts as 0). False, and nothing changes, for an
  // unknown item, one you already own, one already queued or waiting, or a full queue.
  deliver(itemId: string, delayHours: number): boolean {
    if (!this.decor.item(itemId) || this.decor.owns(itemId)) return false;
    if (this.pending.some((p) => p.id === itemId) || this.waitingIds.includes(itemId)) return false;
    if (this.pending.length + this.waitingIds.length >= DELIVERIES.maxQueued) return false;
    const delay = Number.isNaN(delayHours) ? 0 : Math.min(Math.max(delayHours, 0), DELIVERIES.maxDelayHours);
    this.pending.push({ id: itemId, at: this.total + delay });
    // Stable by arrival time, so equal times arrive in the order they were queued.
    this.pending.sort((a, b) => a.at - b.at);
    this.arrive();
    this.onChange?.();
    return true;
  }

  // Moves game time on by `hours` (the clock ticking, or hours skipped by sleep).
  advance(hours: number): void {
    if (!(hours > 0) || !Number.isFinite(hours)) return;
    this.total = Math.min(this.total + hours, DELIVERIES.maxHours);
    if (this.arrive()) this.onChange?.();
  }

  private arrive(): boolean {
    const now: string[] = [];
    while (this.pending.length > 0 && this.pending[0].at <= this.total && (this.canArrive?.() ?? true)) now.push(this.pending.shift()!.id);
    if (now.length === 0) return false;
    this.waitingIds.push(...now);
    this.onArrive?.(now);
    return true;
  }

  // Opens what is waiting: each item is added to what you own. Returns the items
  // that were added (one that cannot be added any more, because it is owned or
  // the list is full, is dropped quietly).
  collect(): string[] {
    const ids = this.waitingIds;
    this.waitingIds = [];
    const got = ids.filter((id) => this.decor.own(id));
    if (ids.length > 0) this.onChange?.();
    return got;
  }

  // Fires each checkpoint whose number has been reached and that has not fired
  // before: it is remembered (even if the delivery is refused, so it never
  // retries) and calls `deliver`. `values` holds the current numbers.
  // `unlocked` says whether an achievement is unlocked (for `achievement` milestones).
  // A milestone whose item is owned, queued or unknown gives nothing and is marked
  // fired. The one case that is not fired is a full queue: it tries again later,
  // so a gift is never lost to a busy door.
  check(values: MilestoneValues, unlocked: (achievementId: string) => boolean = () => false): void {
    let changed = false;
    for (const m of this.milestones) {
      if (this.fired.has(m.id)) continue;
      const reached = m.achievement !== undefined ? unlocked(m.achievement) : m.stat !== undefined && values[m.stat] >= (m.atLeast ?? 0);
      if (!reached) continue;
      if (this.fired.size >= DELIVERIES.maxFired) break;
      const items = typeof m.item === "string" ? [m.item] : m.item;
      const pick = items.find((id) => this.decor.item(id) !== undefined && !this.decor.owns(id));
      if (pick !== undefined && this.queueFull()) continue;
      this.fired.add(m.id);
      changed = true;
      if (pick !== undefined) this.deliver(pick, m.delayHours);
    }
    if (changed) this.onChange?.();
  }

  private queueFull(): boolean {
    return this.pending.length + this.waitingIds.length >= DELIVERIES.maxQueued;
  }

  hasFired(id: string): boolean {
    return this.fired.has(id);
  }

  // Back to a fresh game: nothing queued, nothing fired, time at 0.
  reset(): void {
    this.load(undefined);
  }

  // Replaces everything with a saved value (tolerant, see `parseDeliveries`).
  load(raw: unknown): void {
    const s = parseDeliveries(raw);
    this.total = s.hours;
    this.pending = s.pending.sort((a, b) => a.at - b.at);
    this.waitingIds = s.waiting;
    this.fired = new Set(s.fired);
    // What you already own cannot arrive again, and an item this build does not know would be an empty package.
    const usable = (id: string) => this.decor.item(id) !== undefined && !this.decor.owns(id);
    this.pending = this.pending.filter((p) => usable(p.id));
    this.waitingIds = this.waitingIds.filter(usable);
    this.onChange?.();
  }

  toJSON(): DeliverySave {
    return { hours: this.total, pending: this.pending.map((p) => ({ ...p })), waiting: [...this.waitingIds], fired: [...this.fired] };
  }
}
