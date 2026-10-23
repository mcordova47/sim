export const TILE = 16;

export const VIEW = {
  width: 20 * TILE,
  height: 12 * TILE,
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
// a task ends isn't lost.
export const INTERACT_BUFFER_TIME = 0.15;

// Walking. The player moves one tile at a time. Times are in seconds.
export const WALK = {
  // How long a step from one tile to the next takes.
  stepTime: 0.16,
  // Pressing a direction you are not facing first turns you; if you are still
  // holding it after this long, you step. A quicker tap only turns.
  turnTime: 0.08,
};

// The game clock. The day starts at the `initial` clock value in state-vars.ts.
export const CLOCK = {
  // Game minutes that pass per second of play (2 makes a day last 12 minutes).
  minutesPerSecond: 2,
  // From this hour on (and until `lateUntil`) it counts as late.
  lateFrom: 22,
  lateUntil: 5,
};

// Energy runs from 0 to 100 (see state-vars.ts).
export const ENERGY = {
  // Points lost per game hour just from being awake.
  fallPerHour: 4,
  // Below this the character is tired.
  lowBelow: 25,
  // While tired, a step takes this many times as long.
  tiredStepFactor: 1.6,
  // Below this a tired person can lie down and sleep.
  sleepBelow: 60,
};

// A nap on the sofa (issue 035): a short rest that does not unmake the bed.
export const NAP = {
  // Only sleepy enough to nap below this much energy.
  below: 75,
  // Energy it restores, and the game hours that go by.
  energy: 25,
  hours: 1,
};

// Activities (issue 022): what a task can be besides waiting.
export const ACTIVITY = {
  // How well a mini-game went (quality 0 to 1) scales the task's points between
  // these two. A task with no quality (a wait, a cutscene) is worth its usual points.
  minQualityFactor: 0.5,
  maxQualityFactor: 1.5,
};

// The key-mashing "work" mini-game: every key press types one more character.
export const TYPING = {
  // Characters per second that count as the best and the worst speed (quality 1 and 0).
  fastCps: 9,
  slowCps: 3,
  // If it isn't finished by then, it ends with quality 0.
  maxSeconds: 30,
  // How many lines of code to type, by default.
  lines: 2,
  // At most this many lines, and no line wider than this many pixels, so the
  // box fits the 320 px screen.
  maxLines: 6,
  maxLineWidth: 280,
};

// The key-notes mini-game: arrows appear one at a time and you press the same
// direction before the time is up.
export const NOTES = {
  // How many notes, by default.
  count: 6,
  // At most this many, so the row of notes fits the 320 px screen.
  maxCount: 14,
  // Seconds each note waits to be pressed.
  window: 1.2,
  // Seconds between notes, and before the first.
  gap: 0.3,
  leadIn: 0.6,
};

// Dialog boxes and menus.
export const DIALOG = {
  // How fast text appears, in characters per second.
  charsPerSecond: 45,
  // Lines of text in one page of the box.
  linesPerPage: 3,
  // While a dialog is open the game clock (task cooldowns, the combo timer)
  // stands still, so reading doesn't cost you anything. Set false to let
  // time run while a dialog is open.
  pauseClock: true,
  // Layout of the boxes, in pixels. The text box sits at the bottom of the screen.
  margin: 4,
  padding: 6,
  // Widest a line of text can be inside the text box.
  textWidth: VIEW.width - 2 * 4 - 2 * 6,
};

// Debug drawing, off in normal play.
export const DEBUG = {
  // Outline the task zones.
  zones: false,
};
