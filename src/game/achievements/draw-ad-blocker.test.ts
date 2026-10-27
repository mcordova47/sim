import { describe, expect, it, vi } from "vitest";
import { drawText, textWidth } from "../../render/font";
import { VIEW } from "../config";
import { ACHIEVEMENTS } from "./data";
import { LIST_HINT, LIST_HINT_VOICE, drawList, listHint } from "./draw";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

// Issue 043 stage B: the list screen shows the ad blocker switch and the B key.
describe("the list screen's ad blocker line", () => {
  const ctx = { fillRect: () => {} } as unknown as CanvasRenderingContext2D;
  const draw = (over: { voice?: string | null; adBlocker?: boolean | null; message?: string | null }) => {
    vi.mocked(drawText).mockClear();
    drawList(ctx, { achievements: ACHIEVEMENTS, unlocked: () => false, cursor: 0, message: null, ...over });
    return vi.mocked(drawText).mock.calls.map((c) => c[1]);
  };

  it("every hint fits the screen, with and without the voice key and in both states", () => {
    for (const voice of [false, true]) for (const on of [false, true]) expect(textWidth(listHint(voice, on)), `${voice} ${on}`).toBeLessThanOrEqual(VIEW.width - 12);
  });

  it("without the voice key it is the full wording of the note, and the arrows hint is dropped", () => {
    expect(listHint(false, false)).toBe("B: AD BLOCKER OFF   L: CLOSE   SHIFT+R: RESET");
    expect(listHint(false, true)).toBe("B: AD BLOCKER ON   L: CLOSE   SHIFT+R: RESET");
    expect(listHint(false, false)).not.toContain("ARROWS");
  });

  it("with the voice key it names both keys and the state", () => {
    for (const on of [false, true]) {
      const hint = listHint(true, on);
      expect(hint).toContain(on ? "ON" : "OFF");
      for (const part of ["B:", "D: VOICE", "L: CLOSE", "SHIFT+R: RESET"]) expect(hint).toContain(part);
    }
  });

  it("drawList shows it when the game gives the switch, the old hint when it does not, and the reset question over both", () => {
    expect(draw({ adBlocker: false })).toContain("B: AD BLOCKER OFF   L: CLOSE   SHIFT+R: RESET");
    expect(draw({ adBlocker: true })).toContain("B: AD BLOCKER ON   L: CLOSE   SHIFT+R: RESET");
    expect(draw({ adBlocker: true, voice: "DIALOG VOICE: BEEP" })).toContain(listHint(true, true));
    expect(draw({})).toContain(LIST_HINT);
    expect(draw({ voice: "DIALOG VOICE: BEEP" })).toContain(LIST_HINT_VOICE);
    const question = draw({ adBlocker: false, message: "RESET ALL PROGRESS? Y: YES" });
    expect(question).toContain("RESET ALL PROGRESS? Y: YES");
    expect(question).not.toContain(listHint(false, false));
  });

  it("a flash message takes the hint's place", () => {
    expect(draw({ adBlocker: true, message: "AD BLOCKER: ON" })).toContain("AD BLOCKER: ON");
  });
});
