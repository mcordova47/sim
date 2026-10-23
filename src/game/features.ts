import { attachAchievements } from "./achievements/feature";
import type { Game } from "./game";
import { attachTimeOfDay } from "./time-of-day/feature";

// Switches on the optional features (sound, particles, achievements, the
// day/night cycle). Each one is a module that subscribes to `game.events` and,
// if it draws, registers a layer with `game.addLayer`. Adding a feature is one
// line here, so features don't have to edit `game.ts`.
export function attachFeatures(game: Game): void {
  // attachSound(game);
  attachAchievements(game);
  attachTimeOfDay(game);
}
