import type { Controls } from "../../input/controls";
import type { TapTarget } from "../../input/tap";
import { COLOR } from "../../render/colors";
import { hintLine } from "../../render/hints";
import { drawCloseup, drawGrid, drawPhone, drawPhoneFoot } from "../achievements/gallery-draw";
import { BaseActivity, needHost, registerActivity, type Activity, type ActivityHost } from "../activity";
import { REEL } from "../config";
import { closeupLayout, gridLayout, move, open, pictureAt, sceneGallery, tapCell, type Dir, type Gallery } from "../reel/gallery";
import type { EncounterScene } from "../encounter-scene";
import type { ReelPic } from "../reel/reel-store";

// "Scroll through photos", the sofa scene (issue 117e, docs/photo-gallery-design.md section 3.5). It
// replaces the 113d slideshow. A phone view shows six pictures picked at random on one screen (no paging)
// with one fixed line under them; the player moves a highlight with the arrows and presses E to open a
// close-up of one. In the close-up E leaves and pays the task's points; Escape, anywhere, leaves and pays
// nothing (the universal back-out). There is no add, delete or setting here. Nothing about a picture is
// known to the game: both lines come from fixed pools in `REEL` and say nothing about what is shown.
// An ad may interrupt the close-up (issue 117f, section 6): once per session, `REEL.adAfter` seconds of
// close-up time in, the host rolls through the usual gates; on a hit the scene runs the encounter as a
// child, forwarding update, draw and taps to it and keeping its own state untouched. Escape then cancels
// only the ad and the same close-up comes back; the next Escape leaves as usual. Without `interruptWithAd`
// (or with a miss) the scene is exactly as before.
// All geometry comes from `reel/gallery.ts`, so what is drawn is what a tap hits.

const pick = (pool: readonly string[], random: () => number): string => (pool.length > 0 ? pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] : "");

const KEY_DIR: Record<string, Dir> = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" };

export interface ReelLines {
  phoneLines: readonly string[];
  closeupLines: readonly string[];
}

export class ReelActivity extends BaseActivity {
  cancellable = true;
  // E and the arrows are this screen's keys, so a press made during it is its own (while an ad runs, they
  // are the ad's, which is not a key game).
  get readsKeys(): boolean {
    return !this.child;
  }
  // The ad's first dialog ignores keys for a moment when it began over this scene's keys.
  get staleKeys(): boolean {
    return this.child?.staleKeys === true;
  }
  // True while an ad covers the scene: a phone view flips to the card's size, and the "ESC TO STOP" hint hides.
  get showsPicture(): boolean {
    return this.child !== null;
  }
  get hidesStopHint(): boolean {
    return this.child !== null;
  }
  // The ad's phase for its sound, while one runs.
  get encounterScene(): EncounterScene | null {
    return this.child?.encounterScene ?? null;
  }
  // No time pressure: the apartment's clock stands still while it runs.
  readonly holdsClock = true;

  gallery: Gallery<ReelPic>;
  // The one line under the grid, fixed for the whole session ("" when the pool is empty).
  readonly phoneLine: string;
  // The close-up's caption, chosen each time a close-up opens and kept while it is up.
  caption = "";
  // The ad running over the close-up, or null.
  private child: Activity | null = null;
  // Close-up seconds so far, and whether the session's one roll has been made.
  private closeupTime = 0;
  private rolled = false;
  private readonly host: ActivityHost;
  private readonly closeupLines: readonly string[];
  private readonly random: () => number;

  constructor(host: ActivityHost, lines: ReelLines = REEL) {
    super();
    this.host = host;
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

  // Escape (or LEAVE): from either view, pays nothing. While an ad runs it ends only the ad.
  cancel(): void {
    if (this.child) {
      const ad = this.child;
      this.child = null;
      this.guarded(() => ad.cancel());
      return;
    }
    this.finish({ completed: false, quiet: true });
  }

  // Runs something of the ad's. If the ad breaks, it is dropped and the close-up carries on untouched: a bug
  // in an ad must never cost the scene (or a picture).
  private guarded<T>(run: () => T): T | undefined {
    try {
      return run();
    } catch (error) {
      console.error("An ad over the photo close-up threw and was dropped", error);
      this.child = null;
      return undefined;
    }
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

  // After `REEL.adAfter` seconds in the close-up, one roll for the session.
  private maybeInterrupt(dt: number): void {
    if (this.rolled || !this.inCloseup) return;
    this.closeupTime += dt;
    if (this.closeupTime < REEL.adAfter) return;
    this.rolled = true;
    const ad = this.host.interruptWithAd?.() ?? null;
    if (!ad) return;
    this.child = ad;
    this.guarded(() => ad.start?.());
    if (ad.done) this.child = null;
  }

  update(dt: number, controls: Controls): void {
    if (this.done) return;
    if (this.child) {
      const ad = this.child;
      this.guarded(() => ad.update(dt, controls));
      // The press that finished the ad is the ad's: it must not also close the close-up.
      if (ad.done) this.child = null;
      return;
    }
    for (const code of controls.keys) {
      if (this.done) return;
      if (code === "KeyE") {
        if (this.inCloseup) this.finishCloseup();
        else this.openCloseup();
      } else if (!this.inCloseup && code in KEY_DIR) this.gallery = move(this.gallery, KEY_DIR[code]);
    }
    if (!this.done) this.maybeInterrupt(dt);
  }

  tapTargets(screen: { width: number; height: number }): TapTarget[] {
    if (this.child) {
      const ad = this.child;
      return this.guarded(() => ad.tapTargets?.(screen)) ?? [];
    }
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
    if (this.child) {
      const ad = this.child;
      this.guarded(() => ad.draw?.(ctx, screen));
      if (this.child) return;
    }
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
