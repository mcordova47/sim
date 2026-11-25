import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../../input/controls";
import { drawText, textWidth } from "../../render/font";
import { setTouchHints } from "../../render/hints";
import { APARTMENT } from "../apartment";
import { DESKTOP_VIEW, NARROW_VIEW, VIEW, setView } from "../config";
import { Decor } from "../decor";
import { Game } from "../game";
import { OUTFITS, OUTFIT_SLOTS } from "../outfits";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import { ACHIEVEMENTS } from "./data";
import { OUTFITS_HINT, SYNC_HINT, THINGS_HINT, TRANSFER_HINT, drawList, listRows, pauseButtons } from "./draw";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./feature";
import { FakeStorage } from "./fake-storage";
import { drawOutfits, outfitSprite, outfitsHint, outfitsLayout, outfitsRows, listStart, type OutfitsView } from "./outfits-draw";
import { FACINGS, OutfitsPage } from "./outfits-page";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

const HOODIE = "outfit-casual-hoodie";
const CARDIGAN = "outfit-casual-cardigan";
const DENIM = "outfit-casual-denim-jacket";
const CASUAL = "outfit-casual";
const PJ = "outfit-pajamas";
const STRIPED = "outfit-pajamas-striped";
const ROBE = "outfit-pajamas-robe";
const OUT = "outfit-out";
const BLAZER = "outfit-out-blazer";
const ALL = OUTFITS.map((o) => `outfit-${o.id}`);

const decorWith = (...ids: string[]) => {
  const d = new Decor();
  ids.forEach((i) => d.own(i));
  return d;
};
const page = (d: Decor) => {
  const p = new OutfitsPage(d);
  p.open();
  return p;
};

afterEach(() => {
  setTouchHints(false);
  setView(DESKTOP_VIEW);
});

describe("the OUTFITS cursor", () => {
  it("opens on the slot you are wearing, in the slots column, facing down, on the outfit equipped there", () => {
    const d = decorWith(PJ, STRIPED);
    d.equip("pajamas", STRIPED);
    d.wearSlot("pajamas");
    const p = page(d);
    expect(p.slotDef.id).toBe("pajamas");
    expect(p.focus).toBe("slots");
    expect(p.facing).toBe(0);
    expect(p.choices().map((i) => i.id)).toEqual([PJ, STRIPED]);
    expect(p.row).toBe(1);
  });

  it("a fresh game opens on EVERYDAY with the home clothes as its only choice", () => {
    const p = page(new Decor());
    expect(p.slotDef.id).toBe("everyday");
    expect(p.choices().map((i) => i.id)).toEqual(["outfit-home"]);
    expect(p.row).toBe(0);
  });

  it("up and down pick a slot and wrap; each slot's list is only the owned outfits it takes, in OUTFITS order", () => {
    const d = decorWith(...ALL);
    const p = page(d);
    const seen: string[][] = [];
    for (let i = 0; i < OUTFIT_SLOTS.length; i++) {
      seen.push(p.choices().map((c) => c.id));
      p.key("ArrowDown");
    }
    expect(p.slot).toBe(0);
    expect(seen[0]).toEqual(["outfit-home", CASUAL, CARDIGAN, HOODIE, DENIM]);
    expect(seen[1]).toEqual([PJ, STRIPED]);
    expect(seen[2]).toEqual([ROBE]);
    expect(seen[3].slice(0, 2)).toEqual([OUT, "outfit-out-jacket-scarf"]);
    p.key("ArrowUp");
    expect(p.slotDef.id).toBe("out");
    p.key("KeyW");
    expect(p.slotDef.id).toBe("robe");
    p.key("KeyS");
    expect(p.slotDef.id).toBe("out");
  });

  it("a slot with nothing owned for it has an empty list you cannot enter, and its preview is what it would put on you", () => {
    const d = decorWith(PJ);
    const p = page(d);
    p.pickSlot(2);
    expect(p.choices()).toEqual([]);
    expect(p.key("ArrowRight")).toBe("handled");
    expect(p.focus).toBe("slots");
    expect(p.key("KeyE")).toBe("handled");
    expect(p.focus).toBe("slots");
    expect(p.noteItem()).toBeUndefined();
    expect(p.previewId()).toBe("outfit-home");
  });

  it("right or E go into the list on the equipped outfit; up and down move and wrap; left and Escape go back, Escape on the slots leaves", () => {
    const d = decorWith(HOODIE, CARDIGAN);
    d.equip("everyday", HOODIE);
    const p = page(d);
    p.key("KeyE");
    expect(p.focus).toBe("list");
    expect(p.row).toBe(p.choices().findIndex((c) => c.id === HOODIE));
    for (let i = 0; i < p.choices().length; i++) p.key("ArrowDown");
    expect(p.row).toBe(p.choices().findIndex((c) => c.id === HOODIE));
    p.key("ArrowUp");
    p.key("ArrowLeft");
    expect(p.focus).toBe("slots");
    p.key("ArrowRight");
    expect(p.key("Escape")).toBe("handled");
    expect(p.focus).toBe("slots");
    expect(p.key("Escape")).toBe("leave");
    expect(p.key("KeyZ")).toBe("ignored");
  });

  it("the preview follows the highlight and writes nothing; E equips and keeps the focus in the list", () => {
    const d = decorWith(HOODIE, CARDIGAN);
    const before = JSON.stringify(d.toJSON());
    const changed = vi.fn();
    d.onChange = changed;
    const p = page(d);
    p.key("ArrowRight");
    const choices = p.choices().map((c) => c.id);
    p.key("ArrowDown");
    expect(p.previewId()).toBe(choices[(choices.indexOf(d.equippedIn("everyday")!) + 1) % choices.length]);
    p.key("ArrowDown");
    p.key("ArrowUp");
    p.key("Tab");
    expect(changed).not.toHaveBeenCalled();
    expect(JSON.stringify(d.toJSON())).toBe(before);
    p.highlight(choices.indexOf(CARDIGAN));
    p.key("KeyE");
    expect(d.equippedIn("everyday")).toBe(CARDIGAN);
    expect(p.focus).toBe("list");
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("equipping the slot you are wearing changes your clothes at once; another slot does not", () => {
    const d = decorWith(HOODIE, CARDIGAN, PJ, STRIPED);
    d.equip("everyday", HOODIE);
    d.wearSlot("everyday");
    expect(d.slot("worn") && d.wornSlot()).toBe("everyday");
    const p = page(d);
    p.key("KeyE");
    p.highlight(p.choices().findIndex((c) => c.id === CARDIGAN));
    p.key("KeyE");
    expect(d.equippedIn("everyday")).toBe(CARDIGAN);
    expect(d.resolveOutfit("everyday")).toBe(CARDIGAN);
    expect(d.wornSlot()).toBe("everyday");
    p.key("Escape");
    p.pickSlot(1);
    p.key("KeyE");
    p.highlight(p.choices().findIndex((c) => c.id === STRIPED));
    p.key("KeyE");
    expect(d.equippedIn("pajamas")).toBe(STRIPED);
    expect(d.wornSlot()).toBe("everyday");
    expect(d.resolveOutfit("everyday")).toBe(CARDIGAN);
  });

  it("has no wear-now key: nothing on the page changes what you wear except equipping the worn slot", () => {
    const d = decorWith(HOODIE, PJ, STRIPED);
    d.equip("everyday", HOODIE);
    d.wearSlot("everyday");
    const p = page(d);
    for (const code of ["ArrowDown", "KeyE", "KeyW", "Enter", "Space", "KeyX", "KeyR", "Tab", "KeyQ"]) p.key(code);
    expect(d.wornSlot()).toBe("everyday");
  });

  it("Tab and Q turn through down, left, up, right and back; Shift goes backwards; it only ever changes the view", () => {
    const d = decorWith(HOODIE);
    const p = page(d);
    const seen = [FACINGS[p.facing]];
    for (let i = 0; i < 4; i++) {
      p.key(i % 2 === 0 ? "Tab" : "KeyQ");
      seen.push(FACINGS[p.facing]);
    }
    expect(seen).toEqual(["down", "left", "up", "right", "down"]);
    p.key("Tab", true);
    expect(FACINGS[p.facing]).toBe("right");
    p.open();
    expect(p.facing).toBe(0);
  });

  it("taps: a slot picks it, a row highlights and a second tap equips, the preview turns", () => {
    const d = decorWith(HOODIE, CARDIGAN);
    const p = page(d);
    p.pickSlot(0);
    p.tapRow(2);
    expect(p.focus).toBe("list");
    expect(p.row).toBe(2);
    expect(d.equippedIn("everyday")).not.toBe(p.choices()[2].id);
    p.tapRow(2);
    expect(d.equippedIn("everyday")).toBe(p.choices()[2].id);
    p.turn(1);
    expect(p.facing).toBe(1);
  });

  it("an old save, a fresh one and one that came in by the sync all read the same way", () => {
    const old = new Decor();
    old.load({ owned: [HOODIE], placed: { worn: HOODIE } });
    expect(page(old).choices().map((c) => c.id)).toContain(HOODIE);
    expect(old.equippedIn("everyday")).toBe(HOODIE);
    const other = decorWith(HOODIE, CARDIGAN, STRIPED);
    other.equip("everyday", CARDIGAN);
    other.equip("pajamas", STRIPED);
    const synced = new Decor();
    synced.load(JSON.parse(JSON.stringify(other.toJSON())));
    const p = page(synced);
    expect(synced.equippedIn("everyday")).toBe(CARDIGAN);
    expect(p.row).toBe(p.choices().findIndex((c) => c.id === CARDIGAN));
    p.pickSlot(1);
    expect(p.row).toBe(p.choices().findIndex((c) => c.id === STRIPED));
    // A stale save naming something not owned leaves the page working.
    const stale = new Decor();
    stale.load({ owned: [], placed: {}, outfits: { equipped: { everyday: DENIM, out: BLAZER } } });
    expect(page(stale).choices().map((c) => c.id)).toEqual(["outfit-home"]);
  });
});

describe("the note and the preview", () => {
  it("the bar shows the highlighted outfit's own note; on the slots, the equipped one's; nothing for an empty slot", () => {
    const d = decorWith(HOODIE);
    d.equip("everyday", HOODIE);
    const p = page(d);
    expect(p.noteItem()?.note).toBe(d.item(HOODIE)?.note);
    p.key("ArrowRight");
    p.highlight(0);
    expect(p.noteItem()?.id).toBe("outfit-home");
    p.key("Escape");
    p.pickSlot(3);
    expect(p.noteItem()).toBeUndefined();
  });

  it("every outfit has a sprite for each of the four facings", () => {
    for (const o of OUTFITS) for (let f = 0; f < 4; f++) expect(outfitSprite(`outfit-${o.id}`, f)).toBe(`${o.prefix}-idle-${FACINGS[f]}`);
    expect(outfitSprite("art-barn", 0)).toBeUndefined();
  });
});

describe.each([
  ["320 x 192", DESKTOP_VIEW],
  ["224 x 208", NARROW_VIEW],
])("the page at %s", (_name, view) => {
  const slotsFor = (d: Decor): OutfitsView["slots"] =>
    OUTFIT_SLOTS.map((s) => {
      const id = d.equippedIn(s.id);
      return { name: s.name, outfit: id === undefined ? undefined : d.item(id), worn: d.wornSlot() === s.id };
    });
  const viewOf = (d: Decor, p: OutfitsPage, touch: boolean): OutfitsView => ({
    focus: p.focus, slot: p.slot, row: p.row, facing: p.facing, slots: slotsFor(d), choices: p.choices(), equippedId: d.equippedIn(p.slotDef.id), note: p.noteItem()?.note, previewId: p.previewId(), touch,
  });
  const ctx = { fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, drawImage: () => {} } as unknown as CanvasRenderingContext2D;
  const inside = (r: { x: number; y: number; w: number; h: number }) => {
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(VIEW.width);
    expect(r.y + r.h).toBeLessThanOrEqual(VIEW.height);
  };
  const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it("draws the character at 4x and the four facings at 2x, each through whole-number scaling (the real drawer's draw ignores a size)", () => {
    setView(view);
    const calls: Array<{ name: string; into: { width: number; height: number } }> = [];
    const sprites = {
      has: () => true,
      draw: () => {
        throw new Error("draw would not scale");
      },
      drawRegion: (_c: unknown, name: string, from: { w: number; h: number }, into: { width: number; height: number }) => {
        expect(from).toMatchObject({ w: 16, h: 16 });
        calls.push({ name, into });
      },
    };
    const d = decorWith(HOODIE);
    const p = page(d);
    p.key("Tab");
    drawOutfits(ctx, { ...viewOf(d, p, false), sprites });
    const out = OUTFITS.find((o) => `outfit-${o.id}` === d.equippedIn("everyday"))!;
    expect(calls[0]).toEqual({ name: `${out.prefix}-idle-left`, into: { width: 64, height: 64 } });
    if (view === DESKTOP_VIEW) expect(calls.slice(1).map((c) => c.name)).toEqual(FACINGS.map((f) => `${out.prefix}-idle-${f}`));
    else expect(calls).toHaveLength(1);
    for (const c of calls.slice(1)) expect(c.into).toEqual({ width: 32, height: 32 });
  });

  it("every part is inside the picture and none overlap", () => {
    setView(view);
    const L = outfitsLayout();
    expect(L.narrow).toBe(view === NARROW_VIEW);
    const parts = [L.bar, ...L.slots, L.list, L.preview];
    parts.forEach(inside);
    inside(L.back);
    L.facings.forEach(inside);
    inside(L.char);
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlap(parts[i], parts[j])).toBe(false);
    expect(overlap(L.back, L.bar)).toBe(false);
    // The character at 4x and the facings sit inside the preview box.
    for (const r of [L.char, ...L.facings]) {
      expect(r.x).toBeGreaterThanOrEqual(L.preview.x);
      expect(r.x + r.w).toBeLessThanOrEqual(L.preview.x + L.preview.w);
      expect(r.y).toBeGreaterThanOrEqual(L.preview.y);
      expect(r.y + r.h).toBeLessThanOrEqual(L.preview.y + L.preview.h);
    }
    expect(L.char.w).toBe(64);
    expect(L.keysY).toBeGreaterThanOrEqual(L.preview.y + L.preview.h);
  });

  it("the phone's touch targets are tall enough to tap (14 px rows, 10 px at least elsewhere)", () => {
    setView(view);
    const L = outfitsLayout();
    if (L.narrow) {
      for (const s of L.slots) expect(s.h).toBeGreaterThanOrEqual(14);
      expect(L.rowH).toBe(14);
    }
    expect(L.rowH).toBeGreaterThanOrEqual(10);
  });

  it("every name, in every slot, with and without WORN, fits where it is drawn", () => {
    setView(view);
    for (const touch of [false, true]) {
      const d = decorWith(...ALL);
      const p = page(d);
      vi.mocked(drawText).mockClear();
      for (let s = 0; s < OUTFIT_SLOTS.length; s++) {
        p.pickSlot(s);
        for (const c of p.choices()) {
          d.equip(p.slotDef.id, c.id);
          drawOutfits(ctx, viewOf(d, p, touch));
        }
      }
      const L = outfitsLayout();
      // Nothing was cut: every outfit name is drawn whole in the slots and in the list.
      const drawn = vi.mocked(drawText).mock.calls.map((c) => String(c[1]));
      for (const o of OUTFITS) expect(drawn).toContain(o.name);
      for (const c of vi.mocked(drawText).mock.calls) {
        const text = String(c[1]);
        const x = Number(c[2]);
        const align = (c[4] as { align?: string } | undefined)?.align;
        const w = textWidth(text);
        const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + w).toBeLessThanOrEqual(VIEW.width);
      }
      void L;
    }
  });

  it("the page's text is the title, slot names, outfit names, WORN, the dash, the one note and the keys line: no count, no help text", () => {
    setView(view);
    const d = decorWith(HOODIE, CARDIGAN, PJ);
    const p = page(d);
    p.key("KeyE");
    vi.mocked(drawText).mockClear();
    drawOutfits(ctx, viewOf(d, p, false));
    const texts = vi.mocked(drawText).mock.calls.map((c) => String(c[1]));
    const allowed = new Set(["OUTFITS", "WORN", "-", outfitsHint(), ...OUTFIT_SLOTS.map((s) => s.name), ...OUTFITS.map((o) => o.name)]);
    const note = d.item(p.choices()[p.row].id)!.note!;
    for (const t of texts) expect(allowed.has(t) || note.startsWith(t) || t === "").toBe(true);
    expect(texts.filter((t) => /\d/.test(t))).toEqual([]);
  });

  it("scrolls a long list to keep the highlight in view, five rows at a time", () => {
    setView(view);
    expect(listStart(0, 13)).toBe(0);
    expect(listStart(12, 13)).toBe(8);
    expect(listStart(5, 6)).toBe(1);
    expect(listStart(3, 3)).toBe(0);
    const d = decorWith(...ALL);
    const p = page(d);
    p.key("KeyE");
    for (let i = 0; i < 4; i++) p.key("ArrowDown");
    const rows = outfitsRows(viewOf(d, p, true));
    expect(rows.length).toBe(5);
    expect(rows.map((r) => r.index)).toContain(p.row);
    for (const { rect } of rows) inside(rect);
  });
});

describe("the pause screen's desktop hint line with the fourth hint", () => {
  const ctx = { fillRect: () => {} } as unknown as CanvasRenderingContext2D;
  it("draws F: OUTFITS between THINGS and TRANSFER SAVE with readable gaps (the line is still drawn only while the rows leave it free, issue 178)", () => {
    setView(DESKTOP_VIEW);
    vi.mocked(drawText).mockClear();
    drawList(ctx, { achievements: ACHIEVEMENTS, unlocked: () => false, cursor: 0, message: null, adBlocker: false, voice: null, touch: false });
    const calls = vi.mocked(drawText).mock.calls.filter((c) => [SYNC_HINT, THINGS_HINT, OUTFITS_HINT, TRANSFER_HINT].includes(String(c[1])));
    expect(calls.map((c) => c[1])).toEqual([SYNC_HINT, THINGS_HINT, OUTFITS_HINT, TRANSFER_HINT]);
    for (let i = 1; i < calls.length; i++) expect(Number(calls[i][2]) - (Number(calls[i - 1][2]) + textWidth(String(calls[i - 1][1])))).toBeGreaterThanOrEqual(10);
    const last = calls[3];
    expect(Number(last[2]) + textWidth(String(last[1]))).toBeLessThanOrEqual(VIEW.width - 6 + 1);
  });
});

describe("the keys line", () => {
  it("names the keys on the desktop and the buttons on touch, dropping BACK where it does not fit", () => {
    expect(outfitsHint()).toBe("ARROWS: PICK   E: EQUIP   TAB: TURN   ESC: BACK");
    setTouchHints(true);
    setView(DESKTOP_VIEW);
    expect(outfitsHint()).toBe("PAD: PICK   A: EQUIP   CHOICE: TURN   B: BACK");
    setView(NARROW_VIEW);
    expect(outfitsHint()).toBe("PAD: PICK   A: EQUIP   CHOICE: TURN");
    expect(textWidth(outfitsHint())).toBeLessThanOrEqual(NARROW_VIEW.width - 12);
  });
});

class FakeTarget<E> implements Listenable<E> {
  listeners = new Map<string, ((e: E) => void)[]>();
  addEventListener(type: string, fn: (e: E) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  fire(type: string, e: E) {
    for (const fn of this.listeners.get(type) ?? []) fn(e);
  }
}

function setup() {
  const keys = new FakeTarget<KeyEventLike>();
  const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, state: new ApartmentState(STATE_VARS) });
  const feature = new AchievementsFeature(game, { storage: new FakeStorage(), keys });
  const press = (code: string, extra: Partial<KeyEventLike> = {}) => keys.fire("keydown", { code, ...extra });
  return { game, feature, press };
}
const pageOf = (f: AchievementsFeature) => (f as unknown as { page: string }).page;

describe("the OUTFITS page in the pause screen", () => {
  it("F opens it from the pause list and F or Escape comes back; L still closes the pause screen from it", () => {
    const s = setup();
    s.press("KeyL");
    s.press("KeyF");
    expect(pageOf(s.feature)).toBe("outfits");
    s.press("KeyF");
    expect(pageOf(s.feature)).toBe("list");
    s.press("KeyF");
    s.press("KeyE");
    s.press("Escape");
    expect(pageOf(s.feature)).toBe("outfits");
    s.press("Escape");
    expect(pageOf(s.feature)).toBe("list");
    s.press("KeyF");
    s.press("KeyL");
    expect(s.feature.listVisible).toBe(false);
    // Not on the pause list's other pages.
    s.press("KeyL");
    s.press("KeyT");
    s.press("KeyF");
    expect(pageOf(s.feature)).toBe("transfer");
  });

  it("equips through the game's Decor, saves the change at once, and the game puts the clothes on while paused", () => {
    const s = setup();
    s.game.decor.own(HOODIE);
    s.game.decor.own(CARDIGAN);
    s.game.decor.equip("everyday", HOODIE);
    s.game.decor.wearSlot("everyday");
    s.press("KeyL");
    s.press("KeyF");
    s.press("KeyE");
    const choices = s.game.decor.slotChoices("everyday").map((i) => i.id);
    for (let i = choices.indexOf(HOODIE); choices[i] !== CARDIGAN; i = (i + 1) % choices.length) s.press("ArrowDown");
    s.press("KeyE");
    expect(s.game.decor.equippedIn("everyday")).toBe(CARDIGAN);
    for (let t = 0; t < 3; t++) s.game.update(1 / 60, NO_INPUT);
    expect(s.game.state.get("outfit")).toBe(OUTFITS.findIndex((o) => `outfit-${o.id}` === CARDIGAN));
  });

  it("Tab turns the character and does not leave the page", () => {
    const s = setup();
    s.press("KeyL");
    s.press("KeyF");
    const prevent = vi.fn();
    s.press("Tab", { preventDefault: prevent });
    expect((s.feature as unknown as { outfits: OutfitsPage }).outfits.facing).toBe(1);
    expect(prevent).toHaveBeenCalled();
    expect(pageOf(s.feature)).toBe("outfits");
  });

  it("on touch, OUTFITS is a pause button in the cell PHOTOS left, and nothing else moved", () => {
    setTouchHints(true);
    const view = { achievements: [], unlocked: () => false, cursor: 0, message: null, adBlocker: false, voice: "DIALOG VOICE: BEEP", touch: true } as unknown as Parameters<typeof pauseButtons>[0];
    const b = pauseButtons(view);
    expect(b.map((x) => x.id)).toEqual(["adBlocker", "voice", "transfer", "sync", "things", "outfits", "reset", "close"]);
    const things = b.find((x) => x.id === "things")!.rect;
    const outfits = b.find((x) => x.id === "outfits")!.rect;
    expect(outfits.y).toBe(things.y);
    expect(outfits.x).toBeGreaterThan(things.x);
    expect(outfits.y + outfits.h).toBeLessThanOrEqual(89);
    for (const x of b) for (const y of b) if (x !== y) expect(x.rect.x < y.rect.x + y.rect.w && y.rect.x < x.rect.x + x.rect.w && x.rect.y < y.rect.y + y.rect.h && y.rect.y < x.rect.y + x.rect.h).toBe(false);
    void listRows;
  });

  it("on touch the buttons and taps work: OUTFITS opens it, a slot, a row (twice to equip), the preview and BACK", () => {
    const s = setup();
    setTouchHints(true);
    s.game.decor.own(HOODIE);
    s.game.decor.own(CARDIGAN);
    s.press("KeyL");
    const tap = (id: number) => s.game.tapTargets()[id];
    const outfitsButton = pauseButtons({ achievements: [], unlocked: () => false, cursor: 0, message: null, adBlocker: false, voice: null, touch: true } as unknown as Parameters<typeof pauseButtons>[0]).find((b) => b.id === "outfits")!;
    const open = s.game.tapTargets().find((t) => t.x === outfitsButton.rect.x && t.y === outfitsButton.rect.y)!;
    open.run();
    expect(pageOf(s.feature)).toBe("outfits");
    const L = outfitsLayout();
    const at = (r: { x: number; y: number }) => s.game.tapTargets().filter((t) => t.x === r.x && t.y === r.y);
    expect(at(L.slots[1])).toHaveLength(1);
    at(L.slots[1])[0].run();
    expect((s.feature as unknown as { outfits: OutfitsPage }).outfits.slot).toBe(1);
    at(L.slots[0])[0].run();
    const rows = s.game.tapTargets().filter((t) => t.x === L.list.x + 1 && t.y >= L.list.y);
    expect(rows.length).toBe(s.game.decor.slotChoices("everyday").length);
    const target = (s.feature as unknown as { outfits: OutfitsPage }).outfits;
    const want = s.game.decor.slotChoices("everyday").findIndex((i) => i.id === CARDIGAN);
    const row = () => s.game.tapTargets().filter((t) => t.x === L.list.x + 1 && t.y >= L.list.y)[want];
    row().run();
    expect(target.row).toBe(want);
    expect(s.game.decor.equippedIn("everyday")).not.toBe(CARDIGAN);
    row().run();
    expect(s.game.decor.equippedIn("everyday")).toBe(CARDIGAN);
    at(L.preview)[0].run();
    expect(target.facing).toBe(1);
    at(L.back)[0].run();
    expect(pageOf(s.feature)).toBe("list");
    void tap;
  });

  it("an old game with nothing but the starting clothes opens, shows one outfit and equips nothing new", () => {
    const s = setup();
    s.press("KeyL");
    s.press("KeyF");
    s.press("KeyE");
    s.press("KeyE");
    expect(s.game.decor.equippedIn("everyday")).toBe("outfit-home");
    expect(s.game.decor.slotChoices("everyday")).toHaveLength(1);
  });
});
