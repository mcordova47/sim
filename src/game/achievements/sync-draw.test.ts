import { afterEach, describe, expect, it, vi } from "vitest";
import { drawText, textWidth, unsupportedChars } from "../../render/font";
import { setTouchHints } from "../../render/hints";
import { VIEW } from "../config";
import { STATUS_TEXT } from "../sync/service";
import { SYNC_HINT, SYNC_LINES, SYNC_QUESTIONS, drawList, drawSync, syncButtons, type SyncView } from "./draw";
import { ACHIEVEMENTS } from "./data";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

afterEach(() => setTouchHints(false));

const ctx = { fillRect: () => {} } as unknown as CanvasRenderingContext2D;
const view = (extra: Partial<SyncView> = {}): SyncView => ({ touch: true, message: null, status: STATUS_TEXT.off, keyLine: null, isOn: false, confirm: null, busy: false, ...extra });
const MESSAGES = [
  "SYNC IS ON", "SYNCED", "SYNC IS OFF", "ONE MOMENT", "PAIRED. SYNC IS ON", "THAT IS NOT A SYNC KEY OR LINK", "SYNC STOPPED. THE SAVED COPY IS DELETED",
  "LINK COPIED", "COULD NOT COPY. THE LINK IS IN THE CONSOLE.", "COULD NOT READ THE CLIPBOARD", "PRESS CTRL+V TO PASTE",
  "NO CONNECTION", "KEY NOT FOUND", "UNAVAILABLE", "UPDATE THE GAME", "SAVE ON THE SERVER IS UNREADABLE", "THE SERVER REFUSED THE SAVE",
];

describe("the sync page's text and buttons", () => {
  it("every line, status and message uses letters the font has and fits the picture", () => {
    const key = "KEY: " + "ABCD...WXYZ";
    for (const text of [...SYNC_LINES, ...MESSAGES, ...Object.values(STATUS_TEXT), ...Object.values(SYNC_QUESTIONS).map((q) => q + " Y: YES"), key, "SYNC: WORKING...", SYNC_HINT, "SYNC"]) {
      expect(unsupportedChars(text), text).toEqual([]);
      expect(textWidth(text), text).toBeLessThanOrEqual(VIEW.width - 12);
    }
  });

  it("touch labels fit their buttons, in every state, and the buttons sit inside the picture", () => {
    for (const v of [view(), view({ isOn: true }), view({ confirm: "stop" }), view({ isOn: true, confirm: "pair" })]) {
      for (const b of syncButtons(v)) {
        expect(textWidth(b.label), b.label).toBeLessThanOrEqual(b.rect.w - 4);
        expect(b.rect.y + b.rect.h).toBeLessThan(VIEW.height - 12);
      }
    }
  });

  it("the desktop draws a key beside each choice, touch draws none, and the question shows only for a pending answer", () => {
    const draw = (v: SyncView) => {
      vi.mocked(drawText).mockClear();
      drawSync(ctx, v);
      return vi.mocked(drawText).mock.calls.map((c) => c[1]);
    };
    const desktop = draw(view({ touch: false, isOn: true }));
    expect(desktop).toContain("C: COPY LINK");
    expect(desktop).toContain("X: STOP SYNCING");
    setTouchHints(true);
    const touch = draw(view({ isOn: true }));
    expect(touch).toContain("COPY LINK");
    for (const t of touch) expect(t).not.toMatch(/\bC: |\bX: /);
    expect(draw(view({ confirm: "stop" }))).toContain(SYNC_QUESTIONS.stop);
    expect(draw(view({ isOn: true }))).not.toContain(SYNC_QUESTIONS.stop);
  });

  it("the pause list shows the P key hint on the desktop only", () => {
    const base = { achievements: ACHIEVEMENTS, unlocked: () => false, cursor: 0, message: null, adBlocker: false, voice: "DIALOG VOICE: BEEP" };
    for (const touch of [false, true]) {
      vi.mocked(drawText).mockClear();
      drawList(ctx, { ...base, touch });
      expect(vi.mocked(drawText).mock.calls.map((c) => c[1]).includes(SYNC_HINT)).toBe(!touch);
    }
  });
});
