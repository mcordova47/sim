import { describe, expect, it } from "vitest";
import { NO_INPUT } from "../input/controls";
import { unsupportedChars } from "../render/font";
import { ACHIEVEMENTS } from "./achievements/data";
import { APARTMENT } from "./apartment";
import { Decor, fits, validateDecorData } from "./decor";
import { DECOR_DATA, DECOR_SLOTS, GIFT_ITEMS, NOTE_MAX, TASK_NAME_MAX } from "./decor-data";
import { CHECKPOINTS } from "./delivery-checkpoints";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { TASKS } from "./tasks";

// Issue 168: two coffee stations (the dining table and a stove burner), the first batch of apparatus,
// and a make-coffee task whose name and prompt follow the apparatus. Pay, time and effects stay equal.

const dt = 1 / 60;
const rooms = APARTMENT.rooms;
const press = { ...NO_INPUT, interactPressed: true };
const slot = (id: string) => DECOR_SLOTS.find((s) => s.id === id)!;
const coffeeItems = DECOR_DATA.items.filter((i) => i.kind === "coffee");
const holding = (table?: string, stove?: string) => {
  const d = new Decor();
  for (const id of [table, stove]) if (id) d.own(id);
  if (table) d.place("coffee-table", table);
  if (stove) d.place("coffee-stove", stove);
  return d;
};
const task = (id: string) => TASKS.find((t) => t.id === id)!;

function stand(game: Game, id: string, level = rooms.kitchen) {
  const spot = taskSpots(level).find((s) => s.id === id);
  if (!spot) throw new Error(`no spot for ${id}`);
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
}
const kitchenGame = (decor: Decor) => new Game(rooms.kitchen, { rooms, decor, random: () => 0.5 });

describe("the coffee slots", () => {
  it("are where the table and the stove are, 16x16, and the table's default is today's cone", () => {
    expect(slot("coffee-table")).toMatchObject({ room: "main", area: { x: 62, y: 18, w: 16, h: 16 }, kinds: ["coffee"], default: "coffee-pourover", object: "dining table" });
    expect(slot("coffee-stove")).toMatchObject({ room: "kitchen", area: { x: 93, y: 56, w: 16, h: 16 }, kinds: ["coffee"], object: "stove" });
    expect(slot("coffee-stove").default).toBeUndefined();
    for (const [id, level] of [["main", rooms.main], ["kitchen", rooms.kitchen]] as const) {
      expect(() => new Decor().checkLevel(level), id).not.toThrow();
      expect(new Decor().swapProblems(level), id).toEqual([]);
    }
    expect(() => validateDecorData(DECOR_DATA)).not.toThrow();
  });

  it("start with the cone on the table and nothing on the stove, so a fresh game has no new prompt", () => {
    const d = new Decor();
    expect(d.heldIn("coffee-table")?.id).toBe("coffee-pourover");
    expect(d.heldIn("coffee-stove")).toBeUndefined();
    expect(d.canChange("coffee-table")).toBe(false);
    expect(d.canChange("coffee-stove")).toBe(false);
  });
});

describe("the apparatus", () => {
  it("fits one station each: three for the table, three for the stove", () => {
    const table = coffeeItems.filter((i) => fits(slot("coffee-table"), i)).map((i) => i.id);
    const stove = coffeeItems.filter((i) => fits(slot("coffee-stove"), i)).map((i) => i.id);
    expect(table).toEqual(["coffee-pourover", "coffee-french-press", "coffee-drip-machine", "coffee-pod-machine"]);
    expect(stove).toEqual(["coffee-percolator", "coffee-moka-pot", "coffee-briki"]);
  });

  it("have a name, a task word, a short note and a sprite, with characters the font draws and no brand", () => {
    for (const i of coffeeItems) {
      expect(unsupportedChars(i.name), i.id).toEqual([]);
      expect(unsupportedChars(i.taskName ?? ""), i.id).toEqual([]);
      expect(i.taskName!.length, i.id).toBeLessThanOrEqual(TASK_NAME_MAX);
      expect(i.note!.length, i.id).toBeLessThanOrEqual(NOTE_MAX);
      expect(unsupportedChars(i.note!), i.id).toEqual([]);
      expect(`${i.name} ${i.note}`, i.id).not.toMatch(/AEROPRESS|KEURIG|NESPRESSO|BIALETTI|CHEMEX|MR\. COFFEE|BODUM/);
    }
  });

  it("arrive as gifts from day 85, three days apart, after the outfits (72)", () => {
    const days = CHECKPOINTS.filter((c) => coffeeItems.some((i) => i.id === c.item));
    expect(days.map((c) => c.item)).toEqual(["coffee-french-press", "coffee-drip-machine", "coffee-pod-machine", "coffee-percolator", "coffee-moka-pot", "coffee-briki"]);
    expect(days.map((c) => "atLeast" in c && c.atLeast)).toEqual([85, 88, 91, 94, 97, 100]);
    expect(GIFT_ITEMS.filter((i) => i.kind === "coffee")).toHaveLength(6);
  });
});

describe("task text follows the apparatus", () => {
  it("is today's wording on a fresh game", () => {
    const d = new Decor();
    expect(d.taskName(task("coffee"))).toBe("Make pour-over coffee");
    expect(d.taskPrompt(task("coffee"))).toBe("Make pour-over coffee");
  });

  it("names the press, drip and pod machines at the table and the pots on the stove", () => {
    const names = (table?: string, stove?: string) => {
      const d = holding(table, stove);
      return [d.taskName(task("coffee")), d.taskPrompt(task("coffee")), d.taskName(task("coffee-stove")), d.taskPrompt(task("coffee-stove"))];
    };
    expect(names("coffee-french-press", "coffee-moka-pot")).toEqual(["Make french press coffee", "Make french press coffee", "Make moka coffee", "Make moka coffee"]);
    expect(names("coffee-drip-machine", "coffee-percolator")[0]).toBe("Make drip coffee");
    expect(names("coffee-pod-machine", "coffee-briki")).toEqual(["Make pod coffee", "Make pod coffee", "Make briki coffee", "Make briki coffee"]);
  });

  it("leaves other tasks alone", () => {
    const d = holding("coffee-french-press");
    expect(d.taskName(task("drink-coffee"))).toBe("Drink the coffee");
    expect(d.taskPrompt(task("dishes"))).toBe(task("dishes").prompt);
  });
});

describe("the same pay and the same effects", () => {
  it("the stove's coffee is the table's coffee but for the words and the slot it needs", () => {
    const { name, prompt, id, itemWord, heldSlot, ...rest } = task("coffee-stove");
    const { name: n2, prompt: p2, id: i2, itemWord: w2, heldSlot: h2, ...rest2 } = task("coffee");
    expect(rest).toEqual(rest2);
    expect(heldSlot).toBe("coffee-stove");
    expect(h2).toBe("coffee-table");
    expect(rest.points).toBe(70);
    expect(rest.duration).toBe(6);
  });
});

describe("in the kitchen", () => {
  it("offers nothing coffee-like at the stove while it is empty", () => {
    const game = kitchenGame(new Decor());
    stand(game, "coffee-stove");
    expect(game.interaction.choices.length).toBeLessThanOrEqual(1);
  });

  it("offers it with a pot on the stove, worded for the pot, and making it fills the mug and makes a dish", () => {
    const d = holding(undefined, "coffee-moka-pot");
    const game = kitchenGame(d);
    stand(game, "coffee-stove");
    // The swap is there too, since a pot can be taken off (the slot can be emptied).
    expect(game.interaction.choices.map((c) => c.id)).toEqual(["cook", "coffee-stove", "swap-coffee-stove"]);
    for (let i = 0; i < 4 && game.interaction.nearby?.id !== "coffee-stove"; i++) game.update(dt, { ...NO_INPUT, keys: ["Tab"], keysPressed: ["Tab"] } as never);
    expect(game.interaction.nearby?.id).toBe("coffee-stove");
    const dishes = game.state.get("dishes");
    game.update(dt, press);
    expect(game.interaction.active?.item.id).toBe("coffee-stove");
    for (let i = 0; i < 60 * 12 && game.interaction.busy; i++) game.update(dt, NO_INPUT);
    expect(game.state.get("mug")).toBe(1);
    expect(game.state.get("dishes")).toBe(dishes + 1);
  });

  it("offers the swap at the stove once a pot is owned, with NOTHING as a choice", () => {
    const d = new Decor();
    d.own("coffee-briki");
    expect(d.canChange("coffee-stove")).toBe(true);
    const game = kitchenGame(d);
    stand(game, "swap-coffee-stove");
    expect(game.interaction.choices.map((c) => c.id)).toContain("swap-coffee-stove");
    expect(task("swap-coffee-stove").prompt).toBe("Change the coffee gear");
  });
});

describe("achievements", () => {
  it("count coffee made on the stove toward Regular Order, and the stove task is not part of every task", () => {
    expect(ACHIEVEMENTS.find((a) => a.id === "coffee-3")!.when).toEqual({ anyOf: ["coffee", "coffee-stove"], atLeast: 3 });
  });
});
