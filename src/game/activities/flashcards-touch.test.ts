import { afterEach, describe, expect, it, vi } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import type { ClipboardLike } from "../../input/clipboard";
import { NO_INPUT, readControls, type Controls } from "../../input/controls";
import { Keyboard } from "../../input/keyboard";
import { targetAt } from "../../input/tap";
import { TextEntry } from "../../input/text-entry";
import { TouchPad, type KeySink } from "../../input/touch";
import { drawText } from "../../render/font";
import { setTouchHints } from "../../render/hints";
import { DemoSession } from "../flashcards/demo";
import { StudyStore } from "../flashcards/key";
import type { CardView, OpenResult, StudyBackend } from "../flashcards/study";
import { FlashcardsActivity } from "./flashcards";
import { fakeHost } from "./fake-host";

vi.mock("../../render/font", async (original) => ({ ...(await original<typeof import("../../render/font")>()), drawText: vi.fn() }));

const KEY = "abcdefghij0123456789abcdefghij01";
const CARDS: CardView[] = [
  { slug: "a", prompt: "one", answer: "uno" },
  { slug: "b", prompt: "two", answer: "dos" },
];
const SCREEN = { width: 320, height: 192 };
const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => setTouchHints(false));

// A stand-in for window: the pad raises events on it and the real Keyboard listens.
class FakeWindow {
  private fns = new Map<string, Array<(e: any) => void>>();
  addEventListener(type: string, fn: (e: any) => void) {
    this.fns.set(type, [...(this.fns.get(type) ?? []), fn]);
  }
  fire(type: string, event: object) {
    for (const fn of this.fns.get(type) ?? []) fn({ repeat: false, preventDefault() {}, ...event });
  }
}

function setup(options: { backend?: Partial<StudyBackend>; guestOpen?: () => OpenResult | Promise<OpenResult>; storage?: FakeStorage } = {}) {
  const f = fakeHost();
  const storage = options.storage ?? new FakeStorage();
  const store = new StudyStore(storage);
  const opens: string[] = [];
  const backend: StudyBackend = {
    paysPoints: true,
    open: async (key) => {
      opens.push(key);
      return new DemoSession(CARDS);
    },
    ...options.backend,
  };
  const guestOpens: number[] = [];
  const guestBackend: StudyBackend = {
    paysPoints: true,
    open: async () => {
      guestOpens.push(1);
      return options.guestOpen ? options.guestOpen() : new DemoSession(CARDS);
    },
    forget: () => void guestOpens.push(-1),
  };
  const clipboard: ClipboardLike = { copy: async () => true, read: async () => null, onPaste: () => () => {} };
  const a = new FlashcardsActivity(f.host, backend, store, clipboard, guestBackend);
  // The touch layer's keys, through the real keyboard and controls.
  const win = new FakeWindow();
  const keyboard = new Keyboard(win as unknown as Window);
  const sink: KeySink = {
    down: (code, shift) => win.fire("keydown", { code, shiftKey: shift }),
    up: (code, shift) => win.fire("keyup", { code, shiftKey: shift }),
  };
  const pad = new TouchPad(sink);
  const frame = async (extra: Partial<Controls> = {}) => {
    a.update(1 / 60, { ...readControls(keyboard), ...extra });
    keyboard.endFrame();
    pad.afterFrame();
    await flush();
  };
  const tap = async (x: number, y: number) => {
    const t = targetAt(a.tapTargets(SCREEN), x, y);
    expect(t, `a button at ${x},${y}`).not.toBeNull();
    t!.run();
    await flush();
  };
  const center = (t: { x: number; y: number; w: number; h: number }) => [t.x + t.w / 2, t.y + t.h / 2] as const;
  const texts = () => {
    vi.mocked(drawText).mockClear();
    a.draw({ fillRect: () => {} } as unknown as CanvasRenderingContext2D, SCREEN);
    return vi.mocked(drawText).mock.calls.map((c) => c[1]);
  };
  return { a, f, store, storage, opens, guestOpens, pad, keyboard, frame, tap, center, texts };
}

describe("the key screen by touch (issue 093)", () => {
  it("wants text only on the key screen, and the typed text is the activity's", async () => {
    const t = setup();
    setTouchHints(true);
    t.a.start();
    expect(t.a.phase).toBe("choice");
    expect(t.a.wantsText).toBe(false);
    t.a.phase = "key";
    expect(t.a.wantsText).toBe(true);
    t.a.setText("abc");
    expect(t.a.textValue()).toBe("abc");
  });

  it("a field value that is a pasted pairing link becomes the key; a bare key is kept; A (Enter) then connects", async () => {
    const t = setup();
    setTouchHints(true);
    t.pad.setTextMode(true);
    t.a.start();
    t.a.phase = "key";
    const entry = new TextEntry({ wantsText: () => t.a.wantsText, textValue: () => t.a.textValue(), setText: (x) => t.a.setText(x) }, (c) => t.pad.tapKey(c));
    entry.input(`https://palabras.mcord.dev/?pair=${KEY}`);
    expect(t.a.textValue()).toBe(KEY);
    // The field follows the game: it now shows the key, not the link.
    expect(entry.syncValue(`https://palabras.mcord.dev/?pair=${KEY}`)).toBe(KEY);
    expect(entry.syncValue(KEY)).toBeNull();
    // A: Enter, because the game wants text.
    t.pad.pressControl(1, "a");
    await t.frame();
    t.pad.releasePointer(1);
    await t.frame();
    await t.frame();
    expect(t.opens).toEqual([KEY]);
    expect(t.a.phase).toBe("front");
    expect(t.store.key()).toBe(KEY);
  });

  it("typing letters into the field never reaches the game as keys, so nothing is typed twice", async () => {
    const t = setup();
    t.a.start();
    t.a.phase = "key";
    const entry = new TextEntry({ wantsText: () => t.a.wantsText, textValue: () => t.a.textValue(), setText: (x) => t.a.setText(x) }, (c) => t.pad.tapKey(c));
    for (const value of ["a", "ab", "abc"]) entry.input(value);
    await t.frame();
    expect(t.a.textValue()).toBe("abc");
    entry.input("ab");
    expect(t.a.textValue()).toBe("ab");
    entry.input("");
    expect(t.a.textValue()).toBe("");
  });

  it("the keyboard's Go key presses Enter and its Escape leaves; other keys are text", async () => {
    const t = setup();
    t.a.start();
    t.a.phase = "key";
    const taps: string[] = [];
    const entry = new TextEntry({ wantsText: () => t.a.wantsText, textValue: () => t.a.textValue(), setText: (x) => t.a.setText(x) }, (c) => taps.push(c));
    expect(entry.key("Enter")).toBe(true);
    expect(entry.key("Escape")).toBe(true);
    expect(entry.key("a")).toBe(false);
    expect(taps).toEqual(["Enter", "Escape"]);
    // Off the key screen the field does nothing.
    t.a.phase = "front";
    expect(entry.key("Enter")).toBe(false);
    entry.input("zzz");
    expect(t.a.textValue()).toBe("");
  });

  it("a paste replaces what was typed, and a bad one says so", async () => {
    const t = setup();
    t.a.start();
    t.a.phase = "key";
    const entry = new TextEntry({ wantsText: () => t.a.wantsText, textValue: () => t.a.textValue(), setText: (x) => t.a.setText(x) }, () => {});
    entry.input("hello");
    expect(entry.paste(`?pair=${KEY}`)).toBe(KEY);
    expect(entry.paste("not a key")).toBe("not a key");
    t.pad.setTextMode(true);
    t.pad.tapKey("Enter");
    await t.frame();
    await t.frame();
    expect(t.a.message).toBe("That is not a key.");
  });

  it("A sends E again once the text screen is gone", async () => {
    const t = setup();
    t.pad.setTextMode(true);
    expect(t.pad.textMode).toBe(true);
    // A press begun in text mode is let go as Enter even if the mode flips while it is held.
    t.pad.pressControl(1, "a");
    t.pad.setTextMode(false);
    expect(t.pad.held()).toEqual(["Enter"]);
    t.pad.releasePointer(1);
    t.pad.afterFrame();
    t.pad.afterFrame();
    expect(t.pad.held()).toEqual([]);
    t.pad.pressControl(2, "a");
    expect(t.pad.held()).toEqual(["KeyE"]);
  });
});

describe("the choice screen by touch", () => {
  it("both rows are buttons: the first studies without a key, the second asks for a key", async () => {
    const first = setup();
    setTouchHints(true);
    first.a.start();
    expect(first.a.phase).toBe("choice");
    const [one, two] = first.a.tapTargets(SCREEN);
    await first.tap(...first.center(one));
    expect(first.guestOpens).toEqual([1]);
    expect(first.a.guest).toBe(true);

    const second = setup();
    second.a.start();
    const targets = second.a.tapTargets(SCREEN);
    await second.tap(...second.center(targets[1]));
    expect(second.a.phase).toBe("key");
    expect(second.a.wantsText).toBe(true);
    // The rows are taller than the desktop's, so a thumb lands on one of them.
    expect(two.h).toBeGreaterThanOrEqual(16);
    expect(two.y).toBeGreaterThanOrEqual(one.y + one.h);
  });

  it("with the layer hidden there are no buttons, and the keys work as before", async () => {
    const t = setup();
    t.a.start();
    expect(t.a.tapTargets(SCREEN)).toEqual([]);
    await t.frame({ ...NO_INPUT, interactPressed: true });
    expect(t.a.guest).toBe(true);
  });
});

describe("the done and problem screens by touch", () => {
  it("done: a key's study has OTHER KEY and NO KEY buttons that do what K and G do; a guest's has USE A KEY", async () => {
    const t = setup();
    setTouchHints(true);
    t.store.saveKey(KEY);
    t.a.start();
    await flush();
    t.a.phase = "done";
    const [other, none] = t.a.tapTargets(SCREEN);
    await t.tap(...t.center(none));
    expect(t.a.guest).toBe(true);
    expect(t.guestOpens).toEqual([1]);
    t.a.phase = "done";
    const [use] = t.a.tapTargets(SCREEN);
    expect(t.a.tapTargets(SCREEN)).toHaveLength(1);
    await t.tap(...t.center(use));
    // A saved key is used straight away.
    expect(t.opens.at(-1)).toBe(KEY);
    expect(other).toBeDefined();
  });

  it("done: OTHER KEY goes to the key screen and leaves the saved key alone", async () => {
    const t = setup();
    setTouchHints(true);
    t.store.saveKey(KEY);
    t.a.start();
    await flush();
    t.a.phase = "done";
    await t.tap(...t.center(t.a.tapTargets(SCREEN)[0]));
    expect(t.a.phase).toBe("key");
    expect(t.store.key()).toBe(KEY);
  });

  it("done: the buttons sit inside the box, above the leave line and clear of each other", async () => {
    const t = setup();
    setTouchHints(true);
    t.store.saveKey(KEY);
    t.a.start();
    await flush();
    t.a.phase = "done";
    const [a, b] = t.a.tapTargets(SCREEN);
    expect(a.x + a.w).toBeLessThan(b.x);
    for (const r of [a, b]) {
      expect(r.x).toBeGreaterThanOrEqual(28);
      expect(r.x + r.w).toBeLessThanOrEqual(320 - 28);
      expect(r.y + r.h).toBeLessThanOrEqual(192);
    }
  });

  it("problem (a guest's unreadable cards): START AGAIN asks, then YES erases and NO keeps", async () => {
    const t = setup({ guestOpen: () => "unreadable" });
    setTouchHints(true);
    t.a.start();
    await t.tap(...t.center(t.a.tapTargets(SCREEN)[0]));
    expect(t.a.phase).toBe("problem");
    expect(t.a.message).toBe("The saved cards could not be read.");
    expect(t.texts()).toContain("START AGAIN");
    await t.tap(...t.center(t.a.tapTargets(SCREEN)[0]));
    expect(t.a.confirmRestart).toBe(true);
    const [yes, no] = t.a.tapTargets(SCREEN);
    await t.tap(...t.center(no));
    expect(t.a.confirmRestart).toBe(false);
    expect(t.guestOpens).not.toContain(-1);
    await t.tap(...t.center(t.a.tapTargets(SCREEN)[0]));
    await t.tap(...t.center(yes));
    expect(t.guestOpens).toContain(-1);
  });
});

describe("the card screens by touch", () => {
  const study = async () => {
    const t = setup();
    setTouchHints(true);
    t.store.saveKey(KEY);
    t.a.start();
    await flush();
    expect(t.a.phase).toBe("front");
    return t;
  };

  it("tapping the card flips it; then a grade button answers", async () => {
    const t = await study();
    await t.tap(160, 60);
    expect(t.a.phase).toBe("back");
    const grades = t.a.tapTargets(SCREEN).filter((r) => r.h >= 26);
    expect(grades).toHaveLength(2);
    await t.tap(...t.center(grades[1]));
    expect(t.a.gotIt).toBe(1);
    expect(t.a.phase).toBe("front");
  });

  it("the AGAIN button grades again and the card comes back", async () => {
    const t = await study();
    await t.tap(160, 60);
    const grades = t.a.tapTargets(SCREEN).filter((r) => r.h >= 26);
    await t.tap(...t.center(grades[0]));
    expect(t.a.again).toBe(1);
    expect(t.a.queue.length).toBeGreaterThan(2);
  });

  it("SAY IT is a button once the Spanish is showing", async () => {
    const t = await study();
    await t.tap(160, 60);
    const before = t.texts();
    expect(before).toContain("SAY IT");
    expect(before).not.toContain("R: say it");
    const sayIt = t.a.tapTargets(SCREEN).find((r) => r.y < 100 && r.x > 200);
    expect(sayIt).toBeDefined();
    await t.tap(...t.center(sayIt!));
  });
});

describe("no hint on these screens names a key the touch layer lacks", () => {
  // Every desktop key that appears in the hints: if it shows on touch, the player cannot press it.
  const KEYS = /\b(ESC|ENTER|SHIFT\+R|ARROWS|UP DOWN|UP, DOWN)\s*[:,]|\bESC TO\b|(^|\s)[EKGSYRVDL]: |\bTAB\b/i;

  it("on every screen of the activity, drawn on the touch layer", async () => {
    const screens: Array<(t: ReturnType<typeof setup>) => Promise<void>> = [
      async (t) => t.a.start(),
      async (t) => {
        t.a.start();
        t.a.phase = "key";
        t.a.setText("abc");
      },
      async (t) => {
        t.store.saveKey(KEY);
        t.a.start();
        await flush();
      },
      async (t) => {
        t.store.saveKey(KEY);
        t.a.start();
        await flush();
        t.a.phase = "back";
      },
      async (t) => {
        t.store.saveKey(KEY);
        t.a.start();
        await flush();
        t.a.phase = "done";
        t.a.message = "2 got it, 0 again.";
      },
      async (t) => {
        t.a.start();
        t.a.guest = true;
        t.a.phase = "done";
        t.a.message = "x";
      },
      async (t) => {
        t.a.start();
        t.a.guest = true;
        t.a.phase = "problem";
        t.a.message = "The saved cards could not be read.";
      },
      async (t) => {
        t.a.start();
        t.a.guest = true;
        t.a.phase = "problem";
        t.a.message = "The saved cards could not be read.";
        t.a.confirmRestart = true;
      },
    ];
    for (const [i, go] of screens.entries()) {
      const t = setup();
      setTouchHints(true);
      await go(t);
      const texts = t.texts();
      for (const text of texts) expect(text, `screen ${i}`).not.toMatch(KEYS);
    }
  });

  it("while the same screens on the desktop keep their key hints", async () => {
    const t = setup();
    t.a.start();
    expect(t.texts()).toContain("Up, Down, E: pick   Esc: back");
    t.a.phase = "key";
    expect(t.texts()).toContain("Enter: ok   Esc: back");
    t.a.phase = "done";
    t.a.message = "x";
    expect(t.texts().some((x) => x.startsWith("E: leave"))).toBe(true);
  });
});
