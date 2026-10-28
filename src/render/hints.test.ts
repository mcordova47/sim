import { afterEach, describe, expect, it } from "vitest";
import { footer } from "../game/activities/swap-decor";
import { hintLine, keyLabel, setTouchHints, stopHintText, touchHints } from "./hints";
import { STOP_HINT } from "./hud";

afterEach(() => setTouchHints(false));

describe("the hint function (issue 093)", () => {
  it("on the desktop every label is the desktop key, unchanged", () => {
    setTouchHints(false);
    expect(touchHints()).toBe(false);
    for (const key of ["E", "ESC", "Esc", "L", "UP DOWN", "ARROWS", "TAB", "K", "SHIFT+R"]) expect(keyLabel(key)).toBe(key);
    expect(stopHintText()).toBe(STOP_HINT);
    expect(stopHintText()).toBe("ESC TO STOP");
    expect(footer()).toBe("UP DOWN: LOOK   E: PUT UP   ESC: BACK");
    expect(hintLine([{ key: "E", text: "leave" }, { key: "K", text: "other key", touch: null }])).toBe("E: leave   K: other key");
  });

  it("on the touch layer the keys that have a button are named by it", () => {
    setTouchHints(true);
    expect(keyLabel("E")).toBe("A");
    expect(keyLabel("ESC")).toBe("B");
    expect(keyLabel("Esc")).toBe("B");
    expect(keyLabel("Enter")).toBe("A");
    expect(keyLabel("L")).toBe("PAUSE");
    expect(keyLabel("UP DOWN")).toBe("PAD");
    expect(keyLabel("ARROWS")).toBe("PAD");
    expect(keyLabel("TAB")).toBe("CHOICE");
    expect(stopHintText()).toBe("B TO STOP");
    expect(footer()).toBe("PAD: LOOK   A: PUT UP   B: BACK");
  });

  it("a key with no touch name keeps its desktop key, and a part marked null drops out", () => {
    setTouchHints(true);
    expect(keyLabel("Q")).toBe("Q");
    expect(hintLine([{ key: "E", text: "leave" }, { key: "K", text: "other key", touch: null }, { key: "G", text: "no key", touch: null }])).toBe("A: leave");
    expect(hintLine([{ key: "E", text: "pick", touch: "TAP OR A" }])).toBe("TAP OR A: pick");
  });

  it("follows the layer as it shows and hides, with no restart", () => {
    setTouchHints(true);
    expect(keyLabel("E")).toBe("A");
    setTouchHints(false);
    expect(keyLabel("E")).toBe("E");
    setTouchHints(true);
    expect(stopHintText()).toBe("B TO STOP");
  });

  it("the touch wordings are shorter than the desktop ones, so they fit where those did", () => {
    setTouchHints(true);
    expect(stopHintText().length).toBeLessThanOrEqual(STOP_HINT.length);
    expect(footer().length).toBeLessThanOrEqual("UP DOWN: LOOK   E: PUT UP   ESC: BACK".length);
  });
});
