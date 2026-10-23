import { NO_INPUT, type Controls } from "../input/controls";
import { Camera } from "../render/camera";
import { COLOR } from "../render/colors";
import { drawDialog } from "../render/dialog-box";
import { Hud } from "../render/hud";
import { Popups, type PopupLine } from "../render/popups";
import { drawText } from "../render/font";
import { STATUS_BOX } from "../render/layout";
import { drawProgress, drawPrompt } from "../render/world-ui";
import { pickVariant } from "./appearance";
import { DEBUG, DIALOG, ENERGY, TILE, VIEW } from "./config";
import { DialogRunner, type DialogNode, type DialogResult } from "./dialog";
import { DELTA } from "./direction";
import { Emitter, type GameEvents } from "./events";
import { Grid } from "./grid";
import { InteractionSystem } from "./interaction";
import type { Level } from "./level";
import { Player } from "./player";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
import type { Solid } from "./world";

// An extra thing the game updates and draws, added with `Game.addLayer`. Every
// hook is optional. Layers run in the order they were added.
//
// Each draw hook runs between its own `save()` and `restore()`, so a layer can
// change `globalAlpha`, the fill style or the transform without cleaning up.
// A layer must still balance its own `save`/`restore` calls. If it doesn't (it
// throws between them, forgets one or calls `restore` too often), the game
// puts the canvas back to a known state (the camera transform for world
// layers, the identity transform for HUD layers, `globalAlpha` 1 and
// `source-over` compositing) before the next layer, after the world pass and at
// the start of the next frame, so the damage stops there. It can't undo
// leftover entries on the canvas state stack, so an unbalanced layer is still a
// bug. A layer cannot move the camera: a translate in `drawWorld` only lasts
// for that layer (screen shake would need a camera API).
//
// A layer may remove itself or another layer from inside a hook, and it gets a
// copy of the camera position. A layer that throws is reported (with its
// `name`) and removed, so one broken feature can't stop the game. A layer added
// during a frame first runs on the next one. Adding the same layer object
// twice is ignored.
export interface Layer {
  // Shown in the log when the layer throws, so it's clear which feature broke.
  name?: string;
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
  // The apartment and character: dishes, the bed, energy and the clock.
  readonly state: ApartmentState;
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

  constructor(
    private readonly level: Level,
    state: ApartmentState = new ApartmentState(STATE_VARS),
  ) {
    this.state = state;
    this.grid = new Grid(level.size, this.activeSolids());
    this.state.onChange = (change) => this.stateChanged(change);
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
    }, this.state);
    this.interaction.onStart = (item) => {
      this.events.emit("taskStart", { item });
      if (item.dialog) this.openDialog(item.dialog);
    };
    this.dialog = new DialogRunner({
      onOpen: () => {
        this.releaseDialogLock?.();
        this.releaseDialogLock = this.lockInput();
        this.interaction.clearPressBuffer();
        this.events.emit("dialogOpen", {});
      },
      onChoose: (label, path) => this.events.emit("dialogChoose", { label, path }),
      onClose: (result) => {
        this.releaseDialogLock?.();
        this.releaseDialogLock = null;
        this.events.emit("dialogClose", result);
      },
    });
    this.interaction.onBlocked = (item, reason, message) =>
      this.events.emit("taskBlocked", { item, reason, ...(message && { message }) });
  }

  // The solids that block right now: those with no condition, or whose condition holds.
  private activeSolids(): Solid[] {
    return this.level.solids.filter((s) => !s.blockedWhen || this.state.matchesAll(s.blockedWhen));
  }

  private stateChanged(change: { id: string; value: number; previous: number }): void {
    // Doors, piles and the like may now block or not.
    if (this.level.solids.some((s) => s.blockedWhen)) this.grid.setSolids(this.activeSolids());
    this.events.emit("stateChanged", change);
    // Dropping below the tired line shows a yawn over the player.
    if (
      change.id === "energy" &&
      Math.round(change.previous) >= ENERGY.lowBelow &&
      Math.round(change.value) < ENERGY.lowBelow
    ) {
      this.popups.add(this.player.x + TILE / 2, this.player.y, [{ text: "YAWN...", color: COLOR.mist }]);
    }
  }

  // Adds an extra layer (sound, particles, toasts, lighting...). Returns a
  // function that removes it again. A layer that is already added is not added
  // a second time.
  addLayer(layer: Layer): () => void {
    if (!this.layers.includes(layer)) this.layers.push(layer);
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

  // Opens a dialog or menu. Returns false if one is already open. `onDone` is
  // called when this dialog closes, with the labels the player picked.
  openDialog(node: DialogNode, onDone?: (result: DialogResult) => void): boolean {
    return this.dialog.start(node, onDone);
  }

  update(dt: number, controls: Controls): void {
    if (this.dialog.open) {
      // The dialog has the controls. Unless the clock is set to run on, time
      // stands still while it is open (task cooldowns, the combo, and the
      // apartment's clock and energy), and the press that closes it can't also
      // start a task.
      this.dialog.update(dt, controls);
      if (!DIALOG.pauseClock) {
        this.state.tick(dt);
        this.interaction.update(dt, this.player, NO_INPUT);
      }
    } else {
      this.state.tick(dt);
      this.interaction.update(dt, this.player, this.inputLocked ? NO_INPUT : controls);
    }
    this.player.stepTimeScale = this.state.get("energy") < ENERGY.lowBelow ? ENERGY.tiredStepFactor : 1;
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

    const hardened = this.layers.some((l) => l.drawWorld || l.drawHud);
    if (hardened) resetCanvas(ctx);
    ctx.fillStyle = COLOR.night;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // The world is drawn shifted by the camera. Everything uses the same
    // whole-pixel camera offset, so nothing shimmers against anything else.
    const cam = this.camera.position(alpha);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    this.drawWorld(ctx, actor);
    this.eachLayer((layer) =>
      this.drawLayer(ctx, () => layer.drawWorld?.(ctx, { ...cam }), layer.drawWorld, cam),
    );
    ctx.restore();
    if (hardened) resetCanvas(ctx);

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
        const label = layer.name ? ` "${layer.name}"` : "";
        console.error(`A layer${label} threw and was removed`, error);
        const i = this.layers.indexOf(layer);
        if (i >= 0) this.layers.splice(i, 1);
      }
    }
  }

  // Runs one draw hook inside its own save/restore, but only if there is one.
  // It starts from a known state: the camera transform when `cam` is given
  // (world layers), otherwise the identity transform.
  private drawLayer(
    ctx: CanvasRenderingContext2D,
    draw: () => void,
    hook: unknown,
    cam?: { x: number; y: number },
  ): void {
    if (!hook) return;
    ctx.save();
    resetCanvas(ctx, cam ? -cam.x : 0, cam ? -cam.y : 0);
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

    const drawables = this.activeSolids()
      .filter((s) => !s.hidden)
      .map((s) => ({
        bottom: s.y + s.h,
        draw: () => {
          ctx.fillStyle = s.color ?? COLOR.dusk;
          ctx.fillRect(s.x, s.y, s.w, s.h);
        },
      }));
    // Objects that change with state: the variant whose rule holds right now.
    // The placeholder is a coloured block with the variant's label.
    for (const { area, variants } of this.level.appearances ?? []) {
      const variant = pickVariant(variants, this.state);
      if (!variant) continue;
      drawables.push({
        bottom: area.y + area.h,
        draw: () => {
          ctx.fillStyle = COLOR[variant.color ?? "mist"];
          ctx.fillRect(area.x, area.y, area.w, area.h);
          if (variant.label) {
            drawText(ctx, variant.label, area.x + area.w / 2, area.y + area.h / 2 - 3, {
              color: COLOR.ink,
              align: "center",
              shadow: null,
            });
          }
        },
      });
    }
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
    const popupBoxes = [...this.popups.boxes(VIEW, cam), STATUS_BOX];
    // No prompt while a dialog is open: it would only sit behind the boxes.
    if (!this.dialog.open) {
      if (interaction.active) {
        drawProgress(ctx, actor, interaction.active.item, interaction.progress, VIEW, popupBoxes);
      } else if (interaction.nearby) {
        const cooldown = interaction.cooldownRemaining(interaction.nearby);
        const unavailable = interaction.unavailableReason(interaction.nearby);
        drawPrompt(ctx, actor, interaction.nearby, cooldown, VIEW, popupBoxes, unavailable);
      }
    }
    this.popups.draw(ctx, VIEW, cam);
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    this.hud.draw(ctx, this.interaction.scoreboard, this.interaction.time, this.state);
  }
}

// The state every frame starts from: no transform (or just a translation),
// fully opaque, normal compositing.
function resetCanvas(ctx: CanvasRenderingContext2D, tx = 0, ty = 0): void {
  ctx.setTransform(1, 0, 0, 1, tx, ty);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

interface Actor {
  x: number;
  y: number;
  w: number;
  h: number;
}
