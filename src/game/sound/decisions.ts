import { ENERGY, MUSIC, SOUND } from "../config";
import type { Effect } from "../state";

// Decisions that depend on game values, as plain functions with no audio in
// them, so they can be tested (and tuned in config.ts).

// How much to raise the combo sound's pitch for a variety chain of `chain`
// tasks: nothing for 1, one step up for 2, and so on up to the cap.
export function comboPitch(chain: number): number {
  const links = Math.min(Math.max(0, Math.floor(chain) - 1), SOUND.combo.maxSteps);
  return 2 ** ((links * SOUND.combo.semitonesPerStep) / 12);
}

// The floor a room has, by room id.
export function floorOf(room: string): string {
  return SOUND.floors[room] ?? SOUND.defaultFloor;
}

// The effect name for a footstep on a floor ("wood" is "stepWood").
export function stepEffect(floor: string): string {
  const name = `step${floor.charAt(0).toUpperCase()}${floor.slice(1)}`;
  return name in SOUND.effects ? name : "stepWood";
}

// Footsteps are quieter when tired.
export function stepGain(energy: number): number {
  return energy < ENERGY.lowBelow ? SOUND.tiredStepGain : 1;
}

// A little pitch wobble so steps are not all the same. `random` is 0 up to 1.
export function stepPitch(random: number): number {
  return 1 + (random * 2 - 1) * SOUND.stepPitchWobble;
}

// The pitch of a mini-game note for an arrow key, relative to the effect's own
// pitch, or null if the key has no note.
const ARROWS: Record<string, string> = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};
export function noteKeyPitch(code: string): number | null {
  const dir = ARROWS[code];
  return dir ? (SOUND.noteKeys[dir] ?? 440) / 440 : null;
}

// Mood lift from music: `MUSIC.moodPerStep` every `MUSIC.everyGameMinutes` of
// game time while a record plays, never taking mood past `MUSIC.moodCap`.
export class MoodLift {
  private minutes = 0;

  // `gameMinutes` is how much game time has passed. Returns the effect to
  // apply to the apartment state, or null if there is nothing to do.
  advance(gameMinutes: number, mood: number): Effect | null {
    this.minutes += gameMinutes;
    let steps = 0;
    while (this.minutes >= MUSIC.everyGameMinutes) {
      this.minutes -= MUSIC.everyGameMinutes;
      steps++;
    }
    if (steps === 0) return null;
    const add = Math.min(steps * MUSIC.moodPerStep, MUSIC.moodCap - mood);
    return add > 0 ? { var: "mood", add } : null;
  }

  reset(): void {
    this.minutes = 0;
  }
}
