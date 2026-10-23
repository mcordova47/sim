import type { Interactable } from "./interactable";

// Stand-in tasks to prove the system out, placed on the placeholder room.
// Issue 005 replaces these with the real task list.
export const PLACEHOLDER_INTERACTABLES: Interactable[] = [
  {
    id: "fridge",
    name: "Raid the fridge",
    prompt: "Raid the fridge",
    duration: 1.5,
    points: 10,
    cooldown: 20,
    flavor: "Nothing new in there. Checked anyway.",
    // On top of the counter
    zone: { x: 248, y: 128, w: 56, h: 16 },
  },
  {
    id: "dishes",
    name: "Do the dishes",
    prompt: "Do the dishes",
    duration: 3,
    points: 20,
    cooldown: 45,
    flavor: "Somehow still more dishes.",
    // Floor, between the couch and the shelf
    zone: { x: 184, y: 160, w: 40, h: 16 },
  },
  {
    id: "nap",
    name: "Lie down for a bit",
    prompt: "Lie down for a bit",
    duration: 4,
    points: 15,
    cooldown: 60,
    flavor: "Just five minutes. It was not five minutes.",
    // On the loft bed
    zone: { x: 160, y: 90, w: 80, h: 14 },
  },
];
