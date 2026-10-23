import { SCORING } from "../game/config";
import type { Scoreboard } from "../game/scoring";
import { drawText } from "./font";
import { HUD_BOX } from "./layout";

const PANEL = "rgba(0, 0, 0, 0.55)";
const LABEL = "#8d99ae";
const TEXT = "#edf2f4";
const GOLD = "#ffd166";

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

  draw(ctx: CanvasRenderingContext2D, scoreboard: Scoreboard, now: number): void {
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
      ctx.fillStyle = "#000000";
      ctx.fillRect(96, 33, barWidth, 2);
      ctx.fillStyle = GOLD;
      ctx.fillRect(96, 33, filled, 2);
    }
  }
}
