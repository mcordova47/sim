import { describe, expect, it } from "vitest";
import { APARTMENT } from "../game/apartment";
import { spriteNames } from "./sprite-names";

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });

describe("the sprites the game asks for", () => {
  const names = spriteNames(Object.values(APARTMENT.rooms));

  it("includes floors, walls, doorways, furniture, every state variant and the player", () => {
    for (const expected of [
      "floor-wood", "floor-kitchen", "floor-bath", "wall-back", "wall-front", "wall-side-left",
      "wall-side-right-kitchen", "wall-side-left-bath", "doorway", "doorway-left-kitchen",
      "doorway-right-kitchen", "doorway-right-bath", "bed-made", "bed-unmade", "dishes-0",
      "dishes-3", "view-gallery-wall", "view-side-project", "fridge", "player-idle-down", "player-walk-left-2",
    ]) {
      expect(names, expected).toContain(expected);
    }
  });

  it("all have a file in public/sprites (the last open criterion of issue 025)", () => {
    for (const name of names) {
      expect(`/public/sprites/${name}.png` in spriteFiles, name).toBe(true);
    }
  });
});
