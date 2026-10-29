import type { Track } from "../game/music/track";
import type { LabMusicPlayer } from "./lab-audio";

// Plays "the intro once, then the loop forever" on a MusicPlayer, which only loops one track: the intro is
// played as the track with the loop queued behind it (`playThen`), and the player moves on to the
// loop exactly at the end of the intro.
export class LabPlayer {
  private intro: Track | null = null;
  private running = false;
  // Audio-clock time at which the intro has been heard to its end (the player starts 0.05 s after `start`).
  private introEnd = 0;

  constructor(
    private readonly player: LabMusicPlayer,
    // True once there is audio (before it, nothing can start, so nothing is faked).
    private readonly ready: () => boolean,
    // The audio clock, in seconds.
    private readonly now: () => number,
  ) {}

  get playing(): boolean {
    return this.running;
  }

  // True while the intro (not the loop) is still being heard (by the audio clock, not by what is scheduled).
  get inIntro(): boolean {
    return this.running && this.intro !== null && this.now() < this.introEnd;
  }

  // Starts from the top. False if there is no audio yet.
  start(intro: Track | null, loop: Track): boolean {
    if (!this.ready()) return false;
    this.intro = intro;
    this.running = true;
    this.introEnd = intro ? this.now() + 0.05 + (intro.beats * 60) / intro.tempo : 0;
    this.player.playThen(intro ?? loop, intro ? loop : null);
    return true;
  }

  // New tracks while playing. The loop (or a lone track) changes at the next loop end, on the beat.
  // During the intro the whole thing starts again, since the intro cannot be swapped without losing the
  // loop after it.
  update(intro: Track | null, loop: Track): void {
    if (!this.running) return;
    if (this.inIntro || (intro !== null) !== (this.intro !== null)) {
      this.start(intro, loop);
      return;
    }
    this.intro = intro;
    this.player.swap(loop);
  }

  stop(): void {
    this.running = false;
    this.intro = null;
    this.player.stop();
  }
}
