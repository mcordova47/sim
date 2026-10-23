import { DIALOG, VIEW } from "../game/config";
import type { DialogView } from "../game/dialog";
import { COLOR } from "./colors";
import { GLYPH_H, drawText, textWidth } from "./font";
import type { Box } from "./layout";

const LINE = GLYPH_H + 2;
const CURSOR_WIDTH = 8;

// `label` cut down until it fits in `maxWidth` pixels.
export function fitLabel(label: string, maxWidth: number): string {
  let fitted = label;
  while (fitted.length > 0 && textWidth(fitted) > maxWidth) fitted = fitted.slice(0, -1);
  return fitted;
}

// The text box along the bottom of the screen, Pokemon style.
export function textBoxRect(screen = VIEW): Box {
  const h = DIALOG.padding * 2 + DIALOG.linesPerPage * LINE - 2;
  return {
    x: DIALOG.margin,
    y: screen.height - DIALOG.margin - h,
    w: screen.width - 2 * DIALOG.margin,
    h,
  };
}

// The list of choices, at the right, above the text box if there is one.
export function menuBoxRect(choices: string[], hasPrompt: boolean, screen = VIEW): Box {
  const widest = Math.max(0, ...choices.map((c) => textWidth(c)));
  const w = Math.min(screen.width - 2 * DIALOG.margin, widest + CURSOR_WIDTH + DIALOG.padding * 2);
  const h = DIALOG.padding * 2 + choices.length * LINE - 2;
  const bottom = hasPrompt ? textBoxRect(screen).y - 2 : screen.height - DIALOG.margin;
  return {
    x: screen.width - DIALOG.margin - w,
    y: Math.max(DIALOG.margin, bottom - h),
    w,
    h,
  };
}

function frame(ctx: CanvasRenderingContext2D, box: Box): void {
  ctx.fillStyle = COLOR.ink;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = COLOR.paper;
  ctx.fillRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
}

function drawLines(ctx: CanvasRenderingContext2D, box: Box, lines: string[]): void {
  lines.forEach((line, i) => {
    drawText(ctx, line, box.x + DIALOG.padding, box.y + DIALOG.padding + i * LINE, {
      color: COLOR.ink,
      shadow: null,
    });
  });
}

// Draws the current dialog on top of everything, in screen space.
export function drawDialog(ctx: CanvasRenderingContext2D, view: DialogView, screen = VIEW): void {
  if (view.kind === "say") {
    const box = textBoxRect(screen);
    frame(ctx, box);
    drawLines(ctx, box, view.lines);

    if (view.speaker) {
      const w = textWidth(view.speaker) + DIALOG.padding * 2;
      const tag = { x: box.x + DIALOG.padding, y: box.y - GLYPH_H - DIALOG.padding + 1, w, h: GLYPH_H + DIALOG.padding };
      frame(ctx, tag);
      drawText(ctx, view.speaker, tag.x + DIALOG.padding, tag.y + 3, { color: COLOR.ink, shadow: null });
    }

    // A small arrow that blinks when the page is all showing and waiting.
    if (view.waiting && view.blink) {
      const x = box.x + box.w - DIALOG.padding - 5;
      const y = box.y + box.h - DIALOG.padding - 2;
      ctx.fillStyle = COLOR.ink;
      ctx.fillRect(x, y, 5, 1);
      ctx.fillRect(x + 1, y + 1, 3, 1);
      ctx.fillRect(x + 2, y + 2, 1, 1);
    }
    return;
  }

  const hasPrompt = view.promptLines.length > 0;
  if (hasPrompt) {
    const box = textBoxRect(screen);
    frame(ctx, box);
    drawLines(ctx, box, view.promptLines);
  }

  const box = menuBoxRect(view.choices, hasPrompt, screen);
  frame(ctx, box);
  view.choices.forEach((label, i) => {
    const y = box.y + DIALOG.padding + i * LINE;
    if (i === view.cursor) {
      // A small arrow pointing at the chosen entry.
      const x = box.x + DIALOG.padding;
      ctx.fillStyle = COLOR.ink;
      ctx.fillRect(x, y, 1, 5);
      ctx.fillRect(x + 1, y + 1, 1, 3);
      ctx.fillRect(x + 2, y + 2, 1, 1);
    }
    const room = box.w - DIALOG.padding * 2 - CURSOR_WIDTH;
    drawText(ctx, fitLabel(label, room), box.x + DIALOG.padding + CURSOR_WIDTH, y, {
      color: COLOR.ink,
      shadow: null,
    });
  });
}
