import { browserClipboard, type ClipboardLike } from "../../input/clipboard";
import type { Controls } from "../../input/controls";
import { normalizeText, unsupportedChars } from "../../render/font";
import { drawTrackEditor, type EditorView } from "../../render/track-editor";
import { BaseActivity, needHost, registerActivity, type ActivityHost, type ActivityResult } from "../activity";
import { MAKE_TRACKS as M } from "../config";
import { choice, menu } from "../dialog";
import { demoStore } from "../music/demo-library";
import type { DemoStore } from "../music/demo-store";
import {
  CHANNELS,
  DRUM_LETTERS,
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
  playing = false;
  message = "";
  phase: Phase = "start";

  private messageLeft = 0;
  private playTime = 0;
  private clock = 0;
  private draftFailed = false;
  private unlisten: (() => void) | null = null;

  constructor(
    private readonly host: ActivityHost,
    private readonly store: DemoStore = demoStore(),
    private readonly clipboard: ClipboardLike = browserClipboard,
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
      if (this.naming !== null) this.typeKey(code, shift);
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
    // The same row clears the note; another row puts a new note in its place.
    if (covering && covering.key === key) {
      removeNote(this.grid, this.channel, this.step);
    } else if (placeNote(this.grid, this.channel, this.step, key, this.pen)) {
      this.host.blip?.(this.channel === "beat" ? DRUM_BLIP[key] : midiFreq(key));
    } else {
      return this.flash("No room for a note here.");
    }
    this.changed();
  }

  private changeLength(): void {
    if (this.channel === "beat") return this.flash("Drum hits are one step.");
    const covering = noteAt(this.grid, this.channel, this.step);
    if (covering) {
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
    this.grid.tempo = tempo;
    this.changed();
  }

  private changeSteps(steps: number): void {
    if (steps === this.grid.steps) return;
    this.grid.steps = steps;
    this.step = Math.min(this.step, steps - 1);
    this.changed();
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
    if (!out.ok) return this.flash(out.reason);
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

  private copy(): void {
    const problem = nameProblem(this.grid.title);
    if (problem) return this.flash(problem);
    if (countNotes(this.grid) === 0) return this.flash("Nothing to copy yet.");
    const text = gridToTrackText({ ...this.grid, title: this.grid.title.trim() });
    void this.clipboard.copy(text).then(
      (ok) => this.flash(ok ? "Copied." : "Could not copy. The text is in the browser console."),
      () => this.flash("Could not copy."),
    );
  }

  private paste(): void {
    void this.clipboard.read().then(
      (text) => (text === null ? this.flash("Press Ctrl+V to paste.") : this.importText(text)),
      () => this.flash("Press Ctrl+V to paste."),
    );
  }

  // A pasted track becomes the draft, and is only saved with S.
  importText(text: string): void {
    if (this.done || this.phase !== "edit" || this.naming !== null) return;
    const read = trackTextToGrid(text);
    if (!read.ok) return this.flash(read.message);
    this.grid = read.grid;
    this.editingId = null;
    this.step = 0;
    this.changed();
    this.flash("Pasted. It is a draft until you save.");
  }

  // -- Drawing ---------------------------------------------------------------------

  private view(): EditorView {
    const g = normalizeGrid(this.grid);
    const stepSeconds = (60 / g.tempo) * M.stepBeats;
    return {
      started: this.phase === "edit",
      title: this.naming ?? this.grid.title,
      naming: this.naming !== null,
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
      playStep: this.playing ? Math.floor(this.playTime / stepSeconds) % g.steps : null,
      message: this.message,
      drums: DRUM_LETTERS,
    };
  }

  draw(ctx: CanvasRenderingContext2D, _screen: { width: number; height: number }): void {
    drawTrackEditor(ctx, this.view());
  }
}

registerActivity("make-track", (_spec, item, host) => new MakeTrackActivity(needHost(host, `Task "${item.id}"`)));
