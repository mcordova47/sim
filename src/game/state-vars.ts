import type { StateVar } from "./state";

// What the game tracks about the apartment and the character. Add a line to
// track something new (hunger, laundry, tidiness); tasks and objects refer to
// these ids in `requires`, `effects` and `variants`.
export const STATE_VARS: StateVar[] = [
  { id: "dishes", initial: 1, min: 0, max: 9, meaning: "Dirty dishes in the sink, a count." },
  { id: "bedMade", initial: 0, min: 0, max: 1, meaning: "1 if the bed is made, 0 if not." },
  { id: "energy", initial: 80, min: 0, max: 100, meaning: "How awake you are. Falls with time and work, sleep restores it." },
  { id: "clock", initial: 8, min: 0, max: 24, wrap: true, meaning: "Time of day in hours since midnight (8.5 is 8:30 AM)." },
];
