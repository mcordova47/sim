import type { Milestone } from "./deliveries";

// Where gifts come from, for now (issue 062 stage 3a): milestones, each naming an
// item. The first time a number reaches `atLeast` the item is delivered (after
// `delayHours` game hours) and the milestone never fires again (the save
// remembers). Nothing is announced or counted on screen, and nothing is missable
// forever: a gift just turns up later. `stat`: lifetime `points`, `days` of game
// time played (24 game hours each, sleeping included), or lifetime `tasks` done.

// What a built game uses (issue 043 stage A, docs/random-encounters.md section 3):
// the first ten gifts, in order. A day gift arrives 2 game hours after the day is
// reached; an achievement gift 2 game hours after it unlocks. An owned item gives
// nothing (still fired). A test checks every item exists and none repeats.
const SOON = 2;
export const CHECKPOINTS: readonly Milestone[] = [
  { id: "gift-day-1", stat: "days", atLeast: 1, item: "art-robin", delayHours: SOON },
  { id: "gift-day-3", stat: "days", atLeast: 3, item: "art-concert-poster", delayHours: SOON },
  { id: "gift-day-5", stat: "days", atLeast: 5, item: "lamp-warm", delayHours: SOON },
  { id: "gift-green-thumb", achievement: "plant-3", item: "plant-dried", delayHours: SOON },
  { id: "gift-day-8", stat: "days", atLeast: 8, item: "art-snow-wagon", delayHours: SOON },
  { id: "gift-day-10", stat: "days", atLeast: 10, item: "lamp-stool-lamp", delayHours: SOON },
  { id: "gift-desk-job", achievement: "desk-all", item: "art-serenity-now", delayHours: SOON },
  { id: "gift-day-13", stat: "days", atLeast: 13, item: "art-canoes", delayHours: SOON },
  { id: "gift-record-keeper", achievement: "records-all", item: "lamp-candle", delayHours: SOON },
  { id: "gift-day-16", stat: "days", atLeast: 16, item: "art-great-wave", delayHours: SOON },
];

// For trying it in the dev server only (`?deliver=test`, decor-dev.ts): the TEST items.
export const DEV_CHECKPOINTS: readonly Milestone[] = [
  { id: "dev-points-20", stat: "points", atLeast: 20, item: "art-test-barn", delayHours: 1 },
  { id: "dev-tasks-3", stat: "tasks", atLeast: 3, item: "plant-test-grown", delayHours: 1 },
  { id: "dev-days-1", stat: "days", atLeast: 1, item: "lamp-test-stool", delayHours: 0.5 },
];
