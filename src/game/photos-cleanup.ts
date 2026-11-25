// Photos were removed in issue 180. Devices that used them still hold the stored pictures (the IndexedDB
// database "life.reel.v1") and the look setting (the localStorage key "life.reel.look.v1"). This deletes both,
// once, on the next load, with no text and no popup, so nothing invisible is left on a device.
//
// It never throws: private windows, blocked storage and a missing IndexedDB all just end it quietly. It
// remembers it is done in its own small localStorage key (not in the save or the sync document). If the
// browser cannot say the database is gone (blocked by another open tab, or an error), the flag is not set
// and the next load tries again.

export const OLD_REEL_DB = "life.reel.v1";
export const OLD_LOOK_KEY = "life.reel.look.v1";
export const CLEANUP_DONE_KEY = "life.photos-cleanup.v1";

export interface CleanupStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CleanupEnv {
  storage?: CleanupStorage | null;
  indexedDB?: Pick<IDBFactory, "deleteDatabase"> | null;
}

// The browser's own parts, read defensively: even touching `localStorage` can throw when it is blocked.
function browserEnv(): CleanupEnv {
  const env: CleanupEnv = { storage: null, indexedDB: null };
  try {
    if (typeof localStorage !== "undefined") env.storage = localStorage;
  } catch {
    // Blocked.
  }
  try {
    if (typeof indexedDB !== "undefined") env.indexedDB = indexedDB;
  } catch {
    // Blocked.
  }
  return env;
}

export function removeOldPhotos(env: CleanupEnv = browserEnv()): void {
  const storage = env.storage ?? null;
  try {
    if (storage?.getItem(CLEANUP_DONE_KEY)) return;
  } catch {
    return; // Storage that cannot even be read cannot hold the old data or the flag either.
  }
  try {
    storage?.removeItem(OLD_LOOK_KEY);
  } catch {
    // Left where it is; it is a few bytes and the next load tries again.
  }
  const remember = (): void => {
    try {
      storage?.setItem(CLEANUP_DONE_KEY, "1");
    } catch {
      // Without a flag the clean-up runs again next load, which is harmless.
    }
  };
  const idb = env.indexedDB ?? null;
  if (!idb) return remember(); // No IndexedDB means no database to delete.
  try {
    const request = idb.deleteDatabase(OLD_REEL_DB);
    request.onsuccess = remember;
    request.onerror = () => {};
    request.onblocked = () => {};
  } catch {
    // The next load tries again.
  }
}
