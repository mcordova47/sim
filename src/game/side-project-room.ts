import { TILE } from "./config";
import type { Level } from "./level";
import type { Check } from "./state";

// The side project's little room (issue 111b, stage B of the design in
// docs/side-project-config-design.md). `composeSideProject` is pure: it takes
// the real room and a list of overrides and returns the sprites to draw, in
// order, in the real room's pixels (1x). Drawing them half size, dimmed, inside
// a monitor is stage C; reading the config text file is stage A (issue 111a).
//
// With no overrides the result is a faithful copy: every piece, prop, floor and
// wall tile of the real room with its default look, in the real room's order.

// The overrides this stage understands. They are defined here, from the design,
// and must line up with the parser's output (issue 111a): the same `kind` names
// and fields. Coordinates are real-room pixels.
export type ConfigOp =
  // `move queen-bed +16 0`: shift a piece (and what sits on it) by dx, dy.
  | { kind: "move"; id: string; dx: number; dy: number }
  // `look queen-bed bed-unmade`: draw another sprite for it.
  | { kind: "look"; id: string; sprite: string }
  // `hide cube-bookshelf`: leave out a piece and what sits on it.
  | { kind: "hide"; id: string }
  // `add plant-2 sprite 96 72`: a sprite that is not in the real room.
  | { kind: "add"; id: string; sprite: string; x: number; y: number }
  // `figure on standing-desk 6 -9`: where the tiny person stands, as an offset
  // from the top-left of a piece. Drawn last.
  | { kind: "figure"; on: string; dx: number; dy: number; sprite?: string }
  // `dim 0.35`: a tuning value for the view (stage C); ignored here.
  | { kind: "dim"; value: number };

export interface DrawOp {
  sprite: string;
  x: number;
  y: number;
  // The slugged id of the piece or prop it came from; absent for floor and walls.
  id?: string;
  layer: "floor" | "wall" | "thing" | "figure";
}

export interface ComposeOptions {
  // Says whether a sprite exists, so `look` and `add` can refuse a bad name.
  hasSprite?: (name: string) => boolean;
  // Height of a sprite, for where an added one sorts. Default: one tile.
  spriteHeight?: (name: string) => number;
}

// The sprite for the tiny person when the config does not name one.
export const FIGURE_SPRITE = "side-project-figure";

// `look floor <sprite>` is not a piece: it changes the floor tiles. The sprite is 32 x 32.
export const FLOOR_ID = "floor";

export class ComposeError extends Error {}

// "painting over the desk" -> "painting-over-the-desk".
export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Thing {
  id: string;
  sprite: string;
  x: number;
  y: number;
  bottom: number;
  // The piece it sits on (a prop's), for move and hide.
  on?: string;
}

function matches(checks: Check[] | undefined, state: (id: string) => number): boolean {
  return (checks ?? []).every((c) => {
    const v = state(c.var);
    return (c.min === undefined || v >= c.min) && (c.max === undefined || v <= c.max);
  });
}

// Ids for the pieces of a level: the slug of each name, with -2, -3 for the
// later pieces that share one (the two east windows).
export function pieceIds(level: Level): Map<Level["pieces"][number], string> {
  const seen = new Map<string, number>();
  const ids = new Map<Level["pieces"][number], string>();
  for (const piece of level.pieces) {
    const base = slug(piece.name);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    ids.set(piece, n === 1 ? base : `${base}-${n}`);
  }
  return ids;
}

// `state` reads a state variable (for props that show only while something
// holds); the default is every variable at 0, so the room is steady.
export function composeSideProject(
  level: Level,
  config: ConfigOp[],
  state: (id: string) => number = () => 0,
  options: ComposeOptions = {},
): DrawOp[] {
  const fail = (op: ConfigOp, why: string): never => {
    throw new ComposeError(`side project room: "${op.kind}" ${why}`);
  };
  const ids = pieceIds(level);
  const things = new Map<string, Thing>();
  const order: Thing[] = [];
  const add = (t: Thing) => {
    things.set(t.id, t);
    order.push(t);
  };
  // The real room draws pieces whose look changes with state (the bed, the table, the
  // windows) before the plain ones, so on a tie in depth they are behind. Same here.
  const changes = (p: Level["pieces"][number]) =>
    (level.appearances ?? []).some(
      (a) => a.slot === undefined && a.area.x === p.bounds.x && a.area.y === p.bounds.y && a.area.w === p.bounds.w && a.area.h === p.bounds.h,
    );
  const pieces = [...level.pieces.filter(changes), ...level.pieces.filter((p) => !changes(p))];
  for (const piece of pieces) {
    if (!piece.sprite) continue;
    const id = ids.get(piece)!;
    add({ id, sprite: piece.sprite, x: piece.bounds.x, y: piece.bounds.y, bottom: piece.bounds.y + piece.bounds.h });
  }
  const propIds = new Set<string>();
  for (const prop of level.props ?? []) {
    if (!prop.sprite) continue;
    if (!matches(prop.when, state)) continue;
    let id = slug(prop.name);
    while (propIds.has(id) || things.has(id)) id += "-prop";
    propIds.add(id);
    add({
      id,
      sprite: prop.sprite,
      x: prop.area.x,
      y: prop.area.y,
      bottom: prop.on.bounds.y + prop.on.bounds.h,
      on: ids.get(prop.on),
    });
  }
  const known = new Set([...ids.values(), ...propIds]);
  const needSprite = (op: ConfigOp, sprite: string) => {
    if (options.hasSprite && !options.hasSprite(sprite)) fail(op, `names a sprite that does not exist: ${sprite}`);
  };
  const need = (op: ConfigOp, id: string): void => {
    if (!known.has(id)) fail(op, `names "${id}", which is not in the real room`);
  };
  // `look floor <sprite>`: the floor drawn in bigger tiles, one sprite per 2 x 2 tiles.
  let bigFloor: string | null = null;
  let figure: { on: string; dx: number; dy: number; sprite: string } | null = null;

  for (const op of config) {
    switch (op.kind) {
      case "move":
        need(op, op.id);
        for (const t of order) {
          if (t.id === op.id || t.on === op.id) {
            t.x += op.dx;
            t.y += op.dy;
            t.bottom += op.dy;
          }
        }
        break;
      case "look":
        if (op.id === FLOOR_ID) {
          needSprite(op, op.sprite);
          bigFloor = op.sprite;
          break;
        }
        need(op, op.id);
        needSprite(op, op.sprite);
        if (!things.has(op.id)) fail(op, `names "${op.id}", which has nothing drawn to change`);
        things.get(op.id)!.sprite = op.sprite;
        break;
      case "hide":
        need(op, op.id);
        for (const t of [...order]) {
          if (t.id === op.id || t.on === op.id) {
            order.splice(order.indexOf(t), 1);
            things.delete(t.id);
          }
        }
        known.delete(op.id);
        break;
      case "add": {
        if (known.has(op.id)) fail(op, `uses the id "${op.id}", which is already taken`);
        needSprite(op, op.sprite);
        const h = options.spriteHeight?.(op.sprite) ?? TILE;
        add({ id: op.id, sprite: op.sprite, x: op.x, y: op.y, bottom: op.y + h });
        known.add(op.id);
        break;
      }
      case "figure":
        need(op, op.on);
        if (figure) fail(op, "is given twice");
        figure = { on: op.on, dx: op.dx, dy: op.dy, sprite: op.sprite ?? FIGURE_SPRITE };
        needSprite(op, figure.sprite);
        break;
      case "dim":
        break;
    }
  }

  const out: DrawOp[] = [];
  if (level.floor && bigFloor) {
    // A 2 x 2 block gets the big sprite only when all four tiles are floor; the rest keep
    // the ordinary tile, so the big sprite never spills onto a tile that is not floor.
    const has = new Set(level.floor.tiles.map((t) => `${t.col},${t.row}`));
    const done = new Set<string>();
    for (const t of level.floor.tiles) {
      const col = t.col - (t.col % 2);
      const row = t.row - (t.row % 2);
      const whole = [0, 1].every((dc) => [0, 1].every((dr) => has.has(`${col + dc},${row + dr}`)));
      if (whole) {
        if (done.has(`${col},${row}`)) continue;
        done.add(`${col},${row}`);
        out.push({ sprite: bigFloor, x: col * TILE, y: row * TILE, layer: "floor" });
      } else {
        out.push({ sprite: level.floor.sprite, x: t.col * TILE, y: t.row * TILE, layer: "floor" });
      }
    }
  } else if (level.floor) {
    for (const t of level.floor.tiles) {
      out.push({ sprite: level.floor.sprite, x: t.col * TILE, y: t.row * TILE, layer: "floor" });
    }
  }
  for (const wall of level.walls ?? []) {
    const x = wall.col * TILE;
    const y = wall.row * TILE;
    out.push({ sprite: wall.sprite, x, y, layer: "wall" });
    if (wall.doorSprite) out.push({ sprite: wall.doorSprite, x, y, layer: "wall" });
  }
  // The same stable sort the real room uses: nearer the bottom is in front.
  for (const t of [...order].sort((a, b) => a.bottom - b.bottom)) {
    out.push({ sprite: t.sprite, x: t.x, y: t.y, id: t.id, layer: "thing" });
  }
  if (figure) {
    // A hidden piece is gone, so the figure stands where it was.
    const base = things.get(figure.on) ?? null;
    const anchor = base ?? findBounds(level, ids, figure.on);
    if (anchor) {
      out.push({ sprite: figure.sprite, x: anchor.x + figure.dx, y: anchor.y + figure.dy, layer: "figure" });
    }
  }
  return out;
}

function findBounds(level: Level, ids: Map<Level["pieces"][number], string>, id: string) {
  for (const piece of level.pieces) if (ids.get(piece) === id) return piece.bounds;
  return null;
}
