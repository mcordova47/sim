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
// Which mirror line you get (issue 041): worn out beats the hour; otherwise
// morning, day and night by the clock (hours; the edges are shared, and the
// first task listed that can start wins).
export const MIRROR = {
  tiredBelow: 25,
  morningFrom: 5,
  dayFrom: 12,
  nightFrom: 21,
};

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

// Mood runs from 0 to 100 (see state-vars.ts). It is a nudge, not a lock:
// nothing is ever refused for low mood.
export const MOOD = {
  // The middle that mood drifts back toward, and how many points it moves per
  // game hour, so it is never stuck at either end.
  rest: 50,
  driftPerHour: 3,
  // Below this the character is down: they sigh once when they cross it.
  lowBelow: 25,
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

// Achievements, toasts and saved progress (issue 009c). Times are in seconds.
export const ACHIEVEMENTS_UI = {
  // The saved progress lives under this localStorage key. Bump the number to
  // start everyone's progress afresh (an old save under the old key is left alone).
  storageKey: "life.progress.v1",
  // How the player opens the list of achievements (a KeyboardEvent.code). Not Tab,
  // Escape, E, X or the arrows, which other features use.
  listKey: "KeyL",
  // Progress is saved this often as well as when a task finishes, an achievement
  // unlocks and the page is hidden.
  saveEvery: 10,
  // Achievements are checked this often for the ones that depend on time played.
  checkEvery: 1,
  // A toast shows this long in total, including sliding in and out.
  toastSeconds: 4,
  toastSlide: 0.35,
  // At most this many toasts are shown at once; the rest wait their turn.
  maxToasts: 2,
  // Pixels a toast travels while it slides (it fades as it goes and always stays on screen).
  slideDistance: 24,
  // Toast box: width, padding, the gap between stacked toasts and from the screen edge.
  toastWidth: 150,
  toastPadding: 4,
  toastGap: 3,
  toastMargin: 2,
};

// Time of day (issue 009d). The clock itself is `CLOCK` above and the `clock`
// state variable; this is how the light and the task bonuses follow it.
// A color is a palette name (see render/colors.ts); alpha is 0 to 1.
export interface TintKey {
  // Hour of the day, 0 up to 24. The first key is at 0 and the last at 24,
  // with the same look, so the day comes round with no jump at midnight.
  hour: number;
  color: "night" | "dusk" | "tangerine" | "butter";
  alpha: number;
  // How much the lamps are on, 0 (day) to 1 (night): the glow near lamps.
  lamps: number;
}

export const TIME_OF_DAY = {
  // Finishing a task inside one of its `goodHours` multiplies its points by this.
  bonusMultiplier: 1.5,
  // The tint over the world. Between two keys the look blends smoothly; when
  // two keys have different colors, one fades out as the other fades in.
  tint: [
    { hour: 0, color: "night", alpha: 0.46, lamps: 1 },
    { hour: 4.5, color: "night", alpha: 0.46, lamps: 1 },
    { hour: 6, color: "dusk", alpha: 0.36, lamps: 0.7 },
    { hour: 7.25, color: "tangerine", alpha: 0.24, lamps: 0.3 },
    { hour: 9.5, color: "butter", alpha: 0, lamps: 0 },
    { hour: 16.5, color: "butter", alpha: 0, lamps: 0 },
    { hour: 18, color: "butter", alpha: 0.14, lamps: 0.2 },
    { hour: 19.5, color: "tangerine", alpha: 0.28, lamps: 0.5 },
    { hour: 21, color: "dusk", alpha: 0.4, lamps: 0.85 },
    { hour: 22.5, color: "night", alpha: 0.46, lamps: 1 },
    { hour: 24, color: "night", alpha: 0.46, lamps: 1 },
  ] as TintKey[],
  // How much of the outside light reaches each room (1 is all of it). The bath
  // has no window, so it only follows the hour a little.
  roomLight: { main: 1, kitchen: 0.85, bath: 0.5 } as Record<string, number>,
  // The main room's blinds: closed, they take this much light away at midday
  // (less at night, when there is no daylight to keep out).
  blindsClosedDim: 0.1,
  // A faint glow around lamps at night. `sprite` names the piece it sits on;
  // `radius` is in pixels; `alpha` is the strength at full night.
  glows: [
    { sprite: "lamp-table", radius: 40, alpha: 0.2 },
    { sprite: "desk", radius: 28, alpha: 0.1 },
  ],
};

// Developer shortcuts for trying the light (see time-of-day/feature.ts). They
// only exist in the dev server (`npm run dev`), never in a built game.
export const TIME_DEV = {
  // `?hour=19.5` starts the game at that hour; `?room=kitchen` starts in that room.
  hourParam: "hour",
  roomParam: "room",
  // Jump the clock one hour back and forward.
  backKey: "BracketLeft",
  forwardKey: "BracketRight",
};
