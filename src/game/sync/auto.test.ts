import { describe, expect, it } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "../achievements/feature";
import { APARTMENT } from "../apartment";
import { MAKE_TRACKS as M, SYNC } from "../config";
import { Game } from "../game";
import { DemoStore } from "../music/demo-store";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import { FakeServer } from "./fake-server";
import type { TransferIO } from "./io";
import type { SyncDoc } from "./merge";

// Automatic sync (issue 104) with a fake clock, a fake network and two simulated devices.

class Keys implements Listenable<KeyEventLike> {
  fns: Array<(e: KeyEventLike) => void> = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  fire(e: KeyEventLike) {
    for (const f of this.fns) f(e);
  }
}
class Visibility {
  hidden = false;
  fns: Array<(e: unknown) => void> = [];
  addEventListener(_t: string, fn: (e: unknown) => void) {
    this.fns.push(fn);
  }
  set(hidden: boolean) {
    this.hidden = hidden;
    for (const f of this.fns) f(undefined);
  }
}
const io: TransferIO = { copy: async () => true, read: async () => null, onPaste: () => () => {}, saveFile: () => true, pickFile: async () => null };
// The fake network answers in microtasks, so a run of them is enough (and fast, over simulated hours).
const flush = async () => {
  for (let i = 0; i < 60; i++) await Promise.resolve();
};

const SEC = 1000;
const MIN = 60 * SEC;

function device(server: FakeServer, storage = new FakeStorage(), start = 1_000_000) {
  const keys = new Keys();
  const visibility = new Visibility();
  const clock = { t: start };
  const demos = new DemoStore(storage, M.storageKey, { reserved: () => [], log: () => {} });
  const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, state: new ApartmentState(STATE_VARS) });
  const feature = new AchievementsFeature(game, { storage, keys, visibility, now: () => clock.t, demos, io, backend: server, origin: "https://game.test" });
  const press = (code: string) => keys.fire({ code });
  const api = feature as unknown as { doc(): SyncDoc };
  // Time passes in one-second frames; the network answers between them.
  const wait = async (ms: number) => {
    for (let spent = 0; spent < ms; spent += SEC) {
      clock.t += SEC;
      feature.update(1);
      await flush();
    }
  };
  const done = (id: string) => {
    const it = Object.values(APARTMENT.rooms).flatMap((l) => l.interactables).find((i) => i.id === id)!;
    game.events.emit("taskComplete", { item: it, award: { points: 10, basePoints: 10, repeatFactor: 1, multiplier: 1, chain: 1, qualityFactor: 1, timeFactor: 1 } });
  };
  return { storage, keys, visibility, clock, game, feature, press, api, wait, done, service: feature.syncService };
}
type Device = ReturnType<typeof device>;
const counts = (d: Device) => d.api.doc().progress.stats.taskCounts;

// Device A has played and has sync on; returns the shared server and A.
async function paired() {
  const server = new FakeServer();
  const A = device(server);
  A.done("coffee");
  A.press("KeyL");
  await A.service.turnOn();
  A.press("KeyL");
  server.calls = [];
  return { server, A };
}
// A fresh device B that joined A's key, then closed the pause screen and reloaded (so it has not acted this visit).
async function joined(server: FakeServer, A: Device, clock = 2_000_000) {
  const first = device(server, new FakeStorage(), clock);
  first.press("KeyL");
  await first.service.pair(A.service.key!);
  server.calls = [];
  return first;
}

describe("automatic sync: when it runs", () => {
  it("does nothing without a key", async () => {
    const server = new FakeServer();
    const A = device(server);
    await A.wait(20 * MIN);
    A.visibility.set(true);
    await flush();
    expect(server.calls).toEqual([]);
  });

  it("syncs a few seconds after load, in the background, and picks up the other device's save", async () => {
    const { server, A } = await paired();
    const B0 = await joined(server, A);
    B0.done("dishes");
    B0.press("KeyL");
    await B0.service.syncNow(); // B saved its dishes to the server
    // A reloads (a new feature on the same storage): nothing is played yet, so the merge applies at once.
    const A2 = device(server, A.storage, 3_000_000);
    server.calls = [];
    await A2.wait(4 * SEC);
    expect(server.calls).toEqual([]);
    await A2.wait(2 * SEC);
    expect(server.calls[0]).toBe("GET");
    expect(counts(A2)).toMatchObject({ coffee: 1, dishes: 1 });
  });

  it("a merge that arrives after the player has acted is held, kept for the next load, and applied when the pause screen opens", async () => {
    const { server, A } = await paired();
    const B = await joined(server, A);
    B.done("dishes");
    B.press("KeyL");
    await B.service.syncNow();
    B.press("KeyL");
    // A loads, plays something, and then the load sync brings B's dishes.
    const A2 = device(server, A.storage, 3_000_000);
    A2.done("brush-teeth");
    await A2.wait(10 * SEC);
    expect(server.calls).toContain("GET");
    expect(counts(A2)).not.toHaveProperty("dishes");
    expect(JSON.parse(A2.storage.getItem(SYNC.storageKey)!).held).toBeDefined();
    // The held merge survives a reload that never opened the pause screen? It is applied at that load.
    A2.press("KeyL");
    expect(counts(A2)).toMatchObject({ coffee: 1, dishes: 1, "brush-teeth": 1 });
    expect(JSON.parse(A2.storage.getItem(SYNC.storageKey)!).held).toBeUndefined();
  });

  it("a held merge is applied at the next load", async () => {
    const { server, A } = await paired();
    const B = await joined(server, A);
    B.done("dishes");
    B.press("KeyL");
    await B.service.syncNow();
    const A2 = device(server, A.storage, 3_000_000);
    A2.done("brush-teeth");
    await A2.wait(10 * SEC);
    const A3 = device(server, A2.storage, 4_000_000);
    expect(counts(A3)).toMatchObject({ dishes: 1, "brush-teeth": 1 });
  });

  it("every 5 minutes only if something changed", async () => {
    const { server, A } = await paired();
    await A.wait(10 * SEC); // the load sync
    server.calls = [];
    await A.wait(12 * MIN);
    expect(server.calls).toEqual([]);
    A.done("dishes");
    await A.wait(5 * MIN);
    expect(server.calls).toEqual(["GET", "PUT"]);
    // And the other device sees it.
    const B = await joined(server, A);
    expect(counts(B)).toMatchObject({ coffee: 1, dishes: 1 });
  });

  it("not while the pause screen or a task is open", async () => {
    const { server, A } = await paired();
    await A.wait(10 * SEC);
    A.done("dishes");
    server.calls = [];
    A.press("KeyL");
    await A.wait(8 * MIN);
    expect(server.calls).toEqual([]);
    A.press("KeyL");
    await A.wait(5 * SEC);
    expect(server.calls).toContain("PUT");
  });

  it("when the page is hidden it syncs at once, and when shown again only after a minute away", async () => {
    const { server, A } = await paired();
    await A.wait(10 * SEC);
    A.done("dishes");
    server.calls = [];
    A.visibility.set(true);
    await flush();
    expect(server.calls).toEqual(["GET", "PUT"]);
    server.calls = [];
    A.visibility.set(false);
    await A.wait(5 * SEC);
    expect(server.calls).toEqual([]);
    A.visibility.set(true);
    await flush();
    server.calls = [];
    await A.wait(70 * SEC);
    A.visibility.set(false);
    await A.wait(3 * SEC);
    expect(server.calls[0]).toBe("GET");
  });

  it("one at a time: a hide during a sync does not start a second", async () => {
    const { server, A } = await paired();
    A.done("dishes");
    A.visibility.set(true);
    A.visibility.set(true);
    await flush();
    expect(server.calls.filter((c) => c === "GET")).toHaveLength(1);
  });
});

describe("automatic sync: failures are quiet and retried with a growing wait", () => {
  it("offline: tries at 30 s, 1, 2, 4 minutes, then every 5; play is untouched; it recovers by itself", async () => {
    const { server, A } = await paired();
    server.script = Array(50).fill("offline");
    A.done("dishes");
    const before = JSON.stringify([counts(A), A.api.doc().progress.unlocked]);
    const at: number[] = [];
    const start = A.clock.t;
    let seen = 0;
    for (let s = 0; s < 14 * 60; s++) {
      await A.wait(SEC);
      if (server.calls.length > seen) {
        seen = server.calls.length;
        at.push(Math.round((A.clock.t - start) / SEC));
      }
    }
    // The first try is 5 s after load, then +30, +60, +120, +240, then +300.
    expect(at.slice(0, 6)).toEqual([5, 35, 95, 215, 455, 755]);
    expect(JSON.stringify([counts(A), A.api.doc().progress.unlocked])).toBe(before);
    expect(A.service.status()).toBe("noConnection");
    server.script = [];
    await A.wait(5 * MIN);
    expect(A.service.status()).toBe("on");
    const B = await joined(server, A);
    expect(counts(B)).toMatchObject({ dishes: 1 });
  });

  it("a server error and an unreadable save are retried too, and an unreadable one is never overwritten", async () => {
    const { server, A } = await paired();
    server.script = ["server"];
    await A.wait(10 * SEC);
    expect(A.service.status()).toBe("noConnection");
    const key = A.service.key!;
    const blob = JSON.stringify(server.store.map.get(key));
    server.script = ["garbage"];
    await A.wait(40 * SEC);
    expect(A.service.status()).toBe("unreadable");
    expect(JSON.stringify(server.store.map.get(key))).toBe(blob);
  });

  it("a key the server does not know stops automatic sync until the player acts", async () => {
    const { server, A } = await paired();
    server.store.map.clear();
    await A.wait(10 * SEC);
    expect(A.service.status()).toBe("keyNotFound");
    server.calls = [];
    await A.wait(30 * MIN);
    A.visibility.set(true);
    await flush();
    expect(server.calls).toEqual([]);
  });
});

describe("automatic sync can be turned off", () => {
  it("off: nothing runs by itself, SYNC NOW still works, and it stays off after a reload", async () => {
    const { server, A } = await paired();
    A.press("KeyL");
    A.press("KeyP");
    A.press("KeyA");
    expect(A.service.key).not.toBeNull();
    A.press("Escape");
    A.press("KeyL");
    A.done("dishes");
    server.calls = [];
    await A.wait(12 * MIN);
    A.visibility.set(true);
    await flush();
    expect(server.calls).toEqual([]);
    A.press("KeyL");
    A.press("KeyP");
    A.press("KeyS");
    await flush();
    expect(server.calls).toEqual(["GET", "PUT"]);
    const A2 = device(server, A.storage, 5_000_000);
    server.calls = [];
    await A2.wait(20 * MIN);
    expect(server.calls).toEqual([]);
    // Back on.
    A2.press("KeyL");
    A2.press("KeyP");
    A2.press("KeyA");
    A2.press("Escape");
    A2.press("KeyL");
    A2.visibility.set(true);
    await flush();
    expect(server.calls.length).toBeGreaterThan(0);
  });
});
