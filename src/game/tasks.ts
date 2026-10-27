import { CLOCK, ENERGY, MIRROR, NAP, SLEEP_WAKE } from "./config";
import { CONTEMPLATE, MIRROR_DAY, MIRROR_MORNING, MIRROR_NIGHT, MIRROR_TIRED } from "./dialog-data";
import { ART_SCENES } from "./art-pieces";
import { DECOR_SLOTS, type DecorKind } from "./decor-data";
import { REVIVE_REQUIRES, WATER_EFFECTS, WATER_REQUIRES } from "./plant";
import { SIDE_PROJECTS, sideProjectTask } from "./side-projects";
import type { Requirement } from "./state";
import type { Interactable } from "./interactable";
import type { HourWindow } from "./time-of-day/hours";
import { currentRecordMenu } from "./music/demo-library";
import { CODE_LINES, EMAIL_LINES, MIXED_LINES } from "./typing-text";

// Task content from the first version of the game: names, prompts, durations,
// points and a line of flavor, plus (below) what the tasks do to the apartment.
// Where a task happens (which object, which tile) is not here; the floor plan
// (`apartment.ts`) names tasks by id at the objects that offer them. The
// personal task list (issue 024) will replace and extend this.
export type Task = Omit<Interactable, "zones">;

const CONTENT: Task[] = [
  // Bed nook
  { id: 'make-bed', name: 'Make the bed', prompt: 'Make the bed', duration: 3, points: 30,
    flavor: 'It will be undone in eleven hours. Worth it.' },
  { id: 'open-blinds', name: 'Open the blinds', prompt: 'Open the blinds', duration: 1, points: 10,
    flavor: 'The outside is still there. Good to know.' },
  { id: 'close-blinds', name: 'Close the blinds', prompt: 'Close the blinds', duration: 1, points: 10,
    flavor: 'Now it is a cave. A cozy one.' },
  // The snake plant (issue 063): one of these is offered, by how it is doing.
  // Drooping first, then thirsty, then "still damp" (plant.ts has the rules).
  { id: 'water-plant-droop', name: 'Water the drooping snake plant', prompt: 'Water the drooping plant', duration: 2, points: 20,
    exclusive: 'plant', flavor: 'It perks up. It was only resting.' },
  { id: 'water-plant', name: 'Water the snake plant', prompt: 'Water the plant', duration: 2, points: 20,
    exclusive: 'plant', flavor: 'It has survived worse owners. It has not had worse owners.' },
  { id: 'check-plant', name: 'Check the snake plant', prompt: 'Check the plant', duration: 0, points: 2, cooldown: 60,
    exclusive: 'plant',
    activity: { type: 'cutscene', steps: [{ say: 'The soil is still damp. The plant is doing fine.' }] } },
  { id: 'sort-records', name: 'Alphabetize the records', prompt: 'Alphabetize records', duration: 6, points: 60,
    flavor: 'By artist. Then by mood. Then by artist again.' },

  { id: 'sort-records-year', name: 'Arrange records by year', prompt: 'Records by year', duration: 6, points: 60,
    flavor: 'Oldest first. Then the reissues start a fight.' },
  { id: 'sort-records-fav', name: 'Rank the records by favorites', prompt: 'Records by favorites', duration: 6, points: 60,
    flavor: 'Number one changed three times while you did it.' },
  { id: 'sort-records-color', name: 'Arrange records by color', prompt: 'Records by color', duration: 6, points: 60,
    flavor: 'It looks great. You can no longer find anything.' },

  // Work corner
  { id: 'work', name: 'Answer emails', prompt: 'Work at the desk', duration: 8, points: 80,
    flavor: 'Per my last email, you are doing great.' },
  { id: 'tidy-desk', name: 'Clean the desk', prompt: 'Clean the desk', duration: 4, points: 30,
    flavor: 'It was a pile. It is now several smaller piles.' },
  { id: 'journal', name: 'Write in the journal', prompt: 'Write in the journal', duration: 5, points: 50,
    flavor: 'Dear diary, I made coffee. It was a lot.' },
  // No cooldown (issue 068): the menu is always open to you. It pays only for a change of
  // record, at most once per MUSIC.payoutEveryMinutes (activities/record-player.ts).
  { id: 'record-play', name: 'Choose a record', prompt: 'Choose a record', duration: 2, points: 25, cooldown: 0 },
  // The track editor (issue 059): no points of its own and no cooldown, since
  // it is always open to you; saving a track pays (activities/make-track.ts).
  { id: 'make-track', name: 'Make a track', prompt: 'Make a track', duration: 0, points: 0, cooldown: 0 },

  // The real flashcards app, played through the computer (issue 026, docs/flashcards.md).
  { id: 'study-spanish', name: 'Study Spanish', prompt: 'Study Spanish', duration: 0, points: 0, cooldown: 0 },

  // Table
  { id: 'coffee', name: 'Make pour-over coffee', prompt: 'Make coffee', duration: 6, points: 70,
    flavor: 'Weigh, grind, bloom, wait. Peak civilization.' },
  { id: 'drink-coffee', name: 'Drink the coffee', prompt: 'Drink the coffee', duration: 3, points: 30,
    flavor: 'Still hot. Then suddenly not. Peak civilization, brief.' },
  { id: 'reheat', name: 'Reheat leftovers', prompt: 'Reheat leftovers', duration: 3, points: 25,
    flavor: 'Thirty seconds more. Thirty seconds more. Cold in the middle.' },
  { id: 'eat-dinner', name: 'Eat dinner', prompt: 'Eat dinner', duration: 7, points: 60,
    flavor: 'Eaten while watching something you have already seen.' },

  // Sofa
  { id: 'doomscroll', name: 'Doomscroll', prompt: 'Doomscroll', duration: 10, points: 40,
    flavor: 'One more. Okay, one more. Where did forty minutes go.' },
  { id: 'work-sofa', name: 'Code from the couch', prompt: 'Work from the couch', duration: 8, points: 60,
    flavor: 'Your back files a complaint.' },
  { id: 'nap', name: 'Take a nap', prompt: 'Take a nap', duration: 5, points: 30, // duration = SLEEP.nap total
    flavor: 'Twenty minutes, said the plan. The light has moved.' },
  { id: 'admire-art', name: 'Admire the art', prompt: 'Admire the art', duration: 0, points: 25,
    flavor: 'Nobody asked you to look at it this long.' },
  { id: 'work-bed', name: 'Work in bed', prompt: 'Work in bed', duration: 8, points: 50,
    flavor: 'A mistake you make on purpose.' },
  { id: 'guitar', name: 'Play three chords', prompt: 'Play guitar', duration: 5, points: 55,
    flavor: 'Same three chords. Different, slightly worse, song.' },

  // Kitchen
  { id: 'fridge-stare', name: 'Stare into the fridge', prompt: 'Open the fridge', duration: 3, points: 30,
    flavor: 'Nothing new has appeared since the last check.' },
  { id: 'humidifier', name: 'Refill the humidifier', prompt: 'Refill the humidifier', duration: 4, points: 45,
    flavor: 'The air is now 4% less crunchy.' },
  { id: 'take-trash', name: 'Take out the trash', prompt: 'Take out the trash', duration: 4, points: 50,
    flavor: 'The bag was not full. You took it out anyway, out of spite.' },
  // Issues 070 and 071: done at the boxes, and only offered there when they are flat.
  { id: 'recycle-boxes', name: 'Take out the recycling', prompt: 'Take out the recycling', duration: 5, points: 55,
    flavor: 'Down the stairs, into the bin, and the corner of the kitchen is yours again.' },
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

// What tasks change in the apartment and the character (issue 021). The numbers
// are a placeholder balance, carried over from the first demo room, until the
// personal task list (issue 024) sets them.
const dirty = (n: number) => ({ var: "dishes", add: n });
const NO_CLEAN_PLATES = { var: "dishes", max: 8, reason: "NO CLEAN PLATES" };

// One step of the record cycle: it is this ordering's turn when `recordSort`
// is `turn`, and doing it moves the cycle on (the variable wraps).
function sortStep(turn: number): Partial<Task> {
  return {
    cooldown: 45,
    requires: [{ var: "recordSort", min: turn, max: turn, reason: "TRY ANOTHER ORDER" }],
    effects: [{ var: "recordSort", add: 1 }],
  };
}

// A work task: typing the given lines.
function working(text: string[]): Partial<Task> {
  return {
    cooldown: 30,
    activity: { type: "typing", lines: 2, text },
    requires: [{ var: "energy", min: 10, reason: "TOO TIRED TO WORK" }],
    effects: [{ var: "energy", add: -15 }, { var: "mood", add: -5 }],
  };
}

// Issue 071: a task that already gates itself by state has no time cooldown as well, so the
// state alone says when it can be done again (docs/tasks.md has the audit).
const STATE_GATED = { cooldown: 0 };

const STATE_RULES: Record<string, Partial<Task>> = {
  "make-bed": {
    ...STATE_GATED,
    requires: [{ var: "bedMade", max: 0, reason: "BED IS MADE" }],
    effects: [{ var: "bedMade", set: 1 }, { var: "mood", add: 3 }],
  },
  dishes: {
    cooldown: 45,
    requires: [{ var: "dishes", min: 1, reason: "NO DIRTY DISHES" }],
    effects: [{ var: "dishes", set: 0 }, { var: "mood", add: -2 }],
    // More dishes, more points.
    pointsBonus: { var: "dishes", perUnit: 10 },
  },
  // The boxes are a stack (1), flat (0) or gone (2) (issues 066 and 070). Opening a package at the door puts the stack back.
  "flatten-boxes": {
    ...STATE_GATED,
    requires: [{ var: "boxes", min: 1, max: 1, reason: "NO BOXES TO FLATTEN" }],
    effects: [{ var: "boxes", set: 0 }],
  },
  // Flat boxes go out with the recycling, from the boxes themselves. With a stack or no boxes
  // it is not startable (and the game hides it), so only "Flatten the boxes" shows there.
  "recycle-boxes": {
    ...STATE_GATED,
    requires: [
      { var: "boxes", max: 1, reason: "NO BOXES TO TAKE OUT" },
      { var: "boxes", max: 0, reason: "FLATTEN THE BOXES FIRST" },
    ],
    effects: [{ var: "boxes", set: 2 }, { var: "mood", add: 3 }],
  },
  // Coffee alternates: the mug is empty, so you make it; it is full, so you drink it.
  coffee: {
    ...STATE_GATED,
    requires: [NO_CLEAN_PLATES, { var: "mug", max: 0, reason: "COFFEE IS WAITING" }],
    effects: [dirty(1), { var: "mug", set: 1 }, { var: "energy", add: 2 }, { var: "mood", add: 2 }],
  },
  "drink-coffee": {
    ...STATE_GATED,
    requires: [{ var: "mug", min: 1, reason: "NO COFFEE MADE" }],
    effects: [{ var: "mug", set: 0 }, { var: "energy", add: 8 }, { var: "mood", add: 4 }],
  },
  // The blinds alternate: open them if they are closed, close them if open.
  "open-blinds": {
    ...STATE_GATED,
    requires: [{ var: "blinds", max: 0, reason: "BLINDS ARE OPEN" }],
    effects: [{ var: "blinds", set: 1 }, { var: "mood", add: 5 }],
  },
  "close-blinds": {
    ...STATE_GATED,
    requires: [{ var: "blinds", min: 1, reason: "BLINDS ARE CLOSED" }],
    // Closing takes the light away again, so the mood from opening is undone: going back
    // and forth is a wash and cannot be used to raise mood.
    effects: [{ var: "blinds", set: 0 }, { var: "mood", add: -5 }],
  },
  // The records cycle by themselves: each ordering waits for its turn in
  // `recordSort`, and finishing one moves it on (after color, round to alphabetical).
  "sort-records": sortStep(0),
  "sort-records-year": sortStep(1),
  "sort-records-fav": sortStep(2),
  "sort-records-color": sortStep(3),
  // The rest of the mood table (small numbers; see docs/tasks.md).
  doomscroll: { effects: [{ var: "mood", add: -8 }] },
  journal: { effects: [{ var: "mood", add: 6 }], pointsBonus: { var: "mood", perUnit: 0.2 } },
  shower: { effects: [{ var: "mood", add: 6 }] },
  "brush-teeth": { effects: [{ var: "mood", add: 2 }] },
  "water-plant-droop": { ...STATE_GATED, requires: REVIVE_REQUIRES, effects: [...WATER_EFFECTS, { var: "mood", add: 4 }] },
  "water-plant": { ...STATE_GATED, requires: WATER_REQUIRES, effects: [...WATER_EFFECTS, { var: "mood", add: 3 }] },
  // Offered only when the other two are not (the soil is damp), so it never lies.
  "check-plant": {},
  "take-trash": { effects: [{ var: "mood", add: 2 }] },
  sit: { effects: [{ var: "mood", add: 2 }] },
  // A gag: moves piles around and changes nothing, so it pays points and little
  // else. A long cooldown keeps it from being farmed.
  "tidy-desk": { cooldown: 90 },
  nap: {
    cooldown: 60,
    activity: { type: "sleep", kind: "nap" },
    requires: [{ var: "energy", max: NAP.below, reason: "NOT SLEEPY ENOUGH" }],
    // The bed stays as it is: this is the sofa.
    effects: [{ var: "energy", add: NAP.energy }, { var: "clock", add: NAP.hours }, { var: "plantDry", add: NAP.hours }, { var: "mood", add: 3 }],
  },
  "admire-art": {
    cooldown: 60,
    effects: [{ var: "mood", add: 8 }, { var: "artPiece", add: 1 }],
    activity: {
      type: "cutscene",
      steps: [
        // No walk: the view is a picture of the south gallery wall. It pushes in
        // on one piece, then the next time on another (art-pieces.ts has the text).
        { view: "view-gallery-wall" },
        { pick: { var: "artPiece", scenes: ART_SCENES } },
      ],
    },
  },
  reheat: { requires: [NO_CLEAN_PLATES], effects: [dirty(1), { var: "plate", set: 1 }, { var: "energy", add: 8 }, { var: "mood", add: 2 }] },
  "eat-dinner": { requires: [NO_CLEAN_PLATES], effects: [dirty(2), { var: "plate", set: 0 }, { var: "energy", add: 15 }, { var: "mood", add: 6 }] },
  cook: { requires: [NO_CLEAN_PLATES], effects: [dirty(2), { var: "plate", set: 1 }, { var: "energy", add: 5 }, { var: "mood", add: 4 }] },
  // Mash keys to type. How fast it goes decides how well the work went. What
  // is typed depends on where: emails at the desk, code on the couch, a bit of
  // both in bed.
  work: working(EMAIL_LINES),
  "work-sofa": working(CODE_LINES),
  "work-bed": working(MIXED_LINES),
  // Press the arrows that appear.
  // Playing lifts mood, and more so when you are already in a good one.
  guitar: {
    activity: { type: "notes", count: 6 },
    effects: [{ var: "mood", add: 10 }],
    pointsBonus: { var: "mood", perUnit: 0.3 },
  },
  // The record player picks the soundtrack (issue 009a): a menu of the records
  // in music/tracks, and one to stop. Choosing pays like playing guitar does and
  // lifts mood a little, but only when it is a different record from the one on and
  // the payout window is over (issue 068); every other way out ends quietly. While a
  // record plays, mood climbs more (sound feature).
  "make-track": { activity: { type: "make-track" } },
  // Pays per delivered card from inside the activity, so no points of its own.
  "study-spanish": { activity: { type: "flashcards" } },
  "record-play": {
    effects: [{ var: "mood", add: 5 }],
    activity: { type: "record-player" },
    // Built when the player presses E, so it lists demos made since the game loaded.
    dialog: currentRecordMenu,
  },
};

// Looking in the mirror (issue 041): one task per variant, all on the vanity.
// The vanity offers the first that can start, so being worn out wins, and
// otherwise the hour decides. Each has its own cooldown, which also lets the
// vanity go back to brushing teeth in between. They share an `exclusive` name,
// so when two could start (worn out in the daytime) only the first is offered
// and the choice cycle never lists the mirror twice.
const mirror = (id: string, name: string, dialog: Task["dialog"], requires: Requirement[]): Task => ({
  id, name, prompt: "Look in mirror", duration: 0, points: 15, cooldown: 60, dialog, requires, exclusive: "mirror",
});
const MIRRORS: Task[] = [
  mirror("mirror-tired", "Look in mirror", MIRROR_TIRED, [
    { var: "energy", max: MIRROR.tiredBelow, reason: "NOT WORN OUT" },
  ]),
  mirror("mirror-morning", "Look in mirror", MIRROR_MORNING, [
    { var: "clock", min: MIRROR.morningFrom, max: MIRROR.dayFrom, reason: "NOT MORNING" },
  ]),
  mirror("mirror-day", "Look in mirror", MIRROR_DAY, [
    { var: "clock", min: MIRROR.dayFrom, max: MIRROR.nightFrom, reason: "NOT DAYTIME" },
  ]),
  mirror("mirror-night", "Look in mirror", MIRROR_NIGHT, [
    {
      anyOf: [{ var: "clock", min: MIRROR.nightFrom }, { var: "clock", max: MIRROR.morningFrom }],
      reason: "NOT NIGHT",
    },
  ]),
];

// How the player looks while a task runs (issue 045): a `pose` (a scene over
// the furniture they face) and/or a `held` item. See poses.ts. A pose plays only
// at the piece it belongs to, so doomscroll sits on the sofa but not on the bed;
// `held` is what is drawn when there is no pose.
const LOOKS: Record<string, Pick<Task, "pose" | "held">> = {
  doomscroll: { pose: "sit-sofa" },
  "work-sofa": { pose: "sit-sofa", held: "laptop" },
  nap: { pose: "sit-sofa" },
  "work-bed": { held: "laptop" },
  work: { pose: "type-desk", held: "laptop" },
  "study-spanish": { pose: "type-desk", held: "laptop" },
  journal: { held: "book" },
  guitar: { pose: "guitar", held: "guitar" },
  sleep: { pose: "sleep-bed" },
  "drink-coffee": { pose: "eat-table", held: "mug" },
  "eat-dinner": { pose: "eat-table" },
  reheat: { pose: "eat-table" },
};

// When each task is at its best (issue 009d): finishing it then pays
// TIME_OF_DAY.bonusMultiplier times the points. Hours since midnight, from up to
// (not including) to; a window with `to` before `from` runs past midnight.
// The mirror lines only exist in their own hours, so they match MIRROR.
const at = (from: number, to: number): HourWindow => ({ from, to });
const GOOD_HOURS: Record<string, HourWindow[]> = {
  "make-bed": [at(6, 11)],
  "open-blinds": [at(6, 10)],
  "close-blinds": [at(19, 24)],
  "water-plant": [at(7, 11)],
  "water-plant-droop": [at(7, 11)],
  "sort-records": [at(17, 23)],
  "sort-records-year": [at(17, 23)],
  "sort-records-fav": [at(17, 23)],
  "sort-records-color": [at(17, 23)],
  work: [at(9, 17)],
  "work-sofa": [at(9, 17)],
  "tidy-desk": [at(8, 11)],
  journal: [at(5, 8), at(20, 24)],
  "record-play": [at(17, 23)],
  coffee: [at(6, 11)],
  "drink-coffee": [at(6, 11)],
  reheat: [at(12, 14), at(18, 21)],
  "eat-dinner": [at(18, 21)],
  nap: [at(13, 16)],
  "admire-art": [at(15, 19)],
  guitar: [at(17, 23)],
  "take-trash": [at(18, 22)],
  cook: [at(17, 20)],
  dishes: [at(19, 23)],
  "brush-teeth": [at(6, 9), at(21, 24)],
  shower: [at(6, 10), at(20, 23)],
  sleep: [at(22, 4)],
  "mirror-morning": [at(6, 10)],
  "mirror-night": [at(21, 24)],
  contemplate: [at(22, 3)],
};

// Changing the decor (issue 062 stage 2): one task per slot that names an object.
// It opens the swap list (activities/swap-decor.ts) and is only offered when the
// slot has something else to put in it. It pays nothing, changes no mood and has
// no cooldown: arranging your things is not a chore to score.
const SWAP_PROMPT: Partial<Record<DecorKind, string>> = {
  art: "Change the painting",
  plant: "Change the plant",
  lamp: "Change the lamp",
};
export const swapTaskId = (slotId: string) => `swap-${slotId}`;
const SWAPS: Task[] = DECOR_SLOTS.filter((s) => s.object).map((s) => {
  const prompt = SWAP_PROMPT[s.kinds[0]] ?? "Change it";
  return { id: swapTaskId(s.id), name: prompt, prompt, duration: 0, points: 0, cooldown: 0, decorSlot: s.id, activity: { type: "swap-decor" } };
});

// Opening a delivered package (issue 062 stage 3a): no points, no cooldown, a quiet end.
const COLLECT: Task = { id: "collect-delivery", name: "Open the package", prompt: "Open the package", duration: 0, points: 0, cooldown: 0, delivery: true, activity: { type: "collect-delivery" } };

// Tasks that need the state or a dialog, so they are not in the content list above.
const EXTRA: Task[] = [
  COLLECT,
  {
    id: "sleep",
    name: "Go to sleep",
    prompt: "Go to sleep",
    duration: 9, // = SLEEP.sleep total (fall + asleep + wake)
    points: 40,
    cooldown: 60,
    activity: { type: "sleep", kind: "sleep" },
    flavor: "Just five minutes. It was not five minutes.",
    requires: [
      {
        anyOf: [
          { var: "energy", max: ENERGY.sleepBelow },
          { var: "clock", min: CLOCK.lateFrom },
          { var: "clock", max: CLOCK.lateUntil },
        ],
        reason: "NOT TIRED YET",
      },
    ],
    // At least seven hours go by (and never waking before 06:30), and the bed is a mess again.
    effects: [
      { var: "energy", set: 100 },
      { var: "bedMade", set: 0 },
      { var: "clock", wake: SLEEP_WAKE },
      { var: "plantDry", addSkipped: true },
      { var: "mood", add: 10 },
    ],
  },
  ...MIRRORS,
  ...SWAPS,
  ...SIDE_PROJECTS.map(sideProjectTask),
  {
    id: "contemplate",
    name: "Contemplate",
    prompt: "Contemplate",
    duration: 0,
    points: 5,
    cooldown: 30,
    dialog: CONTEMPLATE,
  },
];

export const TASKS: Task[] = [...CONTENT.map((t) => ({ ...t, ...STATE_RULES[t.id] })), ...EXTRA].map(
  (t) => ({ ...t, ...LOOKS[t.id] }),
).map((t) => (GOOD_HOURS[t.id] ? { ...t, goodHours: GOOD_HOURS[t.id] } : t));
