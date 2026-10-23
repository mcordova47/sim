import { VIEW } from "./config";
import type { Solid } from "./world";

// Stand-in geometry for testing movement. Issue 005 replaces this with the
// real apartment layout. Steps are kept within the player's jump height.
export const PLACEHOLDER_SOLIDS: Solid[] = [
  // Floor, ceiling, walls
  { x: 0, y: VIEW.height - 16, w: VIEW.width, h: 16 },
  { x: 0, y: 0, w: VIEW.width, h: 8 },
  { x: 0, y: 0, w: 8, h: VIEW.height },
  { x: VIEW.width - 8, y: 0, w: 8, h: VIEW.height },

  // Couch: a solid block
  { x: 32, y: 156, w: 64, h: 20 },
  // Counter: taller solid block
  { x: 248, y: 144, w: 56, h: 32 },
  // Shelf and loft bed: one-way platforms, jump up through them
  { x: 112, y: 140, w: 40, h: 4, oneWay: true },
  { x: 160, y: 104, w: 80, h: 6, oneWay: true },
];

export const PLACEHOLDER_SPAWN = { x: 160, y: VIEW.height - 16 - 14 };
