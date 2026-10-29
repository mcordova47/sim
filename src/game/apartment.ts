import type { Level } from "./level";
import { TASKS } from "./tasks";
import { parseTileMap, type ObjectDef, type PropDef } from "./tilemap";

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
// door is decoration for now): guitar against the south wall at the sofa's west end, lamp table and
// record stand by its east end. The passage to the kitchen is in the west wall
// between the table and the sofa.
export const MAIN_MAP = [
  "##pp###qq#####uuu##",
  "#TTTTMDDDDH...NNNr#",
  "#TTTTMDDDDH.BBBBBr#",
  "1.......C.H.BBBBBrw",
  "2....@....H.BBBBB.w",
  "#.SSSSSS....BBBBB.#",
  "#GSSSSSSL...BBBBB.W",
  "########.R..BBBBB.W",
  "##########x.......#",
  "##########ff#######",
];

// The plant on the bookshelf (issue 063): its own piece on top of the bookshelf
// sprite, not drawn into it, so it can grow, droop, and later be swapped for
// another plant (a decor slot, issue 062). 16x16 at the south end of the top.
// Which sprite it shows comes from the plant in the slot (decor.ts `look`):
// drooping wins over the stage, and the stage is the growth so far.
const MAIN_PROPS: PropDef[] = [
  {
    name: "snake plant",
    slot: "plant-shelf",
    on: "H",
    at: { x: 0, y: 36 },
    size: { w: 16, h: 16 },
    sprite: "plant-0",
    color: "leaf",
  },
  // The mug waiting on the dining table (issue 065): there while nobody is
  // carrying coffee (`mug` 0), gone when a full mug is made (held-mug overlay) and
  // back after drinking it. Its own piece, so it could become a decor prop later.
  {
    name: "coffee mug",
    slot: "prop-table",
    on: "T",
    at: { x: 38, y: 11 },
    size: { w: 16, h: 16 },
    sprite: "mug-table",
    when: [{ var: "mug", max: 0 }],
    color: "tangerine",
  },
  // The phone on its charger (issue 088), on the nightstand: the place of "Charge your phone".
  // Scenery: its slot id is not registered for swapping, like the mug's.
  {
    name: "phone charger",
    slot: "prop-nightstand",
    on: "N",
    at: { x: 18, y: 0 },
    size: { w: 16, h: 16 },
    sprite: "phone-charger",
    color: "ink",
  },
];

const WINDOW_BLINDS: ObjectDef = {
  name: "window and blinds",
  sprite: "window-blinds",
  color: "mist",
  tasks: ["open-blinds", "close-blinds"],
  // Open or closed.
  variants: [
    { sprite: "window-blinds-open", when: [{ var: "blinds", min: 1 }], label: "BLINDS OPEN", color: "leaf" },
    { sprite: "window-blinds-closed", label: "BLINDS CLOSED", color: "mist" },
  ],
};

const MAIN: Record<string, ObjectDef> = {
  T: {
    name: "dining table",
    sprite: "table",
    color: "tangerine",
    tasks: ["coffee", "drink-coffee", "reheat", "eat-dinner", "swap-art-table"],
    // The dinner plate is there only after reheating or cooking, until you eat (issue 065).
    variants: [
      { sprite: "table-plate", when: [{ var: "plate", min: 1 }], color: "tangerine" },
      { sprite: "table", color: "tangerine" },
    ],
  },
  D: { name: "standing desk", sprite: "desk", color: "butter", tasks: ["work", "side-project-game", "journal", "tidy-desk", "make-track", "study-spanish", "swap-art-desk"] },
  C: { name: "desk chair", sprite: "desk-chair", color: "ink" },
  H: { name: "cube bookshelf", sprite: "bookshelf", color: "butter", tasks: ["water-plant-droop", "water-plant", "check-plant", "sort-records", "sort-records-year", "sort-records-fav", "sort-records-color", "swap-plant-shelf"] },
  N: { name: "nightstand", sprite: "nightstand", color: "tangerine", tasks: ["charge-phone", "swap-art-bed"] },
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
  // Both east windows have blinds and follow the one `blinds` state (issue 065),
  // so either window's task changes both. The plain `window` sprite was deleted in issue 101.
  w: WINDOW_BLINDS,
  W: WINDOW_BLINDS,
  S: { name: "sofa", sprite: "sofa-td", color: "brick", tasks: ["doomscroll", "scroll-photos", "contemplate", "work-sofa", "nap", "admire-art"] },
  G: {
    name: "guitar",
    sprite: "guitar",
    color: "tangerine",
    tasks: ["guitar"],
    // On its stand, or the empty stand while it is being played (issue 107; `guitarOut` follows the task).
    variants: [
      { sprite: "guitar-stand", when: [{ var: "guitarOut", min: 1 }], color: "tangerine" },
      { sprite: "guitar", color: "tangerine" },
    ],
  },
  L: { name: "lamp table", sprite: "lamp-table", color: "butter", slot: "lamp-sofa", tasks: ["swap-lamp-sofa"] },
  R: { name: "record stand", sprite: "record-stand", color: "paper", tasks: ["record-play"] },
  M: { name: "mic stand", sprite: "mic-stand", color: "ink" },
  // The paintings are decor slots (issue 062): what hangs there comes from the
  // decor store, and these are today's pictures.
  p: { name: "painting over the table", sprite: "painting", color: "paper", slot: "art-table" },
  q: { name: "painting over the desk", sprite: "painting-desk", color: "paper", slot: "art-desk" },
  u: { name: "painting over the nightstand", sprite: "painting-wide", color: "paper", slot: "art-bed" },
  // The package spot (issue 062 stage 3a): the floor in front of the front door.
  // Plain floor until a package waits (the `parcel` state follows the delivery
  // queue); then a box is drawn here, it blocks the tile (you face it from the
  // next tile and press E) and the task is offered. The other tile in front of
  // the door stays open, so nothing is closed off.
  x: {
    name: "package by the door",
    blockedWhen: [{ var: "parcel", min: 1 }],
    color: "tangerine",
    tasks: ["collect-delivery"],
    variants: [{ sprite: "delivery-box", when: [{ var: "parcel", min: 1 }], label: "PACKAGE", color: "tangerine" }],
  },
  f: { name: "front door (decoration for now)", sprite: "front-door", color: "tangerine" },
  "1": { door: { to: "kitchen", arrive: { col: 11, row: 3, facing: "left" } } },
  "2": { door: { to: "kitchen", arrive: { col: 11, row: 4, facing: "left" } } },
};

// -- Kitchen: an L, 11 by 8 feet ---------------------------------------------
// The bar runs along the top (11 by 4): the sink, counter and stove against its
// south wall (the wall above the bath), the window in the west wall, the
// bin and boxes in the north-east corner with the pantry beside them (there is no
// recycling bin; the recycling goes out from the boxes, issue 071). The leg drops down the east
// side (4 by 4) with the fridge against the east wall. The passage to the
// main room is in the east wall of the bar; the bath door is in the west wall
// of the leg. The solid block at the bottom left is the bath.
export const KITCHEN_MAP = [
  "#############",
  "#........NXP#",
  "c..........P#",
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
  N: { name: "trash bin", sprite: "bin", color: "slate", tasks: ["take-trash"] },
  // The boxes follow the state variable `boxes` (issue 066): a stack, or flattened
  // after "Flatten the boxes", and gone after "Take out the recycling" (issue 070). A package opened at the front door brings the stack back.
  X: {
    name: "cardboard boxes",
    sprite: "boxes",
    color: "tangerine",
    tasks: ["flatten-boxes", "recycle-boxes"],
    variants: [
      { sprite: "boxes-gone", when: [{ var: "boxes", min: 2 }], color: "tangerine" },
      { sprite: "boxes", when: [{ var: "boxes", min: 1 }], color: "tangerine" },
      { sprite: "boxes-flat", color: "tangerine" },
    ],
  },
  // The pantry (issue 072): a stack of clear bins with food on top, its own piece, 1 by 2 down the
  // east wall. A decor slot candidate (docs/decor.md), nothing to swap yet.
  P: { name: "pantry", sprite: "pantry", color: "mist", slot: "pantry" },
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
      id: "main", tasks: TASKS, facing: "down", floor: "floor-wood", wallPieces: WALL_PIECES.main, props: MAIN_PROPS,
    }),
    kitchen: parseTileMap(KITCHEN_MAP, KITCHEN, {
      id: "kitchen", tasks: TASKS, facing: "left", floor: "floor-kitchen", wallPieces: WALL_PIECES.kitchen,
    }),
    bath: parseTileMap(BATH_MAP, BATH, {
      id: "bath", tasks: TASKS, facing: "left", floor: "floor-bath", wallPieces: WALL_PIECES.bath,
    }),
  },
};
