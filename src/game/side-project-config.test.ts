import { describe, expect, it } from "vitest";
import { LIMITS, parseConfig } from "./side-project-config";

const problemsOf = (text: string) => parseConfig(text).problems;

describe("parseConfig: good files", () => {
  it("an empty file or only comments is a faithful copy: no ops, no problems", () => {
    expect(parseConfig("")).toEqual({ ops: [], problems: [] });
    expect(parseConfig("\n  \n# just a note\n   # indented\n")).toEqual({ ops: [], problems: [] });
  });

  it("parses every command, with comments and CRLF line ends", () => {
    const text = [
      "# the little room",
      "move   queen-bed      +16 0        # shift by",
      "look   queen-bed      bed-unmade",
      "hide   cube-bookshelf",
      "add    plant-2        at 96 72",
      "figure on standing-desk 6 -9",
      "dim    0.35",
    ].join("\r\n");
    const { ops, problems } = parseConfig(text);
    expect(problems).toEqual([]);
    expect(ops).toEqual([
      { kind: "move", piece: "queen-bed", dx: 16, dy: 0, line: 2 },
      { kind: "look", piece: "queen-bed", sprite: "bed-unmade", line: 3 },
      { kind: "hide", piece: "cube-bookshelf", line: 4 },
      { kind: "add", sprite: "plant-2", x: 96, y: 72, line: 5 },
      { kind: "figure", piece: "standing-desk", dx: 6, dy: -9, line: 6 },
      { kind: "dim", amount: 0.35, line: 7 },
    ]);
  });

  it("accepts the edges of every limit", () => {
    const text = [
      `move a ${LIMITS.maxMove} -${LIMITS.maxMove}`,
      `add s at ${LIMITS.addX.min} ${LIMITS.addY.max}`,
      `add s at ${LIMITS.addX.max} ${LIMITS.addY.min}`,
      "dim 0",
      "figure on a 0 0",
    ].join("\n");
    expect(problemsOf(text)).toEqual([]);
    expect(problemsOf("dim 0.6")).toEqual([]);
  });

  it("does not mind extra spaces and tabs", () => {
    expect(parseConfig("\thide\t  queen-bed  ").ops).toHaveLength(1);
  });
});

describe("parseConfig: every error names the line and the fix", () => {
  it("unknown command", () => {
    expect(problemsOf("\nspin queen-bed")).toEqual(['line 2: unknown command "spin" (use move, look, hide, add, figure or dim)']);
    expect(problemsOf("Move a 1 1")[0]).toContain('unknown command "Move"');
  });

  it("wrong number of values", () => {
    expect(problemsOf("move queen-bed 1")).toEqual(['line 1: "move" takes a piece, dx and dy, got 2 values']);
    expect(problemsOf("hide")).toEqual(['line 1: "hide" takes a piece, got 0 values']);
    expect(problemsOf("look a")[0]).toContain("a piece and a sprite");
    expect(problemsOf("dim 0.1 0.2")[0]).toContain("one number");
    expect(problemsOf("hide a b")[0]).toContain("got 2 values");
  });

  it("bad piece and sprite names", () => {
    expect(problemsOf("hide Queen-Bed")[0]).toContain('piece "Queen-Bed" must be lowercase');
    expect(problemsOf("hide 9lives")[0]).toContain("starting with a letter");
    expect(problemsOf("look a bed_unmade")[0]).toContain('sprite "bed_unmade"');
    expect(problemsOf(`hide ${"a".repeat(41)}`)[0]).toContain("must be lowercase");
  });

  it("bad numbers", () => {
    expect(problemsOf("move a x 0")[0]).toContain('dx "x" must be a whole number');
    expect(problemsOf("move a 1.5 0")[0]).toContain('dx "1.5"');
    expect(problemsOf("move a 0 --1")[0]).toContain('dy "--1"');
    expect(problemsOf("add s at 1e2 3")[0]).toContain('x "1e2"');
    expect(problemsOf("dim .5")[0]).toContain('dim ".5" must be a number');
    expect(problemsOf("dim -0.1")[0]).toContain("must be a number");
    expect(problemsOf("dim NaN")[0]).toContain("must be a number");
  });

  it("numbers out of range", () => {
    expect(problemsOf(`move a ${LIMITS.maxMove + 1} 0`)).toEqual([`line 1: dx ${LIMITS.maxMove + 1} is out of range (at most ${LIMITS.maxMove} either way)`]);
    expect(problemsOf(`move a 0 -${LIMITS.maxMove + 1}`)[0]).toContain("out of range");
    expect(problemsOf(`figure on a 0 ${LIMITS.maxMove + 1}`)[0]).toContain("out of range");
    expect(problemsOf(`add s at ${LIMITS.addX.max + 1} 0`)[0]).toContain("x 385 is out of range");
    expect(problemsOf(`add s at 0 ${LIMITS.addY.min - 1}`)[0]).toContain("y -65 is out of range");
    expect(problemsOf("dim 0.61")[0]).toContain("out of range (0 to 0.6)");
    expect(problemsOf("dim 1")[0]).toContain("out of range");
  });

  it("the filler words must be there", () => {
    expect(problemsOf("add s to 1 2")[0]).toContain('expected "at", got "to"');
    expect(problemsOf("figure at a 1 2")[0]).toContain('expected "on", got "at"');
    expect(problemsOf("add s 1 2")[0]).toContain("takes");
  });

  it("repeats are reported and the first one wins", () => {
    const { ops, problems } = parseConfig("move a 1 1\nmove a 2 2\nmove b 3 3\nhide a\nhide a\nlook a x\nlook a y\nfigure on a 0 0\nfigure on b 1 1\ndim 0.1\ndim 0.2");
    expect(problems).toEqual([
      'line 2: the move of "a" is already set; the later line is ignored',
      'line 5: hiding "a" is already set; the later line is ignored',
      'line 7: the look of "a" is already set; the later line is ignored',
      "line 9: the figure is already set; the later line is ignored",
      "line 11: dim is already set; the later line is ignored",
    ]);
    expect(ops.find((o) => o.kind === "move" && o.piece === "a")).toMatchObject({ dx: 1 });
    expect(ops.filter((o) => o.kind === "figure")).toHaveLength(1);
    expect(ops.find((o) => o.kind === "dim")).toMatchObject({ amount: 0.1 });
  });

  it("a bad line is skipped and the good ones around it still apply", () => {
    const { ops, problems } = parseConfig("hide a\nbogus\nhide b");
    expect(ops.map((o) => o.line)).toEqual([1, 3]);
    expect(problems).toHaveLength(1);
  });

  it("reports every bad line, in order", () => {
    expect(problemsOf("bogus\nhide\nmove a 999 0").map((p) => p.slice(0, 7))).toEqual(["line 1:", "line 2:", "line 3:"]);
  });

  it("a comment hides a bad command", () => {
    expect(problemsOf("# bogus\nhide a # move a x y")).toEqual([]);
  });
});

describe("parseConfig: limits", () => {
  it("refuses a file that is too long, without parsing it", () => {
    const text = "hide a\n".repeat(2000);
    const { ops, problems } = parseConfig(text);
    expect(ops).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("file is too long");
  });

  it("ignores lines past the line limit and says so once", () => {
    const text = "# c\n".repeat(LIMITS.maxLines) + "hide a\n" + "hide b";
    const { ops, problems } = parseConfig(text);
    expect(ops).toEqual([]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("too many lines");
  });

  it("skips a line that is too long", () => {
    const { ops, problems } = parseConfig(`# ${"x".repeat(LIMITS.maxLineChars)}\nhide a`);
    expect(ops).toHaveLength(1);
    expect(problems).toEqual([`line 1: too long (at most ${LIMITS.maxLineChars} characters)`]);
  });

  it("stops at the command limit and says so once", () => {
    const text = Array.from({ length: LIMITS.maxOps + 5 }, (_, i) => `hide p${"abcdefghij"[i % 10]}${"abcdefghij"[Math.floor(i / 10) % 10]}`).join("\n");
    const { ops, problems } = parseConfig(text);
    expect(ops).toHaveLength(LIMITS.maxOps);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("too many commands");
  });

  it("never throws on odd input", () => {
    for (const text of ["\0", "‮", "hide é", "move a 1 1 1 1 1", "#", "   ", "add", "figure", "dim ", "a".repeat(5000)]) {
      expect(() => parseConfig(text)).not.toThrow();
    }
  });
});
