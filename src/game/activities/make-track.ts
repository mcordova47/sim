import { browserClipboard, browserShare, type ClipboardLike, type ShareLike } from "../../input/clipboard";
import type { Controls } from "../../input/controls";
import type { TapTarget } from "../../input/tap";
import { normalizeText, unsupportedChars } from "../../render/font";
import { touchHints } from "../../render/hints";
import { drawTrackEditor, type EditorView } from "../../render/track-editor";
import { TOUCH_EDITOR, drawTrackEditorTouch, stepKeyAt, touchEditorLayout, touchRowKeys } from "../../render/track-editor-touch";
import { BaseActivity, needHost, registerActivity, type ActivityHost, type ActivityResult } from "../activity";
import { MAKE_TRACKS as M } from "../config";
import { choice, menu } from "../dialog";
import { demoStore } from "../music/demo-library";
import type { DemoStore } from "../music/demo-store";
import {
  CHANNELS,
  DRUM_LETTERS,
  cleanTrackText,
  cloneGrid,
  countNotes,
  cycleNoteLength,
  emptyGrid,
  gridToTrackText,
  keyRange,
  nameProblem,
  nextLength,
  noteAt,
  normalizeGrid,
  placeNote,
  removeNote,
  startKey,
  trackTextToGrid,
  type ChannelId,
  type DemoGrid,
} from "../music/demos";
import { parseTrack, type Track } from "../music/track";

// The track editor (issue 059, docs/make-tracks.md): a piano roll over the
// `.track` format, opened from the laptop at the desk. One channel is shown at
// a time (melody, bass or beat) as a grid of steps. It is a free-form tool: no
// clock, no score while editing (the apartment's clock is held still), and
// Escape leaves at once from anywhere, paying nothing. The work in progress is
// kept as a draft after every edit, so leaving loses nothing. Saving (S) writes
// the track to the store and may pay a reward (see DemoStore.claimReward).

// The activity's own wording, kept plain.
const START_DRAFT = "Continue your draft";
const START_NEW = "New track";
const START_CANCEL = "Cancel";

// The fallback when the clipboard cannot be read. A phone has no Ctrl (hint rule of issue 093): it gets
// the paste box instead (issue 106d), so this is only the desktop's line.
const PASTE_BY_HAND = () => "Press Ctrl+V to paste.";

// Text in the paste box that is worth trying to read as a track before the player presses Go: it has
// line breaks or a channel line, or is long. A few typed letters are just waited for.
const worthReading = (text: string) => text.includes("\n") || /\[[^\]]+\]/.test(text) || text.length >= 20;
// The most the paste box keeps (the importer refuses more than this anyway).
const PASTE_CAP = M.maxTextBytes * 2;

// Where the editor's sound blips sit: a drum hit has no pitch, so each gets one.
const DRUM_BLIP = [220, 660, 1320];

const midiFreq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

// The character a key types in a name, or null if it types nothing.
export function typedChar(code: string, shift: boolean): string | null {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return shift ? letter[1] : letter[1].toLowerCase();
  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return shift ? ({ "1": "!", "7": "&", "9": "(", "0": ")" } as Record<string, string>)[digit[1]] ?? null : digit[1];
  if (code === "Space") return " ";
  if (code === "Period") return ".";
  if (code === "Comma") return ",";
  if (code === "Minus") return "-";
  return null;
}

type Phase = "start" | "edit";

// Whether a note was placed yet this session (the touch look shows a tip until then).
let tappedANote = false;

export class MakeTrackActivity extends BaseActivity {
  cancellable = true;
  // E and the letters are the editor's keys, so a press made during it is its own.
  readonly readsKeys = true;
  // No time pressure: the apartment's clock, energy and mood stand still.
  readonly holdsClock = true;
  // Letters are text only while a name is typed, so M still mutes otherwise.
  get readsLetters(): boolean {
    return this.naming !== null;
  }
  // Naming wants typing: on the touch layer that raises the phone's keyboard (issue 106c, as in 093).
  get wantsText(): boolean {
    return !this.done && this.phase === "edit" && (this.naming !== null || this.pasting !== null);
  }
  // The paste box is a visible, multi-line field (touch-ui shows it over the picture); a name is not.
  get textBox(): boolean {
    return this.wantsText && this.pasting !== null;
  }
  textValue(): string {
    return this.naming ?? this.pasting ?? "";
  }
  // The whole text from the touch layer's field. What a name cannot hold is dropped (a curly apostrophe
  // becomes a straight one first), and it is cut to the longest name; the field is then set to what is kept.
  setText(text: string): void {
    if (!this.wantsText) return;
    if (this.naming === null) return this.setPasteText(text);
    const kept = [...normalizeText(text)].filter((ch) => M.nameChars.test(ch)).join("");
    this.naming = kept.slice(0, M.nameMax);
  }

  grid: DemoGrid;
  // The saved track being edited, or null for a new one.
  editingId: string | null = null;
  channel: ChannelId = "melody";
  step = 0;
  // The row of the cursor in each channel (kept when switching channels).
  readonly rows: Record<ChannelId, number> = { melody: startKey("melody"), bass: startKey("bass"), beat: startKey("beat") };
  // How long a note placed next will be, in steps.
  pen = 1;
  // The name being typed, or null.
  naming: string | null = null;
  // The text in the paste box (touch, when the clipboard cannot be read), or null when it is not open.
  pasting: string | null = null;
  playing = false;
  message = "";
  phase: Phase = "start";

  // The page of 8 steps a tap chose to show (touch look), or null to show the page the cursor is on.
  // While playing, the page follows the play position unless one was chosen in the last few seconds.
  private viewPage: number | null = null;
  private pageChosenAt = -Infinity;
  // The grid as it was before the last edit (one level of Undo, issue 106c), or null.
  private undoGrid: DemoGrid | null = null;
  private messageLeft = 0;
  private playTime = 0;
  private clock = 0;
  private draftFailed = false;
  private unlisten: (() => void) | null = null;

  constructor(
    private readonly host: ActivityHost,
    private readonly store: DemoStore = demoStore(),
    private readonly clipboard: ClipboardLike = browserClipboard,
    private readonly sharer: ShareLike = browserShare,
  ) {
    super();
    this.grid = emptyGrid(M.untitled);
  }

  // -- Starting -------------------------------------------------------------------

  start(): void {
    this.store.clock = () => this.host.gameMinutes?.() ?? 0;
    this.unlisten = this.clipboard.onPaste((text) => this.importText(text));
    const draft = this.store.draft();
    const saved = this.store.list().filter((d) => trackTextToGrid(d.text).ok);
    if (!draft && saved.length === 0) {
      this.newTrack();
      return;
    }
    const choices = [
      ...(draft ? [choice(START_DRAFT)] : []),
      ...saved.map((d) => choice(d.title)),
      choice(START_NEW),
      choice(START_CANCEL),
    ];
    const opened = this.host.openDialog(menu("Make a track", choices), (result) => {
      if (this.done) return;
      const picked = result.path.at(-1);
      if (result.cancelled || picked === undefined || picked === START_CANCEL) return this.cancel();
      if (picked === START_DRAFT && draft) return this.openGrid(draft.grid, draft.id);
      const demo = saved.find((d) => d.title === picked);
      if (demo && picked !== START_NEW) {
        const read = trackTextToGrid(demo.text);
        if (read.ok) return this.openGrid(read.grid, demo.id);
      }
      this.newTrack();
    });
    // Another dialog is open, so there is nothing to wait for.
    if (!opened) this.cancel();
  }

  private newTrack(): void {
    this.openGrid(emptyGrid(this.store.nextName()), null);
  }

  private openGrid(grid: DemoGrid, id: string | null): void {
    this.grid = cloneGrid(grid);
    this.editingId = id;
    this.step = 0;
    this.channel = "melody";
    this.naming = null;
    this.pasting = null;
    this.undoGrid = null;
    this.viewPage = null;
    this.phase = "edit";
    this.refreshPreview();
  }

  // -- Leaving ----------------------------------------------------------------------

  // Every way out (Escape, an error, finishing) stops the preview and the paste listener.
  // Leaving is the normal way out of a free-form tool, so it ends quietly: no
  // payout, no cooldown, and not counted as a cancelled task.
  cancel(): void {
    this.finish({ completed: false, quiet: true });
  }

  protected finish(result: ActivityResult): void {
    if (this.done) return;
    super.finish(result);
    if (this.playing) this.host.previewTrack?.(null);
    this.playing = false;
    this.unlisten?.();
    this.unlisten = null;
  }

  // -- Each frame -----------------------------------------------------------------

  update(dt: number, controls: Controls): void {
    if (this.done) return;
    this.clock += dt;
    if (this.messageLeft > 0) {
      this.messageLeft -= dt;
      if (this.messageLeft <= 0) this.message = "";
    }
    if (this.playing) this.playTime += dt;
    if (this.phase !== "edit") return;
    // Ctrl, Cmd and Alt keys are the browser's (Ctrl+V pastes through its own event).
    const held = controls.keysDown;
    const command = held.some((k) => /^(Control|Meta|Alt)(Left|Right)$/.test(k));
    const shift = held.some((k) => k === "ShiftLeft" || k === "ShiftRight");
    for (const code of controls.keys) {
      if (this.done) return;
      if (command) continue;
      // The pad moves the cursor, and the window follows it.
      if (code.startsWith("Arrow")) this.viewPage = null;
      if (this.naming !== null) this.typeKey(code, shift);
      else if (this.pasting !== null) this.pasteKey(code);
      else this.editKey(code);
    }
  }

  private flash(text: string): void {
    // Text from a pasted track (a parser message names what was wrong) may hold
    // characters the font cannot draw: they show as "?".
    this.message = [...normalizeText(text)].map((ch) => (unsupportedChars(ch).length > 0 ? "?" : ch)).join("");
    this.messageLeft = M.messageSeconds;
  }

  // -- Typing a name ----------------------------------------------------------------

  private typeKey(code: string, shift: boolean): void {
    if (this.naming === null) return;
    if (code === "Enter" || code === "NumpadEnter") {
      const name = this.naming.trim();
      this.naming = null;
      if (name === "") return this.flash("The name is unchanged.");
      if (name !== this.grid.title) {
        this.remember();
        this.grid.title = name;
        this.changed();
      }
      const problem = nameProblem(name);
      if (problem) this.flash(problem);
    } else if (code === "Backspace") {
      this.naming = this.naming.slice(0, -1);
    } else {
      const ch = typedChar(code, shift);
      if (ch !== null && M.nameChars.test(ch) && this.naming.length < M.nameMax) this.naming += ch;
    }
  }

  // -- Editing keys -------------------------------------------------------------------

  private editKey(code: string): void {
    const range = keyRange(this.channel);
    switch (code) {
      case "ArrowLeft":
        this.step = (this.step + this.grid.steps - 1) % this.grid.steps;
        break;
      case "ArrowRight":
        this.step = (this.step + 1) % this.grid.steps;
        break;
      case "ArrowUp":
        this.rows[this.channel] = Math.min(range.high, this.rows[this.channel] + 1);
        break;
      case "ArrowDown":
        this.rows[this.channel] = Math.max(range.low, this.rows[this.channel] - 1);
        break;
      case "KeyE":
        this.placeOrClear();
        break;
      case "Digit1":
      case "Digit2":
      case "Digit3":
        this.channel = CHANNELS[Number(code.slice(-1)) - 1];
        break;
      case "KeyT":
        this.changeLength();
        break;
      case "KeyP":
        this.togglePlay();
        break;
      case "Minus":
      case "Equal":
        this.changeTempo(code === "Equal" ? M.tempo.step : -M.tempo.step);
        break;
      case "Comma":
      case "Period":
        this.changeSteps(code === "Period" ? M.steps.max : M.steps.short);
        break;
      case "KeyN":
        this.naming = this.grid.title;
        break;
      case "KeyS":
        this.save();
        break;
      case "KeyD":
        this.askDelete();
        break;
      case "KeyC":
        this.copy();
        break;
      case "KeyV":
        this.paste();
        break;
    }
  }

  private placeOrClear(): void {
    const key = this.rows[this.channel];
    const covering = noteAt(this.grid, this.channel, this.step);
    const before = cloneGrid(this.grid);
    // The same row clears the note; another row puts a new note in its place.
    if (covering && covering.key === key) {
      removeNote(this.grid, this.channel, this.step);
      this.undoGrid = before;
    } else if (placeNote(this.grid, this.channel, this.step, key, this.pen)) {
      this.undoGrid = before;
      this.host.blip?.(this.channel === "beat" ? DRUM_BLIP[key] : midiFreq(key));
    } else {
      return this.flash("No room for a note here.");
    }
    tappedANote = true;
    this.changed();
  }

  private changeLength(): void {
    if (this.channel === "beat") return this.flash("Drum hits are one step.");
    const covering = noteAt(this.grid, this.channel, this.step);
    if (covering) {
      this.remember();
      this.pen = cycleNoteLength(this.grid, this.channel, this.step) ?? this.pen;
      this.changed();
    } else {
      this.pen = nextLength(this.pen);
    }
    this.flash(`Note length ${this.pen}.`);
  }

  private changeTempo(by: number): void {
    const tempo = Math.min(M.tempo.max, Math.max(M.tempo.min, this.grid.tempo + by));
    if (tempo === this.grid.tempo) return;
    this.remember();
    this.grid.tempo = tempo;
    this.changed();
  }

  private changeSteps(steps: number): void {
    if (steps === this.grid.steps) return;
    this.remember();
    this.grid.steps = steps;
    this.step = Math.min(this.step, steps - 1);
    if (this.viewPage !== null && this.viewPage * TOUCH_EDITOR.pageSteps >= steps) this.viewPage = null;
    this.changed();
  }

  // Keeps the grid as it is now, just before an edit, for Undo.
  private remember(): void {
    this.undoGrid = cloneGrid(this.grid);
  }

  // Undo (the touch look's button and More entry): the grid as it was before the last edit. One level.
  private undo(): void {
    if (this.undoGrid === null) return this.flash("Nothing to undo.");
    this.grid = this.undoGrid;
    this.undoGrid = null;
    this.step = Math.min(this.step, this.grid.steps - 1);
    this.viewPage = null;
    this.changed();
    this.flash("Undone.");
  }

  // After an edit: keep the draft, and let a playing preview follow.
  private changed(): void {
    const stored = this.store.setDraft(this.editingId, this.grid);
    if (!stored && !this.draftFailed) this.flash("Could not keep your draft (storage is full or blocked).");
    this.draftFailed = !stored;
    this.refreshPreview();
  }

  // -- Playing ------------------------------------------------------------------------

  // The grid as a track the music player can play, or null if it has no notes.
  private asTrack(): Track | null {
    if (countNotes(this.grid) === 0) return null;
    try {
      return parseTrack(gridToTrackText({ ...this.grid, title: "Preview" }), "preview", "preview");
    } catch {
      return null;
    }
  }

  private togglePlay(): void {
    if (this.playing) {
      this.playing = false;
      this.host.previewTrack?.(null);
      return;
    }
    const track = this.asTrack();
    if (!track) return this.flash("Add some notes first.");
    this.playing = true;
    this.playTime = 0;
    this.host.previewTrack?.(track, false);
  }

  private refreshPreview(): void {
    if (!this.playing) return;
    const track = this.asTrack();
    if (track) this.host.previewTrack?.(track, true);
    else {
      this.playing = false;
      this.host.previewTrack?.(null);
    }
  }

  // -- Saving, deleting, copying, pasting --------------------------------------------

  private save(): void {
    const title = this.grid.title.trim();
    const out = this.store.save(this.editingId, { ...this.grid, title });
    // At the limit a phone has no key for Delete: it says where the button is.
    if (!out.ok) return this.flash(out.code === "full" && touchHints() ? `${M.maxTracks} saved. Open one, More, Delete.` : out.reason);
    this.grid.title = title;
    this.editingId = out.id;
    this.draftFailed = false;
    const reward = this.store.claimReward(this.grid);
    if (reward.paid) {
      const paid = this.host.reward?.(reward.points, [{ var: "mood", add: reward.mood }]) ?? null;
      this.flash(paid === null ? "Saved." : `Saved. +${paid} points.`);
    } else if (reward.why === "notes") {
      this.flash(`Saved. ${M.reward.minNotes} notes on ${M.reward.minChannels} channels earn points.`);
    } else {
      this.flash("Saved.");
    }
  }

  private askDelete(): void {
    const id = this.editingId;
    if (id === null) return this.flash("Nothing saved to delete yet.");
    const name = this.grid.title;
    // "No" comes first, so the cursor starts on it.
    const opened = this.host.openDialog(menu(`Delete ${name}?`, [choice("No"), choice("Yes")]), (result) => {
      if (this.done || result.cancelled || result.path.at(-1) !== "Yes") return;
      if (!this.store.remove(id)) return this.flash("Could not delete (storage is full or blocked).");
      this.openGrid(emptyGrid(this.store.nextName()), null);
      this.changed();
      this.flash("Deleted.");
    });
    if (!opened) this.flash("Not now.");
  }

  // The text to copy or share, or null after saying why there is none.
  private trackText(what: string): string | null {
    const problem = nameProblem(this.grid.title);
    if (problem) {
      this.flash(problem);
      return null;
    }
    if (countNotes(this.grid) === 0) {
      this.flash(`Nothing to ${what} yet.`);
      return null;
    }
    return gridToTrackText({ ...this.grid, title: this.grid.title.trim() });
  }

  private copy(): void {
    const text = this.trackText("copy");
    if (text === null) return;
    this.copyText(text);
  }

  private copyText(text: string): void {
    void this.clipboard.copy(text).then(
      (ok) => this.flash(ok ? "Copied." : touchHints() ? "Could not copy." : "Could not copy. The text is in the browser console."),
      () => this.flash("Could not copy."),
    );
  }

  // Share (issue 106d): the phone's share sheet with the `.track` text. `share` is called right here, in the
  // tap, which the browser needs. With no share sheet (or one that fails) it copies instead.
  private share(): void {
    const text = this.trackText("share");
    if (text === null) return;
    void this.sharer.share(this.grid.title.trim(), text).then(
      (result) => {
        if (result === "shared") this.flash("Shared.");
        else if (result === "cancelled") this.flash("Not shared.");
        else this.copyText(text);
      },
      () => this.copyText(text),
    );
  }

  // Paste: the clipboard first. Where it cannot be read (or says nothing) a phone gets the paste box, a
  // field the player pastes into by hand; a keyboard player is told to press Ctrl+V.
  private paste(): void {
    const fallback = () => (touchHints() ? this.openPasteBox() : this.flash(PASTE_BY_HAND()));
    void this.clipboard.read().then(
      (text) => (text === null || text.trim() === "" ? fallback() : void this.importText(text)),
      fallback,
    );
  }

  private openPasteBox(): void {
    if (this.done || this.phase !== "edit" || this.naming !== null) return;
    this.pasting = "";
  }

  // The text the field holds in the paste box: read it once it looks like a track.
  private setPasteText(text: string): void {
    this.pasting = text.slice(0, PASTE_CAP);
    if (this.pasting.trim() !== "" && worthReading(this.pasting)) this.readPasteBox();
  }

  // Go (Enter) in the paste box reads whatever is there.
  private pasteKey(code: string): void {
    if (code !== "Enter" && code !== "NumpadEnter") return;
    if ((this.pasting ?? "").trim() === "") return this.flash("Paste a track into the box first.");
    this.readPasteBox();
  }

  // Reads the box. A track is imported and the box closes; anything else says why and the box empties so
  // the player can try again.
  private readPasteBox(): void {
    const text = this.pasting ?? "";
    if (this.importText(text)) return;
    if (this.pasting !== null) this.pasting = "";
  }

  // A pasted track becomes the draft, and is only saved with S. Returns whether it was taken.
  importText(text: string): boolean {
    if (this.done || this.phase !== "edit" || this.naming !== null) return false;
    const read = trackTextToGrid(cleanTrackText(text));
    if (!read.ok) {
      this.flash(read.message);
      return false;
    }
    this.remember();
    this.grid = read.grid;
    this.editingId = null;
    this.step = 0;
    this.pasting = null;
    this.changed();
    this.flash("Pasted. It is a draft until you save.");
    return true;
  }

  // -- Drawing ---------------------------------------------------------------------

  private view(): EditorView {
    const g = normalizeGrid(this.grid);
    const stepSeconds = (60 / g.tempo) * M.stepBeats;
    const playStep = this.playing ? Math.floor(this.playTime / stepSeconds) % g.steps : null;
    return {
      started: this.phase === "edit",
      title: this.naming ?? this.grid.title,
      naming: this.naming !== null,
      pasting: this.pasting !== null,
      blink: Math.floor(this.clock * 2) % 2 === 0,
      tempo: g.tempo,
      steps: g.steps,
      channel: this.channel,
      notes: g.channels[this.channel],
      used: CHANNELS.filter((id) => g.channels[id].length > 0),
      step: this.step,
      row: this.rows[this.channel],
      pen: this.pen,
      playing: this.playing,
      playStep,
      page: this.shownPage(playStep),
      message: this.message,
      drums: DRUM_LETTERS,
    };
  }

  // The page of 8 steps the touch look shows: the one a tap chose, else (while playing) the playhead's,
  // else the cursor's.
  private shownPage(playStep: number | null): number {
    const per = TOUCH_EDITOR.pageSteps;
    const held = this.viewPage !== null && (playStep === null || this.clock - this.pageChosenAt < M.pageHoldSeconds);
    if (held && this.viewPage !== null) return this.viewPage;
    return Math.floor((playStep ?? this.step) / per);
  }

  // -- Taps (issue 106b) ---------------------------------------------------------------

  private choosePage(page: number): void {
    const per = TOUCH_EDITOR.pageSteps;
    if (page < 0 || page * per >= this.grid.steps) return;
    this.viewPage = page;
    this.pageChosenAt = this.clock;
    // The cursor goes with it, in the same column, so the pad carries on from here.
    this.step = Math.min(this.grid.steps - 1, page * per + (this.step % per));
  }

  // Scrolls the six pitches shown by a window (the cursor goes with it, so the window follows).
  private scrollPitches(by: number): void {
    const { low, high } = keyRange(this.channel);
    this.rows[this.channel] = Math.min(high, Math.max(low, this.rows[this.channel] + by * TOUCH_EDITOR.pitchRows));
  }

  // The More menu (issue 106c). Every entry runs what its key runs on the keyboard: Rename is N, the steps
  // entry is `,` or `.`, Copy C, Paste V, Delete D; Undo is the one entry with no key (the grid is small, a
  // fat finger costs more than a key press). Share (106d) opens the phone's share sheet, or copies. Back closes it.
  private openMore(): void {
    const cut = this.grid.steps > M.steps.short;
    const entries: [string, () => void][] = [
      ["Rename", () => (this.naming = this.grid.title)],
      [cut ? `Cut to ${M.steps.short} steps` : `Extend to ${M.steps.max} steps`, () => this.changeSteps(cut ? M.steps.short : M.steps.max)],
      ["Undo", () => this.undo()],
      ["Share", () => this.share()],
      ["Copy", () => this.copy()],
      ["Paste", () => this.paste()],
      ["Delete", () => this.askDelete()],
      ["Back", () => {}],
    ];
    const opened = this.host.openDialog(menu("More", entries.map(([label]) => choice(label))), (result) => {
      if (this.done || result.cancelled) return;
      entries.find(([label]) => label === result.path.at(-1))?.[1]();
    });
    if (!opened) this.flash("Not now.");
  }

  // The buttons a tap can press on the touch look: the same rectangles `draw` paints (the layout of
  // render/track-editor-touch.ts). Each does what the keyboard's key for it does.
  tapTargets(screen: { width: number; height: number }): TapTarget[] {
    if (this.done || !touchHints() || this.phase !== "edit" || this.naming !== null || this.pasting !== null) return [];
    const T = TOUCH_EDITOR;
    const keys = touchRowKeys(this.channel, this.rows[this.channel]);
    const layout = touchEditorLayout(screen, { steps: this.grid.steps, rows: keys.length });
    const beat = this.channel === "beat";
    const out: TapTarget[] = [];
    const add = (rect: { x: number; y: number; w: number; h: number }, run: () => void) => out.push({ ...rect, run });

    // The grid first: a tap moves the cursor to the cell and places or clears there, as E does. The
    // cell's page is the one shown now, so the step is right on any page.
    const shown = this.shownPage(this.playing ? this.view().playStep : null);
    for (let row = 0; row < keys.length; row++) {
      for (let col = 0; col < layout.pageSteps; col++) {
        const step = shown * T.pageSteps + col;
        if (step >= this.grid.steps) continue;
        const at = { x: layout.grid.x + col * layout.cellW, y: layout.grid.y + row * layout.rowH, w: layout.cellW, h: layout.rowH };
        add(at, () => {
          const hit = stepKeyAt(layout, at.x, at.y, shown, keys);
          if (!hit) return;
          this.step = hit.step;
          this.rows[this.channel] = hit.key;
          this.viewPage = shown;
          this.pageChosenAt = this.clock;
          this.placeOrClear();
        });
      }
    }
    // A pitch label plays that pitch and places nothing.
    layout.gutter.forEach((r, i) => add(r, () => this.host.blip?.(beat ? DRUM_BLIP[keys[i]] : midiFreq(keys[i]))));
    CHANNELS.forEach((id, i) => add(layout.tabs[i], () => (this.channel = id)));
    layout.pages.forEach((r, i) => add(r, () => this.choosePage(i)));
    if (!beat) {
      add(layout.pitchUp, () => this.scrollPitches(1));
      add(layout.pitchDown, () => this.scrollPitches(-1));
    }
    add(layout.tempoDown, () => this.changeTempo(-M.tempo.step));
    add(layout.tempoUp, () => this.changeTempo(M.tempo.step));
    add(layout.play, () => this.togglePlay());
    add(layout.save, () => this.save());
    add(layout.length, () => this.changeLength());
    add(layout.name, () => (this.naming = this.grid.title));
    add(layout.more, () => this.openMore());
    if (layout.undo) add(layout.undo, () => this.undo());
    if (layout.nextPage) add(layout.nextPage, () => this.choosePage((shown + 1) % layout.pages.length));
    return out;
  }

  // On the touch layer the editor draws its own bigger look in the live view (issue 106a); the game
  // leaves out its "B TO STOP" line there, because the editor's top strip says it.
  get hidesStopHint(): boolean {
    return touchHints();
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    if (touchHints()) drawTrackEditorTouch(ctx, { ...this.view(), firstTouch: !tappedANote }, screen);
    else drawTrackEditor(ctx, this.view());
  }
}

registerActivity("make-track", (_spec, item, host) => new MakeTrackActivity(needHost(host, `Task "${item.id}"`)));
