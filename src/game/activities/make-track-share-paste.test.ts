import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT } from "../../input/controls";
import type { ClipboardLike, ShareLike, ShareResult } from "../../input/clipboard";
import { targetAt } from "../../input/tap";
import { setTouchHints } from "../../render/hints";
import { touchEditorLayout, touchHintText, touchRowKeys } from "../../render/track-editor-touch";
import { DESKTOP_VIEW, MAKE_TRACKS as M, NARROW_VIEW } from "../config";
import type { KeyValueStorage } from "../achievements/progress";
import { DemoStore } from "../music/demo-store";
import { cleanTrackText, countNotes, emptyGrid, gridToTrackText, placeNote, trackTextToGrid } from "../music/demos";
import { fakeHost } from "./fake-host";
import { MakeTrackActivity } from "./make-track";

// Share, Copy and Paste on a phone (issue 106d): the share sheet with a Copy fallback, the clipboard
// first and then the paste box, and the cleaning of text that Notes, Messages and mail have changed.

afterEach(() => setTouchHints(false));

const dt = 1 / 60;
const memory = (): KeyValueStorage => {
  const data = new Map<string, string>();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
};
const flush = () => new Promise((r) => setTimeout(r, 0));

const TRACK = "title: Porch Song\ntempo: 100\n[melody square 0.5]\nC4:1 E4:1 G4:2\n[bass triangle 0.5]\nC3:2 R:2\n[beat drums 0.5]\nK:1 H:1 S:1 H:1\n";

interface Options {
  touch?: boolean;
  read?: () => Promise<string | null>;
  share?: (title: string, text: string) => Promise<ShareResult>;
  copy?: (text: string) => Promise<boolean>;
}

function setup(o: Options = {}, screen = NARROW_VIEW) {
  setTouchHints(o.touch ?? true);
  const fake = fakeHost();
  const copied: string[] = [];
  const shared: { title: string; text: string }[] = [];
  const pasteListeners: ((t: string) => void)[] = [];
  const clipboard: ClipboardLike = {
    copy: o.copy ?? (async (t) => (copied.push(t), true)),
    read: o.read ?? (async () => null),
    onPaste: (l) => (pasteListeners.push(l), () => {}),
  };
  const sharer: ShareLike = {
    share: (title, text) => {
      shared.push({ title, text });
      return (o.share ?? (async () => "shared"))(title, text);
    },
  };
  const store = new DemoStore(memory(), M.storageKey, { reserved: () => [], log: () => {} });
  const act = new MakeTrackActivity(fake.host, store, clipboard, sharer);
  act.start();
  const layout = () => touchEditorLayout(screen, { steps: act.grid.steps, rows: touchRowKeys(act.channel, act.rows[act.channel]).length });
  const more = () => {
    const r = layout().more;
    targetAt(act.tapTargets(screen), r.x + r.w / 2, r.y + r.h / 2)!.run();
  };
  const pick = (label: string) => fake.closeDialog({ path: ["More", label], cancelled: false });
  const press = (...codes: string[]) => codes.forEach((c) => act.update(dt, { ...NO_INPUT, keys: [c] }));
  const withNotes = () => {
    placeNote(act.grid, "melody", 0, 60, 1);
    placeNote(act.grid, "melody", 2, 64, 2);
  };
  const viaMore = (label: string) => {
    more();
    pick(label);
  };
  return { act, fake, copied, shared, pasteListeners, more, pick, press, withNotes, viaMore };
}

describe("cleanTrackText (issue 106d)", () => {
  it("leaves clean text alone and parses back what the editor wrote", () => {
    const g = emptyGrid("Porch Song");
    placeNote(g, "melody", 0, 60, 1);
    const text = gridToTrackText(g);
    expect(cleanTrackText(text)).toBe(text);
    expect(cleanTrackText(TRACK)).toBe(TRACK);
  });

  it("turns CRLF and lone CR line endings into newlines", () => {
    expect(cleanTrackText(TRACK.replace(/\n/g, "\r\n"))).toBe(TRACK);
    expect(cleanTrackText(TRACK.replace(/\n/g, "\r"))).toBe(TRACK);
  });

  it("turns non-breaking and other odd spaces into spaces", () => {
    const odd = TRACK.replace(/ /g, " ").replace("tempo:", "tempo: ").replace("C4:1", "C4:1　");
    const read = trackTextToGrid(cleanTrackText(odd));
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.grid.title).toBe("Porch Song");
  });

  it("makes curly quotes and dashes in a title plain", () => {
    const text = cleanTrackText("title: Marc’s “porch” – one\n[m square]\nC4\n");
    expect(text.split("\n")[0]).toBe(`title: Marc's "porch" - one`);
  });

  it("drops a byte order mark and zero-width marks", () => {
    expect(cleanTrackText(`﻿${TRACK.replace("Porch", "Por​ch")}`)).toBe(TRACK);
  });

  it.each([
    ["Sent from my iPhone", `${TRACK}\nSent from my iPhone\n`],
    ["Sent from my phone with a trailing blank line", `${TRACK}Sent from my Galaxy\n\n\n`],
    ["Get Outlook for iOS", `${TRACK}\nGet Outlook for iOS <https://aka.ms/o0ukef>`],
    ["a -- delimiter and a name", `${TRACK}-- \nSomeone\nSomeone@example.com\n`],
    ["a dash line made long by the keyboard", `${TRACK}——\nBest,\nSomeone`],
    ["a code fence around it", `\`\`\`\n${TRACK}\`\`\`\n`],
    ["a quote mark on each line", TRACK.split("\n").map((l) => `> ${l}`).join("\n")],
  ])("takes out %s", (_name, mangled) => {
    expect(cleanTrackText(mangled)).toBe(TRACK);
    expect(trackTextToGrid(cleanTrackText(mangled)).ok).toBe(true);
  });

  it("handles everything at once", () => {
    const mangled = `﻿${TRACK.replace(/\n/g, "\r\n").replace(/ /g, " ")}\r\n--\r\nSent from my iPhone\r\n`;
    expect(trackTextToGrid(cleanTrackText(mangled)).ok).toBe(true);
  });

  it("does not hide text that is not a track (the parser still refuses it)", () => {
    for (const text of ["", "   \n", "hello there", "Sent from my iPhone", "C4 E4 G4"]) {
      expect(trackTextToGrid(cleanTrackText(text)).ok, JSON.stringify(text)).toBe(false);
    }
  });

  it("does not take a sharp (#) note or a rest line for a signature", () => {
    const text = "title: Sharp\ntempo: 100\n[melody square 0.5]\nF#4:1 R:1 Bb4:2\n";
    expect(cleanTrackText(text)).toBe(text);
  });
});

describe("importText with mangled text (issue 106d)", () => {
  it("takes CRLF, NBSP, smart punctuation and a signature", () => {
    const s = setup();
    const mangled = `title: Marc’s Tune\r\ntempo: 100\r\n[melody square 0.5]\r\nC4:1 E4:1\r\n\r\n-- \r\nSent from my iPhone\r\n`;
    expect(s.act.importText(mangled)).toBe(true);
    expect(s.act.grid.title).toBe("Marc's Tune");
    expect(countNotes(s.act.grid)).toBe(2);
    expect(s.act.message).toMatch(/Pasted/);
  });

  it("still refuses a record the editor cannot show, and says why", () => {
    const s = setup();
    const before = JSON.stringify(s.act.grid);
    expect(s.act.importText("title: X\ntempo: 100\n[lead wobble 0.5]\nC4:1\n")).toBe(false);
    expect(s.act.message).toMatch(/wobble|wave/);
    expect(JSON.stringify(s.act.grid)).toBe(before);
  });

  it("a Ctrl+V paste (desktop) is cleaned too, and the desktop line is unchanged", async () => {
    const s = setup({ touch: false });
    s.pasteListeners[0](TRACK.replace(/\n/g, "\r\n"));
    expect(s.act.grid.title).toBe("Porch Song");
    const t = setup({ touch: false });
    t.press("KeyV");
    await flush();
    expect(t.act.message).toBe("Press Ctrl+V to paste.");
    expect(t.act.wantsText).toBe(false);
  });
});

for (const screen of [NARROW_VIEW, DESKTOP_VIEW]) {
  describe(`Share, ${screen.width} x ${screen.height} (issue 106d)`, () => {
    it("is in the More menu and sends the track text and name to the share sheet from the tap itself", () => {
      const s = setup({}, screen);
      s.withNotes();
      s.act.grid.title = "Porch Song";
      s.more();
      expect((s.fake.dialogs.at(-1)!.node as { choices: { label: string }[] }).choices.map((c) => c.label)).toContain("Share");
      s.pick("Share");
      // Before any await: the call happened synchronously with the pick.
      expect(s.shared).toHaveLength(1);
      expect(s.shared[0].title).toBe("Porch Song");
      expect(s.shared[0].text).toBe(gridToTrackText(s.act.grid));
      expect(trackTextToGrid(s.shared[0].text).ok).toBe(true);
    });

    it("says Shared when it worked, and does not copy", async () => {
      const s = setup({}, screen);
      s.withNotes();
      s.viaMore("Share");
      await flush();
      expect(s.act.message).toBe("Shared.");
      expect(s.copied).toEqual([]);
    });

    it("copies when the browser has no share sheet", async () => {
      const s = setup({ share: async () => "unsupported" }, screen);
      s.withNotes();
      s.viaMore("Share");
      await flush();
      expect(s.copied).toEqual([s.shared[0].text]);
      expect(s.act.message).toBe("Copied.");
    });

    it("copies when the share sheet fails or throws", async () => {
      for (const share of [async () => "failed" as const, () => Promise.reject(new Error("no"))]) {
        const s = setup({ share }, screen);
        s.withNotes();
        s.viaMore("Share");
        await flush();
        expect(s.copied).toHaveLength(1);
      }
    });

    it("does not copy when the player closes the sheet", async () => {
      const s = setup({ share: async () => "cancelled" }, screen);
      s.withNotes();
      s.viaMore("Share");
      await flush();
      expect(s.copied).toEqual([]);
      expect(s.act.message).toBe("Not shared.");
    });

    it("an empty track or a bad name shares nothing and says so", async () => {
      const s = setup({}, screen);
      s.viaMore("Share");
      expect(s.shared).toEqual([]);
      expect(s.act.message).toBe("Nothing to share yet.");
      s.withNotes();
      s.act.grid.title = "";
      s.viaMore("Share");
      expect(s.shared).toEqual([]);
    });

    it("Copy still copies", async () => {
      const s = setup({}, screen);
      s.withNotes();
      s.viaMore("Copy");
      await flush();
      expect(s.copied).toHaveLength(1);
      expect(s.act.message).toBe("Copied.");
    });

    it("says nothing with a desktop key in it (touch)", async () => {
      const said: string[] = [];
      for (const share of [async () => "shared" as const, async () => "cancelled" as const, async () => "unsupported" as const]) {
        const s = setup({ share, copy: async () => false }, screen);
        s.withNotes();
        s.viaMore("Share");
        await flush();
        said.push(s.act.message);
      }
      for (const m of said) expect(m).not.toMatch(/ctrl|console|press [a-z]\b/i);
    });
  });

  describe(`Paste, ${screen.width} x ${screen.height} (issue 106d)`, () => {
    it("takes the clipboard first, cleaned, and never opens the box", async () => {
      const s = setup({ read: async () => `${TRACK.replace(/\n/g, "\r\n")}\r\nSent from my iPhone` }, screen);
      s.viaMore("Paste");
      await flush();
      expect(s.act.grid.title).toBe("Porch Song");
      expect(s.act.wantsText).toBe(false);
      expect(s.act.textBox).toBe(false);
    });

    it("opens the paste box when the clipboard cannot be read, says how, and wants text", async () => {
      for (const read of [async () => null, () => Promise.reject(new Error("denied")), async () => "  \n"]) {
        const s = setup({ read }, screen);
        s.viaMore("Paste");
        await flush();
        expect(s.act.wantsText).toBe(true);
        expect(s.act.textBox).toBe(true);
        expect(s.act.textValue()).toBe("");
        expect(touchHintText({ message: "", naming: false, pasting: true, firstTouch: false })).toMatch(/Paste/);
      }
    });

    it("the clipboard text that is not a track says why and does not open the box", async () => {
      const s = setup({ read: async () => "buy milk" }, screen);
      s.viaMore("Paste");
      await flush();
      expect(s.act.message).not.toBe("");
      expect(s.act.textBox).toBe(false);
    });

    it("a pasted mangled track in the box is imported and closes the box", async () => {
      const s = setup({}, screen);
      s.viaMore("Paste");
      await flush();
      s.act.setText(`﻿${TRACK.replace(/\n/g, "\r\n").replace(/ /g, " ")}\r\n--\r\nSent from my iPhone`);
      expect(s.act.grid.title).toBe("Porch Song");
      expect(s.act.wantsText).toBe(false);
      expect(s.act.textValue()).toBe("");
      expect(s.act.message).toMatch(/Pasted/);
    });

    it("text that is not a track empties the box with the reason, ready for another try", async () => {
      const s = setup({}, screen);
      s.viaMore("Paste");
      await flush();
      s.act.setText("hello\nthere");
      expect(s.act.message).not.toBe("");
      expect(s.act.textValue()).toBe("");
      expect(s.act.textBox).toBe(true);
      expect(s.act.grid.title).not.toBe("hello");
    });

    it("a record with an unsupported wave is refused in the box with the parser's reason", async () => {
      const s = setup({}, screen);
      s.viaMore("Paste");
      await flush();
      s.act.setText("title: X\ntempo: 100\n[lead wobble 0.5]\nC4:1\n");
      expect(s.act.message).toMatch(/wobble|wave/);
      expect(s.act.textBox).toBe(true);
    });

    it("a few typed letters wait; Go reads them and says why it cannot", async () => {
      const s = setup({}, screen);
      s.viaMore("Paste");
      await flush();
      s.act.setText("abc");
      expect(s.act.message).toBe("");
      expect(s.act.textValue()).toBe("abc");
      s.press("Enter");
      expect(s.act.message).not.toBe("");
      expect(s.act.textValue()).toBe("");
    });

    it("Go on an empty box asks for a paste", async () => {
      const s = setup({}, screen);
      s.viaMore("Paste");
      await flush();
      s.press("Enter");
      expect(s.act.message).toMatch(/Paste a track/);
      expect(s.act.textBox).toBe(true);
    });

    it("a huge paste is cut and refused, not hung", async () => {
      const s = setup({}, screen);
      s.viaMore("Paste");
      await flush();
      s.act.setText("x\n".repeat(200_000));
      expect(s.act.textValue().length).toBeLessThanOrEqual(M.maxTextBytes * 2);
      expect(s.act.message).not.toBe("");
    });

    it("has no taps while the box is open, and the field is ignored outside it", async () => {
      const s = setup({}, screen);
      s.viaMore("Paste");
      await flush();
      expect(s.act.tapTargets(screen)).toEqual([]);
      const t = setup({}, screen);
      t.act.setText(TRACK);
      expect(t.act.grid.title).not.toBe("Porch Song");
    });

    it("a name being typed is not disturbed by a late clipboard answer", async () => {
      let answer: (t: string | null) => void = () => {};
      const s = setup({ read: () => new Promise((r) => (answer = r)) }, screen);
      s.viaMore("Paste");
      s.viaMore("Rename");
      answer(null);
      await flush();
      expect(s.act.textBox).toBe(false);
      expect(s.act.naming).not.toBeNull();
    });

    it("leaving the editor closes the box, and a late answer does nothing", async () => {
      let answer: (t: string | null) => void = () => {};
      const s = setup({ read: () => new Promise((r) => (answer = r)) }, screen);
      s.viaMore("Paste");
      s.act.cancel();
      answer(null);
      await flush();
      expect(s.act.wantsText).toBe(false);
    });
  });
}

describe("a touch-only run: make, share, paste (issue 106d)", () => {
  it("Share then paste the shared text back through the box", async () => {
    const a = setup();
    a.withNotes();
    a.act.grid.title = "Round Trip";
    a.viaMore("Share");
    await flush();
    const text = a.shared[0].text;
    const b = setup();
    b.viaMore("Paste");
    await flush();
    // As a messaging app hands it over.
    b.act.setText(`${text.replace(/\n/g, "\r\n").replace(/ /g, " ")}\r\nSent from my iPhone`);
    expect(b.act.grid.title).toBe("Round Trip");
    expect(countNotes(b.act.grid)).toBe(countNotes(a.act.grid));
    expect(vi.isMockFunction(setTimeout)).toBe(false);
  });
});
