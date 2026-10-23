import { ENERGY, MOOD, SCORING } from "../game/config";
import type { Scoreboard } from "../game/scoring";
import { formatClock, type ApartmentState } from "../game/state";
import { COLOR, withAlpha } from "./colors";
import { drawText } from "./font";
import { HUD_BOX, STATUS_BOX } from "./layout";

const PANEL = withAlpha(COLOR.ink, 0.6);
const LABEL = COLOR.mist;
const TEXT = COLOR.paper;
const GOLD = COLOR.butter;

// Screen-space HUD: score on the left, variety combo beside it.
export class Hud {
  // The score shown, which counts up toward the real one.
  private shown = 0;

  update(dt: number, score: number): void {
    const diff = score - this.shown;
    this.shown = Math.abs(diff) < 1 ? score : this.shown + diff * Math.min(1, dt * 10);
  }

  get displayedScore(): number {
    return Math.round(this.shown);
  }

  draw(ctx: CanvasRenderingContext2D, scoreboard: Scoreboard, now: number, state: ApartmentState): void {
    ctx.fillStyle = PANEL;
    ctx.fillRect(HUD_BOX.x + 4, HUD_BOX.y + 4, HUD_BOX.w - 8, HUD_BOX.h - 8);

    drawText(ctx, "SCORE", 8, 8, { color: LABEL });
    drawText(ctx, String(this.displayedScore), 8, 17, { color: TEXT, scale: 2 });

    const multiplier = scoreboard.multiplier(now);
    const active = multiplier > 1;
    drawText(ctx, "COMBO", 96, 8, { color: LABEL });
    drawText(ctx, `X${multiplier.toFixed(1)}`, 96, 17, {
      color: active ? GOLD : LABEL,
      scale: 2,
    });

    // Time left to keep the combo going.
    if (active) {
      const barWidth = 46;
      const filled = Math.round(barWidth * (scoreboard.comboTimeLeft(now) / SCORING.comboWindow));
      ctx.fillStyle = COLOR.ink;
      ctx.fillRect(96, 33, barWidth, 2);
      ctx.fillStyle = GOLD;
      ctx.fillRect(96, 33, filled, 2);
    }

    this.drawStatus(ctx, state);
  }

  // While an action that can be backed out of runs: how to stop it. Drawn last,
  // over a picture or dialog, in the gap between the score and the clock.
  drawStopHint(ctx: CanvasRenderingContext2D): void {
    const x = Math.round((HUD_BOX.x + HUD_BOX.w + STATUS_BOX.x) / 2);
    drawText(ctx, "ESC TO STOP", x, 3, { color: LABEL, align: "center" });
  }

  // Top right: the time of day, the energy meter and the mood meter.
  private drawStatus(ctx: CanvasRenderingContext2D, state: ApartmentState): void {
    const { x, y, w, h } = STATUS_BOX;
    ctx.fillStyle = PANEL;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

    drawText(ctx, formatClock(state.get("clock")), x + 8, 8, { color: TEXT });
    drawText(ctx, "ENERGY", x + 8, 17, { color: LABEL });

    const energy = state.get("energy");
    const barWidth = w - 16;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x + 8, 27, barWidth, 3);
    ctx.fillStyle = energy < ENERGY.lowBelow ? COLOR.brick : COLOR.leaf;
    ctx.fillRect(x + 8, 27, Math.round(barWidth * (energy / 100)), 3);

    // Mood, in the same style, below energy.
    drawText(ctx, "MOOD", x + 8, 33, { color: LABEL });
    const mood = state.has("mood") ? state.get("mood") : 0;
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x + 8, 43, barWidth, 3);
    ctx.fillStyle = mood < MOOD.lowBelow ? COLOR.brick : COLOR.butter;
    ctx.fillRect(x + 8, 43, Math.round(barWidth * (mood / 100)), 3);
  }
}
