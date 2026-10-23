import { CONTEMPLATE } from "./dialog-data";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";

// A stand-in room to walk around in until the real apartment is planned top
// down (issue 020). One screen: 20 by 12 tiles.
const MAP = [
  "####################",
  "#..................#",
  "#.BB...........FF..#",
  "#.BB...........FF..#",
  "#..................#",
  "#......TTT.........#",
  "#......TTT.........#",
  "#..................#",
  "#.......@..........#",
  "#..CC..........SS..#",
  "#..................#",
  "####################",
];

export const PLACEHOLDER_LEVEL: Level = parseTileMap(MAP, {
  B: {
    color: "brick",
    task: {
      id: "nap",
      name: "Lie down for a bit",
      prompt: "Lie down for a bit",
      duration: 4,
      points: 15,
      cooldown: 60,
      flavor: "Just five minutes. It was not five minutes.",
    },
  },
  F: {
    color: "mist",
    task: {
      id: "fridge",
      name: "Raid the fridge",
      prompt: "Raid the fridge",
      duration: 1.5,
      points: 10,
      cooldown: 20,
      flavor: "Nothing new in there. Checked anyway.",
    },
  },
  S: {
    color: "paper",
    task: {
      id: "dishes",
      name: "Do the dishes",
      prompt: "Do the dishes",
      duration: 3,
      points: 20,
      cooldown: 45,
      flavor: "Somehow still more dishes.",
    },
  },
  C: {
    color: "leaf",
    task: {
      id: "contemplate",
      name: "Contemplate",
      prompt: "Contemplate",
      duration: 0,
      points: 5,
      cooldown: 30,
      dialog: CONTEMPLATE,
    },
  },
  T: { color: "tangerine" },
});
