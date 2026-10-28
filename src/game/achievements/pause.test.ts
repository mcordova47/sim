import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../../input/controls";
import { drawText } from "../../render/font";
import { setTouchHints } from "../../render/hints";
import { APARTMENT } from "../apartment";
import { Game } from "../game";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import { ACHIEVEMENTS } from "./data";
import { drawList, listHint, listRows, pageButton, pauseButtons, touchPageSize } from "./draw";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "./feature";
import { FakeStorage } from "./fake-storage";

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
  const press = (code: string, extra: Partial<KeyEventLike> = {}) => keys.fire("keydown", { code, ...extra });
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) game.update(1 / 60, NO_INPUT);
  };
  return { game, feature, press, run };
}

afterEach(() => setTouchHints(false));

describe("the pause screen holds the clock (issue 093)", () => {
  // What time moves: the apartment's clock and energy, the delivery clock, and the cooldown and
  // combo timer inside the interaction system.
  const snapshot = (game: Game) => ({
    clock: game.state.get("clock"),
    energy: game.state.get("energy"),
    mood: game.state.get("mood"),
    hours: game.deliveries.hours,
    time: game.interaction.time,
  });

  it("without it open the same stretch of play moves every one of them (so the check below means something)", () => {
    const { game, run } = setup();
    const before = snapshot(game);
    run(120);
    const after = snapshot(game);
    expect(after.clock).not.toBe(before.clock);
    expect(after.hours).toBeGreaterThan(before.hours);
    expect(after.time).toBeGreaterThan(before.time);
    expect(after.energy).toBeLessThan(before.energy);
  });

  it("while it is open nothing moves, and closing it resumes", () => {
    const { game, feature, press, run } = setup();
    run(5);
    expect(feature.listVisible).toBe(false);
    press("KeyL");
    expect(feature.listVisible).toBe(true);
    const held = snapshot(game);
    run(300);
    expect(snapshot(game)).toEqual(held);
    expect(game.paused).toBe(true);
    press("Escape");
    expect(feature.listVisible).toBe(false);
    expect(game.paused).toBe(false);
    run(10);
    const resumed = snapshot(game);
    expect(resumed.clock).not.toBe(held.clock);
    expect(resumed.hours).toBeGreaterThan(held.hours);
    expect(resumed.time).toBeGreaterThan(held.time);
  });

  it("holds when it is opened and closed with the L key as well, and when closed by its button", () => {
    const { game, feature, press, run } = setup();
    setTouchHints(true);
    press("KeyL");
    const held = snapshot(game);
    run(30);
    expect(snapshot(game)).toEqual(held);
    const close = pauseButtons(listView(feature)).find((b) => b.id === "close")!;
    expect(game.tapAt(close.rect.x + 2, close.rect.y + 2)).toBe(true);
    expect(feature.listVisible).toBe(false);
    run(10);
    expect(snapshot(game).clock).not.toBe(held.clock);
  });
});

// The view the touch layer would draw, for finding where a finger lands.
function listView(feature: AchievementsFeature) {
  return (feature as unknown as { view(): Parameters<typeof pauseButtons>[0] }).view();
}

describe("the pause screen by touch", () => {
  const open = () => {
    const s = setup();
    setTouchHints(true);
    s.press("KeyL");
    return s;
  };
  const tapButton = (s: ReturnType<typeof setup>, id: string) => {
    const b = pauseButtons(listView(s.feature)).find((x) => x.id === id);
    expect(b, id).toBeDefined();
    return s.game.tapAt(b!.rect.x + b!.rect.w / 2, b!.rect.y + b!.rect.h / 2);
  };

  it("the ad blocker button switches it and says so", () => {
    const s = open();
    expect(s.game.adBlockerOn).toBe(false);
    expect(tapButton(s, "adBlocker")).toBe(true);
    expect(s.game.adBlockerOn).toBe(true);
    expect(tapButton(s, "adBlocker")).toBe(true);
    expect(s.game.adBlockerOn).toBe(false);
  });

  it("the voice button appears only with the sound feature's setting, and switches it", () => {
    const s = open();
    expect(pauseButtons(listView(s.feature)).some((b) => b.id === "voice")).toBe(false);
    let toggles = 0;
    s.game.dialogVoice = { label: () => "DIALOG VOICE: BEEP", toggle: () => void toggles++ } as never;
    expect(tapButton(s, "voice")).toBe(true);
    expect(toggles).toBe(1);
  });

  it("RESET asks first: NO leaves progress alone, YES clears it, and both buttons are tappable", () => {
    const s = open();
    s.feature.stats.stepped();
    s.feature.stats.stepped();
    const steps = s.feature.stats.number("steps");
    expect(steps).toBeGreaterThan(0);
    expect(tapButton(s, "reset")).toBe(true);
    // The question is up: its two buttons replace the settings.
    const ids = pauseButtons(listView(s.feature)).map((b) => b.id);
    expect(ids).toEqual(["yes", "no"]);
    expect(tapButton(s, "no")).toBe(true);
    expect(s.feature.stats.number("steps")).toBe(steps);
    expect(pauseButtons(listView(s.feature)).map((b) => b.id)).toContain("reset");
    tapButton(s, "reset");
    expect(tapButton(s, "yes")).toBe(true);
    expect(s.feature.stats.number("steps")).toBe(0);
  });

  it("a tap that misses every button does nothing, and CLOSE closes", () => {
    const s = open();
    expect(s.game.tapAt(1, 1)).toBe(false);
    expect(s.feature.listVisible).toBe(true);
    expect(tapButton(s, "close")).toBe(true);
    expect(s.feature.listVisible).toBe(false);
    // Closed: nothing there answers a tap.
    expect(s.game.tapAt(100, 30)).toBe(false);
  });

  it("the pad scrolls the list (W and S), the achievements page, and a row can be tapped", () => {
    const s = open();
    const view = () => listView(s.feature);
    expect(listRows(view())[0].index).toBe(0);
    const size = touchPageSize();
    expect(ACHIEVEMENTS.length).toBeGreaterThan(size);
    // Down past the end of the first page shows the second.
    for (let i = 0; i < size; i++) s.press("KeyS");
    expect(listRows(view())[0].index).toBe(size);
    expect(pageButton(view())!.label).toContain("2/");
    s.press("KeyW");
    expect(listRows(view())[0].index).toBe(0);
    // The page button goes round.
    const page = pageButton(view())!;
    s.game.tapAt(page.rect.x + 2, page.rect.y + 2);
    expect(listRows(view())[0].index).toBe(size);
    // A row picks that achievement.
    const row = listRows(view())[3];
    s.game.tapAt(row.rect.x + 2, row.rect.y + 2);
    expect((s.feature as unknown as { cursor: number }).cursor).toBe(row.index);
  });

  it("B (Escape) and the PAUSE pill's key close it", () => {
    const s = open();
    s.press("Escape");
    expect(s.feature.listVisible).toBe(false);
    s.press("KeyL");
    expect(s.feature.listVisible).toBe(true);
    s.press("KeyL");
    expect(s.feature.listVisible).toBe(false);
  });

  it("every target is inside the picture and at least 10 pixels tall and wide", () => {
    const s = open();
    s.press("KeyS");
    for (const t of s.game.tapTargets()) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.x + t.w).toBeLessThanOrEqual(320);
      expect(t.y + t.h).toBeLessThanOrEqual(192);
      expect(t.h).toBeGreaterThanOrEqual(9);
      expect(t.w).toBeGreaterThanOrEqual(20);
    }
  });
});

describe("the pause screen's text", () => {
  const ctx = { fillRect: () => {} } as unknown as CanvasRenderingContext2D;
  const draw = (extra: object = {}) => {
    vi.mocked(drawText).mockClear();
    drawList(ctx, { achievements: ACHIEVEMENTS, unlocked: () => false, cursor: 0, message: null, adBlocker: false, voice: "DIALOG VOICE: BEEP", ...extra });
    return vi.mocked(drawText).mock.calls.map((c) => c[1]);
  };

  it("is titled PAUSE on the desktop and on touch, with the achievements as a section", () => {
    for (const touch of [false, true]) {
      const texts = draw({ touch });
      expect(texts).toContain("PAUSE");
      expect(texts.some((t) => t.startsWith("ACHIEVEMENTS 0/"))).toBe(true);
      expect(texts.some((t) => t.startsWith("ACHIEVEMENTS 0/") && t.includes("PAUSE"))).toBe(false);
    }
  });

  it("on touch names no desktop key: buttons carry the settings and the hint names PAD and PAUSE", () => {
    setTouchHints(true);
    const again = draw({ touch: true });
    for (const t of again) expect(t).not.toMatch(/SHIFT|\b[DLR]: |\bB: AD|ARROWS|\bY: /);
    expect(again).toContain("PAD: LOOK   PAUSE: CLOSE");
    expect(again).toContain("AD BLOCKER: OFF");
    expect(again).toContain("DIALOG VOICE: BEEP");
    expect(again).toContain("RESET PROGRESS");
    expect(again).toContain("CLOSE");
  });

  it("on the desktop the hint line and the keys are as they were", () => {
    const texts = draw({ touch: false });
    expect(texts).toContain(listHint(true, false));
    expect(listHint(true, false)).toMatch(/^B: AD BLOCK(ER)? OFF {2,3}D: VOICE {2,3}L: CLOSE {2,3}SHIFT\+R: RESET$/);
  });
});
