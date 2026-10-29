import { ENCOUNTERS, SOUND } from "../config";
import type { EncounterScene } from "../encounter-scene";
import { ENCOUNTER_BATTLE } from "../music/system-tracks";
import type { Track } from "../music/track";
import { MusicPlayer } from "./music-player";
import type { Synth } from "./synth";

type Mode = "idle" | "waiting" | "playing" | "fading";

// The sound of an ad encounter (issue 091a, docs/encounter-music-design.md): the battle loop on its own
// `encounter` bus, and a playing record turned down to silence (its bus ramped, never stopped, so it keeps
// its place) and brought back. Like `SleepSound` it reads the scene each frame and nothing else: when the
// scene is gone, for any reason (a finish, Escape, an error), it fades the loop and returns the record by
// itself. It never touches mute (that is the master gain) or what is saved. With no audio context when the
// encounter begins, or with reduced motion, the encounter is silent to its end and nothing is ducked.
// `disabled` lets the dev music lab's stand-in (labmusic=1) play instead without the two stacking.
export class EncounterSound {
  private readonly player = new MusicPlayer("encounter");
  private mode: Mode = "idle";
  private seen = false;
  private lastId = -1;
  private ducked = false;
  private returned = false;
  private fadeStarted = false;
  private fadeEnd = 0;
  private loopFadeAt = Infinity;
  disabled = false;

  constructor(private readonly track: Track | null = ENCOUNTER_BATTLE) {}

  // "idle" (nothing going on), "waiting" (before the hit), "playing" or "fading" (the loop is going out).
  get state(): Mode {
    return this.mode;
  }

  // The loop's player (for tests).
  get loop(): MusicPlayer {
    return this.player;
  }

  update(scene: EncounterScene | null, synth: Synth | null): void {
    const M = ENCOUNTERS.music;
    if (scene) {
      if (!this.seen || scene.id !== this.lastId) this.begin(scene, synth);
      this.seen = true;
      this.lastId = scene.id;
      if (synth && this.mode !== "idle") this.follow(scene, synth, M);
    } else if (this.seen) {
      this.seen = false;
      this.gone(synth, M);
    }
    if (this.mode === "fading" && (!synth || synth.now >= this.fadeEnd)) {
      this.player.stop();
      this.mode = "idle";
    }
    if (synth && this.mode !== "idle") this.player.update(synth);
  }

  private begin(scene: EncounterScene, synth: Synth | null): void {
    this.player.stop();
    this.ducked = false;
    this.returned = false;
    this.fadeStarted = false;
    this.loopFadeAt = Infinity;
    this.mode = synth && !scene.reduced && !this.disabled ? "waiting" : "idle";
    if (this.mode === "idle" || !synth) return;
    // The record goes quiet from the first frame, so the entrance's buzz is not under a record.
    synth.rampBus("encounter", 0, 0);
    synth.rampBus("music", SOUND.musicLevel * ENCOUNTERS.music.duckTo, ENCOUNTERS.music.duckDown);
    this.ducked = true;
  }

  private follow(scene: EncounterScene, synth: Synth, M: typeof ENCOUNTERS.music): void {
    // Start on the hit chord's frame, or at once when the entrance was skipped (the card is open).
    if (this.mode === "waiting" && (scene.phase !== "entering" || scene.frame >= M.startFrame)) {
      this.start(synth, M);
    }
    if (this.mode === "playing" && synth.now >= this.loopFadeAt) this.fadeOut(synth, M.loopFadeOut);
    // The closing line (or the exit with no line): the loop dies away. The record returns when the exit begins.
    if ((scene.phase === "result" || scene.phase === "leaving") && !this.fadeStarted) this.fadeOut(synth, M.resultFade);
    if (scene.phase === "leaving") this.giveBack(synth, M.duckUp);
  }

  private start(synth: Synth, M: typeof ENCOUNTERS.music): void {
    if (!this.track) {
      this.mode = "idle";
      return;
    }
    synth.rampBus("encounter", M.gain, 0);
    this.player.play(this.track);
    this.mode = "playing";
    this.loopFadeAt = synth.now + M.maxLoops * ((this.track.beats * 60) / this.track.tempo);
  }

  // Ramps the loop to nothing over `seconds`; the player stops once that is over.
  private fadeOut(synth: Synth, seconds: number): void {
    this.fadeStarted = true;
    this.loopFadeAt = Infinity;
    if (this.mode === "waiting") {
      // Never started (left before the hit): nothing to fade, only the record to return.
      this.mode = "idle";
      return;
    }
    if (this.mode !== "playing" && this.mode !== "fading") return;
    synth.rampBus("encounter", 0, seconds);
    this.fadeEnd = synth.now + seconds;
    this.mode = "fading";
  }

  private giveBack(synth: Synth, seconds: number): void {
    if (!this.ducked || this.returned) return;
    this.returned = true;
    synth.rampBus("music", SOUND.musicLevel, seconds);
  }

  // The scene is gone. After a normal finish the loop has faded and the record is coming back; after Escape
  // (or anything else) the loop goes out in `escapeFade` and the record returns.
  private gone(synth: Synth | null, M: typeof ENCOUNTERS.music): void {
    if (!synth) {
      this.player.stop();
      this.mode = "idle";
      return;
    }
    if (!this.fadeStarted) this.fadeOut(synth, M.escapeFade);
    this.giveBack(synth, M.duckUp);
    if (this.mode === "waiting") this.mode = "idle";
  }
}
