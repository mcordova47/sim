import type { StateVar } from "./state";

// What the game tracks about the apartment and the character. Add a line to
// track something new (hunger, laundry, tidiness); tasks and objects refer to
// these ids in `requires`, `effects` and `variants`.
export const STATE_VARS: StateVar[] = [
  { id: "dishes", initial: 1, min: 0, max: 9, meaning: "Dirty dishes in the sink, a count." },
  { id: "bedMade", initial: 0, min: 0, max: 1, meaning: "1 if the bed is made, 0 if not." },
  { id: "energy", initial: 80, min: 0, max: 100, meaning: "How awake you are. Falls with time and work, sleep restores it." },
  { id: "mood", initial: 60, min: 0, max: 100, meaning: "How good you feel. Doomscrolling and work wear it down; music, food, light and art lift it. Drifts back toward the middle." },
  { id: "clock", initial: 8, min: 0, max: 24, wrap: true, meaning: "Time of day in hours since midnight (8.5 is 8:30 AM)." },
  { id: "blinds", initial: 0, min: 0, max: 1, meaning: "1 if the blinds are open, 0 if closed (the one window that has blinds)." },
  { id: "mug", initial: 0, min: 0, max: 1, meaning: "1 if a full mug of coffee is waiting to be drunk, 0 if not." },
  { id: "outfit", initial: 0, min: 0, max: 3, meaning: "What you are wearing: 0 everyday clothes, 1 casual, 2 out, 3 pajamas (see outfits.ts)." },
  {
    id: "recordSort",
    initial: 0,
    min: 0,
    max: 4,
    wrap: true,
    meaning: "Which way the records get sorted next: 0 alphabetical, 1 by year, 2 by favorites, 3 by color, then round to 0.",
  },
];
