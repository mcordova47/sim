import { SHOWER_SOUND } from "../config";
import type { Synth } from "./synth";

// The sound of the shower (issue 177, docs/shower-scene-design.md section 7): a soft hiss on its own `shower` bus
// while the task's water phase runs, and a click when the water stops by itself. It reads the running task's id
// and phase each frame and nothing else, so when the task is gone for any reason (a finish, Escape, an error) the
// hiss fades out by itself. The music and a playing record are left alone. It never changes mute (that is the
// master gain) or what is saved, and with no audio context it does nothing: the scene runs in silence.
export class ShowerSound {
  private hiss: { stop(time: number): void }[] | null = null;

  // Whether the hiss is on (for tests).
  get on(): boolean {
    return this.hiss !== null;
  }

  // Call every frame with the running task's id and phase (null when none), the synth (or null when there is
  // no audio yet) and a function that plays a named effect (which honours mute).
  update(taskId: string | null, phase: string | null, synth: Synth | null, play: (name: string) => void): void {
    const water = taskId === SHOWER_SOUND.taskId && phase === SHOWER_SOUND.phase;
    if (water && !this.hiss && synth) {
      const now = synth.now;
      this.hiss = SHOWER_SOUND.hiss.map((voice) => synth.voice(voice, now, {}, "shower"));
      synth.rampBus("shower", SHOWER_SOUND.level, SHOWER_SOUND.fadeIn);
    } else if (!water && this.hiss) {
      const layers = this.hiss;
      this.hiss = null;
      if (!synth) return;
      synth.rampBus("shower", 0, SHOWER_SOUND.fadeOut);
      // The layers end a moment after the bus is silent, so they never pile up if the shower starts again.
      for (const layer of layers) layer.stop(synth.now + SHOWER_SOUND.fadeOut + 0.02);
      // A click when the water stops by itself: the task is on to its last phase, not gone (Escape).
      if (taskId === SHOWER_SOUND.taskId) play(SHOWER_SOUND.click);
    }
  }
}
