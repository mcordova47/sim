import type { Controls } from "../../input/controls";
import type { TapTarget } from "../../input/tap";
import { COLOR } from "../../render/colors";
import { hintLine } from "../../render/hints";
import { drawCloseup, drawGrid, drawPhone, drawPhoneFoot } from "../achievements/gallery-draw";
import { BaseActivity, needHost, registerActivity, type ActivityHost } from "../activity";
import { REEL } from "../config";
import { closeupLayout, gridLayout, move, open, pictureAt, sceneGallery, tapCell, type Dir, type Gallery } from "../reel/gallery";
import type { ReelPic } from "../reel/reel-store";

// "Scroll through photos", the sofa scene (issue 117e, docs/photo-gallery-design.md section 3.5). It
// replaces the 113d slideshow. A phone view shows six pictures picked at random on one screen (no paging)
// with one fixed line under them; the player moves a highlight with the arrows and presses E to open a
// close-up of one. In the close-up E leaves and pays the task's points; Escape, anywhere, leaves and pays
// nothing (the universal back-out). There is no add, delete or setting here. Nothing about a picture is
// known to the game: both lines come from fixed pools in `REEL` and say nothing about what is shown.
// All geometry comes from `reel/gallery.ts`, so what is drawn is what a tap hits.

const pick = (pool: readonly string[], random: () => number): string => (pool.length > 0 ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] : "");

const KEY_DIR: Record<string, Dir> = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" };

export interface ReelLines {
  phoneLines: readonly string[];
  closeupLines: readonly string[];
}

export class ReelActivity extends BaseActivity {
  cancellable = true;
  // E and the arrows are this screen's keys, so a press made during it is its own.
  readonly readsKeys = true;
  // No time pressure: the apartment's clock stands still while it runs.
  readonly holdsClock = true;

  gallery: Gallery<ReelPic>;
  // The one line under the grid, fixed for the whole session ("" when the pool is empty).
  readonly phoneLine: string;
  // The close-up's caption, chosen each time a close-up opens and kept while it is up.
  caption = "";
  private readonly closeupLines: readonly string[];
  private readonly random: () => number;

  constructor(host: ActivityHost, lines: ReelLines = REEL) {
    super();
    this.random = () => host.random();
    this.gallery = sceneGallery(host.reelPictures?.() ?? [], this.random, REEL.pass);
    this.phoneLine = pick(lines.phoneLines, this.random);
    this.closeupLines = lines.closeupLines;
  }

  get inCloseup(): boolean {
    return this.gallery.view === "closeup";
  }

  // With no picture there is nothing to scroll: end quietly and pay nothing.
  start(): void {
    if (this.gallery.pics.length === 0) this.cancel();
  }

  // Escape (or LEAVE): from either view, pays nothing.
  cancel(): void {
    this.finish({ completed: false, quiet: true });
  }

  private openCloseup(): void {
    if (this.inCloseup) return;
    const next = open(this.gallery);
    if (next === this.gallery) return;
    this.gallery = next;
    this.caption = pick(this.closeupLines, this.random);
  }

  // E (or a tap) in the close-up: the one way to finish, and it pays.
  private finishCloseup(): void {
    if (this.inCloseup) this.finish({ completed: true });
  }

  update(_dt: number, controls: Controls): void {
    if (this.done) return;
    for (const code of controls.keys) {
      if (this.done) return;
      if (code === "KeyE") {
        if (this.inCloseup) this.finishCloseup();
        else this.openCloseup();
      } else if (!this.inCloseup && code in KEY_DIR) this.gallery = move(this.gallery, KEY_DIR[code]);
    }
  }

  tapTargets(screen: { width: number; height: number }): TapTarget[] {
    const full = { x: 0, y: 0, w: screen.width, h: screen.height };
    if (this.inCloseup) return [{ ...full, run: () => this.finishCloseup() }];
    const layout = gridLayout({ mode: "scene", screen, line: this.phoneLine });
    const targets: TapTarget[] = [
      // Outside the phone leaves (paying nothing); the phone itself swallows a stray tap.
      { ...full, run: () => this.cancel() },
      { ...layout.phone!.panel, run: () => undefined },
    ];
    layout.cells.forEach((cell, i) => targets.push({ ...cell, run: () => this.tapCell(i) }));
    for (const b of layout.phone!.buttons) targets.push({ ...b.rect, run: () => (b.id === "continue" ? this.openCloseup() : this.cancel()) });
    return targets;
  }

  private tapCell(i: number): void {
    const next = tapCell(this.gallery, i);
    if (next.view === "closeup") this.openCloseup();
    else this.gallery = next;
  }

  draw(ctx: CanvasRenderingContext2D, screen: { width: number; height: number }): void {
    const pic = pictureAt(this.gallery);
    if (!pic) return;
    if (this.inCloseup) {
      const layout = closeupLayout({ mode: "scene", screen, pic, caption: this.caption });
      drawCloseup(ctx, layout, pic, { hint: hintLine([{ key: "E", text: "DONE" }]) });
      return;
    }
    ctx.fillStyle = COLOR.night;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, screen.width, screen.height);
    ctx.globalAlpha = 1;
    const layout = gridLayout({ mode: "scene", screen, line: this.phoneLine });
    drawPhone(ctx, layout);
    drawGrid(ctx, this.gallery, layout, "scene");
    drawPhoneFoot(ctx, layout);
  }
}

registerActivity("reel", (_spec, item, host) => new ReelActivity(needHost(host, `Task "${item.id}"`)));
