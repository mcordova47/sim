import { NO_INPUT, type Controls } from "../input/controls";
import { Camera } from "../render/camera";
import { COLOR } from "../render/colors";
import { Hud } from "../render/hud";
import { Popups, type PopupLine } from "../render/popups";
import { drawProgress, drawPrompt } from "../render/world-ui";
import { PlayerAnimator } from "../render/player-sprite";
import { drawPlayer, drawScene } from "../render/scene";
import type { SpriteDrawer } from "../render/sprites";
import { DEBUG, EVENTS, VIEW } from "./config";
import { Emitter, type GameEvents } from "./events";
import { InteractionSystem } from "./interaction";
import type { Level } from "./level";
import { Player } from "./player";

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
  // Announces jumps, landings and task starts, completions and refusals.
  readonly events = new Emitter<GameEvents>();
  private readonly hud = new Hud();
  private readonly popups = new Popups();
  private readonly animator = new PlayerAnimator();
  private readonly layers: Layer[] = [];

  // Without sprites (tests, or art not loaded) the level is drawn as plain rectangles.
  constructor(
    private readonly level: Level,
    private readonly sprites?: SpriteDrawer,
  ) {
    this.player = new Player(level.spawn.x, level.spawn.y);
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
    this.interaction.onStart = (item) => this.events.emit("taskStart", { item });
    this.interaction.onBlocked = (item, reason) =>
      this.events.emit("taskBlocked", { item, reason });
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

  update(dt: number, controls: Controls): void {
    this.interaction.update(dt, this.player, controls);
    // Locked in place while a task runs.
    this.player.update(dt, this.interaction.busy ? NO_INPUT : controls, this.level.solids);
    this.animator.update(dt, this.poseState());
    if (this.player.jumpedThisUpdate) this.events.emit("jump", {});
    if (this.player.landingSpeed >= EVENTS.minLandSpeed) {
      this.events.emit("land", { speed: this.player.landingSpeed });
    }
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

  private poseState() {
    const { player } = this;
    return { grounded: player.grounded, vx: player.vx, vy: player.vy, busy: !!this.interaction.busy };
  }

  // Back to front: walls, decor, furniture, player. Task zones only show in debug.
  private drawWorld(ctx: CanvasRenderingContext2D, actor: Actor): void {
    const { sprites } = this;
    const { scene } = this.level;
    if (sprites && scene) {
      drawScene(ctx, scene, sprites);
    } else {
      for (const s of this.level.solids) {
        ctx.fillStyle = s.oneWay ? COLOR.mist : COLOR.dusk;
        ctx.fillRect(s.x, s.y, s.w, s.h);
      }
    }

    if (DEBUG.zones) {
      ctx.strokeStyle = COLOR.butter;
      for (const item of this.level.interactables) {
        const z = item.zone;
        ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
      }
    }

    if (sprites) {
      const frame = this.animator.frame(this.poseState());
      drawPlayer(ctx, sprites, frame, actor.x, actor.y, this.player.facing);
    } else {
      ctx.fillStyle = COLOR.brick;
      ctx.fillRect(actor.x, actor.y, actor.w, actor.h);
    }
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
    if (interaction.active) {
      drawProgress(ctx, actor, interaction.active.item, interaction.progress, VIEW, popupBoxes);
    } else if (interaction.nearby) {
      const cooldown = interaction.cooldownRemaining(interaction.nearby);
      drawPrompt(ctx, actor, interaction.nearby, cooldown, VIEW, popupBoxes);
    }
    this.popups.draw(ctx, VIEW, cam);
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    this.hud.draw(ctx, this.interaction.scoreboard, this.interaction.time);
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
