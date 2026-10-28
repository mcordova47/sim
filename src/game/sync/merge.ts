import { ACHIEVEMENTS } from "../achievements/data";
import { parseWorld, type WorldSave } from "../achievements/progress";
import { Stats, type StatsData } from "../achievements/stats";
import { DECOR, MAKE_TRACKS as M, SYNC } from "../config";
import { DECOR_DATA } from "../decor-data";
import { parseDecor, type DecorSave } from "../decor";
import { parseDeliveries, type DeliverySave } from "../deliveries";
import { parseEncounters, type EncounterSave } from "../encounters";
import { nameProblem } from "../music/demos";
import { trackBody } from "../music/track-body";
import { parseTrack } from "../music/track";
import { STATE_VARS } from "../state-vars";

// The synced document and the pure merge of two of them (issue 102, docs/sync.md sections 2 and 4).
// Nothing here touches storage or the game: a document is plain data, `normaliseDoc` reads an
// untrusted one through the same tolerant parsers the game loads with, and `mergeSaves` joins two
// normalised documents. The merge is commutative, associative and idempotent at a fixed `now`.

export interface SyncProgress {
  unlocked: string[];
  stats: StatsData;
  world: WorldSave | null;
  decor: DecorSave;
  deliveries: DeliverySave;
  encounters: EncounterSave;
}

export interface SyncTrack {
  text: string;
  made: number;
}

export interface SyncDoc {
  app: "life";
  format: 1;
  // The id of the device that wrote `activeAt` (after a merge, the winner's).
  device: string;
  activeAt: number;
  progress: SyncProgress;
  tracks: SyncTrack[];
}

// What normalising needs to know that is not in the document. The defaults are the real game.
export interface SyncEnv {
  achievementIds?: ReadonlySet<string>;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const sortedUnique = (list: Iterable<string>) => [...new Set(list)].sort(byText);

// JSON with object keys in a fixed order: the text two equal values share, for comparing and tie-breaks.
export function canon(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort(byText)
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canon(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

// -- Time -----------------------------------------------------------------------------

// A real-play time as read: not a number or below zero is 0; a time more than a day past `now` is cut to it.
export function clampActive(at: unknown, now: number): number {
  if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) return 0;
  return Math.min(at, Math.max(0, now) + SYNC.futureMs);
}

// -- Tracks ---------------------------------------------------------------------------

// One track per body (the earlier `made` is kept, and of equal text the title is chosen by the smaller
// `made`, then the smaller text, so the choice does not depend on order), in body order, at most the cap.
export function mergeTracks(a: readonly SyncTrack[], b: readonly SyncTrack[]): SyncTrack[] {
  const byBody = new Map<string, SyncTrack>();
  for (const t of [...a, ...b]) {
    const key = trackBody(t.text);
    const have = byBody.get(key);
    if (!have) {
      byBody.set(key, { text: t.text, made: t.made });
      continue;
    }
    const first = t.made < have.made || (t.made === have.made && t.text < have.text) ? t : have;
    byBody.set(key, { text: first.text, made: Math.min(t.made, have.made) });
  }
  return [...byBody.entries()]
    .sort((x, y) => byText(x[0], y[0]))
    .slice(0, SYNC.maxTracks)
    .map(([, t]) => t);
}

// Whether the game would store this track: the real parser, the size limit and the name rules.
function usableTrack(text: string): boolean {
  if (new TextEncoder().encode(text).length > M.maxTextBytes) return false;
  try {
    return nameProblem(parseTrack(text, "saved track").title) === null;
  } catch {
    return false;
  }
}

function normaliseTracks(raw: unknown): SyncTrack[] {
  if (!Array.isArray(raw)) return [];
  const out: SyncTrack[] = [];
  for (const t of raw.slice(0, SYNC.maxTracks * 4)) {
    if (!isRecord(t) || typeof t.text !== "string" || !usableTrack(t.text)) continue;
    out.push({ text: t.text, made: typeof t.made === "number" && Number.isFinite(t.made) && t.made >= 0 ? t.made : 0 });
  }
  return mergeTracks(out, []);
}

// -- Normalising ----------------------------------------------------------------------

const stateIds = new Set(STATE_VARS.map((v) => v.id));
const knownItems = new Set(DECOR_DATA.items.map((i) => i.id));
const goodKey = (k: string) => k.length > 0 && k.length <= 64;

function normaliseStats(raw: unknown): StatsData {
  const s = new Stats(raw).toJSON();
  const keys = Object.keys(s.taskCounts).filter(goodKey).sort(byText).slice(0, SYNC.maxTaskIds);
  return { ...s, taskCounts: Object.fromEntries(keys.map((k) => [k, s.taskCounts[k]])), rooms: sortedUnique(s.rooms.filter(goodKey)).slice(0, SYNC.maxRooms) };
}

// What the game's own loaders would make of a progress group, in a fixed shape (sorted sets, no unknown ids).
export function normaliseProgress(raw: unknown, env: SyncEnv = {}): SyncProgress {
  const r = isRecord(raw) ? raw : {};
  const known = env.achievementIds ?? new Set(ACHIEVEMENTS.map((a) => a.id));
  const unlocked = Array.isArray(r.unlocked) ? sortedUnique(r.unlocked.filter((id): id is string => typeof id === "string" && known.has(id))) : [];
  const world = parseWorld(r.world);
  if (world) world.vars = Object.fromEntries(Object.entries(world.vars).filter(([id]) => stateIds.has(id)).sort((x, y) => byText(x[0], y[0])));
  const decorParsed = parseDecor(r.decor);
  const owned = new Set(decorParsed.owned);
  const d = parseDeliveries(r.deliveries);
  const usable = (id: string) => knownItems.has(id) && !owned.has(id);
  const deliveries: DeliverySave = {
    hours: d.hours,
    pending: d.pending.filter((p) => usable(p.id)).sort((x, y) => x.at - y.at || byText(x.id, y.id)),
    waiting: d.waiting.filter(usable),
    fired: sortedUnique(d.fired),
  };
  return {
    unlocked,
    stats: normaliseStats(r.stats),
    world,
    decor: { owned: capOwned(decorParsed.owned), placed: decorParsed.placed },
    deliveries,
    encounters: parseEncounters(r.encounters, deliveries.hours),
  };
}

// Known items first, then the rest, each in text order: the first `maxOwned` of the union is the same however it was built.
function capOwned(ids: Iterable<string>): string[] {
  return [...new Set(ids)]
    .sort((x, y) => Number(knownItems.has(y)) - Number(knownItems.has(x)) || byText(x, y))
    .slice(0, DECOR.maxOwned)
    .sort(byText);
}

export type SyncError = "notASave" | "newer" | "damaged";

// Reads an untrusted document (a decoded code, an opened file). Refused unless it is an object with
// `app: "life"` and a format this build reads; everything inside goes through the tolerant parsers.
export function normaliseDoc(raw: unknown, env: SyncEnv = {}): { ok: true; doc: SyncDoc } | { ok: false; error: SyncError } {
  if (!isRecord(raw) || raw.app !== SYNC.app) return { ok: false, error: "notASave" };
  if (typeof raw.format !== "number" || !Number.isInteger(raw.format) || raw.format < 1) return { ok: false, error: "damaged" };
  if (raw.format > SYNC.format) return { ok: false, error: "newer" };
  const device = typeof raw.device === "string" && /^[a-z0-9]{1,32}$/.test(raw.device) ? raw.device : "unknown";
  return {
    ok: true,
    doc: {
      app: "life",
      format: 1,
      device,
      // Not clamped here (the merge does, with its clock); a bad value is 0.
      activeAt: typeof raw.activeAt === "number" && Number.isFinite(raw.activeAt) && raw.activeAt > 0 ? raw.activeAt : 0,
      progress: normaliseProgress(raw.progress, env),
      tracks: normaliseTracks(raw.tracks),
    },
  };
}

// -- The merge ------------------------------------------------------------------------

// The part of the progress group the winner keeps whole, as text, with and without the delivery queues
// (the only part the merge repairs, so a tie is decided before the repair is looked at).
const worldText = (p: SyncProgress) => canon({ world: p.world, placed: p.decor.placed, hours: p.deliveries.hours, fired: p.deliveries.fired, encounters: p.encounters });
const queueText = (p: SyncProgress) => canon({ pending: p.deliveries.pending, waiting: p.deliveries.waiting });

// Positive when `a` is the side that was played more recently: larger activeAt (clamped), then more game
// hours (they travel with the apartment), then the device id, then the group's own text.
function newer(a: SyncDoc, b: SyncDoc, now: number): number {
  const at = clampActive(a.activeAt, now) - clampActive(b.activeAt, now);
  if (at !== 0) return at;
  const hours = a.progress.deliveries.hours - b.progress.deliveries.hours;
  if (hours !== 0) return hours;
  return byText(a.device, b.device) || byText(worldText(a.progress), worldText(b.progress)) || byText(queueText(a.progress), queueText(b.progress));
}

function maxStats(a: StatsData, b: StatsData): StatsData {
  const out: StatsData = { ...a, taskCounts: {}, rooms: [] };
  for (const key of ["totalPoints", "bestChain", "bestAward", "bestScore", "steps", "bumps", "cancelled", "minAwards", "playSeconds"] as const) {
    out[key] = Math.max(a[key], b[key]);
  }
  const ids = sortedUnique([...Object.keys(a.taskCounts), ...Object.keys(b.taskCounts)]).slice(0, SYNC.maxTaskIds);
  for (const id of ids) out.taskCounts[id] = Math.max(a.taskCounts[id] ?? 0, b.taskCounts[id] ?? 0);
  out.rooms = sortedUnique([...a.rooms, ...b.rooms]).slice(0, SYNC.maxRooms);
  return out;
}

// Joins two normalised documents. Owned things, achievements, rooms, stats and made tracks only grow
// (unions and maxima). The apartment (world, placements, deliveries, encounters) is the whole of the
// side that was played more recently, minus anything the union now owns from its delivery queues.
export function mergeSaves(a: SyncDoc, b: SyncDoc, now: number): SyncDoc {
  const win = newer(a, b, now) >= 0 ? a : b;
  const owned = capOwned([...a.progress.decor.owned, ...b.progress.decor.owned]);
  const has = new Set(owned);
  const w = win.progress;
  return {
    app: "life",
    format: 1,
    device: win.device,
    activeAt: clampActive(win.activeAt, now),
    progress: {
      unlocked: sortedUnique([...a.progress.unlocked, ...b.progress.unlocked]),
      stats: maxStats(a.progress.stats, b.progress.stats),
      world: w.world,
      decor: { owned, placed: { ...w.decor.placed } },
      deliveries: {
        hours: w.deliveries.hours,
        pending: w.deliveries.pending.filter((p) => !has.has(p.id)),
        waiting: w.deliveries.waiting.filter((id) => !has.has(id)),
        fired: [...w.deliveries.fired],
      },
      encounters: w.encounters,
    },
    tracks: mergeTracks(a.tracks, b.tracks),
  };
}

// Whether two normalised documents hold the same things (the device and the clamp aside, they are text).
export const sameDoc = (a: SyncDoc, b: SyncDoc): boolean => canon(a) === canon(b);
