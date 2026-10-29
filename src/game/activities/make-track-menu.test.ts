import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../../input/controls";
import { targetAt, type Rect } from "../../input/tap";
import { setTouchHints } from "../../render/hints";
import { cellRect, touchEditorLayout, touchRowKeys } from "../../render/track-editor-touch";
import { DESKTOP_VIEW, MAKE_TRACKS as M, NARROW_VIEW } from "../config";
import type { KeyValueStorage } from "../achievements/progress";
import { DemoStore } from "../music/demo-store";
import { countNotes, noteAt } from "../music/demos";
import { fakeHost } from "./fake-host";
import { MakeTrackActivity } from "./make-track";

// What the font is asked to draw is the on-screen text. The real function needs a DOM canvas.
const drawn: string[] = [];
vi.mock("../../render/font", async (orig) => ({
  ...(await orig<typeof import("../../render/font")>()),
  drawText: (_ctx: unknown, text: string) => void drawn.push(text),
}));
import { fitTail } from "../../render/track-editor-touch";

afterEach(() => setTouchHints(false));

const dt = 1 / 60;
const memory = (): KeyValueStorage => {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

function setup(screen = NARROW_VIEW, store = new DemoStore(memory(), M.storageKey, { reserved: () => [], log: () => {} })) {
  setTouchHints(true);
  const fake = fakeHost();
  const act = new MakeTrackActivity(fake.host, store, { copy: async () => true, read: async () => null, onPaste: () => () => {} });
  act.start();
  const rows = () => touchRowKeys(act.channel, act.rows[act.channel]);
  const layout = () => touchEditorLayout(screen, { steps: act.grid.steps, rows: rows().length });
  const tapRect = (r: Rect) => {
    const hit = targetAt(act.tapTargets(screen), r.x + r.w / 2, r.y + r.h / 2);
    expect(hit, JSON.stringify(r)).not.toBeNull();
    hit!.run();
  };
  const tapCell = (col: number, key: number) => tapRect(cellRect(layout(), col, rows().indexOf(key)));
  const press = (...codes: string[]) => codes.forEach((c) => act.update(dt, { ...NO_INPUT, keys: [c] }));
  // Picks an entry of the dialog that is open, as a tap on its row would.
  const dialogLabels = () => (fake.dialogs.at(-1)!.node as { choices: { label: string }[] }).choices.map((c) => c.label);
  const pick = (label: string) => fake.closeDialog({ path: ["More", label], cancelled: false });
  const more = () => tapRect(layout().more);
  return { act, store, fake, layout, rows, tapRect, tapCell, press, dialogLabels, pick, more };
}

for (const screen of [NARROW_VIEW, DESKTOP_VIEW]) {
  describe(`name, More menu, undo, delete, ${screen.width} x ${screen.height} (issue 106c)`, () => {
    it("wants text only while naming, from the name button or Rename", () => {
      const s = setup(screen);
      expect(s.act.wantsText).toBe(false);
      s.tapRect(s.layout().name);
      expect(s.act.wantsText).toBe(true);
      expect(s.act.textValue()).toBe(s.act.grid.title);
      s.press("Enter");
      expect(s.act.wantsText).toBe(false);
      s.more();
      s.pick("Rename");
      expect(s.act.wantsText).toBe(true);
    });

    it("takes the whole text, drops what a name cannot hold, caps at the longest name", () => {
      const s = setup(screen);
      s.tapRect(s.layout().name);
      s.act.setText("Rainy: Tuesday # [x]");
      expect(s.act.textValue()).toBe("Rainy Tuesday  x");
      s.act.setText("It’s fine");
      expect(s.act.textValue()).toBe("It's fine");
      s.act.setText("a".repeat(40));
      expect(s.act.textValue()).toHaveLength(M.nameMax);
      s.act.setText("Slow day");
      s.press("Enter");
      expect(s.act.grid.title).toBe("Slow day");
      // Ignored when not naming.
      s.act.setText("nope");
      expect(s.act.grid.title).toBe("Slow day");
    });

    it("keeps the name when the field is emptied then Enter is pressed", () => {
      const s = setup(screen);
      const before = s.act.grid.title;
      s.tapRect(s.layout().name);
      s.act.setText("");
      s.press("Enter");
      expect(s.act.grid.title).toBe(before);
    });

    it("lists the menu entries, and no desktop key is named in them", () => {
      const s = setup(screen);
      s.more();
      const labels = s.dialogLabels();
      expect(labels).toEqual(["Rename", "Extend to 32 steps", "Undo", "Copy", "Paste", "Delete", "Back"]);
      for (const l of labels) expect(l).not.toMatch(/\b(ctrl|esc|enter|press)\b/i);
    });

    it("has the 16 or 32 steps entry do what , and . do", () => {
      const s = setup(screen);
      s.more();
      s.pick("Extend to 32 steps");
      expect(s.act.grid.steps).toBe(32);
      s.more();
      expect(s.dialogLabels()[1]).toBe("Cut to 16 steps");
      s.pick("Cut to 16 steps");
      expect(s.act.grid.steps).toBe(16);
      const k = setup(screen);
      k.press("Period");
      expect(k.act.grid.steps).toBe(32);
    });

    it("cuts a 32-step track and Undo brings its notes back", () => {
      const s = setup(screen);
      s.more();
      s.pick("Extend to 32 steps");
      s.tapRect(s.layout().pages[3]);
      s.tapCell(1, s.rows()[2]);
      expect(countNotes(s.act.grid)).toBe(1);
      s.more();
      s.pick("Cut to 16 steps");
      expect(s.act.grid.steps).toBe(16);
      s.more();
      s.pick("Undo");
      expect(s.act.grid.steps).toBe(32);
      expect(noteAt(s.act.grid, "melody", 25)).not.toBeNull();
    });

    it("undoes the last edit once, then says there is nothing to undo", () => {
      const s = setup(screen);
      s.more();
      s.pick("Undo");
      expect(s.act.message).toBe("Nothing to undo.");
      const k = s.rows()[1];
      s.tapCell(0, k);
      s.tapCell(1, k);
      expect(countNotes(s.act.grid)).toBe(2);
      s.more();
      s.pick("Undo");
      expect(countNotes(s.act.grid)).toBe(1);
      s.more();
      s.pick("Undo");
      expect(s.act.message).toBe("Nothing to undo.");
      expect(countNotes(s.act.grid)).toBe(1);
      // A clear is undone too, and a tempo change.
      s.tapCell(0, k);
      expect(countNotes(s.act.grid)).toBe(0);
      s.more();
      s.pick("Undo");
      expect(countNotes(s.act.grid)).toBe(1);
      s.tapRect(s.layout().tempoUp);
      expect(s.act.grid.tempo).toBe(M.tempo.default + M.tempo.step);
      s.more();
      s.pick("Undo");
      expect(s.act.grid.tempo).toBe(M.tempo.default);
    });

    it("has a name change undone by Undo", () => {
      const s = setup(screen);
      const before = s.act.grid.title;
      s.tapRect(s.layout().name);
      s.act.setText("Brand new");
      s.press("Enter");
      s.more();
      s.pick("Undo");
      expect(s.act.grid.title).toBe(before);
    });

    it("Back and Escape in the menu change nothing", () => {
      const s = setup(screen);
      s.more();
      s.pick("Back");
      s.more();
      s.fake.closeDialog({ path: [], cancelled: true });
      expect(s.act.done).toBe(false);
      expect(s.act.grid.steps).toBe(16);
    });

    it("deletes a saved track from More after a confirm, and No keeps it", () => {
      const s = setup(screen);
      s.tapCell(0, s.rows()[0]);
      s.tapRect(s.layout().save);
      expect(s.store.list()).toHaveLength(1);
      s.more();
      s.pick("Delete");
      expect(s.dialogLabels()).toEqual(["No", "Yes"]);
      s.fake.closeDialog({ path: ["Delete", "No"], cancelled: false });
      expect(s.store.list()).toHaveLength(1);
      s.more();
      s.pick("Delete");
      s.fake.closeDialog({ path: ["Delete", "Yes"], cancelled: false });
      expect(s.store.list()).toHaveLength(0);
      expect(s.act.message).toBe("Deleted.");
      expect(s.act.editingId).toBeNull();
    });

    it("says nothing is saved when there is nothing to delete", () => {
      const s = setup(screen);
      s.more();
      s.pick("Delete");
      expect(s.act.message).toBe("Nothing saved to delete yet.");
    });

    it("at the track limit says where Delete is, and a phone can then delete one", () => {
      const store = new DemoStore(memory(), M.storageKey, { reserved: () => [], log: () => {} });
      for (let i = 0; i < M.maxTracks; i++) {
        const t = setup(screen, store);
        if (t.fake.dialogs.length > 0) t.fake.closeDialog({ path: ["Make a track", "New track"], cancelled: false });
        t.tapCell(0, t.rows()[0]);
        t.tapRect(t.layout().save);
        t.act.cancel();
      }
      expect(store.list()).toHaveLength(M.maxTracks);
      const s = setup(screen, store);
      // The start menu: open the first saved track (a tap on its row).
      const labels = s.dialogLabels();
      s.fake.closeDialog({ path: ["Make a track", labels[0]], cancelled: false });
      s.tapRect(s.layout().save);
      s.more();
      s.pick("Delete");
      s.fake.closeDialog({ path: ["Delete", "Yes"], cancelled: false });
      expect(store.list()).toHaveLength(M.maxTracks - 1);
      // A new track at the limit: the message names the buttons, not a key.
      const full = new DemoStore(memory(), M.storageKey, { reserved: () => [], log: () => {} });
      for (let i = 0; i < M.maxTracks; i++) {
        const t = setup(screen, full);
        if (t.fake.dialogs.length > 0) t.fake.closeDialog({ path: ["Make a track", "New track"], cancelled: false });
        t.tapCell(0, t.rows()[0]);
        t.tapRect(t.layout().save);
        t.act.cancel();
      }
      const n = setup(screen, full);
      n.fake.closeDialog({ path: ["Make a track", "New track"], cancelled: false });
      n.tapCell(0, n.rows()[0]);
      n.tapRect(n.layout().save);
      expect(n.act.message).toBe("12 saved. Open one, More, Delete.");
      expect(n.act.message).not.toMatch(/\bpress\b|\bD\b/i);
    });

    it("keeps the end of a long name and the caret in view while typing", () => {
      const s = setup(screen);
      s.tapRect(s.layout().name);
      const name = "Abcdefghijklmnopqrstuvwx";
      s.act.setText(name);
      expect(name).toHaveLength(24);
      drawn.length = 0;
      const ctx = new Proxy({} as Record<string, unknown>, { get: (t, k: string) => (k in t ? t[k] : () => {}), set: (t, k: string, v) => ((t[k] = v), true) }) as unknown as CanvasRenderingContext2D;
      s.act.draw(ctx, screen);
      const shown = drawn.find((t) => name.endsWith(t) && t.length > 4);
      expect(shown, drawn.join("|")).toBeDefined();
      expect(shown!.endsWith("x")).toBe(true);
      expect(fitTail("abcdef", 100)).toBe("abcdef");
    });

    it("makes, saves, renames and deletes with taps, the pad, A and B only", () => {
      const s = setup(screen);
      s.tapCell(0, s.rows()[0]);
      s.tapCell(1, s.rows()[2]);
      s.tapRect(s.layout().tabs[1]);
      s.tapCell(2, s.rows()[3]);
      s.tapRect(s.layout().tabs[2]);
      s.tapCell(0, 0);
      s.tapCell(1, 1);
      s.tapCell(2, 2);
      s.tapCell(3, 0);
      s.tapCell(4, 1);
      s.tapCell(5, 2);
      s.tapRect(s.layout().save);
      expect(s.store.list()).toHaveLength(1);
      // Rename from the name button: the keyboard types through setText, its Go key is Enter.
      s.tapRect(s.layout().name);
      s.act.setText("Evening loop");
      s.press("Enter");
      s.tapRect(s.layout().save);
      expect(s.store.list().map((d) => d.title)).toEqual(["Evening loop"]);
      // Delete from More, confirmed by tapping Yes.
      s.more();
      s.pick("Delete");
      s.fake.closeDialog({ path: ["Delete", "Yes"], cancelled: false });
      expect(s.store.list()).toHaveLength(0);
      s.act.cancel();
      expect(s.act.done).toBe(true);
    });
  });
}

