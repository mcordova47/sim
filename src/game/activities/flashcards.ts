import { browserClipboard, type ClipboardLike } from "../../input/clipboard";
import type { Controls } from "../../input/controls";
import { COLOR } from "../../render/colors";
import { GLYPH_H, drawText, textWidth } from "../../render/font";
import { drawIpa, ipaWidth } from "../../render/ipa-font";
import { BaseActivity, needHost, registerActivity, type ActivityHost, type ActivityResult } from "../activity";
import { FLASHCARDS as F } from "../config";
import { studyBackend, studyGuestBackend } from "../flashcards/backend";
import { Mumble, VOICE_CYCLE, VOICE_STYLES, ipaScript } from "../flashcards/mumble";
import { keyFromText, studyStore, type StudyStore } from "../flashcards/key";
import { barParts, pageLines, type PageLine, type Tone } from "../flashcards/progress";
import type { CardView, Grade, ProgressSummary, StudyBackend, StudySession } from "../flashcards/study";
import { wrapText } from "../dialog";
import { typedChar } from "./make-track";

// Studying Spanish at the computer (issue 026, docs/flashcards.md). The game is
// a front end for the real flashcards app: it asks the app's backend for the
// session, shows each card, and sends every answer back so the real schedule
// stays right. Flip a card (E), then pick "again" or "got it" (left or right,
// then E). Escape leaves from anywhere. There is no clock: it holds the
// apartment's time still, and each answer is delivered as it is given, so
// leaving loses nothing.

type Phase = "choice" | "key" | "connecting" | "front" | "back" | "saving" | "problem" | "done";

// Where things sit on the progress page, in pixels from the top of the box.
// `row` is a line's step; a line's `gap` is extra pixels above it. Exported for the tests, which
// check that the longest page ends above the "E: leave" line.
export const PROGRESS_LAYOUT = { margin: 16, barY: 22, barH: 7, textY: 33, row: 9, leaveFromBottom: 14 } as const;
const TONE: Record<Tone, string> = { paper: COLOR.paper, mist: COLOR.mist, leaf: COLOR.leaf, butter: COLOR.butter };

const GRADES: Grade[] = ["again", "gotit"];
const LABEL: Record<Grade, string> = { again: "Again", gotit: "Got it" };

export class FlashcardsActivity extends BaseActivity {
  cancellable = true;
  // E and the letters are this screen's keys.
  readonly readsKeys = true;
  readonly holdsClock = true;
  // The choice screen's cursor: 0 is "Study without a key", 1 is "Enter a sync key".
  chosen = 0;
  // True while studying without a key (issue 089).
  guest = false;
  // After S on the "could not be read" screen: waiting for Y.
  confirmRestart = false;
  get readsLetters(): boolean {
    return this.phase === "key";
  }

  phase: Phase = "connecting";
  // The key being typed or pasted (key phase only).
  typed = "";
  message = "";
  // The grade the cursor is on (back phase).
  selected = 0;
  queue: string[] = [];
  index = 0;
  gotIt = 0;
  again = 0;
  paid = 0;
  // The figures on the progress page, read when the page comes up; null when the
  // backend cannot report them (the page then shows only the plain line).
  summary: ProgressSummary | null = null;
  // How a card is voiced (an index into `VOICE_STYLES`): 0 by spelling, higher by
  // its IPA, each style adding to the one before; `FLASHCARDS.voice.style` is the
  // default. V steps through the practice deck's voices (the backend's
  // `voiceCycle`, or `VOICE_CYCLE` for all of them), to hear what each part adds.
  voiceStyle: number = F.voice.style;

  // Public for the tests, which read `unsaved`.
  session: StudySession | null = null;
  private shown: { at: number; slug: string; view: CardView } | null = null;
  private unlisten: (() => void) | null = null;
  private readonly mumble: Mumble;

  constructor(
    private readonly host: ActivityHost,
    private readonly backend: StudyBackend = studyBackend(),
    private readonly store: StudyStore = studyStore(),
    private readonly clipboard: ClipboardLike = browserClipboard,
    private readonly guestBackend: StudyBackend = studyGuestBackend(),
  ) {
    super();
    this.mumble = new Mumble((sound) => host.voice?.(sound));
  }

  // The card on screen. Looked up once per card: the real core reads the whole
  // saved progress to answer, which is too much to do every frame.
  get card(): CardView | null {
    const slug = this.queue[this.index];
    if (!this.session || slug === undefined) return null;
    if (this.shown?.at !== this.index || this.shown.slug !== slug) {
      this.shown = { at: this.index, slug, view: this.session.card(slug) };
    }
    return this.shown.view;
  }

  // The backend in use: the guest's, or the one for a key.
  private get active(): StudyBackend {
    return this.guest ? this.guestBackend : this.backend;
  }

  start(): void {
    this.store.clock = () => this.host.gameMinutes?.() ?? 0;
    this.unlisten = this.clipboard.onPaste((text) => this.paste(text));
    if (this.backend.usesKey === false) return this.connect("");
    if (this.store.mode() === "guest") return this.startGuest();
    const key = this.store.key();
    if (key) this.connect(key);
    else this.phase = "choice";
  }

  private startGuest(): void {
    this.guest = true;
    this.store.setMode("guest");
    this.connect("");
  }

  private connect(key: string): void {
    this.phase = "connecting";
    this.active.open(key).then(
      (result) => {
        if (this.done) return;
        this.opened(key, result);
      },
      () => {
        if (!this.done) this.fail("No connection. Nothing was saved.");
      },
    );
  }

  private opened(key: string, result: Awaited<ReturnType<StudyBackend["open"]>>): void {
    if (result === "offline") return this.fail("No connection. Nothing was saved.");
    if (result === "unreadable") {
      this.confirmRestart = false;
      return this.fail("The saved cards could not be read.");
    }
    if (result === "bad-key") {
      this.store.forgetKey();
      this.typed = "";
      this.message = "That key was not accepted.";
      this.phase = "key";
      return;
    }
    if (!this.guest && this.backend.usesKey !== false) this.store.saveKey(key);
    this.session = result;
    this.queue = result.queue();
    this.index = 0;
    if (this.queue.length === 0) {
      this.message = "Nothing is due. Come back later.";
      this.showProgress();
    } else {
      this.phase = "front";
      this.speakIf("front");
    }
  }

  // The page for when there is nothing left to review: at open with an empty
  // queue, and after the last card. It reads and pays nothing and changes nothing.
  private showProgress(): void {
    try {
      // The backend has checked the figures (`readSummary`); this only guards a throw.
      this.summary = this.session?.progress?.() ?? null;
    } catch {
      this.summary = null;
    }
    this.phase = "done";
  }

  private fail(message: string): void {
    this.message = message;
    this.phase = "problem";
  }

  private paste(text: string): void {
    if (this.done || this.phase !== "key") return;
    // A very long link is reduced to its key first, so a `pair=` past the cut still works.
    this.typed = keyFromText(text) ?? text.trim().slice(0, F.maxPastedChars);
    this.message = "";
  }

  update(dt: number, controls: Controls): void {
    if (this.done) return;
    this.mumble.update(dt);
    if (this.phase === "choice") return this.updateChoice(controls);
    if (this.phase === "key") return this.updateKey(controls);
    if (this.phase === "front" || this.phase === "back") {
      this.repeat(controls);
      this.switchVoice(controls);
    }
    if (this.phase === "front") {
      if (controls.interactPressed || controls.keys.includes("Space")) {
        this.phase = "back";
        this.speakIf("back");
      }
      return;
    }
    if (this.phase === "back") {
      const dir = controls.dirPressed;
      if (dir === "left") this.selected = 0;
      if (dir === "right") this.selected = 1;
      if (controls.keys.includes("Digit1")) return this.answer("again");
      if (controls.keys.includes("Digit2")) return this.answer("gotit");
      if (controls.interactPressed || controls.keys.includes("Space")) this.answer(GRADES[this.selected]);
      return;
    }
    if (this.phase === "done" && this.switchMode(controls)) return;
    if (this.phase === "problem" && this.guest && this.restart(controls)) return;
    if ((this.phase === "problem" || this.phase === "done") && (controls.interactPressed || controls.keys.includes("Enter"))) {
      this.finish({ completed: false, quiet: true });
    }
  }

  // "Says" the card's Spanish if it is on the side that has just appeared.
  private speakIf(side: "front" | "back"): void {
    const card = this.card;
    if (!card) return;
    if ((card.speaks ?? "back") === side) this.speak(card);
  }

  // Voices the card: by its IPA when it has one and the IPA voice is on, else by spelling.
  private speak(card: CardView): void {
    // A transcription that gives no sounds (only symbols the voice does not know) is no transcription.
    let script: ReturnType<typeof ipaScript> = [];
    try {
      if (this.voiceStyle > 0 && card.ipa) script = ipaScript(card.ipa, this.voiceStyle);
    } catch {
      // A transcription that cannot be read is no transcription.
    }
    if (script.length > 0) this.mumble.play(script);
    else this.mumble.say(card.spoken ?? card.answer);
  }

  // V flips between the IPA and the spelling voice, in the practice deck only.
  private switchVoice(controls: Controls): void {
    if (!this.backend.practice || !controls.keys.includes("KeyV")) return;
    if (controls.keysDown.some((k) => /^(Shift|Control|Meta|Alt)/.test(k))) return;
    // The next voice in the cycle (the first one if the current voice is not in it).
    const cycle = this.backend.voiceCycle ?? VOICE_CYCLE;
    this.voiceStyle = cycle[(cycle.indexOf(this.voiceStyle) + 1) % cycle.length];
    this.repeat({ ...controls, keys: [F.mumble.repeatKey], keysDown: [] });
  }

  // R says the Spanish again, once it is showing.
  private repeat(controls: Controls): void {
    if (!controls.keys.includes(F.mumble.repeatKey) || controls.keysDown.some((k) => /^Shift/.test(k))) return;
    const card = this.card;
    if (!card) return;
    const showing = this.phase === "back" || (card.speaks ?? "back") === "front";
    if (showing) this.speak(card);
  }

  // The first screen with no key and no saved choice: up and down, E to pick.
  private updateChoice(controls: Controls): void {
    if (controls.dirPressed === "up") this.chosen = 0;
    if (controls.dirPressed === "down") this.chosen = 1;
    if (!controls.interactPressed && !controls.keys.includes("Enter")) return;
    if (this.chosen === 0) this.startGuest();
    else {
      this.typed = "";
      this.message = "";
      this.phase = "key";
    }
  }

  // The small control to leave a mode, on the done screen only (never mid-card).
  // K: use a key (a different one, from key mode). G: study without a key.
  // A key is never merged with the guest's cards and neither path reads the other's.
  private switchMode(controls: Controls): boolean {
    if (this.backend.usesKey === false) return false;
    if (controls.keys.includes("KeyK")) {
      if (this.guest) {
        this.guest = false;
        this.store.setMode(null);
        const key = this.store.key();
        if (key) this.connect(key);
        else this.toKeyScreen();
      } else {
        this.store.forgetKey();
        this.toKeyScreen();
      }
      return true;
    }
    if (controls.keys.includes("KeyG") && !this.guest) {
      this.startGuest();
      return true;
    }
    return false;
  }

  private toKeyScreen(): void {
    this.typed = "";
    this.message = "";
    this.phase = "key";
  }

  // "Start again" after the core refused a guest's saved cards: S, then Y.
  private restart(controls: Controls): boolean {
    if (this.message !== "The saved cards could not be read.") return false;
    if (this.confirmRestart && controls.keys.includes("KeyY")) {
      this.guestBackend.forget?.();
      this.confirmRestart = false;
      this.connect("");
      return true;
    }
    if (controls.keys.includes("KeyS")) {
      this.confirmRestart = true;
      return true;
    }
    return false;
  }

  private updateKey(controls: Controls): void {
    const shift = controls.keysDown.includes("ShiftLeft") || controls.keysDown.includes("ShiftRight");
    // Ctrl, Cmd and Alt keys are the browser's: Ctrl+V pastes through its own
    // event, and its V must not be typed as well.
    const command = controls.keysDown.some((k) => /^(Control|Meta|Alt)(Left|Right)$/.test(k));
    for (const code of controls.keys) {
      if (code === "Enter" || code === "NumpadEnter") {
        const key = keyFromText(this.typed);
        if (key) return this.connect(key);
        this.message = this.typed ? "That is not a key." : "";
      } else if (code === "Backspace") {
        this.typed = this.typed.slice(0, -1);
        this.message = "";
      } else {
        const ch = command ? null : typedChar(code, shift);
        if (ch && this.typed.length < F.maxPastedChars) {
          this.typed += ch;
          this.message = "";
        }
      }
    }
  }

  private answer(grade: Grade): void {
    const session = this.session;
    const card = this.card;
    if (!session || !card) return;
    this.phase = "saving";
    this.mumble.stop();
    session.grade(card.slug, grade).then(
      (ok) => {
        if (this.done) return;
        if (!ok) return this.fail("No connection. That answer was not saved.");
        this.answered(card.slug, grade);
      },
      () => {
        if (!this.done) this.fail("No connection. That answer was not saved.");
      },
    );
  }

  private answered(slug: string, grade: Grade): void {
    const session = this.session!;
    if (grade === "gotit") {
      this.gotIt++;
      // A guest whose browser cannot keep answers is paid nothing (the cap cannot be tracked either).
      if (this.active.paysPoints && !session.unsaved && this.store.claimCard()) {
        this.host.reward?.(F.pointsPerCard, []);
        this.paid++;
      }
    } else {
      this.again++;
      this.queue = session.requeue(this.queue, this.index, slug);
    }
    this.index++;
    this.selected = 0;
    this.progress = this.queue.length > 0 ? Math.min(1, this.index / this.queue.length) : 1;
    if (this.index >= this.queue.length) {
      this.message = `${this.gotIt} got it, ${this.again} again.`;
      this.showProgress();
    } else {
      this.phase = "front";
      this.speakIf("front");
    }
  }

  // Both ways out (finishing and Escape) stop listening for pastes.
  protected finish(result: ActivityResult): void {
    this.mumble.stop();
    this.unlisten?.();
    this.unlisten = null;
    super.finish(result);
  }

  // -- Drawing ---------------------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    const w = 264;
    // Taller in the practice deck, which shows the transcription as well.
    // A guest's box has a line more, for the note that progress stays in this browser.
    const h = this.backend.practice ? 140 : this.guest ? 132 : 120;
    const x = Math.round((screen.width - w) / 2);
    const y = Math.round((screen.height - h) / 2);
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.night;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    const cx = screen.width / 2;
    const line = (text: string, ty: number, color: string = COLOR.paper, scale = 1) =>
      drawText(ctx, text, cx, y + ty, { align: "center", color, shadow: null, scale: fit(text, scale, w - 16) });

    if (this.phase === "choice") {
      line("Study Spanish", 8, COLOR.butter);
      ["Study without a key", "Enter a sync key"].forEach((text, i) => {
        const on = this.chosen === i;
        line(`${on ? "> " : "  "}${text}`, 34 + i * 14, on ? COLOR.butter : COLOR.paper);
      });
      line("Without a key, progress is saved", 74, COLOR.mist);
      line("in this browser only.", 84, COLOR.mist);
      line("Up, Down, E: pick   Esc: back", h - 14, COLOR.mist);
    } else if (this.phase === "key") {
      line("Sync key", 8, COLOR.butter);
      line("Paste your pairing link", 24);
      line("or type the key", 35);
      const masked = "*".repeat(Math.min(this.typed.length, 32));
      line(masked || "_", 56, COLOR.mist);
      line(`${this.typed.length} characters`, 68, COLOR.slate);
      if (this.message) line(this.message, 82, COLOR.tangerine);
      line("Enter: ok   Esc: back", h - 14, COLOR.mist);
    } else if (this.phase === "connecting") {
      line("Connecting...", h / 2 - 4, COLOR.mist);
    } else if (this.phase === "problem") {
      line("Study Spanish", 8, COLOR.butter);
      line(this.message, 50, COLOR.tangerine);
      if (this.guest && this.message === "The saved cards could not be read.") {
        if (this.confirmRestart) line("Erase them and start again? Y: yes", 70, COLOR.butter);
        else line("S: start again", 70, COLOR.mist);
      }
      line("E: leave", h - 14, COLOR.mist);
    } else if (this.phase === "done") {
      line("Study Spanish", 8, COLOR.butter);
      if (this.summary) this.drawProgress(ctx, x, y, w, line, this.summary);
      else {
        line(this.message, 50);
        if (this.paid > 0) line(`${this.paid * F.pointsPerCard} points`, 66, COLOR.leaf);
      }
      if (this.guest) line(this.session?.unsaved ? "Progress was not kept." : "Saved in this browser only.", h - 26, this.session?.unsaved ? COLOR.tangerine : COLOR.slate);
      const leave = this.backend.usesKey === false ? "E: leave" : this.guest ? "E: leave   K: use a key" : "E: leave   K: other key   G: no key";
      line(leave, h - 14, COLOR.mist);
    } else {
      this.drawCard(ctx, x, y, w, h, line);
    }
  }

  // The progress page: a bar (known, then met), a few plain lines, and what was
  // earned by answering this time. Positions come from `PROGRESS_LAYOUT`.
  private drawProgress(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    line: (text: string, ty: number, color?: string, scale?: number) => void,
    summary: ProgressSummary,
  ): void {
    const L = PROGRESS_LAYOUT;
    const bw = w - 2 * L.margin;
    const bx = x + L.margin;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(bx, y + L.barY, bw, L.barH);
    ctx.fillStyle = COLOR.slate;
    ctx.fillRect(bx + 1, y + L.barY + 1, bw - 2, L.barH - 2);
    const parts = barParts(summary, bw - 2);
    ctx.fillStyle = COLOR.leaf;
    ctx.fillRect(bx + 1, y + L.barY + 1, parts.known, L.barH - 2);
    ctx.fillStyle = COLOR.mist;
    ctx.fillRect(bx + 1 + parts.known, y + L.barY + 1, parts.met, L.barH - 2);
    let ty: number = L.textY;
    for (const item of this.progressLines()) {
      ty += item.gap ?? 0;
      line(item.text, ty, TONE[item.tone]);
      ty += L.row;
    }
  }

  // The lines of the page, with the points earned by answering this time last.
  progressLines(): PageLine[] {
    if (!this.summary) return [];
    const lines = pageLines(this.summary, { gotIt: this.gotIt, again: this.again });
    if (this.paid > 0) lines.push({ text: `${this.paid * F.pointsPerCard} points`, tone: "leaf" });
    return lines;
  }

  private drawCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    line: (text: string, ty: number, color?: string, scale?: number) => void,
  ): void {
    const card = this.card;
    if (!card) return;
    line(`Card ${Math.min(this.index + 1, this.queue.length)} of ${this.queue.length}`, 8, COLOR.slate);
    if (this.phase === "back" || (card.speaks ?? "back") === "front") {
      drawText(ctx, "R: say it", x + w - 8, y + 8, { align: "right", color: COLOR.slate, shadow: null });
      if (this.backend.practice) {
        drawText(ctx, `V: ${VOICE_STYLES[this.voiceStyle]}`, x + 8, y + 8, { color: COLOR.slate, shadow: null });
      }
    }
    // Each part is drawn under the one before it. A part is big when it fits on one
    // line, small and wrapped (two lines at most) when not.
    const block = (text: string, ty: number, color: string): number => {
      const room = w - 16;
      if (textWidth(text, 2) <= room) {
        line(text, ty, color, 2);
        // Room for the accent of a capital under it, as the fixed layout always had.
        return ty + 24;
      }
      const parts = wrapText(text, room).slice(0, 2);
      parts.forEach((part, i) => line(part, ty + 3 + i * 10, color));
      return ty + 3 + parts.length * 10 + 6;
    };
    // Real play keeps the fixed layout (prompt at 22, answer at 46, hint at 68). The
    // practice deck, which also shows the transcription, lays each part under the last.
    const practice = !!this.backend.practice;
    // The transcription, in the practice deck, under the Spanish it belongs to.
    const showIpa = practice && !!card.ipa;
    const ipa = (ty: number): number => {
      if (!showIpa) return ty;
      const parts = wrapIpa(card.ipa!, w - 16).slice(0, 3);
      parts.forEach((part, i) => drawIpa(ctx, part, x + w / 2, y + ty + i * 11, { align: "center", color: COLOR.leaf }));
      return ty + parts.length * 11 + 3;
    };
    let ty = block(card.prompt, 22, COLOR.paper);
    if (!practice) ty = 46;
    if ((card.speaks ?? "back") === "front") ty = ipa(ty);
    if (this.session?.unsaved) drawText(ctx, "NOT SAVED", x + 8, y + 8, { color: COLOR.tangerine, shadow: null });
    if (this.phase === "front") {
      if (this.session?.unsaved) line("Progress will not be kept.", h - 28, COLOR.tangerine);
      line("E: flip", h - 14, COLOR.mist);
      return;
    }
    ty = block(card.answer, ty, COLOR.butter);
    if (!practice) ty = 68;
    if ((card.speaks ?? "back") === "back") ty = ipa(ty);
    if (card.hint) wrapText(card.hint, w - 16).slice(0, 2).forEach((part, i) => line(part, ty + i * 9, COLOR.mist));
    const saving = this.phase === "saving";
    GRADES.forEach((g, i) => {
      const bx = x + 28 + i * (w / 2 - 14);
      const bw = w / 2 - 42;
      const on = !saving && this.selected === i;
      ctx.fillStyle = on ? COLOR.butter : COLOR.ink;
      ctx.fillRect(bx, y + h - 30, bw, 18);
      ctx.fillStyle = COLOR.slate;
      ctx.fillRect(bx + 1, y + h - 29, bw - 2, 16);
      drawText(ctx, LABEL[g], bx + bw / 2, y + h - 30 + (18 - GLYPH_H) / 2, {
        align: "center",
        shadow: null,
        color: saving ? COLOR.mist : on ? COLOR.butter : COLOR.paper,
      });
    });
  }
}

// Breaks a transcription into lines no wider than `width` pixels, at spaces.
function wrapIpa(text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/ +/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ipaWidth(candidate) <= width || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The largest scale (1 or `want`) at which `text` fits in `width` pixels.
function fit(text: string, want: number, width: number): number {
  return want > 1 && textWidth(text, want) > width ? 1 : want;
}

registerActivity("flashcards", (_spec, item, host) => new FlashcardsActivity(needHost(host, `Task "${item.id}"`)));
