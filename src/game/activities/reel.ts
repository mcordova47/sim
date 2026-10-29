import type { Controls } from "../../input/controls";
import type { Rect, TapTarget } from "../../input/tap";
import { COLOR } from "../../render/colors";
import { drawText } from "../../render/font";
import { drawPic } from "../achievements/photos-draw";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";
import { REEL } from "../config";
import { wrapText } from "../dialog";
import type { ReelPic } from "../reel/reel-store";

// "Scroll through photos" (issue 113d, docs/photo-reel-design.md section 6): a free-form activity
// modelled on the track editor. It shows the stored pictures on a phone-screen panel, one at a time,
// shuffled, and moves on by itself every REEL.seconds; Right (or a tap) goes on early. One pass of up
// to REEL.pass pictures, then it ends and pays the task's few points. Escape (or a tap outside the
// panel) leaves at once, paying nothing. Nothing about a picture is known to the game: the caption is
// one fixed line chosen when the session starts and shown once, under the first picture.

const BEZEL = 4;
const LINE = 9;
const CAPTION_LINES = 2;
// The panel is one phone shape that holds either orientation: a square screen for the picture, the caption below.
const SCREEN = 48 * REEL.scale;
const PANEL_W = SCREEN + BEZEL * 2;
const PANEL_H = BEZEL + SCREEN + 3 + LINE * CAPTION_LINES + BEZEL;

export interface ReelLayout {
  panel: Rect;
  screen: Rect;
  captionTop: number;
}

// Where everything sits, for any picture size: the drawn panel and the tap on it read this one function.
export function reelLayout(screen: { width: number; height: number }): ReelLayout {
  const x = Math.floor((screen.width - PANEL_W) / 2);
  const y = Math.max(0, Math.floor((screen.height - PANEL_H) / 2));
  return {
    panel: { x, y, w: PANEL_W, h: PANEL_H },
    screen: { x: x + BEZEL, y: y + BEZEL, w: SCREEN, h: SCREEN },
    captionTop: y + BEZEL + SCREEN + 3,
  };
}

// A fresh order of the pictures with no repeats, using the game's random source, up to one pass.
export function shuffledPass(pics: readonly ReelPic[], random: () => number, pass: number = REEL.pass): ReelPic[] {
  const order = [...pics];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.slice(0, pass);
}

export class ReelActivity extends BaseActivity {
  cancellable = true;
  // Right and E are this screen's keys, so a press made during it is its own.
  readonly readsKeys = true;
  // No time pressure: the apartment's clock stands still while it runs.
  readonly holdsClock = true;

  readonly pass: readonly ReelPic[];
  // The one caption of this session, or "" when the pool is empty.
  readonly caption: string;
  index = 0;
  private shown = 0;

  constructor(
    host: ActivityHost,
    captions: readonly string[] = REEL.captions,
  ) {
    super();
    this.pass = shuffledPass(host.reelPictures?.() ?? [], () => host.random());
    this.caption = captions.length > 0 ? captions[Math.min(captions.length - 1, Math.floor(host.random() * captions.length))] : "";
  }

  // With no picture there is nothing to scroll: end quietly and pay nothing.
  start(): void {
    if (this.pass.length === 0) this.cancel();
  }

  cancel(): void {
    this.finish({ completed: false, quiet: true });
  }

  get current(): ReelPic | null {
    return this.pass[this.index] ?? null;
  }

  private next(): void {
    if (this.done) return;
    this.shown = 0;
    this.index++;
    this.progress = Math.min(1, this.index / Math.max(1, this.pass.length));
    if (this.index >= this.pass.length) this.finish({ completed: true });
  }

  update(dt: number, controls: Controls): void {
    if (this.done) return;
    for (const code of controls.keys) {
      if (this.done) return;
      if (code === "ArrowRight" || code === "KeyE") this.next();
    }
    if (this.done) return;
    this.shown += dt;
    if (this.shown >= REEL.seconds) this.next();
  }

  tapTargets(screen: { width: number; height: number }): TapTarget[] {
    const { panel } = reelLayout(screen);
    return [
      // Outside the panel leaves; the panel goes to the next picture (later targets win).
      { x: 0, y: 0, w: screen.width, h: screen.height, run: () => this.cancel() },
      { ...panel, run: () => this.next() },
    ];
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    const pic = this.current;
    if (!pic) return;
    const l = reelLayout(screen);
    ctx.fillStyle = COLOR.night;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, screen.width, screen.height);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(l.panel.x, l.panel.y, l.panel.w, l.panel.h);
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(l.screen.x, l.screen.y, l.screen.w, l.screen.h);
    drawPic(ctx, pic, l.screen, REEL.scale);
    if (this.index === 0 && this.caption) {
      const lines = wrapText(this.caption, l.screen.w).slice(0, CAPTION_LINES);
      lines.forEach((line, i) => drawText(ctx, line, l.panel.x + l.panel.w / 2, l.captionTop + i * LINE, { color: COLOR.ink, align: "center", shadow: null }));
    }
  }
}

registerActivity("reel", (_spec, item, host) => new ReelActivity(needHost(host, `Task "${item.id}"`)));
