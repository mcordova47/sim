import { describe, expect, it } from "vitest";
import { FakeStorage } from "../achievements/fake-storage";
import { SettingsStore } from "./settings";

const KEY = "k";

describe("SettingsStore", () => {
  it("round-trips the settings", () => {
    const storage = new FakeStorage();
    const store = new SettingsStore(storage, KEY);
    expect(store.save({ muted: true, track: "02-b", payoutLeft: 0, dialogVoice: "beep", dialogVoiceChosen: true })).toBe(true);
    expect(new SettingsStore(storage, KEY).load()).toEqual({ muted: true, track: "02-b", payoutLeft: 0, dialogVoice: "beep", dialogVoiceChosen: true });
  });

  it("gives the defaults with nothing saved, with no storage and with damaged data", () => {
    const defaults = { muted: false, track: null, payoutLeft: 0, dialogVoice: "letters", dialogVoiceChosen: false };
    expect(new SettingsStore(new FakeStorage(), KEY).load()).toEqual(defaults);
    expect(new SettingsStore(null, KEY).load()).toEqual(defaults);
    for (const text of ["{", "null", "[]", "5", '"x"', '{"muted":"yes","track":5}']) {
      const storage = new FakeStorage();
      storage.setItem(KEY, text);
      expect(new SettingsStore(storage, KEY).load(), text).toEqual(defaults);
    }
  });

  it("saves the dialog voice, and an old save or a junk value means letters while an explicit beep stays beep (issues 075, 077)", () => {
    const storage = new FakeStorage();
    new SettingsStore(storage, KEY).save({ muted: false, track: null, payoutLeft: 0, dialogVoice: "letters", dialogVoiceChosen: true });
    expect(new SettingsStore(storage, KEY).load().dialogVoice).toBe("letters");
    new SettingsStore(storage, KEY).save({ muted: false, track: null, payoutLeft: 0, dialogVoice: "beep", dialogVoiceChosen: true });
    expect(new SettingsStore(storage, KEY).load().dialogVoice).toBe("beep");
    // An automatic "beep" (the 075 build wrote one into every save), or a beep whose
    // marker is junk, is not a choice (issue 077).
    for (const text of ['{"dialogVoice":"beep"}', '{"dialogVoice":"beep","dialogVoiceChosen":false}', '{"dialogVoice":"beep","dialogVoiceChosen":"true"}', '{"dialogVoice":"beep","dialogVoiceChosen":1}', '{"dialogVoice":"beep","dialogVoiceChosen":null}']) {
      storage.setItem(KEY, text);
      expect(new SettingsStore(storage, KEY).load().dialogVoice, text).toBe("letters");
    }
    storage.setItem(KEY, '{"dialogVoice":"beep","dialogVoiceChosen":true}');
    expect(new SettingsStore(storage, KEY).load()).toMatchObject({ dialogVoice: "beep", dialogVoiceChosen: true });
    for (const text of ['{"muted":true}', '{"dialogVoice":"LETTERS"}', '{"dialogVoice":true}', '{"dialogVoice":["letters"]}']) {
      storage.setItem(KEY, text);
      expect(new SettingsStore(storage, KEY).load().dialogVoice, text).toBe("letters");
    }
  });

  it("fails silently when storage throws", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    const store = new SettingsStore({ getItem: boom, setItem: boom, removeItem: boom }, KEY);
    expect(store.load()).toEqual({ muted: false, track: null, payoutLeft: 0, dialogVoice: "letters", dialogVoiceChosen: false });
    expect(store.save({ muted: true, track: null, payoutLeft: 0, dialogVoice: "beep", dialogVoiceChosen: true })).toBe(false);
    expect(new SettingsStore(null, KEY).save({ muted: true, track: null, payoutLeft: 0, dialogVoice: "beep", dialogVoiceChosen: true })).toBe(false);
  });
});
