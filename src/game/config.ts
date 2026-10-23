export const TILE = 16;

export const VIEW = {
  width: 20 * TILE,
  height: 12 * TILE,
};

// Game events. A touchdown slower than this (px/s) is not announced. Speed is
// sqrt(2 * gravity * drop): 100 is a drop of about 5 px, a one-tile (16 px)
// step down is about 165 and a full jump lands at about 260. This skips
// settling onto the floor at spawn and tiny lips; features should still scale
// what they do by the speed they are given.
export const EVENTS = {
  minLandSpeed: 100,
};

// Camera tuning. Distances are pixels.
export const CAMERA = {
  // How quickly the view catches up with the player, per second. Higher is snappier.
  followSpeed: 6,
  // The player can move this far from the centre of the view before it scrolls.
  deadzoneX: 24,
  deadzoneY: 16,
};

export const TIMESTEP = 1 / 60;
// Longest frame we simulate in one go; protects against a spiral after a tab switch.
export const MAX_FRAME_TIME = 0.25;

// Scoring tuning. Times are in seconds of game time.
export const SCORING = {
  // Repeating a task within this window scales its points by repeatDecay per
  // earlier completion (0.5 means 100%, 50%, 25%, ...).
  repeatWindow: 90,
  repeatDecay: 0.5,
  // Variety combo: each different task finished within comboWindow of the last
  // one extends the chain. The multiplier is 1 + comboStep per link after the
  // first, up to comboMaxMultiplier. Repeating a task in the chain restarts it.
  comboWindow: 25,
  comboStep: 0.5,
  comboMaxMultiplier: 3,
  // Every completion is worth at least this, however many repeats.
  minPoints: 1,
};

// Used when a task doesn't set its own cooldown.
export const DEFAULT_TASK_COOLDOWN = 10;

// An interact press is remembered this long (seconds) so one made just before
// a task ends, or just before the player lands, isn't lost.
export const INTERACT_BUFFER_TIME = 0.15;

// Movement tuning. Units are pixels and seconds.
export const PLAYER = {
  width: 10,
  height: 14,

  maxSpeed: 90,
  groundAccel: 700,
  groundFriction: 900,
  airAccel: 450,
  airFriction: 200,

  gravity: 900,
  maxFallSpeed: 320,

  // Peak height of a full-hold jump; the launch speed is derived from it. The
  // 60 Hz integration costs a little, so the real apex is about 37.8px.
  jumpHeight: 40,
  // Releasing jump while rising scales upward speed by this, for short hops.
  jumpCutFactor: 0.45,
  // Grace periods, in seconds.
  coyoteTime: 0.1,
  jumpBufferTime: 0.1,
};
