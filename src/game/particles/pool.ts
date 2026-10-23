import { PARTICLES, PARTICLE_SHAPES, type ParticleKind, type Range } from "../config";
import { paletteColor } from "../../render/colors";

// One particle's numbers, set again each time its slot is reused.
export interface Particle {
  alive: boolean;
  // Counts up with every spawn, so the oldest live particle has the lowest.
  seq: number;
  // Where it is, in world pixels (not whole numbers; drawing rounds them).
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  age: number;
  life: number;
  swayAmp: number;
  swayHz: number;
  swayPhase: number;
  fadeFrom: number;
  shape: string;
  // A palette name.
  color: string;
}

export interface Spawn {
  x: number;
  y: number;
  kind: ParticleKind;
  // Replaces the kind's colors for this one (a burst of confetti).
  color?: string;
  // Scales the kind's speeds (a duller, smaller burst).
  speed?: number;
}

const between = ([lo, hi]: Range, random: () => number) => lo + (hi - lo) * random();

// The shapes as lists of pixel offsets, worked out once.
const SHAPE_PIXELS = new Map<string, { x: number; y: number }[]>();
function pixelsOf(shape: string): { x: number; y: number }[] {
  let pixels = SHAPE_PIXELS.get(shape);
  if (!pixels) {
    const rows = PARTICLE_SHAPES[shape];
    if (!rows) throw new Error(`Particle shape "${shape}" is not in PARTICLE_SHAPES`);
    const found: { x: number; y: number }[] = [];
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === "#") found.push({ x, y });
      }),
    );
    SHAPE_PIXELS.set(shape, found);
    pixels = found;
  }
  return pixels;
}

// How opaque a particle is at `age`: 1 until `fadeFrom` of its life has gone,
// then stepping down through `PARTICLES.fadeSteps` levels (never fully
// see-through while alive). Steps rather than a smooth fade, to keep the pixel look.
export function alphaAt(age: number, life: number, fadeFrom: number): number {
  if (fadeFrom >= 1 || life <= 0) return 1;
  const t = age / life;
  if (t <= fadeFrom) return 1;
  const stage = Math.min(PARTICLES.fadeSteps - 1, Math.floor(((t - fadeFrom) / (1 - fadeFrom)) * PARTICLES.fadeSteps));
  return 1 - stage / PARTICLES.fadeSteps;
}

const HEX = new Map<string, string>();
function hexOf(name: string): string {
  let hex = HEX.get(name);
  if (!hex) {
    hex = paletteColor(name);
    HEX.set(name, hex);
  }
  return hex;
}

// A fixed number of particles that are reused, so nothing grows over time and
// nothing is allocated while playing. The simulation is plain code: it knows
// about time passing and nothing about the game.
export class ParticlePool {
  private readonly slots: Particle[];
  private seq = 0;
  private live = 0;

  constructor(
    readonly capacity: number = PARTICLES.budget,
    private readonly random: () => number = Math.random,
  ) {
    this.slots = Array.from({ length: capacity }, () => ({
      alive: false, seq: 0, x: 0, y: 0, vx: 0, vy: 0, gravity: 0, drag: 0, age: 0, life: 1,
      swayAmp: 0, swayHz: 0, swayPhase: 0, fadeFrom: 1, shape: "dot", color: "paper",
    }));
  }

  get count(): number {
    return this.live;
  }

  // The live particles (for tests).
  *particles(): IterableIterator<Particle> {
    for (const p of this.slots) if (p.alive) yield p;
  }

  clear(): void {
    for (const p of this.slots) p.alive = false;
    this.live = 0;
  }

  // Adds a particle. With none free, it replaces the oldest one.
  spawn({ x, y, kind, color, speed = 1 }: Spawn): void {
    const r = this.random;
    let slot: Particle | undefined;
    let oldest: Particle | undefined;
    for (const p of this.slots) {
      if (!p.alive) {
        slot = p;
        break;
      }
      if (!oldest || p.seq < oldest.seq) oldest = p;
    }
    slot ??= oldest;
    if (!slot) return; // a pool with no room at all
    if (!slot.alive) this.live++;
    slot.alive = true;
    slot.seq = ++this.seq;
    slot.x = x;
    slot.y = y;
    slot.vx = between(kind.vx, r) * speed;
    slot.vy = between(kind.vy, r) * speed;
    slot.gravity = kind.gravity;
    slot.drag = kind.drag;
    slot.age = 0;
    slot.life = Math.max(0.01, between(kind.life, r));
    slot.swayAmp = kind.sway?.amp ?? 0;
    slot.swayHz = kind.sway?.hz ?? 0;
    slot.swayPhase = r() * Math.PI * 2;
    slot.fadeFrom = kind.fadeFrom;
    slot.shape = kind.shape;
    slot.color = color ?? kind.colors[Math.min(kind.colors.length - 1, Math.floor(r() * kind.colors.length))];
  }

  update(dt: number): void {
    if (!(dt > 0)) return;
    for (const p of this.slots) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        this.live--;
        continue;
      }
      const keep = Math.max(0, 1 - p.drag * dt);
      p.vx *= keep;
      p.vy = p.vy * keep + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  // Draws every live particle where it is in the world: the caller has already
  // set the camera transform. Each pixel of a shape is a whole-pixel square at a
  // whole-pixel position. It leaves `globalAlpha` as it found it.
  draw(ctx: CanvasRenderingContext2D): void {
    const before = ctx.globalAlpha;
    for (const p of this.slots) {
      if (!p.alive) continue;
      ctx.globalAlpha = before * alphaAt(p.age, p.life, p.fadeFrom);
      ctx.fillStyle = hexOf(p.color);
      const sway = p.swayAmp ? p.swayAmp * Math.sin(p.swayPhase + p.age * p.swayHz * Math.PI * 2) : 0;
      const ox = Math.round(p.x + sway);
      const oy = Math.round(p.y);
      for (const px of pixelsOf(p.shape)) ctx.fillRect(ox + px.x, oy + px.y, 1, 1);
    }
    ctx.globalAlpha = before;
  }
}
