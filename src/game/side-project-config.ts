// The side project room config (issue 111, stage A): a short text file of
// overrides on a faithful copy of the real room. This file only parses text
// into typed commands and reports problems. It knows nothing about the real
// room or the sprites: whether a piece or sprite exists is checked when the
// room is composed (stage B) and in the shipped-file tests (stage D).
// Design: docs/side-project-config-design.md.
//
// One command per line; `#` starts a comment; blank lines are fine. Numbers
// are in the real room's pixels (1x), same as the map.
//
//   move   <piece> <dx> <dy>      shift a piece ("+16" and "-8" both work)
//   look   <piece> <sprite>       draw another sprite for a piece
//   hide   <piece>                leave a piece out
//   add    <sprite> at <x> <y>    a sprite that is not in the real room
//   figure on <piece> <dx> <dy>   the tiny person, relative to a piece
//   dim    <0 to 0.6>             how dark the screen is (optional)
//
// A bad line is reported and skipped: the rest of the file still applies.

export const LIMITS = {
  maxChars: 8000,
  maxLines: 200,
  maxLineChars: 120,
  maxOps: 100,
  // Largest shift of a piece, and the box `add` can place a sprite in.
  maxMove: 160,
  addX: { min: -64, max: 384 },
  addY: { min: -64, max: 256 },
  dim: { min: 0, max: 0.6 },
};

export type ConfigOp =
  | { kind: "move"; piece: string; dx: number; dy: number; line: number }
  | { kind: "look"; piece: string; sprite: string; line: number }
  | { kind: "hide"; piece: string; line: number }
  | { kind: "add"; sprite: string; x: number; y: number; line: number }
  | { kind: "figure"; piece: string; dx: number; dy: number; line: number }
  | { kind: "dim"; amount: number; line: number };

export interface ParsedConfig {
  ops: ConfigOp[];
  // Each message starts with "line N:".
  problems: string[];
}

const NAME = /^[a-z][a-z0-9-]{0,39}$/;
const INT = /^[+-]?\d{1,4}$/;
const DECIMAL = /^\d(\.\d{1,3})?$/;

export function parseConfig(text: string): ParsedConfig {
  const ops: ConfigOp[] = [];
  const problems: string[] = [];
  if (text.length > LIMITS.maxChars) {
    return { ops, problems: [`file is too long (${text.length} characters, at most ${LIMITS.maxChars})`] };
  }
  const lines = text.split(/\r?\n/);
  if (lines.length > LIMITS.maxLines) {
    problems.push(`file has too many lines (${lines.length}, at most ${LIMITS.maxLines}); the rest is ignored`);
  }
  const seen = new Set<string>();
  let full = false;
  const used = (key: string, line: number, what: string): boolean => {
    if (seen.has(key)) {
      problems.push(`line ${line}: ${what} is already set; the later line is ignored`);
      return true;
    }
    seen.add(key);
    return false;
  };
  lines.slice(0, LIMITS.maxLines).forEach((raw, i) => {
    const line = i + 1;
    if (raw.length > LIMITS.maxLineChars) {
      problems.push(`line ${line}: too long (at most ${LIMITS.maxLineChars} characters)`);
      return;
    }
    const code = raw.replace(/#.*$/, "").trim();
    if (code === "") return;
    const words = code.split(/\s+/);
    const fail = (message: string) => problems.push(`line ${line}: ${message}`);
    if (ops.length >= LIMITS.maxOps) {
      if (!full) fail(`too many commands (at most ${LIMITS.maxOps}); the rest are ignored`);
      full = true;
      return;
    }
    const [command, ...args] = words;
    const name = (value: string, what: string): string | null => {
      if (NAME.test(value)) return value;
      fail(`${what} "${value}" must be lowercase letters, digits and hyphens, starting with a letter`);
      return null;
    };
    const move = (value: string, what: string): number | null => {
      if (!INT.test(value)) {
        fail(`${what} "${value}" must be a whole number such as 16, +16 or -8`);
        return null;
      }
      const n = Number(value);
      if (Math.abs(n) > LIMITS.maxMove) {
        fail(`${what} ${n} is out of range (at most ${LIMITS.maxMove} either way)`);
        return null;
      }
      return n;
    };
    const point = (value: string, what: string, range: { min: number; max: number }): number | null => {
      if (!INT.test(value)) {
        fail(`${what} "${value}" must be a whole number`);
        return null;
      }
      const n = Number(value);
      if (n < range.min || n > range.max) {
        fail(`${what} ${n} is out of range (${range.min} to ${range.max})`);
        return null;
      }
      return n;
    };
    const arity = (usage: string, n: number): boolean => {
      if (args.length === n) return true;
      fail(`"${command}" takes ${usage}, got ${args.length} value${args.length === 1 ? "" : "s"}`);
      return false;
    };
    switch (command) {
      case "move": {
        if (!arity("a piece, dx and dy", 3)) return;
        const piece = name(args[0], "piece");
        const dx = move(args[1], "dx");
        const dy = move(args[2], "dy");
        if (piece === null || dx === null || dy === null) return;
        if (used(`move ${piece}`, line, `the move of "${piece}"`)) return;
        ops.push({ kind: "move", piece, dx, dy, line });
        return;
      }
      case "look": {
        if (!arity("a piece and a sprite", 2)) return;
        const piece = name(args[0], "piece");
        const sprite = name(args[1], "sprite");
        if (piece === null || sprite === null) return;
        if (used(`look ${piece}`, line, `the look of "${piece}"`)) return;
        ops.push({ kind: "look", piece, sprite, line });
        return;
      }
      case "hide": {
        if (!arity("a piece", 1)) return;
        const piece = name(args[0], "piece");
        if (piece === null) return;
        if (used(`hide ${piece}`, line, `hiding "${piece}"`)) return;
        ops.push({ kind: "hide", piece, line });
        return;
      }
      case "add": {
        if (args.length === 4 && args[1] !== "at") {
          fail(`"add" reads: add <sprite> at <x> <y> (expected "at", got "${args[1]}")`);
          return;
        }
        if (!arity("a sprite, \"at\", x and y", 4)) return;
        const sprite = name(args[0], "sprite");
        const x = point(args[2], "x", LIMITS.addX);
        const y = point(args[3], "y", LIMITS.addY);
        if (sprite === null || x === null || y === null) return;
        ops.push({ kind: "add", sprite, x, y, line });
        return;
      }
      case "figure": {
        if (args.length === 4 && args[0] !== "on") {
          fail(`"figure" reads: figure on <piece> <dx> <dy> (expected "on", got "${args[0]}")`);
          return;
        }
        if (!arity("\"on\", a piece, dx and dy", 4)) return;
        const piece = name(args[1], "piece");
        const dx = move(args[2], "dx");
        const dy = move(args[3], "dy");
        if (piece === null || dx === null || dy === null) return;
        if (used("figure", line, "the figure")) return;
        ops.push({ kind: "figure", piece, dx, dy, line });
        return;
      }
      case "dim": {
        if (!arity("one number", 1)) return;
        if (!DECIMAL.test(args[0])) {
          fail(`dim "${args[0]}" must be a number such as 0.35`);
          return;
        }
        const amount = Number(args[0]);
        if (amount < LIMITS.dim.min || amount > LIMITS.dim.max) {
          fail(`dim ${amount} is out of range (${LIMITS.dim.min} to ${LIMITS.dim.max})`);
          return;
        }
        if (used("dim", line, "dim")) return;
        ops.push({ kind: "dim", amount, line });
        return;
      }
      default:
        fail(`unknown command "${command}" (use move, look, hide, add, figure or dim)`);
    }
  });
  return { ops, problems };
}
