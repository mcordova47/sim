import { GLYPH_H, textWidth } from "../../render/font";
import { GOOD_HOUR_ICON_SIZE } from "../../render/world-ui";
import { ENERGY, PARTICLES, SOUND, type Range } from "../config";
import type { Award } from "../scoring";
import type { ParticlePool } from "./pool";

// What to make for each kind of moment, as plain functions of game values, so
// they can be tested and tuned in config.ts without a canvas or a game.

export function kindOf(name: string) {
  const kind = PARTICLES.kinds[name];
  if (!kind) throw new Error(`Particle kind "${name}" is not in PARTICLES.kinds`);
  return kind;
}

// A whole number in the range, both ends included.
export function countIn([lo, hi]: Range, random: () => number): number {
  return Math.round(lo + (hi - lo) * random());
}

// Makes `count` particles of a kind, each up to `spread` pixels away from (x, y)
// on each axis (a number, or one for each axis).
export function puff(
  pool: ParticlePool,
  random: () => number,
  kind: string,
  x: number,
  y: number,
  count: number,
  spread: number | { x: number; y: number } = 0,
  color?: string,
): void {
  const def = kindOf(kind);
  const sx = typeof spread === "number" ? spread : spread.x;
  const sy = typeof spread === "number" ? spread : spread.y;
  for (let i = 0; i < count; i++) {
    pool.spawn({ x: x + (random() * 2 - 1) * sx, y: y + (random() * 2 - 1) * sy, kind: def, color });
  }
}

// The floor a room has, by room id (the one the footsteps use).
export function floorOf(room: string): string {
  return SOUND.floors[room] ?? SOUND.defaultFloor;
}

// The dust for a step on a floor, or null for none: tile makes none, and nothing
// is kicked up by someone too tired to lift their feet.
export function stepDust(floor: string, energy: number): { kind: string; count: Range } | null {
  if (energy < ENERGY.lowBelow) return null;
  return PARTICLES.step.puffs[floor] ?? null;
}

export interface BurstPlan {
  kind: string;
  count: number;
  // One of these for each particle, picked at random.
  colors: string[];
  // Scale on the kind's speeds.
  speed: number;
}

// The burst for a completed task. It grows with the variety chain (the number of
// different tasks in a row): more squares, then more colors, until a chain of
// three or more is a spray of palette confetti. A repeat that paid less is small
// and dull instead, and the dullness wins over the chain.
export function burstPlan(award: Pick<Award, "chain" | "repeatFactor">): BurstPlan {
  const b = PARTICLES.burst;
  const chain = Math.max(1, Math.floor(award.chain));
  const full = Math.min(b.max, b.base + b.perChain * (chain - 1));
  if (award.repeatFactor < 1) {
    const dull = PARTICLES.kinds[b.repeat.kind];
    return {
      kind: b.repeat.kind,
      count: Math.max(b.repeat.minCount, Math.min(full, Math.round(full * award.repeatFactor))),
      colors: dull.colors,
      speed: 1,
    };
  }
  return {
    kind: b.kind,
    count: full,
    colors: b.colors[Math.min(b.colors.length, chain) - 1],
    speed: 1,
  };
}

// Sets off a burst over a rectangle (the task's zone): the squares start
// somewhere in it and fly up and out.
export function burst(
  pool: ParticlePool,
  random: () => number,
  plan: BurstPlan,
  area: { x: number; y: number; w: number; h: number },
): void {
  const kind = kindOf(plan.kind);
  for (let i = 0; i < plan.count; i++) {
    pool.spawn({
      x: area.x + random() * area.w,
      y: area.y + random() * area.h,
      kind,
      color: plan.colors[Math.min(plan.colors.length - 1, Math.floor(random() * plan.colors.length))],
      speed: plan.speed,
    });
  }
}

// Where the clock icon sits in the award popup for a completed task, measured
// from the middle of the top of the task's zone (where the popup starts).
export function popupIconSpot(award: Pick<Award, "multiplier" | "repeatFactor" | "qualityFactor" | "timeFactor">): {
  dx: number;
  dy: number;
} {
  const gap = PARTICLES.sparkle.lineGap;
  // The lines above the icon: the amount (drawn at twice the size), then those that apply.
  let smallLines = 0;
  if (award.multiplier > 1) smallLines++;
  if (award.repeatFactor < 1) smallLines++;
  if (Math.abs(award.qualityFactor - 1) > 0.005) smallLines++;
  const dy = GLYPH_H * 2 + gap + smallLines * (GLYPH_H + gap) + GOOD_HOUR_ICON_SIZE / 2;
  // The icon line is centred, with the icon at its left end.
  const lineWidth = GOOD_HOUR_ICON_SIZE + 2 + textWidth(`X${award.timeFactor.toFixed(1)}`);
  return { dx: -lineWidth / 2 + GOOD_HOUR_ICON_SIZE / 2, dy };
}
