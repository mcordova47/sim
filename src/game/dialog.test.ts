import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { DIALOG } from "./config";
import { DialogRunner, choice, menu, paginate, say, wrapText, type Menu } from "./dialog";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const up: Controls = { ...NO_INPUT, dirPressed: "up" };
const down: Controls = { ...NO_INPUT, dirPressed: "down" };
const cancel: Controls = { ...NO_INPUT, cancelPressed: true };

// Measures every character as 6 px wide, like the font (minus the last gap).
const width = (s: string) => (s.length === 0 ? 0 : s.length * 6 - 1);

function record() {
  const log: string[] = [];
  const handlers = {
    onOpen: () => log.push("open"),
    onChoose: (label: string, path: string[]) => log.push(`choose:${label}:${path.join(">")}`),
    onClose: () => log.push("close"),
  };
  return { log, handlers };
}

// A small box that wraps at 30 px, which is 5 characters.
const SMALL = 30;

function run(r: DialogRunner, seconds: number, controls: Controls = NO_INPUT) {
  for (let i = 0; i < Math.round(seconds / dt); i++) r.update(dt, controls);
}

describe("wrapText", () => {
  it("wraps at spaces, within the width", () => {
    expect(wrapText("aa bb cc dd", 29, width)).toEqual(["aa bb", "cc dd"]);
    expect(wrapText("aa bb cc dd", 11, width)).toEqual(["aa", "bb", "cc", "dd"]);
  });

  it("keeps a line that fits exactly, and breaks one character over", () => {
    expect(wrapText("abcde", 29, width)).toEqual(["abcde"]);
    expect(wrapText("abcde fghij", 29, width)).toEqual(["abcde", "fghij"]);
    expect(wrapText("abcde f", 29, width)).toEqual(["abcde", "f"]);
  });

  it("splits a word that is too long for a line", () => {
    const lines = wrapText("abcdefghijkl", 29, width);
    expect(lines.join("")).toBe("abcdefghijkl");
    for (const line of lines) expect(width(line)).toBeLessThanOrEqual(29);
  });

  it("starts a new line at a newline and keeps blank lines", () => {
    expect(wrapText("aa\nbb", 100, width)).toEqual(["aa", "bb"]);
    expect(wrapText("aa\n\nbb", 100, width)).toEqual(["aa", "", "bb"]);
  });

  it("squeezes extra spaces and replaces typographic characters", () => {
    expect(wrapText("aa    bb", 100, width)).toEqual(["aa bb"]);
    expect(wrapText("it’s “ok” — fine…", 400, width)).toEqual([
      'it\'s "ok" - fine...',
    ]);
  });

  it("gives one empty line for empty text", () => {
    expect(wrapText("", 100, width)).toEqual([""]);
  });

  it("never makes a line wider than the box, for long mixed text", () => {
    const text = "The quick brown fox jumps over the lazy dog; supercalifragilisticexpialidocious!";
    for (const max of [29, 41, 59, 100]) {
      for (const line of wrapText(text, max, width)) expect(width(line)).toBeLessThanOrEqual(max);
    }
  });
});

describe("paginate", () => {
  it("groups lines into pages", () => {
    expect(paginate(["a", "b", "c", "d", "e"], 2)).toEqual([["a", "b"], ["c", "d"], ["e"]]);
    expect(paginate(["a", "b"], 3)).toEqual([["a", "b"]]);
  });
  it("makes one empty page for no lines", () => {
    expect(paginate([], 3)).toEqual([[""]]);
  });
});

describe("DialogRunner: saying things", () => {
  it("opens, shows text a bit at a time, and closes after the last page", () => {
    const { log, handlers } = record();
    const r = new DialogRunner(handlers, SMALL);
    expect(r.open).toBe(false);
    expect(r.start(say("hi"))).toBe(true);
    expect(log).toEqual(["open"]);
    expect(r.view).toMatchObject({ kind: "say", lines: [""], waiting: false });

    run(r, 1 / DIALOG.charsPerSecond + dt);
    expect(r.view).toMatchObject({ lines: ["h"] });
    run(r, 1);
    expect(r.view).toMatchObject({ lines: ["hi"], waiting: true });

    r.update(dt, press);
    expect(r.open).toBe(false);
    expect(log).toEqual(["open", "close"]);
  });

  it("types out at the configured speed", () => {
    const r = new DialogRunner({}, 1000);
    r.start(say("x".repeat(100)));
    run(r, 1);
    const shown = (r.view as { lines: string[] }).lines[0].length;
    expect(Math.abs(shown - DIALOG.charsPerSecond)).toBeLessThanOrEqual(2);
  });

  it("finishes the page on the first press and moves on with the second", () => {
    const r = new DialogRunner({}, 1000);
    r.start(say("hello there"));
    r.update(dt, press);
    expect(r.view).toMatchObject({ lines: ["hello there"], waiting: true });
    expect(r.open).toBe(true);
    r.update(dt, press);
    expect(r.open).toBe(false);
  });

  it("splits long text into pages of the configured number of lines", () => {
    const r = new DialogRunner({}, SMALL);
    // Ten 5-letter words, one per line: with 3 lines a page, that is 4 pages.
    r.start(say(Array.from({ length: 10 }, (_, i) => `word${i}`).join(" ")));
    const pages: string[][] = [];
    for (let guard = 0; guard < 20 && r.open; guard++) {
      r.update(dt, press); // finish the page
      pages.push((r.view as { lines: string[] }).lines);
      r.update(dt, press); // next page (or close)
    }
    expect(pages.map((p) => p.length)).toEqual([3, 3, 3, 1]);
    expect(pages[0]).toEqual(["word0", "word1", "word2"]);
  });

  it("goes on to the next node, with its speaker", () => {
    const r = new DialogRunner({}, 1000);
    r.start(say("one", say("two", undefined, "Marc")));
    r.update(dt, press);
    r.update(dt, press);
    run(r, 1);
    expect(r.view).toMatchObject({ kind: "say", speaker: "Marc", lines: ["two"] });
  });

  it("ignores direction and cancel keys while saying something", () => {
    const r = new DialogRunner({}, 1000);
    r.start(say("one"));
    r.update(dt, down);
    r.update(dt, cancel);
    expect(r.open).toBe(true);
  });

  it("won't start a second dialog while one is open", () => {
    const { log, handlers } = record();
    const r = new DialogRunner(handlers, 1000);
    r.start(say("one"));
    expect(r.start(say("two"))).toBe(false);
    expect(log).toEqual(["open"]);
  });

  it("does nothing, and draws nothing, when closed", () => {
    const r = new DialogRunner({}, 1000);
    expect(() => r.update(dt, press)).not.toThrow();
    expect(r.view).toBeNull();
  });

  it("copes with empty text", () => {
    const r = new DialogRunner({}, 1000);
    r.start(say(""));
    r.update(dt, press);
    r.update(dt, press);
    expect(r.open).toBe(false);
  });
});

describe("DialogRunner: menus", () => {
  const tree = () =>
    menu("Pick one", [choice("First", say("one")), choice("Second", say("two")), choice("Third")]);

  it("shows the prompt and the choices, with the cursor on the first", () => {
    const r = new DialogRunner({}, 1000);
    r.start(tree());
    expect(r.view).toMatchObject({
      kind: "menu",
      promptLines: ["Pick one"],
      choices: ["First", "Second", "Third"],
      cursor: 0,
    });
  });

  it("moves the cursor one entry per press, and wraps around", () => {
    const r = new DialogRunner({}, 1000);
    r.start(tree());
    const cursor = () => (r.view as { cursor: number }).cursor;
    r.update(dt, down);
    r.update(dt, down);
    expect(cursor()).toBe(2);
    r.update(dt, down);
    expect(cursor()).toBe(0);
    r.update(dt, up);
    expect(cursor()).toBe(2);
    // A held key that isn't a fresh press does nothing.
    r.update(dt, { ...NO_INPUT, dir: "down" });
    expect(cursor()).toBe(2);
  });

  it("follows the chosen entry, and reports the choice", () => {
    const { log, handlers } = record();
    const r = new DialogRunner(handlers, 1000);
    r.start(tree());
    r.update(dt, down);
    r.update(dt, press);
    expect(log).toEqual(["open", "choose:Second:Second"]);
    run(r, 1);
    expect(r.view).toMatchObject({ kind: "say", lines: ["two"] });
  });

  it("closes after a choice with nothing after it", () => {
    const { log, handlers } = record();
    const r = new DialogRunner(handlers, 1000);
    r.start(tree());
    r.update(dt, up); // wraps to Third
    r.update(dt, press);
    expect(r.open).toBe(false);
    expect(log).toEqual(["open", "choose:Third:Third", "close"]);
  });

  it("closes on cancel from the top menu", () => {
    const { log, handlers } = record();
    const r = new DialogRunner(handlers, 1000);
    r.start(tree());
    r.update(dt, cancel);
    expect(r.open).toBe(false);
    expect(log).toEqual(["open", "close"]);
  });

  it("opens nested menus, and cancel goes back one level with the cursor where it was", () => {
    const { log, handlers } = record();
    const inner = menu("Inner", [choice("A"), choice("B")]);
    const outer = menu("Outer", [choice("Skip"), choice("Go in", inner)]);
    const r = new DialogRunner(handlers, 1000);
    r.start(outer);
    r.update(dt, down);
    r.update(dt, press);
    expect(r.view).toMatchObject({ kind: "menu", promptLines: ["Inner"], cursor: 0 });
    r.update(dt, down);
    r.update(dt, cancel);
    expect(r.view).toMatchObject({ kind: "menu", promptLines: ["Outer"], cursor: 1 });
    r.update(dt, cancel);
    expect(r.open).toBe(false);
    expect(log).toEqual(["open", "choose:Go in:Go in", "close"]);
  });

  it("reports the whole path of choices", () => {
    const { log, handlers } = record();
    const inner = menu(undefined, [choice("Deep")]);
    const r = new DialogRunner(handlers, 1000);
    r.start(menu("Outer", [choice("Down", inner)]));
    r.update(dt, press);
    r.update(dt, press);
    expect(log).toContain("choose:Deep:Down>Deep");
  });

  it("can offer a menu again after a reply, because nodes can lead back", () => {
    // A menu whose "Yes" reply leads back to the menu itself.
    const loop: Menu = { type: "menu", prompt: "Again?", choices: [] };
    loop.choices.push({ label: "Yes", next: say("ok", loop) }, { label: "No" });
    const r = new DialogRunner({}, 1000);
    r.start(loop);
    for (let round = 0; round < 3; round++) {
      r.update(dt, press); // Yes
      r.update(dt, press); // finish the reply's page
      r.update(dt, press); // move on to the menu again
      expect(r.view).toMatchObject({ kind: "menu", promptLines: ["Again?"] });
    }
    r.update(dt, down);
    r.update(dt, press); // No
    expect(r.open).toBe(false);
  });

  it("works without a prompt, and shows a long prompt's first page only", () => {
    const r = new DialogRunner({}, SMALL);
    r.start(menu(undefined, [choice("A")]));
    expect(r.view).toMatchObject({ promptLines: [] });
    const long = new DialogRunner({}, SMALL);
    long.start(menu(Array.from({ length: 10 }, (_, i) => `word${i}`).join(" "), [choice("A")]));
    expect((long.view as { promptLines: string[] }).promptLines).toHaveLength(DIALOG.linesPerPage);
  });

  it("refuses to build a menu with no choices", () => {
    expect(() => menu("Empty", [])).toThrow("at least one choice");
  });

  it("prefers choosing over cancelling when both are pressed", () => {
    const r = new DialogRunner({}, 1000);
    r.start(tree());
    r.update(dt, { ...NO_INPUT, interactPressed: true, cancelPressed: true });
    expect(r.view).toMatchObject({ kind: "say", lines: [""] });
  });
});
