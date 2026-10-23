import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { GLYPHS } from "../../render/font";
import { NOTES, VIEW } from "../config";
import { createActivity } from "../activity";
import type { Direction } from "../direction";
import type { Interactable } from "../interactable";
import { fakeHost } from "./fake-host";
import { ARROW, NotesActivity } from "./notes";

const dt = 1 / 60;
const press = (dir: Direction): Controls => ({ ...NO_INPUT, dir, dirPressed: dir });

const task = (activity: Interactable["activity"] = { type: "notes" }): Interactable => ({
  id: "guitar",
  name: "Guitar",
  prompt: "Guitar",
  duration: 0,
  points: 55,
  zones: [],
  activity,
});

const wait = (a: NotesActivity, seconds: number, controls: Controls = NO_INPUT) => {
  for (let i = 0; i < Math.round(seconds / dt); i++) a.update(dt, controls);
};
// Runs up to the moment the next note shows.
const untilNote = (a: NotesActivity) => {
  for (let i = 0; i < 600 && a.current === null && !a.done; i++) a.update(dt, NO_INPUT);
};

describe("NotesActivity", () => {
  it("waits a lead-in before the first note", () => {
    const a = new NotesActivity(["up", "left"]);
    expect(a.current).toBeNull();
    wait(a, NOTES.leadIn - 0.1);
    expect(a.current).toBeNull();
    wait(a, 0.2);
    expect(a.current).toBe("up");
  });

  it("scores a hit for the matching direction, and moves on after a short gap", () => {
    const a = new NotesActivity(["up", "left"]);
    untilNote(a);
    a.update(dt, press("up"));
    expect(a.outcomes[0]).toBe("hit");
    expect(a.current).toBeNull();
    untilNote(a);
    expect(a.current).toBe("left");
  });

  it("scores a miss for the wrong direction, and for running out of time", () => {
    const a = new NotesActivity(["up", "left", "down"]);
    untilNote(a);
    a.update(dt, press("right")); // wrong
    untilNote(a);
    wait(a, NOTES.window + 0.1); // never pressed
    expect(a.outcomes.slice(0, 2)).toEqual(["miss", "miss"]);
  });

  it("finishes with quality equal to the share of notes hit", () => {
    const seq: Direction[] = ["up", "down", "left", "right"];
    const a = new NotesActivity(seq);
    // Hit the first and third, miss the second and fourth.
    seq.forEach((dir, i) => {
      untilNote(a);
      a.update(dt, press(i % 2 === 0 ? dir : dir === "up" ? "down" : "up"));
    });
    expect(a.done).toBe(true);
    expect(a.result).toEqual({ completed: true, quality: 0.5 });
  });

  it("gives full quality for all hits and zero for all misses, and always completes", () => {
    const hit = new NotesActivity(["up", "up"]);
    for (let i = 0; i < 2; i++) {
      untilNote(hit);
      hit.update(dt, press("up"));
    }
    expect(hit.result).toEqual({ completed: true, quality: 1 });

    const miss = new NotesActivity(["up", "up"]);
    wait(miss, 20);
    expect(miss.done).toBe(true);
    expect(miss.result).toEqual({ completed: true, quality: 0 });
  });

  it("needs a fresh key press: holding a direction does nothing", () => {
    const a = new NotesActivity(["up"]);
    untilNote(a);
    a.update(dt, { ...NO_INPUT, dir: "up", dirPressed: null });
    expect(a.outcomes[0]).toBeNull();
    expect(a.current).toBe("up");
  });

  it("ignores everything else while a note is not showing", () => {
    const a = new NotesActivity(["up"]);
    a.update(dt, press("up")); // in the lead-in
    expect(a.outcomes[0]).toBeNull();
  });

  it("counts down the time a note has left, for the bar", () => {
    const a = new NotesActivity(["up"]);
    untilNote(a);
    expect(a.timeLeft).toBeGreaterThan(0.9);
    wait(a, NOTES.window / 2);
    expect(a.timeLeft).toBeGreaterThan(0.4);
    expect(a.timeLeft).toBeLessThan(0.6);
  });

  it("reports progress as the share of notes played", () => {
    const a = new NotesActivity(["up", "up", "up", "up"]);
    untilNote(a);
    a.update(dt, press("up"));
    expect(a.progress).toBe(0.25);
  });

  it("is over at once with no notes", () => {
    expect(new NotesActivity([]).done).toBe(true);
  });

  it("isn't something you can back out of with Escape (it is short)", () => {
    expect(new NotesActivity(["up"]).cancellable).toBe(false);
  });

  it("has a character for every direction in the pixel font", () => {
    for (const dir of ["up", "down", "left", "right"] as const) {
      expect(GLYPHS[ARROW[dir]], dir).toBeDefined();
    }
  });
});

describe("making one from a task", () => {
  const sequence = (seed: number, count?: number) =>
    (createActivity(task(count ? { type: "notes", count } : { type: "notes" }), fakeHost(seed).host) as NotesActivity).sequence;

  it("picks the notes with the host's random numbers, the same way every time", () => {
    expect(sequence(3)).toEqual(sequence(3));
    expect(sequence(3)).toHaveLength(NOTES.count);
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => sequence(s).join(""))).size).toBeGreaterThan(1);
    expect(sequence(3, 10)).toHaveLength(10);
  });

  it("uses all four directions over a long run", () => {
    expect(new Set([1, 2, 3, 4, 5, 6].flatMap((s) => sequence(s, NOTES.maxCount))).size).toBe(4);
  });

  it("rejects a bad count, naming the task", () => {
    for (const bad of [0, -2, 2.5, "x"]) {
      expect(() => createActivity(task({ type: "notes", count: bad }), fakeHost().host)).toThrow(
        /Task "guitar": notes needs a whole number/,
      );
    }
  });
});

describe("drawing", () => {
  it("stays inside the screen in every state", () => {
    const record = () => {
      const calls: string[] = [];
      const ctx = new Proxy({}, { get: (_t, n: string) => (...a: unknown[]) => void calls.push(`${n}(${a.join(",")})`), set: () => true }) as unknown as CanvasRenderingContext2D;
      return { ctx, calls };
    };
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => record().ctx }) });
    for (const count of [1, 6, 12]) {
      const a = new NotesActivity(Array.from({ length: count }, () => "up" as Direction));
      for (const step of [0, 40, 120, 400]) {
        for (let i = 0; i < step && !a.done; i++) a.update(dt, i % 50 === 0 ? press("up") : NO_INPUT);
        const { ctx, calls } = record();
        a.draw(ctx, VIEW);
        for (const c of calls.filter((c) => c.startsWith("fillRect"))) {
          const [x, y, w, h] = c.slice(9, -1).split(",").map(Number);
          expect(x, `${count}/${step}`).toBeGreaterThanOrEqual(0);
          expect(x + w, `${count}/${step}`).toBeLessThanOrEqual(VIEW.width);
          expect(y + h, `${count}/${step}`).toBeLessThanOrEqual(VIEW.height);
        }
      }
    }
    vi.unstubAllGlobals();
  });
});
