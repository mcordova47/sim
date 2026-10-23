import { ACHIEVEMENTS_UI as UI, VIEW } from "../config";
import { textWidth } from "../../render/font";
import { HUD_BOX, STATUS_BOX, type Box } from "../../render/layout";
import { wrapText } from "../dialog";

export interface ToastView {
  title: string;
  lines: string[];
  // Where to draw it and how opaque, after the slide is applied.
  box: Box;
  alpha: number;
}

interface Toast {
  title: string;
  lines: string[];
  slot: number;
  age: number;
}

// The line height of a toast's text (7 px glyphs and a pixel of space).
const LINE = 9;

// What screen space the toasts must stay out of, besides each other.
export const TOAST_AVOID: Box[] = [HUD_BOX, STATUS_BOX];

export function toastHeight(lineCount: number): number {
  return UI.toastPadding * 2 + LINE + lineCount * LINE - 1;
}

// A short stack of toasts down the right side, below the status panel. A toast
// keeps its slot while it shows, so two never overlap; extra ones wait. All
// the timing is here, driven by `update(dt)`, so it can be tested without a canvas.
export class ToastQueue {
  private waiting: { title: string; lines: string[] }[] = [];
  private showing: Toast[] = [];

  push(title: string, description: string): void {
    const inner = UI.toastWidth - 2 * UI.toastPadding;
    this.waiting.push({ title, lines: wrapText(description, inner, textWidth) });
  }

  get idle(): boolean {
    return this.waiting.length === 0 && this.showing.length === 0;
  }

  clear(): void {
    this.waiting = [];
    this.showing = [];
  }

  update(dt: number): void {
    for (const t of this.showing) t.age += dt;
    this.showing = this.showing.filter((t) => t.age < UI.toastSeconds);
    while (this.waiting.length > 0 && this.showing.length < UI.maxToasts) {
      const slot = [...Array(UI.maxToasts).keys()].find((s) => !this.showing.some((t) => t.slot === s))!;
      this.showing.push({ ...this.waiting.shift()!, slot, age: 0 });
    }
  }

  // Where slot `slot` rests, given the height of the toast in the slots above it.
  private restingBox(t: Toast): Box {
    const top = STATUS_BOX.y + STATUS_BOX.h + UI.toastMargin;
    let y = top;
    // Slots are stacked by the tallest toast, so a toast never moves when another ends.
    const tallest = toastHeight(2);
    y += t.slot * (tallest + UI.toastGap);
    return { x: VIEW.width - UI.toastWidth - UI.toastMargin, y, w: UI.toastWidth, h: toastHeight(t.lines.length) };
  }

  views(): ToastView[] {
    return this.showing.map((t) => {
      const rest = this.restingBox(t);
      // 0 while sliding in, 1 once in, back to 0 while sliding out.
      const into = Math.min(1, t.age / UI.toastSlide);
      const out = Math.min(1, (UI.toastSeconds - t.age) / UI.toastSlide);
      const shown = Math.max(0, Math.min(into, out));
      const eased = 1 - (1 - shown) ** 2;
      return {
        title: t.title,
        lines: t.lines,
        box: { ...rest, x: Math.round(rest.x - (1 - eased) * UI.slideDistance) },
        alpha: eased,
      };
    });
  }
}
