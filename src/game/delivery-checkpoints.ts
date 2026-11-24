import type { Milestone } from "./deliveries";

// Where gifts come from, for now (issue 062 stage 3a): milestones, each naming an
// item. The first time a number reaches `atLeast` the item is delivered (after
// `delayHours` game hours) and the milestone never fires again (the save
// remembers). Nothing is announced or counted on screen, and nothing is missable
// forever: a gift just turns up later. `stat`: lifetime `points`, `days` of game
// time played (24 game hours each, sleeping included), or lifetime `tasks` done.

// What a built game uses (issue 043 stage A, docs/random-encounters.md section 3):
// the first ten gifts, in order, then the plants of issue 147, the clothes (152) and the coffee gear (168). A day gift arrives 2 game hours after the day is
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
  // Plants for the shelf (issue 147), later than the first ten, live and dried in turn. The days are the planner's
  // default: change the number to move a gift.
  { id: "gift-day-21", stat: "days", atLeast: 21, item: "plant-pothos", delayHours: SOON },
  { id: "gift-day-24", stat: "days", atLeast: 24, item: "plant-pampas", delayHours: SOON },
  { id: "gift-day-27", stat: "days", atLeast: 27, item: "plant-monstera", delayHours: SOON },
  { id: "gift-day-30", stat: "days", atLeast: 30, item: "plant-lavender", delayHours: SOON },
  { id: "gift-day-33", stat: "days", atLeast: 33, item: "plant-spider", delayHours: SOON },
  { id: "gift-day-36", stat: "days", atLeast: 36, item: "plant-eucalyptus", delayHours: SOON },
  // Clothes (issue 152), after the plants. Planner's default days: change the number to move a gift.
  { id: "gift-day-39", stat: "days", atLeast: 39, item: "outfit-casual", delayHours: SOON },
  { id: "gift-day-42", stat: "days", atLeast: 42, item: "outfit-out", delayHours: SOON },
  { id: "gift-day-45", stat: "days", atLeast: 45, item: "outfit-pajamas", delayHours: SOON },
  { id: "gift-day-48", stat: "days", atLeast: 48, item: "outfit-casual-cardigan", delayHours: SOON },
  { id: "gift-day-51", stat: "days", atLeast: 51, item: "outfit-casual-hoodie", delayHours: SOON },
  { id: "gift-day-54", stat: "days", atLeast: 54, item: "outfit-casual-denim-jacket", delayHours: SOON },
  { id: "gift-day-57", stat: "days", atLeast: 57, item: "outfit-out-jacket-scarf", delayHours: SOON },
  { id: "gift-day-60", stat: "days", atLeast: 60, item: "outfit-out-button-up", delayHours: SOON },
  { id: "gift-day-63", stat: "days", atLeast: 63, item: "outfit-out-blazer", delayHours: SOON },
  { id: "gift-day-66", stat: "days", atLeast: 66, item: "outfit-out-peacoat", delayHours: SOON },
  { id: "gift-day-69", stat: "days", atLeast: 69, item: "outfit-pajamas-striped", delayHours: SOON },
  { id: "gift-day-72", stat: "days", atLeast: 72, item: "outfit-pajamas-robe", delayHours: SOON },
  // Rugs (issue 166, decision d4's default): only a starter pair is a checkpoint gift, the striped living-area rug on day 75 and the green bed rug on day 78,
  // after the last outfit (day 72). The other eight rugs are items with no checkpoint yet; they come through the random-encounter
  // pool when issue 163 is built. Change the number to move a gift.
  { id: "gift-day-75", stat: "days", atLeast: 75, item: "rug-striped", delayHours: SOON },
  { id: "gift-day-78", stat: "days", atLeast: 78, item: "rug-bed-field", delayHours: SOON },
  // Coffee gear (issue 168), after the outfits (day 72), the rugs (75, 78) and the trinkets (from 81): table apparatus first, then the stove's.
  // Planner's default days (three apart): change the number to move a gift.
  { id: "gift-day-85", stat: "days", atLeast: 85, item: "coffee-french-press", delayHours: SOON },
  { id: "gift-day-88", stat: "days", atLeast: 88, item: "coffee-drip-machine", delayHours: SOON },
  { id: "gift-day-91", stat: "days", atLeast: 91, item: "coffee-pod-machine", delayHours: SOON },
  { id: "gift-day-94", stat: "days", atLeast: 94, item: "coffee-percolator", delayHours: SOON },
  { id: "gift-day-97", stat: "days", atLeast: 97, item: "coffee-moka-pot", delayHours: SOON },
  { id: "gift-day-100", stat: "days", atLeast: 100, item: "coffee-briki", delayHours: SOON },
];

// For trying it in the dev server only (`?deliver=test`, decor-dev.ts): the TEST items.
export const DEV_CHECKPOINTS: readonly Milestone[] = [
  { id: "dev-points-20", stat: "points", atLeast: 20, item: "art-test-barn", delayHours: 1 },
  { id: "dev-tasks-3", stat: "tasks", atLeast: 3, item: "plant-test-grown", delayHours: 1 },
  { id: "dev-days-1", stat: "days", atLeast: 1, item: "lamp-test-stool", delayHours: 0.5 },
];
