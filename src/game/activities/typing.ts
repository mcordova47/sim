import type { Controls } from "../../input/controls";
import { COLOR } from "../../render/colors";
import { GLYPH_H, drawText, textWidth, unsupportedChars } from "../../render/font";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";
import { TYPING } from "../config";
import { CODE_LINES } from "../typing-text";

// The default lines to type: code. A task can bring its own (see `text`).
export const SNIPPETS = CODE_LINES;

// Keys that type a character: letters, digits, space and the punctuation keys.
// Escape (backing out), arrows and the like do not.
export function isTypingKey(code: string): boolean {
  return /^(Key[A-Z]|Digit[0-9]|Space|Comma|Period|Semicolon|Quote|Slash|Backslash|BracketLeft|BracketRight|Minus|Equal|Backquote)$/.test(
    code,
  );
}

// Key mashing: every key press types one more character of the code, whatever
// the key. How well it went depends on how fast the lines were finished.
export class TypingActivity extends BaseActivity {
  cancellable = true;
  readonly readsKeys = true;

  readonly lines: string[];
  private readonly total: number;
  private typed = 0;
  private elapsed = 0;

  constructor(lines: string[]) {
    super();
    if (lines.length > TYPING.maxLines) {
      throw new Error(`Too many lines to type: ${lines.length} (at most ${TYPING.maxLines})`);
    }
    for (const line of lines) {
      if (textWidth(line) > TYPING.maxLineWidth) {
        throw new Error(`A line to type is too wide for the screen (${textWidth(line)} px, at most ${TYPING.maxLineWidth}): "${line}"`);
      }
    }
    this.lines = lines;
    this.total = lines.reduce((sum, l) => sum + l.length, 0);
  }

  get typedCount(): number {
    return this.typed;
  }

  update(dt: number, controls: Controls): void {
    if (this.done) return;
    this.elapsed += dt;
    for (const code of controls.keys) {
      if (isTypingKey(code)) this.typed = Math.min(this.total, this.typed + 1);
    }
    this.progress = this.total > 0 ? this.typed / this.total : 1;

    if (this.typed >= this.total) {
      this.finish({ completed: true, quality: this.quality() });
    } else if (this.elapsed >= TYPING.maxSeconds) {
      this.finish({ completed: true, quality: 0 });
    }
  }

  // 1 at the fastest speed, 0 at the slowest, in between on a straight line.
  private quality(): number {
    const fast = this.total / TYPING.fastCps;
    const slow = this.total / TYPING.slowCps;
    return Math.min(1, Math.max(0, (slow - this.elapsed) / (slow - fast)));
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    const lineH = GLYPH_H + 3;
    const w = Math.min(screen.width - 24, Math.max(...this.lines.map((l) => textWidth(l))) + 16);
    const h = this.lines.length * lineH + 22;
    const x = Math.round((screen.width - w) / 2);
    const y = Math.round(screen.height / 2 - h / 2);

    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.night;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // Typed characters bright, the rest dim, across the lines in order.
    let left = this.typed;
    this.lines.forEach((line, i) => {
      const done = Math.max(0, Math.min(line.length, left));
      left -= line.length;
      const ty = y + 6 + i * lineH;
      drawText(ctx, line, x + 8, ty, { color: COLOR.mist, shadow: null });
      if (done > 0) drawText(ctx, line.slice(0, done), x + 8, ty, { color: COLOR.butter, shadow: null });
    });

    // A bar of how far along.
    const barW = w - 16;
    const barY = y + h - 10;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x + 8, barY, barW, 3);
    ctx.fillStyle = COLOR.leaf;
    ctx.fillRect(x + 8, barY, Math.round(barW * this.progress), 3);
  }
}

function lineCount(spec: Record<string, unknown>, item: { id: string }): number {
  const count = spec.lines === undefined ? TYPING.lines : spec.lines;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > TYPING.maxLines) {
    throw new Error(
      `Task "${item.id}": typing needs a whole number of lines, 1 or more and at most ${TYPING.maxLines}`,
    );
  }
  return count;
}

// The lines a task brings in its `text` list, or null if it has none.
function ownText(spec: Record<string, unknown>, item: { id: string }): string[] | null {
  if (spec.text === undefined) return null;
  const where = `Task "${item.id}": typing`;
  const text = spec.text;
  if (!Array.isArray(text) || text.length === 0) throw new Error(`${where} text needs a list of lines, one or more`);
  for (const line of text) {
    if (typeof line !== "string" || line.trim() === "") throw new Error(`${where} text lines must be words, not empty`);
    const bad = unsupportedChars(line);
    if (bad.length) throw new Error(`${where} text "${line}" uses characters the font can't draw: ${bad.join(" ")}`);
    if (textWidth(line) > TYPING.maxLineWidth) {
      throw new Error(`${where} text "${line}" is too wide for the screen (${textWidth(line)} px, at most ${TYPING.maxLineWidth})`);
    }
  }
  return text as string[];
}

// `count` lines from `pool`: no repeats until the pool runs out.
function pick(pool: readonly string[], count: number, random: () => number): string[] {
  const left = [...pool];
  const lines: string[] = [];
  while (lines.length < count) {
    if (left.length === 0) left.push(...pool);
    lines.push(left.splice(Math.floor(random() * left.length), 1)[0]);
  }
  return lines;
}

registerActivity(
  "typing",
  (spec, item, host) => {
    const h: ActivityHost = needHost(host, `Task "${item.id}"`);
    const count = lineCount(spec, item);
    const own = ownText(spec, item);
    if (own) return new TypingActivity(pick(own, count, () => h.random()));
    const lines = Array.from({ length: count }, () => SNIPPETS[Math.floor(h.random() * SNIPPETS.length)]);
    return new TypingActivity(lines);
  },
  (spec, item) => {
    lineCount(spec, item);
    ownText(spec, item);
  },
);
