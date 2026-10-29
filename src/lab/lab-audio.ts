import type { SoundEngine } from "../game/sound/engine";
import { MusicPlayer } from "../game/sound/music-player";
import type { Bus } from "../game/sound/synth";
import type { Track } from "../game/music/track";

// What the lab needs from the sound engine beyond its public methods (issue 122). It reads the synth the
// engine makes, so nothing is added to the game's sound code and the production bundle is unchanged.
export interface LabAudio {
  // The whole-game level (SOUND.master). The game's own mute key puts it back to SOUND.master on unmute.
  setMaster(level: number): void;
  rampBus(bus: Bus, level: number, seconds: number): void;
  update(player: MusicPlayer): void;
}

export function labAudio(engine: SoundEngine): LabAudio {
  return {
    setMaster: (level) => engine.synth?.master.gain.setValueAtTime(level, engine.synth.now),
    rampBus: (bus, level, seconds) => engine.synth?.rampBus(bus, level, seconds),
    update: (player) => {
      if (engine.synth) player.update(engine.synth);
    },
  };
}

// A MusicPlayer that can start a track with another queued behind it (the intro, then the loop).
export class LabMusicPlayer extends MusicPlayer {
  playThen(track: Track, then: Track | null): void {
    this.play(track);
    this.pending = then;
  }
}
