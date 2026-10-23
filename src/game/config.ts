export const TILE = 16;

export const VIEW = {
  width: 20 * TILE,
  height: 12 * TILE,
};

export const TIMESTEP = 1 / 60;
// Longest frame we simulate in one go; protects against a spiral after a tab switch.
export const MAX_FRAME_TIME = 0.25;
