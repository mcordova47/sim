import { APARTMENT } from "./apartment";
import { parseConfig, type ConfigOp as ParsedOp } from "./side-project-config";
import { composeSideProject, FIGURE_SPRITE, type ComposeOptions, type ConfigOp as RoomOp, type DrawOp } from "./side-project-room";
import configText from "./side-project-room.txt?raw";

// Where the parser (issue 111a) and the composer (issue 111b) meet (issue 111d): the parser
// says `piece`, `amount` and `line`, the composer says `id`, `value` and an id for each added
// sprite. The shipped file is `side-project-room.txt`, read when the game loads.

export function toRoomOps(ops: ParsedOp[]): RoomOp[] {
  return ops.map((op): RoomOp => {
    switch (op.kind) {
      case "move": return { kind: "move", id: op.piece, dx: op.dx, dy: op.dy };
      case "look": return { kind: "look", id: op.piece, sprite: op.sprite };
      case "hide": return { kind: "hide", id: op.piece };
      case "add": return { kind: "add", id: `added-line-${op.line}`, sprite: op.sprite, x: op.x, y: op.y };
      case "figure": return { kind: "figure", on: op.piece, dx: op.dx, dy: op.dy, sprite: FIGURE_SPRITE };
      case "dim": return { kind: "dim", value: op.amount };
    }
  });
}

export const SHIPPED_CONFIG = parseConfig(configText);

// The dim the file asks for, or undefined to keep the view's own.
export function configDim(ops: ParsedOp[] = SHIPPED_CONFIG.ops): number | undefined {
  return ops.find((o) => o.kind === "dim")?.amount;
}

// The little room's sprites in drawing order. A bad config line was already skipped by the
// parser; a name the room does not have makes the composer refuse, so fall back to the plain
// faithful copy (and say so once) rather than drawing nothing.
let warned = false;
export function sideProjectRoom(options: ComposeOptions = {}, ops: ParsedOp[] = SHIPPED_CONFIG.ops): DrawOp[] {
  try {
    return composeSideProject(APARTMENT.rooms.main, toRoomOps(ops), undefined, options);
  } catch (error) {
    if (!warned) console.warn("Side project room: drawing the plain copy instead:", error);
    warned = true;
    return composeSideProject(APARTMENT.rooms.main, []);
  }
}
