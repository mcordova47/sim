import { describe, expect, it } from "vitest";
import { unsupportedChars } from "../render/font";
import { APARTMENT } from "./apartment";
import { PARTICLES } from "./config";
import { Decor, fits, validateDecorData } from "./decor";
import { DECOR_DATA, DECOR_ITEMS, DECOR_SLOTS, FURNITURE_ITEMS, GIFT_ITEMS, NOTE_MAX } from "./decor-data";
import { itemPool, drawLineAd } from "./encounter-draw";
import { LINES } from "./encounter-lines";
import { CHECKPOINTS } from "./delivery-checkpoints";
const sources = import.meta.glob("/art/src/*.sprite", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const spriteFiles = import.meta.glob("/public/sprites/*.png", { query: "?url" });
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

const IDS = ["crate", "wire", "cabinet", "lidded", "suitcase-pink", "suitcase-teal"].map((k) => `furniture-record-stand-${k}`);

describe("the six record stands (Marc picked all of them)", () => {
  it("are real furniture items for the slot, each with a 16x16 sprite, a plain name, a note and a source, and no checkpoint", () => {
    expect(FURNITURE_ITEMS.map((i) => i.id)).toEqual(IDS);
    for (const i of FURNITURE_ITEMS) {
      expect(i).toMatchObject({ kind: "furniture", w: 16, h: 16, from: "A PACKAGE", slots: ["furniture-record-stand"] });
      expect(fits(slot, i), i.id).toBe(true);
      expect(i.note!.length, i.id).toBeLessThanOrEqual(NOTE_MAX);
      expect(unsupportedChars(i.name + i.note!), i.id).toEqual([]);
      expect(i.tags).toBeUndefined();
      const src = sources[`/art/src/${i.sprite}.sprite`];
      expect(`/public/sprites/${i.sprite}.png` in spriteFiles, i.sprite).toBe(true);
      expect(/^size: 16x16$/m.test(src), i.sprite).toBe(true);
      expect(GIFT_ITEMS.includes(i)).toBe(false);
      expect(JSON.stringify(CHECKPOINTS).includes(i.id), i.id).toBe(false);
    }
    expect(new Set(FURNITURE_ITEMS.map((i) => i.name)).size).toBe(6);
    expect(new Set(FURNITURE_ITEMS.map((i) => i.sprite)).size).toBe(6);
  });

  it("are not owned in a fresh game, each swaps in through the slot, and the old stand goes to the inventory and comes back", () => {
    expect(IDS.some((id) => new Decor().owns(id))).toBe(false);
    for (const id of IDS) {
      const d = new Decor();
      d.own(id);
      expect(d.canChange("furniture-record-stand"), id).toBe(true);
      d.place("furniture-record-stand", id);
      expect(d.heldIn("furniture-record-stand")?.id).toBe(id);
      expect(d.inventory().map((i) => i.id)).toContain("furniture-record-stand-old");
      const again = new Decor();
      again.load(JSON.parse(JSON.stringify(d.toJSON())));
      expect(again.heldIn("furniture-record-stand")?.id, id).toBe(id);
    }
  });

  it("join the random-encounter pool through a furniture shop, which can show every one of them", () => {
    const pool = itemPool(DECOR_DATA.items);
    expect(pool.filter((i) => i.kind === "furniture").map((i) => i.id)).toEqual(IDS);
    const line = LINES.find((l) => l.kinds.includes("furniture"))!;
    expect(line.id).toBe("line-furniture");
    const ad = drawLineAd(line, { items: pool, has: () => false }, () => 0)!;
    expect(IDS).toContain(ad.item);
    expect(ad.headline).toContain("RECORD");
  });
});
