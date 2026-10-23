import { describe, expect, it, vi } from "vitest";
import type { ClipboardLike } from "../../input/clipboard";
import { NO_INPUT } from "../../input/controls";
import { unsupportedChars, textWidth } from "../../render/font";
import { EDITOR_TEXT } from "../../render/track-editor";
import { VIEW } from "../config";
import { MAKE_TRACKS as M } from "../config";
import type { KeyValueStorage } from "../achievements/progress";
import { DemoStore } from "../music/demo-store";
import { CHANNELS, countNotes, gridToTrackText, keyRange, normalizeGrid, placeNote, emptyGrid, trackTextToGrid } from "../music/demos";
import { parseTrack } from "../music/track";
import { fakeHost } from "./fake-host";
import { MakeTrackActivity, typedChar } from "./make-track";

const dt = 1 / 60;

function memory(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

function fakeClipboard(initial: string | null = null) {
  const state = { text: initial, copied: [] as string[], pasteListeners: [] as ((t: string) => void)[], canRead: true, canCopy: true };
  const clipboard: ClipboardLike = {
    copy: async (t) => {
      if (!state.canCopy) return false;
      state.copied.push(t);
      state.text = t;
      return true;
    },
    read: async () => (state.canRead ? state.text : null),
    onPaste: (l) => {
      state.pasteListeners.push(l);
      return () => state.pasteListeners.splice(state.pasteListeners.indexOf(l), 1);
    },
  };
  return { clipboard, state };
}

function setup(options: { storage?: KeyValueStorage | null; reserved?: string[]; start?: boolean; clip?: string | null } = {}) {
  const storage = options.storage === undefined ? memory() : options.storage;
  const store = new DemoStore(storage, M.storageKey, { reserved: () => options.reserved ?? ["Stop the music"], log: () => {} });
  const fake = fakeHost();
  const clip = fakeClipboard(options.clip ?? null);
  const act = new MakeTrackActivity(fake.host, store, clip.clipboard);
  if (options.start !== false) act.start();
  const tick = (codes: string[] = [], held: string[] = []) => act.update(dt, { ...NO_INPUT, keys: codes, keysDown: held });
  const press = (...codes: string[]) => codes.forEach((c) => tick([c]));
  const flush = () => new Promise((r) => setTimeout(r, 0));
  return { act, store, fake, clip, storage, tick, press, flush };
}

// Puts `n` notes into the melody and bass.
function fill(s: ReturnType<typeof setup>, n: number) {
  for (let i = 0; i < n; i++) {
    s.press("Digit" + (1 + (i % 2)));
    for (let r = 0; r < i; r++) s.press("ArrowRight");
    s.press("KeyE");
    s.press("ArrowLeft");
    for (let r = 0; r < i; r++) s.press("ArrowLeft");
    s.act.step = 0;
  }
}

describe("starting", () => {
  it("goes straight to a new track called Untitled 1 when nothing is saved", () => {
    const s = setup();
    expect(s.fake.dialogs).toHaveLength(0);
    expect(s.act.phase).toBe("edit");
    expect(s.act.grid.title).toBe("Untitled 1");
    expect(s.act.grid.steps).toBe(16);
    expect(s.act.done).toBe(false);
  });

  it("holds the clock, reads keys, can be cancelled, and has no progress or cooldown of its own", () => {
    const s = setup();
    expect(s.act.holdsClock).toBe(true);
    expect(s.act.readsKeys).toBe(true);
    expect(s.act.cancellable).toBe(true);
    expect(s.act.playerControls).toBeNull();
  });

  it("offers the draft, the saved tracks, a new track and cancel when there is something to open", () => {
    const first = setup();
    first.press("KeyE");
    first.press("KeyS");
    fill(first, 1);
    first.store.save(null, first.act.grid);
    first.store.setDraft(null, first.act.grid);
    const s = setup({ storage: first.storage });
    expect(s.fake.dialogs).toHaveLength(1);
    const node = s.fake.dialogs[0].node;
    expect(node.type === "menu" && node.choices.map((c) => c.label)).toEqual(["Continue your draft", "Untitled 1", "New track", "Cancel"]);
    expect(s.act.phase).toBe("start");
  });

  it("opens a saved track chosen from the menu, a draft, or a new one", () => {
    const base = setup();
    fill(base, 3);
    base.press("KeyS");
    const storage = base.storage;
    // Saved track.
    let s = setup({ storage });
    s.fake.closeDialog({ path: ["Untitled 1"], cancelled: false });
    expect(s.act.phase).toBe("edit");
    expect(s.act.editingId).toBe("demo-1");
    expect(countNotes(s.act.grid)).toBe(3);
    // New track: a fresh name, no id.
    s = setup({ storage });
    s.fake.closeDialog({ path: ["New track"], cancelled: false });
    expect(s.act.editingId).toBeNull();
    expect(s.act.grid.title).toBe("Untitled 2");
  });

  it("goes back to the game when cancel is chosen, the menu is escaped, or no menu can open", () => {
    const base = setup();
    fill(base, 1);
    base.press("KeyS");
    for (const result of [{ path: ["Cancel"], cancelled: false }, { path: [], cancelled: true }]) {
      const s = setup({ storage: base.storage });
      s.fake.closeDialog(result);
      expect(s.act.done).toBe(true);
      expect(s.act.result.completed).toBe(false);
    }
    const blocked = setup({ storage: base.storage, start: false });
    blocked.fake.blockDialogs(true);
    blocked.act.start();
    expect(blocked.act.done).toBe(true);
  });

  it("continues a draft exactly where it was left", () => {
    const base = setup();
    fill(base, 4);
    base.act.grid.title = "Draft one";
    base.press("KeyT");
    base.press("Equal");
    const s = setup({ storage: base.storage });
    s.fake.closeDialog({ path: ["Continue your draft"], cancelled: false });
    expect(s.act.grid.title).toBe("Draft one");
    expect(countNotes(s.act.grid)).toBe(4);
  });
});

describe("editing", () => {
  it("moves the cursor with the arrows: steps wrap, rows stop at the ends of the range", () => {
    const s = setup();
    s.press("ArrowLeft");
    expect(s.act.step).toBe(15);
    s.press("ArrowRight");
    expect(s.act.step).toBe(0);
    for (let i = 0; i < 100; i++) s.press("ArrowUp");
    expect(s.act.rows.melody).toBe(M.melody.high);
    for (let i = 0; i < 100; i++) s.press("ArrowDown");
    expect(s.act.rows.melody).toBe(M.melody.low);
    s.press("Digit3");
    for (let i = 0; i < 10; i++) s.press("ArrowUp");
    expect(s.act.rows.beat).toBe(2);
    for (let i = 0; i < 10; i++) s.press("ArrowDown");
    expect(s.act.rows.beat).toBe(0);
  });

  it("places a note with E, clears it on the same row, and replaces it on another", () => {
    const s = setup();
    s.press("KeyE");
    expect(s.act.grid.channels.melody).toEqual([{ step: 0, key: 60, length: 1 }]);
    expect(s.fake.blips).toHaveLength(1);
    s.press("ArrowUp", "KeyE");
    expect(s.act.grid.channels.melody).toEqual([{ step: 0, key: 61, length: 1 }]);
    s.press("KeyE");
    expect(s.act.grid.channels.melody).toEqual([]);
  });

  it("switches channels with 1, 2 and 3, keeping each one's row", () => {
    const s = setup();
    s.press("ArrowUp", "ArrowUp");
    s.press("Digit2");
    expect(s.act.channel).toBe("bass");
    expect(s.act.rows.bass).toBe(M.bass.start);
    s.press("KeyE");
    expect(s.act.grid.channels.bass[0].key).toBe(36);
    s.press("Digit3", "KeyE");
    expect(s.act.grid.channels.beat).toEqual([{ step: 0, key: 0, length: 1 }]);
    s.press("Digit1");
    expect(s.act.rows.melody).toBe(62);
  });

  it("holds notes for 1, 2 or 4 steps with T, and changes a note under the cursor", () => {
    const s = setup();
    s.press("KeyT");
    expect(s.act.pen).toBe(2);
    s.press("KeyE");
    expect(s.act.grid.channels.melody[0].length).toBe(2);
    s.press("KeyT");
    expect(s.act.grid.channels.melody[0].length).toBe(4);
    expect(s.act.pen).toBe(4);
    s.press("KeyT");
    expect(s.act.grid.channels.melody[0].length).toBe(1);
    // Drums are one step.
    s.press("Digit3", "KeyT");
    expect(s.act.message).toMatch(/one step/);
  });

  it("keeps tempo between 60 and 180 in steps of 4", () => {
    const s = setup();
    s.press("Equal");
    expect(s.act.grid.tempo).toBe(104);
    for (let i = 0; i < 100; i++) s.press("Equal");
    expect(s.act.grid.tempo).toBe(M.tempo.max);
    for (let i = 0; i < 100; i++) s.press("Minus");
    expect(s.act.grid.tempo).toBe(M.tempo.min);
  });

  it("switches between 16 and 32 steps and keeps cut notes until saved", () => {
    const s = setup();
    s.press("Period");
    expect(s.act.grid.steps).toBe(32);
    for (let i = 0; i < 20; i++) s.press("ArrowRight");
    s.press("KeyE");
    s.press("Comma");
    expect(s.act.grid.steps).toBe(16);
    expect(s.act.step).toBe(15);
    expect(countNotes(s.act.grid)).toBe(0);
    s.press("Period");
    expect(countNotes(s.act.grid)).toBe(1);
  });

  it("replaces a note on a one step track instead of finding no room", () => {
    const s = setup();
    s.act.grid.steps = 1;
    s.press("ArrowRight", "KeyE", "ArrowUp", "KeyE");
    expect(s.act.grid.channels.melody).toEqual([{ step: 0, key: 61, length: 1 }]);
  });

  it("ignores keys it does not know, and keys held with Ctrl, Cmd or Alt", () => {
    const s = setup();
    s.press("KeyQ", "KeyZ", "Tab", "Enter", "F5", "Quote", "Slash", "Backspace");
    expect(countNotes(s.act.grid)).toBe(0);
    for (const mod of ["ControlLeft", "MetaLeft", "AltRight"]) {
      s.tick(["KeyE"], [mod]);
      s.tick(["KeyS"], [mod]);
      s.tick(["KeyV"], [mod]);
    }
    expect(s.act.grid.channels.melody).toEqual([]);
    expect(s.store.count).toBe(0);
  });

  it("does nothing while the start menu is up", () => {
    const base = setup();
    fill(base, 1);
    base.press("KeyS");
    const s = setup({ storage: base.storage });
    s.press("KeyE", "KeyS", "KeyP");
    expect(s.act.phase).toBe("start");
    expect(s.act.grid.channels.melody).toEqual([]);
  });
});

describe("the draft", () => {
  it("is written after every edit, and not by moving", () => {
    const s = setup();
    const spy = vi.spyOn(s.store, "setDraft");
    s.press("ArrowRight", "ArrowUp", "Digit2");
    expect(spy).not.toHaveBeenCalled();
    s.press("KeyE");
    expect(spy).toHaveBeenCalledTimes(1);
    s.press("Equal");
    s.press("KeyN");
    for (let i = 0; i < 12; i++) s.press("Backspace");
    for (const c of ["KeyA", "KeyB"]) s.press(c);
    s.press("Enter");
    expect(spy).toHaveBeenCalledTimes(3);
    const d = s.store.draft()!;
    expect(d.grid.title).toBe("ab");
    expect(d.grid.tempo).toBe(104);
    expect(countNotes(d.grid)).toBe(1);
  });

  it("is there when the editor is left by Escape in the middle of a name", () => {
    const s = setup();
    s.press("KeyE", "KeyN", "KeyX");
    s.act.cancel();
    expect(s.act.done).toBe(true);
    expect(s.store.draft()!.grid.channels.melody).toHaveLength(1);
  });

  it("does not break when storage throws, and says so once", () => {
    const throwing: KeyValueStorage = {
      getItem: () => null,
      setItem() {
        throw new Error("quota");
      },
      removeItem() {},
    };
    const s = setup({ storage: throwing });
    s.press("KeyE");
    expect(s.act.message).toMatch(/draft/);
    s.act.message = "";
    s.press("ArrowRight", "KeyE");
    expect(s.act.message).toBe("");
    expect(countNotes(s.act.grid)).toBe(2);
  });
});

describe("naming", () => {
  it("types letters, digits and a few marks, deletes with Backspace and keeps with Enter", () => {
    const s = setup();
    s.press("KeyN");
    expect(s.act.naming).toBe("Untitled 1");
    expect(s.act.readsLetters).toBe(true);
    for (let i = 0; i < 12; i++) s.press("Backspace");
    expect(s.act.naming).toBe("");
    s.press("KeyR", "KeyA", "Digit4", "Space");
    s.tick(["KeyB"], ["ShiftLeft"]);
    s.tick(["Digit1"], ["ShiftLeft"]);
    s.press("Period", "Comma", "Minus");
    expect(s.act.naming).toBe("ra4 B!.,-");
    s.press("Enter");
    expect(s.act.naming).toBeNull();
    expect(s.act.readsLetters).toBe(false);
    expect(s.act.grid.title).toBe("ra4 B!.,-");
  });

  it("types letters that are also commands, as letters", () => {
    const s = setup();
    s.press("KeyN");
    for (let i = 0; i < 12; i++) s.press("Backspace");
    s.press("KeyE", "KeyS", "KeyD", "KeyP", "KeyC", "KeyV", "KeyN", "KeyT");
    expect(s.act.naming).toBe("esdpcvnt");
    expect(countNotes(s.act.grid)).toBe(0);
    expect(s.store.count).toBe(0);
    expect(s.fake.previews).toHaveLength(0);
  });

  it("stops at 24 letters and ignores keys that type nothing", () => {
    const s = setup();
    s.press("KeyN");
    for (let i = 0; i < 40; i++) s.press("KeyA");
    expect(s.act.naming!.length).toBe(M.nameMax);
    s.press("ArrowUp", "Tab", "Slash", "Quote", "F1", "Escape");
    expect(s.act.naming!.length).toBe(M.nameMax);
  });

  it("only types characters a name may have", () => {
    for (const code of ["KeyA", "KeyZ", "Digit0", "Digit9", "Space", "Period", "Comma", "Minus"]) {
      for (const shift of [false, true]) {
        const ch = typedChar(code, shift);
        if (ch !== null) {
          expect(M.nameChars.test(ch), `${code} ${shift}`).toBe(true);
          expect(unsupportedChars(ch)).toEqual([]);
        }
      }
    }
    expect(typedChar("Digit3", true)).toBeNull();
    expect(typedChar("Enter", false)).toBeNull();
  });

  it("keeps the old name when the new one is empty", () => {
    const s = setup();
    s.press("KeyN");
    for (let i = 0; i < 12; i++) s.press("Backspace");
    s.press("Enter");
    expect(s.act.grid.title).toBe("Untitled 1");
    expect(s.act.message).toMatch(/unchanged/);
  });
});

describe("saving", () => {
  it("saves a track with notes, stays open, and pays once", () => {
    const s = setup();
    fill(s, 9);
    s.press("KeyS");
    expect(s.store.list().map((d) => d.title)).toEqual(["Untitled 1"]);
    expect(s.act.done).toBe(false);
    expect(s.act.editingId).toBe("demo-1");
    expect(s.act.message).toBe("Saved. +90 points.");
    expect(s.fake.rewards).toEqual([{ points: 90, effects: [{ var: "mood", add: 6 }] }]);
    // Again inside the cooldown: saved, not paid.
    s.press("KeyS");
    expect(s.act.message).toBe("Saved.");
    expect(s.fake.rewards).toHaveLength(1);
    // After six game hours it pays again.
    s.fake.clock.minutes = 6 * 60;
    s.press("KeyS");
    expect(s.fake.rewards).toHaveLength(2);
  });

  it("saves what was drafted and clears the draft", () => {
    const s = setup();
    fill(s, 2);
    expect(s.store.draft()).not.toBeNull();
    s.press("KeyS");
    expect(s.store.draft()).toBeNull();
  });

  it("pays nothing for few notes or one channel and says what pays", () => {
    const s = setup();
    fill(s, 5);
    s.press("KeyS");
    expect(s.fake.rewards).toHaveLength(0);
    expect(s.act.message).toMatch(/earn points/);
    // A short track does not start the cooldown, so a bigger one still pays.
    for (let i = 0; i < 6; i++) {
      s.press("Digit1", "ArrowRight", "KeyE", "Digit2", "KeyE");
    }
    s.press("KeyS");
    expect(s.fake.rewards).toHaveLength(1);
  });

  it("refuses an empty track, an empty name and a taken name, with a plain message", () => {
    const s = setup({ reserved: ["Stop the music", "Taken"] });
    s.press("KeyS");
    expect(s.act.message).toMatch(/notes/);
    s.press("KeyE");
    s.act.grid.title = "  ";
    s.press("KeyS");
    expect(s.act.message).toMatch(/name/);
    s.act.grid.title = "taken";
    s.press("KeyS");
    expect(s.act.message).toMatch(/taken/);
    expect(s.store.count).toBe(0);
    expect(s.fake.rewards).toHaveLength(0);
  });

  it("refuses a 13th track and says to delete one", () => {
    const s = setup();
    for (let i = 0; i < M.maxTracks; i++) {
      const g = emptyGrid(`T${i}`);
      placeNote(g, "melody", 0, 60, 1);
      s.store.save(null, g);
    }
    s.press("KeyE", "KeyS");
    expect(s.act.message).toMatch(/Delete one/);
    expect(s.store.count).toBe(M.maxTracks);
  });

  it("keeps working in the editor when storage will not take the save, and does not pay", () => {
    const throwing: KeyValueStorage = { getItem: () => null, setItem() { throw new Error("quota"); }, removeItem() {} };
    const s = setup({ storage: throwing });
    fill(s, 9);
    s.press("KeyS");
    expect(s.act.message).toMatch(/Could not save/);
    expect(s.act.editingId).toBeNull();
    expect(s.fake.rewards).toHaveLength(0);
    expect(countNotes(s.act.grid)).toBe(9);
  });

  it("changes a saved track in place when saved again", () => {
    const s = setup();
    fill(s, 3);
    s.press("KeyS");
    s.press("ArrowRight", "ArrowRight", "ArrowRight", "KeyE", "KeyS");
    expect(s.store.count).toBe(1);
    expect(countNotes(s.store.list().map((d) => trackTextToGrid(d.text)).map((r) => (r.ok ? r.grid : emptyGrid("")))[0])).toBeGreaterThanOrEqual(3);
  });
});

describe("deleting", () => {
  it("asks first, with No as the first choice, and deletes on Yes", () => {
    const s = setup();
    fill(s, 2);
    s.press("KeyS");
    s.press("KeyD");
    const node = s.fake.dialogs.at(-1)!.node;
    expect(node.type === "menu" && node.choices.map((c) => c.label)).toEqual(["No", "Yes"]);
    s.fake.closeDialog({ path: ["Yes"], cancelled: false });
    expect(s.store.count).toBe(0);
    expect(s.act.editingId).toBeNull();
    expect(s.act.message).toBe("Deleted.");
    expect(s.act.grid.title).toBe("Untitled 1");
    expect(countNotes(s.act.grid)).toBe(0);
  });

  it("keeps the track on No and on Escape", () => {
    const s = setup();
    fill(s, 2);
    s.press("KeyS");
    s.press("KeyD");
    s.fake.closeDialog({ path: ["No"], cancelled: false });
    s.press("KeyD");
    s.fake.closeDialog({ path: [], cancelled: true });
    expect(s.store.count).toBe(1);
  });

  it("has nothing to delete for a track that was never saved", () => {
    const s = setup();
    s.press("KeyE", "KeyD");
    expect(s.fake.dialogs).toHaveLength(0);
    expect(s.act.message).toMatch(/Nothing saved/);
  });

  it("does nothing if the editor was left while the question was open", () => {
    const s = setup();
    fill(s, 2);
    s.press("KeyS");
    s.press("KeyD");
    s.act.cancel();
    s.fake.closeDialog({ path: ["Yes"], cancelled: false });
    expect(s.store.count).toBe(1);
  });
});

describe("playing", () => {
  it("plays the track over the music with P and stops with P", () => {
    const s = setup();
    s.press("KeyP");
    expect(s.act.message).toMatch(/notes/);
    expect(s.fake.previews).toHaveLength(0);
    fill(s, 3);
    s.press("KeyP");
    expect(s.act.playing).toBe(true);
    const play = s.fake.previews.at(-1)!;
    expect(play.live).toBe(false);
    expect(play.track!.channels.map((c) => c.name)).toEqual(["melody", "bass", "beat"]);
    s.press("KeyP");
    expect(s.act.playing).toBe(false);
    expect(s.fake.previews.at(-1)!.track).toBeNull();
  });

  it("follows edits while playing (swapped at the end of the loop), and stops if every note is gone", () => {
    const s = setup();
    s.press("KeyE", "KeyP");
    const before = s.fake.previews.length;
    s.press("ArrowRight", "KeyE");
    expect(s.fake.previews.length).toBe(before + 1);
    expect(s.fake.previews.at(-1)!.live).toBe(true);
    s.press("KeyE", "ArrowLeft", "KeyE");
    expect(s.act.playing).toBe(false);
    expect(s.fake.previews.at(-1)!.track).toBeNull();
  });

  it("puts the record back (stops the preview) however the editor is left", () => {
    for (const leave of [(s: ReturnType<typeof setup>) => s.act.cancel(), (s: ReturnType<typeof setup>) => { s.act.cancel(); s.act.cancel(); }]) {
      const s = setup();
      s.press("KeyE", "KeyP");
      leave(s);
      expect(s.fake.previews.at(-1)!.track).toBeNull();
    }
  });

  it("does not claim a preview that never started when leaving", () => {
    const s = setup();
    s.act.cancel();
    expect(s.fake.previews).toHaveLength(0);
  });
});

describe("copy and paste", () => {
  it("copies text a real file in src/game/music/tracks would accept", async () => {
    const s = setup();
    fill(s, 5);
    s.press("KeyC");
    await s.flush();
    expect(s.clip.state.copied).toHaveLength(1);
    expect(() => parseTrack(s.clip.state.copied[0], "07-copy.track")).not.toThrow();
    expect(s.act.message).toBe("Copied.");
  });

  it("copies the saved, normalized track: notes cut off by a shorter track are not in it", async () => {
    const s = setup();
    s.press("Period");
    for (let i = 0; i < 20; i++) s.press("ArrowRight");
    s.press("KeyE", "Comma");
    s.press("KeyC");
    await s.flush();
    expect(s.clip.state.copied).toHaveLength(0);
    expect(s.act.message).toMatch(/Nothing to copy/);
  });

  it("says plainly when it cannot copy", async () => {
    const s = setup();
    s.clip.state.canCopy = false;
    s.press("KeyE", "KeyC");
    await s.flush();
    expect(s.act.message).toMatch(/Could not copy/);
  });

  it("refuses to copy a track with a name that would break the file", () => {
    const s = setup();
    s.press("KeyE");
    s.act.grid.title = "a:b";
    s.press("KeyC");
    expect(s.clip.state.copied).toHaveLength(0);
    expect(s.act.message).toMatch(/character/);
  });

  it("pastes a track as a draft: not saved until S", async () => {
    const src = setup();
    fill(src, 6);
    src.act.grid.title = "From elsewhere";
    const text = gridToTrackText(src.act.grid);
    const s = setup({ clip: text });
    s.press("KeyV");
    await s.flush();
    expect(s.act.grid.title).toBe("From elsewhere");
    expect(countNotes(s.act.grid)).toBe(6);
    expect(s.act.editingId).toBeNull();
    expect(s.store.count).toBe(0);
    expect(s.store.draft()!.grid.title).toBe("From elsewhere");
    expect(s.act.message).toMatch(/draft/);
  });

  it("rejects a bad paste with the reason, and changes nothing", async () => {
    const s = setup({ clip: "title: Bad\n[a square]\nC9:1 Zq:1" });
    s.press("KeyE");
    s.press("KeyV");
    await s.flush();
    expect(s.act.message).toMatch(/line 3/);
    expect(countNotes(s.act.grid)).toBe(1);
    expect(s.act.grid.title).toBe("Untitled 1");
    s.clip.state.text = "title: Hi\n[a square]\nC4:3";
    s.press("KeyV");
    await s.flush();
    expect(s.act.message).toMatch(/too long/i);
  });

  it("asks for Ctrl+V when the clipboard cannot be read, and takes the paste event", async () => {
    const src = setup();
    fill(src, 2);
    const text = gridToTrackText(src.act.grid);
    const s = setup({ clip: text });
    s.clip.state.canRead = false;
    s.press("KeyV");
    await s.flush();
    expect(s.act.message).toMatch(/Ctrl\+V/);
    expect(s.clip.state.pasteListeners).toHaveLength(1);
    s.clip.state.pasteListeners[0](text);
    expect(countNotes(s.act.grid)).toBe(2);
  });

  it("ignores a paste while a name is typed, after leaving, and while the menu is up", () => {
    const s = setup();
    s.press("KeyN");
    s.act.importText("title: X\n[a square]\nC4:1");
    expect(s.act.grid.title).toBe("Untitled 1");
    s.press("Enter");
    s.act.cancel();
    s.act.importText("title: X\n[a square]\nC4:1");
    expect(s.act.grid.title).toBe("Untitled 1");
    expect(s.clip.state.pasteListeners).toHaveLength(0); // the listener is removed on leaving
  });

  it("takes the pasted text of a track it can show, from a real record file that fits", () => {
    const s = setup();
    s.act.importText("title: Hand written\ntempo: 88\n[tune triangle]\nC4:1 E4:1 G4:2\n[low sine]\nC3:2\n");
    expect(s.act.grid.tempo).toBe(88);
    expect(s.act.grid.channels.bass).toEqual([{ step: 0, key: 48, length: 4 }]);
  });
});

// A long random run: whatever is pressed, the editor must stay sane and what it
// writes must always parse (issue 059: "the editor output always parses").
describe("wording", () => {
  it("is drawable by the font and fits the screen", () => {
    for (const line of [EDITOR_TEXT.reminder, ...EDITOR_TEXT.help, ...EDITOR_TEXT.namingHelp, "Pasted. It is a draft until you save."]) {
      expect(unsupportedChars(line), line).toEqual([]);
      expect(textWidth(line), line).toBeLessThanOrEqual(VIEW.width - 16);
    }
  });

  it("turns characters the font cannot draw into question marks in a message", () => {
    const s = setup({ clip: "title: Hi\n[a square]\nC4:1 \u00e9\u0000 \u2014" });
    s.press("KeyV");
    return s.flush().then(() => {
      expect(unsupportedChars(s.act.message)).toEqual([]);
      expect(s.act.message.length).toBeGreaterThan(0);
    });
  });
});

describe("random keys (fuzz)", () => {
  const KEYS = [
    ...["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyE", "Digit1", "Digit2", "Digit3", "KeyT", "KeyP", "Minus", "Equal", "Comma", "Period"],
    ...["KeyN", "KeyS", "KeyD", "KeyC", "KeyV", "Enter", "Backspace", "Space", "Escape", "Tab", "KeyA", "KeyZ", "Digit0", "Digit9", "Slash", "Quote", "F5", "Numpad5", "ShiftLeft", "ControlLeft"],
  ];

  function rng(seed: number) {
    let x = seed >>> 0;
    return () => {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      return x / 4294967296;
    };
  }

  function check(s: ReturnType<typeof setup>, label: string) {
    const a = s.act;
    // The cursor is on the grid, in range.
    expect(a.step, label).toBeGreaterThanOrEqual(0);
    expect(a.step, label).toBeLessThan(a.grid.steps);
    for (const id of CHANNELS) {
      const { low, high } = keyRange(id);
      expect(a.rows[id], label).toBeGreaterThanOrEqual(low);
      expect(a.rows[id], label).toBeLessThanOrEqual(high);
    }
    expect(a.grid.tempo, label).toBeGreaterThanOrEqual(M.tempo.min);
    expect(a.grid.tempo, label).toBeLessThanOrEqual(M.tempo.max);
    expect(a.grid.steps, label).toBeGreaterThanOrEqual(1);
    expect(a.grid.steps, label).toBeLessThanOrEqual(M.steps.max);
    expect([1, 2, 4].includes(a.pen), label).toBe(true);
    // What the editor would write always parses, when there is anything to write.
    const n = normalizeGrid(a.grid);
    if (countNotes(a.grid) > 0) {
      const text = gridToTrackText(a.grid);
      expect(() => parseTrack(text, label), label).not.toThrow();
      expect(text.length).toBeLessThanOrEqual(M.maxTextBytes);
    }
    // Notes never overlap in what is written.
    for (const id of CHANNELS) {
      const notes = n.channels[id];
      for (let i = 1; i < notes.length; i++) expect(notes[i].step).toBeGreaterThanOrEqual(notes[i - 1].step + notes[i - 1].length);
    }
    // Everything saved parses and fits; the draft is sane too.
    for (const d of s.store.list()) {
      expect(() => parseTrack(d.text, d.id), label).not.toThrow();
      expect(trackTextToGrid(d.text).ok, label).toBe(true);
    }
    expect(s.store.count, label).toBeLessThanOrEqual(M.maxTracks);
    expect(s.store.list().length, label).toBe(s.store.count);
    // Once it is done, nothing is left playing and the paste listener is gone.
    if (a.done) {
      expect(a.playing, label).toBe(false);
      expect(s.clip.state.pasteListeners, label).toHaveLength(0);
    }
  }

  it("never breaks, never writes text the parser refuses, and always lets go cleanly", async () => {
    const dialogChoices = [["Yes"], ["No"], ["Cancel"], ["New track"], ["Continue your draft"], ["Untitled 1"], []];
    for (let seed = 1; seed <= 60; seed++) {
      const random = rng(seed);
      // Sometimes start with a saved track and a draft, so the start menu appears.
      const base = setup();
      if (seed % 2 === 0) {
        fill(base, 3);
        base.press("KeyS");
        base.press("KeyE");
      }
      const s = setup({ storage: base.storage, clip: random() < 0.5 ? "title: Pasted\n[a square]\nC4:1 E4:1" : "garbage \u0000 [[" });
      for (let step = 0; step < 400 && !s.act.done; step++) {
        const label = `seed ${seed} step ${step}`;
        // A dialog may be open: close it any way, as the game would.
        if (s.fake.dialogs.length && random() < 0.5) {
          const pick = dialogChoices[Math.floor(random() * dialogChoices.length)];
          const last = s.fake.dialogs.at(-1)!;
          last.close({ path: pick, cancelled: pick.length === 0 });
        }
        const count = Math.floor(random() * 3);
        const codes = Array.from({ length: count }, () => KEYS[Math.floor(random() * KEYS.length)]);
        const held = random() < 0.1 ? ["ControlLeft"] : random() < 0.1 ? ["ShiftLeft"] : [];
        // Escape is handled by the game, which cancels the activity.
        if (codes.includes("Escape")) {
          s.act.cancel();
          check(s, label);
          break;
        }
        if (random() < 0.05) s.fake.clock.minutes += Math.floor(random() * 500);
        if (random() < 0.05) s.act.importText(random() < 0.5 ? "title: Z\n[a square]\nC4:1" : "x");
        expect(() => s.act.update(dt, { ...NO_INPUT, keys: codes, keysDown: held }), label).not.toThrow();
        await Promise.resolve();
        check(s, label);
      }
      s.act.cancel();
      check(s, `seed ${seed} end`);
    }
  });
});
