import { describe, expect, it } from "vitest";
import { NO_INPUT } from "../input/controls";
import { APARTMENT, KITCHEN_MAP } from "./apartment";
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
  it("is a saved variable that starts as a stack, 0 to 2 (1 stack and 0 flat as in 066, 2 gone)", () => {
    const def = STATE_VARS.find((v) => v.id === "boxes")!;
    expect(def).toMatchObject({ initial: 1, min: 0, max: 2 });
    const st = new ApartmentState(STATE_VARS);
    expect(st.get("boxes")).toBe(1);
    st.applyEffects([{ var: "boxes", add: 5 }]);
    expect(st.get("boxes")).toBe(2);
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
    expect(t.requires).toEqual([{ var: "boxes", min: 1, max: 1, reason: "NO BOXES TO FLATTEN" }]);
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
  it("sets boxes to 1, and flattening is offered again at once (no cooldown, issue 071)", () => {
    const game = kitchen();
    stand(game, rooms.kitchen, "flatten-boxes");
    game.update(dt, press);
    finish(game);
    expect(game.state.get("boxes")).toBe(0);
    expect(game.interaction.cooldownRemaining(boxesItem(game))).toBe(0);
    game.deliveries.deliver(ITEM, 0);
    (game as unknown as { collectDeliveries(): void }).collectDeliveries();
    expect(game.state.get("boxes")).toBe(1);
    expect(game.interaction.canStart(boxesItem(game))).toBe(true);
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
    st.applyEffects([{ var: "boxes", set: 2 }]);
    expect(pickVariant(obj!.variants, st)?.sprite).toBe("boxes-gone");
    // That both sprite files exist is checked for every variant in apartment.test.ts.
  });
});

// Issue 070: flat boxes go out with the recycling and are gone.
const recycleItem = () => rooms.kitchen.interactables.find((i) => i.id === "recycle-boxes")!;
const setBoxes = (g: Game, v: number) => g.state.applyEffects([{ var: "boxes", set: v }]);
const goTo = (g: Game, spot: { stand: { col: number; row: number }; face: never }) => {
  g.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  g.update(dt, NO_INPUT);
};

describe("Take out the recycling (issue 070)", () => {
  it("has no cooldown and is refused with a plain reason for a stack, and for no boxes", () => {
    const game = kitchen();
    expect(game.interaction.unavailableReason(recycleItem())).toBe("FLATTEN THE BOXES FIRST");
    setBoxes(game, 2);
    expect(game.interaction.unavailableReason(recycleItem())).toBe("NO BOXES TO TAKE OUT");
    setBoxes(game, 0);
    expect(game.interaction.unavailableReason(recycleItem())).toBeNull();
  });

  it("with a stack or no boxes, ordinary trash works at both objects and the boxes stay", () => {
    for (const start of [1, 2]) {
      for (const spot of taskSpots(rooms.kitchen).filter((s) => s.id === "take-trash")) {
        const game = kitchen();
        setBoxes(game, start);
        goTo(game, spot as never);
        expect(game.interaction.nearby?.id).toBe("take-trash");
        game.update(dt, press);
        finish(game);
        expect(game.state.get("boxes")).toBe(start);
      }
    }
  });

  it("with flat boxes it is offered at the boxes, alone, and the boxes are gone after", () => {
    const spots = taskSpots(rooms.kitchen).filter((s) => s.id === "recycle-boxes");
    expect(spots.length).toBeGreaterThanOrEqual(1);
    for (const spot of spots) {
      const game = kitchen();
      setBoxes(game, 0);
      goTo(game, spot as never);
      expect(game.interaction.nearby?.id).toBe("recycle-boxes");
      expect(game.interaction.choices).toEqual([]);
      game.update(dt, press);
      finish(game);
      expect(game.state.get("boxes")).toBe(2);
      game.update(dt, NO_INPUT);
      // Gone: the boxes only show why Flatten cannot be done.
      expect(game.interaction.nearby?.id).toBe("flatten-boxes");
      expect(game.interaction.unavailableReason(game.interaction.nearby!)).toBe("NO BOXES TO FLATTEN");
    }
  });

  it("at the boxes the two tasks never overlap: a stack offers Flatten, flat offers the recycling, gone offers neither", () => {
    const spot = taskSpots(rooms.kitchen).find((s) => s.id === "recycle-boxes")!;
    for (const [boxes, shown, startable] of [[1, "flatten-boxes", true], [0, "recycle-boxes", true], [2, "flatten-boxes", false]] as const) {
      const game = kitchen();
      setBoxes(game, boxes);
      goTo(game, spot as never);
      expect(game.interaction.nearby?.id).toBe(shown);
      expect(game.interaction.choices).toEqual([]);
      expect(game.interaction.canStart(game.interaction.nearby!)).toBe(startable);
    }
  });

  it("the trash bin only ever offers the trash, whatever the boxes are, and is never blocked by flat boxes", () => {
    for (const boxes of [0, 1, 2]) {
      for (const spot of taskSpots(rooms.kitchen).filter((s) => s.id === "take-trash")) {
        const game = kitchen();
        setBoxes(game, boxes);
        goTo(game, spot as never);
        expect(game.interaction.nearby?.id).toBe("take-trash");
        expect(game.interaction.choices).toEqual([]);
        game.update(dt, press);
        finish(game);
        expect(game.state.get("boxes")).toBe(boxes);
      }
    }
  });

  it("the tasks share no `exclusive` name any more", () => {
    for (const id of ["take-trash", "recycle-boxes"]) expect(TASKS.find((t) => t.id === id)!.exclusive).toBeUndefined();
  });

  it("the north-east corner has no recycling bin: no object, no sprite, plain floor where it stood", () => {
    expect(KITCHEN_MAP[1]).toBe("#........NXP#");
    expect(KITCHEN_MAP.join("")).not.toContain("Y");
    for (const level of Object.values(rooms)) {
      for (const p of level.pieces ?? []) expect(p.sprite).not.toBe("recycling");
      for (const a of level.appearances ?? []) for (const v of a.variants) expect(v.sprite).not.toBe("recycling");
    }
    expect(Object.keys(import.meta.glob("/{art/src,public/sprites}/recycling.*", { query: "?url" }))).toEqual([]);
    // The vacated tile can be walked on.
    const game = kitchen();
    game.player.placeAt(8, 1, "down");
    expect([game.player.col, game.player.row]).toEqual([8, 1]);
  });

  it("at the boxes the recycling and Flatten are the tasks of the boxes object", () => {
    const boxes = taskSpots(rooms.kitchen).filter((s) => s.id === "recycle-boxes" || s.id === "flatten-boxes");
    expect(new Set(boxes.map((s) => s.id))).toEqual(new Set(["recycle-boxes", "flatten-boxes"]));
  });

  it("a package brings the stack back from flat and from gone", () => {
    for (const from of [0, 2]) {
      const game = new Game(rooms.main, { rooms, random: () => 0.5 });
      setBoxes(game, from);
      game.deliveries.deliver(ITEM, 0);
      (game as unknown as { collectDeliveries(): void }).collectDeliveries();
      expect(game.state.get("boxes")).toBe(1);
    }
  });

  it("the whole flow: stack, flatten, recycling, gone", () => {
    const game = kitchen();
    stand(game, rooms.kitchen, "flatten-boxes");
    game.update(dt, press);
    finish(game);
    expect(game.state.get("boxes")).toBe(0);
    goTo(game, taskSpots(rooms.kitchen).find((s) => s.id === "recycle-boxes") as never);
    game.update(dt, press);
    finish(game);
    expect(game.state.get("boxes")).toBe(2);
  });

  it("has its own points and flavor and leaves the trash task alone", () => {
    const t = TASKS.find((x) => x.id === "recycle-boxes")!;
    expect(t.prompt).toBe("Take out the recycling");
    expect(t.points).toBe(55);
    expect(t.flavor).toBeTruthy();
    expect(TASKS.find((x) => x.id === "take-trash")!.points).toBe(50);
  });
});
