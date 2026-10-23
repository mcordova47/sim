import {
  DIALOG,
  MOOD,
  PARTICLES,
  PLANT,
  TILE,
  type AmbientWhen,
  type EmitterAnchor,
  type EmitterDef,
  type Range,
} from "../config";
import { DELTA } from "../direction";
import type { Game, Layer } from "../game";
import type { Interactable } from "../interactable";
import { POSES } from "../poses";
import { boundsOf } from "../world";
import { burst, burstPlan, countIn, floorOf, popupIconSpot, puff, stepDust } from "./effects";
import { ParticlePool } from "./pool";

export interface ParticlesOptions {
  // A number from 0 up to 1. Math.random by default; tests pass a seeded one.
  random?: () => number;
  // Whether a record is playing right now (the notes from the record player).
  // Without it there are no notes: this feature does not know about sound.
  musicPlaying?: () => boolean;
  // How many particles can be alive at once.
  capacity?: number;
}

const between = ([lo, hi]: Range, random: () => number) => lo + (hi - lo) * random();

// Small effects that make the game feel good: dust under your feet, confetti
// when a task is done, steam, bubbles, a drifting z, music notes and a sigh. It
// listens to the game's events, and each frame looks at the running task and a
// few state values for the effects that carry on (all of them are data in
// config.ts). It draws in the world pass, after the player and after whatever
// layers were added before it, so with the time of day added first the
// particles are not tinted: sparkles stay bright at night. Nothing in the game
// imports it; removing its line from features.ts removes it all.
export class ParticlesFeature implements Layer {
  readonly name = "particles";
  readonly pool: ParticlePool;
  private readonly random: () => number;
  // Seconds until each active emitter makes its next puff.
  private readonly timers = new Map<EmitterDef, number>();

  constructor(
    private readonly game: Game,
    private readonly options: ParticlesOptions = {},
  ) {
    this.random = options.random ?? Math.random;
    this.pool = new ParticlePool(options.capacity ?? PARTICLES.budget, this.random);
    const { events } = game;

    events.on("step", ({ col, row, direction }) => {
      const { state } = game;
      const dust = stepDust(floorOf(game.currentLevel.id ?? ""), state.has("energy") ? state.get("energy") : 100);
      if (!dust) return;
      // The dust is kicked up where the foot pushed off: the tile just left.
      const d = DELTA[direction];
      puff(
        this.pool,
        this.random,
        dust.kind,
        (col - d.dc) * TILE + TILE / 2,
        (row - d.dr) * TILE + PARTICLES.step.footY,
        countIn(dust.count, this.random),
        2,
      );
    });

    events.on("bump", ({ direction }) => {
      // Where the player's tile meets the wall.
      const d = DELTA[direction];
      const x = game.player.col * TILE + TILE / 2 + d.dc * (TILE / 2);
      const y = game.player.row * TILE + TILE / 2 + d.dr * (TILE / 2);
      puff(this.pool, this.random, PARTICLES.bump.kind, x, y, countIn(PARTICLES.bump.count, this.random), 2);
    });

    events.on("taskComplete", ({ item, award }) => {
      const zone = boundsOf(item.zones);
      burst(this.pool, this.random, burstPlan(award), zone);
      // The good hour clock in the popup: sparkles around it.
      if (award.timeFactor > 1) {
        const s = PARTICLES.sparkle;
        const spot = popupIconSpot(award);
        const n = countIn(s.count, this.random);
        puff(this.pool, this.random, s.kind, zone.x + zone.w / 2 + spot.dx, zone.y + spot.dy, n, { x: s.spreadX, y: s.spreadY });
      }
    });

    // Mood dropping below the low line: the same moment as the "SIGH..." popup.
    events.on("stateChanged", ({ id, value, previous }) => {
      if (id !== "mood" || previous < MOOD.lowBelow || value >= MOOD.lowBelow) return;
      const s = PARTICLES.sigh;
      puff(this.pool, this.random, s.kind, game.player.x + s.dx, game.player.y + s.dy, countIn(s.count, this.random), s.spread);
    });

    // The plant grew a stage, or came back from drooping (issue 063): a few
    // green and pale bits drift up from it. Only drawn in the room it is in.
    events.on("stateChanged", ({ id, value, previous }) => {
      const grew = id === "plantStage" && value > previous;
      const perked = id === "plantDry" && previous >= PLANT.droopAfterHours && value < PLANT.droopAfterHours;
      if (!grew && !perked) return;
      const g = PARTICLES.plantGrow;
      const at = this.anchor(g.at, null);
      if (at) puff(this.pool, this.random, g.kind, at.x, at.y, countIn(g.count, this.random), g.spread);
    });

    // Particles belong to the room they were made in.
    events.on("room", () => {
      this.pool.clear();
      this.timers.clear();
    });

    game.addLayer(this);
  }

  // True while the game is standing still (a dialog is open and time stops with
  // it, or something else, like the achievements list, has the controls): the
  // particles stop as well, like the popups do.
  private get paused(): boolean {
    const { game } = this;
    if (game.dialogOpen) return DIALOG.pauseClock;
    return game.inputLocked && !game.interaction.busy;
  }

  update(dt: number): void {
    if (this.paused) return;
    this.emitAll(dt);
    this.pool.update(dt);
  }

  drawWorld(ctx: CanvasRenderingContext2D): void {
    this.pool.draw(ctx);
  }

  // The effects that carry on, while they apply: the running task's, then the ambient ones.
  private emitAll(dt: number): void {
    const { game } = this;
    const active = game.interaction.active?.item ?? null;
    const running = new Set<EmitterDef>();
    for (const def of (active && PARTICLES.taskEmitters[active.id]) || []) running.add(def);
    for (const { when, emitter } of PARTICLES.ambientEmitters) if (this.holds(when)) running.add(emitter);

    // One that stopped applying forgets its timer, so it starts with a puff next time.
    for (const def of [...this.timers.keys()]) if (!running.has(def)) this.timers.delete(def);

    for (const def of running) {
      let left = (this.timers.get(def) ?? 0) - dt;
      // At most a few puffs in one update, however long the update was.
      for (let n = 0; left <= 0 && n < 3; n++) {
        this.emitFrom(def, active);
        left += between(def.every, this.random);
      }
      this.timers.set(def, Math.max(left, 0));
    }
  }

  private holds(when: AmbientWhen): boolean {
    const { game } = this;
    if (when.music && !this.options.musicPlaying?.()) return false;
    if (when.free && game.interaction.busy) return false;
    if (when.state) {
      const { var: id, min, max } = when.state;
      if (!game.state.has(id)) return false;
      const value = game.state.get(id);
      if ((min !== undefined && value < min) || (max !== undefined && value > max)) return false;
    }
    return true;
  }

  private emitFrom(def: EmitterDef, item: Interactable | null): void {
    const at = this.anchor(def.at, item);
    if (!at) return;
    const spread = def.at.spread ?? 0;
    puff(this.pool, this.random, def.kind, at.x, at.y, countIn(def.count ?? [1, 1], this.random), spread, def.color);
  }

  // Where an emitter's puffs start, in world pixels, or null if what it is tied
  // to is not here (a piece in another room, a pose the task does not have).
  anchor(at: EmitterAnchor, item: Interactable | null): { x: number; y: number } | null {
    const { game } = this;
    const pieces = game.currentLevel.pieces;
    switch (at.from) {
      case "player": {
        const [dx, dy] = at.byFacing?.[game.player.facing] ?? [at.dx, at.dy];
        return { x: game.player.x + dx, y: game.player.y + dy };
      }
      case "zone": {
        if (!item) return null;
        const zone = boundsOf(item.zones);
        return { x: zone.x + at.dx, y: zone.y + at.dy };
      }
      case "pose": {
        const def = item?.pose ? POSES[item.pose] : undefined;
        const piece = def && pieces.find((p) => p.sprite === def.on);
        return def && piece ? { x: piece.bounds.x + def.at.x + at.dx, y: piece.bounds.y + def.at.y + at.dy } : null;
      }
      case "piece": {
        const piece = pieces.find((p) => p.sprite === at.sprite);
        return piece ? { x: piece.bounds.x + at.dx, y: piece.bounds.y + at.dy } : null;
      }
    }
  }
}

// Switches the feature on for a game: the one call in features.ts.
export function attachParticles(game: Game, options: ParticlesOptions = {}): ParticlesFeature {
  return new ParticlesFeature(game, options);
}
