import { attachAchievements } from "./achievements/feature";
import type { Game } from "./game";
import { attachParticles } from "./particles/feature";
import { attachSound } from "./sound/feature";
import { attachTimeOfDay } from "./time-of-day/feature";

// Switches on the optional features (sound, particles, achievements, the
// day/night cycle). Each one is a module that subscribes to `game.events` and,
// if it draws, registers a layer with `game.addLayer`. Adding a feature is one
// line here, so features don't have to edit `game.ts`.
export function attachFeatures(game: Game): void {
  const sound = attachSound(game);
  attachAchievements(game);
  attachTimeOfDay(game);
  // After the time of day, so particles are drawn over its tint and stay bright at night.
  // The notes from the record player stop while the record is ducked for the night's sleep.
  attachParticles(game, {
    musicPlaying: () => sound.track !== null && !sound.muted && !((game.sleepScene?.settings.duckTo ?? 1) < 1),
  });
}
