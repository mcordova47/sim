import { browserClipboard, type ClipboardLike } from "../../input/clipboard";
import type { Controls } from "../../input/controls";
import { COLOR } from "../../render/colors";
import { GLYPH_H, drawText, textWidth } from "../../render/font";
import { BaseActivity, needHost, registerActivity, type ActivityHost, type ActivityResult } from "../activity";
import { FLASHCARDS as F } from "../config";
import { studyBackend } from "../flashcards/backend";
import { Mumble } from "../flashcards/mumble";
import { keyFromText, studyStore, type StudyStore } from "../flashcards/key";
import type { CardView, Grade, StudyBackend, StudySession } from "../flashcards/study";
import { wrapText } from "../dialog";
import { typedChar } from "./make-track";

// Studying Spanish at the computer (issue 026, docs/flashcards.md). The game is
// a front end for the real flashcards app: it asks the app's backend for the
// session, shows each card, and sends every answer back so the real schedule
// stays right. Flip a card (E), then pick "again" or "got it" (left or right,
// then E). Escape leaves from anywhere. There is no clock: it holds the
// apartment's time still, and each answer is delivered as it is given, so
// leaving loses nothing.

type Phase = "key" | "connecting" | "front" | "back" | "saving" | "problem" | "done";

const GRADES: Grade[] = ["again", "gotit"];
const LABEL: Record<Grade, string> = { again: "Again", gotit: "Got it" };

export class FlashcardsActivity extends BaseActivity {
  cancellable = true;
  // E and the letters are this screen's keys.
  readonly readsKeys = true;
  readonly holdsClock = true;
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

  private session: StudySession | null = null;
  private shown: { at: number; slug: string; view: CardView } | null = null;
  private unlisten: (() => void) | null = null;
  private readonly mumble: Mumble;

  constructor(
    private readonly host: ActivityHost,
    private readonly backend: StudyBackend = studyBackend(),
    private readonly store: StudyStore = studyStore(),
    private readonly clipboard: ClipboardLike = browserClipboard,
  ) {
    super();
    this.mumble = new Mumble((pitch) => host.voice?.(pitch));
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

  start(): void {
    this.store.clock = () => this.host.gameMinutes?.() ?? 0;
    this.unlisten = this.clipboard.onPaste((text) => this.paste(text));
    if (this.backend.usesKey === false) return this.connect("");
    const key = this.store.key();
    if (key) this.connect(key);
    else this.phase = "key";
  }

  private connect(key: string): void {
    this.phase = "connecting";
    this.backend.open(key).then(
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
    if (result === "unreadable") return this.fail("The saved cards could not be read.");
    if (result === "bad-key") {
      this.store.forgetKey();
      this.typed = "";
      this.message = "That key was not accepted.";
      this.phase = "key";
      return;
    }
    if (this.backend.usesKey !== false) this.store.saveKey(key);
    this.session = result;
    this.queue = result.queue();
    this.index = 0;
    if (this.queue.length === 0) {
      this.message = "Nothing is due. Come back later.";
      this.phase = "done";
    } else {
      this.phase = "front";
      this.speakIf("front");
    }
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
    if (this.phase === "key") return this.updateKey(controls);
    if (this.phase === "front" || this.phase === "back") this.repeat(controls);
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
    if ((this.phase === "problem" || this.phase === "done") && (controls.interactPressed || controls.keys.includes("Enter"))) {
      this.finish({ completed: false, quiet: true });
    }
  }

  // "Says" the card's Spanish if it is on the side that has just appeared.
  private speakIf(side: "front" | "back"): void {
    const card = this.card;
    if (!card) return;
    if ((card.speaks ?? "back") === side) this.mumble.say(card.spoken ?? card.answer);
  }

  // R says the Spanish again, once it is showing.
  private repeat(controls: Controls): void {
    if (!controls.keys.includes(F.mumble.repeatKey) || controls.keysDown.some((k) => /^Shift/.test(k))) return;
    const card = this.card;
    if (!card) return;
    const showing = this.phase === "back" || (card.speaks ?? "back") === "front";
    if (showing) this.mumble.say(card.spoken ?? card.answer);
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
      if (this.backend.paysPoints && this.store.claimCard()) {
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
      this.phase = "done";
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
    const h = 120;
    const x = Math.round((screen.width - w) / 2);
    const y = Math.round((screen.height - h) / 2);
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.night;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    const cx = screen.width / 2;
    const line = (text: string, ty: number, color: string = COLOR.paper, scale = 1) =>
      drawText(ctx, text, cx, y + ty, { align: "center", color, shadow: null, scale: fit(text, scale, w - 16) });

    if (this.phase === "key") {
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
      line("E: leave", h - 14, COLOR.mist);
    } else if (this.phase === "done") {
      line("Study Spanish", 8, COLOR.butter);
      line(this.message, 50);
      if (this.paid > 0) line(`${this.paid * F.pointsPerCard} points`, 66, COLOR.leaf);
      line("E: leave", h - 14, COLOR.mist);
    } else {
      this.drawCard(ctx, x, y, w, h, line);
    }
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
    }
    // Big when it fits on one line, small and wrapped (two lines at most) when not.
    const block = (text: string, ty: number, color: string) => {
      const room = w - 16;
      if (textWidth(text, 2) <= room) return line(text, ty, color, 2);
      wrapText(text, room).slice(0, 2).forEach((part, i) => line(part, ty + 3 + i * 10, color));
    };
    block(card.prompt, 22, COLOR.paper);
    if (this.phase === "front") {
      line("E: flip", h - 14, COLOR.mist);
      return;
    }
    block(card.answer, 46, COLOR.butter);
    if (card.hint) wrapText(card.hint, w - 16).slice(0, 2).forEach((part, i) => line(part, 68 + i * 9, COLOR.mist));
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

// The largest scale (1 or `want`) at which `text` fits in `width` pixels.
function fit(text: string, want: number, width: number): number {
  return want > 1 && textWidth(text, want) > width ? 1 : want;
}

registerActivity("flashcards", (_spec, item, host) => new FlashcardsActivity(needHost(host, `Task "${item.id}"`)));
