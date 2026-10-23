import type { Level } from "./level";
import { TASKS } from "./tasks";
import { parseTileMap, type ObjectDef } from "./tilemap";

// The real apartment as three top-down rooms, one tile to a foot, each a
// screen of its own. docs/floor-plan.md explains the choices. Maps are drawn as
// the player sees them: the top of the map is the far wall.
//
// Each map includes the one-tile wall around the room. Doorways are tiles in
// that wall; `arrive` is the floor tile just inside the room on the other side.
//
//   kitchen <-> main room   (kitchen east wall, main room west wall)
//   kitchen <-> bath        (kitchen south wall, bath north wall)
//
// `sprite` names come from docs/art-style.md; most are not drawn yet, and
// `color` is only the placeholder until they are.

// -- Main room: 17 by 8 feet ------------------------------------------------
// Far (north) wall, west to east: table, desk, bookshelf, a walkway with the
// window above it, then the queen bed in the east end. The sofa is on the near
// (south) wall, its arm sticking out at the east end (an L shape), with the
// guitar by its west end and the record stand by its east end.
const MAIN_MAP = [
  "##########W########",
  "#TTTTDDDDH.BBBBBBB#",
  "#TTTTDDDDH.BBBBBBB#",
  "#.......MH.BBBBBBB#",
  "1..........BBBBBBB#",
  "#..........BBBBBBB#",
  "#.....@..S........#",
  "#...SSSSSS........#",
  "#..GSSSSSSR.......#",
  "#####gggg##########",
];

const MAIN: Record<string, ObjectDef> = {
  T: { name: "dining table", sprite: "table", color: "tangerine", tasks: ["coffee", "reheat", "eat-dinner"] },
  D: { name: "standing desk", sprite: "desk", color: "butter", tasks: ["work", "journal"] },
  M: { name: "mic stand and key light", sprite: "mic-stand", color: "ink" },
  H: { name: "cube bookshelf", sprite: "bookshelf", color: "butter", tasks: ["water-plant", "sort-records"] },
  W: { name: "window and blinds", sprite: "window-blinds", color: "mist", tasks: ["open-blinds"] },
  B: { name: "queen bed", sprite: "bed-made", color: "mist", tasks: ["make-bed", "work", "doomscroll"] },
  S: { name: "sofa", sprite: "sofa-td", color: "brick", tasks: ["doomscroll", "work"] },
  G: { name: "guitar", sprite: "guitar", color: "tangerine", tasks: ["guitar"] },
  R: { name: "record stand", sprite: "record-stand", color: "paper", tasks: ["record-play"] },
  g: { name: "gallery wall", sprite: "gallery-wall", color: "paper" },
  "1": { door: { to: "kitchen", arrive: { col: 11, row: 4, facing: "left" } } },
};

// -- Kitchen: 11 by 8 feet --------------------------------------------------
// North wall, west to east: fridge with the side rack, then the bin and the
// tote bag by the door. The L-shaped counter with the sink and the stove run
// along the south wall, the box stack is in the south-east corner. The door to
// the main room is in the east wall, the door to the bath in the south wall.
const KITCHEN_MAP = [
  "#############",
  "#.FFK.....NO#",
  "#.FF........#",
  "#...........#",
  "#.........@.1",
  "#...........#",
  "#...C.......#",
  "c...C..VVV.X#",
  "c...CCCVVV.X#",
  "##2####hhh###",
];

const KITCHEN: Record<string, ObjectDef> = {
  F: { name: "fridge", sprite: "fridge", color: "mist", tasks: ["fridge-stare", "humidifier"] },
  K: { name: "side rack", sprite: "spice-rack", color: "paper" },
  N: { name: "trash bin", sprite: "bin", color: "slate", tasks: ["take-trash"] },
  O: { name: "tote bag and shoes", sprite: "tote", color: "ink" },
  C: { name: "counter and sink", sprite: "counter", color: "butter", tasks: ["dishes"] },
  V: { name: "stove", sprite: "stove", color: "ink", tasks: ["cook"] },
  X: { name: "box stack", sprite: "boxes", color: "tangerine", tasks: ["flatten-boxes"] },
  h: { name: "range hood", sprite: "hood", color: "paper" },
  c: { name: "window curtain", sprite: "window-curtain", color: "mist" },
  "1": { door: { to: "main", arrive: { col: 1, row: 4, facing: "right" } } },
  "2": { door: { to: "bath", arrive: { col: 1, row: 1, facing: "down" } } },
};

// -- Bath: 4 by 7 feet ------------------------------------------------------
// Along the east wall, north to south: vanity, toilet, tub. The door is in the
// north wall, at the west end, with a walkway beside the fixtures.
const BATH_MAP = [
  "#2####",
  "#@.VV#",
  "#..VV#",
  "#..QQ#",
  "#..QQ#",
  "#..UU#",
  "#..UU#",
  "#..UU#",
  "######",
];

const BATH: Record<string, ObjectDef> = {
  V: { name: "vanity sink", sprite: "vanity", color: "paper", tasks: ["brush-teeth"] },
  Q: { name: "toilet", sprite: "toilet", color: "paper", tasks: ["sit"] },
  U: { name: "tub and curtain", sprite: "tub", color: "mist", tasks: ["shower"] },
  "2": { door: { to: "kitchen", arrive: { col: 2, row: 8, facing: "up" } } },
};

export interface Apartment {
  // The room the game starts in.
  start: string;
  rooms: Record<string, Level>;
}

export const APARTMENT: Apartment = {
  start: "main",
  rooms: {
    main: parseTileMap(MAIN_MAP, MAIN, { id: "main", tasks: TASKS, facing: "down" }),
    kitchen: parseTileMap(KITCHEN_MAP, KITCHEN, { id: "kitchen", tasks: TASKS, facing: "left" }),
    bath: parseTileMap(BATH_MAP, BATH, { id: "bath", tasks: TASKS, facing: "down" }),
  },
};
