import { describe, expect, it } from "vitest";
import { unsupportedChars, textWidth } from "../render/font";
import { ENCOUNTERS } from "./config";
import { DECOR_DATA, isTestItem } from "./decor-data";
import { ADS, CARD_WORDS, ENCOUNTER_WORDS, MAX_BODY_LINES, MAX_LINE, adById, type Ad } from "./encounter-ads";
import { Encounters, arrivesWord, dayOf, impulseChance, parseEncounters, unsubscribeChance, type EncounterEnv } from "./encounters";

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });

// Issue 043 stage B: the logic of the ad encounters, with a fake random and a fake clock.

// A repeatable "random".
function seeded(seed = 7): () => number {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

const env = (over: Partial<EncounterEnv> = {}): EncounterEnv => ({ taskId: "doomscroll", hours: 100, random: () => 0, blocked: false, busy: false, ...over });

describe("the odds follow mood smoothly", () => {
  it("impulse buy: 40, 23.3, 6.7, 0 and 0 percent at mood 0, 25, 50, 60 and 100", () => {
    expect(impulseChance(0)).toBeCloseTo(0.4, 10);
    expect(impulseChance(25)).toBeCloseTo(0.2333, 3);
    expect(impulseChance(50)).toBeCloseTo(0.0667, 3);
    expect(impulseChance(60)).toBe(0);
    expect(impulseChance(100)).toBe(0);
  });

  it("impulse buy never rises as mood rises, and is exactly 0 from the reference mood up, even after Look closer", () => {
    let last = Infinity;
    for (let mood = 0; mood <= 100; mood += 0.5) {
      const c = impulseChance(mood);
      expect(c).toBeLessThanOrEqual(last);
      last = c;
      if (mood >= ENCOUNTERS.moodRef) {
        expect(c).toBe(0);
        expect(impulseChance(mood, true)).toBe(0);
      } else {
        expect(impulseChance(mood, true)).toBeCloseTo(Math.min(1, c + ENCOUNTERS.lookCloserImpulse), 10);
        expect(impulseChance(mood, true)).toBeGreaterThan(c);
      }
    }
  });

  it("unsubscribe success: the table of the note for persistence 0, 1 and 2", () => {
    const table: [number, number[]][] = [
      [0, [0.5, 0.4, 0.3]],
      [25, [0.6, 0.5, 0.4]],
      [50, [0.7, 0.6, 0.5]],
      [60, [0.74, 0.64, 0.54]],
      [100, [0.9, 0.8, 0.7]],
    ];
    for (const [mood, row] of table) row.forEach((expected, p) => expect(unsubscribeChance(mood, p), `mood ${mood} persistence ${p}`).toBeCloseTo(expected, 10));
  });

  it("unsubscribe success is kept between 5 and 95 percent and falls with persistence", () => {
    for (let mood = -50; mood <= 150; mood += 5) {
      let last = 1;
      for (const p of [0, 1, 2]) {
        const c = unsubscribeChance(mood, p);
        expect(c).toBeGreaterThanOrEqual(0.05);
        expect(c).toBeLessThanOrEqual(0.95);
        expect(c).toBeLessThanOrEqual(last);
        last = c;
      }
    }
    // The clamps are really reached with other numbers than the shipped ones' range: persistence far past 2 counts as 2.
    expect(unsubscribeChance(0, 99)).toBeCloseTo(0.3, 10);
    expect(unsubscribeChance(0, -5)).toBeCloseTo(0.5, 10);
    // Success rises with mood.
    for (const p of [0, 1, 2]) expect(unsubscribeChance(100, p)).toBeGreaterThan(unsubscribeChance(0, p));
  });

  it("junk moods and persistence give numbers, never NaN", () => {
    for (const m of [NaN, Infinity, -Infinity]) {
      expect(Number.isFinite(impulseChance(m))).toBe(true);
      expect(Number.isFinite(unsubscribeChance(m, 1))).toBe(true);
    }
    expect(Number.isFinite(unsubscribeChance(50, NaN))).toBe(true);
  });

  it("over many seeded draws the rates land near the chances (both sides of each chance)", () => {
    const rand = seeded(11);
    for (const mood of [0, 25, 50, 60, 100]) {
      for (const looked of [false, true]) {
        const c = impulseChance(mood, looked);
        let hits = 0;
        const n = 20000;
        for (let i = 0; i < n; i++) if (rand() < c) hits++;
        expect(hits / n).toBeCloseTo(c, 1);
      }
      for (const p of [0, 1, 2]) {
        const c = unsubscribeChance(mood, p);
        let hits = 0;
        const n = 20000;
        for (let i = 0; i < n; i++) if (rand() < c) hits++;
        expect(Math.abs(hits / n - c)).toBeLessThan(0.02);
      }
    }
  });
});

describe("when an encounter may start", () => {
  it("only a completed doomscroll or Answer emails rolls; the couch, the bed and everything else do not", () => {
    const e = new Encounters();
    expect(e.eligible(env({ taskId: "doomscroll" }))).toBe(true);
    expect(e.eligible(env({ taskId: "work" }))).toBe(true);
    for (const id of ["work-sofa", "work-bed", "coffee", "nap", "", "doomscroll-2"]) expect(e.eligible(env({ taskId: id })), id).toBe(false);
    expect(e.roll(env({ taskId: "work-sofa" }))).toBeNull();
    expect(e.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
  });

  it("not before the first day, then yes", () => {
    const e = new Encounters();
    for (const hours of [0, 1, 23.99, 47.99]) expect(e.roll(env({ hours })), `${hours}`).toBeNull();
    expect(e.roll(env({ hours: 48 }))).not.toBeNull();
  });

  it("the ad blocker stops it with no roll and no change to what is saved", () => {
    const e = new Encounters();
    let rolls = 0;
    const random = () => (rolls++, 0);
    expect(e.roll(env({ blocked: true, random }))).toBeNull();
    expect(rolls).toBe(0);
    expect(e.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
  });

  it("nothing else may be open", () => {
    const e = new Encounters();
    expect(e.roll(env({ busy: true }))).toBeNull();
    expect(e.roll(env())).not.toBeNull();
  });

  it("the cooldown blocks an encounter inside 3 game hours and allows one after", () => {
    const e = new Encounters();
    expect(e.roll(env({ hours: 60 }))).not.toBeNull();
    expect(e.roll(env({ hours: 60 }))).toBeNull();
    expect(e.roll(env({ hours: 62.99 }))).toBeNull();
    expect(e.roll(env({ hours: 63 }))).not.toBeNull();
  });

  it("a miss costs nothing: the cooldown starts only when an encounter shows", () => {
    const e = new Encounters();
    expect(e.roll(env({ hours: 60, random: () => 0.99 }))).toBeNull();
    expect(e.roll(env({ hours: 60.1 }))).not.toBeNull();
  });

  it("at most 2 a game day, across the day boundary, and the day after is a fresh count", () => {
    const e = new Encounters();
    expect(e.roll(env({ hours: 50 }))).not.toBeNull();
    expect(e.roll(env({ hours: 54 }))).not.toBeNull();
    expect(e.roll(env({ hours: 58 }))).toBeNull();
    expect(e.roll(env({ hours: 71.9 }))).toBeNull();
    // Day 3 starts at 72: a third encounter in a new day, and its own count.
    expect(e.roll(env({ hours: 72 }))).not.toBeNull();
    expect(e.roll(env({ hours: 76 }))).not.toBeNull();
    expect(e.roll(env({ hours: 80 }))).toBeNull();
    // A long skip (sleep) lands on a new day: the count restarts.
    expect(e.roll(env({ hours: 130 }))).not.toBeNull();
    expect(dayOf(130)).toBe(5);
  });

  it("over many eligible completions the rate is near the chance, never a faster pace than the cooldown and cap allow", () => {
    const rand = seeded(3);
    // Each completion is 10 game hours apart, so only the chance matters.
    const e = new Encounters();
    let shown = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (e.roll(env({ hours: 48 + i * 10, random: rand }))) shown++;
    expect(Math.abs(shown / n - ENCOUNTERS.chance)).toBeLessThan(0.015);
    // Every completion 1 game hour apart: the 3 hour cooldown and the cap of 2 a day hold the pace down.
    const f = new Encounters();
    const perDay = new Map<number, number>();
    let last = -Infinity;
    for (let i = 0; i < 5000; i++) {
      const hours = 48 + i;
      if (f.roll(env({ hours, random: () => 0 }))) {
        perDay.set(dayOf(hours), (perDay.get(dayOf(hours)) ?? 0) + 1);
        expect(hours - last).toBeGreaterThanOrEqual(ENCOUNTERS.cooldownHours);
        last = hours;
      }
    }
    for (const count of perDay.values()) expect(count).toBeLessThanOrEqual(ENCOUNTERS.maxPerDay);
  });

  it("a failed unsubscribe halves the cooldown and lifts the next chance to 50 percent, once; the cap still holds", () => {
    const e = new Encounters();
    expect(e.roll(env({ hours: 60 }))).not.toBeNull();
    e.failedUnsubscribe();
    expect(e.soon).toBe(true);
    // Half the cooldown (1.5 hours) is enough now, not 3.
    expect(e.roll(env({ hours: 61.4 }))).toBeNull();
    // The roll uses 50 percent: 0.4 passes (it would not at 22 percent), 0.6 does not.
    const miss = new Encounters();
    miss.load({ last: 60, day: 2, today: 1, soon: true, seen: [] });
    expect(miss.roll(env({ hours: 62, random: () => 0.6 }))).toBeNull();
    // The roll that was made used it up.
    expect(miss.soon).toBe(false);
    expect(miss.roll(env({ hours: 62.1, random: () => 0.4 }))).toBeNull();
    const hit = new Encounters();
    hit.load({ last: 60, day: 2, today: 1, soon: true, seen: [] });
    expect(hit.roll(env({ hours: 61.5, random: () => 0.4 }))).not.toBeNull();
    expect(hit.soon).toBe(false);
    // The daily cap holds: this was the second of day 2, so the next waits for day 3.
    expect(hit.roll(env({ hours: 70, random: () => 0 }))).toBeNull();
    hit.failedUnsubscribe();
    expect(hit.roll(env({ hours: 71, random: () => 0 }))).toBeNull();
    expect(hit.roll(env({ hours: 72, random: () => 0 }))).not.toBeNull();
  });

  it("the cooldown and the chance are not changed by a failed unsubscribe until it happens", () => {
    const e = new Encounters();
    expect(e.roll(env({ hours: 60 }))).not.toBeNull();
    expect(e.roll(env({ hours: 61.5 }))).toBeNull();
  });
});

describe("which ad", () => {
  it("is uniform over the usable ads and avoids the last 3 shown while there is another", () => {
    const e = new Encounters();
    const rand = seeded(5);
    const shown: string[] = [];
    for (let i = 0; i < 300; i++) {
      const ad = e.roll(env({ hours: 48 + i * 5, random: rand, taskId: "work" }));
      if (ad) shown.push(ad.id);
    }
    expect(shown.length).toBeGreaterThan(30);
    // Never the same ad within the 3 before it.
    shown.forEach((id, i) => expect(shown.slice(Math.max(0, i - ENCOUNTERS.recent), i), `${i}`).not.toContain(id));
    // And all of them turn up.
    expect(new Set(shown).size).toBe(ADS.length);
  });

  it("an ad the world cannot offer (no item, no art) is not offered; with nothing usable there is no encounter and no state change", () => {
    const e = new Encounters();
    const usable = (a: Ad) => a.id === "ad-candle";
    for (let i = 0; i < 5; i++) expect(e.pick({ random: seeded(i + 1), usable })?.id).toBe("ad-candle");
    const none = new Encounters();
    expect(none.roll(env({ usable: () => false }))).toBeNull();
    expect(none.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
  });

  it("with fewer ads than the repeat guard, it still offers one", () => {
    const e = new Encounters([ADS[0], ADS[1]]);
    for (let i = 0; i < 10; i++) expect(e.roll(env({ hours: 48 + i * 4 + Math.floor(i / 2) * 24 }))).not.toBeNull();
  });

  it("a random number of 1, NaN or negative never picks outside the list", () => {
    const e = new Encounters();
    for (const r of [1, NaN, -1, 0.9999999, 5]) expect(e.pick({ random: () => r })).not.toBeNull();
  });
});

describe("the saved field", () => {
  it("round-trips", () => {
    const e = new Encounters();
    e.roll(env({ hours: 61.5 }));
    e.failedUnsubscribe();
    const saved = JSON.parse(JSON.stringify(e.toJSON()));
    expect(saved).toMatchObject({ last: 61.5, day: 2, today: 1, soon: true });
    expect(saved.seen).toHaveLength(1);
    const f = new Encounters();
    f.load(saved, 61.5);
    expect(f.toJSON()).toEqual(e.toJSON());
  });

  it("an old save with no field is a fresh start: no cooldown, nothing counted", () => {
    for (const raw of [undefined, null, 5, "x", [], true]) {
      const e = new Encounters();
      e.load(raw);
      expect(e.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
      expect(e.roll(env({ hours: 48 }))).not.toBeNull();
    }
  });

  it("never throws on bad shapes: bad numbers, repeated, unknown or over-long ids and __proto__ are dropped", () => {
    const bad = [
      { last: -5, day: 1.5, today: -1, soon: "yes", seen: "ad-candle" },
      { last: NaN, day: Infinity, today: "1", soon: 1, seen: [1, null, {}, [], "", "x".repeat(65), "__proto__", "constructor", "nope"] },
      { last: "3", seen: ["ad-candle", "ad-candle", "ad-candle"] },
      { seen: { length: 2 } },
    ];
    for (const raw of bad) {
      const out = parseEncounters(raw);
      expect(out.soon).toBe(false);
      expect(out.last === undefined || (Number.isFinite(out.last) && out.last >= 0)).toBe(true);
      expect(Number.isInteger(out.day) && out.day >= 0).toBe(true);
      expect(Number.isInteger(out.today) && out.today >= 0).toBe(true);
      expect(new Set(out.seen).size).toBe(out.seen.length);
      for (const id of out.seen) expect(adById(id)).toBeDefined();
    }
    expect(parseEncounters(bad[2]).seen).toEqual(["ad-candle"]);
    expect(Object.keys(parseEncounters(JSON.parse('{"__proto__":{"soon":true},"soon":false}')))).not.toContain("__proto__");
  });

  it("seen is cut to its cap, keeping the newest", () => {
    const many = Array.from({ length: 100 }, (_, i) => `ad-${i}`);
    const out = parseEncounters({ seen: many }, undefined, () => true);
    expect(out.seen).toHaveLength(ENCOUNTERS.maxSeen);
    expect(out.seen.at(-1)).toBe(many[ENCOUNTERS.maxSeen * 4 - 1]);
    // While running, the list never passes the cap either.
    const e = new Encounters(Array.from({ length: 40 }, (_, i) => ({ ...ADS[0], id: `ad-x${i}` })));
    for (let i = 0; i < 200; i++) e.roll(env({ hours: 48 + i * 4, random: seeded(i + 1) }));
    expect(e.toJSON().seen.length).toBeLessThanOrEqual(ENCOUNTERS.maxSeen);
  });

  it("a `last` in the future of the clock is treated as the clock: nobody is locked out by a bad save", () => {
    const e = new Encounters();
    e.load({ last: 1e9, day: 3, today: 0, soon: false, seen: [] }, 60);
    expect(e.toJSON().last).toBe(60);
    // Even without being told at load, the gate does not use a time in the future.
    const f = new Encounters();
    f.load({ last: 1e9, day: 2, today: 0, soon: false, seen: [] });
    expect(f.roll(env({ hours: 100 }))).toBeNull();
    expect(f.toJSON().last).toBe(100);
    expect(f.roll(env({ hours: 103 }))).not.toBeNull();
  });

  it("`today` from another day does not count; one from this day does", () => {
    const e = new Encounters();
    e.load({ last: 10, day: 2, today: 2, soon: false, seen: [] });
    expect(e.roll(env({ hours: 60 }))).toBeNull();
    expect(e.roll(env({ hours: 72 }))).not.toBeNull();
  });

  it("an unknown ad id in seen is dropped", () => {
    const e = new Encounters();
    e.load({ seen: ["ad-candle", "ad-from-a-later-build"] });
    expect(e.toJSON().seen).toEqual(["ad-candle"]);
  });

  it("reset is a fresh start", () => {
    const e = new Encounters();
    e.roll(env({ hours: 60 }));
    e.failedUnsubscribe();
    e.reset();
    expect(e.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
  });
});

describe("the ad catalog", () => {
  const words = [...Object.values(ENCOUNTER_WORDS), ...Object.values(CARD_WORDS).flatMap((w) => Object.values(w))];
  const lines = (ad: Ad) => [ad.platform, ad.tag, ad.from ?? "", ad.headline, ...ad.body, ad.button, ...ad.closer];

  it("has seven to twelve ads with unique ids", () => {
    expect(ADS.length).toBeGreaterThanOrEqual(7);
    expect(ADS.length).toBeLessThanOrEqual(12);
    expect(new Set(ADS.map((a) => a.id)).size).toBe(ADS.length);
  });

  it("every ad sells a real decor item that has art, and all three card types are used", () => {
    for (const ad of ADS) {
      const item = DECOR_DATA.items.find((i) => i.id === ad.item);
      expect(item, `${ad.id} sells ${ad.item}`).toBeDefined();
      expect(`/public/sprites/${item!.sprite}.png` in spriteFiles, `${item!.sprite} has art`).toBe(true);
      expect(isTestItem(item!), `${ad.id} is not a TEST item`).toBe(false);
    }
    expect(new Set(ADS.map((a) => a.card))).toEqual(new Set(["email", "social", "text"]));
  });

  it("every line fits the card and uses only characters the pixel font has", () => {
    for (const ad of ADS) {
      expect(ad.body.length, ad.id).toBeGreaterThanOrEqual(2);
      expect(ad.body.length, ad.id).toBeLessThanOrEqual(MAX_BODY_LINES);
      expect(ad.closer, ad.id).toHaveLength(2);
      for (const line of lines(ad)) {
        expect([...line].length, `${ad.id}: ${line}`).toBeLessThanOrEqual(MAX_LINE);
        expect(unsupportedChars(line), `${ad.id}: ${line}`).toEqual([]);
        expect(textWidth(line), `${ad.id}: ${line}`).toBeLessThanOrEqual(288);
      }
      expect([0, 1, 2]).toContain(ad.persistence);
      expect(ad.delayHours).toBeGreaterThan(0);
      expect(ad.delayHours).toBeLessThanOrEqual(48);
    }
  });

  it("every word the narrator says can be drawn, and the menu labels fit the menu", () => {
    for (const w of words) expect(unsupportedChars(w), w).toEqual([]);
    for (const w of Object.values(CARD_WORDS)) expect(w.unsubscribe.length).toBeLessThanOrEqual(11);
  });

  it("no ad names a real person, and the products are not named after the big platforms", () => {
    const platforms = ["INSTAGRAM", "GMAIL", "AMAZON", "FACEBOOK MARKETPLACE", "MESSAGES"];
    for (const ad of ADS) {
      expect(platforms, ad.id).toContain(ad.platform);
      for (const p of platforms) expect(ad.brand.toUpperCase(), ad.id).not.toContain(p);
    }
  });

  it("arrival wording: later today up to 6 hours, otherwise tomorrow", () => {
    expect(arrivesWord(1)).toBe("laterToday");
    expect(arrivesWord(6)).toBe("laterToday");
    expect(arrivesWord(6.5)).toBe("tomorrow");
    expect(arrivesWord(24)).toBe("tomorrow");
  });
});
