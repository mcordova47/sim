import { describe, expect, it } from "vitest";
import { unsupportedChars, textWidth } from "../render/font";
import { menuBoxRect } from "../render/dialog-box";
import { DIALOG } from "./config";
import type { DialogNode } from "./dialog";
import { CONTEMPLATE } from "./dialog-data";
import { APARTMENT } from "./apartment";
import { PLACEHOLDER_LEVEL } from "./placeholder-level";
import { TASKS } from "./tasks";
import { wrapText } from "./dialog";

// Walks every node reachable from `root`, once each (dialogs may loop back).
function nodes(root: DialogNode): DialogNode[] {
  const seen = new Set<DialogNode>();
  const queue = [root];
  while (queue.length) {
    const node = queue.pop()!;
    if (seen.has(node)) continue;
    seen.add(node);
    if (node.type === "say" && node.next) queue.push(node.next);
    if (node.type === "menu") for (const c of node.choices) if (c.next) queue.push(c.next);
  }
  return [...seen];
}

// Every dialog in the game: the contemplate menu and any a task carries.
const roots: DialogNode[] = [
  CONTEMPLATE,
  ...PLACEHOLDER_LEVEL.interactables.flatMap((i) => (i.dialog ? [i.dialog] : [])),
  // And every dialog a task in the real apartment carries.
  ...Object.values(APARTMENT.rooms).flatMap((room) =>
    room.interactables.flatMap((i) => (i.dialog ? [i.dialog] : [])),
  ),
  ...TASKS.flatMap((t) => (t.dialog ? [t.dialog] : [])),
];
const all = [...new Set(roots.flatMap(nodes))];

describe("the dialog data", () => {
  it("is found: the contemplate menu is reachable from a task in the placeholder room and in the real apartment", () => {
    expect(PLACEHOLDER_LEVEL.interactables.some((i) => i.dialog === CONTEMPLATE)).toBe(true);
    const real = Object.values(APARTMENT.rooms).flatMap((r) => r.interactables);
    expect(real.some((i) => i.dialog === CONTEMPLATE)).toBe(true);
    expect(all.length).toBeGreaterThan(5);
  });

  it("only uses characters the pixel font can draw", () => {
    const problems: string[] = [];
    for (const node of all) {
      const texts =
        node.type === "say"
          ? [node.text, node.speaker ?? ""]
          : [node.prompt ?? "", ...node.choices.map((c) => c.label)];
      for (const t of texts) {
        const bad = unsupportedChars(t);
        if (bad.length) problems.push(`"${t.slice(0, 40)}": ${bad.join(" ")}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("keeps every menu small enough to show, and every label short enough to fit", () => {
    for (const node of all) {
      if (node.type !== "menu") continue;
      const labels = node.choices.map((c) => c.label);
      expect(labels.length, node.prompt).toBeLessThanOrEqual(8);
      const box = menuBoxRect(labels, !!node.prompt);
      expect(box.x, node.prompt).toBeGreaterThanOrEqual(0);
      expect(box.y, node.prompt).toBeGreaterThanOrEqual(0);
      for (const l of labels) {
        // The label fits inside the choice box, next to the cursor, uncut.
        expect(textWidth(l) + 8 + DIALOG.padding * 2, l).toBeLessThanOrEqual(box.w);
      }
    }
  });

  it("keeps every reply to a few pages", () => {
    for (const node of all) {
      if (node.type !== "say") continue;
      const pages = Math.ceil(wrapText(node.text, DIALOG.textWidth).length / DIALOG.linesPerPage);
      expect(pages, node.text.slice(0, 30)).toBeLessThanOrEqual(4);
    }
  });
});
