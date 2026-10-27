import { ENCOUNTERS } from "./config";
import { ADS, type Ad } from "./encounter-ads";

// The logic of the ad encounters (issue 043 stage B, docs/random-encounters.md section 4):
// when one may start, which ad it is, the odds of an impulse buy and of an unsubscribe that
// works, and what is saved. No drawing and no game: everything it needs comes in as arguments
// (the clock, the mood, the random function), so it tests without one. Nothing here ever takes
// anything from the player: mood only sets how strong the ad is.

// What is saved, as the optional `encounters` field of the progress save.
export interface EncounterSave {
  // The delivery-clock hours of the last encounter; missing: none yet.
  last?: number;
  // The game day (floor(hours / 24)) the `today` count belongs to, and how many encounters it holds.
  day: number;
  today: number;
  // A failed unsubscribe happened and no roll has been made since.
  soon: boolean;
  // The last ads shown, oldest first.
  seen: string[];
}

export const emptyEncounters = (): EncounterSave => ({ day: 0, today: 0, soon: false, seen: [] });

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const goodId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 64;
const finiteAtLeast0 = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

// Reads a saved value, never throwing. Anything unusable is dropped: a bad number is
// forgotten, a repeated, over-long or unknown ad id is dropped, `seen` is cut to its cap.
// `hours` (the delivery clock now), when given, pulls a `last` from the future back to it,
// so a damaged save can never lock anyone out.
export function parseEncounters(raw: unknown, hours?: number, known: (id: string) => boolean = (id) => ADS.some((a) => a.id === id)): EncounterSave {
  const out = emptyEncounters();
  if (!isRecord(raw)) return out;
  if (finiteAtLeast0(raw.last)) out.last = hours !== undefined && Number.isFinite(hours) ? Math.min(raw.last, Math.max(hours, 0)) : raw.last;
  if (finiteAtLeast0(raw.day) && Number.isInteger(raw.day)) out.day = raw.day;
  if (finiteAtLeast0(raw.today) && Number.isInteger(raw.today)) out.today = Math.min(raw.today, ENCOUNTERS.maxPerDay);
  out.soon = raw.soon === true;
  if (Array.isArray(raw.seen)) {
    const seen: string[] = [];
    for (const id of raw.seen.slice(0, ENCOUNTERS.maxSeen * 4)) {
      if (goodId(id) && known(id) && !seen.includes(id)) seen.push(id);
    }
    out.seen = seen.slice(-ENCOUNTERS.maxSeen);
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clampMood = (mood: number) => (Number.isFinite(mood) ? clamp(mood, 0, 100) : ENCOUNTERS.moodRef);

// The chance that an Ignore turns into a purchase: 0 at `moodRef` and above, `impulseMax` at
// mood 0, a straight line between. Look closer adds `lookCloserImpulse`, only below `moodRef`.
export function impulseChance(mood: number, lookedCloser = false): number {
  const m = clampMood(mood);
  if (m >= ENCOUNTERS.moodRef) return 0;
  const base = ((ENCOUNTERS.moodRef - m) / ENCOUNTERS.moodRef) * ENCOUNTERS.impulseMax;
  return clamp(base + (lookedCloser ? ENCOUNTERS.lookCloserImpulse : 0), 0, 1);
}

// The chance that an unsubscribe works: a straight line from `at0` (mood 0) to `at100`
// (mood 100), minus `persistencePenalty` per persistence level, kept within `min` and `max`.
export function unsubscribeChance(mood: number, persistence: number): number {
  const { at0, at100, min, max } = ENCOUNTERS.unsubscribe;
  const m = clampMood(mood);
  const level = Number.isFinite(persistence) ? clamp(Math.round(persistence), 0, 2) : 0;
  return clamp(at0 + (at100 - at0) * (m / 100) - ENCOUNTERS.persistencePenalty * level, min, max);
}

// What the logic needs to know about the world when a task has just been completed.
export interface EncounterEnv {
  // The id of the task that was completed.
  taskId: string;
  // The delivery clock, in game hours (it stands still while something holds the clock).
  hours: number;
  random(): number;
  // The ad blocker switch is on.
  blocked: boolean;
  // Something else is open (a dialog, another activity).
  busy: boolean;
  // Whether an ad may be offered (its item exists and has art). Without it every ad may.
  usable?: (ad: Ad) => boolean;
}

export class Encounters {
  private save: EncounterSave = emptyEncounters();
  // Told after the state changes (to save it).
  onChange?: () => void;

  constructor(readonly ads: readonly Ad[] = ADS) {}

  // Gates, in order (the note's section 4). True if an encounter could be rolled for now.
  // Pure: it changes nothing.
  eligible(env: EncounterEnv): boolean {
    if (!ENCOUNTERS.tasks.includes(env.taskId)) return false;
    if (env.blocked) return false;
    if (!(env.hours / 24 >= ENCOUNTERS.firstDay)) return false;
    const last = this.save.last;
    const wait = this.save.soon ? ENCOUNTERS.afterFailCooldownHours : ENCOUNTERS.cooldownHours;
    if (last !== undefined && env.hours - Math.min(last, env.hours) < wait) return false;
    if (this.todayCount(env.hours) >= ENCOUNTERS.maxPerDay) return false;
    return !env.busy;
  }

  private todayCount(hours: number): number {
    return this.save.day === dayOf(hours) ? this.save.today : 0;
  }

  // Rolls for an encounter after a completed task. Returns the ad when one starts (and records
  // it: the cooldown, the daily count and the seen list), or null. A roll made after a failed
  // unsubscribe uses `afterFailChance` and uses up that flag.
  roll(env: EncounterEnv): Ad | null {
    // A `last` from the future of the clock (a damaged save, or the clock reset) counts as now, once,
    // so the cooldown runs out normally instead of never.
    if (this.save.last !== undefined && this.save.last > env.hours) this.save.last = Math.max(env.hours, 0);
    if (!this.eligible(env)) return null;
    const chance = this.save.soon ? ENCOUNTERS.afterFailChance : ENCOUNTERS.chance;
    const hit = env.random() < chance;
    if (this.save.soon) {
      this.save.soon = false;
      if (!hit) this.onChange?.();
    }
    if (!hit) return null;
    const ad = this.pick(env);
    if (!ad) return null;
    this.begin(ad, env.hours);
    return ad;
  }

  // Picks an ad, uniformly, preferring one that is not among the last `recent` shown. Null when
  // the catalog has nothing usable.
  pick(env: Pick<EncounterEnv, "random" | "usable">): Ad | null {
    const usable = this.ads.filter((a) => env.usable?.(a) ?? true);
    if (usable.length === 0) return null;
    const recent = this.save.seen.slice(-ENCOUNTERS.recent);
    const fresh = usable.filter((a) => !recent.includes(a.id));
    const pool = fresh.length > 0 ? fresh : usable;
    const r = env.random();
    return pool[Math.min(pool.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * pool.length)))];
  }

  // Records that an encounter with `ad` started at `hours`.
  begin(ad: Ad, hours: number): void {
    const day = dayOf(hours);
    this.save.today = this.save.day === day ? this.save.today + 1 : 1;
    this.save.day = day;
    this.save.last = hours;
    this.save.seen = [...this.save.seen.filter((id) => id !== ad.id), ad.id].slice(-ENCOUNTERS.maxSeen);
    this.onChange?.();
  }

  // An unsubscribe did not work: the next encounter comes sooner (a halved cooldown and a better
  // chance for the next roll). That is all it does.
  failedUnsubscribe(): void {
    this.save.soon = true;
    this.onChange?.();
  }

  get soon(): boolean {
    return this.save.soon;
  }

  get seen(): readonly string[] {
    return this.save.seen;
  }

  // Back to a fresh game.
  reset(): void {
    this.load(undefined);
  }

  // Replaces everything with a saved value (tolerant, see `parseEncounters`).
  load(raw: unknown, hours?: number): void {
    this.save = parseEncounters(raw, hours, (id) => this.ads.some((a) => a.id === id));
    this.onChange?.();
  }

  toJSON(): EncounterSave {
    const { last, ...rest } = this.save;
    return { ...rest, seen: [...rest.seen], ...(last !== undefined && { last }) };
  }
}

// The game day a clock total of `hours` falls in.
export function dayOf(hours: number): number {
  return Math.max(0, Math.floor(hours / 24));
}

// The "when to expect it" word for a delivery delay.
export function arrivesWord(delayHours: number): "laterToday" | "tomorrow" {
  return delayHours <= ENCOUNTERS.laterTodayHours ? "laterToday" : "tomorrow";
}
