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
export interface PoseDef {
  sprite: string;
  on: string;
  at: { x: number; y: number };
  // The sprite's size, to draw it in front of whatever it overlaps.
  size: { w: number; h: number };
  replacesPiece?: boolean;
}

export const POSES: Record<string, PoseDef> = {
  // Sitting in the middle cushion of the sofa, seen from behind.
  "sit-sofa": { sprite: "player-sit-sofa", size: { w: 16, h: 32 }, on: "sofa-td", at: { x: 48, y: 0 } },
  "read-sofa": { sprite: "player-read-sofa", size: { w: 32, h: 32 }, on: "sofa-td", at: { x: 48, y: 0 } },
  // On the desk chair, with the desk's lower edge in front.
  "type-desk": { sprite: "player-type-desk", size: { w: 16, h: 32 }, on: "desk", at: { x: 32, y: 16 } },
  // On the stool south of the table.
  "eat-table": { sprite: "player-eat-table", size: { w: 16, h: 32 }, on: "table", at: { x: 24, y: 16 } },
  // Standing north of the guitar's wall hanger, holding it across the body: the
  // pose draws the guitar, so the hanging one is hidden.
  guitar: { sprite: "player-guitar", size: { w: 16, h: 48 }, on: "guitar", at: { x: 0, y: -16 }, replacesPiece: true },
  // The whole bed.
  "sleep-bed": { sprite: "player-sleep-bed", size: { w: 80, h: 96 }, on: "bed-made", at: { x: 0, y: 0 } },
};

// A small overlay drawn over the plain player, one file for each way they face:
// `held-<name>-<direction>`. It shows when there is no pose to draw, so it is
// also what a task shows if its pose art is missing.
export const HELD_ITEMS = ["mug", "laptop", "book", "guitar"] as const;
export type HeldItem = (typeof HELD_ITEMS)[number];

// Carrying a made coffee (state variable `mug` is 1) shows this item, whatever
// else the player is doing, unless a task shows its own.
export const CARRIED = { var: "mug", item: "mug" } as const;

export const heldSprite = (item: string, facing: string) => `held-${item}-${facing}`;
