import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { APARTMENT } from "./apartment";
import { pickVariant } from "./appearance";
import { DELIVERIES } from "./config";
import { Decor } from "./decor";
import { Deliveries, MEAL_ID, parseDeliveries } from "./deliveries";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
import { TASKS } from "./tasks";

// Issue 153: takeout. A meal in the delivery pipe, ordered at the nightstand, eaten at the table.

const dt = 1 / 60;
const rooms = APARTMENT.rooms;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const tab: Controls = { ...NO_INPUT, keys: ["Tab"], keysDown: ["Tab"] };
const task = (id: string) => TASKS.find((t) => t.id === id)!;

const newGame = () => new Game(rooms.main, { rooms, random: () => 0.5 });
const make = () => new Deliveries(new Decor());

function play(game: Game, hours: number) {
  for (let t = 0; t < (hours * 60) / 2; t += 0.5) game.update(0.5, NO_INPUT);
}
function doTask(game: Game, id: string): boolean {
  const spot = taskSpots(rooms.main).find((s) => s.id === id)!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
  // An object with several tasks is cycled with Tab (issue 039).
  for (let i = 0; i < 8 && game.interaction.nearby?.id !== id; i++) game.update(dt, tab);
  let started = false;
  game.events.on("taskStart", ({ item }) => { if (item.id === id) started = true; });
  game.update(dt, press);
  for (let i = 0; i < 60 * 30 && game.interaction.busy; i++) game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
  return started;
}
const item = (id: string) => [...rooms.main.interactables, ...rooms.kitchen.interactables].find((i) => i.id === id)!;
const opening = (game: Game) => (game as unknown as { collectDeliveries(): void }).collectDeliveries();
// Every popup line the game shows from now on.
function listen(game: Game): string[] {
  const said: string[] = [];
  const popups = (game as unknown as { popups: { add: (x: number, y: number, lines: Array<{ text: string }>) => void } }).popups;
  const add = popups.add.bind(popups);
  popups.add = (x, y, lines) => {
    said.push(...lines.map((l) => l.text));
    add(x, y, lines);
  };
  return said;
}
const tableAppearance = () => rooms.main.appearances!.find((a) => a.variants.some((v) => v.sprite === "table-plate"))!;

describe("the meal in the queue", () => {
  it("is ordered once, arrives after its delay, and is open to collect", () => {
    const d = make();
    const arrived: Array<[string[], boolean]> = [];
    d.onArrive = (ids, meal) => arrived.push([ids, meal]);
    expect(d.deliverMeal(2)).toBe(true);
    expect(d.mealOrdered).toBe(true);
    expect(d.waiting).toBe(false);
    expect(d.deliverMeal(2)).toBe(false); // one at a time
    d.advance(1.9);
    expect(d.waiting).toBe(false);
    d.advance(0.2);
    expect(d.waiting).toBe(true);
    expect(d.mealWaiting).toBe(true);
    expect(arrived).toEqual([[[], true]]);
    expect(d.deliverMeal(0)).toBe(false); // still one while it waits in the box
    expect(d.collect()).toEqual([]); // plain collect leaves the meal
    expect(d.mealWaiting).toBe(true);
    expect(d.open(true)).toEqual({ items: [], meal: true });
    expect(d.waiting).toBe(false);
    expect(d.mealOrdered).toBe(false);
    expect(d.deliverMeal(0)).toBe(true); // repeatable
  });

  it("is not a decor item: it never shows in the item lists", () => {
    const d = make();
    d.deliverMeal(5);
    expect(d.pendingItems).toEqual([]);
    expect(d.waitingItems).toEqual([]);
  });

  it("counts toward the cap, in both directions", () => {
    const ids = [...Array(DELIVERIES.maxQueued).keys()].map((i) => `art-fill-${i}`);
    const parsed = parseDeliveries({
      meal: true,
      waiting: ids,
      pending: [{ id: MEAL_ID, kind: "meal", at: 3 }],
    });
    expect(parsed.waiting.length).toBe(DELIVERIES.maxQueued - 1);
    expect(parsed.pending).toEqual([]); // a second meal is cut: one at a time
  });

  it("arrives held back while the player stands on the box tile, like a package", () => {
    const d = make();
    let blocked = true;
    d.canArrive = () => !blocked;
    d.deliverMeal(0);
    expect(d.waiting).toBe(false);
    blocked = false;
    d.advance(0.01);
    expect(d.mealWaiting).toBe(true);
  });

  it("goes through a save and back, and an old save loads unchanged", () => {
    const d = make();
    d.deliverMeal(4);
    const saved = JSON.parse(JSON.stringify(d.toJSON()));
    const d2 = make();
    d2.load(saved);
    expect(d2.mealOrdered).toBe(true);
    d2.advance(5);
    expect(d2.mealWaiting).toBe(true);
    const saved2 = JSON.parse(JSON.stringify(d2.toJSON()));
    expect(saved2.meal).toBe(true);
    const d3 = make();
    d3.load(saved2);
    expect(d3.mealWaiting).toBe(true);
    // No meal: the save has no `meal` field, exactly as before.
    expect("meal" in make().toJSON()).toBe(false);
    const old = make();
    old.load({ hours: 3, pending: [], waiting: [], fired: ["x"] });
    expect(old.mealOrdered).toBe(false);
    expect(old.toJSON()).toEqual({ hours: 3, pending: [], waiting: [], fired: ["x"] });
  });

  it("cuts hostile saves down", () => {
    for (const bad of [
      { meal: "yes", pending: [{ kind: "meal", at: "soon" }] },
      { meal: 1, pending: [{ kind: "meal" }, { kind: "meal", at: Number.NaN }, { kind: "meal", at: Infinity }] },
      { pending: [{ kind: "meal", at: 1 }, { kind: "meal", at: 2 }, { kind: "meal", at: 3 }], meal: true },
      { pending: [{ id: "meal", at: 1 }, { id: "other", kind: "banana", at: 1 }] },
      { pending: "meal", waiting: { meal: true } },
    ]) {
      const parsed = parseDeliveries(bad);
      expect(parsed.pending.filter((p) => p.kind === "meal").length + (parsed.meal ? 1 : 0)).toBeLessThanOrEqual(1);
      const d = make();
      expect(() => d.load(bad)).not.toThrow();
      expect(d.pendingItems.every((p) => p.kind !== "meal")).toBe(true);
    }
    // A pending decor-style entry named "meal" with no kind is not a meal and is dropped on load.
    const d = make();
    d.load({ pending: [{ id: "meal", at: 1 }] });
    expect(d.mealOrdered).toBe(false);
    expect(d.pendingItems).toEqual([]);
    // A time far in the future is cut to the cap.
    expect(parseDeliveries({ pending: [{ kind: "meal", at: 1e300 }] }).pending[0].at).toBeLessThanOrEqual(DELIVERIES.maxHours + DELIVERIES.maxDelayHours);
  });
});

describe("Order takeout", () => {
  it("is a nightstand task of about 8 points, with the state to say when", () => {
    const t = task("order-takeout");
    expect(t.points).toBe(8);
    expect(t.cooldown).toBe(0);
    expect(rooms.main.interactables.find((i) => i.id === "order-takeout")).toBeDefined();
    expect(taskSpots(rooms.main).some((s) => s.id === "order-takeout")).toBe(true);
  });

  it("queues the meal, and is refused with a plain reason while it is on the way", () => {
    const game = newGame();
    expect(doTask(game, "order-takeout")).toBe(true);
    expect(game.deliveries.mealOrdered).toBe(true);
    expect(game.state.get("takeoutOrdered")).toBe(1);
    expect(game.interaction.unavailableReason(item("order-takeout"))).toBe("THE TAKEOUT IS ON ITS WAY");
    expect(game.deliveries.pendingItems).toEqual([]);
  });

  it("arrives at the same box tile with one line, blocks it and shows the box", () => {
    const game = newGame();
    const said = listen(game);
    doTask(game, "order-takeout");
    expect(game.state.get("parcel")).toBe(0);
    game.player.placeAt(1, 1, "down");
    play(game, DELIVERIES.mealDelayHours + 0.2);
    expect(game.deliveries.mealWaiting).toBe(true);
    expect(game.state.get("parcel")).toBe(1);
    expect(said.filter((t) => t.includes("ARRIVED"))).toEqual(["THE TAKEOUT HAS ARRIVED."]);
    const box = rooms.main.interactables.find((i) => i.id === "collect-delivery")!;
    expect(box).toBeDefined();
    const app = rooms.main.appearances?.find((a) => a.variants.some((v) => v.sprite === "delivery-box"));
    expect(app).toBeDefined();
    // Issue 154: a meal alone is drawn as the bag, not the package box.
    expect(pickVariant(app!.variants, game.state)?.sprite).toBe("takeout-bag");
  });

  it("draws the bag for a meal alone, the box for a package, and the box when both wait (issue 154)", () => {
    const sprite = (game: Game) => {
      game.update(dt, NO_INPUT);
      const app = rooms.main.appearances!.find((a) => a.variants.some((v) => v.sprite === "delivery-box"))!;
      return pickVariant(app.variants, game.state)?.sprite ?? null;
    };
    const none = newGame();
    expect(sprite(none)).toBeNull();
    const meal = newGame();
    meal.player.placeAt(1, 1, "down");
    meal.deliveries.deliverMeal(0);
    meal.update(dt, NO_INPUT);
    meal.update(dt, NO_INPUT);
    expect(meal.deliveries.mealWaiting).toBe(true);
    expect(sprite(meal)).toBe("takeout-bag");
    expect(meal.state.get("parcel")).toBe(1); // still solid, same tile
    const pkg = newGame();
    pkg.player.placeAt(1, 1, "down");
    pkg.deliveries.deliver("art-test-barn", 0);
    pkg.update(dt, NO_INPUT);
    pkg.update(dt, NO_INPUT);
    expect(pkg.deliveries.waiting).toBe(true);
    expect(sprite(pkg)).toBe("delivery-box");
    pkg.deliveries.deliverMeal(0);
    pkg.update(dt, NO_INPUT);
    pkg.update(dt, NO_INPUT);
    expect(pkg.deliveries.mealWaiting).toBe(true);
    expect(sprite(pkg)).toBe("delivery-box");
    // Open it all: the tile is empty again.
    opening(pkg);
    for (let i = 0; i < 600; i++) pkg.update(dt, i % 20 === 0 ? press : NO_INPUT);
    expect(pkg.deliveries.waiting).toBe(false);
    expect(sprite(pkg)).toBeNull();
  });

  it("is not fooled by a bad saved variable: the queue is the truth", () => {
    const game = newGame();
    game.state.applyEffects([{ var: "takeoutOrdered", set: 1 }]); // set with no queue: queued by the change
    expect(game.deliveries.mealOrdered).toBe(true);
  });

  it("leaves a fresh game as it was: only the new task and variables are added", () => {
    const state = new ApartmentState(STATE_VARS);
    expect(state.get("takeout")).toBe(0);
    expect(state.get("takeoutOrdered")).toBe(0);
    const game = newGame();
    expect(game.deliveries.waiting).toBe(false);
    expect(JSON.parse(JSON.stringify(game.deliveries.toJSON()))).not.toHaveProperty("meal");
  });
});

describe("opening the box with the meal", () => {
  function arrived() {
    const game = newGame();
    game.deliveries.deliverMeal(0);
    game.update(dt, NO_INPUT);
    return game;
  }

  it("puts the meal and the plate on the table, and clears the box", () => {
    const game = arrived();
    expect(game.state.get("parcel")).toBe(1);
    opening(game);
    expect(game.state.get("takeout")).toBe(1);
    expect(game.state.get("plate")).toBe(1);
    expect(game.state.get("parcel")).toBe(0);
    expect(game.state.get("takeoutOrdered")).toBe(0);
    expect(game.state.get("boxes")).toBe(1); // nothing new for the pile yet
    expect(pickVariant(tableAppearance().variants, game.state)?.sprite).toBe("table-plate");
  });

  it("through the real task at the door", () => {
    const game = arrived();
    game.state.applyEffects([{ var: "boxes", set: 0 }]);
    doTask(game, "collect-delivery");
    expect(game.state.get("takeout")).toBe(1);
    expect(game.state.get("boxes")).toBe(0);
  });

  it("with a plate already on the table, the meal stays in the box and the gifts still open", () => {
    const game = arrived();
    game.deliveries.deliver("art-test-barn", 0);
    game.update(dt, NO_INPUT);
    game.state.applyEffects([{ var: "plate", set: 1 }]);
    opening(game);
    expect(game.decor.owns("art-test-barn")).toBe(true);
    expect(game.deliveries.mealWaiting).toBe(true);
    expect(game.state.get("takeout")).toBe(0);
    expect(game.state.get("parcel")).toBe(1);
    // Eat the plate, then open again.
    game.state.applyEffects([{ var: "plate", set: 0 }]);
    opening(game);
    expect(game.state.get("takeout")).toBe(1);
    expect(game.state.get("parcel")).toBe(0);
  });
});

describe("Eat the takeout", () => {
  const withMeal = () => {
    const game = newGame();
    game.state.applyEffects([{ var: "takeout", set: 1 }, { var: "plate", set: 1 }, { var: "energy", set: 50 }, { var: "mood", set: 50 }]);
    return game;
  };

  it("is refused with a plain reason when there is no takeout", () => {
    const game = newGame();
    expect(game.interaction.unavailableReason(item("eat-takeout"))).toBe("NO TAKEOUT");
  });

  it("pays 40, gives +15 energy and +5 mood, no dishes, and a box to recycle", () => {
    const game = withMeal();
    game.state.applyEffects([{ var: "dishes", set: 0 }, { var: "boxes", set: 2 }]);
    const before = game.interaction.scoreboard.score;
    expect(doTask(game, "eat-takeout")).toBe(true);
    expect(game.interaction.scoreboard.score - before).toBeGreaterThanOrEqual(40);
    expect(game.state.get("energy")).toBeGreaterThan(60);
    expect(game.state.get("dishes")).toBe(0);
    expect(game.state.get("takeout")).toBe(0);
    expect(game.state.get("plate")).toBe(0);
    expect(game.state.get("boxes")).toBe(1);
    // Mood also drifts, so allow it to have settled near the +5.
    expect(game.state.get("mood")).toBeGreaterThan(50);
  });

  it("has no cold timer: it is fine hours later", () => {
    const game = withMeal();
    play(game, 6);
    expect(game.state.get("takeout")).toBe(1);
    expect(game.interaction.canStart(item("eat-takeout"))).toBe(true);
  });

  it("task numbers", () => {
    const t = task("eat-takeout");
    expect(t.points).toBe(40);
    expect(t.duration).toBe(5);
    expect(t.cooldown).toBe(0);
  });
});

describe("cook, reheat and eat dinner with takeout on the table", () => {
  it.each(["cook", "reheat", "eat-dinner"])("%s is refused with TAKEOUT IS WAITING", (id) => {
    const game = newGame();
    expect(game.interaction.canStart(item(id))).toBe(true);
    game.state.applyEffects([{ var: "takeout", set: 1 }, { var: "plate", set: 1 }]);
    expect(game.interaction.unavailableReason(item(id))).toBe("TAKEOUT IS WAITING");
  });

  it("takeout cannot be ordered again while one is on the table", () => {
    const game = newGame();
    game.state.applyEffects([{ var: "takeout", set: 1 }]);
    expect(game.interaction.unavailableReason(item("order-takeout"))).toBe("TAKEOUT IS WAITING");
  });

  it("a plate already on the table does not block ordering", () => {
    const game = newGame();
    game.state.applyEffects([{ var: "plate", set: 1 }]);
    expect(game.interaction.canStart(item("order-takeout"))).toBe(true);
  });
});

describe("saved through the game", () => {
  it("an ordered meal on its way survives the progress save and a reload", () => {
    const game = newGame();
    game.deliveries.deliverMeal(3);
    const saved = JSON.parse(JSON.stringify(game.deliveries.toJSON()));
    const g2 = newGame();
    g2.deliveries.load(saved);
    g2.update(dt, NO_INPUT);
    expect(g2.state.get("takeoutOrdered")).toBe(1);
    play(g2, 3.5);
    expect(g2.state.get("parcel")).toBe(1);
      });
});
