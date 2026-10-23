// Task content from the first version of the game: names, prompts, durations,
// points and a line of flavor. Where a task happens (which object, which tile)
// is not here; that comes from the top-down floor plan (issue 020). The
// personal task list (issue 024) will replace and extend this.

export type Task = {
  id: string;
  // Name shown in score popups and achievements.
  name: string;
  // Short verb phrase shown when the player is in range.
  prompt: string;
  // Seconds the player holds still while doing it.
  duration: number;
  // Points for the first completion. Repeats are scaled by the scoring system.
  points: number;
  // One-line joke shown on completion.
  flavor: string;
};

export const TASKS: Task[] = [
  // Bed nook
  { id: 'make-bed', name: 'Make the bed', prompt: 'Make the bed', duration: 3, points: 30,
    flavor: 'It will be undone in eleven hours. Worth it.' },
  { id: 'open-blinds', name: 'Open the blinds', prompt: 'Open the blinds', duration: 1, points: 10,
    flavor: 'The outside is still there. Good to know.' },
  { id: 'water-plant', name: 'Water the snake plant', prompt: 'Water the plant', duration: 2, points: 20,
    flavor: 'It has survived worse owners. It has not had worse owners.' },
  { id: 'sort-records', name: 'Alphabetize the records', prompt: 'Alphabetize records', duration: 6, points: 60,
    flavor: 'By artist. Then by mood. Then by artist again.' },

  // Work corner
  { id: 'work', name: 'Answer emails', prompt: 'Work at the desk', duration: 8, points: 80,
    flavor: 'Per my last email, you are doing great.' },
  { id: 'journal', name: 'Write in the journal', prompt: 'Write in the journal', duration: 5, points: 50,
    flavor: 'Dear diary, I made coffee. It was a lot.' },
  { id: 'record-play', name: 'Flip the record', prompt: 'Flip the record', duration: 2, points: 25,
    flavor: 'Side B is the one you actually like.' },

  // Table
  { id: 'coffee', name: 'Make pour-over coffee', prompt: 'Make coffee', duration: 6, points: 70,
    flavor: 'Weigh, grind, bloom, wait. Peak civilization.' },
  { id: 'reheat', name: 'Reheat leftovers', prompt: 'Reheat leftovers', duration: 3, points: 25,
    flavor: 'Thirty seconds more. Thirty seconds more. Cold in the middle.' },
  { id: 'eat-dinner', name: 'Eat dinner', prompt: 'Eat dinner', duration: 7, points: 60,
    flavor: 'Eaten while watching something you have already seen.' },

  // Sofa
  { id: 'doomscroll', name: 'Doomscroll', prompt: 'Doomscroll', duration: 10, points: 40,
    flavor: 'One more. Okay, one more. Where did forty minutes go.' },
  { id: 'guitar', name: 'Play three chords', prompt: 'Play guitar', duration: 5, points: 55,
    flavor: 'Same three chords. Different, slightly worse, song.' },

  // Kitchen
  { id: 'fridge-stare', name: 'Stare into the fridge', prompt: 'Open the fridge', duration: 3, points: 30,
    flavor: 'Nothing new has appeared since the last check.' },
  { id: 'humidifier', name: 'Refill the humidifier', prompt: 'Refill the humidifier', duration: 4, points: 45,
    flavor: 'The air is now 4% less crunchy.' },
  { id: 'take-trash', name: 'Take out the trash', prompt: 'Take out the trash', duration: 4, points: 50,
    flavor: 'The bag was not full. You took it out anyway, out of spite.' },
  { id: 'cook', name: 'Cook dinner', prompt: 'Cook dinner', duration: 8, points: 90,
    flavor: 'Smoke alarm: silent, but judging.' },
  { id: 'dishes', name: 'Do the dishes', prompt: 'Do the dishes', duration: 7, points: 80,
    flavor: 'The pile regrows when you look away.' },
  { id: 'flatten-boxes', name: 'Flatten the boxes', prompt: 'Flatten boxes', duration: 5, points: 45,
    flavor: 'You have been meaning to do this since spring.' },

  // Bath
  { id: 'brush-teeth', name: 'Brush teeth', prompt: 'Brush teeth', duration: 3, points: 30,
    flavor: 'Two full minutes. Honest.' },
  { id: 'sit', name: 'Take a moment', prompt: 'Take a moment', duration: 4, points: 20,
    flavor: 'Phone battery: 41%. Phone battery: 33%.' },
  { id: 'shower', name: 'Take a shower', prompt: 'Take a shower', duration: 6, points: 70,
    flavor: 'Best ideas of the day, all forgotten by the towel.' },
];
