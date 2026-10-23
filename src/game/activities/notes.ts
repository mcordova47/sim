import type { Controls } from "../../input/controls";
import { COLOR } from "../../render/colors";
import { drawText } from "../../render/font";
import { BaseActivity, needHost, registerActivity } from "../activity";
import { NOTES } from "../config";
import { DIRECTIONS, type Direction } from "../direction";

// The character drawn for each direction, in the pixel font.
export const ARROW: Record<Direction, string> = { up: "^", down: "V", left: "<", right: ">" };

type Outcome = "hit" | "miss";

// A few notes, one at a time. Press the matching direction before the time is
// up. A wrong direction or running out of time is a miss. Quality is the share
// of notes hit.
export class NotesActivity extends BaseActivity {
  readonly outcomes: (Outcome | null)[];

  private index = 0;
  private waiting = true; // in the gap before a note
  private timer: number;

  constructor(readonly sequence: Direction[]) {
    super();
    if (sequence.length > NOTES.maxCount) {
      throw new Error(`Too many notes: ${sequence.length} (at most ${NOTES.maxCount})`);
    }
    this.outcomes = sequence.map(() => null);
    this.timer = NOTES.leadIn;
    if (sequence.length === 0) this.finish({ completed: true, quality: 1 });
  }

  // The note on screen now, or null in a gap.
  get current(): Direction | null {
    return this.done || this.waiting ? null : this.sequence[this.index];
  }

  // Share of the current note's time that is left, 0 to 1.
  get timeLeft(): number {
    return this.waiting ? 0 : Math.max(0, this.timer / NOTES.window);
  }

  update(dt: number, controls: Controls): void {
    if (this.done) return;
    this.timer -= dt;

    if (this.waiting) {
      if (this.timer <= 0) {
        this.waiting = false;
        this.timer = NOTES.window;
      }
      return;
    }

    const pressed = controls.dirPressed;
    if (pressed) {
      this.settle(pressed === this.sequence[this.index] ? "hit" : "miss");
    } else if (this.timer <= 0) {
      this.settle("miss");
    }
  }

  private settle(outcome: Outcome): void {
    this.outcomes[this.index] = outcome;
    this.index++;
    this.progress = this.index / this.sequence.length;
    if (this.index >= this.sequence.length) {
      const hits = this.outcomes.filter((o) => o === "hit").length;
      this.finish({ completed: true, quality: hits / this.sequence.length });
      return;
    }
    this.waiting = true;
    this.timer = NOTES.gap;
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    const slot = 18;
    const w = Math.max(80, this.sequence.length * slot + 16);
    const h = 52;
    const x = Math.round((screen.width - w) / 2);
    const y = Math.round(screen.height / 2 - h / 2);

    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.night;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // The whole line of notes: done ones green or red, the one now bright, the rest dim.
    const left = x + Math.round((w - this.sequence.length * slot) / 2);
    this.sequence.forEach((dir, i) => {
      const outcome = this.outcomes[i];
      const color =
        outcome === "hit" ? COLOR.leaf : outcome === "miss" ? COLOR.brick : i === this.index && !this.waiting ? COLOR.butter : COLOR.dusk;
      drawText(ctx, ARROW[dir], left + i * slot + 4, y + 10, { color, shadow: null, scale: 2 });
    });

    // A bar that shrinks while a note is waiting to be pressed.
    const barW = w - 16;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x + 8, y + h - 10, barW, 3);
    ctx.fillStyle = COLOR.tangerine;
    ctx.fillRect(x + 8, y + h - 10, Math.round(barW * this.timeLeft), 3);
  }
}

function noteCount(spec: Record<string, unknown>, item: { id: string }): number {
  const count = spec.count === undefined ? NOTES.count : Number(spec.count);
  if (!Number.isInteger(count) || count < 1 || count > NOTES.maxCount) {
    throw new Error(
      `Task "${item.id}": notes needs a whole number of notes, 1 or more and at most ${NOTES.maxCount} (so they fit the screen)`,
    );
  }
  return count;
}

registerActivity("notes", (spec, item, host) => {
  const h = needHost(host, `Task "${item.id}"`);
  const count = noteCount(spec, item);
  const sequence = Array.from({ length: count }, () => DIRECTIONS[Math.floor(h.random() * DIRECTIONS.length)]);
  return new NotesActivity(sequence);
}, (spec, item) => void noteCount(spec, item));
