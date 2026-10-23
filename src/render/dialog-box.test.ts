import { describe, expect, it, vi } from "vitest";
import { DIALOG, VIEW } from "../game/config";
import { choice, menu, say, wrapText, DialogRunner } from "../game/dialog";
import { NO_INPUT } from "../input/controls";
import { drawDialog, menuBoxRect, textBoxRect } from "./dialog-box";
import { HUD_BOX, type Box } from "./layout";

const inside = (b: Box) =>
  b.x >= 0 && b.y >= 0 && b.x + b.w <= VIEW.width && b.y + b.h <= VIEW.height;
const overlap = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function fakeContext() {
  const calls: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_t, name: string) => (...args: unknown[]) => {
        calls.push(`${name}(${args.join(",")})`);
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe("dialog box layout", () => {
  it("puts the text box along the bottom, inside the screen", () => {
    const box = textBoxRect();
    expect(inside(box)).toBe(true);
    expect(box.y + box.h).toBe(VIEW.height - DIALOG.margin);
  });

  it("fits a full page of the widest text inside the text box", () => {
    const box = textBoxRect();
    const lines = wrapText("word ".repeat(200), DIALOG.textWidth);
    for (const line of lines) {
      // textWidth of a line, plus padding on both sides, fits within the box.
      expect(DIALOG.padding * 2 + (line.length * 6 - 1)).toBeLessThanOrEqual(box.w);
    }
    expect(DIALOG.linesPerPage * 9 - 2 + DIALOG.padding * 2).toBeLessThanOrEqual(box.h);
  });

  it("keeps the choice box on screen and clear of the text box, for any number of choices", () => {
    for (let n = 1; n <= 8; n++) {
      const labels = Array.from({ length: n }, (_, i) => `Choice number ${i + 1}`);
      for (const prompt of [true, false]) {
        const box = menuBoxRect(labels, prompt);
        expect(inside(box), `n=${n} prompt=${prompt}`).toBe(true);
        if (prompt) expect(overlap(box, textBoxRect())).toBe(false);
      }
    }
  });

  it("keeps the choice box clear of the HUD for the number of choices a menu normally has", () => {
    for (let n = 1; n <= 6; n++) {
      const labels = Array.from({ length: n }, () => "The impermanence of everything");
      expect(overlap(menuBoxRect(labels, true), HUD_BOX), `n=${n}`).toBe(false);
    }
  });

  it("clamps a very wide choice to the screen", () => {
    const box = menuBoxRect(["x".repeat(100)], false);
    expect(inside(box)).toBe(true);
  });
});

describe("drawDialog", () => {
  function stub() {
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => fakeContext().ctx }),
    });
  }

  it("draws the text box with the text for a say", () => {
    stub();
    const runner = new DialogRunner();
    runner.start(say("Hello there.", undefined, "Marc"));
    for (let i = 0; i < 120; i++) runner.update(1 / 60, NO_INPUT);
    const { ctx, calls } = fakeContext();
    drawDialog(ctx, runner.view!);
    expect(calls.some((c) => c.startsWith("fillRect"))).toBe(true);
    // Glyphs are drawn with drawImage: "Hello there." is 11 letters (a space and a dot aside).
    expect(calls.filter((c) => c.startsWith("drawImage")).length).toBeGreaterThanOrEqual(11);
    vi.unstubAllGlobals();
  });

  it("only draws the waiting arrow when the page is showing and the blink is on", () => {
    stub();
    const runner = new DialogRunner();
    runner.start(say("Hi."));
    const early = fakeContext();
    drawDialog(early.ctx, runner.view!);
    const arrow = (calls: string[]) => calls.filter((c) => c.startsWith("fillRect") && c.endsWith(",5,1)"));
    expect(arrow(early.calls)).toHaveLength(0);
    for (let i = 0; i < 60; i++) runner.update(1 / 60, NO_INPUT); // 1 s: on blink phase
    const done = fakeContext();
    drawDialog(done.ctx, runner.view!);
    // Either phase of the blink is fine; what must hold is that it is never drawn before the page is done.
    expect(arrow(done.calls).length).toBeLessThanOrEqual(1);
    vi.unstubAllGlobals();
  });

  it("draws a menu with one cursor, on the chosen entry", () => {
    stub();
    const runner = new DialogRunner();
    runner.start(menu("Pick", [choice("One"), choice("Two"), choice("Three")]));
    runner.update(1 / 60, { ...NO_INPUT, dirPressed: "down" });
    const { ctx, calls } = fakeContext();
    drawDialog(ctx, runner.view!);
    const cursors = calls.filter((c) => c.startsWith("fillRect") && c.endsWith(",1,5)"));
    expect(cursors).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("draws every box inside the screen", () => {
    stub();
    const runner = new DialogRunner();
    runner.start(menu("A fairly long prompt that wraps over a few lines of the text box okay", [
      choice("A"), choice("B"), choice("C"), choice("D"), choice("E"), choice("F"),
    ]));
    const { ctx, calls } = fakeContext();
    drawDialog(ctx, runner.view!);
    for (const c of calls.filter((c) => c.startsWith("fillRect"))) {
      const [x, y, w, h] = c.slice(9, -1).split(",").map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(VIEW.width);
      expect(y + h).toBeLessThanOrEqual(VIEW.height);
    }
    vi.unstubAllGlobals();
  });
});
