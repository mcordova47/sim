import { describe, expect, it } from "vitest";
import { GLYPHS } from "../render/font";
import { HUD_BOX, placeLabel, type Box } from "../render/layout";
import { progressSize, promptSize } from "../render/world-ui";
import { APARTMENT_LEVEL } from "./apartment";
import { DEFAULT_TASK_COOLDOWN, VIEW } from "./config";
import { TASKS } from "./tasks";

// Checks that the real task text works with the UI that draws it. When a new
// task or a longer name breaks one of these, the failure says which task.

describe("task text and the pixel font", () => {
  it("only uses characters the font can draw, in names, prompts and flavor", () => {
    const problems: string[] = [];
    for (const task of TASKS) {
      for (const [field, text] of Object.entries({
        name: task.name,
        prompt: task.prompt,
        flavor: task.flavor,
      })) {
        for (const ch of text.toUpperCase()) {
          if (ch !== " " && !GLYPHS[ch]) problems.push(`${task.id}.${field}: "${ch}"`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("task labels and the HUD", () => {
  // Wider than this and a label can't fit on screen at all. Labels wider than
  // the space beside the HUD (about 164px) are fine: placeLabel puts them under it.
  const screenFit = VIEW.width - 4;
  const overlaps = (a: Box, b: Box) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const labels = APARTMENT_LEVEL.interactables.flatMap((item) => [
    { what: `${item.id} prompt`, ...promptSize(item, 0) },
    { what: `${item.id} cooling down`, ...promptSize(item, DEFAULT_TASK_COOLDOWN) },
    { what: `${item.id} progress`, ...progressSize(item) },
  ]);

  it("keeps every real label narrow enough to fit on screen", () => {
    const tooWide = labels.filter((l) => l.w > screenFit).map((l) => `${l.what} (${l.w}px)`);
    expect(tooWide, `limit is ${screenFit}px`).toEqual([]);
  });

  it("includes labels too wide to sit beside the HUD, so the sweep below covers that case", () => {
    const beside = VIEW.width - HUD_BOX.w - 4;
    expect(labels.some((l) => l.w > beside)).toBe(true);
  });

  it("never puts a real label on the HUD, wherever the player is", () => {
    for (const label of labels) {
      for (let x = 0; x <= VIEW.width; x += 16) {
        for (let top = 0; top <= VIEW.height - 14; top += 8) {
          const box = placeLabel({ x, top, bottom: top + 14 }, label, VIEW);
          expect(overlaps(box, HUD_BOX), `${label.what} x=${x} top=${top}`).toBe(false);
        }
      }
    }
  });
});
