import { describe, expect, it, vi } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import type { ClipboardLike } from "../../input/clipboard";
import { NO_INPUT, type Controls } from "../../input/controls";
import { FLASHCARDS as F } from "../config";
import { DemoSession } from "../flashcards/demo";
import { StudyStore } from "../flashcards/key";
import type { CardView, Grade, OpenResult, StudyBackend } from "../flashcards/study";
import { FlashcardsActivity } from "./flashcards";
import { fakeHost } from "./fake-host";

const KEY = "abcdefghij0123456789abcdefghij01";
const CARDS: CardView[] = [
  { slug: "a", prompt: "one", answer: "uno" },
  { slug: "b", prompt: "two", answer: "dos", hint: "a pair" },
  { slug: "c", prompt: "three", answer: "tres" },
];

const keys = (...codes: string[]): Controls => ({ ...NO_INPUT, keys: codes });
const E: Controls = { ...NO_INPUT, interactPressed: true, keys: ["KeyE"] };
const right: Controls = { ...NO_INPUT, dir: "right", dirPressed: "right" };
const flush = () => new Promise((r) => setTimeout(r, 0));

class Session extends DemoSession {
  online = true;
  async grade(slug: string, grade: Grade) {
    if (!this.online) return false;
    return super.grade(slug, grade);
  }
}

function setup(open: (key: string) => Promise<OpenResult> | OpenResult, options: { paysPoints?: boolean; storage?: FakeStorage } = {}) {
  const f = fakeHost();
  const storage = options.storage ?? new FakeStorage();
  const store = new StudyStore(storage);
  const opens: string[] = [];
  const backend: StudyBackend = {
    paysPoints: options.paysPoints ?? true,
    open: async (key) => {
      opens.push(key);
      return open(key);
    },
  };
  const pastes: ((text: string) => void)[] = [];
  const clipboard: ClipboardLike = {
    copy: async () => true,
    read: async () => null,
    onPaste: (l) => {
      pastes.push(l);
      return () => pastes.splice(pastes.indexOf(l), 1);
    },
  };
  const a = new FlashcardsActivity(f.host, backend, store, clipboard);
  const step = async (c: Controls = NO_INPUT) => {
    a.update(1 / 60, c);
    await flush();
  };
  return { a, f, store, storage, opens, pastes, step };
}

describe("FlashcardsActivity: the key", () => {
  it("asks for the key when it has none, and reads a pasted pairing link", async () => {
    const session = new Session(CARDS);
    const t = setup(() => session);
    t.a.start();
    expect(t.a.phase).toBe("key");
    expect(t.pastes).toHaveLength(1);
    t.pastes[0](`https://palabras.mcord.dev/?pair=${KEY}`);
    await t.step(keys("Enter"));
    await flush();
    expect(t.opens).toEqual([KEY]);
    expect(t.a.phase).toBe("front");
    expect(t.store.key()).toBe(KEY);
  });

  it("reads a typed key, with backspace, and refuses a wrong one", async () => {
    const t = setup(() => new Session(CARDS));
    t.a.start();
    for (const ch of KEY.slice(0, -1) + "z") await t.step(keys(ch.match(/\d/) ? `Digit${ch}` : `Key${ch.toUpperCase()}`));
    await t.step(keys("Backspace"));
    await t.step(keys("Enter"));
    expect(t.a.phase).toBe("key");
    expect(t.a.message).toMatch(/not a key/i);
    expect(t.opens).toEqual([]);
    // One more letter makes 32 characters, which is a key.
    await t.step(keys("KeyA"));
    await t.step(keys("Enter"));
    await flush();
    expect(t.opens).toEqual([KEY.slice(0, -1) + "a"]);
  });

  it("does not type the V of Ctrl+V or Cmd+V after a paste, nor other shortcuts", async () => {
    for (const mod of ["ControlLeft", "MetaLeft", "AltRight"]) {
      const t = setup(() => new Session(CARDS));
      t.a.start();
      t.pastes[0](`https://palabras.mcord.dev/?pair=${KEY}`);
      await t.step({ ...keys("KeyV"), keysDown: [mod, "KeyV"] });
      await t.step({ ...keys("KeyA"), keysDown: [mod, "KeyA"] });
      expect(t.a.typed.endsWith("v"), mod).toBe(false);
      expect(t.a.typed.endsWith("a"), mod).toBe(false);
      await t.step(keys("Enter"));
      await flush();
      expect(t.opens, mod).toEqual([KEY]);
    }
  });

  it("finds the key in a link longer than the paste limit", async () => {
    const t = setup(() => new Session(CARDS));
    t.a.start();
    t.pastes[0](`https://palabras.mcord.dev/?${"x=1&".repeat(100)}pair=${KEY}`);
    expect(t.a.typed).toBe(KEY);
  });

  it("uses a remembered key without asking", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).saveKey(KEY);
    const t = setup(() => new Session(CARDS), { storage });
    t.a.start();
    await flush();
    expect(t.a.phase).toBe("front");
    expect(t.opens).toEqual([KEY]);
  });

  it("forgets a key the server does not accept and asks again", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).saveKey(KEY);
    const t = setup(() => "bad-key", { storage });
    t.a.start();
    await flush();
    expect(t.a.phase).toBe("key");
    expect(t.store.key()).toBeNull();
    expect(t.a.message).toMatch(/not accepted/i);
  });

  it("does not remember a key that was never accepted, and says so offline", async () => {
    const t = setup(() => "offline");
    t.a.start();
    t.a.typed = KEY;
    await t.step(keys("Enter"));
    await flush();
    expect(t.a.phase).toBe("problem");
    expect(t.a.message).toMatch(/no connection/i);
    expect(t.store.key()).toBeNull();
    await t.step(E);
    expect(t.a.done).toBe(true);
    expect(t.a.result).toEqual({ completed: false, quiet: true });
  });

  it("treats a backend that throws as no connection", async () => {
    const t = setup(() => Promise.reject(new Error("boom")));
    t.a.start();
    t.a.typed = KEY;
    await t.step(keys("Enter"));
    await flush();
    expect(t.a.phase).toBe("problem");
  });

  it("reads letters (so M does not mute) only while the key is typed", async () => {
    const t = setup(() => new Session(CARDS));
    t.a.start();
    expect(t.a.readsLetters).toBe(true);
    t.a.typed = KEY;
    await t.step(keys("Enter"));
    await flush();
    expect(t.a.readsLetters).toBe(false);
  });
});

async function studying(options: Parameters<typeof setup>[1] = {}, cards = CARDS) {
  const storage = options.storage ?? new FakeStorage();
  new StudyStore(storage).saveKey(KEY);
  const session = new Session(cards);
  const t = setup(() => session, { ...options, storage });
  t.a.start();
  await flush();
  return { ...t, session };
}

describe("FlashcardsActivity: studying", () => {
  it("shows the front, flips on E, and grades with the arrows and E", async () => {
    const t = await studying();
    expect(t.a.phase).toBe("front");
    expect(t.a.card?.prompt).toBe("one");
    await t.step(E);
    expect(t.a.phase).toBe("back");
    expect(t.a.selected).toBe(0);
    await t.step(right);
    expect(t.a.selected).toBe(1);
    await t.step(E);
    await flush();
    expect(t.session.graded).toEqual([{ slug: "a", grade: "gotit" }]);
    expect(t.a.phase).toBe("front");
    expect(t.a.card?.slug).toBe("b");
  });

  it("sends a miss back a few places on and keeps asking until the queue is done", async () => {
    const t = await studying();
    await t.step(E);
    await t.step(E); // again is the default selection
    await flush();
    expect(t.a.queue).toEqual(["a", "b", "c", "a"]);
    for (let i = 0; i < 3; i++) {
      await t.step(E);
      await t.step(right);
      await t.step(E);
      await flush();
    }
    expect(t.a.phase).toBe("done");
    expect(t.a.message).toBe("3 got it, 1 again.");
    expect(t.session.graded.map((g) => g.grade)).toEqual(["again", "gotit", "gotit", "gotit"]);
    await t.step(E);
    expect(t.a.result).toEqual({ completed: false, quiet: true });
  });

  it("answers with the number keys too", async () => {
    const t = await studying();
    await t.step(E);
    await t.step(keys("Digit2"));
    await flush();
    expect(t.session.graded[0].grade).toBe("gotit");
  });

  it("pays for delivered got-it cards, not for again, and stops at the daily cap", async () => {
    const many = Array.from({ length: F.dailyCardCap + 3 }, (_, i): CardView => ({ slug: `c${i}`, prompt: "p", answer: "a" }));
    const t = await studying({}, many);
    await t.step(E);
    await t.step(E); // again
    await flush();
    expect(t.f.rewards).toHaveLength(0);
    for (let i = 0; i < F.dailyCardCap + 3; i++) {
      await t.step(E);
      await t.step(right);
      await t.step(E);
      await flush();
    }
    expect(t.f.rewards).toHaveLength(F.dailyCardCap);
    expect(t.f.rewards.every((r) => r.points === F.pointsPerCard)).toBe(true);
  });

  it("pays nothing when the backend does not pay", async () => {
    const t = await studying({ paysPoints: false });
    await t.step(E);
    await t.step(right);
    await t.step(E);
    await flush();
    expect(t.f.rewards).toHaveLength(0);
    expect(t.session.graded).toHaveLength(1);
  });

  it("a failed delivery says so, pays nothing and does not move on", async () => {
    const t = await studying();
    t.session.online = false;
    await t.step(E);
    await t.step(right);
    await t.step(E);
    await flush();
    expect(t.a.phase).toBe("problem");
    expect(t.a.message).toMatch(/not saved/i);
    expect(t.f.rewards).toHaveLength(0);
    expect(t.a.index).toBe(0);
    expect(t.session.graded).toHaveLength(0);
  });

  it("says when nothing is due", async () => {
    const t = await studying({}, []);
    expect(t.a.phase).toBe("done");
    expect(t.a.message).toMatch(/nothing is due/i);
  });

  it("ignores input while saving and an answer that lands after Escape", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).saveKey(KEY);
    let release!: (ok: boolean) => void;
    const session = new DemoSession(CARDS);
    session.grade = () => new Promise<boolean>((r) => (release = r));
    const t = setup(() => session, { storage });
    t.a.start();
    await flush();
    await t.step(E);
    await t.step(right);
    await t.step(E);
    expect(t.a.phase).toBe("saving");
    await t.step(E);
    await t.step(keys("Digit1"));
    expect(t.a.phase).toBe("saving");
    t.a.cancel();
    release(true);
    await flush();
    expect(t.a.done).toBe(true);
    expect(t.a.result.completed).toBe(false);
    expect(t.f.rewards).toHaveLength(0);
  });

  it("Escape (cancel) leaves from any phase and stops listening for pastes", async () => {
    const t = setup(() => new Session(CARDS));
    t.a.start();
    expect(t.pastes).toHaveLength(1);
    t.a.cancel();
    expect(t.a.done).toBe(true);
    expect(t.pastes).toHaveLength(0);
  });

  it("ignores a paste outside the key screen", async () => {
    const t = await studying();
    expect(t.pastes).toHaveLength(1);
    t.pastes[0]("whatever");
    expect(t.a.typed).toBe("");
  });

  it("draws every phase without throwing, with accents", async () => {
    const calls: unknown[] = [];
    const canvas = () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) });
    vi.stubGlobal("document", { createElement: canvas });
    const ctx = new Proxy({}, { get: () => (...args: unknown[]) => calls.push(args), set: () => true }) as unknown as CanvasRenderingContext2D;
    const accents: CardView[] = [{ slug: "x", prompt: "song, a very long english prompt of thirty one", answer: "canción", hint: "ñ á é í ó ú" }];
    const t = await studying({}, accents);
    const screen = { width: 320, height: 192 };
    const k = setup(() => new Session(CARDS));
    k.a.start();
    k.a.draw(ctx, screen);
    t.a.draw(ctx, screen);
    await t.step(E);
    t.a.draw(ctx, screen);
    vi.unstubAllGlobals();
    expect(calls.length).toBeGreaterThan(0);
  });
});

describe("FlashcardsActivity: mumblespeak", () => {
  const spoken = (cards: CardView[]) => studying({}, cards);
  const run = async (t: Awaited<ReturnType<typeof studying>>, seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) t.a.update(1 / 60, NO_INPUT);
  };

  it("speaks the answer when the card is turned over, one blip per letter", async () => {
    const t = await spoken([{ slug: "a", prompt: "one", answer: "uno" }]);
    await run(t, 1);
    expect(t.f.voices).toHaveLength(0); // the English side is silent
    await t.step(E);
    await run(t, 1);
    expect(t.f.voices).toHaveLength(3);
  });

  it("speaks the front when that is the Spanish side, and R says it again", async () => {
    const t = await spoken([{ slug: "a", prompt: "perro", answer: "dog", spoken: "perro", speaks: "front" }]);
    await run(t, 1);
    expect(t.f.voices).toHaveLength(5);
    await t.step(keys("KeyR"));
    await run(t, 1);
    expect(t.f.voices).toHaveLength(10);
    await t.step(E);
    await run(t, 1);
    expect(t.f.voices).toHaveLength(10); // turning it over does not repeat it
  });

  it("R says it again only when the Spanish is showing, and not with Shift held", async () => {
    const t = await spoken([{ slug: "a", prompt: "one", answer: "uno" }]);
    await t.step(keys("KeyR"));
    await run(t, 1);
    expect(t.f.voices).toHaveLength(0);
    await t.step(E);
    await run(t, 1);
    await t.step({ ...keys("KeyR"), keysDown: ["ShiftLeft", "KeyR"] });
    await run(t, 1);
    expect(t.f.voices).toHaveLength(3);
    await t.step(keys("KeyR"));
    await run(t, 1);
    expect(t.f.voices).toHaveLength(6);
  });

  it("stops speaking when an answer is given or the activity ends", async () => {
    const t = await spoken([{ slug: "a", prompt: "one", answer: "a very long answer indeed" }]);
    await t.step(E);
    t.a.update(0.1, NO_INPUT);
    const heard = t.f.voices.length;
    expect(heard).toBeGreaterThan(0);
    await t.step(keys("Digit2"));
    await run(t, 3);
    expect(t.f.voices).toHaveLength(heard);
    const u = await spoken([{ slug: "a", prompt: "one", answer: "a very long answer indeed" }]);
    await u.step(E);
    u.a.cancel();
    const after = u.f.voices.length;
    await run(u, 3);
    expect(u.f.voices).toHaveLength(after);
  });
});
