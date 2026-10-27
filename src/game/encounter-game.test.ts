import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { FakeStorage } from "./achievements/fake-storage";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./achievements/feature";
import { APARTMENT } from "./apartment";
import { ACHIEVEMENTS_UI as UI, DELIVERIES, ENCOUNTERS } from "./config";
import { DECOR_DATA } from "./decor-data";
import { encounterFromSearch } from "./decor-dev";
import { ADS, CARD_WORDS, ENCOUNTER_WORDS, adById } from "./encounter-ads";
import { Game } from "./game";
import type { Interactable } from "./interactable";
import type { Level } from "./level";
import { taskSpots } from "./plan-checks";
import { FakeAudioContext } from "./sound/fake-audio";
import { SoundFeature } from "./sound/feature";
import { parseTileMap } from "./tilemap";

// Issue 043 stage B: ad encounters in a running game: when they start, what each choice does,
// what Escape does at every moment, what is saved.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const rooms = APARTMENT.rooms;
// The main room with only the doomscroll offered (an object offers the first task that can start, and the bed's first is making it).
const main: Level = { ...rooms.main, interactables: rooms.main.interactables.filter((i) => i.id === "doomscroll") };

// The random numbers, in order; after they run out, `rest`.
function script(rest = 0.5) {
  const queue: number[] = [];
  return {
    random: () => (queue.length ? queue.shift()! : rest),
    next: (...values: number[]) => queue.push(...values),
    clear: () => (queue.length = 0),
  };
}

function setup(over: { hours?: number; mood?: number } = {}) {
  const rnd = script();
  const game = new Game(main, { rooms: { ...rooms, main }, random: rnd.random });
  // Past the first day, so encounters are possible.
  game.deliveries.advance(over.hours ?? 60);
  if (over.mood !== undefined) game.state.applyEffects([{ var: "mood", set: over.mood }]);
  const log = { cancelled: 0, started: [] as string[], completed: [] as string[] };
  game.events.on("taskCancelled", () => log.cancelled++);
  game.events.on("taskStart", ({ item }) => log.started.push(item.id));
  game.events.on("taskComplete", ({ item }) => log.completed.push(item.id));
  return { game, rnd, log };
}

const frames = (game: Game, n: number, controls: Controls = NO_INPUT) => {
  for (let i = 0; i < n; i++) game.update(dt, controls);
};

// Stands at a task's spot, presses E and runs until it is over or an encounter has started.
function doTask(game: Game, id: string, level = main) {
  const spot = taskSpots(level).find((s) => s.id === id)!;
  expect(spot, `a spot for ${id}`).toBeDefined();
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  game.update(dt, press);
  for (let i = 0; i < 60 * 30 && game.interaction.active && !game.interaction.active.item.encounter; i++) {
    game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
  }
  // An encounter plays its entrance before the card and the menu (issue 080).
  if (game.interaction.active?.item.encounter) for (let i = 0; i < 120 && !game.dialogOpen; i++) game.update(dt, NO_INPUT);
}

// Waits out the doomscroll's own short cooldown (about 20 game minutes), so it can be started again.
function ready(game: Game) {
  const item = main.interactables[0];
  for (let i = 0; i < 60 * 30 && game.interaction.cooldownRemaining(item) > 0; i++) game.update(dt, NO_INPUT);
}

// Runs the entrance, until the card's dialog is up.
function entrance(game: Game) {
  for (let i = 0; i < 120 && !game.dialogOpen; i++) game.update(dt, NO_INPUT);
}

const mood = (g: Game) => g.state.get("mood");
const score = (g: Game) => g.interaction.scoreboard.score;
const encounterUp = (g: Game) => g.interaction.active?.item.encounter === true;
const view = (g: Game) => g.dialogView;
const labels = (g: Game) => {
  const v = view(g);
  return v?.kind === "menu" ? v.choices : [];
};
const prompt = (g: Game) => {
  const v = view(g);
  return v?.kind === "menu" ? v.promptLines.join(" ") : v?.kind === "say" ? v.lines.join(" ") : "";
};

// Moves the menu's cursor to `label` and presses E.
function pick(game: Game, label: string) {
  const v = view(game);
  if (v?.kind !== "menu") throw new Error(`no menu is up (it shows ${v?.kind ?? "nothing"})`);
  const index = v.choices.indexOf(label);
  expect(index, `${label} in ${v.choices.join(", ")}`).toBeGreaterThanOrEqual(0);
  for (let i = 0; i < ((index - v.cursor + v.choices.length) % v.choices.length); i++) game.update(dt, { ...NO_INPUT, dirPressed: "down" });
  game.update(dt, press);
}

// Reads every page of whatever dialog is up, until none is. Returns the text it showed.
function readAll(game: Game): string[] {
  const seen: string[] = [];
  for (let i = 0; i < 400 && game.dialogOpen; i++) {
    const v = view(game);
    if (v?.kind === "say" && v.waiting) seen.push(v.lines.join(" "));
    game.update(dt, press);
  }
  // The encounter is over once its exit wipe has played.
  for (let i = 0; i < 120 && encounterUp(game); i++) game.update(dt, NO_INPUT);
  return seen;
}

// A game with a doomscroll standing by, a hit at the roll, and the first ad (the robin print).
function toFirstEncounter(s = setup()) {
  s.rnd.next(0.1, 0.01);
  doTask(s.game, "doomscroll");
  expect(encounterUp(s.game)).toBe(true);
  return s;
}

describe("when an encounter starts", () => {
  it("after a completed doomscroll with a hit: the card, a narrator line and the four choices in order", () => {
    const { game, log } = toFirstEncounter();
    expect(adById("ad-robin")!.card).toBe("social");
    expect(game.interaction.active?.item.id).toBe("encounter");
    expect(game.dialogOpen).toBe(true);
    expect(labels(game)).toEqual(["IGNORE", "HIDE AD", "LOOK CLOSER", "ADD TO CART"]);
    expect(prompt(game)).toContain("A SPONSORED POST HAS APPEARED.");
    // The doomscroll paid and finished normally; the encounter is not a completion.
    expect(log.completed).toEqual(["doomscroll"]);
    expect(log.cancelled).toBe(0);
    expect(game.inputLocked).toBe(true);
    // It counts for the cooldown and the daily cap at once.
    expect(game.encounters.toJSON()).toMatchObject({ today: 1, soon: false, seen: ["ad-robin"] });
  });

  it("a miss, the couch and the bed code tasks, a cancelled task and the ad blocker all give none", () => {
    const miss = setup();
    miss.rnd.next(0.9);
    doTask(miss.game, "doomscroll");
    expect(encounterUp(miss.game)).toBe(false);
    expect(miss.game.encounters.toJSON().today).toBe(0);

    // Code from the couch and Work in bed: the typing mini-game reads keys, so the rule is checked on the gate itself.
    const couch = setup();
    for (const id of ["work-sofa", "work-bed"]) {
      expect(rooms.main.interactables.some((i) => i.id === id), `${id} is a real task`).toBe(true);
      expect(couch.game.encounters.eligible({ taskId: id, hours: 100, random: () => 0, blocked: false, busy: false }), id).toBe(false);
      expect(couch.game.encounters.roll({ taskId: id, hours: 100, random: () => 0, blocked: false, busy: false })).toBeNull();
    }
    expect(couch.game.encounters.toJSON().today).toBe(0);

    const cancelled = setup();
    cancelled.rnd.next(0);
    const spot = taskSpots(main).find((s) => s.id === "doomscroll")!;
    cancelled.game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
    cancelled.game.update(dt, NO_INPUT);
    cancelled.game.update(dt, press);
    frames(cancelled.game, 30);
    cancelled.game.update(dt, esc);
    frames(cancelled.game, 5);
    expect(cancelled.game.interaction.busy).toBe(false);
    expect(cancelled.log.cancelled).toBe(1);
    expect(cancelled.game.encounters.toJSON().today).toBe(0);

    const blocked = setup();
    blocked.game.setAdBlocker(true);
    blocked.rnd.next(0);
    doTask(blocked.game, "doomscroll");
    expect(encounterUp(blocked.game)).toBe(false);
    expect(blocked.game.encounters.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
  });

  it("not before the first day; not inside the cooldown; at most two a game day", () => {
    const early = setup({ hours: 30 });
    early.rnd.next(0);
    doTask(early.game, "doomscroll");
    expect(encounterUp(early.game)).toBe(false);

    const s = toFirstEncounter(setup({ hours: 60 }));
    pick(s.game, "IGNORE");
    readAll(s.game);
    expect(s.game.interaction.busy).toBe(false);
    // Straight after: the cooldown.
    ready(s.game);
    s.rnd.next(0);
    s.game.deliveries.advance(1);
    doTask(s.game, "doomscroll");
    expect(encounterUp(s.game)).toBe(false);
    // After three game hours: the second of the day.
    s.game.deliveries.advance(3);
    ready(s.game);
    s.rnd.next(0, 0.5);
    doTask(s.game, "doomscroll");
    expect(encounterUp(s.game)).toBe(true);
    pick(s.game, "IGNORE");
    readAll(s.game);
    // A third the same day waits for the next.
    s.game.deliveries.advance(4);
    ready(s.game);
    s.rnd.next(0, 0.5);
    doTask(s.game, "doomscroll");
    expect(encounterUp(s.game)).toBe(false);
    expect(s.game.encounters.toJSON().today).toBe(ENCOUNTERS.maxPerDay);
  });

  it("it also starts after Answer emails (the task named `work`)", () => {
    // A room with one task called `work` that just waits, so the typing mini-game does not have to be played.
    const task: Omit<Interactable, "zones"> = { id: "work", name: "Answer emails", prompt: "Work", duration: 1, points: 10 };
    const level: Level = { ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [task] } }), facing: "right" };
    const rnd = script();
    const game = new Game(level, { random: rnd.random });
    game.deliveries.advance(60);
    rnd.next(0.1, 0.01);
    game.update(dt, NO_INPUT);
    game.update(dt, press);
    frames(game, 90);
    expect(encounterUp(game)).toBe(true);
    // And the same task under another id does not.
    const other = new Game({ ...level, interactables: level.interactables.map((i) => ({ ...i, id: "work-sofa" })) }, { random: rnd.random });
    other.deliveries.advance(60);
    rnd.next(0.1, 0.01);
    other.update(dt, NO_INPUT);
    other.update(dt, press);
    frames(other, 90);
    expect(encounterUp(other)).toBe(false);
  });

  it("holds the clock: nothing moves while it is open, and not a coin is paid", () => {
    const { game } = toFirstEncounter();
    const clock = game.state.get("clock");
    const hours = game.deliveries.hours;
    const points = score(game);
    frames(game, 300);
    expect(game.state.get("clock")).toBe(clock);
    expect(game.deliveries.hours).toBe(hours);
    expect(score(game)).toBe(points);
  });
});

describe("the choices", () => {
  it("Ignore: a calm lift of mood, one plain line, then it is over; nothing paid, nothing cancelled", () => {
    const { game, rnd, log } = toFirstEncounter();
    const m = mood(game);
    const points = score(game);
    rnd.next(0.99);
    pick(game, "IGNORE");
    expect(readAll(game)).toEqual(["YOU SCROLL PAST IT."]);
    expect(mood(game)).toBeCloseTo(m + ENCOUNTERS.mood.ignore, 5);
    expect(score(game)).toBe(points);
    expect(game.interaction.busy).toBe(false);
    expect(game.inputLocked).toBe(false);
    expect(log.cancelled).toBe(0);
    expect(game.deliveries.pendingItems).toHaveLength(0);
  });

  it("Ignore at a low mood may turn into a purchase: the impulse line, the order, no loss", () => {
    const { game, rnd } = toFirstEncounter(setup({ mood: 10 }));
    expect(mood(game)).toBeLessThan(ENCOUNTERS.moodRef);
    rnd.next(0);
    pick(game, "IGNORE");
    const lines = readAll(game);
    expect(lines.join(" ")).toContain(ENCOUNTER_WORDS.impulse);
    expect(lines.join(" ")).toContain("ORDER CONFIRMED. ARRIVES TOMORROW.");
    expect(game.deliveries.pendingItems.map((p) => p.id)).toEqual(["art-robin"]);
    expect(game.deliveries.pendingItems[0].at - game.deliveries.hours).toBeCloseTo(adById("ad-robin")!.delayHours, 5);
  });

  it("Ignore at a mood of 60 or more never turns into a purchase, even after Look closer", () => {
    for (let seed = 0; seed < 5; seed++) {
      const { game, rnd } = toFirstEncounter(setup({ mood: 100 }));
      pick(game, "LOOK CLOSER");
      rnd.next(0);
      pick(game, "IGNORE");
      readAll(game);
      expect(game.deliveries.pendingItems, `seed ${seed}`).toHaveLength(0);
    }
  });

  it("Add to cart: queues the delivery with the ad's delay, a small lift, and the order line", () => {
    const { game } = toFirstEncounter();
    const m = mood(game);
    pick(game, "ADD TO CART");
    expect(readAll(game)).toEqual(["ORDER CONFIRMED. ARRIVES TOMORROW."]);
    expect(game.deliveries.pendingItems.map((p) => p.id)).toEqual(["art-robin"]);
    expect(mood(game)).toBeCloseTo(m + ENCOUNTERS.mood.cart, 5);
    expect(game.interaction.busy).toBe(false);
    // It turns up at the door like a gift.
    game.deliveries.advance(adById("ad-robin")!.delayHours);
    expect(game.deliveries.waiting).toBe(true);
  });

  it("the arrival line is `later today` for a short delay (the candle, 8 hours, is tomorrow; the stool lamp, 8, too)", () => {
    const { game } = setup();
    for (const ad of ADS) {
      const g = setup().game;
      expect(g.startEncounter(ad)).toBe(true);
      entrance(g);
      pick(g, "ADD TO CART");
      const text = readAll(g).join(" ");
      expect(text, ad.id).toContain(ad.delayHours <= ENCOUNTERS.laterTodayHours ? "LATER TODAY" : "TOMORROW");
    }
    expect(game.interaction.busy).toBe(false);
  });

  it("Unsubscribe that works: a lift and the card's own confirmation", () => {
    const { game, rnd } = toFirstEncounter();
    const m = mood(game);
    rnd.next(0);
    pick(game, "HIDE AD");
    expect(readAll(game)).toEqual([CARD_WORDS.social.unsubscribed]);
    expect(mood(game)).toBeCloseTo(m + ENCOUNTERS.mood.unsubscribe, 5);
    expect(game.encounters.soon).toBe(false);
  });

  it("Unsubscribe that fails: the plain failure line, no mood change, and the next encounter comes sooner", () => {
    const { game, rnd } = toFirstEncounter();
    const m = mood(game);
    rnd.next(0.99);
    pick(game, "HIDE AD");
    expect(readAll(game)).toEqual([CARD_WORDS.social.unsubscribeFailed]);
    expect(mood(game)).toBeCloseTo(m, 5);
    expect(game.interaction.busy).toBe(false);
    expect(game.encounters.soon).toBe(true);
    // Half the cooldown (1.5 game hours) is enough for the next one, with the better chance.
    game.deliveries.advance(1.6);
    ready(game);
    rnd.next(0.4, 0.5);
    doTask(game, "doomscroll");
    expect(encounterUp(game)).toBe(true);
    expect(game.encounters.soon).toBe(false);
  });

  it("each card type labels the second choice its own way, and says its own failure line", () => {
    for (const ad of ADS) {
      const { game, rnd } = setup();
      game.startEncounter(ad);
      entrance(game);
      expect(labels(game)[1]).toBe(CARD_WORDS[ad.card].unsubscribe);
      expect(prompt(game)).toContain(ad.narrator ?? CARD_WORDS[ad.card].appeared);
      rnd.next(0.999);
      pick(game, CARD_WORDS[ad.card].unsubscribe);
      expect(readAll(game).join(" ")).toContain(CARD_WORDS[ad.card].unsubscribeFailed);
    }
  });

  it("Look closer: a second page, the menu again without it, then the other choices work as usual", () => {
    const { game } = toFirstEncounter();
    const active = game.interaction.active!.activity as unknown as { details: boolean };
    expect(active.details).toBe(false);
    pick(game, "LOOK CLOSER");
    expect(active.details).toBe(true);
    expect(labels(game)).toEqual(["IGNORE", "HIDE AD", "ADD TO CART"]);
    expect(game.interaction.busy).toBe(true);
    pick(game, "ADD TO CART");
    readAll(game);
    expect(game.deliveries.pendingItems).toHaveLength(1);
  });

  it("the tone line: low mood says it is hard to look away, high mood that you are not interested, in between neither", () => {
    const low = toFirstEncounter(setup({ mood: 5 }));
    expect(prompt(low.game)).toContain(ENCOUNTER_WORDS.toneLow);
    const high = toFirstEncounter(setup({ mood: 100 }));
    expect(prompt(high.game)).toContain(ENCOUNTER_WORDS.toneHigh);
    const mid = toFirstEncounter(setup({ mood: 60 }));
    expect(prompt(mid.game)).not.toContain(ENCOUNTER_WORDS.toneLow);
    expect(prompt(mid.game)).not.toContain(ENCOUNTER_WORDS.toneHigh);
  });
});

describe("an ad for something you already have", () => {
  it("is just a card: one line, no menu, no delivery, no mood change, stays until you close it; it still counts for the cooldown", () => {
    const s = setup();
    s.game.decor.own("art-robin");
    const m = mood(s.game);
    s.rnd.next(0.1, 0.01);
    doTask(s.game, "doomscroll");
    expect(encounterUp(s.game)).toBe(true);
    const afterScroll = mood(s.game);
    expect(afterScroll).toBeLessThan(m);
    expect(s.game.encounters.toJSON().today).toBe(1);
    // It does not go away by itself, however long it is left.
    frames(s.game, 600);
    expect(encounterUp(s.game)).toBe(true);
    expect(s.game.dialogOpen).toBe(true);
    expect(readAll(s.game)).toEqual([ENCOUNTER_WORDS.alreadyOwn]);
    expect(s.game.interaction.busy).toBe(false);
    expect(mood(s.game)).toBeCloseTo(afterScroll, 1);
    expect(s.game.deliveries.pendingItems).toHaveLength(0);
    expect(s.log.cancelled).toBe(0);
  });

  it("Escape closes it at once", () => {
    const s = setup();
    s.game.decor.own("art-robin");
    s.game.startEncounter(adById("ad-robin")!);
    entrance(s.game);
    expect(encounterUp(s.game)).toBe(true);
    s.game.update(dt, esc);
    s.game.update(dt, NO_INPUT);
    expect(s.game.interaction.busy).toBe(false);
  });

  it("an item already ordered or waiting at the door says it is in the cart", () => {
    const s = setup();
    s.game.deliveries.deliver("art-robin", 20);
    s.rnd.next(0.1, 0.01);
    doTask(s.game, "doomscroll");
    expect(readAll(s.game)).toEqual([ENCOUNTER_WORDS.alreadyInCart]);
    expect(s.game.interaction.busy).toBe(false);
    expect(s.game.deliveries.pendingItems).toHaveLength(1);
    // Waiting at the door counts too.
    const t = setup();
    t.game.deliveries.deliver("art-robin", 0);
    expect(t.game.deliveries.waiting).toBe(true);
    t.game.startEncounter(adById("ad-robin")!);
    entrance(t.game);
    expect(readAll(t.game)).toEqual([ENCOUNTER_WORDS.alreadyInCart]);
  });

  it("an order refused while the menu is up (bought meanwhile, or a full cart) is one plain line, not an error", () => {
    const s = setup();
    s.game.startEncounter(adById("ad-robin")!);
    entrance(s.game);
    s.game.decor.own("art-robin");
    const m = mood(s.game);
    pick(s.game, "ADD TO CART");
    expect(readAll(s.game)).toEqual([ENCOUNTER_WORDS.alreadyOwn]);
    expect(mood(s.game)).toBeCloseTo(m, 5);
    expect(s.game.interaction.busy).toBe(false);

    // There are fewer unowned items than the queue holds, so the queue is made smaller for this case.
    const full = setup();
    const others = DECOR_DATA.items.filter((i) => !full.game.decor.owns(i.id) && i.id !== "art-robin");
    const was = DELIVERIES.maxQueued;
    DELIVERIES.maxQueued = others.length;
    try {
      for (const item of others) full.game.deliveries.deliver(item.id, 100);
      expect(full.game.deliveries.pendingItems.length).toBe(others.length);
      full.game.startEncounter(adById("ad-robin")!);
      entrance(full.game);
      const m2 = mood(full.game);
      pick(full.game, "ADD TO CART");
      expect(readAll(full.game)).toEqual([ENCOUNTER_WORDS.cartFull]);
      expect(full.game.deliveries.pendingItems.length).toBe(others.length);
      expect(mood(full.game)).toBeCloseTo(m2, 5);
    } finally {
      DELIVERIES.maxQueued = was;
    }
  });
});

describe("Escape, at every moment", () => {
  // Each case ends with: nothing running, the dialog closed, the lock let go, no points, no mood change, no delivery, no cancel, the clock where it was.
  const moments: [string, (g: Game, rnd: ReturnType<typeof script>) => void][] = [
    ["the card and menu just up", () => {}],
    ["the card after some time", (g) => frames(g, 40)],
    ["the second page (look closer)", (g) => pick(g, "LOOK CLOSER")],
    ["the line after Ignore", (g, rnd) => (rnd.next(0.99), pick(g, "IGNORE"))],
    ["the line after Add to cart (the order is made)", (g) => pick(g, "ADD TO CART")],
    ["the line after a failed unsubscribe", (g, rnd) => (rnd.next(0.99), pick(g, "HIDE AD"))],
    ["the line after an unsubscribe", (g, rnd) => (rnd.next(0), pick(g, "HIDE AD"))],
  ];
  for (const [name, getThere] of moments) {
    it(name, () => {
      const { game, rnd, log } = toFirstEncounter();
      const bought = name.includes("Add to cart");
      getThere(game, rnd);
      frames(game, 3);
      const clock = game.state.get("clock");
      const hours = game.deliveries.hours;
      const points = score(game);
      const m = mood(game);
      const pending = game.deliveries.pendingItems.length;
      game.update(dt, esc);
      expect(game.interaction.busy, "nothing running").toBe(false);
      expect(game.dialogOpen).toBe(false);
      expect(game.inputLocked).toBe(false);
      expect(score(game)).toBe(points);
      expect(mood(game)).toBeCloseTo(m, 5);
      expect(game.deliveries.pendingItems.length).toBe(pending);
      expect(bought ? pending : 0).toBe(pending);
      expect(log.cancelled).toBe(0);
      expect(game.state.get("clock")).toBe(clock);
      expect(game.deliveries.hours).toBe(hours);
      // And the game goes on: the player can walk and start something.
      frames(game, 10);
      doTask(game, "doomscroll");
      expect(game.interaction.busy === false || encounterUp(game)).toBe(true);
    });
  }

  it("the dismissal card", () => {
    const s = setup();
    s.game.decor.own("art-robin");
    s.rnd.next(0.1, 0.01);
    doTask(s.game, "doomscroll");
    expect(encounterUp(s.game)).toBe(true);
    const clock = s.game.state.get("clock");
    s.game.update(dt, esc);
    expect(s.game.interaction.busy).toBe(false);
    expect(s.game.inputLocked).toBe(false);
    expect(s.game.state.get("clock")).toBe(clock);
    expect(s.log.cancelled).toBe(0);
  });

  it("a press of E on the last line does not start another task", () => {
    const { game } = toFirstEncounter();
    pick(game, "IGNORE");
    const before = game.deliveries.hours;
    readAll(game);
    frames(game, 5);
    expect(game.interaction.busy).toBe(false);
    expect(game.deliveries.hours).toBeGreaterThanOrEqual(before);
  });
});

describe("a broken encounter never breaks the game", () => {
  it("an encounter for an unknown item is refused; one while something else is running or open is refused", () => {
    const { game } = setup();
    expect(game.startEncounter({ ...ADS[0], item: "not-a-thing" })).toBe(false);
    expect(game.startEncounter(ADS[0])).toBe(true);
    expect(game.startEncounter(ADS[1])).toBe(false);
  });
});

// ---- saving, the ad blocker, the dev shortcut ----

class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string, extra: Partial<KeyEventLike> = {}) {
    for (const fn of this.fns) fn({ code, ...extra });
  }
}

function withSaves(progress = new FakeStorage(), settings = new FakeStorage(), seed?: number) {
  const rnd = script();
  const game = new Game(main, { rooms: { ...rooms, main }, random: rnd.random });
  const sound = new SoundFeature(game, { audio: () => new FakeAudioContext(), storage: settings, keys: new FakeKeys(), tracks: [], start: "main", random: () => 0.5 });
  const keys = new FakeKeys();
  const feature = new AchievementsFeature(game, { storage: progress, keys, start: "main" });
  void seed;
  void sound;
  return { game, rnd, feature, keys, progress, settings };
}

describe("what is saved", () => {
  it("the cooldown and the ads seen are in the progress save and come back on a reload", () => {
    const a = withSaves();
    a.game.deliveries.advance(60);
    // The last of the seven ads (the day 1 gift, the robin print, is already on its way, so it would be a dismissal).
    a.rnd.next(0.1, 0.99);
    doTask(a.game, "doomscroll");
    expect(encounterUp(a.game)).toBe(true);
    pick(a.game, "IGNORE");
    readAll(a.game);
    a.feature.save();
    const raw = JSON.parse(a.progress.getItem("life.progress.v1")!);
    expect(raw.encounters).toMatchObject({ day: 2, today: 1, soon: false, seen: ["ad-water-lilies"] });
    expect(raw.encounters.last).toBeGreaterThanOrEqual(60);

    const b = withSaves(a.progress, a.settings);
    expect(b.game.encounters.toJSON()).toEqual(a.game.encounters.toJSON());
    // So the cooldown survives the reload.
    b.rnd.next(0);
    doTask(b.game, "doomscroll");
    expect(encounterUp(b.game)).toBe(false);
  });

  it("an old save with no encounters field is a fresh start", () => {
    const progress = new FakeStorage();
    progress.setItem("life.progress.v1", JSON.stringify({ version: 1, unlocked: [], stats: {}, world: null }));
    const a = withSaves(progress);
    expect(a.game.encounters.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
  });

  it("a damaged encounters field is ignored, never thrown", () => {
    for (const encounters of [5, "x", [], { last: "soon", seen: 7 }, { seen: ["nope", "ad-candle", "ad-candle"], today: -3, last: 1e12 }]) {
      const progress = new FakeStorage();
      progress.setItem("life.progress.v1", JSON.stringify({ version: 1, unlocked: [], stats: {}, world: null, encounters }));
      expect(() => withSaves(progress)).not.toThrow();
    }
  });

  it("resetting progress starts the cooldown and the seen list over, and leaves the ad blocker as it is", () => {
    const a = withSaves();
    a.game.deliveries.advance(60);
    a.keys.press(UI.listKey);
    a.keys.press(UI.adBlockerKey);
    expect(a.game.adBlockerOn).toBe(true);
    a.game.encounters.begin(ADS[0], 61);
    a.keys.press("KeyR", { shiftKey: true });
    a.keys.press("KeyY");
    expect(a.game.encounters.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
    expect(a.game.adBlockerOn).toBe(true);
    expect(JSON.parse(a.settings.getItem("life.sound.v1")!).adBlocker).toBe(true);
  });
});

describe("the ad blocker in the list screen", () => {
  it("B switches it, it is saved with the settings, and it is still there after a reload", () => {
    const a = withSaves();
    expect(a.game.adBlockerOn).toBe(false);
    // B does nothing while the list is closed.
    a.keys.press(UI.adBlockerKey);
    expect(a.game.adBlockerOn).toBe(false);
    a.keys.press(UI.listKey);
    a.keys.press(UI.adBlockerKey);
    expect(a.game.adBlockerOn).toBe(true);
    expect(JSON.parse(a.settings.getItem("life.sound.v1")!).adBlocker).toBe(true);
    a.keys.press(UI.adBlockerKey);
    expect(a.game.adBlockerOn).toBe(false);
    a.keys.press(UI.adBlockerKey);
    const b = withSaves(a.progress, a.settings);
    expect(b.game.adBlockerOn).toBe(true);
    b.game.deliveries.advance(60);
    b.rnd.next(0, 0);
    doTask(b.game, "doomscroll");
    expect(encounterUp(b.game)).toBe(false);
  });

  it("with it on, no encounter and no change to the encounter save, however many tasks are done", () => {
    const a = withSaves();
    a.game.setAdBlocker(true);
    a.game.deliveries.advance(60);
    for (let i = 0; i < 4; i++) {
      a.rnd.next(0);
      doTask(a.game, "doomscroll");
      a.game.deliveries.advance(4);
    }
    expect(a.game.encounters.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
  });
});

describe("the dev shortcut", () => {
  it("?encounter=<ad id> shows that ad's encounter; a made-up word shows one; no parameter does nothing", () => {
    const { game } = setup();
    expect(encounterFromSearch(game, "?encounter=ad-candle")?.id).toBe("ad-candle");
    expect(game.interaction.active?.item.encounter).toBe(true);
    expect(encounterFromSearch(setup().game, "")).toBeNull();
    expect(encounterFromSearch(setup().game, "?days=3")).toBeNull();
    expect(encounterFromSearch(setup().game, "?encounter=random")).not.toBeNull();
    // It does not count for the gates.
    expect(game.encounters.toJSON()).toEqual({ day: 0, today: 0, soon: false, seen: [] });
  });
});

// Issue 080: the card comes in with a buzz, flashes and a bar wipe, and goes out with a quicker wipe.
describe("the entrance and the exit", () => {
  const ENTRANCE = 48;
  const EXIT = 12;
  const candle = () => adById("ad-candle")!;

  function fresh(reduced = false) {
    const rnd = script();
    const game = new Game(main, { rooms: { ...rooms, main }, random: rnd.random, reducedMotion: () => reduced });
    game.deliveries.advance(60);
    const cues: string[] = [];
    game.events.on("cue", ({ name }) => cues.push(name));
    expect(game.startEncounter(candle())).toBe(true);
    return { game, cues, rnd };
  }

  it("plays the sound cue once, and shows no dialog until the entrance is over (48 frames)", () => {
    const { game, cues } = fresh();
    expect(cues).toEqual(["encounter-entrance"]);
    expect(game.inputLocked).toBe(false);
    for (let i = 1; i < ENTRANCE; i++) {
      game.update(dt, NO_INPUT);
      expect(game.dialogOpen, `frame ${i}`).toBe(false);
    }
    game.update(dt, NO_INPUT);
    expect(game.dialogOpen).toBe(true);
    expect(cues).toEqual(["encounter-entrance"]);
  });

  it("holds the clock and pays nothing during the entrance", () => {
    const { game } = fresh();
    const clock = game.state.get("clock");
    const hours = game.deliveries.hours;
    const m = mood(game);
    frames(game, ENTRANCE + 20);
    expect(game.state.get("clock")).toBe(clock);
    expect(game.deliveries.hours).toBe(hours);
    expect(mood(game)).toBe(m);
    expect(score(game)).toBe(0);
  });

  it("E skips it only after the first few frames", () => {
    const early = fresh();
    frames(early.game, 2, press);
    expect(early.game.dialogOpen).toBe(false);
    const later = fresh();
    frames(later.game, ENCOUNTERS.entrance.skipAfter - 1);
    expect(later.game.dialogOpen).toBe(false);
    later.game.update(dt, press);
    expect(later.game.dialogOpen).toBe(true);
    expect(labels(later.game)).toContain("ADD TO CART");
  });

  it("Escape leaves cleanly at every frame of the entrance", () => {
    for (let f = 0; f <= ENTRANCE; f++) {
      const { game, log } = (() => {
        const s = fresh();
        const log = { cancelled: 0 };
        s.game.events.on("taskCancelled", () => log.cancelled++);
        return { game: s.game, log };
      })();
      frames(game, f);
      game.update(dt, esc);
      expect(game.interaction.busy, `frame ${f}`).toBe(false);
      expect(game.dialogOpen).toBe(false);
      expect(game.inputLocked).toBe(false);
      expect(log.cancelled).toBe(0);
      expect(game.deliveries.pendingItems.length).toBe(0);
    }
  });

  it("after the last line, the exit wipe plays (12 frames) and then it is over; Escape in it ends it at once", () => {
    const s = fresh();
    frames(s.game, ENTRANCE);
    rndIgnore(s);
    pick(s.game, "IGNORE");
    // The line after Ignore; close it.
    for (let i = 0; i < 400 && s.game.dialogOpen; i++) s.game.update(dt, press);
    expect(encounterUp(s.game)).toBe(true);
    frames(s.game, EXIT - 1);
    expect(encounterUp(s.game)).toBe(true);
    s.game.update(dt, NO_INPUT);
    expect(encounterUp(s.game)).toBe(false);
    expect(s.game.inputLocked).toBe(false);

    const t = fresh();
    frames(t.game, ENTRANCE);
    rndIgnore(t);
    pick(t.game, "IGNORE");
    for (let i = 0; i < 400 && t.game.dialogOpen; i++) t.game.update(dt, press);
    frames(t.game, 4);
    expect(encounterUp(t.game)).toBe(true);
    t.game.update(dt, esc);
    expect(encounterUp(t.game)).toBe(false);
    expect(t.game.inputLocked).toBe(false);
  });

  it("with reduced motion it is a short fade: a dialog after 12 frames and an exit of 8", () => {
    const { game } = fresh(true);
    frames(game, 11);
    expect(game.dialogOpen).toBe(false);
    game.update(dt, NO_INPUT);
    expect(game.dialogOpen).toBe(true);
    // Escape still works.
    game.update(dt, esc);
    expect(encounterUp(game)).toBe(false);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("draws without a canvas error in every phase, with and without reduced motion", () => {
    const fakeCtx = () => new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: fakeCtx }) });
    for (const reduced of [false, true]) {
      const { game } = fresh(reduced);
      const ctx = fakeCtx();
      for (let i = 0; i < 80; i++) {
        game.update(dt, NO_INPUT);
        expect(() => game.render(ctx, 1)).not.toThrow();
      }
    }
  });
});

function rndIgnore(s: { rnd: ReturnType<typeof script> }) {
  // No impulse buy on Ignore.
  s.rnd.next(0.99);
}
