import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { GLYPHS } from "../render/font";
import {
  APARTMENT_LEVEL,
  buildSolids,
  buildSpawn,
  taskToInteractable,
} from "./apartment";
import { PLAYER, TILE } from "./config";
import { Game } from "./game";
import { Player } from "./player";
import { check, type Limits } from "./reach";
import { PIECES, ROOM, SOLIDS as TILE_SOLIDS } from "./room";
import { TASKS } from "./tasks";
import { overlaps } from "./world";

const dt = 1 / 60;

describe("conversion", () => {
  it("sizes the level from the room in pixels", () => {
    expect(APARTMENT_LEVEL.size).toEqual({ width: 35 * TILE, height: 12 * TILE });
  });

  it("turns every furniture piece into a pixel solid at the right place", () => {
    const solids = buildSolids();
    // First four are the floor, ceiling and end walls.
    expect(solids).toHaveLength(4 + TILE_SOLIDS.length);
    const fridge = PIECES.findIndex((p) => p.id === "fridge");
    const s = solids[4 + fridge];
    expect(s).toMatchObject({ x: 25 * TILE, w: 2 * TILE, h: 6 * TILE, oneWay: false });
    // Top of a 6 ft piece is 6 tiles above the floor.
    expect(s.y).toBe((ROOM.floorY - 6) * TILE);
  });

  it("keeps one-way pieces one tile thick at the top", () => {
    const table = PIECES.findIndex((p) => p.id === "table");
    const s = buildSolids()[4 + table];
    expect(s).toMatchObject({ oneWay: true, h: TILE, y: (ROOM.floorY - 2) * TILE });
  });

  it("maps a task's feet heights to a zone the standing player overlaps", () => {
    const task = TASKS.find((t) => t.id === "dishes")!;
    const item = taskToInteractable(task);
    // Counter top is 3 tiles up: a player standing on it has feet at that y.
    const feetY = (ROOM.floorY - 3) * TILE;
    const standing = { x: item.zone.x + 2, y: feetY - PLAYER.height, w: PLAYER.width, h: PLAYER.height };
    expect(overlaps(standing, item.zone)).toBe(true);
    // And one standing on the floor does not.
    const onFloor = { ...standing, y: ROOM.floorY * TILE - PLAYER.height };
    expect(overlaps(onFloor, item.zone)).toBe(false);
  });
});

describe("the apartment level", () => {
  it("spawns the player clear of every solid", () => {
    const spawn = buildSpawn();
    const body = { ...spawn, w: PLAYER.width, h: PLAYER.height };
    for (const s of APARTMENT_LEVEL.solids) {
      expect(overlaps(body, s), JSON.stringify(s)).toBe(false);
    }
  });

  it("has a unique id for every task, and a task for every interactable piece", () => {
    const ids = TASKS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const withTasks = new Set(TASKS.map((t) => t.piece));
    for (const p of PIECES.filter((p) => p.role === "interactable")) {
      expect(withTasks.has(p.id), p.id).toBe(true);
    }
  });

  it("has no overlapping task zones", () => {
    const items = APARTMENT_LEVEL.interactables;
    const clashes: string[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (overlaps(items[i].zone, items[j].zone)) clashes.push(`${items[i].id} / ${items[j].id}`);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("lets a player standing on something start every task", () => {
    // The interaction system only starts a task for a grounded player, so each
    // zone has to be overlapped by a body standing on some surface.
    const solids = APARTMENT_LEVEL.solids;
    const unstartable: string[] = [];
    for (const item of APARTMENT_LEVEL.interactables) {
      const z = item.zone;
      const ok = solids.some((s) => {
        const bodyY = s.y - PLAYER.height;
        // Try the ends of the zone and of the surface, kept on the surface.
        const xs = [z.x, z.x + z.w - PLAYER.width, s.x, s.x + s.w - PLAYER.width];
        return xs.some((raw) => {
          const x = Math.min(Math.max(raw, s.x - PLAYER.width + 1), s.x + s.w - 1);
          return overlaps({ x, y: bodyY, w: PLAYER.width, h: PLAYER.height }, z);
        });
      });
      if (!ok) unstartable.push(item.id);
    }
    expect(unstartable).toEqual([]);
  });

  it("only uses characters the pixel font can draw in names and prompts", () => {
    for (const item of APARTMENT_LEVEL.interactables) {
      for (const text of [item.name, item.prompt]) {
        for (const ch of text.toUpperCase()) {
          if (ch !== " ") expect(GLYPHS[ch], `${item.id}: "${ch}" in "${text}"`).toBeDefined();
        }
      }
    }
  });

  it("starts the game and settles the player on the sofa", () => {
    const game = new Game(APARTMENT_LEVEL);
    for (let i = 0; i < 60; i++) game.update(dt, NO_INPUT);
    expect(game.player.grounded).toBe(true);
    // Sofa top is 1 tile up.
    expect(game.player.y + game.player.h).toBe((ROOM.floorY - 1) * TILE);
  });
});

// Measure what the real Player can do instead of trusting the configured
// jump height, then feed those limits to the reachability check.
function measureLimits(): Limits {
  const floor = [{ x: -1000, y: 100, w: 3000, h: 20 }];
  const idle: Controls = NO_INPUT;

  // Highest standing jump with jump held the whole time.
  const p = new Player(0, 100 - PLAYER.height);
  for (let i = 0; i < 10; i++) p.update(dt, idle, floor);
  const startY = p.y;
  let apex = 0;
  p.update(dt, { ...idle, jumpPressed: true, jumpHeld: true }, floor);
  for (let i = 0; i < 120; i++) {
    p.update(dt, { ...idle, jumpHeld: true }, floor);
    apex = Math.max(apex, startY - p.y);
  }

  // Farthest standing jump on the flat while holding right.
  const q = new Player(0, 100 - PLAYER.height);
  for (let i = 0; i < 10; i++) q.update(dt, idle, floor);
  const startX = q.x;
  const right: Controls = { ...idle, moveX: 1, jumpHeld: true };
  q.update(dt, { ...right, jumpPressed: true }, floor);
  let distance = 0;
  for (let i = 0; i < 120 && !q.grounded; i++) {
    q.update(dt, right, floor);
    distance = q.x - startX;
  }

  return {
    // Round down to a quarter tile so the check stays conservative.
    maxRise: Math.floor((apex / TILE) * 4) / 4,
    // The body has to clear the gap, so take its width off the hop.
    maxGap: Math.floor(((distance - PLAYER.width) / TILE) * 4) / 4,
    playerHeight: PLAYER.height / TILE,
  };
}

describe("reachability with the real player", () => {
  const limits = measureLimits();
  const tileSpawn = { x: 15.5, y: ROOM.floorY - 1 };

  it("measures sensible jump limits", () => {
    expect(limits.maxRise).toBeGreaterThanOrEqual(2);
    expect(limits.maxRise).toBeLessThanOrEqual(PLAYER.jumpHeight / TILE);
    expect(limits.maxGap).toBeGreaterThanOrEqual(1);
  });

  it("can reach every piece and every task from the spawn", () => {
    const report = check(ROOM, TILE_SOLIDS, PIECES, TASKS, tileSpawn, limits);
    expect(report.unreachablePieces).toEqual([]);
    expect(report.unreachableTasks).toEqual([]);
    expect(report.noHeadroom).toEqual([]);
  });
});
