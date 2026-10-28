import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryStore } from "../../../netlify/lib/memory-store.mjs";
import { handle } from "../../../netlify/lib/sync-handler.mjs";
import { FakeStorage } from "../achievements/fake-storage";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "../achievements/feature";
import { APARTMENT } from "../apartment";
import { SYNC } from "../config";
import { Game } from "../game";
import { DemoStore } from "../music/demo-store";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import { MAKE_TRACKS as M } from "../config";
import { ACHIEVEMENTS } from "../achievements/data";
import { pauseButtons } from "../achievements/draw";
import { setTouchHints } from "../../render/hints";
import { HttpBackend, keyFromText, linkFor } from "./client";
import { FakeServer } from "./fake-server";
import { trackText } from "./gen";
import type { TransferIO } from "./io";
import { canon, type SyncDoc } from "./merge";

afterEach(() => {
  setTouchHints(false);
  vi.unstubAllGlobals();
});

class Keys implements Listenable<KeyEventLike> {
  fns: Array<(e: KeyEventLike) => void> = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  fire(e: KeyEventLike) {
    for (const f of this.fns) f(e);
  }
}

class FakeIO implements TransferIO {
  clipboard: string | null = null;
  async copy(text: string) {
    this.clipboard = text;
    return true;
  }
  async read() {
    return this.clipboard;
  }
  onPaste() {
    return () => {};
  }
  saveFile() {
    return true;
  }
  async pickFile() {
    return null;
  }
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};

function device(server: FakeServer, start = 1_000_000) {
  const storage = new FakeStorage();
  const keys = new Keys();
  const io = new FakeIO();
  const clock = { t: start };
  const demos = new DemoStore(storage, M.storageKey, { reserved: () => [], log: () => {} });
  const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, state: new ApartmentState(STATE_VARS) });
  const feature = new AchievementsFeature(game, { storage, keys, now: () => clock.t, demos, io, backend: server, origin: "https://game.test" });
  const press = (code: string, extra: Partial<KeyEventLike> = {}) => keys.fire({ code, ...extra });
  const api = feature as unknown as { doc(): SyncDoc; flash: string | null; flashFor: number };
  return { storage, io, clock, demos, game, feature, press, api, service: feature.syncService };
}
type Device = ReturnType<typeof device>;

const item = (id: string) => {
  for (const level of Object.values(APARTMENT.rooms)) {
    const found = level.interactables.find((i) => i.id === id);
    if (found) return found;
  }
  throw new Error(id);
};
const complete = (d: Device, id: string) =>
  d.game.events.emit("taskComplete", { item: item(id), award: { points: 10, basePoints: 10, repeatFactor: 1, multiplier: 1, chain: 1, qualityFactor: 1, timeFactor: 1 } });
const same = (a: Device, b: Device) => {
  const x = a.api.doc();
  const y = b.api.doc();
  return canon(x.progress.stats) === canon(y.progress.stats) && canon(x.progress.unlocked) === canon(y.progress.unlocked) && canon(x.tracks) === canon(y.tracks);
};
const KEY = /^[a-z0-9]{32}$/;

describe("the links and keys", () => {
  it("keyFromText reads a bare key, a whole link, with spaces, and refuses the rest", () => {
    const k = "a1".repeat(16);
    expect(keyFromText(k)).toBe(k);
    expect(keyFromText(`  ${k}\n`)).toBe(k);
    expect(keyFromText(linkFor("https://sim.example", k))).toBe(k);
    expect(keyFromText(`https://x/#sync=${k.toUpperCase()}`)).toBe(k);
    for (const bad of ["", "abc", k + "x", k.slice(1), "https://x/#sync=" + k.slice(1), "https://x/?pair=" + k, "#sync=", "é".repeat(32)]) expect(keyFromText(bad), bad).toBeNull();
  });
  it("linkFor puts the key in the fragment", () => {
    expect(linkFor("https://game.test", "k")).toBe("https://game.test/#sync=k");
  });
});

describe("two devices pair and converge", () => {
  it("A turns on sync, B pairs with the link, both play, both sync, and they end the same", async () => {
    const server = new FakeServer();
    const A = device(server);
    complete(A, "coffee");
    A.clock.t += 1000;
    expect(await A.service.turnOn()).toBe("SYNC IS ON");
    const key = A.service.key!;
    expect(key).toMatch(KEY);
    expect(server.store.map.size).toBe(1);

    await A.feature.syncService.syncNow();
    await A.io.copy(linkFor("https://game.test", key));
    const B = device(server, 2_000_000);
    complete(B, "dishes");
    expect(await B.service.pair(A.io.clipboard!)).toBe("PAIRED. SYNC IS ON");
    expect(B.service.key).toBe(key);
    // B now has A's coffee as well as its own dishes.
    expect(B.api.doc().progress.stats.taskCounts).toMatchObject({ coffee: 1, dishes: 1 });

    B.clock.t += 5000;
    complete(B, "dishes");
    await B.service.syncNow();
    await A.service.syncNow();
    expect(A.api.doc().progress.stats.taskCounts).toMatchObject({ coffee: 1, dishes: 2 });
    expect(same(A, B)).toBe(true);
    // Another round changes nothing and writes nothing new that matters.
    await B.service.syncNow();
    await A.service.syncNow();
    expect(same(A, B)).toBe(true);
  });

  it("made tracks travel both ways", async () => {
    const server = new FakeServer();
    const A = device(server);
    const B = device(server, 2_000_000);
    A.demos.add(trackText("Alpha", 1), 10);
    B.demos.add(trackText("Beta", 2), 20);
    await A.service.turnOn();
    await B.service.pair(A.service.key!);
    await A.service.syncNow();
    expect(A.demos.list().map((d) => d.text).sort()).toEqual(B.demos.list().map((d) => d.text).sort());
    expect(A.demos.list()).toHaveLength(2);
  });

  it("the sync key is kept only in life.sync.v1: never in the document, and a reset does not drop it", async () => {
    const server = new FakeServer();
    const A = device(server);
    await A.service.turnOn();
    const key = A.service.key!;
    expect(JSON.stringify(A.api.doc())).not.toContain(key);
    expect(JSON.parse(A.storage.getItem(SYNC.storageKey)!).key).toBe(key);
    for (const [k, v] of A.storage.data) if (k !== SYNC.storageKey) expect(v, k).not.toContain(key);
    A.feature.reset();
    A.feature.save();
    expect(JSON.parse(A.storage.getItem(SYNC.storageKey)!).key).toBe(key);
    // The key is read again after a reload.
    const again = new AchievementsFeature(new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, state: new ApartmentState(STATE_VARS) }), { storage: A.storage, backend: server });
    expect(again.syncService.key).toBe(key);
  });
});

describe("failures never hurt the game and never lose anything", () => {
  it("offline: a message, the status says NO CONNECTION, the game's progress is untouched, and the next try works", async () => {
    const server = new FakeServer();
    const A = device(server);
    complete(A, "coffee");
    const before = canon(A.api.doc());
    server.script = ["offline"];
    expect(await A.service.turnOn()).toBe("NO CONNECTION");
    expect(A.service.key).toBeNull();
    expect(A.service.status()).toBe("off");
    expect(canon(A.api.doc())).toBe(before);
    expect(await A.service.turnOn()).toBe("SYNC IS ON");
    server.script = ["offline"];
    expect(await A.service.syncNow()).toBe("NO CONNECTION");
    expect(A.service.status()).toBe("noConnection");
    expect(await A.service.syncNow()).toBe("SYNCED");
    expect(A.service.status()).toBe("on");
  });

  it("a minted key whose first sync failed is kept, so a retry does not make a second key", async () => {
    const server = new FakeServer();
    const A = device(server);
    // POST works, GET fails.
    const real = server.get.bind(server);
    let first = true;
    server.get = async (k) => (first ? ((first = false), { ok: false, error: "offline" } as const) : real(k));
    expect(await A.service.turnOn()).toBe("NO CONNECTION");
    const key = A.service.key;
    expect(key).toMatch(KEY);
    await A.service.turnOn();
    expect(A.service.key).toBe(key);
    expect(server.store.map.size).toBe(1);
  });

  it("the server being full is UNAVAILABLE, and an existing pair keeps working", async () => {
    const server = new FakeServer();
    const A = device(server);
    await A.service.turnOn();
    const B = device(server);
    for (let i = 0; i < 999; i++) await server.store.set(String(i).padStart(32, "0"), "", { metadata: { created: server.now, seen: server.now, played: false } });
    expect(await B.service.turnOn()).toBe("UNAVAILABLE");
    expect(B.service.key).toBeNull();
    expect(await A.service.syncNow()).toBe("SYNCED");
  });

  it("a key the server does not know: KEY NOT FOUND, and pairing with a wrong key changes nothing", async () => {
    const server = new FakeServer();
    const A = device(server);
    await A.service.turnOn();
    const key = A.service.key!;
    server.store.map.delete(key);
    expect(await A.service.syncNow()).toBe("KEY NOT FOUND");
    expect(A.service.status()).toBe("keyNotFound");
    const B = device(server);
    complete(B, "coffee");
    const before = canon(B.api.doc());
    expect(await B.service.pair("z".repeat(32))).toBe("KEY NOT FOUND");
    expect(B.service.key).toBeNull();
    expect(await B.service.pair("not a key")).toBe("THAT IS NOT A SYNC KEY OR LINK");
    expect(canon(B.api.doc())).toBe(before);
  });

  it("a blob that is not a save is not overwritten, and neither is one from a newer game", async () => {
    const server = new FakeServer();
    const A = device(server);
    await A.service.turnOn();
    const key = A.service.key!;
    const entry = (await server.store.getWithMetadata(key))!;
    const set = (text: string) => server.store.set(key, text, { metadata: entry.metadata });

    await set(JSON.stringify({ app: "life", format: 1, device: "x", activeAt: 1, progress: {}, tracks: [] }).replace("{", "{ ").slice(0, 20));
    complete(A, "coffee");
    const garbage = (await server.store.getWithMetadata(key))!.data;
    expect(await A.service.syncNow()).toBe("SAVE ON THE SERVER IS UNREADABLE");
    expect((await server.store.getWithMetadata(key))!.data).toBe(garbage);

    // The server itself only accepts format 1, so plant a newer one directly in the store.
    await set(JSON.stringify({ app: "life", format: 2, progress: {}, tracks: [] }));
    const newer = (await server.store.getWithMetadata(key))!.data;
    expect(await A.service.syncNow()).toBe("UPDATE THE GAME");
    expect((await server.store.getWithMetadata(key))!.data).toBe(newer);
    expect(A.api.doc().progress.stats.taskCounts).toMatchObject({ coffee: 1 });
  });

  it("a refused PUT is reported and the local save is unchanged", async () => {
    const server = new FakeServer();
    const A = device(server);
    await A.service.turnOn();
    complete(A, "coffee");
    const before = canon(A.api.doc());
    server.put = async () => ({ ok: false, error: "refused" });
    expect(await A.service.syncNow()).toBe("THE SERVER REFUSED THE SAVE");
    expect(canon(A.api.doc())).toBe(before);
  });

  it("only one call runs at a time", async () => {
    const server = new FakeServer();
    const A = device(server);
    const first = A.service.turnOn();
    expect(await A.service.turnOn()).toBe("ONE MOMENT");
    expect(await first).toBe("SYNC IS ON");
    expect(server.store.map.size).toBe(1);
  });

  it("stop deletes the server copy and forgets the key; offline it keeps the key to try again", async () => {
    const server = new FakeServer();
    const A = device(server);
    await A.service.turnOn();
    server.script = ["offline"];
    expect(await A.service.stop()).toBe("NO CONNECTION");
    expect(A.service.key).not.toBeNull();
    expect(await A.service.stop()).toMatch(/STOPPED/);
    expect(A.service.key).toBeNull();
    expect(server.store.map.size).toBe(0);
    expect(JSON.parse(A.storage.getItem(SYNC.storageKey)!).key).toBeUndefined();
  });

  it("a merge that arrives while a task runs is held, not applied under the player", async () => {
    const server = new FakeServer();
    const A = device(server);
    await A.service.turnOn();
    const B = device(server, 2_000_000);
    complete(B, "dishes");
    await B.service.pair(A.service.key!);
    const release = A.game.lockInput();
    await A.service.syncNow();
    expect(A.api.doc().progress.stats.taskCounts.dishes).toBeUndefined();
    expect(A.feature.sync.held()).not.toBeNull();
    release();
    A.feature.openList();
    expect(A.api.doc().progress.stats.taskCounts.dishes).toBe(1);
  });
});

describe("the sync page", () => {
  it("is reached from the pause screen with P, and turn on, copy link, sync now and stop work from the keys", async () => {
    const server = new FakeServer();
    const A = device(server);
    A.press("KeyL");
    A.press("KeyP");
    A.press("KeyN");
    await flush();
    expect(A.service.key).toMatch(KEY);
    expect(A.api.flash).toBe("SYNC IS ON");
    A.press("KeyC");
    await flush();
    expect(A.io.clipboard).toBe(`https://game.test/#sync=${A.service.key}`);
    A.press("KeyS");
    await flush();
    expect(A.api.flash).toBe("SYNCED");
    const calls = server.calls.length;
    A.press("KeyX");
    A.press("KeyN"); // anything but Y says no
    await flush();
    expect(A.service.key).not.toBeNull();
    expect(server.calls.length).toBe(calls);
    A.press("KeyX");
    A.press("KeyY");
    await flush();
    expect(A.service.key).toBeNull();
    expect(server.store.map.size).toBe(0);
  });

  it("a pairing link asks first; no changes nothing, yes pairs and merges", async () => {
    const server = new FakeServer();
    const A = device(server);
    complete(A, "coffee");
    await A.service.turnOn();
    const key = A.service.key!;

    const B = device(server, 2_000_000);
    B.feature.offerPairing(key);
    expect(B.feature.listVisible).toBe(true);
    B.press("KeyN");
    await flush();
    expect(B.service.key).toBeNull();

    B.feature.offerPairing(key);
    B.press("KeyL"); // closing the page drops the question
    B.press("KeyL");
    B.press("KeyP");
    B.press("KeyY");
    await flush();
    expect(B.service.key).toBeNull();

    B.press("KeyL");
    B.feature.offerPairing(key);
    B.press("KeyY");
    await flush();
    expect(B.service.key).toBe(key);
    expect(B.api.doc().progress.stats.taskCounts).toMatchObject({ coffee: 1 });
  });

  it("touch: every button is a tap target, and the sync button is on the pause screen", async () => {
    setTouchHints(true);
    const server = new FakeServer();
    const A = device(server);
    A.press("KeyL");
    const view = { achievements: ACHIEVEMENTS, unlocked: () => false, cursor: 0, message: null, adBlocker: false, voice: A.game.dialogVoice?.label() ?? null, touch: true };
    const sync = pauseButtons(view).find((b) => b.id === "sync")!;
    const target = A.feature.tapTargets().find((t) => t.x === sync.rect.x && t.y === sync.rect.y)!;
    expect(target).toBeDefined();
    target.run();
    // Now on a page with three buttons (off): TURN ON, PASTE, BACK.
    expect(A.feature.tapTargets()).toHaveLength(3);
    A.feature.tapTargets()[0].run();
    await flush();
    expect(A.service.key).toMatch(KEY);
    expect(A.feature.tapTargets()).toHaveLength(5);
  });
});

describe("HttpBackend over fetch", () => {
  const routed = () => {
    const store = memoryStore();
    const seen: Array<{ url: string; method: string; key: string | null }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      seen.push({ url, method: init.method ?? "GET", key: headers.get(SYNC.keyHeader) });
      return handle(new Request("http://x" + url, { ...init, signal: undefined }), store, 1_000_000);
    });
    return { store, seen };
  };

  it("mints, reads, writes and deletes through the real handler, with the key in a header and never in the URL", async () => {
    const { seen } = routed();
    const backend = new HttpBackend();
    const minted = await backend.mint();
    expect(minted.ok && minted.value).toMatch(KEY);
    const key = (minted as { value: string }).value;
    expect(await backend.get(key)).toEqual({ ok: true, value: null });
    const text = JSON.stringify({ app: "life", format: 1, device: "d", activeAt: 4, progress: {}, tracks: [] });
    expect(await backend.put(key, text)).toEqual({ ok: true, value: true });
    expect(await backend.get(key)).toEqual({ ok: true, value: text });
    expect(await backend.put(key, "{}")).toEqual({ ok: false, error: "refused" });
    expect(await backend.del(key)).toEqual({ ok: true, value: true });
    expect(await backend.get(key)).toEqual({ ok: false, error: "notFound" });
    for (const s of seen) expect(s.url).toBe("/api/sync");
    expect(seen.filter((s) => s.method !== "POST").every((s) => s.key === key)).toBe(true);
  });

  it("a network error and a timeout are offline; 429 and 5xx are server; 503 is full", async () => {
    const backend = new HttpBackend("/api/sync", 20);
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("network");
    });
    expect(await backend.mint()).toEqual({ ok: false, error: "offline" });
    vi.stubGlobal("fetch", (_u: string, init: RequestInit) => new Promise((_res, rej) => init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")))));
    const t = Date.now();
    expect(await backend.get("a".repeat(32))).toEqual({ ok: false, error: "offline" });
    expect(Date.now() - t).toBeLessThan(1000);
    for (const [status, error] of [[429, "server"], [500, "server"], [503, "full"], [404, "notFound"]] as const) {
      vi.stubGlobal("fetch", async () => new Response("x", { status }));
      expect(await backend.get("a".repeat(32))).toEqual({ ok: false, error });
    }
    vi.stubGlobal("fetch", async () => new Response("not json", { status: 201 }));
    expect(await backend.mint()).toEqual({ ok: false, error: "server" });
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ key: "short" }), { status: 201 }));
    expect(await backend.mint()).toEqual({ ok: false, error: "server" });
  });
});
