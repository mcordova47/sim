import type { Check } from "./state";

// The doing poses and held items (issue 045). A task names a `pose` and/or a
// `held` item in tasks.ts; what they mean is here, as data.
//
// A pose is a small scene (the player sitting, lying or playing) drawn over the
// piece of furniture the player is facing, so it replaces that piece's pixels
// where it goes and the plain player is not drawn. `on` is the sprite name of
// the piece it belongs to: the pose only plays when the task is started at that
// piece (doomscroll works on the sofa and the bed, and only the sofa has a pose).
// `at` is where the pose's top-left goes, in pixels from the top-left of that
// piece. `replacesPiece` hides the piece's own sprite while the pose plays (the
// pose draws the whole thing).
export interface BreathBand {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PoseDef {
  // The sprite to draw, unless one of `variants` fits the state when the task
  // starts (the first whose `when` holds is used, as for a piece's looks).
  sprite: string;
  variants?: { sprite: string; when: Check[]; breath?: BreathBand }[];
  // The breath of the sleep sequence (issue 078): the part of the picture, in its
  // own pixels, that rises by one pixel with each breath. Without one the whole
  // picture moves (right when it is only the person, as on the sofa).
  breath?: BreathBand;
  on: string;
  at: { x: number; y: number };
  // The sprite's size, to draw it in front of whatever it overlaps.
  size: { w: number; h: number };
  replacesPiece?: boolean;
}

export const POSES: Record<string, PoseDef> = {
  // Sitting on the right-hand seat cushion of the sofa (x 49..88 of its 96 px),
  // seen from behind. The sprite is only the person, with no furniture of its
  // own, so the sofa's backrest and back rail show through below the shoulders. It is
  // as tall as the sofa (the lower half is empty) so it is drawn in front of it.
  "sit-sofa": { sprite: "player-sit-sofa", size: { w: 16, h: 32 }, on: "sofa-td", at: { x: 61, y: 0 } },
  // The same seat with a book held up on its left (the sprite is 32 wide, with the person on its right half).
  "read-sofa": { sprite: "player-read-sofa", size: { w: 32, h: 32 }, on: "sofa-td", at: { x: 45, y: 0 } },
  // On the desk chair, with the desk's lower edge in front.
  "type-desk": { sprite: "player-type-desk", size: { w: 16, h: 32 }, on: "desk", at: { x: 32, y: 16 } },
  // On the stool south of the table.
  "eat-table": { sprite: "player-eat-table", size: { w: 16, h: 32 }, on: "table", at: { x: 24, y: 16 } },
  // Standing north of the guitar's stand, holding it across the body. The piece shows
  // the empty stand while this plays (state var `guitarOut`), so the pose does not hide
  // it or know about it. It is two tiles wide
  // (issue 057): the player is on the left-hand tile and the neck runs out east
  // (Marc is right-handed) over col 2, row 4, the floor above the sofa's west
  // arm, in front of which it is drawn.
  guitar: { sprite: "player-guitar", size: { w: 32, h: 48 }, on: "guitar", at: { x: 0, y: -16 } },
  // The whole bed, with the sleeper in it. The bed looks different made and
  // unmade, so there is one sprite for each, picked when the task starts (the
  // covers are part of the picture, so they can't be one overlay for both).
  // The breath is a band of the covers over the chest: it starts on the line of
  // the shoulders and runs down through rows of flat covers, so lifting it by a
  // pixel moves the shoulder line and leaves no seam. Each picture has its own
  // (the unmade bed's covers sit a little higher and wider).
  "sleep-bed": {
    sprite: "player-sleep-bed",
    breath: { x: 6, y: 23, w: 31, h: 8 },
    variants: [{ sprite: "player-sleep-bed-unmade", when: [{ var: "bedMade", max: 0 }], breath: { x: 3, y: 21, w: 33, h: 7 } }],
    size: { w: 80, h: 96 },
    on: "bed-made",
    at: { x: 0, y: 0 },
  },
};

// The breath band to cut from `sprite` (the pose's own, or the variant's), or null
// when the whole picture should move.
export function breathBand(def: PoseDef, sprite: string): BreathBand | null {
  if (sprite === def.sprite) return def.breath ?? null;
  return def.variants?.find((v) => v.sprite === sprite)?.breath ?? def.breath ?? null;
}

// A small overlay drawn over the plain player, one file for each way they face:
// `held-<name>-<direction>`. It shows when there is no pose to draw, so it is
// also what a task shows if its pose art is missing.
export const HELD_ITEMS = ["mug", "laptop", "book", "guitar"] as const;
export type HeldItem = (typeof HELD_ITEMS)[number];

// Carrying a made coffee (state variable `mug` is 1) shows this item, whatever
// else the player is doing, unless a task shows its own.
export const CARRIED = { var: "mug", item: "mug" } as const;

export const heldSprite = (item: string, facing: string) => `held-${item}-${facing}`;
