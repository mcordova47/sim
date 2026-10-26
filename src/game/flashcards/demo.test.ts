import { describe, expect, it } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import { NO_INPUT } from "../../input/controls";
import { unsupportedChars } from "../../render/font";
import { FlashcardsActivity } from "../activities/flashcards";
import { fakeHost } from "../activities/fake-host";
import { wrapText } from "../dialog";
import { wantsDemo } from "./backend";
import { DEMO_CARDS, demoBackend } from "./demo";
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
    const a = new FlashcardsActivity(f.host, demoBackend, store, clipboard);
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
});
