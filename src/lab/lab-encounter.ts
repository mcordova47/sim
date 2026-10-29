import { ENCOUNTERS, SOUND } from "../game/config";
import type { Game } from "../game/game";
import type { SoundEngine } from "../game/sound/engine";
import { LabMusicPlayer, labAudio } from "./lab-audio";
import { LabPlayer } from "./lab-player";
import { LAB_KEY, loadLab, type StoreLike } from "./lab-store";
import { parseLab, playable } from "./lab-text";

// Dev only (issue 122): `/?encounter=ad-candle&labmusic=1` plays the music lab's track under the real
// encounter. It is the lab's stand-in for the encounter music of the 091 design, not the feature: the
// music starts on the hit frame of the entrance (or when the card opens, if E skipped the entrance),
// the playing record is ducked to silence from the first frame and comes back after, and when the
// encounter ends the lab track fades out. It uses the `sleep` bus (an encounter and a sleep cannot overlap).
// It never touches the saved sound settings. Returns false when `labmusic` is not asked for or nothing is saved.
export const LAB_ENCOUNTER = { duckDown: 0.3, duckUp: 1.5, fadeOut: 0.35, defaultGain: SOUND.musicLevel * 0.5 };

export function labEncounterMusic(game: Game, engine: SoundEngine, search: string, store: StoreLike | null): boolean {
  if (new URLSearchParams(search).get("labmusic") !== "1") return false;
  const saved = loadLab(store);
  const parsed = saved ? parseLab(saved.text) : null;
  if (!saved || !parsed || !parsed.ok) {
    console.warn(`labmusic: no usable lab text under ${LAB_KEY}: open /music-lab.html and press "Try in the encounter"`);
    return false;
  }
  const audio = labAudio(engine);
  const picked = playable(parsed.lab, saved.mode, saved.tweaks);
  if (saved.tweaks.master !== undefined) audio.setMaster(saved.tweaks.master);
  const bus = new LabMusicPlayer("sleep");
  const player = new LabPlayer(bus, () => engine.ready, () => engine.now);
  const hitFrame = ENCOUNTERS.entrance.sounds.find(([, cue]) => cue === "encounter-hit")?.[0] ?? 32;
  let frames = 0;
  let wasActive = false;
  let started = false;
  let stopAt: number | null = null;
  game.addLayer({
    name: "dev-lab-encounter",
    update() {
      const active = game.interaction.active?.item.encounter === true;
      if (active && !wasActive) {
        frames = 0;
        started = false;
        stopAt = null;
        audio.rampBus("music", 0, LAB_ENCOUNTER.duckDown);
      }
      if (active) {
        frames++;
        if (!started && (frames >= hitFrame || game.dialogOpen)) {
          started = true;
          audio.rampBus("sleep", saved.tweaks.encounterGain ?? LAB_ENCOUNTER.defaultGain, 0);
          player.start(picked.intro, picked.loop);
        }
      } else if (wasActive) {
        audio.rampBus("music", SOUND.musicLevel, LAB_ENCOUNTER.duckUp);
        audio.rampBus("sleep", 0, LAB_ENCOUNTER.fadeOut);
        stopAt = engine.now + LAB_ENCOUNTER.fadeOut + 0.05;
      }
      wasActive = active;
      if (player.playing) {
        audio.update(bus);
        if (stopAt !== null && engine.now >= stopAt) {
          player.stop();
          stopAt = null;
        }
      }
    },
  });
  return true;
}
