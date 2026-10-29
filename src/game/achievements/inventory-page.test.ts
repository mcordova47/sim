import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../../input/controls";
import { drawText, textWidth, unsupportedChars } from "../../render/font";
import { setTouchHints } from "../../render/hints";
import { APARTMENT } from "../apartment";
import { DESKTOP_VIEW, NARROW_VIEW, VIEW, setView } from "../config";
import { Decor } from "../decor";
import { DECOR_DATA, isTestItem } from "../decor-data";
import { Game } from "../game";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import { drawList, pauseButtons } from "./draw";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./feature";
import { FakeStorage } from "./fake-storage";
import { drawThings, entryLayout, moveThingsCursor, thingsBox, thingsButtons, thingsCells, thingsGrid, thingsPages, type ThingsView } from "./inventory-draw";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

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
  const press = (code: string) => keys.fire("keydown", { code });
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) game.update(1 / 60, NO_INPUT);
  };
  return { game, feature, press, run };
}

const realIds = DECOR_DATA.items.filter((i) => !isTestItem(i)).map((i) => i.id);
const ownEverything = (game: Game) => realIds.forEach((id) => game.decor.own(id));
const state = (feature: AchievementsFeature) => feature as unknown as { thingsCursor: number; page: string; thingsView(): ThingsView };
const ctx = { fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, drawImage: () => {} } as unknown as CanvasRenderingContext2D;
const texts = () => vi.mocked(drawText).mock.calls.map((c) => String(c[1]));

afterEach(() => {
  setTouchHints(false);
  setView(DESKTOP_VIEW);
});

describe.each([
  ["320 x 192", DESKTOP_VIEW],
  ["224 x 208", NARROW_VIEW],
])("the THINGS page at %s", (_name, view) => {
  const entriesOf = (everything: boolean) => {
    const decor = new Decor();
    if (everything) realIds.forEach((id) => decor.own(id));
    return decor.entries();
  };

  it("lays out inside the picture: cells on a grid, buttons, the box, and no overlap with the box", () => {
    setView(view);
    for (const touch of [false, true]) {
      const entries = entriesOf(true);
      const g = thingsGrid();
      expect(g.cols).toBe(view === DESKTOP_VIEW ? 5 : 4);
      for (let cursor = 0; cursor < entries.length; cursor += g.perPage) {
        const v = { entries, cursor, touch };
        const box = thingsBox();
        for (const { rect } of thingsCells(v)) {
          expect(rect.x).toBeGreaterThanOrEqual(0);
          expect(rect.x + rect.w).toBeLessThanOrEqual(VIEW.width);
          expect(rect.h).toBeGreaterThanOrEqual(24);
          expect(rect.y + rect.h).toBeLessThanOrEqual(box.y);
        }
        for (const b of thingsButtons(v)) {
          expect(b.rect.x).toBeGreaterThanOrEqual(0);
          expect(b.rect.x + b.rect.w).toBeLessThanOrEqual(VIEW.width);
          expect(b.rect.y + b.rect.h).toBeLessThanOrEqual(thingsCells(v)[0].rect.y);
          expect(textWidth(b.label)).toBeLessThanOrEqual(b.rect.w - 4);
        }
        expect(box.y + box.h).toBeLessThan(VIEW.height - 9);
      }
    }
  });

  it("every entry of everything fits its box: text inside the box, left of the sprite where it overlaps, uses the font", () => {
    setView(view);
    const box = thingsBox();
    for (const e of entriesOf(true)) {
      const { sprite, lines, bottom } = entryLayout(e);
      expect(sprite.x + sprite.w).toBeLessThanOrEqual(box.x + box.w);
      expect(sprite.y + sprite.h).toBeLessThanOrEqual(box.y + box.h);
      expect(bottom, e.item.id).toBeLessThanOrEqual(box.y + box.h);
      for (const l of lines) {
        expect(unsupportedChars(l.text), l.text).toEqual([]);
        expect(l.x + textWidth(l.text), l.text).toBeLessThanOrEqual(box.x + box.w - 3);
        if (l.y < sprite.y + sprite.h) expect(l.x + textWidth(l.text), l.text).toBeLessThanOrEqual(sprite.x - 3);
      }
      const joined = lines.map((l) => l.text).join(" ");
      for (const part of [e.item.name, e.item.note ?? "", e.from, e.where, e.changeAt ?? ""]) expect(joined.replace(/ +/g, " ")).toContain(part.slice(0, 8));
    }
  });

  it("draws one entry's name, line, source, where and change line, and no count, total or progress", () => {
    setView(view);
    const entries = entriesOf(true);
    for (const touch of [false, true]) {
      for (let cursor = 0; cursor < entries.length; cursor += 3) {
        vi.mocked(drawText).mockClear();
        drawThings(ctx, { entries, cursor, touch });
        const all = texts().join("\n");
        expect(all).toContain("THINGS");
        expect(all).not.toMatch(/TOTAL|COMPLETE|MISSING|OWN(ED)?\b|LEFT|NEW\b|COLLECT|ALL \d|%/);
        const nums = texts().filter((t) => /\d/.test(t));
        for (const t of nums) expect(t, t).toMatch(/^PAGE \d+\/\d+$/);
      }
    }
  });

  it("a fresh game (six starting things) reads fine with no page button", () => {
    setView(view);
    const entries = entriesOf(false);
    expect(entries.length).toBe(6);
    expect(thingsPages(entries.length)).toBe(1);
    expect(thingsButtons({ entries, cursor: 0, touch: true }).map((b) => b.id)).toEqual(["back"]);
    vi.mocked(drawText).mockClear();
    drawThings(ctx, { entries, cursor: 0, touch: false });
    expect(texts().some((t) => t.startsWith("PAGE"))).toBe(false);
  });
});

describe("the cursor", () => {
  it("wraps left and right through the whole list, and up and down within a column", () => {
    const n = 23;
    const { cols } = thingsGrid();
    expect(moveThingsCursor(0, n, "left")).toBe(n - 1);
    expect(moveThingsCursor(n - 1, n, "right")).toBe(0);
    expect(moveThingsCursor(2, n, "down")).toBe(2 + cols);
    expect(moveThingsCursor(2, n, "up")).toBe(2 + Math.floor((n - 1 - 2) / cols) * cols);
    // Down from the last row of a column goes to the top of it; up from the top goes to the bottom.
    for (let i = 0; i < n; i++) {
      const down = moveThingsCursor(i, n, "down");
      expect(down).toBeGreaterThanOrEqual(0);
      expect(down).toBeLessThan(n);
      expect(down % cols).toBe(i % cols);
      expect(moveThingsCursor(down, n, "up")).toBe(i);
    }
  });

  it("stays in range for tiny and empty lists", () => {
    expect(moveThingsCursor(0, 0, "down")).toBe(0);
    expect(moveThingsCursor(0, 1, "left")).toBe(0);
    for (const dir of ["left", "right", "up", "down"] as const) for (let n = 1; n < 8; n++) for (let c = 0; c < n; c++) {
      const r = moveThingsCursor(c, n, dir);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(n);
    }
  });
});

describe("paging", () => {
  it("the cells shown are the cursor's page, in order, and every entry is on exactly one page", () => {
    for (const view of [DESKTOP_VIEW, NARROW_VIEW]) {
      setView(view);
      const entries = new Decor().entries();
      const bigger = Array.from({ length: 45 }, (_, i) => entries[i % entries.length]);
      const { perPage } = thingsGrid();
      const seen: number[] = [];
      for (let p = 0; p < thingsPages(bigger.length); p++) seen.push(...thingsCells({ entries: bigger, cursor: p * perPage }).map((c) => c.index));
      expect(seen).toEqual(bigger.map((_, i) => i));
    }
  });
});

describe("on the pause screen", () => {
  it("I opens it from the list and Escape or I goes back; L closes the whole screen; the clock stays held", () => {
    const { game, feature, press, run } = setup();
    press("KeyL");
    press("KeyI");
    expect(state(feature).page).toBe("things");
    const before = { clock: game.state.get("clock"), hours: game.deliveries.hours, time: game.interaction.time };
    run(120);
    expect({ clock: game.state.get("clock"), hours: game.deliveries.hours, time: game.interaction.time }).toEqual(before);
    press("Escape");
    expect(state(feature).page).toBe("list");
    expect(feature.listVisible).toBe(true);
    press("KeyI");
    press("KeyI");
    expect(state(feature).page).toBe("list");
    press("KeyI");
    press("KeyL");
    expect(feature.listVisible).toBe(false);
    press("KeyL");
    expect(state(feature).page).toBe("list");
  });

  it("I does nothing with the screen closed", () => {
    const { feature, press } = setup();
    press("KeyI");
    expect(feature.listVisible).toBe(false);
    expect(state(feature).page).toBe("list");
  });

  it("the arrows and W A S D move the cursor and the list's keys do nothing here", () => {
    const { game, feature, press } = setup();
    ownEverything(game);
    press("KeyL");
    press("KeyI");
    const n = game.decor.entries().length;
    press("ArrowRight");
    expect(state(feature).thingsCursor).toBe(1);
    press("KeyD");
    expect(state(feature).thingsCursor).toBe(2);
    press("KeyA");
    press("ArrowLeft");
    press("ArrowLeft");
    expect(state(feature).thingsCursor).toBe(n - 1);
    const adBlocker = game.adBlockerOn;
    press("KeyB");
    press("KeyT");
    press("KeyP");
    expect(game.adBlockerOn).toBe(adBlocker);
    expect(state(feature).page).toBe("things");
  });

  it("changes nothing in the save: opening, moving and leaving write no decor change", () => {
    const { game, feature, press } = setup();
    ownEverything(game);
    const before = JSON.stringify(game.decor.toJSON());
    let changes = 0;
    game.decor.onChange = () => void changes++;
    press("KeyL");
    press("KeyI");
    for (const k of ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"]) press(k);
    press("Escape");
    expect(changes).toBe(0);
    expect(JSON.stringify(game.decor.toJSON())).toBe(before);
    expect(feature.listVisible).toBe(true);
  });
});

describe("by touch", () => {
  const open = () => {
    const s = setup();
    ownEverything(s.game);
    setTouchHints(true);
    s.press("KeyL");
    return s;
  };
  const tap = (s: ReturnType<typeof setup>, r: { x: number; y: number; w: number; h: number }) => s.game.tapAt(r.x + r.w / 2, r.y + r.h / 2);

  it("a THINGS button on the list opens it, and the buttons all fit the picture", () => {
    const s = open();
    s.game.dialogVoice = { label: () => "DIALOG VOICE: BEEP", toggle: () => {} } as never;
    const buttons = pauseButtons(state(s.feature) as never);
    void buttons;
    const view = (s.feature as unknown as { view(): Parameters<typeof pauseButtons>[0] }).view();
    const things = pauseButtons(view).find((b) => b.id === "things")!;
    expect(things).toBeDefined();
    for (const b of pauseButtons(view)) expect(b.rect.y + b.rect.h).toBeLessThanOrEqual(VIEW.height);
    expect(tap(s, things.rect)).toBe(true);
    expect(state(s.feature).page).toBe("things");
  });

  it("the tap list equals the drawn list: cells, PAGE and BACK, all inside the picture and none overlapping", () => {
    const s = open();
    s.press("KeyI");
    const v = state(s.feature).thingsView();
    const drawn = [...thingsCells(v).map((c) => c.rect), ...thingsButtons(v).map((b) => b.rect)];
    const targets = s.game.tapTargets();
    expect(targets.map(({ x, y, w, h }) => ({ x, y, w, h }))).toEqual(drawn);
    for (const t of targets) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x + t.w).toBeLessThanOrEqual(VIEW.width);
      expect(t.y + t.h).toBeLessThanOrEqual(VIEW.height);
      expect(t.h).toBeGreaterThanOrEqual(14);
    }
    for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i], b = targets[j];
      expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${i} ${j}`).toBe(true);
    }
  });

  it("tapping a cell picks it, tapping it again changes nothing, PAGE goes round, BACK returns", () => {
    // The phone's narrow view holds 16, so everything owned is two pages.
    setView(NARROW_VIEW);
    const s = open();
    s.press("KeyI");
    const cells = () => thingsCells(state(s.feature).thingsView());
    expect(tap(s, cells()[3].rect)).toBe(true);
    expect(state(s.feature).thingsCursor).toBe(3);
    const before = JSON.stringify(s.game.decor.toJSON());
    expect(tap(s, cells()[3].rect)).toBe(true);
    expect(state(s.feature).thingsCursor).toBe(3);
    expect(JSON.stringify(s.game.decor.toJSON())).toBe(before);
    const perPage = thingsGrid().perPage;
    const pages = thingsPages(s.game.decor.entries().length);
    expect(pages).toBeGreaterThan(1);
    const page = () => thingsButtons(state(s.feature).thingsView()).find((b) => b.id === "page")!;
    tap(s, page().rect);
    expect(state(s.feature).thingsCursor).toBe(perPage);
    expect(page().label).toBe(`PAGE 2/${pages}`);
    for (let i = 1; i < pages; i++) tap(s, page().rect);
    expect(state(s.feature).thingsCursor).toBe(0);
    tap(s, thingsButtons(state(s.feature).thingsView()).find((b) => b.id === "back")!.rect);
    expect(state(s.feature).page).toBe("list");
    expect(s.feature.listVisible).toBe(true);
  });

  it("the pad (W A S D) moves the cursor and a tap that misses does nothing", () => {
    const s = open();
    s.press("KeyI");
    s.press("KeyS");
    expect(state(s.feature).thingsCursor).toBe(thingsGrid().cols);
    expect(s.game.tapAt(1, VIEW.height - 1)).toBe(false);
    expect(state(s.feature).page).toBe("things");
  });

  it("the touch page names no desktop key", () => {
    const s = open();
    s.press("KeyI");
    vi.mocked(drawText).mockClear();
    drawThings(ctx, { ...state(s.feature).thingsView(), touch: true });
    for (const t of texts()) expect(t).not.toMatch(/ARROWS|ESC\b|\bL: /);
    expect(texts()).toContain("PAD: LOOK   B: BACK   PAUSE: CLOSE");
  });
});

describe("the list page", () => {
  it("shows the I hint on the desktop only", () => {
    const base = { achievements: [], unlocked: () => false, cursor: 0, message: null, adBlocker: false };
    for (const touch of [false, true]) {
      vi.mocked(drawText).mockClear();
      drawList(ctx, { ...base, touch });
      expect(texts().includes("I: THINGS")).toBe(!touch);
    }
  });
});
