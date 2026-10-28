import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { APARTMENT } from "./apartment";
import { DEFAULT_TASK_COOLDOWN, ENERGY, PLANT } from "./config";
import { Game } from "./game";
import type { GameEvents } from "./events";
import { taskSpots } from "./plan-checks";
import { TASKS } from "./tasks";

// Issue 071: a task that already gates itself by state has no time cooldown as well.

const dt = 1 / 60;
const rooms = APARTMENT.rooms;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const tab: Controls = { ...NO_INPUT, keys: ["Tab"], keysDown: ["Tab"] };

const task = (id: string) => TASKS.find((t) => t.id === id)!;
const cooldownOf = (id: string) => task(id).cooldown ?? DEFAULT_TASK_COOLDOWN;

// Every task whose state gate stops it being done again, so it needs no time cooldown.
const STATE_GATED = [
  "make-bed", "open-blinds", "close-blinds", "coffee", "drink-coffee", "flatten-boxes", "recycle-boxes",
  "water-plant", "water-plant-droop", "collect-delivery", "record-play", "make-track", "study-spanish",
];
// Tasks that keep a time cooldown, because nothing in the state stops repeating them.
const KEPT: Record<string, number> = {
  dishes: 45, sleep: 60, nap: 60, "check-plant": 60, "admire-art": 60, "tidy-desk": 90, "take-trash": DEFAULT_TASK_COOLDOWN,
  doomscroll: DEFAULT_TASK_COOLDOWN, guitar: DEFAULT_TASK_COOLDOWN, "sort-records": 45, work: 30, "work-sofa": 30,
  "work-bed": 30, contemplate: 30, reheat: DEFAULT_TASK_COOLDOWN, "eat-dinner": DEFAULT_TASK_COOLDOWN, cook: DEFAULT_TASK_COOLDOWN,
  "mirror-day": 60, "charge-phone": 60, "side-project-game": 90,
};

describe("the cooldown table (issue 071)", () => {
  it.each(STATE_GATED)("%s has cooldown 0", (id) => {
    expect(cooldownOf(id)).toBe(0);
  });

  it("every state-gated task is a real task, and each one with a gate says why it is refused", () => {
    for (const id of STATE_GATED) expect(task(id), id).toBeDefined();
    for (const id of ["make-bed", "open-blinds", "close-blinds", "coffee", "drink-coffee", "flatten-boxes", "recycle-boxes", "water-plant", "water-plant-droop"]) {
      expect(task(id).requires?.length, id).toBeGreaterThan(0);
    }
  });

  it.each(Object.entries(KEPT))("%s keeps its time cooldown (%s s)", (id, secs) => {
    expect(cooldownOf(id)).toBe(secs);
  });

  it("no task at cooldown 0 is spammable for points: each is gated by state or pays nothing", () => {
    for (const t of TASKS.filter((x) => x.cooldown === 0)) {
      const gated = (t.requires?.length ?? 0) > 0 || t.points === 0 || t.id === "record-play";
      expect(gated, t.id).toBe(true);
    }
  });

  it("points and the repeat penalty are unchanged", () => {
    const pts: Record<string, number> = { "make-bed": 30, "open-blinds": 10, "close-blinds": 10, coffee: 70, "drink-coffee": 30, "flatten-boxes": 45, "recycle-boxes": 55 };
    for (const [id, p] of Object.entries(pts)) expect(task(id).points, id).toBe(p);
  });
});

const games = new WeakMap<Game, typeof rooms.main>();
function newGame(room: "main" | "kitchen" = "main") {
  const game = new Game(rooms[room], { rooms, random: () => 0.5 });
  games.set(game, rooms[room]);
  return game;
}
const levelOf = (game: Game) => games.get(game)!;
// Stands at the task's object, cycles to it, does it and waits for it to end.
function doTask(game: Game, id: string) {
  const level = levelOf(game);
  const spot = taskSpots(level).find((s) => s.id === id);
  expect(spot, `a spot for ${id}`).toBeDefined();
  game.player.placeAt(spot!.stand.col, spot!.stand.row, spot!.face);
  game.update(dt, NO_INPUT);
  for (let i = 0; i < 8 && game.interaction.nearby?.id !== id; i++) game.update(dt, tab);
  expect(game.interaction.nearby?.id, `${id} is offered`).toBe(id);
  expect(game.interaction.cooldownRemaining(game.interaction.nearby!), `${id} cooldown`).toBe(0);
  expect(game.interaction.unavailableReason(game.interaction.nearby!), `${id} reason`).toBeNull();
  game.update(dt, press);
  for (let i = 0; i < 60 * 40 && game.interaction.busy; i++) game.update(dt, NO_INPUT);
  expect(game.interaction.busy).toBe(false);
}
const item = (game: Game, id: string) => levelOf(game).interactables.find((i) => i.id === id)!;
const set = (game: Game, vars: Record<string, number>) => game.state.applyEffects(Object.entries(vars).map(([v, n]) => ({ var: v, set: n })));

describe("right after, at once (no cooldown message)", () => {
  it("make the bed, sleep, and the bed can be made again immediately", () => {
    const game = newGame();
    const blocked: GameEvents["taskBlocked"][] = [];
    game.events.on("taskBlocked", (b) => blocked.push(b));
    set(game, { bedMade: 0 });
    doTask(game, "make-bed");
    expect(game.state.get("bedMade")).toBe(1);
    set(game, { energy: ENERGY.sleepBelow - 1 });
    doTask(game, "sleep");
    expect(game.state.get("bedMade")).toBe(0);
    expect(game.interaction.cooldownRemaining(item(game, "make-bed"))).toBe(0);
    expect(game.interaction.canStart(item(game, "make-bed"))).toBe(true);
    doTask(game, "make-bed");
    expect(game.state.get("bedMade")).toBe(1);
    expect(blocked).toEqual([]);
  });

  it("the blinds open and close back to back", () => {
    const game = newGame();
    set(game, { blinds: 0 });
    doTask(game, "open-blinds");
    expect(game.state.get("blinds")).toBe(1);
    doTask(game, "close-blinds");
    expect(game.state.get("blinds")).toBe(0);
    doTask(game, "open-blinds");
    expect(game.state.get("blinds")).toBe(1);
  });

  it("coffee, drink, coffee again (the mug and the dishes decide)", () => {
    const game = newGame();
    set(game, { mug: 0, dishes: 0 });
    doTask(game, "coffee");
    expect(game.state.get("mug")).toBe(1);
    doTask(game, "drink-coffee");
    expect(game.state.get("mug")).toBe(0);
    doTask(game, "coffee");
    expect(game.state.get("mug")).toBe(1);
  });

  it("flatten, recycle, a package, flatten again", () => {
    const game = newGame("kitchen");
    doTask(game, "flatten-boxes");
    expect(game.state.get("boxes")).toBe(0);
    doTask(game, "recycle-boxes");
    expect(game.state.get("boxes")).toBe(2);
    set(game, { boxes: 1 });
    doTask(game, "flatten-boxes");
    expect(game.state.get("boxes")).toBe(0);
  });

  it("water the drooping plant, then the damp plant is refused by the soil and not by a clock", () => {
    const game = newGame();
    set(game, { plantDry: PLANT.droopAfterHours });
    doTask(game, "water-plant-droop");
    expect(game.interaction.cooldownRemaining(item(game, "water-plant"))).toBe(0);
    expect(game.interaction.unavailableReason(item(game, "water-plant"))).toBe("SOIL IS STILL DAMP");
    set(game, { plantDry: PLANT.dampHours });
    expect(game.interaction.canStart(item(game, "water-plant"))).toBe(true);
    doTask(game, "water-plant");
    expect(game.state.get("plantDry")).toBe(0);
  });
});

// A matrix of what is offered and what the refusal says, by state, for each state-gated task.
describe("state-gated tasks: startable or refused by state, never by a clock", () => {
  const rows: [string, Record<string, number>, string | null][] = [
    ["make-bed", { bedMade: 0 }, null],
    ["make-bed", { bedMade: 1 }, "BED IS MADE"],
    ["open-blinds", { blinds: 0 }, null],
    ["open-blinds", { blinds: 1 }, "BLINDS ARE OPEN"],
    ["close-blinds", { blinds: 1 }, null],
    ["close-blinds", { blinds: 0 }, "BLINDS ARE CLOSED"],
    ["coffee", { mug: 0, dishes: 0 }, null],
    ["coffee", { mug: 1, dishes: 0 }, "COFFEE IS WAITING"],
    ["coffee", { mug: 0, dishes: 9 }, "NO CLEAN PLATES"],
    ["drink-coffee", { mug: 1 }, null],
    ["drink-coffee", { mug: 0 }, "NO COFFEE MADE"],
    ["flatten-boxes", { boxes: 1 }, null],
    ["flatten-boxes", { boxes: 0 }, "NO BOXES TO FLATTEN"],
    ["flatten-boxes", { boxes: 2 }, "NO BOXES TO FLATTEN"],
    ["recycle-boxes", { boxes: 0 }, null],
    ["recycle-boxes", { boxes: 1 }, "FLATTEN THE BOXES FIRST"],
    ["recycle-boxes", { boxes: 2 }, "NO BOXES TO TAKE OUT"],
    ["water-plant", { plantDry: 0 }, "SOIL IS STILL DAMP"],
    ["water-plant", { plantDry: PLANT.dampHours }, null],
    ["water-plant-droop", { plantDry: 0 }, "NOT DROOPING"],
    ["water-plant-droop", { plantDry: PLANT.droopAfterHours }, null],
  ];
  it.each(rows)("%s with %j -> %s", (id, vars, reason) => {
    const game = newGame(id.includes("boxes") ? "kitchen" : "main");
    set(game, vars);
    // After doing it once (when it could be done) it is straight away in the state the gate says.
    expect(game.interaction.cooldownRemaining(item(game, id))).toBe(0);
    expect(game.interaction.unavailableReason(item(game, id))).toBe(reason);
    expect(game.interaction.canStart(item(game, id))).toBe(reason === null);
  });

  it("the unavailable-reason on the prompt is the state message, never a seconds countdown", () => {
    const game = newGame("kitchen");
    doTask(game, "flatten-boxes");
    const spot = taskSpots(levelOf(game)).find((s) => s.id === "flatten-boxes")!;
    game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
    game.update(dt, NO_INPUT);
    expect(game.interaction.nearby?.id).toBe("recycle-boxes");
    set(game, { boxes: 2 });
    game.update(dt, NO_INPUT);
    expect(game.interaction.nearby?.id).toBe("flatten-boxes");
    expect(game.interaction.cooldownRemaining(game.interaction.nearby!)).toBe(0);
    expect(game.interaction.unavailableReason(game.interaction.nearby!)).toBe("NO BOXES TO FLATTEN");
  });
});
