import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../../input/controls";
import { setTouchHints } from "../../render/hints";
import { DESKTOP_VIEW, MAKE_TRACKS as M, NARROW_VIEW } from "../config";
import type { KeyValueStorage } from "../achievements/progress";
import { DemoStore } from "../music/demo-store";
import { fakeHost } from "./fake-host";
import { MakeTrackActivity } from "./make-track";

// What the font is asked to draw is the on-screen text. The real function needs a DOM canvas.
const drawn: string[] = [];
vi.mock("../../render/font", async (orig) => ({
  ...(await orig<typeof import("../../render/font")>()),
  drawText: (_ctx: unknown, text: string) => void drawn.push(text),
}));
import { drawTrackEditor } from "../../render/track-editor";

afterEach(() => setTouchHints(false));

const dt = 1 / 60;
function memory(): KeyValueStorage {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

// A canvas that records each call as text.
function recorder() {
  const calls: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (t, key: string) => (key in t ? t[key] : (...args: unknown[]) => void calls.push(`${key}(${args.map(String).join(",")})`)),
    set: (t, key: string, value) => {
      t[key] = value;
      calls.push(`${key}=${String(value)}`);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

function setup(copyFails = false) {
  const store = new DemoStore(memory(), M.storageKey, { reserved: () => ["Stop the music"], log: () => {} });
  const fake = fakeHost();
  const clipboard = {
    copy: async () => !copyFails,
    read: async () => null,
    onPaste: () => () => {},
  };
  const act = new MakeTrackActivity(fake.host, store, clipboard);
  act.start();
  const press = (...codes: string[]) => codes.forEach((c) => act.update(dt, { ...NO_INPUT, keys: [c] }));
  return { act, press, store };
}

// The words that name a desktop key as a key (issue 093: no touch hint names a key the player cannot press).
const DESKTOP_KEY_WORDS = /\b(ctrl|escape|esc|enter|backspace|shift|press)\b|^[ETNSDCVP]( |:)|\b[1-3] (melody|bass|beat)\b|\b[ETNSDCVP]\s+(note|length|play|name|save|delete|copy|paste)\b/i;

describe("the editor on the touch layer (issue 106a)", () => {
  it("draws its own look in the live view, with no desktop key named anywhere", async () => {
    setTouchHints(true);
    const s = setup(true);
    const seen = new Set<string>();
    const sweep = (screen: { width: number; height: number }) => {
      drawn.length = 0;
      s.act.draw(recorder().ctx, screen);
      for (const t of drawn) seen.add(t);
      if (s.act.message) seen.add(s.act.message);
    };
    for (const screen of [NARROW_VIEW, DESKTOP_VIEW]) {
      sweep(screen);
      s.press("KeyE");
      sweep(screen);
      s.press("Digit3", "KeyE", "KeyT", "Digit1", "KeyT", "KeyP");
      sweep(screen);
      s.press("KeyP", "KeyN");
      sweep(screen);
      s.press("Enter");
      s.press("KeyS");
      sweep(screen);
      s.press("KeyC");
      await new Promise((r) => setTimeout(r, 0));
      sweep(screen); // "Could not copy."
      s.press("KeyV");
      await new Promise((r) => setTimeout(r, 0));
      sweep(screen); // the paste fallback
      s.press("KeyD");
      sweep(screen);
    }
    expect([...seen].length).toBeGreaterThan(10);
    for (const t of seen) {
      expect(t, t).not.toMatch(DESKTOP_KEY_WORDS);
    }
    expect([...seen]).toContain("B leaves. Your draft is kept.");
  });

  it("stops showing the tap tip once a note is placed", () => {
    setTouchHints(true);
    const s = setup();
    // The module remembers across tests, so only the order after placing is certain.
    s.press("KeyE");
    drawn.length = 0;
    s.act.draw(recorder().ctx, NARROW_VIEW);
    expect(drawn).not.toContain("Tap a square to add or remove a note");
  });

  it("does not draw the game's stop hint on touch (the top strip says B leaves)", () => {
    setTouchHints(true);
    expect(setup().act.hidesStopHint).toBe(true);
    setTouchHints(false);
    expect(setup().act.hidesStopHint).toBe(false);
  });

  it("keeps the grid and the cursor when the layer switches mid-edit", () => {
    const s = setup();
    setTouchHints(true);
    s.press("ArrowRight", "ArrowRight", "KeyE");
    const before = JSON.stringify(s.act.grid);
    setTouchHints(false);
    s.act.draw(recorder().ctx, DESKTOP_VIEW);
    setTouchHints(true);
    s.act.draw(recorder().ctx, NARROW_VIEW);
    expect(JSON.stringify(s.act.grid)).toBe(before);
    expect(s.act.step).toBe(2);
  });

  it("draws the same as before on the desktop (the editor's own function, untouched)", () => {
    setTouchHints(false);
    const s = setup();
    s.press("ArrowRight", "KeyE");
    const a = recorder();
    s.act.draw(a.ctx, DESKTOP_VIEW);
    expect(a.calls.length).toBeGreaterThan(20);
    // The activity draws what drawTrackEditor draws for its view: nothing else is added.
    const direct = recorder();
    drawTrackEditor(direct.ctx, (s.act as unknown as { view(): never }).view());
    expect(a.calls).toEqual(direct.calls);
  });

  it("draws on both views without throwing, in every channel and while naming or playing", () => {
    setTouchHints(true);
    const s = setup();
    s.press("KeyE", "KeyP");
    for (const screen of [NARROW_VIEW, DESKTOP_VIEW]) {
      for (const ch of ["Digit1", "Digit2", "Digit3"]) {
        s.press(ch);
        expect(() => s.act.draw(recorder().ctx, screen)).not.toThrow();
      }
    }
    s.press("KeyN");
    expect(() => s.act.draw(recorder().ctx, NARROW_VIEW)).not.toThrow();
  });
});
