import { afterEach, describe, expect, it } from "vitest";
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

afterEach(() => setTouchHints(false));

const dt = 1 / 60;
const memory = (): KeyValueStorage => {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};

function setup(screen = NARROW_VIEW) {
  setTouchHints(true);
  const store = new DemoStore(memory(), M.storageKey, { reserved: () => [], log: () => {} });
  const fake = fakeHost();
  const act = new MakeTrackActivity(fake.host, store, { copy: async () => true, read: async () => null, onPaste: () => () => {} });
  act.start();
  const rows = () => touchRowKeys(act.channel, act.rows[act.channel]);
  const layout = () => touchEditorLayout(screen, { steps: act.grid.steps, rows: rows().length });
  // Taps the middle of a rectangle through the activity's own target list, as the touch layer does.
  const tapRect = (r: Rect) => {
    const hit = targetAt(act.tapTargets(screen), r.x + r.w / 2, r.y + r.h / 2);
    expect(hit, JSON.stringify(r)).not.toBeNull();
    hit!.run();
  };
  // Taps the cell for a step on the page shown and a pitch in the rows shown.
  const tapCell = (col: number, key: number) => tapRect(cellRect(layout(), col, rows().indexOf(key)));
  const press = (...codes: string[]) => codes.forEach((c) => act.update(dt, { ...NO_INPUT, keys: [c] }));
  const wait = (s: number) => {
    for (let t = 0; t < s; t += dt) act.update(dt, NO_INPUT);
  };
  return { act, store, fake, layout, rows, tapRect, tapCell, press, wait };
}

for (const screen of [NARROW_VIEW, DESKTOP_VIEW]) {
  describe(`taps that edit, ${screen.width} x ${screen.height} (issue 106b)`, () => {
    it("gives no targets on the keyboard look or before a track is open", () => {
      const s = setup(screen);
      expect(s.act.tapTargets(screen).length).toBeGreaterThan(20);
      setTouchHints(false);
      expect(s.act.tapTargets(screen)).toEqual([]);
    });

    it("has no two targets overlapping and every one inside the view", () => {
      const s = setup(screen);
      for (const ch of ["melody", "bass", "beat"] as const) {
        s.act.channel = ch;
        const t = s.act.tapTargets(screen);
        for (const a of t) expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= screen.width && a.y + a.h <= screen.height).toBe(true);
        for (let i = 0; i < t.length; i++)
          for (let j = i + 1; j < t.length; j++) {
            const [a, b] = [t[i], t[j]];
            expect(a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).toBe(false);
          }
      }
    });

    it("places a note on a cell tap, clears it on the same row, replaces it on another, and blips", () => {
      const s = setup(screen);
      const [top, , third] = s.rows();
      s.tapCell(2, top);
      expect(noteAt(s.act.grid, "melody", 2)).toMatchObject({ step: 2, key: top });
      expect(s.fake.blips).toHaveLength(1);
      expect(s.act.step).toBe(2);
      expect(s.act.rows.melody).toBe(top);
      s.tapCell(2, third);
      expect(noteAt(s.act.grid, "melody", 2)).toMatchObject({ key: third });
      expect(countNotes(s.act.grid)).toBe(1);
      s.tapCell(2, third);
      expect(countNotes(s.act.grid)).toBe(0);
    });

    it("maps a tap on a later page to the right step", () => {
      const s = setup(screen);
      s.tapRect(s.layout().pages[1]);
      s.tapCell(3, s.rows()[0]);
      expect(noteAt(s.act.grid, "melody", 11)).not.toBeNull();
      expect(s.act.grid.channels.melody.map((n) => n.step)).toEqual([11]);
    });

    it("does the same as the E key for the same cell", () => {
      const a = setup(screen);
      const b = setup(screen);
      const key = a.rows()[1];
      a.tapCell(4, key);
      b.press("ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowUp", "KeyE");
      expect(a.act.grid.channels.melody).toEqual(b.act.grid.channels.melody.map((n) => ({ ...n, key })));
    });

    it("plays a pitch from its label and places nothing", () => {
      const s = setup(screen);
      s.tapRect(s.layout().gutter[0]);
      expect(s.fake.blips).toHaveLength(1);
      expect(countNotes(s.act.grid)).toBe(0);
    });

    it("switches channels from the tabs, keeping each channel's cursor row", () => {
      const s = setup(screen);
      s.tapCell(0, s.rows()[2]);
      const melodyRow = s.act.rows.melody;
      s.tapRect(s.layout().tabs[2]);
      expect(s.act.channel).toBe("beat");
      s.tapCell(1, 2);
      expect(s.act.grid.channels.beat).toEqual([{ step: 1, key: 2, length: 1 }]);
      s.tapRect(s.layout().tabs[0]);
      expect(s.act.channel).toBe("melody");
      expect(s.act.rows.melody).toBe(melodyRow);
    });

    it("reaches every pitch by scrolling the window with the UP and DN buttons", () => {
      for (const [ch, tab] of [["melody", 0], ["bass", 1]] as const) {
        const s = setup(screen);
        s.tapRect(s.layout().tabs[tab]);
        const { low, high } = { melody: { low: 48, high: 83 }, bass: { low: 36, high: 59 } }[ch];
        const seen = new Set<number>();
        for (let i = 0; i < 8; i++) {
          s.rows().forEach((k) => seen.add(k));
          s.tapRect(s.layout().pitchDown);
        }
        for (let i = 0; i < 12; i++) {
          s.rows().forEach((k) => seen.add(k));
          s.tapRect(s.layout().pitchUp);
        }
        for (let k = low; k <= high; k++) expect(seen.has(k), `${ch} ${k}`).toBe(true);
        expect(s.act.rows[ch]).toBeLessThanOrEqual(high);
      }
    });

    it("has no scroll buttons in the beat channel", () => {
      const s = setup(screen);
      s.tapRect(s.layout().tabs[2]);
      const l = s.layout();
      expect(targetAt(s.act.tapTargets(screen), l.pitchUp.x + 1, l.pitchUp.y + 1)).toBeNull();
    });

    it("shows a page from the page buttons and follows it with the cursor column", () => {
      const s = setup(screen);
      s.tapRect(s.layout().pages[1]);
      expect(s.act.step).toBe(8);
      s.tapRect(s.layout().pages[0]);
      expect(s.act.step).toBe(0);
      s.act.grid.steps = 32;
      s.tapRect(s.layout().pages[3]);
      expect(s.act.step).toBe(24);
    });

    it("moves the tempo by 4 from each half and stops at 60 and 180", () => {
      const s = setup(screen);
      const start = s.act.grid.tempo;
      s.tapRect(s.layout().tempoUp);
      expect(s.act.grid.tempo).toBe(start + M.tempo.step);
      s.tapRect(s.layout().tempoDown);
      s.tapRect(s.layout().tempoDown);
      expect(s.act.grid.tempo).toBe(start - M.tempo.step);
      for (let i = 0; i < 60; i++) s.tapRect(s.layout().tempoDown);
      expect(s.act.grid.tempo).toBe(M.tempo.min);
      for (let i = 0; i < 80; i++) s.tapRect(s.layout().tempoUp);
      expect(s.act.grid.tempo).toBe(M.tempo.max);
    });

    it("LENGTH changes the note under the cursor, else the pen", () => {
      const s = setup(screen);
      s.tapRect(s.layout().length);
      expect(s.act.pen).toBe(2);
      s.tapCell(0, s.rows()[0]);
      expect(s.act.grid.channels.melody[0].length).toBe(2);
      s.tapRect(s.layout().length);
      expect(s.act.grid.channels.melody[0].length).toBe(4);
      expect(s.act.pen).toBe(4);
    });

    it("PLAY starts and stops the preview, and says so when there are no notes", () => {
      const s = setup(screen);
      s.tapRect(s.layout().play);
      expect(s.act.playing).toBe(false);
      expect(s.act.message).toBe("Add some notes first.");
      s.tapCell(0, s.rows()[0]);
      s.tapRect(s.layout().play);
      expect(s.act.playing).toBe(true);
      expect(s.fake.previews.at(-1)?.track).not.toBeNull();
      s.tapRect(s.layout().play);
      expect(s.act.playing).toBe(false);
      expect(s.fake.previews.at(-1)?.track).toBeNull();
    });

    it("SAVE saves, and pays once for a track with enough notes on two channels", () => {
      const s = setup(screen);
      for (let i = 0; i < 4; i++) s.tapCell(i, s.rows()[i % 2]);
      s.tapRect(s.layout().tabs[2]);
      for (let i = 0; i < 4; i++) s.tapCell(i * 2, 2);
      s.tapRect(s.layout().save);
      expect(s.store.list()).toHaveLength(1);
      expect(s.fake.rewards).toHaveLength(1);
      expect(s.act.message).toMatch(/^Saved\. \+\d+ points\.$/);
      s.tapRect(s.layout().save);
      expect(s.fake.rewards).toHaveLength(1);
      expect(s.store.list()).toHaveLength(1);
    });

    it("keeps the draft after a tap edit", () => {
      const s = setup(screen);
      s.tapCell(0, s.rows()[0]);
      expect(s.store.draft()?.grid.channels.melody).toHaveLength(1);
    });

    it("opens the name box from the name button and the More menu from More (issue 106c)", () => {
      const s = setup(screen);
      s.tapRect(s.layout().more);
      expect(s.fake.dialogs).toHaveLength(1);
      expect(s.act.naming).toBeNull();
      s.fake.closeDialog({ path: [], cancelled: true });
      s.tapRect(s.layout().name);
      expect(s.act.naming).toBe(s.act.grid.title);
    });

    it("lets a page chosen by a tap stay while playing, then follows the playhead", () => {
      const s = setup(screen);
      s.tapCell(0, s.rows()[0]);
      s.tapRect(s.layout().play);
      const shown = () => (s.act as unknown as { view(): { page: number } }).view().page;
      // The tempo is 100: a step is 0.3 s, so the playhead is on page 1 after 2.4 s.
      s.tapRect(s.layout().pages[0]);
      s.wait(2.6);
      expect(shown()).toBe(0); // held
      s.wait(M.pageHoldSeconds);
      expect(shown()).toBe(Math.floor(((s.act as unknown as { view(): { playStep: number } }).view().playStep) / 8));
    });

    it("follows the playhead from the start while playing, and the cursor when stopped", () => {
      const s = setup(screen);
      s.tapCell(0, s.rows()[0]);
      s.tapRect(s.layout().play);
      const view = () => (s.act as unknown as { view(): { page: number; playStep: number } }).view();
      s.wait(3);
      expect(view().playStep).toBeGreaterThanOrEqual(8);
      expect(view().page).toBe(1);
      s.tapRect(s.layout().play);
      expect(view().page).toBe(0);
    });

    it("a pad press hands the page back to the cursor", () => {
      const s = setup(screen);
      s.tapRect(s.layout().pages[1]);
      s.press("ArrowLeft");
      const view = () => (s.act as unknown as { view(): { page: number } }).view();
      expect(s.act.step).toBe(7);
      expect(view().page).toBe(0);
    });

    it("a track cut to 16 steps drops a page chosen beyond it", () => {
      const s = setup(screen);
      s.act.grid.steps = 32;
      s.tapRect(s.layout().pages[3]);
      s.press("Comma");
      const view = () => (s.act as unknown as { view(): { page: number } }).view();
      expect(view().page).toBeLessThan(2);
    });

    it("ignores taps while naming, and after leaving", () => {
      const s = setup(screen);
      s.press("KeyN");
      expect(s.act.tapTargets(screen)).toEqual([]);
      s.press("Enter");
      s.act.cancel();
      expect(s.act.tapTargets(screen)).toEqual([]);
    });

    it("makes, plays and saves a track with taps, the pad and A/B only", () => {
      const s = setup(screen);
      // Melody across two pages and two windows, after scrolling by taps.
      s.tapCell(0, s.rows()[0]);
      s.tapRect(s.layout().pitchUp);
      s.tapCell(1, s.rows()[0]);
      s.tapRect(s.layout().pages[1]);
      s.tapCell(0, s.rows()[3]);
      s.tapCell(1, s.rows()[3]);
      s.tapRect(s.layout().tabs[1]);
      s.tapCell(2, s.rows()[5]);
      s.tapCell(3, s.rows()[5]);
      s.tapRect(s.layout().tabs[2]);
      s.tapCell(0, 0);
      s.tapCell(1, 1);
      s.press("ArrowRight", "KeyE"); // the pad and A (E) still edit
      expect(countNotes(s.act.grid)).toBeGreaterThanOrEqual(8);
      s.tapRect(s.layout().play);
      expect(s.act.playing).toBe(true);
      s.tapRect(s.layout().play);
      s.tapRect(s.layout().save);
      expect(s.store.list()).toHaveLength(1);
      expect(s.fake.rewards).toHaveLength(1);
      s.press("Escape");
      s.act.cancel();
      expect(s.act.done).toBe(true);
    });
  });
}
