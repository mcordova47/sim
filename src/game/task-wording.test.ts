import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS } from "./achievements/data";
import { Decor } from "./decor";
import { NARROW_VIEW } from "./config";
import { DECOR_DATA } from "./decor-data";
import type { Interactable } from "./interactable";
import { promptSize } from "../render/world-ui";
import { SWAP_PROMPT, TASKS } from "./tasks";

// Issue 174: task names and prompts are short and never say "the" ("Water plant", "Change coffee gear").
// It saves space on the narrow phone view and reads like a button.

const THE = /(^|\s)the(\s|$)/i;

describe("task wording (issue 174)", () => {
  it("no task name or prompt contains the word 'the'", () => {
    const bad = TASKS.flatMap((t) => [t.name, t.prompt].filter((s) => THE.test(s)).map((s) => `${t.id}: ${s}`));
    expect(bad).toEqual([]);
  });

  it("no swap prompt contains 'the'", () => {
    const bad = Object.entries(SWAP_PROMPT).filter(([, p]) => THE.test(p!));
    expect(bad).toEqual([]);
  });

  it("no item word that replaces part of a name contains 'the'", () => {
    expect(DECOR_DATA.items.filter((i) => i.taskName && THE.test(i.taskName)).map((i) => i.id)).toEqual([]);
  });

  it("the names a task shows with each item in its slot have no 'the' either", () => {
    const bad: string[] = [];
    for (const item of DECOR_DATA.items.filter((i) => i.taskName)) {
      for (const t of TASKS.filter((x) => x.itemWord)) {
        const slot = t.liveSlot ?? t.heldSlot;
        if (!slot || !DECOR_DATA.slots.find((s) => s.id === slot)?.kinds.includes(item.kind)) continue;
        const d = new Decor();
        d.own(item.id);
        d.place(slot, item.id);
        for (const s of [d.taskName(t), d.taskPrompt(t)]) if (THE.test(s)) bad.push(`${t.id} with ${item.id}: ${s}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("achievements that name a task use its new wording", () => {
    const text = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!.description;
    expect(text("dishes-3")).toBe("Do dishes three times.");
    expect(text("bed-3")).toBe("Make bed three times.");
    expect(text("plant-3")).toBe("Water plant three times.");
  });

  it("the narrow phone view's prompt box fits every prompt, with each item's word, ready (key, choice and good-hour icon) or cooling down", () => {
    const widest = { text: "", w: 0 };
    const check = (t: (typeof TASKS)[number], prompt: string) => {
      const item = { ...t, prompt, zones: [] } as unknown as Interactable;
      // Ready: the key, a choice hint (not for the plant tasks, which are offered one at a time) and the good-hour icon.
      // Cooling down: the greyed prompt with a count, and neither hint.
      const ready = promptSize(item, 0, null, !!t.goodHours, true, t.exclusive ? null : { index: 3, count: 5 }).w;
      const cooling = promptSize(item, 88).w;
      for (const w of [ready, cooling]) {
        if (w > widest.w) Object.assign(widest, { text: prompt, w });
        expect(w, `${t.id}: ${prompt}`).toBeLessThanOrEqual(NARROW_VIEW.width - 8);
      }
    };
    for (const t of TASKS) {
      check(t, t.prompt);
      for (const item of DECOR_DATA.items.filter((i) => i.taskName && t.itemWord)) {
        const slot = t.liveSlot ?? t.heldSlot;
        if (!slot || !DECOR_DATA.slots.find((s) => s.id === slot)?.kinds.includes(item.kind)) continue;
        const d = new Decor();
        d.own(item.id);
        d.place(slot, item.id);
        check(t, d.taskPrompt(t));
      }
    }
    expect(widest.w).toBeGreaterThan(0);
  });
});
