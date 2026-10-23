import type { Level } from "./level";
import { TASKS } from "./tasks";
import { parseTileMap, type ObjectDef } from "./tilemap";

// The real apartment as three top-down rooms, one tile to a foot, each a
// screen of its own. docs/floor-plan.md explains the choices. Maps are drawn as
// the player sees them: the top of the map is the far (north) wall.
//
// Each map includes the one-tile wall around the room (and solid filler where
// the room is not a rectangle). Doorways are tiles in that wall; `arrive` is
// the floor tile just inside the room on the other side.
//
//   main room <-> kitchen   a two-tile passage: main west wall, kitchen east wall
//   kitchen   <-> bath      kitchen leg west wall, bath east wall
//
// `sprite` names come from docs/art-style.md; `color` is only the placeholder
// drawn when a sprite is missing.

// -- Main room: 17 by 8 feet ------------------------------------------------
// Far (north) wall, west to east: table, desk (with its chair), bookshelf
// standing out from the wall as a divider, then the queen bed in the east end
// with the nightstand above it and the radiator and windows on the east wall.
// There is one lane to walk: down the west side of the bed and along its foot.
// The sofa is on the south wall, which steps down toward the front door (the
// door is decoration for now): guitar by the sofa's west end, lamp table and
// record stand by its east end. The passage to the kitchen is in the west wall
// between the table and the sofa.
export const MAIN_MAP = [
  "##pp###qq#####uuu##",
  "#TTTTMDDDDH...NNNr#",
  "#TTTTMDDDDH.BBBBBr#",
  "1.......C.H.BBBBBrw",
  "2....@....H.BBBBB.w",
  "#GSSSSSS....BBBBB.#",
  "#.SSSSSSL...BBBBB.W",
  "########.R..BBBBB.W",
  "##########........#",
  "##########ff#######",
];

const MAIN: Record<string, ObjectDef> = {
  T: { name: "dining table", sprite: "table", color: "tangerine", tasks: ["coffee", "drink-coffee", "reheat", "eat-dinner"] },
  D: { name: "standing desk", sprite: "desk", color: "butter", tasks: ["work", "side-project-game", "journal", "tidy-desk"] },
  C: { name: "desk chair", sprite: "desk-chair", color: "ink" },
  H: { name: "cube bookshelf", sprite: "bookshelf", color: "butter", tasks: ["water-plant", "sort-records", "sort-records-year", "sort-records-fav", "sort-records-color"] },
  N: { name: "nightstand", sprite: "nightstand", color: "tangerine" },
  B: {
    name: "queen bed",
    sprite: "bed-made",
    color: "mist",
    tasks: ["make-bed", "sleep", "work-bed", "doomscroll"],
    // Shows whether it is made.
    variants: [
      { sprite: "bed-made", when: [{ var: "bedMade", min: 1 }], color: "leaf" },
      { sprite: "bed-unmade", color: "brick" },
    ],
  },
  r: { name: "radiator", sprite: "radiator", color: "paper" },
  w: { name: "window", sprite: "window", color: "mist" },
  W: {
    name: "window and blinds",
    sprite: "window-blinds",
    color: "mist",
    tasks: ["open-blinds", "close-blinds"],
    // Open or closed.
    variants: [
      { sprite: "window-blinds-open", when: [{ var: "blinds", min: 1 }], label: "BLINDS OPEN", color: "leaf" },
      { sprite: "window-blinds-closed", label: "BLINDS CLOSED", color: "mist" },
    ],
  },
  S: { name: "sofa", sprite: "sofa-td", color: "brick", tasks: ["doomscroll", "contemplate", "work-sofa", "nap", "admire-art"] },
  G: { name: "guitar", sprite: "guitar", color: "tangerine", tasks: ["guitar"] },
  L: { name: "lamp table", sprite: "lamp-table", color: "butter" },
  R: { name: "record stand", sprite: "record-stand", color: "paper", tasks: ["record-play"] },
  M: { name: "mic stand", sprite: "mic-stand", color: "ink" },
  p: { name: "painting over the table", sprite: "painting", color: "paper" },
  q: { name: "painting over the desk", sprite: "painting-desk", color: "paper" },
  u: { name: "painting over the nightstand", sprite: "painting-wide", color: "paper" },
  f: { name: "front door (decoration for now)", sprite: "front-door", color: "tangerine" },
  "1": { door: { to: "kitchen", arrive: { col: 11, row: 3, facing: "left" } } },
  "2": { door: { to: "kitchen", arrive: { col: 11, row: 4, facing: "left" } } },
};

// -- Kitchen: an L, 11 by 8 feet ---------------------------------------------
// The bar runs along the top (11 by 4): the sink, counter and stove against its
// south wall (the wall above the bath), the window in the west wall, the
// recycling, bin and boxes in the north-east corner. The leg drops down the
// east side (4 by 4) with the fridge against the east wall. The passage to the
// main room is in the east wall of the bar; the bath door is in the west wall
// of the leg. The solid block at the bottom left is the bath.
export const KITCHEN_MAP = [
  "#############",
  "#.......YNXX#",
  "c..........O#",
  "cCCCVVV.....1",
  "#CCCVVV.....2",
  "####hhh#.@..#",
  "########....#",
  "#######3..FF#",
  "########..FF#",
  "#############",
];

const KITCHEN: Record<string, ObjectDef> = {
  C: {
    name: "sink and counter",
    sprite: "counter",
    color: "butter",
    tasks: ["dishes"],
    // Shows how many dirty dishes there are.
    variants: [
      { sprite: "dishes-3", when: [{ var: "dishes", min: 3 }], color: "brick" },
      { sprite: "dishes-2", when: [{ var: "dishes", min: 2 }], color: "tangerine" },
      { sprite: "dishes-1", when: [{ var: "dishes", min: 1 }], color: "butter" },
      { sprite: "dishes-0", color: "butter" },
    ],
  },
  V: { name: "stove", sprite: "stove", color: "ink", tasks: ["cook"] },
  h: { name: "range hood", sprite: "hood", color: "paper" },
  Y: { name: "recycling", sprite: "recycling", color: "leaf", tasks: ["take-trash"] },
  N: { name: "trash bin", sprite: "bin", color: "slate", tasks: ["take-trash"] },
  X: { name: "box stack and pantry", sprite: "boxes", color: "tangerine", tasks: ["flatten-boxes"] },
  O: { name: "tote bag and shoes", sprite: "tote", color: "ink" },
  F: { name: "fridge", sprite: "fridge", color: "mist", tasks: ["fridge-stare", "humidifier"] },
  c: { name: "window curtain", sprite: "window-curtain", color: "mist" },
  "1": { door: { to: "main", arrive: { col: 1, row: 3, facing: "right" } } },
  "2": { door: { to: "main", arrive: { col: 1, row: 4, facing: "right" } } },
  "3": { door: { to: "bath", arrive: { col: 7, row: 3, facing: "left" } } },
};

// -- Bath: 7 by 4 feet -------------------------------------------------------
// The tub down the west wall, the toilet and the vanity sink against the north
// wall, and the door in the east wall, opening into the kitchen's leg.
export const BATH_MAP = [
  "#########",
  "#UU.QQVV#",
  "#UU.QQVV#",
  "#UU.....1",
  "#UU....@#",
  "#########",
];

const BATH: Record<string, ObjectDef> = {
  U: { name: "tub and curtain", sprite: "tub", color: "mist", tasks: ["shower"] },
  Q: { name: "toilet", sprite: "toilet", color: "paper", tasks: ["sit"] },
  V: { name: "vanity sink", sprite: "vanity", color: "paper", tasks: ["mirror-tired", "mirror-morning", "mirror-day", "mirror-night", "brush-teeth"] },
  "1": { door: { to: "kitchen", arrive: { col: 8, row: 7, facing: "right" } } },
};

// The map characters, besides `#`, that sit in a wall line rather than on the
// floor: windows, doors, paintings, the front door, the kitchen curtain and
// the range hood. See wall-tiles.ts for how the wall under them is drawn.
export const WALL_PIECES: Record<string, string> = {
  main: "pquwWf12",
  kitchen: "c123h",
  bath: "1",
};

export interface Apartment {
  // The room the game starts in.
  start: string;
  rooms: Record<string, Level>;
}

export const APARTMENT: Apartment = {
  start: "main",
  rooms: {
    main: parseTileMap(MAIN_MAP, MAIN, {
      id: "main", tasks: TASKS, facing: "down", floor: "floor-wood", wallPieces: WALL_PIECES.main,
    }),
    kitchen: parseTileMap(KITCHEN_MAP, KITCHEN, {
      id: "kitchen", tasks: TASKS, facing: "left", floor: "floor-kitchen", wallPieces: WALL_PIECES.kitchen,
    }),
    bath: parseTileMap(BATH_MAP, BATH, {
      id: "bath", tasks: TASKS, facing: "left", floor: "floor-bath", wallPieces: WALL_PIECES.bath,
    }),
  },
};
