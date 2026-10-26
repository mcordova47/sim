import { CLOCK, ENERGY, MOOD, PLANT } from "./config";

// One thing about the apartment or the character that tasks can read and
// change. The list lives in state-vars.ts; adding a variable is a data change.
export interface StateVar {
  id: string;
  initial: number;
  min: number;
  max: number;
  // A one-line meaning, for whoever reads the data file.
  meaning: string;
  // Going past the end comes back round the other side (the clock) instead of stopping.
  wrap?: boolean;
}

// True when the variable is between `min` and `max`, both inclusive and both optional.
export interface Check {
  var: string;
  min?: number;
  max?: number;
}

// Something that must be true for a task to start. `reason` is what the
// prompt says when it is not, so it may only use characters the font has.
// `anyOf` is true if any one of its checks is.
export type Requirement = { reason: string } & ({ anyOf: Check[] } | Check);

// A change a finished task makes. `set` wins over `add`; either is clamped
// to the variable's range (or wrapped, for a wrapping variable).
export interface Effect {
  var: string;
  add?: number;
  set?: number;
}

export interface StateChange {
  id: string;
  value: number;
  previous: number;
}

export class ApartmentState {
  // Called after a variable changes, once per variable, and only after every
  // change of the same moment has been applied (all of a task's effects, or
  // the clock and energy of one tick), so a listener always sees a settled
  // state. Events come in the order the variables first changed in the
  // effects list (a tick: clock, then energy). Changes from the passing of
  // time only count when the whole-number part (the floor) changes, so the
  // clock reports once per in-game hour and energy once per point rather than
  // every frame. The event carries the exact new value; to read the exact
  // time every frame, use `get("clock")`.
  onChange?: (change: StateChange) => void;
  // Told when an effect moves the clock forward (sleeping, napping), with the hours
  // skipped. Ordinary ticking does not call it. Things that run on game time use
  // it so time that is skipped still counts (issue 062 deliveries).
  onClockSkip?: (hours: number) => void;

  private readonly defs = new Map<string, StateVar>();
  private readonly values = new Map<string, number>();

  constructor(vars: StateVar[]) {
    for (const v of vars) {
      if (this.defs.has(v.id)) throw new Error(`State variable "${v.id}" is listed twice`);
      if (v.min > v.max || v.initial < v.min || v.initial > v.max) {
        throw new Error(`State variable "${v.id}" starts outside its range`);
      }
      if (v.wrap && !(v.max > v.min)) {
        throw new Error(`State variable "${v.id}" wraps but has no range to wrap around (min equals max)`);
      }
      this.defs.set(v.id, v);
      this.values.set(v.id, v.initial);
    }
  }

  has(id: string): boolean {
    return this.defs.has(id);
  }

  get(id: string): number {
    const value = this.values.get(id);
    if (value === undefined) throw new Error(`Unknown state variable "${id}"`);
    return value;
  }

  matches(check: Check): boolean {
    const value = this.get(check.var);
    return (check.min === undefined || value >= check.min) &&
      (check.max === undefined || value <= check.max);
  }

  matchesAll(checks: Check[] = []): boolean {
    return checks.every((c) => this.matches(c));
  }

  // The reason for the first requirement that is not met, or null if all are.
  unmetReason(requirements: Requirement[] = []): string | null {
    for (const r of requirements) {
      const ok = "anyOf" in r ? r.anyOf.some((c) => this.matches(c)) : this.matches(r);
      if (!ok) return r.reason;
    }
    return null;
  }

  // The ids among `ids` that are not state variables (for checking data when it loads).
  unknown(ids: Iterable<string>): string[] {
    return [...new Set(ids)].filter((id) => !this.defs.has(id));
  }

  // Applies all the effects, then announces the changes.
  applyEffects(effects: Effect[] = []): void {
    for (const e of effects) this.get(e.var); // an unknown name throws before anything changes
    const changes = new Map<string, StateChange>();
    for (const e of effects) {
      this.write(e.var, e.set ?? this.get(e.var) + (e.add ?? 0), changes);
    }
    this.announce(changes, false);
    for (const e of effects) {
      if (e.var === "clock" && e.set === undefined && typeof e.add === "number" && Number.isFinite(e.add) && e.add > 0) this.onClockSkip?.(e.add);
    }
  }

  // Passes `dt` seconds of game time: the clock runs on, energy drains and mood
  // drifts toward the middle.
  tick(dt: number): void {
    const hours = (dt * CLOCK.minutesPerSecond) / 60;
    const changes = new Map<string, StateChange>();
    if (this.has("clock")) this.write("clock", this.get("clock") + hours, changes);
    if (this.has("energy")) this.write("energy", this.get("energy") - hours * ENERGY.fallPerHour, changes);
    if (this.has("mood")) {
      // Toward the middle, and never past it.
      const mood = this.get("mood");
      const pull = hours * MOOD.driftPerHour;
      this.write("mood", mood > MOOD.rest ? Math.max(MOOD.rest, mood - pull) : Math.min(MOOD.rest, mood + pull), changes);
    }
    // The soil dries out as time passes (issue 063).
    if (this.has("plantDry")) {
      this.write("plantDry", Math.min(PLANT.maxDryHours, this.get("plantDry") + hours), changes);
    }
    this.announce(changes, true);
  }

  private write(id: string, wanted: number, changes: Map<string, StateChange>): void {
    const def = this.defs.get(id);
    if (!def) throw new Error(`Unknown state variable "${id}"`);
    const span = def.max - def.min;
    const value = def.wrap
      ? def.min + ((((wanted - def.min) % span) + span) % span)
      : Math.min(def.max, Math.max(def.min, wanted));
    const previous = changes.get(id)?.previous ?? this.get(id);
    this.values.set(id, value);
    changes.set(id, { id, value, previous });
  }

  private announce(changes: Map<string, StateChange>, fromTime: boolean): void {
    for (const c of changes.values()) {
      const changed = fromTime ? Math.floor(c.value) !== Math.floor(c.previous) : c.value !== c.previous;
      if (changed) this.onChange?.(c);
    }
  }
}

// "7:30 AM" for a time given in hours since midnight.
export function formatClock(hours: number): string {
  const total = Math.floor(hours * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
