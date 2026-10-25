import { describe, expect, it } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import { FLASHCARDS as F } from "../config";
import { isKey, keyFromText, StudyStore } from "./key";

const KEY = "abcdefghij0123456789abcdefghij01";

describe("keyFromText (same rule as the app's keyFromLink)", () => {
  it("takes a bare key, with whitespace around it", () => {
    expect(keyFromText(KEY)).toBe(KEY);
    expect(keyFromText(`  ${KEY}\n`)).toBe(KEY);
  });

  it("takes a pairing link", () => {
    expect(keyFromText(`https://palabras.mcord.dev/?pair=${KEY}`)).toBe(KEY);
    expect(keyFromText(`https://palabras.mcord.dev/?x=1&pair=${KEY}#top`)).toBe(KEY);
    expect(keyFromText(`https://palabras.mcord.dev/#pair=${KEY}`)).toBe(KEY);
  });

  it("refuses anything that is not a key of the right shape", () => {
    expect(keyFromText("")).toBeNull();
    expect(keyFromText(KEY.slice(1))).toBeNull();
    expect(keyFromText(KEY + "a")).toBeNull();
    expect(keyFromText(KEY.toUpperCase())).toBeNull();
    expect(keyFromText(KEY.replace("a", "-"))).toBeNull();
    expect(keyFromText(`https://palabras.mcord.dev/?pair=${KEY.slice(1)}`)).toBeNull();
    expect(keyFromText(`https://palabras.mcord.dev/?sync`)).toBeNull();
    expect(keyFromText(`https://palabras.mcord.dev/?pairing=${KEY}`)).toBeNull();
    expect(isKey("x")).toBe(false);
  });
});

describe("StudyStore", () => {
  it("remembers the key and forgets it", () => {
    const storage = new FakeStorage();
    const a = new StudyStore(storage);
    expect(a.key()).toBeNull();
    a.saveKey(KEY);
    expect(new StudyStore(storage).key()).toBe(KEY);
    a.forgetKey();
    expect(new StudyStore(storage).key()).toBeNull();
  });

  it("works with no storage and with damaged storage", () => {
    const none = new StudyStore(null);
    none.saveKey(KEY);
    expect(none.key()).toBe(KEY);
    for (const bad of ["{", "[]", "3", '{"key":5,"paid":"x"}', '{"key":"short"}']) {
      const storage = new FakeStorage();
      storage.setItem(F.storageKey, bad);
      const s = new StudyStore(storage);
      expect(s.key()).toBeNull();
      expect(s.paidLeft()).toBe(F.dailyCardCap);
    }
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    };
    expect(() => new StudyStore(throwing).saveKey(KEY)).not.toThrow();
  });

  it("pays up to the daily cap, then stops until the window has passed", () => {
    const storage = new FakeStorage();
    let now = 0;
    const s = new StudyStore(storage);
    s.clock = () => now;
    for (let i = 0; i < F.dailyCardCap; i++) expect(s.claimCard()).toBe(true);
    expect(s.paidLeft()).toBe(0);
    expect(s.claimCard()).toBe(false);
    now += F.capResetHours * 60 - 1;
    expect(s.claimCard()).toBe(false);
    now += 2;
    expect(s.paidLeft()).toBe(F.dailyCardCap);
    expect(s.claimCard()).toBe(true);
    expect(s.paidLeft()).toBe(F.dailyCardCap - 1);
  });

  it("keeps the cap across a reload", () => {
    const storage = new FakeStorage();
    const a = new StudyStore(storage);
    for (let i = 0; i < 5; i++) a.claimCard();
    const b = new StudyStore(storage);
    expect(b.paidLeft()).toBe(F.dailyCardCap - 5);
  });
});
