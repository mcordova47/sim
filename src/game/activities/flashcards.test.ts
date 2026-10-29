import { describe, expect, it, vi } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import type { ClipboardLike } from "../../input/clipboard";
import { NO_INPUT, type Controls } from "../../input/controls";
import { FLASHCARDS as F } from "../config";
import { DemoSession, EMPTY_OVERVIEW, demoBackendFor } from "../flashcards/demo";
import { guestBackend, guestStorageKey } from "../flashcards/guest";
import { StudyStore } from "../flashcards/key";
import type { Core } from "../flashcards/core";
import type { CardView, Grade, OpenResult, StudyBackend } from "../flashcards/study";
import { FlashcardsActivity, PROGRESS_LAYOUT } from "./flashcards";
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
  // Never the real guest backend, which fetches the flashcards core over the network (issue 121): a test
  // that reaches the guest path by mistake fails loudly here instead of racing a real request.
  const noGuest: StudyBackend = {
    paysPoints: false,
    usesKey: false,
    open: async () => {
      throw new Error("These tests inject no guest backend; set t.a.phase = \"key\" to type a key");
    },
  };
  const a = new FlashcardsActivity(f.host, backend, store, clipboard, noGuest);
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
    t.a.phase = "key"; // past the choice screen (tested below)
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
    t.a.phase = "key"; // past the choice screen (tested below)
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
      t.a.phase = "key"; // past the choice screen (tested below)
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
    t.a.phase = "key"; // past the choice screen (tested below)
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
    t.a.phase = "key"; // past the choice screen (tested below)
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
    t.a.phase = "key"; // past the choice screen (tested below)
    t.a.typed = KEY;
    await t.step(keys("Enter"));
    await flush();
    expect(t.a.phase).toBe("problem");
  });

  it("reads letters (so M does not mute) only while the key is typed", async () => {
    const t = setup(() => new Session(CARDS));
    t.a.start();
    t.a.phase = "key"; // past the choice screen (tested below)
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

describe("FlashcardsActivity: the progress page", () => {
  const fixed = { total: 1000, seen: 312, mastered: 127, dueNow: 0, dueTomorrow: 9, nextDueIn: 5 * 3_600_000 };
  const ready = async (cards: CardView[], overview: typeof fixed | null, empty: boolean, options: Parameters<typeof setup>[1] = {}) => {
    const storage = options.storage ?? new FakeStorage();
    new StudyStore(storage).saveKey(KEY);
    const session = new DemoSession(cards, overview, empty);
    const t = setup(() => session, { ...options, storage });
    t.a.start();
    await flush();
    return { ...t, session };
  };

  it("shows when the queue is empty at open, with the figures, and E leaves with no points", async () => {
    const t = await ready(CARDS, fixed, true);
    expect(t.a.phase).toBe("done");
    expect(t.a.summary?.mastered).toBe(127);
    expect(t.a.progressLines().map((l) => l.text)).toContain("127 of 1000 words known");
    await t.step(E);
    expect(t.a.done).toBe(true);
    expect(t.a.result.completed).toBe(false);
    expect(t.f.rewards).toHaveLength(0);
    expect(t.session.graded).toHaveLength(0);
  });

  it("Escape leaves it too, and Enter", async () => {
    const t = await ready(CARDS, fixed, true);
    t.a.cancel();
    expect(t.a.done).toBe(true);
    expect(t.f.rewards).toHaveLength(0);
    const u = await ready(CARDS, fixed, true);
    await u.step(keys("Enter"));
    expect(u.a.done).toBe(true);
  });

  it("shows after the last card, from the progress as it stands, and pays only for the answers", async () => {
    const t = await ready(CARDS.slice(0, 1), null, false);
    await t.step(E);
    await t.step(right);
    await t.step(E);
    await flush();
    expect(t.a.phase).toBe("done");
    expect(t.a.summary).toMatchObject({ total: 1, seen: 1, mastered: 1, dueNow: 0 });
    const texts = t.a.progressLines().map((l) => l.text);
    expect(texts).toContain("This time: 1 got it, 0 again.");
    expect(t.f.rewards).toHaveLength(1);
    const rewards = t.f.rewards.length;
    for (let i = 0; i < 3; i++) await t.step(NO_INPUT);
    expect(t.f.rewards).toHaveLength(rewards); // showing the page pays nothing more
  });

  it("with a backend that has no figures, shows only the plain line (as before)", async () => {
    const t = await studying({}, []);
    expect(t.a.summary).toBeNull();
    expect(t.a.progressLines()).toEqual([]);
    expect(t.a.message).toMatch(/nothing is due/i);
  });

  it("a backend whose progress throws shows the plain line", async () => {
    const session = new DemoSession(CARDS, fixed, true);
    session.progress = () => {
      throw new Error("boom");
    };
    const storage = new FakeStorage();
    new StudyStore(storage).saveKey(KEY);
    const t = setup(() => session, { storage });
    t.a.start();
    await flush();
    expect(t.a.phase).toBe("done");
    expect(t.a.summary).toBeNull();
  });

  it("the practice deck's empty set, and its end of a session, show the page", async () => {
    const f = fakeHost();
    const a = new FlashcardsActivity(f.host, demoBackendFor("empty"), new StudyStore(new FakeStorage()), {
      copy: async () => true,
      read: async () => null,
      onPaste: () => () => {},
    });
    a.start();
    await flush();
    expect(a.phase).toBe("done");
    expect(a.summary).toMatchObject({ total: EMPTY_OVERVIEW.total, mastered: EMPTY_OVERVIEW.mastered });
    expect(f.rewards).toHaveLength(0);
  });

  it("stays inside the box and above the leave line, in the longest page, at both box heights", async () => {
    const canvas = () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) });
    vi.stubGlobal("document", { createElement: canvas });
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    const worst = { total: 1000, seen: 1000, mastered: 400, dueNow: 12, dueTomorrow: 9, nextDueIn: 3 * 86_400_000 };
    const t = await ready(CARDS, worst, true);
    t.a.gotIt = 999;
    t.a.again = 999;
    t.a.paid = 99;
    t.a.draw(ctx, { width: 320, height: 192 });
    vi.unstubAllGlobals();
    // The last line's top plus a glyph's height is above the leave line.
    const L = PROGRESS_LAYOUT;
    let ty: number = L.textY;
    for (const item of t.a.progressLines()) ty += (item.gap ?? 0) + L.row;
    const bottom = ty - L.row + 7;
    expect(bottom).toBeLessThanOrEqual(120 - L.leaveFromBottom);
    expect(L.barY + L.barH).toBeLessThan(L.textY);
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

// Studying without a key (issue 089).
describe("FlashcardsActivity: a guest", () => {
  const read = (p: string | null): Record<string, number> => (p ? JSON.parse(p) : {});
  const core = (): Core => ({
    version: 1,
    session: (p) => ["a", "b", "c"].filter((s) => !(s in read(p))),
    card: (_p, slug) => ({ slug, prompt: slug, answers: [`${slug}1`], example: "", direction: "recognition" }),
    grade: (p, slug) => JSON.stringify({ ...read(p), [slug]: 1 }),
    merge: () => "{}",
    requeue: (slug, position, queue) => [...queue.slice(0, position + 1), slug, ...queue.slice(position + 1)],
  });
  const down: Controls = { ...NO_INPUT, dir: "down", dirPressed: "down" };

  function guestSetup(options: { storage?: FakeStorage | null; core?: Core; keyBackend?: () => Promise<OpenResult> | OpenResult } = {}) {
    const storage = options.storage === undefined ? new FakeStorage() : options.storage;
    const t = setup(options.keyBackend ?? (() => new Session(CARDS)), { storage: storage ?? undefined });
    const backend = guestBackend({ core: async () => options.core ?? core(), storage, now: () => 1000 });
    const a = new FlashcardsActivity(t.f.host, { paysPoints: true, open: async (k) => (t.opens.push(k), (options.keyBackend ?? (() => new Session(CARDS)))()) }, t.store, { copy: async () => true, read: async () => null, onPaste: () => () => {} }, backend);
    const step = async (c: Controls = NO_INPUT) => {
      a.update(1 / 60, c);
      await flush();
    };
    return { ...t, a, step, storage };
  }

  it("shows a choice with no key and no saved mode; guest studies and the key path is never asked", async () => {
    const t = guestSetup();
    t.a.start();
    expect(t.a.phase).toBe("choice");
    await t.step(E);
    await flush();
    expect(t.a.phase).toBe("front");
    expect(t.opens).toEqual([]); // the key backend (the progress endpoint) was never asked
    expect(t.store.mode()).toBe("guest");
    await t.step(E);
    await t.step(E); // got it? cursor starts on Again, so move right first
    expect(t.a.again + t.a.gotIt).toBe(1);
  });

  it("pays a saved got-it with the usual rule, and writes the blob", async () => {
    const t = guestSetup();
    t.a.start();
    await t.step(E);
    await flush();
    await t.step(E);
    await t.step(right);
    await t.step(E);
    expect(t.a.gotIt).toBe(1);
    expect(t.f.rewards).toHaveLength(1);
    expect(t.storage!.getItem(guestStorageKey())).toBe('{"a":1}');
  });

  it("a guest's second visit shows the choice screen, with the cursor on 'Study without a key'", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).setMode("guest");
    const t = guestSetup({ storage });
    t.a.start();
    await flush();
    expect(t.a.phase).toBe("choice");
    expect(t.a.chosen).toBe(0);
    expect(t.opens).toEqual([]);
  });

  it("choosing the first item continues the saved guest session, cards untouched", async () => {
    const storage = new FakeStorage();
    storage.setItem(guestStorageKey(), '{"a":1}');
    new StudyStore(storage).setMode("guest");
    const t = guestSetup({ storage });
    t.a.start();
    await t.step(E);
    await flush();
    expect(t.a.phase).toBe("front");
    expect(t.a.guest).toBe(true);
    expect(storage.getItem(guestStorageKey())).toBe('{"a":1}');
    expect(t.opens).toEqual([]);
  });

  it("choosing the second item reaches the key screen; Escape leaves with the guest mode and cards untouched", async () => {
    const storage = new FakeStorage();
    storage.setItem(guestStorageKey(), '{"a":1}');
    new StudyStore(storage).setMode("guest");
    const t = guestSetup({ storage });
    t.a.start();
    const before = storage.getItem(F.storageKey);
    await t.step({ ...NO_INPUT, dir: "down", dirPressed: "down" });
    await t.step(E);
    expect(t.a.phase).toBe("key");
    t.a.cancel();
    expect(t.a.done).toBe(true);
    expect(new StudyStore(storage).mode()).toBe("guest");
    expect(storage.getItem(F.storageKey)).toBe(before);
    expect(storage.getItem(guestStorageKey())).toBe('{"a":1}');
    expect(new StudyStore(storage).key()).toBeNull();
  });

  it("a saved key still goes straight to the cards, and so does a guest mode saved beside a key", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).saveKey(KEY);
    const keyHolder = guestSetup({ storage });
    keyHolder.a.start();
    await flush();
    expect(keyHolder.a.phase).toBe("front");
    expect(keyHolder.a.guest).toBe(false);
    new StudyStore(storage).setMode("guest");
    const both = guestSetup({ storage });
    both.a.start();
    await flush();
    expect(both.a.phase).toBe("front");
    expect(both.a.guest).toBe(true);
  });

  it("with blocked storage studies unsaved, warns, and pays nothing", async () => {
    const t = guestSetup({ storage: null });
    t.a.start();
    await t.step(E);
    await flush();
    expect(t.a.phase).toBe("front");
    await t.step(E);
    await t.step(right);
    await t.step(E);
    expect(t.a.gotIt).toBe(1);
    expect(t.f.rewards).toHaveLength(0);
    expect(t.a.paid).toBe(0);
    // The warning is drawn without throwing.
    vi.stubGlobal("document", { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) });
    const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
    expect(() => t.a.draw(ctx, { width: 320, height: 192 })).not.toThrow();
    t.a.phase = "done";
    expect(() => t.a.draw(ctx, { width: 320, height: 192 })).not.toThrow();
    vi.unstubAllGlobals();
    expect(t.a.session!.unsaved).toBe(true);
  });

  it("offers Start again, with one confirm, when the core refuses the saved cards", async () => {
    const storage = new FakeStorage();
    storage.setItem(guestStorageKey(), "damaged");
    const refusing: Core = { ...core(), session: (p) => (p === "damaged" ? (() => { throw new Error("no"); })() : ["a"]) };
    new StudyStore(storage).setMode("guest");
    const t = guestSetup({ storage, core: refusing });
    t.a.start();
    await t.step(E);
    await flush();
    expect(t.a.phase).toBe("problem");
    expect(storage.getItem(guestStorageKey())).toBe("damaged");
    await t.step(keys("KeyY")); // no confirm yet: nothing happens
    expect(storage.getItem(guestStorageKey())).toBe("damaged");
    await t.step(keys("KeyS"));
    expect(storage.getItem(guestStorageKey())).toBe("damaged");
    await t.step(keys("KeyY"));
    await flush();
    expect(storage.getItem(guestStorageKey())).toBeNull();
    expect(t.a.phase).toBe("front");
  });

  it("entering a key leaves the guest's cards untouched and never reads them; leaving the key returns to them", async () => {
    const storage = new FakeStorage();
    storage.setItem(guestStorageKey(), '{"a":1}');
    const t = guestSetup({ storage });
    t.a.start();
    await t.step(down);
    await t.step(E);
    expect(t.a.phase).toBe("key");
    t.pastes[0]?.(KEY);
    t.a.typed = KEY;
    await t.step(keys("Enter"));
    await flush();
    expect(t.opens).toEqual([KEY]);
    expect(t.store.key()).toBe(KEY);
    expect(t.store.mode()).toBeNull();
    expect(storage.getItem(guestStorageKey())).toBe('{"a":1}');
    // Finish the session quickly and switch with G: back to the guest's own cards.
    t.a.phase = "done";
    await t.step(keys("KeyG"));
    await flush();
    expect(t.a.phase).toBe("front");
    expect(t.a.queue).toEqual(["b", "c"]);
    expect(t.store.key()).toBe(KEY); // the key stays saved
  });

  it("K from a key holder opens the key screen but keeps the saved key (leaving with Escape changes nothing)", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).saveKey(KEY);
    const t = guestSetup({ storage });
    t.a.start();
    await flush();
    t.a.phase = "done";
    const before = storage.getItem(F.storageKey);
    await t.step(keys("KeyK"));
    expect(t.a.phase).toBe("key");
    expect(t.store.key()).toBe(KEY);
    expect(storage.getItem(F.storageKey)).toBe(before); // Escape would leave exactly this
    expect(new StudyStore(storage).key()).toBe(KEY);
  });

  it("a different key from K that the server refuses leaves the saved key; one that is accepted replaces it", async () => {
    const OTHER = "zyxwvutsrq9876543210zyxwvutsrq98";
    const storage = new FakeStorage();
    new StudyStore(storage).saveKey(KEY);
    const t = guestSetup({ storage, keyBackend: () => (t.opens[t.opens.length - 1] === OTHER && refuse ? "bad-key" : new Session(CARDS)) });
    let refuse = true;
    t.a.start();
    await flush();
    t.a.phase = "done";
    await t.step(keys("KeyK"));
    t.a.typed = OTHER;
    await t.step(keys("Enter"));
    await flush();
    expect(t.a.phase).toBe("key");
    expect(t.a.message).toMatch(/not accepted/i);
    expect(t.store.key()).toBe(KEY);
    refuse = false;
    t.a.typed = OTHER;
    await t.step(keys("Enter"));
    await flush();
    expect(t.store.key()).toBe(OTHER);
  });

  it("K from a guest with no saved key changes nothing until a key is accepted", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).setMode("guest");
    const t = guestSetup({ storage });
    t.a.start();
    await flush();
    t.a.phase = "done";
    const before = storage.getItem(F.storageKey);
    await t.step(keys("KeyK"));
    expect(t.a.phase).toBe("key");
    expect(storage.getItem(F.storageKey)).toBe(before);
    expect(new StudyStore(storage).mode()).toBe("guest");
  });

  it("a guest's answer the core could not record says so without 'no connection'", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).setMode("guest");
    const t = guestSetup({ storage, core: { ...core(), grade: () => { throw new Error("bad"); } } });
    t.a.start();
    await flush();
    await t.step(E);
    await t.step(E);
    await t.step(E);
    expect(t.a.phase).toBe("problem");
    expect(t.a.message).toBe("That answer was not saved.");
  });

  it("does not offer the switch mid-card", async () => {
    const storage = new FakeStorage();
    new StudyStore(storage).setMode("guest");
    const t = guestSetup({ storage });
    t.a.start();
    await t.step(E);
    await flush();
    await t.step(keys("KeyK"));
    expect(t.a.phase).toBe("front");
    expect(t.a.guest).toBe(true);
  });

  it("leaves the practice deck alone: no choice screen, practice layout and voices", async () => {
    const t = setup(() => new DemoSession(CARDS), { paysPoints: false });
    const a = new FlashcardsActivity(t.f.host, demoBackendFor(null, null), t.store, { copy: async () => true, read: async () => null, onPaste: () => () => {} });
    a.start();
    await flush();
    expect(a.phase).toBe("front");
    expect(a.guest).toBe(false);
  });
});
