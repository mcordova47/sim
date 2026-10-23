import { describe, expect, it, vi } from "vitest";
import { VIEW } from "../game/config";
import type { Interactable } from "../game/interactable";
import { TASKS } from "../game/tasks";
import { drawText } from "./font";
import { promptSize, drawPrompt } from "./world-ui";

vi.mock("./font", async (original) => ({ ...(await original<typeof import("./font")>()), drawText: vi.fn() }));

// Issue 039: the prompt shows "<2/3>" when an object offers a choice.
const items = [...TASKS].map((t) => ({ ...t, zones: [] }) as Interactable);
const ctx = () => new Proxy({} as CanvasRenderingContext2D, { get: () => () => undefined, set: () => true });

describe("the choice indicator", () => {
  it("adds width only when there is more than one task", () => {
    const t = items[0];
    expect(promptSize(t, 0, null, false, false, { index: 0, count: 1 }).w).toBe(promptSize(t, 0).w);
    expect(promptSize(t, 0, null, false, false, null).w).toBe(promptSize(t, 0).w);
    expect(promptSize(t, 0, null, false, false, { index: 0, count: 3 }).w).toBeGreaterThan(promptSize(t, 0).w);
  });

  it("keeps the longest prompt on one line with the indicator and the good-hour hint", () => {
    for (const icon of [true, false]) {
      for (const t of items) {
        const w = promptSize(t, 0, null, true, icon, { index: 3, count: 5 }).w;
        expect(w, `${t.id} icon=${icon}`).toBeLessThan(VIEW.width - 8);
      }
    }
  });

  it("draws the position, and nothing extra without a choice", () => {
    const mock = vi.mocked(drawText);
    mock.mockClear();
    drawPrompt(ctx(), { x: 100, y: 100, w: 16, h: 16 }, items[0], 0, VIEW, [], null, false, undefined, { index: 1, count: 3 });
    expect(mock.mock.calls.map((c) => c[1])).toContain("<2/3>");
    mock.mockClear();
    drawPrompt(ctx(), { x: 100, y: 100, w: 16, h: 16 }, items[0], 0, VIEW);
    expect(mock.mock.calls.some((c) => String(c[1]).startsWith("<"))).toBe(false);
  });
});
