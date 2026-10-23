import { COLOR } from "../../render/colors";
import { drawText } from "../../render/font";
import { VIEW } from "../config";
import type { Achievement } from "./data";
import type { ToastView } from "./toasts";

const PANEL = COLOR.night;

export function drawToasts(ctx: CanvasRenderingContext2D, toasts: ToastView[]): void {
  for (const t of toasts) {
    const { x, y, w, h } = t.box;
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COLOR.butter;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    drawText(ctx, t.title, x + 4, y + 4, { color: COLOR.butter });
    t.lines.forEach((line, i) => drawText(ctx, line, x + 4, y + 4 + 9 * (i + 1), { color: COLOR.paper }));
  }
  ctx.globalAlpha = 1;
}

export const LIST_LAYOUT = {
  top: 18,
  rowHeight: 10,
  columns: 2,
  // Where the description of the picked achievement goes.
  footerTop: VIEW.height - 28,
};

// How many achievements fit in the list (so a test can say when it is full).
export const LIST_CAPACITY =
  LIST_LAYOUT.columns * Math.floor((LIST_LAYOUT.footerTop - 2 - LIST_LAYOUT.top) / LIST_LAYOUT.rowHeight);

export interface ListView {
  achievements: readonly Achievement[];
  unlocked: (id: string) => boolean;
  cursor: number;
  // A line to show instead of the usual hint, for example the reset question.
  message: string | null;
}

// The list of achievements: a full-screen panel, locked ones as "???".
export function drawList(ctx: CanvasRenderingContext2D, view: ListView): void {
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const done = view.achievements.filter((a) => view.unlocked(a.id)).length;
  drawText(ctx, `ACHIEVEMENTS ${done}/${view.achievements.length}`, 6, 5, { color: COLOR.butter });

  const perColumn = Math.ceil(view.achievements.length / LIST_LAYOUT.columns);
  const columnWidth = Math.floor((VIEW.width - 12) / LIST_LAYOUT.columns);
  view.achievements.forEach((a, i) => {
    const col = Math.floor(i / perColumn);
    const x = 6 + col * columnWidth;
    const y = LIST_LAYOUT.top + (i % perColumn) * LIST_LAYOUT.rowHeight;
    const has = view.unlocked(a.id);
    if (i === view.cursor) {
      ctx.fillStyle = COLOR.slate;
      ctx.fillRect(x - 3, y - 1, columnWidth - 2, LIST_LAYOUT.rowHeight - 1);
    }
    drawText(ctx, has ? a.name : "???", x, y, { color: has ? COLOR.paper : COLOR.mist, shadow: null });
  });

  const picked = view.achievements[view.cursor];
  if (picked) {
    const has = view.unlocked(picked.id);
    drawText(ctx, has ? picked.name : "???", 6, LIST_LAYOUT.footerTop, { color: COLOR.butter });
    drawText(ctx, has ? picked.description : "???", 6, LIST_LAYOUT.footerTop + 10, { color: COLOR.paper });
  }
  const hint = view.message ?? "ARROWS: LOOK   L: CLOSE   SHIFT+R: RESET";
  drawText(ctx, hint, VIEW.width / 2, VIEW.height - 9, {
    color: view.message ? COLOR.tangerine : COLOR.mist,
    align: "center",
  });
}
