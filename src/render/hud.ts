import { ENERGY, HUD, MOOD, SCORING, VIEW } from "../game/config";
import type { Scoreboard } from "../game/scoring";
import { formatClockShort, type ApartmentState } from "../game/state";
import { COLOR, withAlpha } from "./colors";
import { drawText, GLYPH_H, textWidth } from "./font";
import { COMBO_TEXT, CLOCK_FIELD, hudChips, setScoreDigits } from "./layout";
import type { SpriteDrawer } from "./sprites";

const PANEL = withAlpha(COLOR.ink, 0.6);
const LABEL = COLOR.mist;
const TEXT = COLOR.paper;
const GOLD = COLOR.butter;

export const HUD_ICONS = {
  star: "icon-star",
  sun: "icon-sun",
  dusk: "icon-dusk",
  moon: "icon-moon",
  bolt: "icon-bolt",
  boltLow: "icon-bolt-low",
  happy: "icon-face-happy",
  flat: "icon-face-flat",
  sad: "icon-face-sad",
} as const;
export type HudIcon = (typeof HUD_ICONS)[keyof typeof HUD_ICONS];

// Every icon the ribbon can draw, for loading.
export const HUD_ICON_NAMES: string[] = Object.values(HUD_ICONS);

// What is drawn in an icon's place until its sprite has loaded.
const FALLBACK: Record<HudIcon, { text: string; color: string }> = {
  "icon-star": { text: "*", color: COLOR.butter },
  "icon-sun": { text: "D", color: COLOR.butter },
  "icon-dusk": { text: "D", color: COLOR.tangerine },
  "icon-moon": { text: "N", color: COLOR.paper },
  "icon-bolt": { text: "E", color: COLOR.butter },
  "icon-bolt-low": { text: "E", color: COLOR.brick },
  "icon-face-happy": { text: "M", color: COLOR.butter },
  "icon-face-flat": { text: "M", color: COLOR.butter },
  "icon-face-sad": { text: "M", color: COLOR.tangerine },
};

// The sun by day, the dusk icon at dawn and dusk, the moon at night.
export function timeIcon(hours: number): HudIcon {
  const h = ((hours % 24) + 24) % 24;
  if (h >= HUD.sunFrom && h < HUD.sunUntil) return HUD_ICONS.sun;
  if ((h >= HUD.dawnFrom && h < HUD.sunFrom) || (h >= HUD.sunUntil && h < HUD.duskUntil)) return HUD_ICONS.dusk;
  return HUD_ICONS.moon;
}

// The phone battery indicator (issues 088 and 094): how many of its four segments are lit (one per
// quarter, rounded up, so any charge at all lights one) and the colour they are drawn in.
export const batterySegments = (level: number): number =>
  Math.min(HUD.batterySegments, Math.max(0, Math.ceil(Math.min(Math.max(level, 0), 100) / (100 / HUD.batterySegments))));

export const batteryColor = (level: number): string =>
  level < HUD.phoneLowBelow ? COLOR.brick : level > HUD.phoneHighAbove ? COLOR.leaf : COLOR.tangerine;

// A small bolt, 3 x 5, as the pixels that are on (x, y).
const BOLT: [number, number][] = [[2, 0], [1, 1], [0, 2], [1, 2], [2, 2], [1, 3], [0, 4]];

export const energyIcon = (energy: number): HudIcon => (energy < ENERGY.lowBelow ? HUD_ICONS.boltLow : HUD_ICONS.bolt);

export function moodIcon(mood: number): HudIcon {
  if (mood < MOOD.lowBelow) return HUD_ICONS.sad;
  return mood >= HUD.happyFrom ? HUD_ICONS.happy : HUD_ICONS.flat;
}

// Screen-space HUD: a ribbon of two chips in the free top band of the picture. Left: score and
// variety combo. Right: the clock with a sun, dusk or moon, and energy and mood, each an icon with
// a small bar. Nothing is drawn below `HUD.band`.
export class Hud {
  // The score shown, which counts up toward the real one.
  private shown = 0;
  // The battery last seen, and the seconds left of showing the plug after it rose (issue 088).
  private lastBattery: number | null = null;
  private plugLeft = 0;

  update(dt: number, score: number): void {
    this.plugLeft = Math.max(0, this.plugLeft - dt);
    const diff = score - this.shown;
    this.shown = Math.abs(diff) < 1 ? score : this.shown + diff * Math.min(1, dt * 10);
    setScoreDigits(String(this.displayedScore).length);
  }

  get displayedScore(): number {
    return Math.round(this.shown);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    scoreboard: Scoreboard,
    now: number,
    state: ApartmentState,
    sprites?: SpriteDrawer,
  ): void {
    const digits = String(this.displayedScore).length;
    setScoreDigits(digits);
    const chips = hudChips(VIEW, digits);
    const rowY = chips.left.y + Math.floor((chips.left.h - HUD.iconSize) / 2);

    const icon = (name: HudIcon, x: number): void => {
      if (sprites?.has(name)) sprites.draw(ctx, name, x, rowY);
      else drawText(ctx, FALLBACK[name].text, x + 1, rowY, { color: FALLBACK[name].color });
    };

    // Left chip: star, score, combo with the time left on its chain.
    ctx.fillStyle = PANEL;
    ctx.fillRect(chips.left.x, chips.left.y, chips.left.w, chips.left.h);
    let x = chips.left.x + HUD.pad;
    icon(HUD_ICONS.star, x);
    x += HUD.iconSize + HUD.iconGap;
    drawText(ctx, String(this.displayedScore), x, rowY, { color: TEXT });
    x += textWidth("8".repeat(Math.max(digits, HUD.scoreDigits))) + HUD.groupGap;

    const multiplier = scoreboard.multiplier(now);
    const active = multiplier > 1;
    drawText(ctx, `X${multiplier.toFixed(1)}`, x, rowY, { color: active ? GOLD : LABEL });
    if (active) {
      const barWidth = textWidth(COMBO_TEXT);
      const filled = Math.round(barWidth * (scoreboard.comboTimeLeft(now) / SCORING.comboWindow));
      const barY = rowY + HUD.iconSize + 1;
      ctx.fillStyle = COLOR.ink;
      ctx.fillRect(x, barY, barWidth, 2);
      ctx.fillStyle = GOLD;
      ctx.fillRect(x, barY, filled, 2);
    }

    // Right chip: clock, energy, mood.
    const energy = state.get("energy");
    const mood = state.has("mood") ? state.get("mood") : 0;
    const clock = state.get("clock");
    ctx.fillStyle = PANEL;
    ctx.fillRect(chips.right.x, chips.right.y, chips.right.w, chips.right.h);
    x = chips.right.x + HUD.pad;
    icon(timeIcon(clock), x);
    x += HUD.iconSize + HUD.iconGap;
    drawText(ctx, formatClockShort(clock), x, rowY, { color: TEXT });
    x += textWidth(CLOCK_FIELD);

    const meter = (name: HudIcon, value: number, color: string, width = HUD.barWidth): void => {
      x += HUD.groupGap;
      icon(name, x);
      x += HUD.iconSize + HUD.iconGap;
      const barY = rowY + Math.floor((HUD.iconSize - HUD.barHeight) / 2);
      ctx.fillStyle = COLOR.ink;
      ctx.fillRect(x, barY, width, HUD.barHeight);
      ctx.fillStyle = color;
      ctx.fillRect(x, barY, Math.round(width * (Math.min(Math.max(value, 0), 100) / 100)), HUD.barHeight);
      x += width;
    };
    meter(energyIcon(energy), energy, energy < ENERGY.lowBelow ? COLOR.brick : COLOR.leaf);
    meter(moodIcon(mood), mood, mood < MOOD.lowBelow ? COLOR.brick : COLOR.butter);
    // The phone battery: an outline with a nub and four segments filling from the left, and a bolt
    // over it for a few seconds after the level goes up. A state without the variable (an old
    // custom room) shows an empty battery.
    const battery = state.has("battery") ? state.get("battery") : 0;
    if (this.lastBattery !== null && battery > this.lastBattery) this.plugLeft = HUD.plugSeconds;
    this.lastBattery = battery;
    x += HUD.groupGap;
    const top = rowY + Math.floor((HUD.iconSize - HUD.batteryHeight) / 2);
    const w = HUD.batteryBodyWidth;
    ctx.fillStyle = TEXT;
    ctx.fillRect(x, top, w, HUD.batteryHeight);
    ctx.fillRect(x + w, top + Math.floor((HUD.batteryHeight - HUD.batteryNubHeight) / 2), 1, HUD.batteryNubHeight);
    ctx.fillStyle = COLOR.ink;
    ctx.fillRect(x + 1, top + 1, w - 2, HUD.batteryHeight - 2);
    ctx.fillStyle = batteryColor(battery);
    for (let i = 0; i < batterySegments(battery); i++) ctx.fillRect(x + 1 + i * 3, top + 1, 2, HUD.batteryHeight - 2);
    if (this.plugLeft > 0) {
      ctx.fillStyle = GOLD;
      for (const [bx, by] of BOLT) ctx.fillRect(x + 5 + bx, top + 1 + by, 1, 1);
    }
  }

  // While an action that can be backed out of runs: how to stop it. Drawn last, over a picture or
  // dialog. It sits in the gap between the two chips when the words fit there (the desktop view),
  // and otherwise on a line just under them (the narrow view), so it is never on a chip.
  drawStopHint(ctx: CanvasRenderingContext2D): void {
    drawText(ctx, STOP_HINT, ...stopHintAt(VIEW), { color: LABEL, align: "center" });
  }
}

export const STOP_HINT = "ESC TO STOP";

// Where the stop hint's centre-top goes in a view of this width, with the score at `digits`.
export function stopHintAt(view: { width: number }, digits?: number): [number, number] {
  const { left, right } = hudChips(view, digits);
  const gapLeft = left.x + left.w;
  const centre = Math.round((gapLeft + right.x) / 2);
  const half = textWidth(STOP_HINT) / 2;
  const fits = centre - half >= gapLeft + 2 && centre + half + 1 <= right.x - 2;
  return fits ? [centre, 3] : [Math.round(view.width / 2), left.y + left.h + 2];
}

// The lowest y the ribbon uses in a view, counting the stop hint when it sits on its own line under
// the chips (narrow view). Toasts start under this, so they never cover the hint.
export function ribbonBottom(view: { width: number }): number {
  const chips = hudChips(view);
  const chipBottom = chips.left.y + chips.left.h;
  const [, hintY] = stopHintAt(view);
  return hintY >= chipBottom ? hintY + GLYPH_H + 1 : chipBottom;
}
