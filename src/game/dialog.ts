import type { Controls } from "../input/controls";
import { normalizeText, textWidth } from "../render/font";
import { DIALOG } from "./config";

// Dialogs are data: a tree of nodes. A `say` shows text and then continues to
// `next` (or closes if there is none). A `menu` shows choices, and each choice
// continues to its own `next` (or closes). Because nodes are plain objects, a
// node can lead back to an earlier one, so a menu can be offered again.
export interface Say {
  type: "say";
  text: string;
  speaker?: string;
  next?: DialogNode;
}
export interface Choice {
  label: string;
  next?: DialogNode;
}
export interface Menu {
  type: "menu";
  prompt?: string;
  choices: Choice[];
}
export type DialogNode = Say | Menu;

export const say = (text: string, next?: DialogNode, speaker?: string): Say => ({
  type: "say",
  text,
  next,
  speaker,
});

export const choice = (label: string, next?: DialogNode): Choice => ({ label, next });

export function menu(prompt: string | undefined, choices: Choice[]): Menu {
  if (choices.length === 0) throw new Error("A menu needs at least one choice");
  return { type: "menu", prompt, choices };
}

// Breaks `text` into lines no wider than `maxWidth` pixels, at spaces. A word
// too long for a line is split. A newline in the text starts a new line.
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number = textWidth,
): string[] {
  const lines: string[] = [];
  for (const paragraph of normalizeText(text).split("\n")) {
    const words = paragraph.split(/ +/).filter((w) => w.length > 0);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // Split a word that is too long for a line on its own. A line always
      // takes at least one character, even if that is wider than the box, so
      // this can't loop forever on a tiny width.
      let rest = word;
      while (measure(rest) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

// Groups lines into pages of at most `perPage` lines.
export function paginate(lines: string[], perPage: number): string[][] {
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  return pages.length > 0 ? pages : [[""]];
}

// What the box should show right now.
export type DialogView =
  | {
      kind: "say";
      speaker?: string;
      // The lines of the current page, only as much as has appeared so far.
      lines: string[];
      // The whole page is showing, so the next press moves on.
      waiting: boolean;
      blink: boolean;
    }
  | {
      kind: "menu";
      promptLines: string[];
      choices: string[];
      cursor: number;
      blink: boolean;
    };

// What came of a dialog once it closes. `path` is every label picked in it,
// oldest first (empty if it was only text, or backed out of).
export interface DialogResult {
  path: string[];
  // True if the player backed out of a menu to end the dialog, rather than
  // finishing it. The path still holds anything chosen before.
  cancelled: boolean;
}

export interface DialogHandlers {
  onOpen?(): void;
  // `path` is every label picked so far in this dialog, oldest first.
  onChoose?(label: string, path: string[]): void;
  onClose?(result: DialogResult): void;
}

interface Saved {
  menu: Menu;
  cursor: number;
}

// Runs one dialog at a time. It reads the controls only while open, and never
// touches the canvas or the keyboard, so it can be driven by tests.
export class DialogRunner {
  private node: DialogNode | null = null;
  private pages: string[][] = [];
  private page = 0;
  // Characters of the current page that have appeared.
  private revealed = 0;
  private cursor = 0;
  private promptLines: string[] = [];
  // Menus we came through, so cancel can go back to them.
  private history: Saved[] = [];
  private path: string[] = [];
  private time = 0;
  // Called once when the dialog that is open now closes.
  private onDone: ((result: DialogResult) => void) | null = null;

  constructor(
    private readonly handlers: DialogHandlers = {},
    private readonly maxWidth: number = DIALOG.textWidth,
  ) {}

  get open(): boolean {
    return this.node !== null;
  }

  // Starts a dialog. Returns false, doing nothing, if one is already open.
  // `onDone` is called with the result when this dialog closes, so a caller can
  // wait for it and see what was chosen.
  start(node: DialogNode, onDone?: (result: DialogResult) => void): boolean {
    if (this.node) return false;
    this.history = [];
    this.path = [];
    this.time = 0;
    this.onDone = onDone ?? null;
    this.enter(node);
    this.handlers.onOpen?.();
    return true;
  }

  update(dt: number, controls: Controls): void {
    const node = this.node;
    if (!node) return;
    this.time += dt;

    if (node.type === "say") {
      const total = this.pageLength();
      if (this.revealed < total) {
        this.revealed = Math.min(total, this.revealed + dt * DIALOG.charsPerSecond);
      }
      if (controls.interactPressed) {
        if (this.revealed < total) this.revealed = total;
        else this.advance(node);
      }
      return;
    }

    const count = node.choices.length;
    if (controls.dirPressed === "up") this.cursor = (this.cursor + count - 1) % count;
    else if (controls.dirPressed === "down") this.cursor = (this.cursor + 1) % count;
    if (controls.interactPressed) this.choose(node);
    else if (controls.cancelPressed) this.back();
  }

  get view(): DialogView | null {
    const node = this.node;
    if (!node) return null;
    const blink = Math.floor(this.time * 2) % 2 === 0;
    if (node.type === "menu") {
      return {
        kind: "menu",
        promptLines: this.promptLines,
        choices: node.choices.map((c) => normalizeText(c.label)),
        cursor: this.cursor,
        blink,
      };
    }
    let left = Math.floor(this.revealed);
    const lines = (this.pages[this.page] ?? [""]).map((line) => {
      const shown = line.slice(0, Math.max(0, left));
      left -= line.length;
      return shown;
    });
    return {
      kind: "say",
      speaker: node.speaker,
      lines,
      waiting: this.revealed >= this.pageLength(),
      blink,
    };
  }

  private enter(node: DialogNode): void {
    this.node = node;
    this.cursor = 0;
    this.page = 0;
    this.revealed = 0;
    if (node.type === "say") {
      this.pages = paginate(wrapText(node.text, this.maxWidth), DIALOG.linesPerPage);
    } else {
      this.pages = [];
      // A prompt that is too long just shows its first page.
      this.promptLines = node.prompt
        ? paginate(wrapText(node.prompt, this.maxWidth), DIALOG.linesPerPage)[0]
        : [];
    }
  }

  private pageLength(): number {
    return (this.pages[this.page] ?? []).reduce((sum, line) => sum + line.length, 0);
  }

  private advance(node: Say): void {
    if (this.page < this.pages.length - 1) {
      this.page++;
      this.revealed = 0;
    } else if (node.next) {
      // Going on past a reply starts afresh: cancel won't take you back across
      // it (to a menu you are already looking at, or to one before the reply).
      this.history = [];
      this.enter(node.next);
    } else {
      this.close();
    }
  }

  private choose(node: Menu): void {
    const picked = node.choices[this.cursor];
    this.path.push(picked.label);
    this.handlers.onChoose?.(picked.label, [...this.path]);
    if (!picked.next) {
      this.close();
      return;
    }
    if (picked.next.type === "menu") this.history.push({ menu: node, cursor: this.cursor });
    this.enter(picked.next);
  }

  // Cancel goes back to the menu we came from, or closes if there is none.
  private back(): void {
    const saved = this.history.pop();
    if (!saved) {
      this.close(true);
      return;
    }
    this.path.pop();
    this.enter(saved.menu);
    this.cursor = saved.cursor;
  }

  private close(cancelled = false): void {
    const result: DialogResult = { path: [...this.path], cancelled };
    const onDone = this.onDone;
    this.node = null;
    this.pages = [];
    this.promptLines = [];
    this.history = [];
    this.path = [];
    this.onDone = null;
    // The dialog is fully closed before anyone hears about it. First the
    // handlers (which release the input lock and announce the close), then this
    // dialog's own callback, so a callback may start another dialog without
    // the two overlapping. A callback that throws is reported and ignored: it
    // must not be able to leave the game locked.
    this.handlers.onClose?.(result);
    try {
      onDone?.(result);
    } catch (error) {
      console.error("A dialog's onDone callback threw", error);
    }
  }
}
