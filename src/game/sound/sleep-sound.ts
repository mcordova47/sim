import { SLEEP_BREATH, SOUND } from "../config";
import { SLEEP_LULLABY } from "../music/system-tracks";
import type { Track } from "../music/track";
import type { SleepScene } from "../sleep";
import { MusicPlayer } from "./music-player";
import type { Synth } from "./synth";

type Mode = "idle" | "sleeping" | "restoring";

// The sound of the sleep sequence (issue 078, docs/sleep.md section 6): the
// lullaby on its own bus, a snore on each out-breath, and a playing record ducked
// (its bus turned down, never stopped) and brought back. It reads the scene each
// frame and nothing else: when the scene is gone, for any reason, it puts every
// bus back by itself. It never changes mute (that is the master gain) or what is
// saved, and with no audio context it does nothing, the sequence running in silence.
export class SleepSound {
  private readonly lullaby = new MusicPlayer("sleep");
  private mode: Mode = "idle";
  private seen = false;
  private lastT = 0;
  private last: SleepScene | null = null;
  private snored = -1;
  private fadedIn = false;
  private woke = false;
  private restoreEnd = 0;

  constructor(private readonly track: Track | null = SLEEP_LULLABY) {}

  // "idle" (nothing going on), "sleeping" or "restoring" (a scene ended; the buses are going back).
  get state(): Mode {
    return this.mode;
  }

  // The lullaby's player (for tests).
  get player(): MusicPlayer {
    return this.lullaby;
  }

  // Call every frame with the scene (or null), the synth (or null when there is no
  // audio yet) and a function that plays a named effect (which honours mute).
  update(scene: SleepScene | null, synth: Synth | null, play: (name: string) => void): void {
    if (scene) {
      // A new sequence: the first frame with a scene, or time that went back.
      if (!this.seen || scene.t < this.lastT) this.begin(scene, synth);
      this.seen = true;
      this.lastT = scene.t;
      this.last = scene;
      if (this.mode === "sleeping" && synth) this.follow(scene, synth, play);
    } else {
      if (this.seen) {
        this.seen = false;
        this.end(synth);
      }
      if (this.mode === "restoring" && (!synth || synth.now >= this.restoreEnd)) {
        this.lullaby.stop();
        this.mode = "idle";
      }
    }
    if (synth && this.mode !== "idle") this.lullaby.update(synth);
  }

  private begin(scene: SleepScene, synth: Synth | null): void {
    this.snored = -1;
    this.fadedIn = false;
    this.woke = false;
    // The lullaby starts only if there is a synth when the scene begins; with
    // none, the scene stays silent to its end (the mode stays idle).
    this.mode = synth ? "sleeping" : "idle";
    if (!synth) {
      this.lullaby.stop();
      return;
    }
    const s = scene.settings;
    if (s.duckTo < 1) synth.rampBus("music", SOUND.musicLevel * s.duckTo, s.duckDown);
    if (s.lullaby && this.track) this.lullaby.play(this.track);
    else this.lullaby.stop();
  }

  private follow(scene: SleepScene, synth: Synth, play: (name: string) => void): void {
    const s = scene.settings;
    const lullaby = s.lullaby && this.track !== null;
    if (lullaby && !this.fadedIn && scene.t >= s.lullabyInDelay) {
      this.fadedIn = true;
      synth.rampBus("sleep", s.lullabyGain, s.lullabyIn);
    }
    if (scene.phase === "wake" && !this.woke) {
      this.woke = true;
      if (s.duckTo < 1) synth.rampBus("music", SOUND.musicLevel, s.duckUp);
      if (lullaby) synth.rampBus("sleep", 0, s.lullabyOut);
    }
    // One snore on the out-breath of each breath, only while asleep.
    if (scene.phase === "asleep" && s.snore && s.breathPeriod > 0) {
      const breath = Math.floor((scene.t - s.fall) / s.breathPeriod - SLEEP_BREATH.exhaleAt);
      if (breath > this.snored) {
        this.snored = breath;
        play("snore");
      }
    }
  }

  // The scene is gone (it finished, or Escape, or an error): everything goes back
  // to rest within `escapeRestore`. After a finish the buses are already there.
  private end(synth: Synth | null): void {
    if (this.mode !== "sleeping") return;
    const s = this.last?.settings;
    if (!synth || !s) {
      this.lullaby.stop();
      this.mode = "idle";
      return;
    }
    if (s.duckTo < 1) synth.rampBus("music", SOUND.musicLevel, s.escapeRestore);
    if (s.lullaby) synth.rampBus("sleep", 0, s.escapeRestore);
    this.restoreEnd = synth.now + s.escapeRestore;
    this.mode = "restoring";
  }
}
