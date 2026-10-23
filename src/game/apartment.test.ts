import { describe, expect, it } from "vitest";
import { GLYPHS } from "../render/font";
import { APARTMENT } from "./apartment";
import { TILE } from "./config";
import { Grid } from "./grid";
import { doorProblems, reachablePlaces, taskSpots } from "./plan-checks";
import { TASKS } from "./tasks";

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

  it("sizes the rooms in feet: 17x8, 11x8 and 4x7 inside the walls", () => {
    const inside = (id: string) => ({
      w: rooms[id].size.width / TILE - 2,
      h: rooms[id].size.height / TILE - 2,
    });
    expect(inside("main")).toEqual({ w: 17, h: 8 });
    expect(inside("kitchen")).toEqual({ w: 11, h: 8 });
    expect(inside("bath")).toEqual({ w: 4, h: 7 });
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

  it("has the doors the plan says: main-kitchen and kitchen-bath", () => {
    const links = Object.entries(rooms).flatMap(([id, r]) => r.doors.map((d) => `${id}>${d.to}`));
    expect(links.sort()).toEqual(["bath>kitchen", "kitchen>bath", "kitchen>main", "main>kitchen"]);
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

  it("offers working from more than one place: desk, sofa and bed", () => {
    const places = rooms.main.pieces.filter((p) =>
      rooms.main.interactables.some(
        (i) => i.id === "work" && i.zones.some((z) => p.tiles.some((t) => t.col * TILE === z.x && t.row * TILE === z.y)),
      ),
    );
    expect(places.map((p) => p.name).sort()).toEqual(["queen bed", "sofa", "standing desk"]);
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

  it("has L-shaped pieces whose empty corner is not usable: the sofa and the counter", () => {
    for (const [id, name] of [["main", "sofa"], ["kitchen", "counter and sink"]] as const) {
      const piece = rooms[id].pieces.find((p) => p.name === name)!;
      expect(piece.tiles.length).toBeLessThan((piece.bounds.w / TILE) * (piece.bounds.h / TILE));
      const item = rooms[id].interactables.find((i) =>
        i.zones.some((z) => piece.tiles.some((t) => t.col * TILE === z.x && t.row * TILE === z.y)),
      )!;
      expect(item.zones).toHaveLength(piece.tiles.length);
    }
  });
});
