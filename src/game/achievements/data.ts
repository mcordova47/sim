import type { NumberStat } from "./stats";

// What has to be true for an achievement to unlock. Thresholds live here, in
// the data, so tuning one is an edit to this file.
export type Condition =
  // A single stat reaches a number.
  | { stat: NumberStat; atLeast: number }
  // One task has been done this many times.
  | { task: string; atLeast: number }
  // Any of these tasks (variants of one thing) done this many times in total.
  | { anyOf: string[]; atLeast: number }
  // Every task in the list has been done at least once.
  | { tasks: string[] }
  // Every task in the game has been done at least once.
  | { everyTask: true };

export interface Achievement {
  id: string;
  // Shown in the toast and the list. Keep it to 22 characters.
  name: string;
  // One line, in the pixel font's characters only (no lowercase-only symbols
  // such as quotes beyond ' and "). A test checks this.
  description: string;
  when: Condition;
}

const MIRRORS = ["mirror-tired", "mirror-morning", "mirror-day", "mirror-night"];

// Names and descriptions are plain and a little wry; Marc reviews them.
export const ACHIEVEMENTS: Achievement[] = [
  // The same task, again and again.
  { id: "doomscroll-3", name: "One More Scroll", description: "Doomscroll three times.", when: { task: "doomscroll", atLeast: 3 } },
  { id: "coffee-3", name: "Regular Order", description: "Make coffee three times.", when: { task: "coffee", atLeast: 3 } },
  { id: "dishes-3", name: "Sink Duty", description: "Do the dishes three times.", when: { task: "dishes", atLeast: 3 } },
  { id: "guitar-3", name: "Same Three Chords", description: "Play guitar three times.", when: { task: "guitar", atLeast: 3 } },
  { id: "bed-3", name: "Hospital Corners", description: "Make the bed three times.", when: { task: "make-bed", atLeast: 3 } },
  { id: "plant-3", name: "Green Thumb", description: "Water the snake plant three times.", when: { anyOf: ["water-plant", "water-plant-droop"], atLeast: 3 } },
  { id: "contemplate-3", name: "Deep Thoughts", description: "Contemplate three times.", when: { task: "contemplate", atLeast: 3 } },
  { id: "sleep-3", name: "Asleep Again", description: "Go to sleep three times.", when: { task: "sleep", atLeast: 3 } },

  // Everything at one spot or in one room.
  { id: "desk-all", name: "Desk Job", description: "Do every task at the desk.", when: { tasks: ["work", "journal", "tidy-desk"] } },
  { id: "table-all", name: "Table Service", description: "Do every task at the table.", when: { tasks: ["coffee", "drink-coffee", "reheat", "eat-dinner"] } },
  { id: "records-all", name: "Record Keeper", description: "Sort the records all four ways.", when: { tasks: ["sort-records", "sort-records-year", "sort-records-fav", "sort-records-color"] } },
  { id: "kitchen-all", name: "Kitchen Regular", description: "Do every task in the kitchen.", when: { tasks: ["fridge-stare", "humidifier", "take-trash", "cook", "dishes", "flatten-boxes"] } },
  { id: "bath-all", name: "Fully Freshened", description: "Do every task in the bathroom.", when: { tasks: ["shower", "sit", "brush-teeth"] } },
  { id: "mirror-all", name: "Every Reflection", description: "Look in the mirror at four different times.", when: { tasks: MIRRORS } },
  { id: "every-task", name: "Completionist", description: "Do every task at least once.", when: { everyTask: true } },

  // Scoring.
  { id: "chain-4", name: "Variety Pack", description: "Chain four different tasks.", when: { stat: "bestChain", atLeast: 4 } },
  { id: "chain-6", name: "Renaissance Person", description: "Chain six different tasks.", when: { stat: "bestChain", atLeast: 6 } },
  { id: "big-award", name: "Big Payday", description: "Earn 150 points from one task.", when: { stat: "bestAward", atLeast: 150 } },
  { id: "min-award", name: "Diminishing Returns", description: "Repeat a task until it pays the minimum.", when: { stat: "minAwards", atLeast: 1 } },
  { id: "score-500", name: "Good Day", description: "Reach 500 points in one visit.", when: { stat: "bestScore", atLeast: 500 } },
  { id: "points-2000", name: "Lifetime Earnings", description: "Earn 2000 points in total.", when: { stat: "totalPoints", atLeast: 2000 } },

  // Wandering around.
  { id: "steps-1000", name: "Thousand Steps", description: "Take 1000 steps.", when: { stat: "steps", atLeast: 1000 } },
  { id: "bumps-25", name: "Wall Tester", description: "Walk into things 25 times.", when: { stat: "bumps", atLeast: 25 } },
  { id: "rooms-3", name: "Whole Apartment", description: "Visit every room.", when: { stat: "roomsVisited", atLeast: 3 } },
  { id: "cancel-3", name: "Changed My Mind", description: "Stop a task partway, three times.", when: { stat: "cancelled", atLeast: 3 } },
  { id: "time-30", name: "Still Here", description: "Play for half an hour in total.", when: { stat: "playSeconds", atLeast: 1800 } },
];
