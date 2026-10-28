import type { StateVar } from "./state";
import { ART_PIECES } from "./art-pieces";

// What the game tracks about the apartment and the character. Add a line to
// track something new (hunger, laundry, tidiness); tasks and objects refer to
// these ids in `requires`, `effects` and `variants`.
export const STATE_VARS: StateVar[] = [
  { id: "dishes", initial: 1, min: 0, max: 9, meaning: "Dirty dishes in the sink, a count." },
  { id: "bedMade", initial: 0, min: 0, max: 1, meaning: "1 if the bed is made, 0 if not." },
  // Issues 066 and 070. 1 and 0 keep the meaning they had in 066, so nothing saved changes: 2 is new.
  { id: "boxes", initial: 1, min: 0, max: 2, meaning: "The cardboard boxes in the kitchen: 1 a stack (the default), 0 flattened and tidy, 2 gone (taken out with the recycling). Flattening sets 0, taking out the recycling sets 2, opening a package at the front door sets 1." },
  { id: "energy", initial: 80, min: 0, max: 100, meaning: "How awake you are. Falls with time and work, sleep restores it." },
  { id: "mood", initial: 60, min: 0, max: 100, meaning: "How good you feel. Doomscrolling and work wear it down; music, food, light and art lift it. Drifts back toward the middle." },
  // Issue 088: only a gag so far. Nothing drains it and no task reads it; the charge task fills it. Saved with the rest, and a save without it starts at the initial value.
  { id: "battery", initial: 40, min: 0, max: 100, meaning: "The charge of your phone. Only the charge-your-phone task raises it; nothing drains it and no task depends on it." },
  { id: "clock", initial: 8, min: 0, max: 24, wrap: true, meaning: "Time of day in hours since midnight (8.5 is 8:30 AM)." },
  { id: "blinds", initial: 0, min: 0, max: 1, meaning: "1 if the blinds are open, 0 if closed (both east windows follow it)." },
  { id: "plate", initial: 0, min: 0, max: 1, meaning: "1 if a dinner plate is out on the dining table (reheating or cooking puts it there, eating dinner clears it), 0 if not." },
  { id: "mug", initial: 0, min: 0, max: 1, meaning: "1 if a full mug of coffee is waiting to be drunk, 0 if not." },
  { id: "outfit", initial: 0, min: 0, max: 3, meaning: "What you are wearing: 0 everyday clothes, 1 casual, 2 out, 3 pajamas (see outfits.ts)." },
  // The snake plant on the bookshelf (issue 063, rules in plant.ts and PLANT in config.ts).
  { id: "plantStage", initial: 1, min: 0, max: 3, meaning: "How far the snake plant has grown: 0 sprout, 1 small, 2 full, 3 flowering." },
  { id: "plantGrowth", initial: 0, min: 0, max: 9, meaning: "Waterings that counted toward the next stage of the snake plant." },
  { id: "plantDry", initial: 12, min: 0, max: 999, meaning: "Game hours since the snake plant was last watered. Past PLANT.droopAfterHours it droops; watering fixes it." },
  // Derived, never set by a task: 1 while a delivered package waits by the front door (issue 062).
  { id: "parcel", initial: 0, min: 0, max: 1, meaning: "1 while a package waits by the front door, 0 if not. Follows the delivery queue (deliveries.ts); no task sets it." },
  {
    id: "recordSort",
    initial: 0,
    min: 0,
    max: 4,
    wrap: true,
    meaning: "Which way the records get sorted next: 0 alphabetical, 1 by year, 2 by favorites, 3 by color, then round to 0.",
  },
  {
    id: "artPiece",
    initial: 0,
    min: 0,
    max: ART_PIECES.length,
    wrap: true,
    meaning: "Which piece of art \"Admire the art\" zooms in on next, in the order of art-pieces.ts, then round to the first.",
  },
];
