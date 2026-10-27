import { describe, expect, it, vi } from "vitest";
import { drawText, textWidth } from "../../render/font";
import { VIEW } from "../config";
import { ACHIEVEMENTS } from "./data";
import { LIST_HINT, LIST_HINT_VOICE, drawList } from "./draw";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

// Issue 075: the list screen shows the dialog voice setting and the D key.
describe("the list screen's dialog voice line", () => {
  const ctx = { fillRect: () => {} } as unknown as CanvasRenderingContext2D;
  const draw = (voice: string | null, message: string | null = null) => {
    vi.mocked(drawText).mockClear();
    drawList(ctx, { achievements: ACHIEVEMENTS, unlocked: () => false, cursor: 0, message, voice });
    return vi.mocked(drawText).mock.calls.map((c) => ({ text: c[1], x: c[2], y: c[3], align: c[4]?.align }));
  };

  it("fits the screen width: the hint line, and the setting beside the longest name", () => {
    expect(textWidth(LIST_HINT_VOICE)).toBeLessThanOrEqual(VIEW.width - 12);
    expect(textWidth(LIST_HINT)).toBeLessThanOrEqual(VIEW.width - 12);
    const widest = Math.max(...ACHIEVEMENTS.map((a) => textWidth(a.name)));
    expect(6 + widest + 8 + textWidth("DIALOG VOICE: LETTERS") + 6).toBeLessThanOrEqual(VIEW.width);
  });

  it("draws the setting at the right and names D in the hint, only with the sound feature on", () => {
    for (const voice of ["DIALOG VOICE: BEEP", "DIALOG VOICE: LETTERS"]) {
      const calls = draw(voice);
      expect(calls.find((c) => c.text === voice)).toMatchObject({ x: VIEW.width - 6, align: "right" });
      expect(calls.some((c) => c.text === LIST_HINT_VOICE)).toBe(true);
    }
    const none = draw(null);
    expect(none.some((c) => c.text.startsWith("DIALOG VOICE"))).toBe(false);
    expect(none.some((c) => c.text === LIST_HINT)).toBe(true);
  });

  it("shows the reset question instead of the hint, as before", () => {
    const calls = draw("DIALOG VOICE: BEEP", "RESET ALL PROGRESS? Y: YES");
    expect(calls.some((c) => c.text === "RESET ALL PROGRESS? Y: YES")).toBe(true);
    expect(calls.some((c) => c.text === LIST_HINT_VOICE)).toBe(false);
  });
});
