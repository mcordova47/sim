import { NO_INPUT, type Controls } from "../input/controls";
import { Camera } from "../render/camera";
import { COLOR } from "../render/colors";
import { Hud } from "../render/hud";
import { Popups, type PopupLine } from "../render/popups";
import { drawProgress, drawPrompt } from "../render/world-ui";
import { VIEW } from "./config";
import { InteractionSystem } from "./interaction";
import type { Level } from "./level";
import { Player } from "./player";

// The running game: owns the player, tasks, scoring and the UI built on them.
// It never touches the keyboard or the loop, so it can be driven by tests.
export class Game {
  readonly player: Player;
  readonly interaction: InteractionSystem;
  readonly camera: Camera;
  private readonly hud = new Hud();
  private readonly popups = new Popups();

  constructor(private readonly level: Level) {
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
    });
  }

  update(dt: number, controls: Controls): void {
    this.interaction.update(dt, this.player, controls);
    // Locked in place while a task runs.
    this.player.update(dt, this.interaction.busy ? NO_INPUT : controls, this.level.solids);
    this.camera.update(dt, this.playerCentre());
    this.popups.update(dt);
    this.hud.update(dt, this.interaction.scoreboard.score);
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
    ctx.restore();

    // World UI is laid out in screen space (it must stay on screen and clear
    // of the HUD), so it gets screen positions, then the HUD goes on top.
    this.drawWorldUi(ctx, { ...actor, x: actor.x - cam.x, y: actor.y - cam.y }, cam);
    this.drawHud(ctx);
  }

  private playerCentre(): { x: number; y: number } {
    return { x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2 };
  }

  private drawWorld(ctx: CanvasRenderingContext2D, actor: Actor): void {
    for (const s of this.level.solids) {
      ctx.fillStyle = s.oneWay ? COLOR.mist : COLOR.dusk;
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = COLOR.butter;
    for (const item of this.level.interactables) {
      ctx.fillRect(item.zone.x, item.zone.y, item.zone.w, item.zone.h);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLOR.brick;
    ctx.fillRect(actor.x, actor.y, actor.w, actor.h);
    // Eye on the facing side so direction is visible.
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(actor.x + (this.player.facing > 0 ? actor.w - 3 : 1), actor.y + 3, 2, 2);
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

interface Actor {
  x: number;
  y: number;
  w: number;
  h: number;
}
