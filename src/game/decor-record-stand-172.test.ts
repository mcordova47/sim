import { describe, expect, it } from "vitest";
import { unsupportedChars } from "../render/font";
import { APARTMENT } from "./apartment";
import { PARTICLES } from "./config";
import { Decor, fits, validateDecorData } from "./decor";
import { DECOR_DATA, DECOR_ITEMS, DECOR_SLOTS, NOTE_MAX } from "./decor-data";
import { taskSpots } from "./plan-checks";
import { TASKS } from "./tasks";

// Issue 172: the record stand is the first furniture slot (kind `furniture`). The piece keeps its name and sprite name,
// so the record-play task, the notes emitter (found by sprite name) and the solids are what they were.

const main = APARTMENT.rooms.main;
const slot = DECOR_SLOTS.find((s) => s.id === "furniture-record-stand")!;
const stand = () => main.pieces.find((p) => p.sprite === "record-stand")!;

describe("the record stand slot", () => {
  it("is 16x16 where the stand is, on the piece named record stand, with the current stand as its owned default", () => {
    expect(slot).toMatchObject({ room: "main", area: { x: 144, y: 112, w: 16, h: 16 }, kinds: ["furniture"], object: "record stand", default: "furniture-record-stand-old" });
    expect(stand().bounds).toMatchObject({ x: 144, y: 112, w: 16, h: 16 });
    expect(() => validateDecorData(DECOR_DATA)).not.toThrow();
    expect(() => new Decor().checkLevel(main)).not.toThrow();
    expect(new Decor().swapProblems(main)).toEqual([]);
    const old = DECOR_ITEMS.find((i) => i.id === "furniture-record-stand-old")!;
    expect(old).toMatchObject({ kind: "furniture", sprite: "record-stand", how: "start" });
    expect(fits(slot, old)).toBe(true);
    expect(old.note!.length).toBeLessThanOrEqual(NOTE_MAX);
    expect(unsupportedChars(old.note! + old.name)).toEqual([]);
    const d = new Decor();
    expect(d.heldIn("furniture-record-stand")?.id).toBe(old.id);
    expect(d.owns(old.id)).toBe(true);
    expect(d.canChange("furniture-record-stand")).toBe(false); // a fresh game has no new prompt
  });

  it("keeps record-play, the sprite name the emitter looks for, and the solids", () => {
    const piece = stand();
    expect(piece.name).toBe("record stand");
    expect(main.interactables.find((i) => i.id === "record-play")).toBeTruthy();
    expect(taskSpots(main).some((s) => s.id === "record-play")).toBe(true);
    expect(taskSpots(main).some((s) => s.id === "swap-furniture-record-stand")).toBe(true);
    const emitters = PARTICLES.ambientEmitters.filter((e) => e.emitter.at.from === "piece" && e.emitter.at.sprite === "record-stand");
    expect(emitters.length).toBe(1);
  });

  it("is changed with 'Change record stand', and the old stand goes to the inventory (placeholder only, never owned in play)", () => {
    expect(TASKS.find((t) => t.id === "swap-furniture-record-stand")).toMatchObject({ prompt: "Change record stand", name: "Change record stand" });
    const d = new Decor();
    d.own("furniture-test-stand");
    expect(d.canChange("furniture-record-stand")).toBe(true);
    d.place("furniture-record-stand", "furniture-test-stand");
    expect(d.heldIn("furniture-record-stand")?.id).toBe("furniture-test-stand");
    expect(d.inventory().map((i) => i.id)).toContain("furniture-record-stand-old");
    d.place("furniture-record-stand", "furniture-record-stand-old");
    expect(d.inventory().map((i) => i.id)).not.toContain("furniture-record-stand-old");
    // The slot is never emptied, and the piece still has its name after a swap.
    expect(d.canBeEmpty("furniture-record-stand")).toBe(false);
    expect(stand().sprite).toBe("record-stand");
  });

  it("the placeholder is a test item: not owned in a fresh game, named TEST, and fits only this slot", () => {
    const t = DECOR_DATA.items.find((i) => i.id === "furniture-test-stand")!;
    expect(t.tags).toContain("test");
    expect(t.name).toMatch(/^TEST /);
    expect(new Decor().owns(t.id)).toBe(false);
    expect(t.slots).toEqual(["furniture-record-stand"]);
  });
});
