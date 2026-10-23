import { NO_INPUT, type Controls } from "../input/controls";
import { Camera } from "../render/camera";
import { COLOR } from "../render/colors";
import { drawDialog } from "../render/dialog-box";
import { Hud } from "../render/hud";
import { Popups, type PopupLine } from "../render/popups";
import { drawProgress, drawPrompt } from "../render/world-ui";
import { DEBUG, DIALOG, TILE, VIEW } from "./config";
import { DialogRunner, type DialogNode } from "./dialog";
import { DELTA } from "./direction";
import { Emitter, type GameEvents } from "./events";
import { Grid } from "./grid";
import { InteractionSystem } from "./interaction";
import type { Level } from "./level";
import { Player } from "./player";

// An extra thing the game updates and draws, added with `Game.addLayer`. Every
// hook is optional. Layers run in the order they were added.
//
// Each draw hook runs between its own `save()` and `restore()`, so a layer can
// change `globalAlpha`, the fill style or the transform without cleaning up.
// A layer may remove itself or another layer from inside a hook, and it gets a
// copy of the camera position. A layer that throws is reported and removed, so
// one broken feature can't stop the game. A layer added during a frame first
// runs on the next one.
export interface Layer {
  update?(dt: number): void;
  // Drawn in world space, inside the camera transform, after the player.
  // `camera` is the world position of the top-left of the view.
  drawWorld?(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }): void;
  // Drawn in screen space, after the HUD.
  drawHud?(ctx: CanvasRenderingContext2D): void;
}

// The running game: owns the player, tasks, scoring and the UI built on them.
// It never touches the keyboard or the loop, so it can be driven by tests.
export class Game {
  readonly player: Player;
  readonly interaction: InteractionSystem;
  readonly camera: Camera;
  // Announces steps, bumps into things, and task starts, completions and refusals.
  readonly events = new Emitter<GameEvents>();
  private readonly hud = new Hud();
  private readonly popups = new Popups();
  private readonly layers: Layer[] = [];
  private readonly grid: Grid;
  private readonly dialog: DialogRunner;
  // Who currently has the controls (a dialog, later an activity or cutscene).
  private readonly locks = new Set<object>();
  private releaseDialogLock: (() => void) | null = null;

  constructor(private readonly level: Level) {
    this.grid = new Grid(level.size, level.solids);
    this.player = new Player(level.spawn.x, level.spawn.y, level.facing);
    this.camera = new Camera(level.size, VIEW);
    this.camera.snapTo(this.playerCentre());
    this.interaction = new InteractionSystem(level.interactables, ({ item, award }) => {
      const lines: PopupLine[] = [{ text: `+${award.points}`, color: COLOR.butter, scale: 2 }];
      if (award.multiplier > 1) {
        lines.push({ text: `COMBO X${award.multiplier.toFixed(1)}`, color: COLOR.tangerine });
      }
      if (award.repeatFactor < 1) {
        lines.push({ text: `REPEAT X${award.repeatFactor.toFixed(2)}`, color: COLOR.mist });
      }
      this.popups.add(item.zone.x + item.zone.w / 2, item.zone.y, lines);
      this.events.emit("taskComplete", { item, award });
    });
    this.interaction.onStart = (item) => {
      this.events.emit("taskStart", { item });
      if (item.dialog) this.openDialog(item.dialog);
    };
    this.dialog = new DialogRunner({
      onOpen: () => {
        this.releaseDialogLock = this.lockInput();
        this.events.emit("dialogOpen", {});
      },
      onChoose: (label, path) => this.events.emit("dialogChoose", { label, path }),
      onClose: () => {
        this.releaseDialogLock?.();
        this.releaseDialogLock = null;
        this.events.emit("dialogClose", {});
      },
    });
    this.interaction.onBlocked = (item, reason) =>
      this.events.emit("taskBlocked", { item, reason });
  }

  // Adds an extra layer (sound, particles, toasts, lighting...). Returns a
  // function that removes it again.
  addLayer(layer: Layer): () => void {
    this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  // Takes the controls away from the player and the interaction system until
  // the returned function is called (calling it more than once is harmless).
  // A dialog, an activity or a cutscene uses this so they don't each need
  // their own way to freeze the player.
  lockInput(): () => void {
    const token = {};
    this.locks.add(token);
    return () => {
      this.locks.delete(token);
    };
  }

  get inputLocked(): boolean {
    return this.locks.size > 0;
  }

  get dialogOpen(): boolean {
    return this.dialog.open;
  }

  // Opens a dialog or menu. Returns false if one is already open.
  openDialog(node: DialogNode): boolean {
    return this.dialog.start(node);
  }

  update(dt: number, controls: Controls): void {
    if (this.dialog.open) {
      // The dialog has the controls. Unless the clock is set to run on, time
      // for tasks (cooldowns, the combo) stands still while it is open, and the
      // press that closes it can't also start a task.
      this.dialog.update(dt, controls);
      if (!DIALOG.pauseClock) this.interaction.update(dt, this.player, NO_INPUT);
    } else {
      this.interaction.update(dt, this.player, this.inputLocked ? NO_INPUT : controls);
    }
    // Locked in place while a task runs or something else has the controls.
    const walking = !this.inputLocked && !this.interaction.busy;
    this.player.update(dt, walking ? controls : NO_INPUT, this.grid);
    if (this.player.arrivedThisUpdate) this.events.emit("step", this.player.arrivedThisUpdate);
    if (this.player.bumpedThisUpdate) this.events.emit("bump", this.player.bumpedThisUpdate);
    this.camera.update(dt, this.playerCentre());
    this.popups.update(dt);
    this.hud.update(dt, this.interaction.scoreboard.score);
    this.eachLayer((layer) => layer.update?.(dt));
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    // Interpolate between the last two simulation states for smooth motion.
    const { player } = this;
    const actor = {
      x: Math.round(player.prevX + (player.x - player.prevX) * alpha),
      y: Math.round(player.prevY + (player.y - player.prevY) * alpha),
      w: player.w,
      h: player.h,
    };

    ctx.fillStyle = COLOR.night;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // The world is drawn shifted by the camera. Everything uses the same
    // whole-pixel camera offset, so nothing shimmers against anything else.
    const cam = this.camera.position(alpha);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    this.drawWorld(ctx, actor);
    this.eachLayer((layer) => this.drawLayer(ctx, () => layer.drawWorld?.(ctx, { ...cam }), layer.drawWorld));
    ctx.restore();

    // World UI is laid out in screen space (it must stay on screen and clear
    // of the HUD), so it gets screen positions, then the HUD goes on top.
    this.drawWorldUi(ctx, { ...actor, x: actor.x - cam.x, y: actor.y - cam.y }, cam);
    this.drawHud(ctx);
    const dialogView = this.dialog.view;
    if (dialogView) drawDialog(ctx, dialogView);
    this.eachLayer((layer) => this.drawLayer(ctx, () => layer.drawHud?.(ctx), layer.drawHud));
  }

  // Runs `fn` for each layer, in order. It works on a snapshot, so layers can
  // add or remove layers (including themselves) while it runs without anyone
  // being skipped or called twice; a layer removed earlier in the pass is not
  // called. A layer that throws is reported and removed.
  private eachLayer(fn: (layer: Layer) => void): void {
    for (const layer of [...this.layers]) {
      if (!this.layers.includes(layer)) continue;
      try {
        fn(layer);
      } catch (error) {
        console.error("A layer threw and was removed", error);
        const i = this.layers.indexOf(layer);
        if (i >= 0) this.layers.splice(i, 1);
      }
    }
  }

  // Runs one draw hook inside its own save/restore, but only if there is one.
  private drawLayer(ctx: CanvasRenderingContext2D, draw: () => void, hook: unknown): void {
    if (!hook) return;
    ctx.save();
    try {
      draw();
    } finally {
      ctx.restore();
    }
  }

  private playerCentre(): { x: number; y: number } {
    return { x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2 };
  }

  // The floor, then walls, furniture and the player ordered by how far down
  // the screen their bottom edge is, so whatever is nearer the viewer is drawn
  // in front. These are placeholder rectangles until there is art. Task zones
  // only show in debug.
  private drawWorld(ctx: CanvasRenderingContext2D, actor: Actor): void {
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        ctx.fillStyle = (col + row) % 2 === 0 ? COLOR.night : COLOR.slate;
        ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
      }
    }

    const drawables = this.level.solids.map((s) => ({
      bottom: s.y + s.h,
      draw: () => {
        ctx.fillStyle = s.color ?? COLOR.dusk;
        ctx.fillRect(s.x, s.y, s.w, s.h);
      },
    }));
    drawables.push({ bottom: actor.y + actor.h, draw: () => this.drawPlayer(ctx, actor) });
    // The sort is stable, so on a tie the player (added last) is in front.
    drawables.sort((a, b) => a.bottom - b.bottom);
    for (const d of drawables) d.draw();

    if (DEBUG.zones) {
      ctx.strokeStyle = COLOR.butter;
      for (const item of this.level.interactables) {
        const z = item.zone;
        ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
      }
    }
  }

  // A rectangle with a small mark on the side it is facing.
  private drawPlayer(ctx: CanvasRenderingContext2D, actor: Actor): void {
    ctx.fillStyle = COLOR.brick;
    ctx.fillRect(actor.x, actor.y, actor.w, actor.h);
    const { dc, dr } = DELTA[this.player.facing];
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(actor.x + 6 + dc * 5, actor.y + 6 + dr * 5, 4, 4);
  }

  // `actor` is in screen coordinates; `cam` is the world position of the
  // top-left of the view, for things (popups) that live at world positions.
  private drawWorldUi(
    ctx: CanvasRenderingContext2D,
    actor: Actor,
    cam: { x: number; y: number },
  ): void {
    const { interaction } = this;
    // Labels keep clear of any popup that is still floating up.
    const popupBoxes = this.popups.boxes(VIEW, cam);
    // No prompt while a dialog is open: it would only sit behind the boxes.
    if (!this.dialog.open) {
      if (interaction.active) {
        drawProgress(ctx, actor, interaction.active.item, interaction.progress, VIEW, popupBoxes);
      } else if (interaction.nearby) {
        const cooldown = interaction.cooldownRemaining(interaction.nearby);
        drawPrompt(ctx, actor, interaction.nearby, cooldown, VIEW, popupBoxes);
      }
    }
    this.popups.draw(ctx, VIEW, cam);
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    this.hud.draw(ctx, this.interaction.scoreboard, this.interaction.time);
  }
}

interface Actor {
  x: number;
  y: number;
  w: number;
  h: number;
}
