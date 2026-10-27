import { afterAll, describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { AchievementsFeature } from "./achievements/feature";
import { ACHIEVEMENTS } from "./achievements/data";
import { APARTMENT } from "./apartment";
import { DELIVERIES } from "./config";
import { Decor } from "./decor";
import { DECOR_DATA, GIFT_ITEMS, flickerAt, isTestItem } from "./decor-data";
import { CHECKPOINTS } from "./delivery-checkpoints";
import { Deliveries, parseDeliveries, type Milestone } from "./deliveries";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { TimeOfDayFeature } from "./time-of-day/feature";

// Issue 043 stage A: the real checkpoint list, the milestone type, the gifts.

const press: Controls = { ...NO_INPUT, interactPressed: true };
const FIRST_TEN: [string, string][] = [
  ["day 1", "art-robin"], ["day 3", "art-concert-poster"], ["day 5", "lamp-warm"], ["plant-3", "plant-dried"], ["day 8", "art-snow-wagon"],
  ["day 10", "lamp-stool-lamp"], ["desk-all", "art-serenity-now"], ["day 13", "art-canoes"], ["records-all", "lamp-candle"], ["day 16", "art-great-wave"],
];
const DAYS = [1, 3, 5, 8, 10, 13, 16];

const isAch = (w: string) => !w.startsWith("day ");
const asItem = (m: Milestone) => (typeof m.item === "string" ? [m.item] : m.item);

function newGame(storage = new FakeStorage()) {
  const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, random: () => 0.5 });
  const feature = new AchievementsFeature(game, { storage, keys: undefined });
  return { game, feature, storage };
}
const play = (game: Game, hours: number) => {
  for (let t = 0; t < (hours * 60) / 2; t += 0.5) game.update(0.5, NO_INPUT);
};
const skip = (game: Game, hours: number) => game.state.applyEffects([{ var: "clock", add: hours }]);
function standAtBox(game: Game) {
  const spot = taskSpots(APARTMENT.rooms.main).find((s) => s.id === "collect-delivery")!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(1 / 60, NO_INPUT);
}
function openBox(game: Game) {
  standAtBox(game);
  game.update(1 / 60, press);
  for (let i = 0; i < 5; i++) game.update(1 / 60, NO_INPUT);
  // The box shows one page per item; E closes them.
  for (let i = 0; i < 400 && game.dialogOpen; i++) game.update(1 / 60, i % 2 === 0 ? press : NO_INPUT);
}
const taskItem = (id: string) => {
  for (const level of Object.values(APARTMENT.rooms)) {
    const found = level.interactables.find((i) => i.id === id);
    if (found) return found;
  }
  throw new Error(id);
};
const complete = (game: Game, id: string) =>
  game.events.emit("taskComplete", { item: taskItem(id), award: { points: 10, basePoints: 10, repeatFactor: 1, multiplier: 1, chain: 1, qualityFactor: 1, timeFactor: 1 } });
const GIFT_IDS = new Set(GIFT_ITEMS.map((i) => i.id));
const ownedGifts = (game: Game) => GIFT_ITEMS.filter((i) => game.decor.owns(i.id)).map((i) => i.id);

describe("the production checkpoint list", () => {
  it("is the first ten of the note, in order", () => {
    expect(CHECKPOINTS.map((m) => asItem(m)[0])).toEqual(FIRST_TEN.map(([, i]) => i));
    CHECKPOINTS.forEach((m, i) => {
      const [when] = FIRST_TEN[i];
      if (isAch(when)) expect(m.achievement).toBe(when);
      else expect(m).toMatchObject({ stat: "days", atLeast: Number(when.slice(4)) });
      expect(m.delayHours).toBe(2);
    });
  });
  it("names only items that exist, once each, with unique ids, and real achievements", () => {
    const decor = new Decor();
    const used = CHECKPOINTS.flatMap(asItem);
    for (const id of used) {
      expect(decor.item(id), id).toBeDefined();
      expect(isTestItem(decor.item(id)!)).toBe(false);
      expect(decor.owns(id)).toBe(false);
    }
    expect(new Set(used).size).toBe(used.length);
    expect(new Set(CHECKPOINTS.map((m) => m.id)).size).toBe(CHECKPOINTS.length);
    for (const m of CHECKPOINTS) if (m.achievement) expect(ACHIEVEMENTS.some((a) => a.id === m.achievement)).toBe(true);
  });
  it("real items have sprites and fit the right slots", () => {
    const d = new Decor();
    for (const id of ["art-robin", "art-concert-poster", "art-snow-wagon", "art-serenity-now", "art-canoes", "art-great-wave", "art-starry-night", "art-water-lilies", "art-sunflowers"]) {
      d.own(id);
      expect(d.choices("art-table").map((i) => i.id)).toContain(id);
      expect(d.choices("art-desk").map((i) => i.id)).toContain(id);
      expect(d.choices("art-bed").map((i) => i.id)).not.toContain(id);
    }
    for (const id of ["lamp-warm", "lamp-candle", "lamp-stool-lamp"]) {
      d.own(id);
      expect(d.choices("lamp-sofa").map((i) => i.id)).toContain(id);
    }
    d.own("plant-dried");
    expect(d.choices("plant-shelf").map((i) => i.id)).toContain("plant-dried");
    expect(GIFT_ITEMS.length).toBe(13);
    expect(DECOR_DATA.items.some((i) => i.id === "lamp-test-stool-lamp")).toBe(true); // TEST items stay until stage 4
  });
});

describe("the milestone type", () => {
  const make = () => {
    const decor = new Decor();
    const d = new Deliveries(decor);
    return { decor, d };
  };
  it("a list gives the first item not owned, and nothing when all are owned (still fired)", () => {
    const { decor, d } = make();
    d.milestones = [{ id: "m", stat: "days", atLeast: 1, item: ["art-robin", "art-canoes"], delayHours: 0 }];
    decor.own("art-robin");
    d.check({ points: 0, tasks: 0, days: 1 });
    expect(d.waitingItems).toEqual(["art-canoes"]);
    const b = make();
    b.d.milestones = d.milestones;
    b.decor.own("art-robin");
    b.decor.own("art-canoes");
    b.d.check({ points: 0, tasks: 0, days: 5 });
    expect(b.d.waitingItems).toEqual([]);
    expect(b.d.hasFired("m")).toBe(true);
  });
  it("an owned item gives nothing and is marked fired, the next is not substituted", () => {
    const { decor, d } = make();
    d.milestones = [{ id: "a", stat: "days", atLeast: 1, item: "art-robin", delayHours: 0 }, { id: "b", stat: "days", atLeast: 2, item: "art-canoes", delayHours: 0 }];
    decor.own("art-robin");
    d.check({ points: 0, tasks: 0, days: 1 });
    expect(d.hasFired("a")).toBe(true);
    expect(d.waitingItems).toEqual([]);
    expect(d.pendingItems).toEqual([]);
  });
  it("an achievement milestone fires when unlocked, once, and not before", () => {
    const { d } = make();
    d.milestones = [{ id: "g", achievement: "plant-3", item: "plant-dried", delayHours: 2 }];
    d.check({ points: 99, tasks: 99, days: 99 });
    expect(d.hasFired("g")).toBe(false);
    d.check({ points: 0, tasks: 0, days: 0 }, (id) => id === "plant-3");
    expect(d.pendingItems.map((p) => p.id)).toEqual(["plant-dried"]);
    expect(d.pendingItems[0].at).toBeCloseTo(2, 6);
    d.check({ points: 0, tasks: 0, days: 0 }, () => true);
    expect(d.pendingItems.length).toBe(1);
  });
  it("a full queue does not lose the gift: it fires later", () => {
    // Lower the cap to the number of items that are not the gift, so the queue really is full
    // (with the real item list it cannot reach the production cap of 20).
    const cap = DELIVERIES as { maxQueued: number };
    const saved = cap.maxQueued;
    try {
      const { d, decor } = make();
      d.milestones = [{ id: "m", stat: "days", atLeast: 1, item: "art-robin", delayHours: 0 }];
      // Items that can be queued: not the gift, and not owned already (the defaults are owned).
      const others = DECOR_DATA.items.filter((i) => i.id !== "art-robin" && !decor.owns(i.id)).map((i) => i.id);
      cap.maxQueued = others.length;
      for (const id of others) expect(d.deliver(id, 100)).toBe(true);
      expect(d.pendingItems.length + d.waitingItems.length).toBe(cap.maxQueued); // full
      d.check({ points: 0, tasks: 0, days: 1 });
      expect(d.hasFired("m")).toBe(false); // refused for lack of room: not burned
      expect([...d.waitingItems, ...d.pendingItems.map((p) => p.id)]).not.toContain("art-robin");
      // Room appears (the queue empties): the same milestone now fires and the gift is queued once.
      cap.maxQueued = others.length + 1;
      d.check({ points: 0, tasks: 0, days: 1 });
      expect(d.hasFired("m")).toBe(true);
      // (a delay of 0 arrives at once, so it is waiting at the door rather than pending)
      const queued = [...d.waitingItems, ...d.pendingItems.map((p) => p.id)];
      expect(queued.filter((id) => id === "art-robin")).toHaveLength(1);
    } finally {
      cap.maxQueued = saved;
    }
  });
});

describe("the schedule in a real Game", () => {
  it("day 1 gift arrives 2 game hours after the day, the box shows, E opens it, the swap list offers it", () => {
    const { game } = newGame();
    play(game, 23.5);
    expect(game.deliveries.waiting).toBe(false);
    expect(game.deliveries.hasFired("gift-day-1")).toBe(false);
    play(game, 0.7); // day 1 reached
    expect(game.deliveries.hasFired("gift-day-1")).toBe(true);
    expect(game.deliveries.waiting).toBe(false);
    expect(game.state.get("parcel")).toBe(0);
    play(game, 2.1);
    expect(game.deliveries.waitingItems).toEqual(["art-robin"]);
    expect(game.state.get("parcel")).toBe(1);
    standAtBox(game);
    expect(game.interaction.nearby?.id).toBe("collect-delivery");
    openBox(game);
    expect(game.decor.owns("art-robin")).toBe(true);
    expect(game.decor.inventory().map((i) => i.id)).toContain("art-robin");
    for (const slot of ["art-table", "art-desk"]) {
      expect(game.decor.choices(slot).map((i) => i.id)).toContain("art-robin");
      expect(game.decor.canChange(slot)).toBe(true);
    }
    expect(game.decor.choices("art-bed").map((i) => i.id)).not.toContain("art-robin");
    expect(game.decor.place("art-table", "art-robin")).toBe(true);
    expect(game.decor.itemIn("art-table").id).toBe("art-robin");
    expect(game.decor.itemIn("art-desk").id).toBe("art-abstract");
  });

  it("20 game days of play match the schedule (a day gift 2 hours after its day), nothing fires twice", () => {
    const { game } = newGame();
    const seenAt = new Map<string, number>();
    const arrivals: string[] = [];
    game.deliveries.onArrive = (ids) => {
      for (const id of ids) {
        arrivals.push(id);
        seenAt.set(id, game.deliveries.hours);
      }
    };
    for (let h = 0; h < 20 * 24; h += 0.5) {
      play(game, 0.5);
      standAtBox(game);
      if (game.deliveries.waiting) openBox(game);
    }
    const days = FIRST_TEN.filter(([w]) => !isAch(w));
    expect(arrivals).toEqual(days.map(([, i]) => i));
    days.forEach(([w, i]) => {
      const at = seenAt.get(i)!;
      const due = Number(w.slice(4)) * 24 + 2;
      expect(at).toBeGreaterThanOrEqual(due - 1e-6);
      expect(at).toBeLessThan(due + 0.6);
    });
    expect(DAYS.every((d) => game.deliveries.hasFired(`gift-day-${d}`))).toBe(true);
    expect(ownedGifts(game)).toEqual(days.map(([, i]) => i).sort((a, b) => GIFT_ITEMS.findIndex((x) => x.id === a) - GIFT_ITEMS.findIndex((x) => x.id === b)));
  });

  it("an achievement gift comes 2 game hours after it unlocks", () => {
    const { game } = newGame();
    for (let i = 0; i < 3; i++) complete(game, "water-plant");
    game.update(0.5, NO_INPUT);
    expect(game.deliveries.hasFired("gift-green-thumb")).toBe(true);
    const at = game.deliveries.pendingItems.find((p) => p.id === "plant-dried")!.at;
    expect(at - game.deliveries.hours).toBeCloseTo(2, 1);
    play(game, 1.5);
    expect(game.deliveries.waiting).toBe(false);
    play(game, 0.6);
    expect(game.deliveries.waitingItems).toEqual(["plant-dried"]);
  });

  it("an achievement unlocked before a milestone existed gives its gift when the game loads", () => {
    const storage = new FakeStorage();
    const a = newGame(storage);
    for (let i = 0; i < 3; i++) complete(a.game, "water-plant");
    a.game.update(0.5, NO_INPUT);
    a.feature.save();
    // An old save: unlocked, but no deliveries field.
    const raw = JSON.parse(storage.getItem("life.progress.v1")!);
    delete raw.deliveries;
    delete raw.decor;
    storage.setItem("life.progress.v1", JSON.stringify(raw));
    const b = newGame(storage);
    expect(b.game.deliveries.pendingItems.map((p) => p.id)).toEqual(["plant-dried"]);
  });

  it("owned items are skipped: marked fired, nothing given", () => {
    const { game } = newGame();
    game.decor.own("art-robin");
    play(game, 24.1);
    expect(game.deliveries.hasFired("gift-day-1")).toBe(true);
    expect(game.deliveries.pendingItems).toEqual([]);
    expect(game.deliveries.waiting).toBe(false);
  });

  it("nothing fires twice after a reload, and the saves tolerate old shapes", () => {
    const storage = new FakeStorage();
    const a = newGame(storage);
    play(a.game, 27);
    openBox(a.game);
    expect(a.game.decor.owns("art-robin")).toBe(true);
    a.feature.save();
    const b = newGame(storage);
    expect(b.game.deliveries.hasFired("gift-day-1")).toBe(true);
    expect(b.game.decor.owns("art-robin")).toBe(true);
    play(b.game, 2);
    expect(b.game.deliveries.pendingItems).toEqual([]);
    expect(b.game.deliveries.waiting).toBe(false);
    // Old stage-1 style fired ids and milestone shapes are fine.
    expect(parseDeliveries({ hours: 5, fired: ["dev-days-1", 7, null], pending: [{ id: "art-robin", at: "x" }] })).toEqual({ hours: 5, pending: [], waiting: [], fired: ["dev-days-1"] });
    expect(parseDeliveries(undefined).fired).toEqual([]);
  });

  it("sleeping through a day boundary still fires the gift", () => {
    const { game } = newGame();
    play(game, 20);
    skip(game, 7);
    play(game, 0.2);
    expect(game.deliveries.hasFired("gift-day-1")).toBe(true);
    skip(game, 2);
    expect(game.deliveries.waitingItems).toEqual(["art-robin"]);
  });
});

describe("the candle flicker", () => {
  const f = { alpha: 0.2, radius: 0.08, seed: 11 };
  it("is deterministic, bounded and varies", () => {
    let lo = 9, hi = -9;
    for (let t = 0; t < 5; t += 0.01) {
      const a = flickerAt(f, t);
      expect(flickerAt(f, t)).toEqual(a);
      expect(a.alpha).toBeGreaterThanOrEqual(1 - f.alpha - 1e-9);
      expect(a.alpha).toBeLessThanOrEqual(1 + f.alpha + 1e-9);
      expect(Math.abs(a.radius - 1)).toBeLessThanOrEqual(f.radius + 1e-9);
      lo = Math.min(lo, a.alpha);
      hi = Math.max(hi, a.alpha);
    }
    expect(hi - lo).toBeGreaterThan(0.1);
    expect(flickerAt({ ...f, seed: 12 }, 1)).not.toEqual(flickerAt(f, 1));
  });
  it("ticks about twelve times a second and no step is a strobe", () => {
    const step = 1 / 360; // game hours in 1/12 of a second
    expect(flickerAt(f, 1 + step * 0.1)).toEqual(flickerAt(f, 1 + step * 0.9));
    let worst = 0, changes = 0;
    for (let k = 0; k < 360 * 20; k++) {
      const d = Math.abs(flickerAt(f, (k + 1.5) * step).alpha - flickerAt(f, (k + 0.5) * step).alpha);
      worst = Math.max(worst, d);
      if (d > 0) changes++;
    }
    expect(worst).toBeLessThan(0.2); // under half the 0.4 range
    expect(changes).toBeGreaterThan(360 * 20 * 0.9);
  });

  function rings(item: string, hours: number) {
    const { game } = newGame();
    const feature = new TimeOfDayFeature(game, { dev: false, search: "" });
    game.decor.own(item);
    game.decor.place("lamp-sofa", item);
    game.state.applyEffects([{ var: "clock", set: 23 }, { var: "blinds", set: 1 }]);
    (game.deliveries as unknown as { total: number }).total = hours;
    const arcs: number[][] = [];
    const ctx = new Proxy({}, { get: (_t, k) => (k === "arc" ? (...a: number[]) => void arcs.push(a.slice(0, 3)) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    feature.drawWorld(ctx, { x: 0, y: 0 });
    return arcs.filter((a) => a[0] === 136 && a[1] === 104).map((a) => a[2]);
  }
  it("moves the candle's glow over game time and leaves other lamps unchanged", () => {
    const a = rings("lamp-candle", 1), b = rings("lamp-candle", 1.04);
    expect(a).not.toEqual(b);
    expect(rings("lamp-candle", 1)).toEqual(a);
    expect(a[0]).toBeGreaterThan(20 * 0.9);
    expect(a[0]).toBeLessThan(20 * 1.1);
    for (const h of [0, 1.3, 7.7]) expect(rings("lamp-warm", h)).toEqual([40, 40 * 0.66, 40 * 0.33]);
    for (const h of [0, 1.3]) expect(rings("lamp-stool-lamp", h)).toEqual([24, 24 * 0.66, 24 * 0.33]);
  });
});

describe("fuzz: days, sleep, reloads and achievements against the real Game", () => {
  function rng(seed: number) {
    let s = seed >>> 0;
    return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  }
  const ACH_TASKS: Record<string, string[]> = {
    "plant-3": ["water-plant", "water-plant", "water-plant"],
    "desk-all": ["work", "journal", "tidy-desk"],
    "records-all": ["sort-records", "sort-records-year", "sort-records-fav", "sort-records-color"],
  };
  const seenOwned: number[] = [];
  afterAll(() => {
    // The fuzz must reach gifts of every kind, or it proves nothing.
    expect(seenOwned.some((n) => n >= 8)).toBe(true);
    expect(seenOwned.some((n) => n <= 6)).toBe(true);
  });
  for (let seed = 1; seed <= 40; seed++) {
    it(`seed ${seed}`, () => {
      const r = rng(seed * 104729);
      const storage = new FakeStorage();
      let { game, feature } = newGame(storage);
      const unlockedPlan = Object.keys(ACH_TASKS);
      const arrived: string[] = [];
      const hook = () => {
        game.deliveries.onArrive = (ids) => arrived.push(...ids);
      };
      hook();
      const invariants = () => {
        const q = [...game.deliveries.pendingItems.map((p) => p.id), ...game.deliveries.waitingItems];
        expect(new Set(q).size).toBe(q.length);
        for (const id of q) expect(game.decor.owns(id)).toBe(false);
        expect(game.deliveries.waitingItems.every((id) => GIFT_IDS.has(id))).toBe(true);
      };
      const steps = 30 + Math.floor(r() * 30);
      for (let i = 0; i < steps; i++) {
        const x = r();
        if (x < 0.3) play(game, r() * 8);
        else if (x < 0.5) {
          skip(game, 1 + r() * 7);
          play(game, 0.1);
        } else if (x < 0.65 && unlockedPlan.length) {
          const a = unlockedPlan.splice(Math.floor(r() * unlockedPlan.length), 1)[0];
          for (const t of ACH_TASKS[a]) complete(game, t);
          game.update(0.5, NO_INPUT);
        } else if (x < 0.8) {
          feature.save();
          ({ game, feature } = newGame(storage));
          hook();
        } else if (x < 0.95) {
          standAtBox(game);
          if (game.deliveries.waiting) openBox(game);
        } else play(game, 24);
        invariants();
      }
      // Let everything land, then open every box.
      for (let i = 0; i < 12; i++) {
        play(game, 1);
        standAtBox(game);
        if (game.deliveries.waiting) openBox(game);
      }
      invariants();
      const hours = game.deliveries.hours;
      const owned = new Set(ownedGifts(game));
      for (const m of CHECKPOINTS) {
        const reached = m.achievement ? feature.unlocks.has(m.achievement) : hours / 24 >= (m.atLeast ?? 0);
        const item = asItem(m)[0];
        // Arrived only if the 2 hour delay has passed (the last 12 hours were played, so all have).
        expect(owned.has(item), `${m.id} at ${hours.toFixed(1)}h`).toBe(reached);
        expect(game.deliveries.hasFired(m.id)).toBe(reached);
      }
      // Nothing owned that no milestone gave.
      seenOwned.push(owned.size);
      for (const id of owned) expect(CHECKPOINTS.some((m) => asItem(m).includes(id))).toBe(true);
    });
  }
});
