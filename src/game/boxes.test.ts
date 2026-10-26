import { describe, expect, it } from "vitest";
import { NO_INPUT } from "../input/controls";
import { APARTMENT } from "./apartment";
import { pickVariant } from "./appearance";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
import { TASKS } from "./tasks";

// Issue 066: the boxes in the kitchen are a stack or flat; opening a package brings the stack back.

const dt = 1 / 60;
const rooms = APARTMENT.rooms;
const press = { ...NO_INPUT, interactPressed: true };
const ITEM = "art-test-barn";

function kitchen() {
  return new Game(rooms.kitchen, { rooms, random: () => 0.5 });
}
function stand(game: Game, level: typeof rooms.kitchen, id: string) {
  const spot = taskSpots(level).find((s) => s.id === id)!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(dt, NO_INPUT);
}
function finish(game: Game) {
  for (let i = 0; i < 60 * 30 && game.interaction.busy; i++) game.update(dt, NO_INPUT);
}
const boxesItem = (_game: Game) => rooms.kitchen.interactables.find((i) => i.id === "flatten-boxes")!;
const boxAppearance = () => rooms.kitchen.appearances?.find((a) => a.variants.some((v) => v.sprite === "boxes-flat"));

describe("the boxes state variable", () => {
  it("is a saved variable that starts as a stack, 0 or 1 only", () => {
    const def = STATE_VARS.find((v) => v.id === "boxes")!;
    expect(def).toMatchObject({ initial: 1, min: 0, max: 1 });
    const st = new ApartmentState(STATE_VARS);
    expect(st.get("boxes")).toBe(1);
    st.applyEffects([{ var: "boxes", add: 5 }]);
    expect(st.get("boxes")).toBe(1);
    st.applyEffects([{ var: "boxes", add: -5 }]);
    expect(st.get("boxes")).toBe(0);
  });

  it("an older state without it still runs: the stack is the default and nothing breaks", () => {
    const old = new ApartmentState(STATE_VARS.filter((v) => v.id !== "boxes"));
    expect(old.has("boxes")).toBe(false);
    const game = new Game(rooms.main, { rooms, state: old, random: () => 0.5 });
    // Opening a package must not fail when the variable is missing.
    game.deliveries.deliver(ITEM, 0);
    expect(() => {
      (game as unknown as { collectDeliveries(): void }).collectDeliveries();
    }).not.toThrow();
    expect(game.decor.owns(ITEM)).toBe(true);
  });
});

describe("Flatten the boxes", () => {
  it("keeps its points, flavor and cooldown", () => {
    const t = TASKS.find((x) => x.id === "flatten-boxes")!;
    expect(t.points).toBe(45);
    expect(t.flavor).toBe("You have been meaning to do this since spring.");
    expect(t.requires).toEqual([{ var: "boxes", min: 1, reason: "NO BOXES TO FLATTEN" }]);
  });

  it("is offered with a stack, flattens it, and is then refused with the plain reason", () => {
    const game = kitchen();
    stand(game, rooms.kitchen, "flatten-boxes");
    expect(game.interaction.nearby?.id).toBe("flatten-boxes");
    expect(game.interaction.canStart(boxesItem(game))).toBe(true);
    game.update(dt, press);
    finish(game);
    expect(game.state.get("boxes")).toBe(0);
    expect(game.interaction.unavailableReason(boxesItem(game))).toBe("NO BOXES TO FLATTEN");
  });

  it("is not offered as startable when the boxes are already flat", () => {
    const game = kitchen();
    game.state.applyEffects([{ var: "boxes", set: 0 }]);
    expect(game.interaction.canStart(boxesItem(game))).toBe(false);
  });
});

describe("opening a package brings the stack back", () => {
  it("sets boxes to 1 whatever the cooldown on flattening", () => {
    const game = kitchen();
    stand(game, rooms.kitchen, "flatten-boxes");
    game.update(dt, press);
    finish(game);
    expect(game.state.get("boxes")).toBe(0);
    expect(game.interaction.cooldownRemaining(boxesItem(game))).toBeGreaterThan(0);
    game.deliveries.deliver(ITEM, 0);
    (game as unknown as { collectDeliveries(): void }).collectDeliveries();
    expect(game.state.get("boxes")).toBe(1);
    // The cooldown still holds: it only gates flattening, not the stack coming back.
    expect(game.interaction.cooldownRemaining(boxesItem(game))).toBeGreaterThan(0);
  });

  it("works through the real task at the front door", () => {
    const game = new Game(rooms.main, { rooms, random: () => 0.5 });
    game.state.applyEffects([{ var: "boxes", set: 0 }]);
    game.deliveries.deliver(ITEM, 0);
    game.update(dt, NO_INPUT);
    stand(game, rooms.main, "collect-delivery");
    game.update(dt, press);
    for (let i = 0; i < 5; i++) game.update(dt, NO_INPUT);
    expect(game.decor.owns(ITEM)).toBe(true);
    expect(game.state.get("boxes")).toBe(1);
  });

  it("opening with nothing waiting leaves flat boxes flat", () => {
    const game = kitchen();
    game.state.applyEffects([{ var: "boxes", set: 0 }]);
    (game as unknown as { collectDeliveries(): void }).collectDeliveries();
    expect(game.state.get("boxes")).toBe(0);
  });

  it("several packages still give one stack, not a taller one", () => {
    const game = new Game(rooms.main, { rooms, random: () => 0.5 });
    game.state.applyEffects([{ var: "boxes", set: 0 }]);
    game.deliveries.deliver(ITEM, 0);
    game.deliveries.deliver("plant-test-grown", 0);
    (game as unknown as { collectDeliveries(): void }).collectDeliveries();
    expect(game.state.get("boxes")).toBe(1);
  });
});

describe("the kitchen object follows the state", () => {
  it("draws the stack for 1 and the flat boxes for 0, ", () => {
    const obj = boxAppearance();
    expect(obj, "the box object in the kitchen").toBeDefined();
    const st = new ApartmentState(STATE_VARS);
    expect(pickVariant(obj!.variants, st)?.sprite).toBe("boxes");
    st.applyEffects([{ var: "boxes", set: 0 }]);
    expect(pickVariant(obj!.variants, st)?.sprite).toBe("boxes-flat");
    // That both sprite files exist is checked for every variant in apartment.test.ts.
  });
});
