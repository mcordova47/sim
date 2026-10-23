import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { unsupportedChars, textWidth } from "../../render/font";
import { VIEW, TYPING } from "../config";
import { createActivity } from "../activity";
import type { Interactable } from "../interactable";
import { fakeHost } from "./fake-host";
import { SNIPPETS, TypingActivity, isTypingKey } from "./typing";

const dt = 1 / 60;
const keys = (...codes: string[]): Controls => ({ ...NO_INPUT, keys: codes });

const task = (activity: Interactable["activity"] = { type: "typing" }): Interactable => ({
  id: "work",
  name: "Work",
  prompt: "Work",
  duration: 0,
  points: 80,
  zones: [],
  activity,
});

// Types the whole thing at `perSecond` characters a second.
function typeAt(a: TypingActivity, perSecond: number) {
  const total = a.lines.reduce((n, l) => n + l.length, 0);
  const every = 1 / perSecond;
  let t = 0;
  let sent = 0;
  while (!a.done && t < 100) {
    t += dt;
    const due = Math.floor(t / every);
    const now = due - sent;
    sent = due;
    a.update(dt, keys(...Array(Math.max(0, Math.min(now, 5))).fill("KeyA")));
  }
  return { total, seconds: t };
}

describe("typing keys", () => {
  it("counts letters, digits, space and punctuation, and nothing else", () => {
    for (const code of ["KeyA", "KeyZ", "Digit0", "Space", "Comma", "Period", "Semicolon", "Quote", "Slash", "Minus"]) {
      expect(isTypingKey(code), code).toBe(true);
    }
    for (const code of ["Escape", "ArrowUp", "ArrowLeft", "Enter", "ShiftLeft", "Tab", "F5", "Backspace"]) {
      expect(isTypingKey(code), code).toBe(false);
    }
  });
});

describe("the lines of code", () => {
  it("only use characters the pixel font can draw, and fit across the screen", () => {
    for (const s of SNIPPETS) {
      expect(unsupportedChars(s), s).toEqual([]);
      expect(textWidth(s), s).toBeLessThanOrEqual(VIEW.width - 40);
    }
  });
});

describe("TypingActivity", () => {
  it("types one character per key press, whatever the key", () => {
    const a = new TypingActivity(["abcdef"]);
    a.update(dt, keys("KeyQ"));
    a.update(dt, keys("Digit1", "Space"));
    expect(a.typedCount).toBe(3);
    expect(a.progress).toBeCloseTo(0.5);
  });

  it("ignores keys that aren't typing", () => {
    const a = new TypingActivity(["abcdef"]);
    a.update(dt, keys("ArrowUp", "ShiftLeft", "Enter", "Tab"));
    a.update(dt, { ...NO_INPUT, dirPressed: "up", interactPressed: false });
    expect(a.typedCount).toBe(0);
  });

  it("counts the interact and cancel letters (E, X) as typing", () => {
    const a = new TypingActivity(["abcdef"]);
    a.update(dt, { ...NO_INPUT, keys: ["KeyE", "KeyX"], interactPressed: true, cancelPressed: true });
    expect(a.typedCount).toBe(2);
    expect(a.done).toBe(false);
  });

  it("finishes when the last character is typed, and never goes past it", () => {
    const a = new TypingActivity(["ab"]);
    a.update(dt, keys("KeyA", "KeyB", "KeyC", "KeyD"));
    expect(a.done).toBe(true);
    expect(a.typedCount).toBe(2);
    expect(a.result.completed).toBe(true);
  });

  it("is worth more the faster it is typed", () => {
    const quality = (cps: number) => {
      const a = new TypingActivity(["x".repeat(30)]);
      typeAt(a, cps);
      return a.result.quality!;
    };
    expect(quality(TYPING.fastCps + 5)).toBe(1);
    expect(quality(TYPING.slowCps - 1)).toBe(0);
    const mid = quality((TYPING.fastCps + TYPING.slowCps) / 2);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
    expect(quality(8)).toBeGreaterThan(quality(5));
    expect(quality(5)).toBeGreaterThan(quality(3.5));
  });

  it("ends with quality 0 if it takes too long, and still counts as done", () => {
    const a = new TypingActivity(["x".repeat(50)]);
    for (let i = 0; i < Math.ceil(TYPING.maxSeconds / dt) + 2; i++) a.update(dt, NO_INPUT);
    expect(a.done).toBe(true);
    expect(a.result).toEqual({ completed: true, quality: 0 });
  });

  it("can be backed out of, and does nothing once it is over", () => {
    const a = new TypingActivity(["abc"]);
    expect(a.cancellable).toBe(true);
    a.cancel();
    expect(a.result).toEqual({ completed: false });
    a.update(dt, keys("KeyA", "KeyB", "KeyC"));
    expect(a.typedCount).toBe(0);
    expect(a.result).toEqual({ completed: false });
  });
});

describe("making one from a task", () => {
  it("picks lines with the host's random numbers, the same way every time", () => {
    const lines = (seed: number) =>
      (createActivity(task({ type: "typing", lines: 3 }), fakeHost(seed).host) as TypingActivity).lines;
    expect(lines(7)).toEqual(lines(7));
    expect(lines(7)).toHaveLength(3);
    const many = new Set([1, 2, 3, 4, 5, 6].map((s) => lines(s).join("|")));
    expect(many.size).toBeGreaterThan(1);
    for (const line of lines(7)) expect(SNIPPETS).toContain(line);
  });

  it("uses the default number of lines", () => {
    const a = createActivity(task(), fakeHost().host) as TypingActivity;
    expect(a.lines).toHaveLength(TYPING.lines);
  });

  it("rejects a bad number of lines, naming the task", () => {
    for (const bad of [0, -1, 1.5, "x"]) {
      expect(() => createActivity(task({ type: "typing", lines: bad }), fakeHost().host)).toThrow(
        /Task "work": typing needs a whole number/,
      );
    }
  });
});

describe("drawing", () => {
  function recorder() {
    const calls: string[] = [];
    const ctx = new Proxy({}, { get: (_t, n: string) => (...a: unknown[]) => void calls.push(`${n}(${a.join(",")})`), set: () => true }) as unknown as CanvasRenderingContext2D;
    return { ctx, calls };
  }

  it("draws inside the screen, at the start, part way and done", () => {
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => recorder().ctx }) });
    for (const typed of [0, 5, 100]) {
      const a = new TypingActivity(["const energy = 0;", "return null;"]);
      for (let i = 0; i < typed && !a.done; i++) a.update(dt, keys("KeyA"));
      const { ctx, calls } = recorder();
      a.draw(ctx, VIEW);
      for (const c of calls.filter((c) => c.startsWith("fillRect"))) {
        const [x, y, w, h] = c.slice(9, -1).split(",").map(Number);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(VIEW.width);
        expect(y + h).toBeLessThanOrEqual(VIEW.height);
      }
    }
    vi.unstubAllGlobals();
  });
});
