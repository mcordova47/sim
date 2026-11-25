import { afterEach, describe, expect, it, vi } from "vitest";
import { drawText, textWidth, unsupportedChars } from "../../render/font";
import { setTouchHints } from "../../render/hints";
import { VIEW } from "../config";
import { ACHIEVEMENTS } from "./data";
import { TRANSFER_HINT, TRANSFER_LINES, TRANSFER_RESTORE_QUESTION, drawList, drawTransfer, PAUSE_TOUCH, pauseButtons, transferButtons, type TransferView } from "./draw";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

afterEach(() => setTouchHints(false));

const ctx = { fillRect: () => {} } as unknown as CanvasRenderingContext2D;
const MESSAGES = [
  "CODE COPIED",
  "COULD NOT COPY. THE CODE IS IN THE CONSOLE.",
  "COULD NOT MAKE A CODE",
  "FILE SAVED",
  "COULD NOT SAVE A FILE",
  "COULD NOT READ THAT FILE",
  "PRESS CTRL+V TO PASTE",
  "COULD NOT READ THE CLIPBOARD. TRY OPEN FILE.",
  "NOT A SAVE FROM THIS GAME",
  "THAT SAVE IS FROM A NEWER GAME",
  "THAT SAVE COULD NOT BE READ",
  "THAT SAVE IS TOO BIG",
  "SAVE MERGED",
  "SAVE MERGED. THE TRACK LIST IS FULL.",
  "NOTHING NEW IN THAT SAVE",
  "BACK TO BEFORE THE LAST IMPORT",
  "NOTHING TO GO BACK TO",
];

describe("the transfer page's text", () => {
  it("every line and message uses letters the font has and fits the picture", () => {
    for (const text of [...TRANSFER_LINES, ...MESSAGES, TRANSFER_RESTORE_QUESTION + " Y: YES", TRANSFER_HINT, "TRANSFER SAVE"]) {
      expect(unsupportedChars(text), text).toEqual([]);
      expect(textWidth(text), text).toBeLessThanOrEqual(VIEW.width - 12);
    }
  });

  it("the touch buttons' labels fit them, and the desktop draws keys while touch names none", () => {
    for (const confirmRestore of [false, true]) {
      for (const b of transferButtons({ touch: true, message: null, confirmRestore })) expect(textWidth(b.label), b.label).toBeLessThanOrEqual(b.rect.w - 4);
    }
    const draw = (view: TransferView) => {
      vi.mocked(drawText).mockClear();
      drawTransfer(ctx, view);
      return vi.mocked(drawText).mock.calls.map((c) => c[1]);
    };
    const desktop = draw({ touch: false, message: null, confirmRestore: false });
    expect(desktop).toContain("C: COPY CODE");
    expect(desktop).toContain("SHIFT+R: RESTORE BEFORE IMPORT");
    expect(desktop).toContain("ESC: BACK");
    setTouchHints(true);
    const touch = draw({ touch: true, message: null, confirmRestore: false });
    expect(touch).toContain("COPY CODE");
    expect(touch).toContain("B: BACK");
    for (const t of touch) expect(t).not.toMatch(/SHIFT|\bC: |ESC/);
  });

  it("the pause list shows TRANSFER SAVE as a touch button and the desktop's T key hint, and no button for the question", () => {
    const view = { achievements: ACHIEVEMENTS, unlocked: () => false, cursor: 0, message: null, adBlocker: false, voice: "DIALOG VOICE: BEEP" };
    expect(pauseButtons({ ...view, touch: true }).map((b) => b.id)).toEqual(["adBlocker", "voice", "transfer", "sync", "things", "reset", "close"]);
    expect(pauseButtons({ ...view, touch: true, confirmReset: true }).map((b) => b.id)).toEqual(["yes", "no"]);
    for (const touch of [false, true]) {
      vi.mocked(drawText).mockClear();
      drawList(ctx, { ...view, touch });
      const texts = vi.mocked(drawText).mock.calls.map((c) => c[1]);
      expect(texts.includes(TRANSFER_HINT)).toBe(!touch);
    }
    // Seven buttons are four rows, and the achievements (and their page control) start below them.
    const rows = pauseButtons({ ...view, touch: true });
    expect(Math.max(...rows.map((b) => b.rect.y + b.rect.h))).toBeLessThan(PAUSE_TOUCH.pageTop);
  });
});
