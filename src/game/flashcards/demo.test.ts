import { describe, expect, it, vi } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import { NO_INPUT } from "../../input/controls";
import { unsupportedChars } from "../../render/font";
import { FlashcardsActivity } from "../activities/flashcards";
import { fakeHost } from "../activities/fake-host";
import { wrapText } from "../dialog";
import { wantsDemo } from "./backend";
import { DEMO_CARDS, DEMO_SETS, DemoSession, demoBackendFor } from "./demo";
import { VOICE_STYLES } from "./mumble";
import { isGap, readIpa } from "./ipa";
import { FLASHCARDS as F } from "../config";
import { StudyStore } from "./key";

describe("the practice deck", () => {
  it("has both kinds of card, unique slugs, and every card names what is spoken", () => {
    expect(new Set(DEMO_CARDS.map((c) => c.slug)).size).toBe(DEMO_CARDS.length);
    expect(DEMO_CARDS.some((c) => c.speaks === "front")).toBe(true);
    expect(DEMO_CARDS.some((c) => c.speaks === "back")).toBe(true);
    for (const c of DEMO_CARDS) {
      expect(c.spoken, c.slug).toBeTruthy();
      expect([c.prompt, c.answer], c.slug).toContain(c.spoken);
    }
  });

  it("is drawable by the font and fits the card panel (two lines at most)", () => {
    for (const c of DEMO_CARDS) {
      const text = [c.prompt, c.answer, c.hint ?? ""].join(" ");
      expect(unsupportedChars(text), c.slug).toEqual([]);
      for (const part of [c.prompt, c.answer, c.hint ?? ""]) expect(wrapText(part, 248).length, c.slug).toBeLessThanOrEqual(2);
    }
  });

  it("is asked for by ?flashcards=demo in a dev build only", () => {
    expect(wantsDemo("?flashcards=demo", true)).toBe(true);
    expect(wantsDemo("?a=1&flashcards=demo", true)).toBe(true);
    expect(wantsDemo("?flashcards=demo", false)).toBe(false);
    expect(wantsDemo("?flashcards=real", true)).toBe(false);
    expect(wantsDemo("", true)).toBe(false);
  });

  it("skips the key screen, never remembers a key and pays nothing", async () => {
    const f = fakeHost();
    const storage = new FakeStorage();
    const store = new StudyStore(storage);
    const clipboard = { copy: async () => true, read: async () => null, onPaste: () => () => {} };
    const a = new FlashcardsActivity(f.host, demoBackendFor(null), store, clipboard);
    a.start();
    await new Promise((r) => setTimeout(r, 0));
    expect(a.phase).toBe("front");
    expect(store.key()).toBeNull();
    expect(storage.data.size).toBe(0);
    expect(a.queue).toHaveLength(DEMO_CARDS.length);
    a.update(1 / 60, { ...NO_INPUT, interactPressed: true });
    a.update(1 / 60, { ...NO_INPUT, dir: "right", dirPressed: "right" });
    a.update(1 / 60, { ...NO_INPUT, interactPressed: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(f.rewards).toHaveLength(0);
    expect(storage.data.size).toBe(0);
  });

  it("voices a card by its IPA, V switches to spelling, and R repeats in the chosen voice", async () => {
    const f = fakeHost();
    const clipboard = { copy: async () => true, read: async () => null, onPaste: () => () => {} };
    const a = new FlashcardsActivity(f.host, demoBackendFor("words"), new StudyStore(new FakeStorage()), clipboard);
    a.start();
    await new Promise((r) => setTimeout(r, 0));
    const run = (seconds: number) => {
      for (let i = 0; i < Math.round(seconds * 60); i++) a.update(1 / 60, NO_INPUT);
    };
    // The first card is "yo", Spanish first, with an IPA transcription: ʝ o.
    run(1);
    expect(f.voices.map((v) => v.effect)).toEqual([F.voice.symbols.j.effect, F.voice.stress.effect]);
    f.voices.length = 0;
    // V steps ipa -> formants -> intonation -> jitter -> filtered -> filtered+ -> spelling.
    for (let i = 0; i < 6; i++) a.update(1 / 60, { ...NO_INPUT, keys: ["KeyV"], keysDown: ["KeyV"] });
    expect(a.voiceStyle).toBe(0);
    f.voices.length = 0;
    run(1);
    expect(f.voices.map((v) => v.effect)).toEqual(["mumble", "mumble"]);
    f.voices.length = 0;
    a.update(1 / 60, { ...NO_INPUT, keys: ["KeyR"], keysDown: ["KeyR"] });
    run(1);
    expect(f.voices.every((v) => v.effect === "mumble")).toBe(true);
    // Shift+V does nothing.
    a.update(1 / 60, { ...NO_INPUT, keys: ["KeyV"], keysDown: ["ShiftLeft", "KeyV"] });
    expect(a.voiceStyle).toBe(0);
  });

  it("falls back to the spelling voice when the transcription gives no sounds", async () => {
    for (const ipa of ["", "ʔʔ", "ˈ", "/ /", "🙂"]) {
      const f = fakeHost();
      const clipboard = { copy: async () => true, read: async () => null, onPaste: () => () => {} };
      const backend = { paysPoints: false, usesKey: false, open: async () => new DemoSession([{ slug: "a", prompt: "perro", answer: "dog", spoken: "perro", ipa, speaks: "front" }]) };
      const a = new FlashcardsActivity(f.host, backend, new StudyStore(new FakeStorage()), clipboard);
      a.start();
      await new Promise((r) => setTimeout(r, 0));
      for (let i = 0; i < 120; i++) a.update(1 / 60, NO_INPUT);
      expect(f.voices.map((v) => v.effect), JSON.stringify(ipa)).toEqual(["mumble", "mumble", "mumble", "mumble", "mumble"]);
    }
  });

  it("does not break when a card carries a non-text transcription", async () => {
    const f = fakeHost();
    const clipboard = { copy: async () => true, read: async () => null, onPaste: () => () => {} };
    const card = { slug: "a", prompt: "perro", answer: "dog", spoken: "perro", ipa: 5 as unknown as string, speaks: "front" as const };
    const backend = { paysPoints: false, usesKey: false, open: async () => new DemoSession([card]) };
    const a = new FlashcardsActivity(f.host, backend, new StudyStore(new FakeStorage()), clipboard);
    a.start();
    await new Promise((r) => setTimeout(r, 0));
    for (let i = 0; i < 120; i++) a.update(1 / 60, NO_INPUT);
    a.update(1 / 60, { ...NO_INPUT, keys: ["KeyR"], keysDown: ["KeyR"] });
    expect(f.voices.length).toBeGreaterThan(0);
    expect(f.voices.every((v) => v.effect === "mumble")).toBe(true);
  });

  it("V cycles through every voice style and back, each saying the card in its own sounds", async () => {
    const f = fakeHost();
    const clipboard = { copy: async () => true, read: async () => null, onPaste: () => () => {} };
    const a = new FlashcardsActivity(f.host, demoBackendFor("words"), new StudyStore(new FakeStorage()), clipboard);
    a.start();
    await new Promise((r) => setTimeout(r, 0));
    const heard: Record<number, { effect?: string; pitch: number; stretch?: number }[]> = {};
    for (let n = 0; n < VOICE_STYLES.length; n++) {
      f.voices.length = 0;
      for (let i = 0; i < 90; i++) a.update(1 / 60, NO_INPUT);
      heard[a.voiceStyle] = [...f.voices];
      a.update(1 / 60, { ...NO_INPUT, keys: ["KeyV"], keysDown: ["KeyV"] });
    }
    expect(a.voiceStyle).toBe(F.voice.style); // back where it started
    expect(Object.keys(heard).sort()).toEqual(["0", "1", "2", "3", "4", "5", "6"]);
    expect(heard[1].map((v) => v.effect)).toEqual(["voiceGlideDown", "voiceVowelStress"]);
    expect(heard[2].map((v) => v.effect)).toEqual(["voiceGlideDown", "voiceFormantOStress"]);
    // Intonation and jitter change the pitches of the same sounds, in order.
    expect(heard[3].map((v) => v.effect)).toEqual(heard[2].map((v) => v.effect));
    expect(heard[3].map((v) => v.pitch)).not.toEqual(heard[2].map((v) => v.pitch));
    expect(heard[4].map((v) => v.pitch)).not.toEqual(heard[3].map((v) => v.pitch));
    // The source-filter voice: the vowel is a filtered source, slowed down.
    expect(heard[5].map((v) => v.effect)).toEqual(["voiceGlideDown", "voiceFiltOStress"]);
    expect(heard[5].every((v) => v.stretch === F.voice.slow)).toBe(true);
    expect(heard[6].map((v) => v.effect)).toEqual(heard[5].map((v) => v.effect));
    expect(heard[6].map((v) => v.pitch)).not.toEqual(heard[5].map((v) => v.pitch));
  });

  it("has four sets, picks one by name, and all of them by default", () => {
    expect(Object.keys(DEMO_SETS).sort()).toEqual(["consonants", "diphthongs", "sentences", "words"]);
    expect(DEMO_CARDS).toHaveLength(Object.values(DEMO_SETS).reduce((n, cards) => n + cards.length, 0));
    expect(new Set(DEMO_CARDS.map((c) => c.slug)).size).toBe(DEMO_CARDS.length);
    for (const [name, cards] of Object.entries(DEMO_SETS)) {
      expect(cards.length, name).toBeGreaterThan(1);
    }
    const queue = async (set?: string | null) => {
      const session = (await demoBackendFor(set).open("")) as DemoSession;
      return session.queue();
    };
    return Promise.all([queue("diphthongs"), queue("nope"), queue(null), queue("consonants")]).then(([d, bad, all, c]) => {
      expect(d).toEqual(DEMO_SETS.diphthongs.map((x) => x.slug));
      expect(bad).toEqual(all);
      expect(all).toEqual(DEMO_CARDS.map((x) => x.slug));
      expect(c).toEqual(DEMO_SETS.consonants.map((x) => x.slug));
    });
  });

  it("the sentences between them use every sound the voice has", () => {
    const used = new Set<string>();
    for (const c of DEMO_SETS.sentences) for (const u of readIpa(c.ipa!).units) if (!isGap(u)) used.add(F.voice.symbols[u.symbol] ? u.symbol : F.voice.like[u.symbol]);
    const missing = Object.keys(F.voice.symbols).filter((symbol) => !used.has(symbol));
    // The glides j and w and the affricate are in them; so are all the vowels and consonants.
    expect(missing).toEqual([]);
  });

  it("the consonant cards put each consonant between two a's, and every voiced consonant is there", () => {
    for (const c of DEMO_SETS.consonants) expect(c.ipa).toMatch(/^ˈa.{1,2}a$/);
    const sounds = new Set(DEMO_SETS.consonants.flatMap((c) => readIpa(c.ipa!).units.filter((u) => !isGap(u)).map((u) => (u as { symbol: string }).symbol)));
    for (const consonant of ["b", "d", "ɡ", "p", "t", "k", "f", "s", "x", "tʃ", "m", "n", "ɲ", "l", "ɾ", "r", "ʝ"]) expect(sounds.has(consonant), consonant).toBe(true);
  });

  it("the diphthong cards have glides, two-vowel hiatus and a triphthong, and día differs from Dios", () => {
    const by = (slug: string) => DEMO_SETS.diphthongs.find((c) => c.slug === slug)!;
    const glides = (ipa: string) => readIpa(ipa).units.filter((u) => !isGap(u) && (u.symbol === "j" || u.symbol === "w")).length;
    expect(glides(by("dios").ipa!)).toBe(1);
    expect(glides(by("dia").ipa!)).toBe(0);
    expect(glides(by("estudiais").ipa!)).toBe(2);
    expect(glides(by("uruguay").ipa!)).toBe(2);
    expect(DEMO_SETS.diphthongs.length).toBeGreaterThanOrEqual(15);
  });

  it("draws every practice card, front and back, with its transcription, inside the panel", async () => {
    const drawn: { fn: string; args: unknown[] }[] = [];
    const canvas = () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) });
    vi.stubGlobal("document", { createElement: canvas });
    const ctx = new Proxy({}, { get: (_t, fn: string) => (...args: unknown[]) => drawn.push({ fn, args }), set: () => true }) as unknown as CanvasRenderingContext2D;
    const f = fakeHost();
    const clipboard = { copy: async () => true, read: async () => null, onPaste: () => () => {} };
    const a = new FlashcardsActivity(f.host, demoBackendFor(null), new StudyStore(new FakeStorage()), clipboard);
    a.start();
    await new Promise((r) => setTimeout(r, 0));
    for (let i = 0; i < DEMO_CARDS.length; i++) {
      drawn.length = 0;
      a.draw(ctx, { width: 320, height: 192 });
      a.update(1 / 60, { ...NO_INPUT, interactPressed: true });
      a.draw(ctx, { width: 320, height: 192 });
      // Everything drawn stays on the screen.
      for (const d of drawn.filter((x) => x.fn === "fillRect" || x.fn === "drawImage")) {
        const nums = d.args.filter((v): v is number => typeof v === "number");
        const [px, py, pw, ph] = d.fn === "drawImage" ? nums : nums;
        expect(px, `${i} ${d.fn}`).toBeGreaterThanOrEqual(-1);
        expect(py, `${i} ${d.fn}`).toBeGreaterThanOrEqual(-3);
        expect(px + (pw ?? 0), `${i} ${d.fn}`).toBeLessThanOrEqual(321);
        expect(py + (ph ?? 0), `${i} ${d.fn}`).toBeLessThanOrEqual(193);
      }
      a.update(1 / 60, { ...NO_INPUT, keys: ["Digit1"] });
      await new Promise((r) => setTimeout(r, 0));
    }
    vi.unstubAllGlobals();
  });
});
