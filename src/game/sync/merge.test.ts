import { describe, expect, it } from "vitest";
import { SYNC } from "../config";
import { DECOR_DATA } from "../decor-data";
import { trackBody } from "../music/track-body";
import { emptyDoc, NOW, randomDoc, rng, trackText } from "./gen";
import { canon, clampActive, mergeSaves, normaliseDoc, normaliseProgress, sameDoc, type SyncDoc } from "./merge";

const merge = (a: SyncDoc, b: SyncDoc) => mergeSaves(a, b, NOW);
const RUNS = 400;
const DAY = 24 * 60 * 60 * 1000;

describe("mergeSaves: the algebra (random saves, a fixed clock)", () => {
  it("is commutative", () => {
    const r = rng(1);
    for (let i = 0; i < RUNS; i++) {
      const a = randomDoc(r);
      const b = randomDoc(r);
      expect(canon(merge(a, b))).toBe(canon(merge(b, a)));
    }
  });

  it("is associative", () => {
    const r = rng(2);
    for (let i = 0; i < RUNS; i++) {
      const [a, b, c] = [randomDoc(r), randomDoc(r), randomDoc(r)];
      expect(canon(merge(merge(a, b), c))).toBe(canon(merge(a, merge(b, c))));
    }
  });

  it("is commutative and associative with many tracks (past the cap of 36) and few device ids", () => {
    const r = rng(3);
    const heavy = () => {
      const d = randomDoc(r, { devices: ["aaa", "bbb"], trackPool: 60 });
      const extra = Array.from({ length: 12 }, () => ({ text: trackText("Foo", r.int(60)), made: r.int(4) * 1000 }));
      const read = normaliseDoc({ ...d, tracks: [...d.tracks, ...extra] });
      if (!read.ok) throw new Error("bad");
      return read.doc;
    };
    for (let i = 0; i < RUNS; i++) {
      const [a, b, c] = [heavy(), heavy(), heavy()];
      expect(canon(merge(a, b))).toBe(canon(merge(b, a)));
      expect(canon(merge(merge(a, b), c))).toBe(canon(merge(a, merge(b, c))));
    }
  });

  it("is idempotent", () => {
    const r = rng(4);
    for (let i = 0; i < RUNS; i++) {
      const a = randomDoc(r);
      const b = randomDoc(r);
      const m = merge(a, b);
      expect(canon(merge(m, m))).toBe(canon(m));
      expect(canon(merge(m, a))).toBe(canon(m));
      expect(canon(merge(m, b))).toBe(canon(m));
      expect(canon(merge(a, a))).toBe(canon(merge(a, a)));
    }
  });

  it("an exact tie on the same device is decided by the apartment's text, not by the order", () => {
    const r = rng(5);
    for (let i = 0; i < RUNS; i++) {
      const a = randomDoc(r, { devices: ["same"] });
      const b = { ...randomDoc(r, { devices: ["same"] }), activeAt: a.activeAt };
      expect(canon(merge(a, b))).toBe(canon(merge(b, a)));
    }
  });

  it("merging with an unplayed empty save changes nothing for a played one", () => {
    const r = rng(6);
    for (let i = 0; i < RUNS; i++) {
      const a = randomDoc(r);
      if (clampActive(a.activeAt, NOW) === 0) continue;
      expect(canon(merge(a, emptyDoc()))).toBe(canon(merge(a, a)));
    }
  });
});

describe("mergeSaves: nothing owned is lost", () => {
  it("keeps every achievement, owned item, room and track body, and every counter is at least both inputs'", () => {
    const r = rng(10);
    for (let i = 0; i < RUNS; i++) {
      const a = randomDoc(r);
      const b = randomDoc(r);
      const m = merge(a, b);
      for (const side of [a, b]) {
        for (const id of side.progress.unlocked) expect(m.progress.unlocked).toContain(id);
        for (const id of side.progress.decor.owned) expect(m.progress.decor.owned).toContain(id);
        for (const room of side.progress.stats.rooms) expect(m.progress.stats.rooms).toContain(room);
        for (const key of ["totalPoints", "bestChain", "bestAward", "bestScore", "steps", "bumps", "cancelled", "minAwards", "playSeconds"] as const) {
          expect(m.progress.stats[key]).toBeGreaterThanOrEqual(side.progress.stats[key]);
        }
        for (const [id, n] of Object.entries(side.progress.stats.taskCounts)) expect(m.progress.stats.taskCounts[id]).toBeGreaterThanOrEqual(n);
      }
      const bodies = new Set([...a.tracks, ...b.tracks].map((t) => trackBody(t.text)));
      const kept = new Set(m.tracks.map((t) => trackBody(t.text)));
      expect(kept.size).toBe(m.tracks.length);
      if (bodies.size <= SYNC.maxTracks) for (const body of bodies) expect(kept.has(body)).toBe(true);
      else expect([...kept]).toEqual([...bodies].sort().slice(0, SYNC.maxTracks));
    }
  });

  it("leaves no owned item in the delivery queues", () => {
    const r = rng(11);
    for (let i = 0; i < RUNS; i++) {
      const m = merge(randomDoc(r), randomDoc(r));
      const owned = new Set(m.progress.decor.owned);
      for (const p of m.progress.deliveries.pending) expect(owned.has(p.id)).toBe(false);
      for (const id of m.progress.deliveries.waiting) expect(owned.has(id)).toBe(false);
    }
  });

  it("output reads back unchanged through the loaders", () => {
    const r = rng(12);
    for (let i = 0; i < RUNS; i++) {
      const m = merge(randomDoc(r), randomDoc(r));
      expect(canon(normaliseProgress(m.progress))).toBe(canon(m.progress));
      const again = normaliseDoc(JSON.parse(JSON.stringify(m)));
      expect(again.ok && canon(again.doc)).toBe(canon(m));
    }
  });
});

describe("mergeSaves: the apartment and who wins", () => {
  const withWorld = (d: SyncDoc, patch: Partial<SyncDoc>, hours?: number): SyncDoc => {
    const next = structuredClone(d);
    Object.assign(next, patch);
    if (hours !== undefined) next.progress.deliveries.hours = hours;
    return next;
  };
  const base = emptyDoc();

  it("the apartment (world, placements, deliveries, encounters) is exactly the newer side's, repaired only by what is owned", () => {
    const r = rng(20);
    for (let i = 0; i < RUNS; i++) {
      const a = randomDoc(r);
      const b = randomDoc(r);
      const [ta, tb] = [clampActive(a.activeAt, NOW), clampActive(b.activeAt, NOW)];
      if (ta === tb) continue;
      const win = ta > tb ? a : b;
      const m = merge(a, b);
      expect(m.progress.world).toEqual(win.progress.world);
      expect(m.progress.decor.placed).toEqual(win.progress.decor.placed);
      expect(m.progress.encounters).toEqual(win.progress.encounters);
      expect(m.progress.deliveries.hours).toBe(win.progress.deliveries.hours);
      expect(m.progress.deliveries.fired).toEqual(win.progress.deliveries.fired);
      expect(m.device).toBe(win.device);
      expect(m.activeAt).toBe(Math.max(ta, tb));
    }
  });

  it("an unplayed save (activeAt 0) never wins over a played one", () => {
    const played = withWorld(base, { activeAt: NOW - DAY, device: "zzz" }, 5);
    played.progress.world = { vars: { dishes: 3 }, room: "main", col: 2, row: 2, facing: "up" };
    const unplayed = withWorld(base, { activeAt: 0, device: "aaa" }, 50);
    expect(merge(played, unplayed).progress.world).toEqual(played.progress.world);
    expect(merge(unplayed, played).progress.world).toEqual(played.progress.world);
  });

  it("a far-future activeAt is cut to a day past now, so it stops winning once it is no longer newest", () => {
    const future = withWorld(base, { activeAt: NOW + 400 * DAY });
    expect(merge(future, base).activeAt).toBe(NOW + DAY);
    expect(clampActive(Number.NaN, NOW)).toBe(0);
    expect(clampActive(-1, NOW)).toBe(0);
    expect(clampActive("x", NOW)).toBe(0);
    // Later, the stored clamp is below the real time of another device's play.
    const later = mergeSaves(merge(future, base), withWorld(base, { activeAt: NOW + 2 * DAY, device: "bbb" }), NOW + 3 * DAY);
    expect(later.device).toBe("bbb");
  });

  it("on an equal activeAt the side with more game hours wins, then the device id", () => {
    const a = withWorld(base, { activeAt: NOW, device: "bbb" }, 10);
    const b = withWorld(base, { activeAt: NOW, device: "aaa" }, 20);
    a.progress.world = { vars: {}, room: "main", col: 1, row: 1, facing: "up" };
    b.progress.world = { vars: {}, room: "main", col: 2, row: 2, facing: "up" };
    expect(merge(a, b).progress.world?.col).toBe(2);
    const c = withWorld(a, { device: "ccc" }, 10);
    c.progress.world = { vars: {}, room: "main", col: 3, row: 3, facing: "up" };
    expect(merge(a, c).progress.world?.col).toBe(3);
    expect(merge(c, a).progress.world?.col).toBe(3);
  });

  it("an item owned on either side leaves the winner's queues, and each table row has a plain example", () => {
    const item = DECOR_DATA.items.find((i) => !DECOR_DATA.slots.some((s) => s.default === i.id) && i.how !== "start")!.id;
    const winner = withWorld(base, { activeAt: NOW }, 3);
    winner.progress.deliveries.pending = [{ id: item, at: 9 }];
    const other = withWorld(base, { activeAt: NOW - DAY, device: "other" });
    other.progress.decor.owned = [...other.progress.decor.owned, item].sort();
    other.progress.unlocked = ["coffee-3"];
    other.progress.stats.taskCounts = { coffee: 7 };
    winner.progress.stats.taskCounts = { coffee: 2, dishes: 4 };
    other.progress.stats.totalPoints = 10;
    winner.progress.stats.totalPoints = 99;
    other.progress.stats.rooms = ["kitchen"];
    const m = merge(winner, other);
    expect(m.progress.deliveries.pending).toEqual([]);
    expect(m.progress.decor.owned).toContain(item);
    expect(m.progress.unlocked).toEqual(["coffee-3"].filter((id) => normaliseProgress({ unlocked: [id] }).unlocked.length > 0));
    expect(m.progress.stats.taskCounts).toEqual({ coffee: 7, dishes: 4 });
    expect(m.progress.stats.totalPoints).toBe(99);
    expect(m.progress.stats.rooms).toContain("kitchen");
  });
});

describe("mergeSaves: made tracks", () => {
  const doc = (tracks: Array<{ text: string; made: number }>, device = "aaa") => {
    const read = normaliseDoc({ app: "life", format: 1, device, tracks });
    if (!read.ok) throw new Error("bad");
    return read.doc;
  };

  it("two devices that both made 'demo-1' with different text both keep their track", () => {
    const m = merge(doc([{ text: trackText("Foo", 1), made: 5 }]), doc([{ text: trackText("Foo", 2), made: 6 }], "bbb"));
    expect(m.tracks).toHaveLength(2);
  });

  it("the same body under two titles is one track, the earlier made, and a title chosen the same way either order", () => {
    const x = { text: trackText("Alpha", 3), made: 9 };
    const y = { text: trackText("Beta", 3), made: 4 };
    const m1 = merge(doc([x]), doc([y], "bbb"));
    const m2 = merge(doc([y], "bbb"), doc([x]));
    expect(m1.tracks).toEqual(m2.tracks);
    expect(m1.tracks).toEqual([{ text: y.text, made: 4 }]);
    const eq = merge(doc([{ text: x.text, made: 4 }]), doc([y], "bbb"));
    expect(eq.tracks[0].text).toBe(x.text);
  });

  it("a different made alone does not make the documents different once merged", () => {
    const a = doc([{ text: trackText("Foo", 1), made: 5 }]);
    const b = doc([{ text: trackText("Foo", 1), made: 50 }], "bbb");
    expect(canon(merge(a, b).tracks)).toBe(canon(merge(a, merge(a, b)).tracks));
  });

  it("drops tracks that would not parse, are too big or have a bad name", () => {
    const m = doc([
      { text: "nonsense", made: 1 },
      { text: trackText("Bad:Name", 1), made: 1 },
      { text: trackText("Ok", 1) + "# " + "x".repeat(3000), made: 1 },
      { text: trackText("Fine", 2), made: 1 },
    ]);
    expect(m.tracks).toHaveLength(1);
  });
});

describe("normaliseDoc: hostile input", () => {
  it("refuses what is not a save of this game, or is from a newer format", () => {
    expect(normaliseDoc(null)).toEqual({ ok: false, error: "notASave" });
    expect(normaliseDoc([])).toEqual({ ok: false, error: "notASave" });
    expect(normaliseDoc({ app: "other", format: 1 })).toEqual({ ok: false, error: "notASave" });
    expect(normaliseDoc({ app: "life", format: 2 })).toEqual({ ok: false, error: "newer" });
    expect(normaliseDoc({ app: "life", format: "1" })).toEqual({ ok: false, error: "damaged" });
    expect(normaliseDoc({ app: "life" })).toEqual({ ok: false, error: "damaged" });
  });

  it("junk inside a valid shell is dropped or defaulted, never thrown", () => {
    const junk = [undefined, null, 5, "x", [], {}, { unlocked: 5 }, { stats: "x" }, { decor: { owned: [1, {}, "a".repeat(500)], placed: 5 } }, { deliveries: { pending: "x", hours: -5 } }, { world: { room: 5 } }];
    for (const progress of junk) {
      const read = normaliseDoc({ app: "life", format: 1, device: { x: 1 }, activeAt: "soon", progress, tracks: progress });
      expect(read.ok).toBe(true);
      if (read.ok) {
        expect(read.doc.device).toBe("unknown");
        expect(read.doc.activeAt).toBe(0);
      }
    }
  });

  it("unknown ids, huge lists and prototype keys are cut down", () => {
    const rooms = Array.from({ length: 5000 }, (_, i) => `room${i}`);
    const tasks = Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`task${i}`, 3]));
    const read = normaliseDoc({
      app: "life",
      format: 1,
      progress: { unlocked: ["nope", "__proto__"], stats: { rooms, taskCounts: { ...tasks, __proto__: 4 } }, world: { vars: { nope: 1, __proto__: 2 }, room: "main", col: 1, row: 1, facing: "up" } },
    });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.doc.progress.unlocked).toEqual([]);
    expect(read.doc.progress.stats.rooms.length).toBeLessThanOrEqual(SYNC.maxRooms);
    expect(Object.keys(read.doc.progress.stats.taskCounts).length).toBeLessThanOrEqual(SYNC.maxTaskIds);
    expect(read.doc.progress.world?.vars).toEqual({});
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("sameDoc compares by content", () => {
    expect(sameDoc(emptyDoc(), emptyDoc())).toBe(true);
  });
});
