import { CLOCK, ENERGY } from "./config";
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
  "#......TTT......CC.#",
  "#......TTT.........#",
  "#..................#",
  "#.......@..........#",
  "#..DD..........SS..#",
  "#..................#",
  "####################",
];

export const PLACEHOLDER_LEVEL: Level = parseTileMap(MAP, {
  B: {
    color: "brick",
    variants: [
      { sprite: "bed-made", when: [{ var: "bedMade", min: 1 }], label: "BED MADE", color: "leaf" },
      { sprite: "bed-unmade", label: "BED UNMADE", color: "brick" },
    ],
    tasks: [
      {
        id: "make-bed",
        name: "Make bed",
        prompt: "Make bed",
        duration: 3,
        points: 30,
        cooldown: 30,
        requires: [{ var: "bedMade", max: 0, reason: "BED IS MADE" }],
        effects: [{ var: "bedMade", set: 1 }],
      },
      {
        id: "sleep",
        name: "Go to sleep",
        prompt: "Go to sleep",
        duration: 6,
        points: 40,
        cooldown: 60,
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
        // Seven hours go by, the bed is a mess again.
        effects: [
          { var: "energy", set: 100 },
          { var: "bedMade", set: 0 },
          { var: "clock", add: 7 },
        ],
      },
    ],
  },
  F: {
    color: "mist",
    task: {
      id: "snack",
      name: "Make a snack",
      prompt: "Make a snack",
      duration: 1.5,
      points: 10,
      cooldown: 20,
      requires: [{ var: "dishes", max: 8, reason: "NO CLEAN PLATES" }],
      effects: [
        { var: "dishes", add: 1 },
        { var: "energy", add: 8 },
      ],
    },
  },
  S: {
    color: "paper",
    variants: [
      { sprite: "dishes-3", when: [{ var: "dishes", min: 3 }], label: "DISHES 3+", color: "brick" },
      { sprite: "dishes-2", when: [{ var: "dishes", min: 2 }], label: "DISHES 2", color: "tangerine" },
      { sprite: "dishes-1", when: [{ var: "dishes", min: 1 }], label: "DISHES 1", color: "butter" },
      { sprite: "dishes-0", label: "CLEAN", color: "paper" },
    ],
    task: {
      id: "dishes",
      name: "Do dishes",
      prompt: "Do dishes",
      duration: 3,
      points: 20,
      cooldown: 45,
      requires: [{ var: "dishes", min: 1, reason: "NO DIRTY DISHES" }],
      effects: [{ var: "dishes", set: 0 }],
      // More dishes, more points.
      pointsBonus: { var: "dishes", perUnit: 10 },
    },
  },
  D: {
    color: "dusk",
    task: {
      id: "work",
      name: "Answer emails",
      prompt: "Work at desk",
      duration: 5,
      points: 60,
      cooldown: 30,
      requires: [{ var: "energy", min: 10, reason: "TOO TIRED TO WORK" }],
      effects: [{ var: "energy", add: -15 }],
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
