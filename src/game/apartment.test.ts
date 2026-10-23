import { describe, expect, it } from "vitest";
import { GLYPHS } from "../render/font";
import { APARTMENT } from "./apartment";
import { TILE } from "./config";
import { Grid } from "./grid";
import { doorProblems, reachablePlaces, taskSpots } from "./plan-checks";
import { TASKS } from "./tasks";

const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });
const rooms = APARTMENT.rooms;
const start = rooms[APARTMENT.start];
const from = { room: APARTMENT.start, col: start.spawn.x / TILE, row: start.spawn.y / TILE };
const reach = reachablePlaces(rooms, from);
const at = (room: string, col: number, row: number) => reach.has(`${room},${col},${row}`);

describe("the apartment", () => {
  it("has the three rooms, and starts in one of them", () => {
    expect(Object.keys(rooms).sort()).toEqual(["bath", "kitchen", "main"]);
    expect(rooms[APARTMENT.start]).toBeDefined();
    for (const [id, room] of Object.entries(rooms)) expect(room.id).toBe(id);
  });

  it("sizes the rooms in feet: 17x8, 11x8 and 7x4 inside the walls", () => {
    const inside = (id: string) => ({
      w: rooms[id].size.width / TILE - 2,
      h: rooms[id].size.height / TILE - 2,
    });
    expect(inside("main")).toEqual({ w: 17, h: 8 });
    expect(inside("kitchen")).toEqual({ w: 11, h: 8 });
    expect(inside("bath")).toEqual({ w: 7, h: 4 });
  });

  it("fits every room on one screen, so the camera never has to scroll", () => {
    for (const room of Object.values(rooms)) {
      expect(room.size.width).toBeLessThanOrEqual(20 * TILE);
      expect(room.size.height).toBeLessThanOrEqual(12 * TILE);
    }
  });

  it("starts every room on open floor", () => {
    for (const room of Object.values(rooms)) {
      const grid = new Grid(room.size, room.solids);
      expect(grid.isBlocked(room.spawn.x / TILE, room.spawn.y / TILE)).toBe(false);
    }
  });
});

describe("doorways", () => {
  it("pair up both ways, arrive on open floor and face away from the door", () => {
    expect(doorProblems(rooms)).toEqual([]);
  });

  it("has the doors the plan says: a two-tile passage main-kitchen and one kitchen-bath door", () => {
    const links = Object.entries(rooms).flatMap(([id, r]) => r.doors.map((d) => `${id}>${d.to}`));
    expect(links.sort()).toEqual([
      "bath>kitchen",
      "kitchen>bath",
      "kitchen>main",
      "kitchen>main",
      "main>kitchen",
      "main>kitchen",
    ]);
  });

  it("lets the player reach every doorway, and the floor inside each one, from the start", () => {
    for (const [id, room] of Object.entries(rooms)) {
      for (const door of room.doors) {
        expect(at(id, door.col, door.row), `${id} door at ${door.col},${door.row}`).toBe(true);
        expect(at(door.to, door.arrive.col, door.arrive.row), `arrival in ${door.to}`).toBe(true);
      }
    }
  });

  it("is caught when a doorway does not pair up", () => {
    const broken = {
      ...rooms,
      main: { ...rooms.main, doors: [{ ...rooms.main.doors[0], arrive: { col: 5, row: 5, facing: "left" as const } }] },
    };
    expect(doorProblems(broken).length).toBeGreaterThan(0);
  });

  it("is caught when furniture blocks the floor inside a doorway", () => {
    const kitchen = rooms.kitchen;
    const door = rooms.main.doors[0];
    const blocked = {
      ...rooms,
      kitchen: {
        ...kitchen,
        solids: [...kitchen.solids, { x: door.arrive.col * TILE, y: door.arrive.row * TILE, w: TILE, h: TILE }],
      },
    };
    expect(doorProblems(blocked).join("\n")).toContain("blocked tile");
  });
});

describe("tasks", () => {
  it("can be reached on foot and faced from somewhere, through doorways", () => {
    const missing: string[] = [];
    for (const [id, room] of Object.entries(rooms)) {
      const spots = taskSpots(room);
      for (const item of room.interactables) {
        const usable = spots.some((s) => s.id === item.id && at(id, s.stand.col, s.stand.row));
        if (!usable) missing.push(`${id}: ${item.id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("places every task from the task list somewhere", () => {
    const placed = new Set(Object.values(rooms).flatMap((r) => r.interactables.map((i) => i.id)));
    expect(TASKS.map((t) => t.id).filter((id) => !placed.has(id))).toEqual([]);
  });

  it("offers working from more than one place: desk, sofa and bed (a task of its own at each)", () => {
    const placesOf = (id: string) =>
      rooms.main.pieces
        .filter((p) =>
          rooms.main.interactables.some(
            (i) => i.id === id && i.zones.some((z) => p.tiles.some((t) => t.col * TILE === z.x && t.row * TILE === z.y)),
          ),
        )
        .map((p) => p.name);
    expect(placesOf("work")).toEqual(["standing desk"]);
    expect(placesOf("work-sofa")).toEqual(["sofa"]);
    expect(placesOf("work-bed")).toEqual(["queen bed"]);
  });

  it("only uses characters the pixel font can draw, in names, prompts and flavor", () => {
    for (const room of Object.values(rooms)) {
      for (const item of room.interactables) {
        for (const text of [item.name, item.prompt, item.flavor ?? ""]) {
          for (const ch of text.toUpperCase()) {
            if (ch !== " ") expect(GLYPHS[ch], `${item.id}: "${ch}"`).toBeDefined();
          }
        }
      }
    }
  });

  it("gives no task a zone inside a piece it isn't part of: each zone is one of its object's tiles", () => {
    for (const room of Object.values(rooms)) {
      const grid = new Grid(room.size, room.solids);
      for (const item of room.interactables) {
        for (const z of item.zones) expect(grid.isBlocked(z.x / TILE, z.y / TILE), item.id).toBe(true);
      }
    }
  });
});

describe("furniture", () => {
  it("keeps furniture off the doorways (the tile inside each is checked by the pairing test)", () => {
    for (const [id, room] of Object.entries(rooms)) {
      const grid = new Grid(room.size, room.solids);
      for (const d of room.doors) {
        expect(grid.isBlocked(d.col, d.row), `${id} doorway`).toBe(false);
      }
    }
  });

  it("names a sprite in the art style (kebab-case) for every piece that has one", () => {
    for (const room of Object.values(rooms)) {
      for (const piece of room.pieces) {
        if (piece.sprite) expect(piece.sprite, piece.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    }
  });

  it("makes the kitchen an L: the leg is open floor, the corner under the bar is the bath's wall", () => {
    const grid = new Grid(rooms.kitchen.size, rooms.kitchen.solids);
    expect(grid.isBlocked(9, 8)).toBe(false); // bottom of the leg
    expect(grid.isBlocked(2, 8)).toBe(true); // under the bar, where the bath is
  });

  it("draws every sprite named in level data with a file in public/sprites", () => {
    const names = new Set<string>();
    for (const room of Object.values(rooms)) {
      for (const piece of room.pieces) if (piece.sprite) names.add(piece.sprite);
      for (const a of room.appearances ?? []) for (const v of a.variants) if (v.sprite) names.add(v.sprite);
    }
    expect(names.size).toBeGreaterThan(20);
    for (const name of names) {
      expect(`/public/sprites/${name}.png` in spriteFiles, name).toBe(true);
    }
  });

  it("gives each of the three paintings on the north wall its own sprite", () => {
    const sprite = (name: string) => rooms.main.pieces.find((p) => p.name === name)?.sprite;
    const three = ["painting over the table", "painting over the desk", "painting over the nightstand"].map(sprite);
    expect(new Set(three).size).toBe(3);
  });

  it("uses the wide painting over the nightstand and the plain window above the blinds", () => {
    const sprite = (name: string) => rooms.main.pieces.find((p) => p.name === name)?.sprite;
    expect(sprite("painting over the nightstand")).toBe("painting-wide");
    expect(sprite("window")).toBe("window");
    expect(sprite("window and blinds")).toBe("window-blinds");
  });

  it("places the mic stand, the 1x1 guitar and the 1x3 radiator (issues 044, 056)", () => {
    const piece = (name: string) => rooms.main.pieces.find((p) => p.name === name);
    const tiles = (name: string) => piece(name)?.tiles.map((t) => `${t.col},${t.row}`).sort();
    expect(piece("robin print")).toBeUndefined(); // it hangs on the west wall, off camera
    expect(piece("mic stand")?.sprite).toBe("mic-stand");
    expect(tiles("mic stand")).toEqual(["5,1", "5,2"]); // the sprite is 16x32
    expect(tiles("guitar")).toEqual(["1,5"]);
    expect(tiles("radiator")).toEqual(["17,1", "17,2", "17,3"]);
    const grid = new Grid(rooms.main.size, rooms.main.solids);
    expect(grid.isBlocked(17, 4)).toBe(false); // the radiator's old fourth tile
    expect(at("main", 17, 4)).toBe(true);
    expect(grid.isBlocked(1, 6)).toBe(false); // the guitar's old second tile
    expect(grid.isBlocked(5, 3)).toBe(false); // still a way through between the table and the desk
  });

  it("keeps the guitar usable from the floor north of it", () => {
    const mine = taskSpots(rooms.main).filter((s) => s.id === "guitar");
    expect(mine.some((s) => s.stand.col === 1 && s.stand.row === 4 && at("main", 1, 4))).toBe(true);
  });

  it("puts the fridge in the south-east corner of the kitchen, usable from a walkable tile", () => {
    const fridge = rooms.kitchen.pieces.find((p) => p.name === "fridge");
    expect(fridge?.tiles.map((t) => `${t.col},${t.row}`).sort()).toEqual(["10,7", "10,8", "11,7", "11,8"]);
    const grid = new Grid(rooms.kitchen.size, rooms.kitchen.solids);
    expect(grid.isBlocked(10, 9)).toBe(true); // the south wall is just below it
    expect(grid.isBlocked(10, 6)).toBe(false); // floor in the freed row, above it
    const spots = taskSpots(rooms.kitchen);
    for (const task of ["fridge-stare", "humidifier"]) {
      const mine = spots.filter((s) => s.id === task);
      expect(mine.length, task).toBeGreaterThan(0);
      expect(mine.some((s) => at("kitchen", s.stand.col, s.stand.row)), task).toBe(true);
    }
  });
});
