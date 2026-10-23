// Every task in the apartment. Tuning values (points, durations) live here,
// not in the engine. See docs/floor-plan.md for the reasoning.

export type Task = {
  id: string;
  // Piece in room.ts the task belongs to.
  piece: string;
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
  // Where the player's feet must be: x and width in tiles, and the height range
  // above the floor. Almost always the top of the piece, since furniture is the level.
  zone: { x: number; w: number; feetFrom: number; feetTo: number };
};

export const TASKS: Task[] = [
  // Bed nook
  { id: 'make-bed', piece: 'bed', name: 'Make the bed', prompt: 'Make the bed', duration: 3, points: 30,
    flavor: 'It will be undone in eleven hours. Worth it.',
    zone: { x: 0, w: 4, feetFrom: 2, feetTo: 2 } },
  { id: 'open-blinds', piece: 'bed', name: 'Open the blinds', prompt: 'Open the blinds', duration: 1, points: 10,
    flavor: 'The outside is still there. Good to know.',
    zone: { x: 1, w: 2, feetFrom: 2, feetTo: 2 } },
  { id: 'water-plant', piece: 'bookshelf', name: 'Water the snake plant', prompt: 'Water the plant', duration: 2, points: 20,
    flavor: 'It has survived worse owners. It has not had worse owners.',
    zone: { x: 5, w: 2, feetFrom: 5, feetTo: 5 } },
  { id: 'sort-records', piece: 'bookshelf', name: 'Alphabetize the records', prompt: 'Alphabetize records', duration: 6, points: 60,
    flavor: 'By artist. Then by mood. Then by artist again.',
    zone: { x: 4, w: 1, feetFrom: 5, feetTo: 5 } },

  // Work corner
  { id: 'work', piece: 'desk', name: 'Answer emails', prompt: 'Work at the desk', duration: 8, points: 80,
    flavor: 'Per my last email, you are doing great.',
    zone: { x: 7, w: 2, feetFrom: 2, feetTo: 2 } },
  { id: 'journal', piece: 'desk', name: 'Write in the journal', prompt: 'Write in the journal', duration: 5, points: 50,
    flavor: 'Dear diary, I made coffee. It was a lot.',
    zone: { x: 9, w: 1, feetFrom: 2, feetTo: 2 } },
  { id: 'record-play', piece: 'record-stand', name: 'Flip the record', prompt: 'Flip the record', duration: 2, points: 25,
    flavor: 'Side B is the one you actually like.',
    zone: { x: 13, w: 1, feetFrom: 3, feetTo: 3 } },

  // Table
  { id: 'coffee', piece: 'table', name: 'Make pour-over coffee', prompt: 'Make coffee', duration: 6, points: 70,
    flavor: 'Weigh, grind, bloom, wait. Peak civilization.',
    zone: { x: 10, w: 1, feetFrom: 2, feetTo: 2 } },
  { id: 'reheat', piece: 'table', name: 'Reheat leftovers', prompt: 'Reheat leftovers', duration: 3, points: 25,
    flavor: 'Thirty seconds more. Thirty seconds more. Cold in the middle.',
    zone: { x: 11, w: 1, feetFrom: 2, feetTo: 2 } },
  { id: 'eat-dinner', piece: 'table', name: 'Eat dinner', prompt: 'Eat dinner', duration: 7, points: 60,
    flavor: 'Eaten while watching something you have already seen.',
    zone: { x: 12, w: 1, feetFrom: 2, feetTo: 2 } },

  // Sofa
  { id: 'doomscroll', piece: 'sofa', name: 'Doomscroll', prompt: 'Doomscroll', duration: 10, points: 40,
    flavor: 'One more. Okay, one more. Where did forty minutes go.',
    zone: { x: 15, w: 2, feetFrom: 1, feetTo: 1 } },
  { id: 'guitar', piece: 'sofa', name: 'Play three chords', prompt: 'Play guitar', duration: 5, points: 55,
    flavor: 'Same three chords. Different, slightly worse, song.',
    zone: { x: 15, w: 2, feetFrom: 4, feetTo: 6 } },

  // Kitchen
  { id: 'fridge-stare', piece: 'spice-rack', name: 'Stare into the fridge', prompt: 'Open the fridge', duration: 3, points: 30,
    flavor: 'Nothing new has appeared since the last check.',
    zone: { x: 27, w: 1, feetFrom: 4, feetTo: 4 } },
  { id: 'humidifier', piece: 'fridge', name: 'Refill the humidifier', prompt: 'Refill the humidifier', duration: 4, points: 45,
    flavor: 'The air is now 4% less crunchy.',
    zone: { x: 25, w: 2, feetFrom: 6, feetTo: 6 } },
  { id: 'take-trash', piece: 'bin', name: 'Take out the trash', prompt: 'Take out the trash', duration: 4, points: 50,
    flavor: 'The bag was not full. You took it out anyway, out of spite.',
    zone: { x: 18, w: 1, feetFrom: 2, feetTo: 2 } },
  { id: 'cook', piece: 'stove', name: 'Cook dinner', prompt: 'Cook dinner', duration: 8, points: 90,
    flavor: 'Smoke alarm: silent, but judging.',
    zone: { x: 19, w: 3, feetFrom: 3, feetTo: 3 } },
  { id: 'dishes', piece: 'counter', name: 'Do the dishes', prompt: 'Do the dishes', duration: 7, points: 80,
    flavor: 'The pile regrows when you look away.',
    zone: { x: 22, w: 2, feetFrom: 3, feetTo: 3 } },
  { id: 'flatten-boxes', piece: 'boxes', name: 'Flatten the boxes', prompt: 'Flatten boxes', duration: 5, points: 45,
    flavor: 'You have been meaning to do this since spring.',
    zone: { x: 24, w: 1, feetFrom: 5, feetTo: 5 } },

  // Bath
  { id: 'brush-teeth', piece: 'vanity', name: 'Brush teeth', prompt: 'Brush teeth', duration: 3, points: 30,
    flavor: 'Two full minutes. Honest.',
    zone: { x: 28, w: 2, feetFrom: 3, feetTo: 3 } },
  { id: 'sit', piece: 'toilet', name: 'Take a moment', prompt: 'Take a moment', duration: 4, points: 20,
    flavor: 'Phone battery: 41%. Phone battery: 33%.',
    zone: { x: 30, w: 2, feetFrom: 2, feetTo: 2 } },
  { id: 'shower', piece: 'tub', name: 'Take a shower', prompt: 'Take a shower', duration: 6, points: 70,
    flavor: 'Best ideas of the day, all forgotten by the towel.',
    zone: { x: 32, w: 3, feetFrom: 2, feetTo: 2 } },
];
