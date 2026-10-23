import { NO_INPUT, type Controls } from "../input/controls";
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
  private readonly hud = new Hud();
  private readonly popups = new Popups();

  constructor(private readonly level: Level) {
    this.player = new Player(level.spawn.x, level.spawn.y);
    this.interaction = new InteractionSystem(level.interactables, ({ item, award }) => {
      const lines: PopupLine[] = [{ text: `+${award.points}`, color: "#ffd166", scale: 2 }];
      if (award.multiplier > 1) {
        lines.push({ text: `COMBO X${award.multiplier.toFixed(1)}`, color: "#ef476f" });
      }
      if (award.repeatFactor < 1) {
        lines.push({ text: `REPEAT X${award.repeatFactor.toFixed(2)}`, color: "#8d99ae" });
      }
      this.popups.add(item.zone.x + item.zone.w / 2, item.zone.y, lines);
    });
  }

  update(dt: number, controls: Controls): void {
    this.interaction.update(dt, this.player, controls);
    // Locked in place while a task runs.
    this.player.update(dt, this.interaction.busy ? NO_INPUT : controls, this.level.solids);
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

    ctx.fillStyle = "#2b2d42";
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // World pass, then world-space UI, then the screen-space HUD. The camera
    // (issue 010) wraps the first two and leaves the HUD alone.
    this.drawWorld(ctx, actor);
    this.drawWorldUi(ctx, actor);
    this.drawHud(ctx);
  }

  private drawWorld(ctx: CanvasRenderingContext2D, actor: Actor): void {
    for (const s of this.level.solids) {
      ctx.fillStyle = s.oneWay ? "#8d99ae" : "#4a4e69";
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffd166";
    for (const item of this.level.interactables) {
      ctx.fillRect(item.zone.x, item.zone.y, item.zone.w, item.zone.h);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ef233c";
    ctx.fillRect(actor.x, actor.y, actor.w, actor.h);
    // Eye on the facing side so direction is visible.
    ctx.fillStyle = "#edf2f4";
    ctx.fillRect(actor.x + (this.player.facing > 0 ? actor.w - 3 : 1), actor.y + 3, 2, 2);
  }

  // Coordinates here are world positions; the camera will convert them.
  private drawWorldUi(ctx: CanvasRenderingContext2D, actor: Actor): void {
    const { interaction } = this;
    if (interaction.active) {
      drawProgress(ctx, actor, interaction.active.item, interaction.progress, VIEW);
    } else if (interaction.nearby) {
      const cooldown = interaction.cooldownRemaining(interaction.nearby);
      drawPrompt(ctx, actor, interaction.nearby, cooldown, VIEW);
    }
    this.popups.draw(ctx, VIEW.width);
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
