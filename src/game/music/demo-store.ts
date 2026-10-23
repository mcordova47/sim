import type { KeyValueStorage } from "../achievements/progress";
import { MAKE_TRACKS as M } from "../config";
import {
  RESERVED_NAMES,
  channelsWithNotes,
  cloneGrid,
  countNotes,
  gridToTrackText,
  nameProblem,
  nameTaken,
  readGrid,
  untitledName,
  type DemoGrid,
} from "./demos";
import { parseTrack, type Track } from "./track";

// The tracks the player has made, saved under one versioned key (`life.tracks.v1`):
// the tracks themselves as `.track` text (the one source of truth, parsed with
// `parseTrack` when read), the work in progress (a draft), the next id, and the
// state of the save reward. Like the other stores, every read and write is
// guarded: blocked, full or missing storage, bad JSON and wrong shapes give
// defaults and never throw. See docs/make-tracks.md.

export interface DemoRecord {
  id: string;
  text: string;
  made: number;
}

// A saved track as the rest of the game sees it.
export interface Demo {
  id: string;
  title: string;
  text: string;
  made: number;
  track: Track;
}

export type SaveOutcome =
  | { ok: true; id: string; created: boolean }
  | { ok: false; code: "empty" | "name" | "taken" | "full" | "size" | "invalid" | "storage"; reason: string };

export type RewardOutcome =
  | { paid: true; points: number; mood: number }
  | { paid: false; why: "notes" | "cooldown" };

interface Draft {
  // The saved track being edited, or null for a new one.
  id: string | null;
  grid: DemoGrid;
}

interface Reward {
  // Game minutes left before the next paid save, as of `anchor`.
  left: number;
  times: number;
}

export interface DemoStoreOptions {
  // Names a made track may not take (the records and the menu's own words).
  reserved?: () => readonly string[];
  // Where a skipped track or a damaged save is reported.
  log?: (message: string) => void;
}

const ID = /^demo-(\d+)$/;
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export class DemoStore {
  // Counts up whenever the list of saved tracks changes, so a feature that
  // keeps a track (the record player) can tell it should look again.
  version = 0;
  // Game minutes since the game began. The editor sets it, so the reward
  // cooldown runs in game time and not in wall time.
  clock: () => number = () => 0;

  private entries: DemoRecord[] = [];
  private draftData: Draft | null = null;
  private nextId = 1;
  private reward: Reward = { left: 0, times: 0 };
  private anchor: number | null = null;
  private readonly parsed = new Map<string, Demo | null>();
  private readonly reserved: () => readonly string[];
  private readonly log: (message: string) => void;

  constructor(
    private readonly storage: KeyValueStorage | null,
    private readonly key: string = M.storageKey,
    options: DemoStoreOptions = {},
  ) {
    this.reserved = options.reserved ?? (() => RESERVED_NAMES);
    this.log = options.log ?? ((m) => console.error(m));
    this.load();
  }

  private load(): void {
    let raw: unknown;
    try {
      const text = this.storage?.getItem(this.key);
      if (!text) return;
      raw = JSON.parse(text);
    } catch {
      this.log(`${this.key}: the saved tracks could not be read; starting with none`);
      return;
    }
    if (!record(raw) || !Array.isArray(raw.tracks)) {
      this.log(`${this.key}: the saved tracks are not in a shape this game knows; starting with none`);
      return;
    }
    const seen = new Set<string>();
    for (const t of raw.tracks) {
      // Hand-edited saves: no more than the limit, and nothing over the size limit.
      if (this.entries.length >= M.maxTracks) break;
      if (record(t) && typeof t.text === "string" && t.text.length > M.maxTextBytes) continue;
      if (!record(t) || typeof t.id !== "string" || !ID.test(t.id) || typeof t.text !== "string" || seen.has(t.id)) continue;
      seen.add(t.id);
      this.entries.push({ id: t.id, text: t.text, made: typeof t.made === "number" && Number.isFinite(t.made) ? t.made : 0 });
    }
    // Ids are never reused: past anything saved or ever handed out.
    const biggest = this.entries.reduce((m, e) => Math.max(m, Number(ID.exec(e.id)![1])), 0);
    this.nextId = Math.max(biggest + 1, whole(raw.nextId) && raw.nextId >= 1 ? raw.nextId : 1);
    if (record(raw.draft)) {
      const grid = readGrid(raw.draft.grid);
      const id = typeof raw.draft.id === "string" && ID.test(raw.draft.id) ? raw.draft.id : null;
      if (grid) this.draftData = { id, grid };
    }
    if (record(raw.reward)) {
      const left = raw.reward.cooldownLeft;
      const times = raw.reward.times;
      this.reward = {
        left: typeof left === "number" && Number.isFinite(left) && left > 0 ? Math.min(left, M.reward.cooldownHours * 60) : 0,
        times: whole(times) && times > 0 ? times : 0,
      };
    }
  }

  // -- Reading ---------------------------------------------------------------

  // The saved tracks that parse, oldest first. One that no longer parses is
  // skipped (and reported once) but stays in storage untouched.
  list(): Demo[] {
    const out: Demo[] = [];
    for (const e of this.entries) {
      const key = `${e.id}\n${e.text}`;
      if (!this.parsed.has(key)) this.parsed.set(key, this.parse(e));
      const demo = this.parsed.get(key);
      if (demo) out.push(demo);
    }
    return out;
  }

  private parse(e: DemoRecord): Demo | null {
    try {
      const track = parseTrack(e.text, `${e.id}.track`, e.id);
      track.note = "Your demo.";
      return { id: e.id, title: track.title, text: e.text, made: e.made, track };
    } catch (error) {
      this.log(`${(error as Error).message} (left in storage, not listed)`);
      return null;
    }
  }

  tracks(): Track[] {
    return this.list().map((d) => d.track);
  }

  get(id: string): Demo | undefined {
    return this.list().find((d) => d.id === id);
  }

  get count(): number {
    return this.entries.length;
  }

  // Every name in use: the saved tracks', and the records' and the menu's.
  private names(except: string | null): string[] {
    const mine = this.list()
      .filter((d) => d.id !== except)
      .map((d) => d.title);
    return [...mine, ...this.reserved()];
  }

  // "Untitled 1", "Untitled 2", ...: the first name nothing uses.
  nextName(): string {
    return untitledName([...this.names(null), ...(this.draftData ? [this.draftData.grid.title] : [])]);
  }

  // -- Writing ---------------------------------------------------------------

  private serialize(): string {
    return JSON.stringify({
      version: 1,
      tracks: this.entries,
      draft: this.draftData,
      nextId: this.nextId,
      reward: { cooldownLeft: this.rewardLeft(), times: this.reward.times },
    });
  }

  // Writes the save. False if storage is missing, throws, or the save is over its size.
  private write(): boolean {
    if (!this.storage) return false;
    try {
      const text = this.serialize();
      if (text.length > M.maxSaveBytes) return false;
      this.storage.setItem(this.key, text);
      return true;
    } catch {
      return false;
    }
  }

  // Runs `change`, writes, and puts everything back if the write failed, so
  // what the game shows is what is saved.
  private commit(change: () => void): boolean {
    const before = { entries: [...this.entries], draft: this.draftData, nextId: this.nextId, reward: { ...this.reward }, anchor: this.anchor };
    change();
    if (this.write()) return true;
    this.entries = before.entries;
    this.draftData = before.draft;
    this.nextId = before.nextId;
    this.reward = before.reward;
    this.anchor = before.anchor;
    return false;
  }

  // Saves a track: a new one (`id` null) or a change to a saved one. The text
  // is checked by the real parser before it is stored, so everything saved plays.
  // A track with no notes is refused (the draft is where unfinished work lives).
  save(id: string | null, grid: DemoGrid): SaveOutcome {
    const refused = (code: Extract<SaveOutcome, { ok: false }>["code"], reason: string): SaveOutcome => ({ ok: false, code, reason });
    if (countNotes(grid) === 0) return refused("empty", "Add some notes first.");
    const problem = nameProblem(grid.title);
    if (problem) return refused("name", problem);
    const existing = id !== null && this.entries.some((e) => e.id === id) ? id : null;
    if (nameTaken(grid.title, this.names(existing))) return refused("taken", "That name is taken.");
    if (existing === null && this.entries.length >= M.maxTracks) {
      return refused("full", `${M.maxTracks} tracks saved. Delete one first.`);
    }
    const text = gridToTrackText({ ...grid, title: grid.title.trim() });
    if (new TextEncoder().encode(text).length > M.maxTextBytes) return refused("size", "That track is too big to save.");
    try {
      parseTrack(text, "new track");
    } catch (error) {
      return refused("invalid", (error as Error).message);
    }
    const newId = existing ?? `demo-${this.nextId}`;
    const saved = this.commit(() => {
      const entry: DemoRecord = { id: newId, text, made: Date.now() };
      if (existing) this.entries = this.entries.map((e) => (e.id === existing ? { ...entry, made: e.made } : e));
      else {
        this.entries.push(entry);
        this.nextId++;
      }
      this.draftData = null;
    });
    if (!saved) return refused("storage", "Could not save (storage is full or blocked).");
    this.version++;
    return { ok: true, id: newId, created: existing === null };
  }

  // Deletes a saved track. False if there is none by that id or storage failed.
  remove(id: string): boolean {
    if (!this.entries.some((e) => e.id === id)) return false;
    const done = this.commit(() => {
      this.entries = this.entries.filter((e) => e.id !== id);
      if (this.draftData?.id === id) this.draftData = { id: null, grid: this.draftData.grid };
    });
    if (done) this.version++;
    return done;
  }

  // -- The draft ---------------------------------------------------------------

  draft(): Draft | null {
    return this.draftData ? { id: this.draftData.id, grid: cloneGrid(this.draftData.grid) } : null;
  }

  // Keeps the work in progress (null forgets it). Kept in memory even if the
  // write fails; the return value says whether it reached storage.
  setDraft(id: string | null, grid: DemoGrid | null): boolean {
    this.draftData = grid ? { id, grid: cloneGrid(grid) } : null;
    return this.write();
  }

  // -- The save reward ----------------------------------------------------------

  // Game minutes until a save pays again (0 when it would pay now).
  rewardLeft(): number {
    const now = this.clock();
    if (this.anchor === null) this.anchor = now;
    return Math.max(0, this.reward.left - Math.max(0, now - this.anchor));
  }

  get rewardTimes(): number {
    return this.reward.times;
  }

  // Whether a track is worth paying for: enough notes, on enough channels.
  static worthPaying(grid: DemoGrid): boolean {
    return countNotes(grid) >= M.reward.minNotes && channelsWithNotes(grid) >= M.reward.minChannels;
  }

  // Pays for a save if the track is worth it and the cooldown is over, and
  // starts the cooldown. The caller does the paying (points and mood).
  claimReward(grid: DemoGrid): RewardOutcome {
    if (!DemoStore.worthPaying(grid)) return { paid: false, why: "notes" };
    if (this.rewardLeft() > 0) return { paid: false, why: "cooldown" };
    this.reward = { left: M.reward.cooldownHours * 60, times: this.reward.times + 1 };
    this.anchor = this.clock();
    this.write();
    return { paid: true, points: M.reward.points, mood: M.reward.mood };
  }
}

function whole(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}
