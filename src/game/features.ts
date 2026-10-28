import { attachAchievements } from "./achievements/feature";
import type { Game } from "./game";
import { attachParticles } from "./particles/feature";
import { guitarSessions } from "./sound/guitar-skill";
import { attachSound } from "./sound/feature";
import { attachTimeOfDay } from "./time-of-day/feature";

// Switches on the optional features (sound, particles, achievements, the
// day/night cycle). Each one is a module that subscribes to `game.events` and,
// if it draws, registers a layer with `game.addLayer`. Adding a feature is one
// line here, so features don't have to edit `game.ts`.
export function attachFeatures(game: Game): { unlockAudio(): void; offerPairing(key: string): void } {
  // The guitar's skill follows the finished guitar sessions, which the stats count.
  let sessions = () => 0;
  const sound = attachSound(game, { guitarSessions: () => sessions() });
  const achievements = attachAchievements(game);
  sessions = () => guitarSessions(achievements.stats.toJSON().taskCounts);
  attachTimeOfDay(game);
  // After the time of day, so particles are drawn over its tint and stay bright at night.
  // The notes from the record player stop while the record is ducked for the night's sleep.
  attachParticles(game, {
    musicPlaying: () => sound.track !== null && !sound.muted && !((game.sleepScene?.settings.duckTo ?? 1) < 1),
  });
  // A phone has no key press to start audio; the touch layer calls this from a real touch.
  return { unlockAudio: () => sound.engine.unlock(), offerPairing: (key) => achievements.offerPairing(key) };
}
