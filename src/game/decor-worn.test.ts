import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { APARTMENT } from "./apartment";
import { Decor } from "./decor";
import { DECOR_ITEMS, GIFT_ITEMS } from "./decor-data";
import { CHECKPOINTS } from "./delivery-checkpoints";
import { Game } from "./game";
import { OUTFITS, outfitFromItem, outfitItemId } from "./outfits";
import { taskSpots } from "./plan-checks";
import { TASKS } from "./tasks";

// Issue 152: worn outfits. The `worn` slot is not drawn on the map; `outfit` follows it.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };

function setup(owned: string[] = []) {
  const decor = new Decor();
  for (const id of owned) decor.own(id);
  const game = new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, decor, random: () => 0.5 });
  return { game, decor };
}

describe("worn outfits", () => {
  it("have one item per outfit, each shown by its idle-down sprite, in outfits.ts order", () => {
    const items = [...DECOR_ITEMS, ...GIFT_ITEMS].filter((i) => i.kind === "outfit");
    expect(items.map((i) => i.id)).toEqual(OUTFITS.map(outfitItemId));
    for (const [i, o] of OUTFITS.entries()) {
      expect(items[i].sprite).toBe(`${o.prefix}-idle-down`);
      expect(items[i].name).toBe(o.name);
      expect(outfitFromItem(items[i].id)).toBe(i);
      expect(items[i].note && items[i].from).toBeTruthy();
    }
    expect(outfitFromItem(undefined)).toBe(0);
    expect(outfitFromItem("outfit-nope")).toBe(0);
  });

  it("arrive as gifts on days after every earlier gift, casual then out then pajamas", () => {
    const days = (id: string) => Number(CHECKPOINTS.find((c) => c.item === id)!.atLeast);
    // The gifts listed before the clothes (later lists, such as the coffee gear of issue 168, come after them).
    const earlier = CHECKPOINTS.slice(0, CHECKPOINTS.findIndex((c) => c.item === "outfit-casual"));
    const last = Math.max(...earlier.filter((c) => c.stat === "days").map((c) => Number(c.atLeast)));
    expect([days("outfit-casual"), days("outfit-out"), days("outfit-pajamas")]).toEqual([39, 42, 45]);
    expect(days("outfit-casual")).toBeGreaterThan(last);
  });

  it("start as the everyday clothes and are not drawn on the map", () => {
    const { game } = setup();
    game.update(dt, NO_INPUT);
    expect(game.state.get("outfit")).toBe(0);
    expect(game.decor.slot("worn")!.offMap).toBe(true);
    expect((APARTMENT.rooms.main.appearances ?? []).some((a) => a.slot === "worn")).toBe(false);
  });

  it("offer Change clothes at the cube bookshelf only when another outfit is owned", () => {
    const standAt = (game: Game) => {
      const spot = taskSpots(APARTMENT.rooms.main).find((s) => s.id === "swap-worn")!;
      game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
    };
    const fresh = setup().game;
    standAt(fresh);
    fresh.update(dt, press);
    expect(fresh.interaction.active?.item.id).not.toBe("swap-worn");
    const { game } = setup(["outfit-out"]);
    expect(game.decor.canChange("worn")).toBe(true);
    expect(TASKS.find((t) => t.id === "swap-worn")!.prompt).toBe("Change clothes");
  });

  it("make the outfit follow the slot (preview included), and nothing else writes it", () => {
    const { game, decor } = setup(["outfit-casual", "outfit-pajamas"]);
    decor.place("worn", "outfit-casual");
    game.update(dt, NO_INPUT);
    expect(game.state.get("outfit")).toBe(1);
    decor.preview("worn", "outfit-pajamas");
    expect(decor.heldIn("worn")!.id).toBe("outfit-casual");
    decor.clearPreview();
    // A stray write is put back, and no task writes the variable.
    game.state.applyEffects([{ var: "outfit", set: 3 }]);
    game.update(dt, NO_INPUT);
    expect(game.state.get("outfit")).toBe(1);
    expect(TASKS.some((t) => JSON.stringify(t.effects ?? []).includes('"var":"outfit"'))).toBe(false);
  });

  it("are kept through sleeping (the clock wakes, the clothes stay) and a save", () => {
    const { game, decor } = setup(["outfit-pajamas"]);
    decor.place("worn", "outfit-pajamas");
    game.update(dt, NO_INPUT);
    game.state.applyEffects([{ var: "energy", set: 100 }]);
    game.update(dt, NO_INPUT);
    expect(game.state.get("outfit")).toBe(3);
    const loaded = new Decor();
    loaded.load(JSON.parse(JSON.stringify(decor.toJSON())));
    expect(loaded.heldIn("worn")!.id).toBe("outfit-pajamas");
  });
});
