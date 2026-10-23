export const TILE = 16;

export const VIEW = {
  width: 20 * TILE,
  height: 12 * TILE,
};

export const TIMESTEP = 1 / 60;
// Longest frame we simulate in one go; protects against a spiral after a tab switch.
export const MAX_FRAME_TIME = 0.25;

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

  // Peak height of a full-hold jump; the launch speed is derived from it.
  jumpHeight: 40,
  // Releasing jump while rising scales upward speed by this, for short hops.
  jumpCutFactor: 0.45,
  // Grace periods, in seconds.
  coyoteTime: 0.1,
  jumpBufferTime: 0.1,
};
