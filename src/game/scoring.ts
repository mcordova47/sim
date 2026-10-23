import { SCORING } from "./config";

export interface Award {
  points: number;
  basePoints: number;
  // 1 for a first completion, less for repeats within the window.
  repeatFactor: number;
  // Variety combo multiplier applied to this completion.
  multiplier: number;
  // Number of different tasks in the combo chain, including this one.
  chain: number;
  // How well a mini-game went, as a multiplier (1 for tasks without a quality).
  qualityFactor: number;
  // The time-of-day bonus (see TIME_OF_DAY.bonusMultiplier): 1 outside the task's good hours.
  timeFactor: number;
}

interface Completion {
  id: string;
  time: number;
}

// Tracks score, diminishing returns and the variety combo. Time is passed in
// by the caller so the rules are easy to test.
export class Scoreboard {
  score = 0;

  private chain: string[] = [];
  private lastTime = -Infinity;
  private recent: Completion[] = [];

  complete(task: { id: string; points: number }, now: number, qualityFactor = 1, timeFactor = 1): Award {
    if (!this.chainAlive(now)) this.chain = [];

    this.recent = this.recent.filter((c) => now - c.time <= SCORING.repeatWindow);
    const repeats = this.recent.filter((c) => c.id === task.id).length;
    const repeatFactor = SCORING.repeatDecay ** repeats;

    // Doing the same task again breaks the variety chain.
    if (this.chain.includes(task.id)) this.chain = [];
    this.chain.push(task.id);

    const multiplier = chainMultiplier(this.chain.length);
    const points = Math.max(
      SCORING.minPoints,
      Math.round(task.points * repeatFactor * multiplier * qualityFactor * timeFactor),
    );

    this.recent.push({ id: task.id, time: now });
    this.lastTime = now;
    this.score += points;

    return {
      points,
      basePoints: task.points,
      repeatFactor,
      multiplier,
      chain: this.chain.length,
      qualityFactor,
      timeFactor,
    };
  }

  // Combo length as of `now` (0 once the combo has timed out).
  chainLength(now: number): number {
    return this.chainAlive(now) ? this.chain.length : 0;
  }

  // Multiplier of the combo as it stands at `now` (1 when there is no combo).
  multiplier(now: number): number {
    return chainMultiplier(this.chainLength(now));
  }

  // Multiplier the next *different* task would get if done at `now`.
  nextMultiplier(now: number): number {
    return chainMultiplier(this.chainLength(now) + 1);
  }

  // Seconds left to keep the combo going (0 if none).
  comboTimeLeft(now: number): number {
    return this.chainAlive(now)
      ? Math.max(0, SCORING.comboWindow - (now - this.lastTime))
      : 0;
  }

  private chainAlive(now: number): boolean {
    return this.chain.length > 0 && now - this.lastTime <= SCORING.comboWindow;
  }
}

function chainMultiplier(chainLength: number): number {
  return Math.min(
    SCORING.comboMaxMultiplier,
    1 + SCORING.comboStep * Math.max(0, chainLength - 1),
  );
}
