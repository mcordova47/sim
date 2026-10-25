import type { Milestone } from "./deliveries";

// Where gifts come from, for now (issue 062 stage 3a): milestones, each naming an
// item. The first time a number reaches `atLeast` the item is delivered (after
// `delayHours` game hours) and the milestone never fires again (the save
// remembers). Nothing is announced or counted on screen, and nothing is missable
// forever: a gift just turns up later. `stat`: lifetime `points`, `days` of game
// time played (24 game hours each, sleeping included), or lifetime `tasks` done.

// What a built game uses. Empty on purpose: real items need their art (stage 4).
export const CHECKPOINTS: readonly Milestone[] = [];

// For trying it in the dev server only (`?deliver=test`, decor-dev.ts): the TEST items.
export const DEV_CHECKPOINTS: readonly Milestone[] = [
  { id: "dev-points-20", stat: "points", atLeast: 20, item: "art-test-barn", delayHours: 1 },
  { id: "dev-tasks-3", stat: "tasks", atLeast: 3, item: "plant-test-grown", delayHours: 1 },
  { id: "dev-days-1", stat: "days", atLeast: 1, item: "lamp-test-stool", delayHours: 0.5 },
];
