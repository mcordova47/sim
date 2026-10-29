// What the ad encounter shows the rest of the game each frame (issue 091a, docs/encounter-music-design.md
// section 3), the way the sleep sequence publishes a `SleepScene`: a plain value that the encounter's sound
// reads. The encounter sets the phase and the outcome and knows nothing about audio; the sound follows the
// scene and, when the scene is gone for any reason (a finish, Escape, an error), puts every bus back itself.
//   entering: the entrance plays (`frame` counts from 0; the hit chord is on frame 32).
//   open: the card and its menus are up.
//   result: the closing narrator line is up, `outcome` says how it went.
//   leaving: the exit wipe.
export type EncounterPhase = "entering" | "open" | "result" | "leaving";

// How it ended, for the closing line (the result jingles of issue 091b read it). `refused` is a line with no
// action (already own it, cart full); `ignore` also covers a plain leave.
export type EncounterOutcome = "unsubscribed" | "unsubscribeFailed" | "cart" | "ignore" | "refused";

export interface EncounterScene {
  // A number that is new for each encounter, so two in a row are told apart.
  readonly id: number;
  readonly phase: EncounterPhase;
  // Frames in the current phase (entering counts from the start; the others restart at 0).
  readonly frame: number;
  readonly outcome: EncounterOutcome | null;
  // Reduced motion was asked for: the entrance is a plain fade, and there is no music.
  readonly reduced: boolean;
}
