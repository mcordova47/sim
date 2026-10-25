import { browserClipboard, type ClipboardLike } from "../../input/clipboard";
import type { Controls } from "../../input/controls";
import { COLOR } from "../../render/colors";
import { GLYPH_H, drawText, textWidth } from "../../render/font";
import { BaseActivity, needHost, registerActivity, type ActivityHost, type ActivityResult } from "../activity";
import { FLASHCARDS as F } from "../config";
import { studyBackend } from "../flashcards/backend";
import { keyFromText, studyStore, type StudyStore } from "../flashcards/key";
import type { CardView, Grade, StudyBackend, StudySession } from "../flashcards/study";
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
  private unlisten: (() => void) | null = null;

  constructor(
    private readonly host: ActivityHost,
    private readonly backend: StudyBackend = studyBackend(),
    private readonly store: StudyStore = studyStore(),
    private readonly clipboard: ClipboardLike = browserClipboard,
  ) {
    super();
  }

  get card(): CardView | null {
    const slug = this.queue[this.index];
    return this.session && slug !== undefined ? this.session.card(slug) : null;
  }

  start(): void {
    this.store.clock = () => this.host.gameMinutes?.() ?? 0;
    this.unlisten = this.clipboard.onPaste((text) => this.paste(text));
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
    if (result === "bad-key") {
      this.store.forgetKey();
      this.typed = "";
      this.message = "That key was not accepted.";
      this.phase = "key";
      return;
    }
    this.store.saveKey(key);
    this.session = result;
    this.queue = result.queue();
    this.index = 0;
    if (this.queue.length === 0) {
      this.message = "Nothing is due. Come back later.";
      this.phase = "done";
    } else {
      this.phase = "front";
    }
  }

  private fail(message: string): void {
    this.message = message;
    this.phase = "problem";
  }

  private paste(text: string): void {
    if (this.done || this.phase !== "key") return;
    this.typed = text.trim().slice(0, F.maxPastedChars);
    this.message = "";
  }

  update(_dt: number, controls: Controls): void {
    if (this.done) return;
    if (this.phase === "key") return this.updateKey(controls);
    if (this.phase === "front") {
      if (controls.interactPressed || controls.keys.includes("Space")) this.phase = "back";
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

  private updateKey(controls: Controls): void {
    const shift = controls.keysDown.includes("ShiftLeft") || controls.keysDown.includes("ShiftRight");
    for (const code of controls.keys) {
      if (code === "Enter" || code === "NumpadEnter") {
        const key = keyFromText(this.typed);
        if (key) return this.connect(key);
        this.message = this.typed ? "That is not a key." : "";
      } else if (code === "Backspace") {
        this.typed = this.typed.slice(0, -1);
        this.message = "";
      } else {
        const ch = typedChar(code, shift);
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
    }
  }

  // Both ways out (finishing and Escape) stop listening for pastes.
  protected finish(result: ActivityResult): void {
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
    line(card.prompt, 30, COLOR.paper, 2);
    if (this.phase === "front") {
      line("E: flip", h - 14, COLOR.mist);
      return;
    }
    line(card.answer, 52, COLOR.butter, 2);
    if (card.hint) line(card.hint, 72, COLOR.mist);
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
