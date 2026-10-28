import { describe, expect, it } from "vitest";
import { APARTMENT } from "../game/apartment";
import { spriteNames } from "./sprite-names";

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });
const spriteSources = import.meta.glob("/art/src/*.sprite", { query: "?url" });

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

describe("the sprite files", () => {
  const png = Object.keys(spriteFiles).map((f) => f.slice("/public/sprites/".length, -".png".length));
  const src = Object.keys(spriteSources).map((f) => f.slice("/art/src/".length, -".sprite".length));

  it("match the sources in art/src one to one", () => {
    expect(png.filter((n) => !src.includes(n))).toEqual([]);
    expect(src.filter((n) => !png.includes(n))).toEqual([]);
  });

  it("no longer include the sprites deleted in issue 101", () => {
    for (const gone of ["window", "floor-tile", "rug", "painting-robin", "icon-phone", "icon-plug", "guitar-tall", "guitar-nylon-tall"]) {
      expect(png, gone).not.toContain(gone);
      expect(src, gone).not.toContain(gone);
    }
  });

  it("keep the reserved sprites", () => {
    for (const kept of ["view-bookshelf", "gallery-wall", "guitar-nylon", "mic-stand-vintage"]) expect(png, kept).toContain(kept);
  });
});
