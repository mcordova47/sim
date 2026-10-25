import type { KeyValueStorage } from "../achievements/progress";
import { FLASHCARDS as F } from "../config";

// The sync key is the flashcards app's only credential, so it is handled with
// care: typed or pasted by the player, kept only in this browser's localStorage
// and never in the code, the bundle or the log.

const ALPHABET = /^[a-z0-9]+$/;

export const isKey = (text: string): boolean => text.length === F.keyLength && ALPHABET.test(text);

// The key in whatever was handed over: a bare key, or a pairing link
// (`.../?pair=<key>`), either with stray whitespace. Same rule as the app's
// `keyFromLink`: `?`, `#` and `&` all separate parts, and a part must start
// with `pair=`. Null if there is no key of the right shape.
export function keyFromText(raw: string): string | null {
  const trimmed = raw.trim();
  if (isKey(trimmed)) return trimmed;
  const parts = trimmed.replace(/[?#]/g, "&").split("&");
  for (const part of parts) {
    if (part.startsWith("pair=")) {
      const found = part.slice("pair=".length);
      return isKey(found) ? found : null;
    }
  }
  return null;
}

// What is remembered between sessions, under one versioned key.
interface Saved {
  key?: string;
  // Cards paid so far in the current cap window, and the game minutes left
  // before the window resets, as of `anchor`.
  paid?: number;
  left?: number;
}

export class StudyStore {
  // Game minutes since the game started; set by the activity from the host.
  clock: () => number = () => 0;
  private anchor: number | null = null;
  private data: Saved;

  constructor(private readonly storage: KeyValueStorage | null) {
    this.data = this.read();
  }

  private read(): Saved {
    try {
      const text = this.storage?.getItem(F.storageKey);
      if (!text) return {};
      const raw: unknown = JSON.parse(text);
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
      const r = raw as Record<string, unknown>;
      const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.min(v, max) : 0);
      return {
        key: typeof r.key === "string" && isKey(r.key) ? r.key : undefined,
        paid: Math.floor(num(r.paid, F.dailyCardCap)),
        left: num(r.left, F.capResetHours * 60),
      };
    } catch {
      return {};
    }
  }

  private write(): void {
    try {
      this.storage?.setItem(F.storageKey, JSON.stringify(this.data));
    } catch {
      // Blocked or full storage: the key just has to be typed again next time.
    }
  }

  key(): string | null {
    return this.data.key ?? null;
  }

  saveKey(key: string): void {
    this.data = { ...this.data, key };
    this.write();
  }

  forgetKey(): void {
    this.data = { ...this.data, key: undefined };
    this.write();
  }

  // Game minutes left in the current cap window (0 when none has started).
  private windowLeft(): number {
    const now = this.clock();
    if (this.anchor === null) this.anchor = now;
    return Math.max(0, (this.data.left ?? 0) - Math.max(0, now - this.anchor));
  }

  // How many more delivered "got it" cards pay right now.
  paidLeft(): number {
    return this.windowLeft() > 0 ? Math.max(0, F.dailyCardCap - (this.data.paid ?? 0)) : F.dailyCardCap;
  }

  // Counts one paid card and returns whether it should pay.
  claimCard(): boolean {
    if (this.paidLeft() <= 0) return false;
    const left = this.windowLeft();
    this.data = {
      ...this.data,
      paid: left > 0 ? (this.data.paid ?? 0) + 1 : 1,
      left: left > 0 ? left : F.capResetHours * 60,
    };
    this.anchor = this.clock();
    this.write();
    return true;
  }
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

let shared: StudyStore | null = null;
export const studyStore = (): StudyStore => (shared ??= new StudyStore(browserStorage()));
export const setStudyStore = (store: StudyStore | null): void => {
  shared = store;
};
