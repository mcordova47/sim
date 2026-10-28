import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryStore } from "../../../netlify/lib/memory-store.mjs";
import { KEY_PATTERN, LIMITS, expired, handle, mintKey, problemWith } from "../../../netlify/lib/sync-handler.mjs";

const NOW = 1_800_000_000_000;
const DAY = 24 * 3600 * 1000;
const doc = (extra: object = {}) => JSON.stringify({ app: "life", format: 1, device: "abc", activeAt: 5, progress: {}, tracks: [], ...extra });

const call = (store: ReturnType<typeof memoryStore>, method: string, key?: string, body?: string, now = NOW) =>
  handle(new Request("http://x/api/sync", { method, headers: key === undefined ? {} : { "X-Sync-Key": key }, body: method === "PUT" ? body : undefined }), store, now);
const mint = async (store: ReturnType<typeof memoryStore>, now = NOW) => (await (await call(store, "POST", undefined, undefined, now)).json()).key as string;

afterEach(() => vi.restoreAllMocks());

describe("keys", () => {
  it("are 32 characters of a-z0-9, different each time, and drawn without bias", () => {
    const keys = new Set(Array.from({ length: 50 }, () => mintKey()));
    expect(keys.size).toBe(50);
    for (const k of keys) expect(k).toMatch(KEY_PATTERN);
    // Bytes 252 and up are thrown away: a source that only gives those never finishes a key on its own, so feed some good ones.
    let calls = 0;
    const key = mintKey(() => (calls++ === 0 ? new Uint8Array(48).fill(255) : new Uint8Array(48).map((_, i) => i * 5)));
    expect(key).toMatch(KEY_PATTERN);
    expect(calls).toBe(2);
  });
  it("must match the pattern exactly (anchored) before anything is read", async () => {
    const store = memoryStore();
    const spy = vi.spyOn(store, "getWithMetadata");
    for (const bad of ["", "short", "A".repeat(32), "a".repeat(31), "a".repeat(33), "a".repeat(31) + "\n", "../" + "a".repeat(29), " " + "a".repeat(31)]) {
      for (const method of ["GET", "PUT", "DELETE"]) expect((await call(store, method, bad, doc())).status, `${method} ${JSON.stringify(bad)}`).toBe(400);
    }
    expect(spy).not.toHaveBeenCalled();
    expect((await call(store, "GET")).status).toBe(400);
  });
});

describe("minting, reading, writing, deleting", () => {
  it("POST makes a key and an empty entry; GET of it is an empty object", async () => {
    const store = memoryStore();
    const res = await call(store, "POST");
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const { key } = await res.json();
    expect(key).toMatch(KEY_PATTERN);
    const got = await call(store, "GET", key);
    expect(got.status).toBe(200);
    expect(await got.text()).toBe("{}");
  });

  it("PUT then GET returns the same text; PUT replaces", async () => {
    const store = memoryStore();
    const key = await mint(store);
    expect((await call(store, "PUT", key, doc({ activeAt: 7 }))).status).toBe(200);
    expect(await (await call(store, "GET", key)).text()).toBe(doc({ activeAt: 7 }));
    await call(store, "PUT", key, doc({ activeAt: 9 }));
    expect(await (await call(store, "GET", key)).text()).toBe(doc({ activeAt: 9 }));
  });

  it("PUT to a key that was never minted is 404 and creates nothing (a client cannot make keys by writing)", async () => {
    const store = memoryStore();
    expect((await call(store, "PUT", "a".repeat(32), doc())).status).toBe(404);
    expect(store.map.size).toBe(0);
    expect((await call(store, "GET", "a".repeat(32))).status).toBe(404);
  });

  it("DELETE removes the blob and the key, and a second one is 404", async () => {
    const store = memoryStore();
    const key = await mint(store);
    expect((await call(store, "DELETE", key)).status).toBe(200);
    expect((await call(store, "GET", key)).status).toBe(404);
    expect((await call(store, "PUT", key, doc())).status).toBe(404);
    expect((await call(store, "DELETE", key)).status).toBe(404);
  });

  it("other methods are 405", async () => {
    const store = memoryStore();
    for (const m of ["PATCH", "OPTIONS"]) expect((await call(store, m, "a".repeat(32))).status).toBe(405);
  });

  it("every answer is JSON with no-store and nosniff, and carries no CORS headers", async () => {
    const store = memoryStore();
    const key = await mint(store);
    for (const res of [await call(store, "GET", key), await call(store, "GET", "x"), await call(store, "PATCH", key)]) {
      expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
    }
  });
});

describe("what a PUT must look like", () => {
  const put = async (body: string | Uint8Array<ArrayBuffer>) => {
    const store = memoryStore();
    const key = await mint(store);
    const res = await handle(new Request("http://x/api/sync", { method: "PUT", headers: { "X-Sync-Key": key }, body }), store, NOW);
    return { status: res.status, store, key };
  };

  it("accepts a document of the right shape", async () => {
    expect((await put(doc())).status).toBe(200);
  });

  it("refuses bad JSON, non-objects, another app, an unknown or newer format, unknown top-level keys and wrong types", async () => {
    for (const body of ["", "nope", "[]", "null", "3", doc({ app: "other" }), doc({ format: 2 }), doc({ format: "1" }), doc({ extra: 1 }), doc({ progress: [] }), doc({ progress: null }), doc({ tracks: {} }), doc({ device: 5 }), doc({ activeAt: "now" }), doc({ tracks: Array(37).fill({}) })]) {
      const r = await put(body);
      expect(r.status, body.slice(0, 40)).toBe(400);
      // Nothing was written: the entry is still the empty one.
      expect((await r.store.getWithMetadata(r.key))!.data).toBe("");
    }
  });

  it("refuses invalid UTF-8", async () => {
    expect((await put(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]))).status).toBe(400);
  });

  it("caps the body at 128 KB counted in bytes (a multi-byte body just over it is refused, just under accepted)", async () => {
    const fill = (bytes: number) => {
      const base = doc({ device: "" }).length;
      // Each "é" is two bytes in UTF-8 but one character.
      const pad = "é".repeat(Math.floor((bytes - base) / 2));
      return doc({ device: pad });
    };
    const under = fill(LIMITS.maxBytes - 2);
    const over = fill(LIMITS.maxBytes + 4);
    expect(new TextEncoder().encode(under).length).toBeLessThanOrEqual(LIMITS.maxBytes);
    expect(new TextEncoder().encode(over).length).toBeGreaterThan(LIMITS.maxBytes);
    expect(over.length).toBeLessThan(LIMITS.maxBytes); // fewer characters than the cap, more bytes
    expect((await put(under)).status).toBe(200);
    expect((await put(over)).status).toBe(413);
  });

  it("refuses by Content-Length before reading, and by counting when the header lies", async () => {
    const store = memoryStore();
    const key = await mint(store);
    const big = "x".repeat(LIMITS.maxBytes + 1);
    const a = await handle(new Request("http://x/api/sync", { method: "PUT", headers: { "X-Sync-Key": key, "Content-Length": String(big.length) }, body: big }), store, NOW);
    expect(a.status).toBe(413);
    const lying = new Request("http://x/api/sync", { method: "PUT", headers: { "X-Sync-Key": key, "Content-Length": "10" }, body: big });
    expect((await handle(lying, store, NOW)).status).toBe(413);
  });
});

describe("limits and expiry", () => {
  it("the 1000-key cap: the 1001st POST is 503, and existing keys keep working", async () => {
    const store = memoryStore();
    const first = await mint(store);
    await call(store, "PUT", first, doc());
    for (let i = 0; i < LIMITS.maxKeys - 1; i++) await store.set(String(i).padStart(32, "0"), "", { metadata: { created: NOW, seen: NOW, played: false } });
    expect(store.map.size).toBe(LIMITS.maxKeys);
    const res = await call(store, "POST");
    expect(res.status).toBe(503);
    expect(store.map.size).toBe(LIMITS.maxKeys);
    expect((await call(store, "GET", first)).status).toBe(200);
    expect((await call(store, "PUT", first, doc({ activeAt: 9 }))).status).toBe(200);
  });

  it("a full store frees room by sweeping expired keys at mint time", async () => {
    const store = memoryStore();
    const old = NOW - 8 * DAY;
    for (let i = 0; i < LIMITS.maxKeys; i++) await store.set(String(i).padStart(32, "0"), "", { metadata: { created: old, seen: old, played: false } });
    const res = await call(store, "POST");
    expect(res.status).toBe(201);
    expect(store.map.size).toBe(1);
  });

  it("expiry: unplayed after 7 days, anything unseen for 90 days, a played save is kept past 7", () => {
    const m = (o: object) => ({ created: NOW, seen: NOW, played: false, ...o });
    expect(expired(m({}), NOW + 7 * DAY)).toBe(false);
    expect(expired(m({}), NOW + 7 * DAY + 1)).toBe(true);
    expect(expired(m({ played: true }), NOW + 30 * DAY)).toBe(false);
    expect(expired(m({ played: true }), NOW + 90 * DAY + 1)).toBe(true);
    expect(expired(m({ played: true, seen: NOW + 50 * DAY }), NOW + 120 * DAY)).toBe(false);
    expect(expired(undefined, NOW)).toBe(true);
    expect(expired({ created: "x" }, NOW)).toBe(true);
  });

  it("an expired key is gone on its next use: 404, and deleted", async () => {
    const store = memoryStore();
    const key = await mint(store);
    expect((await call(store, "GET", key, undefined, NOW + 8 * DAY)).status).toBe(404);
    expect(store.map.has(key)).toBe(false);

    const played = await mint(store);
    await call(store, "PUT", played, doc({ activeAt: 5 }));
    expect((await call(store, "GET", played, undefined, NOW + 8 * DAY)).status).toBe(200);
    expect((await call(store, "GET", played, undefined, NOW + 8 * DAY + 91 * DAY)).status).toBe(404);
  });

  it("a PUT with no activeAt counts as unplayed; one with a time counts as played", async () => {
    const store = memoryStore();
    const key = await mint(store);
    await call(store, "PUT", key, doc({ activeAt: 0 }));
    expect((await store.getMetadata(key))!.metadata.played).toBe(false);
    await call(store, "PUT", key, doc({ activeAt: 3 }));
    expect((await store.getMetadata(key))!.metadata.played).toBe(true);
    expect((await store.getMetadata(key))!.metadata.created).toBe(NOW);
  });

  it("a read refreshes last-seen at most once a day, and does not overwrite a save that arrives meanwhile", async () => {
    const store = memoryStore();
    const key = await mint(store);
    await call(store, "PUT", key, doc({ activeAt: 3 }));
    const set = vi.spyOn(store, "set");
    await call(store, "GET", key, undefined, NOW + DAY / 2);
    expect(set).not.toHaveBeenCalled();
    await call(store, "GET", key, undefined, NOW + 2 * DAY);
    expect(set).toHaveBeenCalledTimes(1);
    expect((await store.getMetadata(key))!.metadata.seen).toBe(NOW + 2 * DAY);

    // A PUT lands between the read of the entry and the refresh: the refresh must lose.
    const real = store.getWithMetadata.bind(store);
    vi.spyOn(store, "getWithMetadata").mockImplementationOnce(async (k, o) => {
      const entry = await real(k, o);
      await store.set(key, doc({ activeAt: 99 }), { metadata: { created: NOW, seen: NOW + 4 * DAY, played: true } });
      return entry;
    });
    await call(store, "GET", key, undefined, NOW + 4 * DAY);
    expect((await store.getWithMetadata(key))!.data).toBe(doc({ activeAt: 99 }));
  });

  it("problemWith is the single place that judges a body", () => {
    expect(problemWith(doc())).toBeNull();
    expect(problemWith("{")).not.toBeNull();
  });
});

describe("no logging, and failures are quiet", () => {
  it("writes nothing to the console, even when the store throws", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    const store = memoryStore();
    const key = await mint(store);
    await call(store, "GET", key);
    await call(store, "PUT", key, "garbage");
    vi.spyOn(store, "getWithMetadata").mockRejectedValue(new Error(`boom ${key}`));
    const res = await call(store, "GET", key);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(key);
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
});
