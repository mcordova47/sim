import { describe, expect, it } from "vitest";
import { APARTMENT } from "../apartment";
import { pauseButtons } from "../achievements/draw";
import { AchievementsFeature, type KeyEventLike, type Listenable } from "../achievements/feature";
import { FakeStorage } from "../achievements/fake-storage";
import { MAKE_TRACKS as M, SYNC } from "../config";
import { Game } from "../game";
import { DemoStore } from "../music/demo-store";
import { ApartmentState } from "../state";
import { STATE_VARS } from "../state-vars";
import { NO_INPUT } from "../../input/controls";
import { setTouchHints } from "../../render/hints";
import { decodeSave, encodeSave } from "./code";
import { trackText } from "./gen";
import type { PickedFile, TransferIO } from "./io";
import { canon, type SyncDoc } from "./merge";

class Keys implements Listenable<KeyEventLike> {
  fns: Array<(e: KeyEventLike) => void> = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  fire(e: KeyEventLike) {
    for (const f of this.fns) f(e);
  }
}

class FakeIO implements TransferIO {
  clipboard: string | null = null;
  copyOk = true;
  files: Array<{ name: string; text: string }> = [];
  picked: PickedFile = null;
  pasteListeners: Array<(t: string) => void> = [];
  async copy(text: string) {
    if (this.copyOk) this.clipboard = text;
    return this.copyOk;
  }
  async read() {
    return this.clipboard;
  }
  onPaste(l: (t: string) => void) {
    this.pasteListeners.push(l);
    return () => {};
  }
  saveFile(name: string, text: string) {
    this.files.push({ name, text });
    return true;
  }
  async pickFile() {
    return this.picked;
  }
}

const flush = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0));
};

// One "device": its own storage, tracks, clock and clipboard.
function device(storage = new FakeStorage(), start = 1_000_000) {
  const keys = new Keys();
  const io = new FakeIO();
  const clock = { t: start };
  const demos = new DemoStore(storage, M.storageKey, { reserved: () => ["Stop the music"], log: () => {} });
  const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, state: new ApartmentState(STATE_VARS) });
  const feature = new AchievementsFeature(game, { storage, keys, now: () => clock.t, demos, io });
  const press = (code: string, extra: Partial<KeyEventLike> = {}) => keys.fire({ code, ...extra });
  const api = feature as unknown as {
    doc(): SyncDoc;
    activeAt: number;
    flash: string | null;
    flashFor: number;
    importText(t: string): void;
    page: string;
  };
  return { storage, keys, io, clock, demos, game, feature, press, api };
}
type Device = ReturnType<typeof device>;

const item = (id: string) => {
  for (const level of Object.values(APARTMENT.rooms)) {
    const found = level.interactables.find((i) => i.id === id);
    if (found) return found;
  }
  throw new Error(id);
};
const complete = (d: Device, id: string, points = 10) =>
  d.game.events.emit("taskComplete", { item: item(id), award: { points, basePoints: points, repeatFactor: 1, multiplier: 1, chain: 1, qualityFactor: 1, timeFactor: 1 } });
const message = (d: Device) => (d.api.flashFor > 0 ? d.api.flash : null);
const KEY = "life.progress.v1";
const saved = (d: Device) => JSON.parse(d.storage.getItem(KEY)!);

describe("activeAt: the time of the last real action", () => {
  it("is set by a finished task and by a decor change, and saved with the progress", () => {
    const d = device();
    expect(d.api.activeAt).toBe(0);
    d.clock.t = 5000;
    complete(d, "coffee");
    expect(d.api.activeAt).toBe(5000);
    expect(saved(d).activeAt).toBe(5000);
    d.clock.t = 6000;
    const own = d.game.decor.testItemIds().find((id) => id.startsWith("art-"))!;
    d.game.decor.own(own);
    expect(d.api.activeAt).toBe(6000);
    d.clock.t = 7000;
    d.game.decor.place("art-table", own);
    expect(d.api.activeAt).toBe(7000);
  });

  it("is not set by steps, a bump, leaving a task, a package arriving, time passing, or loading", () => {
    const d = device();
    d.clock.t = 5000;
    d.game.events.emit("step", { col: 1, row: 1, direction: "up" });
    d.game.events.emit("bump", { col: 1, row: 1, direction: "up" });
    d.game.events.emit("taskCancelled", { item: item("coffee") });
    const gift = d.game.decor.testItemIds()[0];
    d.game.deliveries.deliver(gift, 0);
    d.game.deliveries.advance(5);
    expect(d.game.deliveries.waiting).toBe(true);
    for (let i = 0; i < 700; i++) d.game.update(1 / 60, NO_INPUT);
    d.feature.save();
    expect(d.api.activeAt).toBe(0);
    expect(saved(d).activeAt).toBeUndefined();
    const again = device(d.storage);
    expect(again.api.activeAt).toBe(0);
  });

  it("survives a reload, and a reset sets it to now (kept with the next save)", () => {
    const d = device();
    d.clock.t = 5000;
    complete(d, "coffee");
    expect(device(d.storage).api.activeAt).toBe(5000);
    d.clock.t = 9000;
    d.feature.reset();
    expect(d.api.activeAt).toBe(9000);
    d.feature.save();
    expect(saved(d).activeAt).toBe(9000);
  });
});

describe("exporting on one device and importing on another", () => {
  it("copies a code from the pause screen, and the other device merges it", async () => {
    const a = device();
    const b = device();
    a.clock.t = 2_000_000;
    for (let i = 0; i < 3; i++) complete(a, "coffee", 20);
    a.demos.add(trackText("Porch", 1), 11);
    a.game.state.applyEffects([{ var: "dishes", set: 7 }]);
    a.press("KeyL");
    a.press("KeyT");
    a.press("KeyC");
    await flush();
    expect(message(a)).toBe("CODE COPIED");
    const code = a.io.clipboard!;
    expect(code.startsWith("LIFE1.")).toBe(true);

    // B played something else, earlier.
    b.clock.t = 1_500_000;
    for (let i = 0; i < 2; i++) complete(b, "doomscroll", 5);
    b.demos.add(trackText("Basement", 2), 22);
    b.press("KeyL");
    b.press("KeyT");
    b.io.clipboard = code;
    b.press("KeyV");
    await flush();
    expect(message(b)).toBe("SAVE MERGED");
    expect(b.feature.stats.taskCount("coffee")).toBe(3);
    expect(b.feature.stats.taskCount("doomscroll")).toBe(2);
    expect(b.feature.stats.number("totalPoints")).toBe(60);
    expect(b.feature.unlocks.has("coffee-3")).toBe(true);
    expect(b.game.state.get("dishes")).toBe(7);
    expect(b.demos.list().map((t) => t.title).sort()).toEqual(["Basement", "Porch"]);
    // The applied apartment is A's, and applying was not playing: B's own time is A's.
    expect(b.api.activeAt).toBe(2_000_000);
    expect(saved(b).activeAt).toBe(2_000_000);
    // Importing the same code again changes nothing.
    b.press("KeyV");
    await flush();
    expect(message(b)).toBe("NOTHING NEW IN THAT SAVE");
  });

  it("import never removes anything: the older apartment keeps its owned things, its stats and its tracks", async () => {
    const a = device();
    const b = device();
    a.clock.t = 3_000_000;
    complete(a, "coffee");
    b.clock.t = 1_000_000;
    for (let i = 0; i < 5; i++) complete(b, "doomscroll", 30);
    const own = b.game.decor.testItemIds().find((id) => id.startsWith("art-"))!;
    b.game.decor.own(own);
    b.clock.t = 1_000_000;
    const before = b.feature.stats.toJSON();
    await b.api.importText(await encodeSave(a.api.doc()));
    await flush();
    expect(b.game.decor.owns(own)).toBe(true);
    expect(b.feature.stats.number("totalPoints")).toBe(Math.max(before.totalPoints, a.feature.stats.number("totalPoints")));
    expect(b.feature.stats.taskCount("doomscroll")).toBe(5);
    expect(b.feature.stats.taskCount("coffee")).toBe(1);
  });

  it("a save file imports the same way (SAVE FILE on one, OPEN FILE on the other)", async () => {
    const a = device();
    const b = device();
    a.clock.t = 2_000_000;
    complete(a, "coffee");
    a.press("KeyL");
    a.press("KeyT");
    a.press("KeyF");
    expect(a.io.files).toHaveLength(1);
    expect(a.io.files[0].name).toBe(SYNC.fileName);
    expect(message(a)).toBe("FILE SAVED");
    b.press("KeyL");
    b.press("KeyT");
    b.io.picked = { text: a.io.files[0].text };
    b.press("KeyO");
    await flush();
    expect(message(b)).toBe("SAVE MERGED");
    expect(b.feature.stats.taskCount("coffee")).toBe(1);
  });

  it("a paste (Ctrl+V) on the transfer page imports, and Ctrl+V does not also fire the V key", async () => {
    const a = device();
    const b = device();
    a.clock.t = 2_000_000;
    complete(a, "coffee");
    const code = await encodeSave(a.api.doc());
    b.press("KeyL");
    b.press("KeyT");
    b.io.clipboard = "NOT A CODE";
    b.press("KeyV", { ctrlKey: true });
    await flush();
    expect(message(b)).toBeNull();
    for (const l of b.io.pasteListeners) l(code);
    await flush();
    expect(message(b)).toBe("SAVE MERGED");
    // Not on the list page.
    const c = device();
    c.press("KeyL");
    for (const l of c.io.pasteListeners) l(code);
    await flush();
    expect(c.feature.stats.taskCount("coffee")).toBe(0);
  });

  it("junk, huge, damaged and wrong-version input says so and changes no store", async () => {
    const b = device();
    complete(b, "coffee");
    b.demos.add(trackText("Mine", 1), 1);
    b.feature.save();
    b.press("KeyL");
    b.press("KeyT");
    const snapshot = () => JSON.stringify([...b.storage.data.entries()].sort());
    const before = snapshot();
    const cases: Array<[string, string]> = [
      ["hello", "NOT A SAVE FROM THIS GAME"],
      ["{}", "NOT A SAVE FROM THIS GAME"],
      ['{"app":"life","format":99}', "THAT SAVE IS FROM A NEWER GAME"],
      ["LIFE1.@@@@", "THAT SAVE COULD NOT BE READ"],
      ["LIFE1.eJwDAAAAAAE", "THAT SAVE COULD NOT BE READ"],
      ["x".repeat(SYNC.maxChars + 5), "THAT SAVE IS TOO BIG"],
    ];
    for (const [text, said] of cases) {
      b.api.importText(text);
      await flush();
      expect(message(b), text.slice(0, 20)).toBe(said);
    }
    expect(snapshot()).toBe(before);
    expect(b.feature.stats.taskCount("coffee")).toBe(1);
    // An oversize file is refused unread.
    b.io.picked = { tooBig: true };
    b.press("KeyO");
    await flush();
    expect(message(b)).toBe("THAT SAVE IS TOO BIG");
    expect(snapshot()).toBe(before);
  });

  it("a hostile but well-formed save cannot damage the stores: the game still loads from them", async () => {
    const b = device();
    b.press("KeyL");
    b.press("KeyT");
    const evil = {
      app: "life",
      format: 1,
      device: "x",
      activeAt: 9e99,
      progress: { unlocked: ["x", 5], stats: { totalPoints: -1, taskCounts: { coffee: -3, a: "b" } }, world: { room: "nowhere", col: -5, row: 1e9, facing: "up", vars: { dishes: 1e308, nope: 1 } }, decor: { owned: Array(3000).fill("art-barn"), placed: { "art-table": "lamp-table" } }, deliveries: { hours: 1e99, pending: [{ id: "nope", at: 1 }] }, encounters: { last: -1, seen: [1] } },
      tracks: Array.from({ length: 500 }, (_, i) => ({ text: trackText("T", i), made: 1 })),
    };
    b.api.importText(JSON.stringify(evil));
    await flush();
    expect(b.demos.count).toBeLessThanOrEqual(M.maxTracks);
    b.feature.save();
    const again = device(b.storage);
    expect(again.feature.stats.number("totalPoints")).toBe(0);
    expect(Number.isFinite(again.game.state.get("dishes"))).toBe(true);
  });
});

describe("the backup and RESTORE", () => {
  it("an import that changes the progress keeps the old group; RESTORE returns to it and is the newest action", async () => {
    const a = device();
    const b = device();
    a.clock.t = 3_000_000;
    for (let i = 0; i < 3; i++) complete(a, "coffee");
    a.game.state.applyEffects([{ var: "dishes", set: 8 }]);
    b.clock.t = 1_000_000;
    complete(b, "doomscroll");
    b.game.state.applyEffects([{ var: "dishes", set: 2 }]);
    b.press("KeyL");
    b.press("KeyT");
    // Nothing to go back to yet.
    b.press("KeyR", { shiftKey: true });
    b.press("KeyY");
    expect(message(b)).toBe("NOTHING TO GO BACK TO");
    b.api.importText(await encodeSave(a.api.doc()));
    await flush();
    expect(b.game.state.get("dishes")).toBe(8);
    expect(b.storage.getItem("life.sync.backup.v1")).not.toBeNull();
    b.clock.t = 4_000_000;
    b.press("KeyR", { shiftKey: true });
    expect((b.feature as unknown as { confirmRestore: boolean }).confirmRestore).toBe(true);
    // Anything but Y backs out.
    b.press("KeyN");
    expect(b.feature.stats.taskCount("coffee")).toBe(3);
    b.press("KeyR", { shiftKey: true });
    b.press("KeyY");
    expect(message(b)).toBe("BACK TO BEFORE THE LAST IMPORT");
    expect(b.game.state.get("dishes")).toBe(2);
    expect(b.feature.stats.taskCount("coffee")).toBe(0);
    expect(b.feature.stats.taskCount("doomscroll")).toBe(1);
    expect(b.api.activeAt).toBe(4_000_000);
    // The same import now brings back the unions but not A's apartment (the restored one is the newest).
    b.api.importText(await encodeSave(a.api.doc()));
    await flush();
    expect(b.feature.stats.taskCount("coffee")).toBe(3);
    expect(b.game.state.get("dishes")).toBe(2);
  });

  it("a merge that changes nothing writes no backup", async () => {
    const a = device();
    const b = device();
    a.press("KeyL");
    a.press("KeyT");
    b.press("KeyL");
    b.press("KeyT");
    b.api.importText(await encodeSave(a.api.doc()));
    await flush();
    expect(b.storage.getItem("life.sync.backup.v1")).toBeNull();
  });
});

describe("a held merge", () => {
  const playedDoc = async () => {
    const a = device();
    a.clock.t = 3_000_000;
    complete(a, "coffee");
    a.game.state.applyEffects([{ var: "dishes", set: 9 }]);
    const doc = await decodeSave(await encodeSave(a.api.doc()));
    if (!doc.ok) throw new Error("bad");
    return doc.doc;
  };

  it("applies at once before any real action, and the first step is not one", async () => {
    const doc = await playedDoc();
    const b = device();
    b.game.events.emit("step", { col: 1, row: 1, direction: "up" });
    b.feature.holdMerge(doc);
    expect(b.game.state.get("dishes")).toBe(9);
    expect(b.feature.sync.held()).toBeNull();
  });

  it("after a real action it waits, and is merged with what was played when the pause screen opens", async () => {
    const doc = await playedDoc();
    const b = device();
    b.clock.t = 1_000_000;
    complete(b, "doomscroll");
    b.feature.holdMerge(doc);
    expect(b.game.state.get("dishes")).not.toBe(9);
    expect(b.feature.sync.held()).not.toBeNull();
    b.clock.t = 1_500_000;
    complete(b, "doomscroll");
    b.press("KeyL");
    expect(b.game.state.get("dishes")).toBe(9);
    expect(b.feature.sync.held()).toBeNull();
    expect(b.feature.stats.taskCount("doomscroll")).toBe(2);
    expect(b.feature.stats.taskCount("coffee")).toBe(1);
  });

  it("waits while something holds the input, and is applied at the next load when nobody opened the pause screen", async () => {
    const doc = await playedDoc();
    const b = device();
    const release = b.game.lockInput();
    b.feature.holdMerge(doc);
    expect(b.game.state.get("dishes")).not.toBe(9);
    release();
    b.feature.save();
    const next = device(b.storage);
    expect(next.game.state.get("dishes")).toBe(9);
    expect(next.feature.sync.held()).toBeNull();
    expect(next.feature.stats.taskCount("coffee")).toBe(1);
  });

  it("a restore clears a held merge", async () => {
    const doc = await playedDoc();
    const b = device();
    b.feature.sync.setBackup({ progress: device().api.doc().progress, activeAt: 0 });
    complete(b, "doomscroll");
    b.feature.holdMerge(doc);
    expect(b.feature.sync.held()).not.toBeNull();
    expect(b.feature.restoreBackup()).toBe(true);
    expect(b.feature.sync.held()).toBeNull();
  });
});

describe("the pause screen's transfer page", () => {
  it("T opens it from the list and Escape goes back to the list, then closes", () => {
    const d = device();
    d.press("KeyL");
    d.press("KeyT");
    expect(d.api.page).toBe("transfer");
    d.press("Escape");
    expect(d.api.page).toBe("list");
    expect(d.feature.listVisible).toBe(true);
    d.press("Escape");
    expect(d.feature.listVisible).toBe(false);
    d.press("KeyL");
    expect(d.api.page).toBe("list");
  });

  it("a failed copy says where the code is, and a closed clipboard asks for Ctrl+V", async () => {
    const d = device();
    d.press("KeyL");
    d.press("KeyT");
    d.io.copyOk = false;
    d.press("KeyC");
    await flush();
    expect(message(d)).toBe("COULD NOT COPY. THE CODE IS IN THE CONSOLE.");
    d.io.clipboard = null;
    d.press("KeyV");
    await flush();
    expect(message(d)).toBe("PRESS CTRL+V TO PASTE");
  });

  it("nothing is written until sync is used, and then only the sync keys", () => {
    const d = device();
    complete(d, "coffee");
    d.feature.save();
    expect([...d.storage.data.keys()].sort()).toEqual([KEY]);
    d.press("KeyL");
    d.press("KeyT");
    d.press("KeyF");
    expect(d.storage.data.has("life.sync.v1")).toBe(true);
    expect(JSON.parse(d.storage.getItem("life.sync.v1")!).device).toMatch(/^[0-9a-f]{16}$/);
    expect(canon(JSON.parse(d.io.files[0].text).device)).toBe(canon(JSON.parse(d.storage.getItem("life.sync.v1")!).device));
    // No save code or file ever holds the preferences or the flashcards key.
    expect(d.io.files[0].text).not.toMatch(/flashcards|muted|adBlocker/);
  });

  it("on touch, every transfer target is in the picture and big enough, and BACK, COPY and the restore question work", async () => {
    setTouchHints(true);
    try {
      const d = device();
      d.press("KeyL");
      // The TRANSFER SAVE button on the list opens the page.
      // The list's TRANSFER SAVE button opens the page.
      const button = pauseButtons((d.feature as unknown as { view(): Parameters<typeof pauseButtons>[0] }).view()).find((x) => x.id === "transfer")?.rect;
      expect(button).toBeDefined();
      d.game.tapAt(button!.x + 2, button!.y + 2);
      expect(d.api.page).toBe("transfer");
      const targets = d.game.tapTargets();
      expect(targets.length).toBe(6);
      for (const t of targets) {
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.y).toBeGreaterThanOrEqual(0);
        expect(t.x + t.w).toBeLessThanOrEqual(320);
        expect(t.y + t.h).toBeLessThanOrEqual(192);
        expect(t.h).toBeGreaterThanOrEqual(9);
      }
      const tap = (i: number) => d.game.tapAt(targets[i].x + 2, targets[i].y + 2);
      expect(tap(0)).toBe(true);
      await flush();
      expect(d.io.clipboard).not.toBeNull();
      expect(tap(4)).toBe(true);
      expect(d.game.tapTargets().length).toBe(2);
      const [, no] = d.game.tapTargets();
      d.game.tapAt(no.x + 2, no.y + 2);
      expect(d.game.tapTargets().length).toBe(6);
      expect(tap(5)).toBe(true);
      expect(d.api.page).toBe("list");
    } finally {
      setTouchHints(false);
    }
  });
});
