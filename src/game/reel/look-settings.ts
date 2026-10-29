import { DEFAULT_LOOK_ID, isLookId } from "./looks";

// The chosen look for new pictures (issue 117a). A device setting, like the
// pictures themselves: its own localStorage key, NOT in the progress save, the
// sync document or RESET PROGRESS, and not in IndexedDB (so REMOVE ALL keeps it).

export const LOOK_SETTINGS_KEY = "life.reel.look.v1";

export interface LookStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): LookStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // Even reading `localStorage` can throw when it is blocked.
  }
}

// Tolerant: anything unreadable, unknown or missing means the default look.
export function loadLook(storage: LookStorage | null = browserStorage()): string {
  try {
    const text = storage?.getItem(LOOK_SETTINGS_KEY);
    if (!text) return DEFAULT_LOOK_ID;
    const v = JSON.parse(text) as { look?: unknown } | null;
    return v && isLookId(v.look) ? v.look : DEFAULT_LOOK_ID;
  } catch {
    return DEFAULT_LOOK_ID;
  }
}

// Returns false when it could not be kept (the choice then lasts only this session, held by the caller).
export function saveLook(look: string, storage: LookStorage | null = browserStorage()): boolean {
  if (!isLookId(look)) return false;
  try {
    if (!storage) return false;
    storage.setItem(LOOK_SETTINGS_KEY, JSON.stringify({ look }));
    return true;
  } catch {
    return false;
  }
}
