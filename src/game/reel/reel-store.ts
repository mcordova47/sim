// The photo reel's storage (issue 113b; docs/photo-reel-design.md section 3).
// Device only: nothing here is read by the save or sync code. A record is only
// pixel data: no file name, date, place or caption ever exists in it.

export const REEL_DB_NAME = "life.reel.v1";
export const REEL_STORE_NAME = "pics";
export const REEL_CAP = 60;
// Stored sizes: landscape 48 x 36 or portrait 36 x 48, one byte per pixel.
export const REEL_SIZES: readonly { w: number; h: number }[] = [
  { w: 48, h: 36 },
  { w: 36, h: 48 },
];
// Palette indices run 0..21 (22 colours).
export const REEL_MAX_INDEX = 21;

// What a caller hands in: plain pixel data.
export interface ReelPicInput {
  w: number;
  h: number;
  px: Uint8Array;
}

export interface ReelPic extends ReelPicInput {
  id: number;
  palette: 1;
}

export interface AddResult {
  added: number;
  // Skipped because the same pixels were already stored (or earlier in the batch).
  duplicates: number;
  // Skipped because the reel was full.
  full: number;
  // Skipped because the record was not a valid picture.
  invalid: number;
}

export interface ReelStore {
  // Oldest first.
  list(): Promise<ReelPic[]>;
  // Adds in order, until the cap; later ones are counted as `full`.
  add(pics: ReelPicInput[]): Promise<AddResult>;
  remove(id: number): Promise<void>;
  clear(): Promise<void>;
}

export function isValidPic(p: ReelPicInput): boolean {
  if (!p || !(p.px instanceof Uint8Array)) return false;
  if (!REEL_SIZES.some((s) => s.w === p.w && s.h === p.h)) return false;
  if (p.px.length !== p.w * p.h) return false;
  for (let i = 0; i < p.px.length; i++) if (p.px[i] > REEL_MAX_INDEX) return false;
  return true;
}

function sameDims(a: ReelPicInput, b: ReelPicInput): boolean {
  return a.w === b.w && a.h === b.h;
}

function samePixels(a: ReelPicInput, b: ReelPicInput): boolean {
  if (!sameDims(a, b) || a.px.length !== b.px.length) return false;
  for (let i = 0; i < a.px.length; i++) if (a.px[i] !== b.px[i]) return false;
  return true;
}

// A tiny storage backend, so the rules (cap, dedupe, validation) live in one
// place and the IndexedDB part stays thin.
export interface PicBackend {
  all(): Promise<ReelPic[]>; // ordered by id ascending
  put(pic: ReelPicInput): Promise<number>; // returns the new id
  delete(id: number): Promise<void>;
  clear(): Promise<void>;
}

export function createReelStore(backend: PicBackend, cap: number = REEL_CAP): ReelStore {
  // Serialise operations so two quick adds cannot both see room for one more.
  let chain: Promise<unknown> = Promise.resolve();
  const queue = <T>(job: () => Promise<T>): Promise<T> => {
    const next = chain.then(job, job);
    chain = next.catch(() => undefined);
    return next;
  };
  return {
    list: () => queue(() => backend.all()),
    add: (pics) =>
      queue(async () => {
        const stored = await backend.all();
        const result: AddResult = { added: 0, duplicates: 0, full: 0, invalid: 0 };
        for (const pic of pics) {
          if (!isValidPic(pic)) {
            result.invalid++;
            continue;
          }
          if (stored.some((s) => samePixels(s, pic))) {
            result.duplicates++;
            continue;
          }
          if (stored.length >= cap) {
            result.full++;
            continue;
          }
          // Copy the pixels so later changes to the caller's array cannot reach the store.
          const copy: ReelPicInput = { w: pic.w, h: pic.h, px: new Uint8Array(pic.px) };
          const id = await backend.put(copy);
          stored.push({ ...copy, id, palette: 1 });
          result.added++;
        }
        return result;
      }),
    remove: (id) => queue(() => backend.delete(id)),
    clear: () => queue(() => backend.clear()),
  };
}

export function createMemoryBackend(): PicBackend {
  const map = new Map<number, ReelPic>();
  let nextId = 1;
  return {
    async all() {
      return [...map.values()]
        .sort((a, b) => a.id - b.id)
        .map((p) => ({ ...p, px: new Uint8Array(p.px) }));
    },
    async put(pic) {
      const id = nextId++;
      map.set(id, { id, w: pic.w, h: pic.h, px: new Uint8Array(pic.px), palette: 1 });
      return id;
    },
    async delete(id) {
      map.delete(id);
    },
    async clear() {
      map.clear();
    },
  };
}

export function createMemoryReelStore(cap?: number): ReelStore {
  return createReelStore(createMemoryBackend(), cap);
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export function createIndexedDbBackend(factory: IDBFactory): PicBackend {
  let dbPromise: Promise<IDBDatabase> | null = null;
  const open = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
      dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = factory.open(REEL_DB_NAME, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore(REEL_STORE_NAME, { keyPath: "id", autoIncrement: true });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
        req.onblocked = () => reject(new Error("IndexedDB open blocked"));
      });
      dbPromise.catch(() => {
        dbPromise = null;
      });
    }
    return dbPromise;
  };
  return {
    async all() {
      const db = await open();
      const rows = (await request(
        db.transaction(REEL_STORE_NAME, "readonly").objectStore(REEL_STORE_NAME).getAll(),
      )) as ReelPic[];
      return rows
        .map((r) => ({ id: r.id, w: r.w, h: r.h, px: new Uint8Array(r.px), palette: 1 as const }))
        .sort((a, b) => a.id - b.id);
    },
    async put(pic) {
      const db = await open();
      const tx = db.transaction(REEL_STORE_NAME, "readwrite");
      const key = request(
        tx.objectStore(REEL_STORE_NAME).add({ w: pic.w, h: pic.h, px: pic.px, palette: 1 }),
      );
      await done(tx);
      return (await key) as number;
    },
    async delete(id) {
      const db = await open();
      const tx = db.transaction(REEL_STORE_NAME, "readwrite");
      tx.objectStore(REEL_STORE_NAME).delete(id);
      await done(tx);
    },
    async clear() {
      const db = await open();
      const tx = db.transaction(REEL_STORE_NAME, "readwrite");
      tx.objectStore(REEL_STORE_NAME).clear();
      await done(tx);
    },
  };
}

export interface ReelStoreHandle {
  store: ReelStore;
  // False when this browser cannot keep pictures (no IndexedDB): the store is
  // then in memory only, and the page says so (design section 3).
  persistent: boolean;
}

// The store for the browser. Never throws: a missing or blocked IndexedDB gives
// an in-memory store with `persistent: false`.
export function openReelStore(factory?: IDBFactory | null): ReelStoreHandle {
  let f: IDBFactory | null | undefined = factory;
  if (f === undefined) {
    try {
      f = typeof indexedDB !== "undefined" ? indexedDB : null;
    } catch {
      f = null;
    }
  }
  if (!f) return { store: createMemoryReelStore(), persistent: false };
  return { store: createReelStore(createIndexedDbBackend(f)), persistent: true };
}
