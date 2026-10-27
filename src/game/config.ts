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

// The snake plant on the bookshelf (issue 063). Times are game hours, so a
// day is 24 of them and lasts 12 minutes of play. Quiet on purpose: nothing
// here is ever lost. The plant droops when it has been dry a long while, and
// the next watering perks it up again; it keeps the stage it had grown to.
export const PLANT = {
  // Stages are plantStage 0 sprout, 1 small, 2 full, 3 flowering (see plant.ts).
  lastStage: 3,
  // A watering only counts (and only moves it toward the next stage) when the
  // soil has had this long to dry out. Sooner than that it is "still damp".
  dampHours: 6,
  // Dry this long and the plant droops (the `plant-wilted` look).
  droopAfterHours: 96,
  // Waterings that count to grow out of stage 0, 1 and 2. A flowering plant is
  // as far as it goes.
  wateringsToGrow: [2, 3, 4],
  // The state variable that holds the hours since it was watered stops counting here.
  maxDryHours: 999,
};

// Limits for the saved decor (issue 062, docs/decor.md). A save someone edited
// by hand, or that grew without bound, is cut to these when it is read.
export const DECOR = {
  // Most item ids kept in the owned list.
  maxOwned: 500,
  // Longest id kept (a longer one cannot be a real item).
  maxIdLength: 64,
  // Most slot entries read from the saved placements.
  maxPlaced: 200,
};

// Deliveries (issue 062 stage 3a, docs/decor.md). Times are game hours.
export const DELIVERIES = {
  // Most items waiting to arrive plus waiting at the door; `deliver` refuses more.
  maxQueued: 20,
  // Longest delay kept (a longer one is cut to this).
  maxDelayHours: 24 * 14,
  // Most milestone ids remembered as fired in the save.
  maxFired: 200,
  // Largest game-hours total read from a save (a damaged number cannot go past this).
  maxHours: 1e7,
};

// Ad encounters (issue 043 stage B, docs/random-encounters.md section 4): after a
// completed doomscroll or Answer emails, an ad may appear as a standoff. Nothing is
// ever lost: mood only sets how strong the ad is. All the numbers live here.
export const ENCOUNTERS = {
  // The tasks (ids) whose completion rolls. `work-sofa` and `work-bed` do not.
  tasks: ["doomscroll", "work"] as readonly string[],
  // The roll per eligible completion, and the roll right after a failed unsubscribe.
  chance: 0.22,
  afterFailChance: 0.5,
  // Game hours between encounters, and after a failed unsubscribe.
  cooldownHours: 3,
  afterFailCooldownHours: 1.5,
  // Encounters per game day (a day is 24 game hours of the delivery clock).
  maxPerDay: 2,
  // No encounters before this many game days have been played (hours / 24 of the delivery clock,
  // counted like the checkpoint days).
  firstDay: 2,
  // Mood at and above which an Ignore never turns into a purchase.
  moodRef: 60,
  // Mood edges for the extra narrator line (tone only, no change to the odds).
  toneLow: 30,
  toneHigh: 80,
  // The impulse buy on Ignore: `impulseMax` at mood 0, falling in a straight line to 0 at
  // `moodRef`; Look closer adds `lookCloserImpulse` (only while mood is under `moodRef`).
  impulseMax: 0.4,
  lookCloserImpulse: 0.15,
  // Unsubscribe success: `at0` at mood 0 and `at100` at mood 100 (a straight line), minus
  // `persistencePenalty` per persistence level, kept between `min` and `max`.
  unsubscribe: { at0: 0.5, at100: 0.9, min: 0.05, max: 0.95 },
  persistencePenalty: 0.1,
  // Mood changes: Ignore, a successful unsubscribe, Add to cart (a real or an impulse one).
  mood: { ignore: 3, unsubscribe: 3, cart: 2, dismissal: 0 },
  // How long the card of an ad for something you already have shows, in seconds.
  dismissSeconds: 2,
  // A delivery for an ad purchase arrives "later today" up to this many hours, else "tomorrow".
  laterTodayHours: 6,
  // The last ads shown that are not shown again if another is possible, and the most kept in the save.
  recent: 3,
  maxSeen: 20,
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

// The sleep sequence (issue 078, docs/sleep.md): one table, two versions. Seconds
// unless marked.
export interface SleepSettings {
  // Fall asleep (the light dims), asleep (dark), wake (the light comes up to the new hour).
  fall: number;
  asleep: number;
  wake: number;
  // Extra night wash at full dark, on top of the hour's own light.
  darkAlpha: number;
  // The lamps' strength is multiplied by this at full dark (1: no change).
  darkLamps: number;
  // Seconds the banner takes to fade out at the start, and back in at the end.
  bannerFade: number;
  // After Escape: seconds for the light to go back to the hour you lay down at.
  escapeRestore: number;
  // The breath: one whole pixel of rise and fall every `breathPeriod` seconds (see `SLEEP_BREATH`).
  breathPeriod: number;
  breathPixels: number;
  snore: boolean;
  snoreGain: number;
  lullaby: boolean;
  lullabyGain: number;
  lullabyIn: number;
  lullabyInDelay: number;
  lullabyOut: number;
  duckTo: number;
  duckDown: number;
  duckUp: number;
  zEvery: [number, number];
  // The clock stands still during the sequence; the jump comes with the task's effects.
  holdClock: boolean;
}

// Where in one breath the chest is up (as fractions of `breathPeriod`): it rises
// from `riseAt`, is held up until `fallAt`, and the out-breath (and its snore)
// starts at `exhaleAt`.
export const SLEEP_BREATH = { riseAt: 0.15, fallAt: 0.65, exhaleAt: 0.4 };

// When you wake after Go to sleep (issue 078, stage 5): at least `atLeast` hours
// later, and never before `notBefore` o'clock in the morning. A 22:00 bedtime
// wakes at 06:30 and a 02:00 one at 09:00; going to bed at 14:00 wakes at 21:00.
export const SLEEP_WAKE = { atLeast: 7, notBefore: 6.5 };

export const SLEEP: { sleep: SleepSettings; nap: SleepSettings } = {
  sleep: {
    fall: 2, asleep: 5, wake: 2,
    darkAlpha: 0.38, darkLamps: 0.25, bannerFade: 1, escapeRestore: 0.4,
    breathPeriod: 3, breathPixels: 1, snore: true, snoreGain: 0.07,
    lullaby: true, lullabyGain: 0.55, lullabyIn: 1.5, lullabyInDelay: 0.3, lullabyOut: 2,
    duckTo: 0.12, duckDown: 1, duckUp: 1.5, zEvery: [1.4, 2.2], holdClock: true,
  },
  nap: {
    fall: 1, asleep: 2.5, wake: 1.5,
    darkAlpha: 0.4, darkLamps: 0.6, bannerFade: 0.5, escapeRestore: 0.4,
    breathPeriod: 2.4, breathPixels: 1, snore: false, snoreGain: 0,
    lullaby: false, lullabyGain: 0, lullabyIn: 0, lullabyInDelay: 0, lullabyOut: 0,
    duckTo: 1, duckDown: 0, duckUp: 0, zEvery: [1.2, 1.8], holdClock: true,
  },
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

// Making your own tracks (issue 059, docs/make-tracks.md). Marc's picks: the
// piano roll editor, 12 saved tracks, 24-letter names, up to 32 steps, a reward
// of 90 points and +6 mood once per 6 game hours for a track with real notes.
export const MAKE_TRACKS = {
  // Where made tracks, the draft and the reward cooldown are saved. Bump the
  // number to start afresh (an old save under the old key is left alone).
  storageKey: "life.tracks.v1",
  // A step is half a beat. Tracks are 16 steps by default and at most 32.
  stepBeats: 0.5,
  steps: { default: 16, max: 32, short: 16 },
  // A note is held for 1, 2 or 4 steps (the length key cycles through these).
  lengths: [1, 2, 4],
  maxNoteSteps: 4,
  // Tempo in beats per minute; the editor stays in a calmer range than the parser.
  tempo: { min: 60, max: 180, default: 100, step: 4 },
  // Pitches as MIDI numbers (C4 is 60): melody C3 to B5, bass C2 to B3.
  melody: { name: "melody", wave: "square", volume: 0.6, low: 48, high: 83, start: 60 },
  bass: { name: "bass", wave: "triangle", volume: 0.8, low: 36, high: 59, start: 36 },
  beat: { name: "beat", wave: "drums", volume: 0.5 },
  maxTracks: 12,
  nameMax: 24,
  // Letters, digits, space and a few marks. `#`, `:` and `[` would break a .track line.
  nameChars: /^[A-Za-z0-9 .,!?'()&-]+$/,
  maxTextBytes: 2048,
  // The save for one track, 2 KB, 12 of them and a draft stay far below this.
  maxSaveBytes: 64 * 1024,
  // Starting names are "Untitled 1", "Untitled 2", ...
  untitled: "Untitled",
  // Saving pays this much, but only for a track with enough notes, and then
  // not again until this many game hours have passed.
  reward: { points: 90, mood: 6, cooldownHours: 6, minNotes: 8, minChannels: 2 },
  // Seconds a message in the editor's footer stays.
  messageSeconds: 3,
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
  // Keys used inside the list screen (issue 075): D switches the dialog voice,
  // Shift+R then Y resets. Issue 043's ad blocker will want one more; keep it clear of these.
  dialogVoiceKey: "KeyD",
  // The ad blocker switch (issue 043 stage B), also in the list screen.
  adBlockerKey: "KeyB",
  // How long "AD BLOCKER: ON" shows after the key is pressed, in seconds.
  flashSeconds: 1.5,
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
  // A faint glow around things that are lit at night, other than decor items (a
  // decor item gives its own, `glow` in decor-data.ts: the lamp by the sofa).
  // `sprite` names the piece it sits on; `radius` is in pixels; `alpha` is the
  // strength at full night.
  glows: [
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

// Sound (issue 009a). Everything is made in code with Web Audio; nothing here
// is a file. Marc tunes by editing these numbers. Times are in seconds, pitches
// in Hz, loudness is 0 to 1 per voice (before the master volume).
export type ToneWave = "sine" | "square" | "triangle" | "sawtooth";

// One oscillator: it glides from `freq` to `endFreq` (if given) over `length`.
export interface ToneVoice {
  wave: ToneWave;
  freq: number;
  endFreq?: number;
  // Seconds after the effect starts (for a little melody).
  delay?: number;
  length: number;
  gain: number;
}

// A burst of filtered noise (a footstep, a thump).
export interface NoiseVoice {
  noise: "lowpass" | "bandpass" | "highpass";
  // The filter's centre or cut-off frequency.
  freq: number;
  q?: number;
  delay?: number;
  length: number;
  gain: number;
}

// A voice made the way a throat does: a source at one pitch (`freq`) shaped by
// resonances, one band-pass filter for each of `formants`. Only the source's
// pitch follows the pitch an effect is played at; the formants stay put.
export interface FormantVoice {
  source: ToneWave;
  freq: number;
  // `endFreq` slides the resonance to that frequency over the voice's length (a
  // glide is the mouth moving from one vowel to another).
  // `path` is a longer way for a resonance to move: the frequency it has reached
  // at each given fraction of the voice's length, in order (it starts at `freq`).
  // A diphthong is one voice whose resonances go from one vowel to the next.
  formants: { freq: number; endFreq?: number; path?: [number, number][]; q: number; gain: number }[];
  // The fraction of the voice's length it stays at full level before it dies away
  // (otherwise it starts dying away at once, as every other effect does).
  hold?: number;
  delay?: number;
  length: number;
  gain: number;
}

export type Voice = ToneVoice | NoiseVoice | FormantVoice;

export interface EffectDef {
  voices: Voice[];
  // "low" effects (footsteps, typing, text blips) are dropped first when many
  // sounds are already playing, so they never push out a chime.
  priority?: "low" | "normal";
}

// A note from the pentatonic scale, as a semitone offset from `base`.
const note = (semitones: number, base = 440) => Math.round(base * 2 ** (semitones / 12) * 100) / 100;

// Vowels by timbre, not by pitch (issue 026, the speech-like voice): two tones
// at the vowel's first two formant frequencies (Hz) over a low buzz, so the
// vowel is told apart by its sound and not by a note. The numbers are the usual
// textbook formants for the five Spanish vowels, nudged by a few percent (a
// formant is a range, not a point) so that the three sounds of a vowel, the two
// formants and the buzz, are not a simple ratio of each other: no octave, fifth,
// fourth or the like, to within 3 percent, which a test checks for every vowel.
// `stress` makes the same vowel longer and louder.
export const FORMANTS: Record<string, { f1: number; f2: number }> = {
  a: { f1: 708, f2: 1101 },
  e: { f1: 530, f2: 1711 },
  i: { f1: 265, f2: 2290 },
  o: { f1: 570, f2: 882 },
  u: { f1: 300, f2: 870 },
};
export const FORMANT_BUZZ = 137;
const formantEffect = ({ f1, f2 }: { f1: number; f2: number }, length: number, loud: number): EffectDef => ({
  priority: "low",
  voices: [
    { wave: "square", freq: f1, length, gain: 0.07 * loud },
    { wave: "triangle", freq: f2, length, gain: 0.05 * loud },
    { wave: "triangle", freq: FORMANT_BUZZ, length, gain: 0.08 * loud },
  ],
});
const formantEffects = (): Record<string, EffectDef> =>
  Object.fromEntries(
    Object.entries(FORMANTS).flatMap(([vowel, f]) => [
      [`voiceFormant${vowel.toUpperCase()}`, formantEffect(f, 0.09, 1)],
      [`voiceFormant${vowel.toUpperCase()}Stress`, formantEffect(f, 0.14, 1.4)],
    ]),
  );

// The same five vowels made the way a throat makes them (issue 026, the source-
// filter voice): a sawtooth at ONE pitch, `SOURCE_F0`, through two band-pass
// filters at the vowel's formants. Every vowel has the same pitch, and what
// changes between them is only which frequencies the filters let through. `q` is
// how narrow each resonance is and `level` how much of it is let through (the
// filters are narrow, so they need turning up).
export const SOURCE_F0 = 125;
const SOURCE_FORMANT = { q: 5, level: [2.4, 1.8] };
const filteredEffect = ({ f1, f2 }: { f1: number; f2: number }, length: number, loud: number): EffectDef => ({
  priority: "low",
  voices: [
    {
      source: "sawtooth",
      freq: SOURCE_F0,
      formants: [
        { freq: f1, q: SOURCE_FORMANT.q, gain: SOURCE_FORMANT.level[0] },
        { freq: f2, q: SOURCE_FORMANT.q, gain: SOURCE_FORMANT.level[1] },
      ],
      length,
      gain: 0.22 * loud,
    },
  ],
});
const filteredEffects = (): Record<string, EffectDef> =>
  Object.fromEntries(
    Object.entries(FORMANTS).flatMap(([vowel, f]) => [
      [`voiceFilt${vowel.toUpperCase()}`, filteredEffect(f, 0.09, 1)],
      [`voiceFilt${vowel.toUpperCase()}Stress`, filteredEffect(f, 0.14, 1.4)],
    ]),
  );

// The glides /j/ and /w/ as the mouth does them (the source-filter voice): not a
// tone sliding, but the resonances of a very short /i/ or /u/ moving to, or from,
// the neighbouring vowel's. `GLIDE_TARGET` says which vowel each aims at. One
// effect for each glide and each vowel it can sit next to: `voiceGlideJToE` is a
// /j/ going into an /e/ (bien), `voiceGlideJFromA` a /j/ ending an /a/ (aire).
export const GLIDE_TARGET: Record<string, string> = { j: "i", w: "u" };
const glideEffect = (from: { f1: number; f2: number }, to: { f1: number; f2: number }, length: number): EffectDef => ({
  priority: "low",
  voices: [
    {
      source: "sawtooth",
      freq: SOURCE_F0,
      formants: [
        { freq: from.f1, endFreq: to.f1, q: SOURCE_FORMANT.q, gain: SOURCE_FORMANT.level[0] },
        { freq: from.f2, endFreq: to.f2, q: SOURCE_FORMANT.q, gain: SOURCE_FORMANT.level[1] },
      ],
      length,
      gain: 0.2,
    },
  ],
});
const glideEffects = (): Record<string, EffectDef> =>
  Object.fromEntries(
    Object.entries(GLIDE_TARGET).flatMap(([glide, target]) =>
      Object.keys(FORMANTS).flatMap((vowel) => [
        [`voiceGlide${glide.toUpperCase()}To${vowel.toUpperCase()}`, glideEffect(FORMANTS[target], FORMANTS[vowel], 0.06)],
        [`voiceGlide${glide.toUpperCase()}From${vowel.toUpperCase()}`, glideEffect(FORMANTS[vowel], FORMANTS[target], 0.07)],
      ]),
    ),
  );

// How long the parts of a vowel and a glide take on the timeline, in seconds,
// which a diphthong adds up (FLASHCARDS.voice reads these too).
export const VOWEL_TIME = { plain: 0.1, stress: 0.15 };
export const GLIDE_TIME = { to: 0.06, from: 0.07 };

// A diphthong as one voice (the source-filter voice, style 9): an optional glide
// into a vowel and an optional glide out of it, the resonances moving from the
// first sound to the second without a break, as the mouth does. `voiceDiphJE` is
// bien (j into e), `voiceDiphAJ` aire (a out to j), `voiceDiphJAJ` the triphthong
// of estudiáis; each has a `Stress` twin with the longer, louder vowel. Two
// vowels in a row (a hiatus) are not made this way and stay two sounds.
// Most of a diphthong is the movement, so the resonances are on the move for most
// of its length and rest on the vowel only briefly: they reach the vowel at
// `onReach` of the way (a glide into it), leave it at `offLeave` (a glide out of
// it), and a triphthong reaches it at `triReach` and leaves at `triLeave`. The
// sound stays at full level until `hold` of the way, so that the end of the
// movement is heard and not left to the fade, and `level` is how loud it is
// (the stressed vowel is 1.4 times that). Heard from the first version: a long
// held vowel with the movement before or after it sounds like one held vowel,
// and a movement that comes during the fade is not heard at all.
export const DIPHTHONG_SHAPE = { onReach: 0.6, offLeave: 0.3, triReach: 0.3, triLeave: 0.6, hold: 0.85, level: 0.11 };
const diphthongEffect = (on: string, vowel: string, off: string, stress: boolean): EffectDef => {
  const toTime = on ? GLIDE_TIME.to : 0;
  const fromTime = off ? GLIDE_TIME.from : 0;
  const vowelTime = stress ? VOWEL_TIME.stress : VOWEL_TIME.plain;
  const total = toTime + vowelTime + fromTime;
  const S = DIPHTHONG_SHAPE;
  const keys: ("f1" | "f2")[] = ["f1", "f2"];
  return {
    priority: "low",
    voices: [
      {
        source: "sawtooth",
        freq: SOURCE_F0,
        formants: keys.map((k, i) => {
          const v = FORMANTS[vowel][k];
          const start = on ? FORMANTS[GLIDE_TARGET[on]][k] : v;
          const path: [number, number][] = [];
          const target = off ? FORMANTS[GLIDE_TARGET[off]][k] : v;
          if (on && off) path.push([S.triReach, v], [S.triLeave, v], [1, target]);
          else if (on) path.push([S.onReach, v]);
          else path.push([S.offLeave, v], [1, target]);
          return { freq: start, path, q: SOURCE_FORMANT.q, gain: SOURCE_FORMANT.level[i] };
        }),
        length: total,
        hold: S.hold,
        gain: S.level * (stress ? 1.4 : 1),
      },
    ],
  };
};
// A single vowel shaped like a diphthong: the same source and resonances as a
// plain filtered vowel but held at full level for `DIPHTHONG_SHAPE.hold` of its
// length and at `DIPHTHONG_SHAPE.level`, so it sits with the diphthongs (style 10
// on). A plain vowel dies away at once, which makes it sound short whatever its
// length: stretching it only lengthens the tail. `voiceHeldA` and `voiceHeldAStress`.
const heldVowelEffect = (vowel: string, stress: boolean): EffectDef => ({
  priority: "low",
  voices: [
    {
      source: "sawtooth",
      freq: SOURCE_F0,
      formants: [
        { freq: FORMANTS[vowel].f1, q: SOURCE_FORMANT.q, gain: SOURCE_FORMANT.level[0] },
        { freq: FORMANTS[vowel].f2, q: SOURCE_FORMANT.q, gain: SOURCE_FORMANT.level[1] },
      ],
      length: stress ? VOWEL_TIME.stress : VOWEL_TIME.plain,
      hold: DIPHTHONG_SHAPE.hold,
      gain: DIPHTHONG_SHAPE.level * (stress ? 1.4 : 1),
    },
  ],
});
const heldVowelEffects = (): Record<string, EffectDef> =>
  Object.fromEntries(
    Object.keys(FORMANTS).flatMap((vowel) => [
      [`voiceHeld${vowel.toUpperCase()}`, heldVowelEffect(vowel, false)],
      [`voiceHeld${vowel.toUpperCase()}Stress`, heldVowelEffect(vowel, true)],
    ]),
  );
const diphthongEffects = (): Record<string, EffectDef> => {
  const out: Record<string, EffectDef> = {};
  for (const on of ["", "j", "w"]) {
    for (const off of ["", "j", "w"]) {
      if (!on && !off) continue;
      for (const vowel of Object.keys(FORMANTS)) {
        const name = `voiceDiph${on.toUpperCase()}${vowel.toUpperCase()}${off.toUpperCase()}`;
        out[name] = diphthongEffect(on, vowel, off, false);
        out[`${name}Stress`] = diphthongEffect(on, vowel, off, true);
      }
    }
  }
  return out;
};

// The nasals and the voiced stops made from the same source as the vowels, so
// they sit at the voice's own pitch and not far below it: a murmur (the source
// through a low resonance, which is what a closed mouth lets out), with the
// resonance that tells the nasals apart faintly above it, and for the stops a
// short burst of noise as the mouth opens.
const NASAL_LOW = { freq: 250, q: 3, gain: 2.4 };
const nasalEffect = (place: number): EffectDef => ({
  priority: "low",
  voices: [
    {
      source: "sawtooth",
      freq: SOURCE_F0,
      formants: [NASAL_LOW, { freq: place, q: 4, gain: 0.6 }],
      length: 0.07,
      gain: 0.18,
    },
  ],
});
// How loud the burst of noise that ends a voiced stop (b d g) is, against the
// murmur before it. A burst is the pop as the lips or tongue let go; it is quiet
// next to the vowels, and raising this makes the stops crisper.
export const BURST_GAIN = 0.1;
const voicedStopEffect = (burst: number): EffectDef => ({
  priority: "low",
  voices: [
    { source: "sawtooth", freq: SOURCE_F0, formants: [{ ...NASAL_LOW, gain: 2 }], length: 0.045, gain: 0.12 },
    { noise: "bandpass", freq: burst, q: 1.2, delay: 0.03, length: 0.02, gain: BURST_GAIN },
  ],
});

export const SOUND = {
  // Whole-game loudness, 0 to 1. Kept modest on purpose.
  master: 0.35,
  // How loud the music is next to the effects (the music bus multiplies by this).
  musicLevel: 0.7,
  // At most this many effect voices (oscillators and noise bursts) at once;
  // low-priority effects need `maxVoices - lowReserve` or fewer already playing.
  maxVoices: 14,
  lowReserve: 6,
  // Mute toggle (a KeyboardEvent.code). Not Tab, Escape, E, X, L or the arrows,
  // which other features use. The typing game reads letters, so M is ignored while it runs.
  muteKey: "KeyM",
  // Where the sound settings are saved (muted, and the record on the player).
  storageKey: "life.sound.v1",
  // The small "MUTE" tag shows while muted, and "SOUND ON" shows this long after unmuting.
  indicatorSeconds: 1.5,
  // The line that names the record shows this long after a record is chosen,
  // and any time the player faces the record player.
  nowPlayingSeconds: 4,
  // Footsteps (issue 009a). Which floor each room has, and how each floor sounds.
  floors: { main: "wood", kitchen: "stone", bath: "tile" } as Record<string, string>,
  defaultFloor: "wood",
  // How loud a step is when tired (energy below ENERGY.lowBelow), and the
  // random wobble in pitch (0.1 is up to 10 percent either way).
  tiredStepGain: 0.55,
  stepPitchWobble: 0.12,
  // Combo (a variety chain of 2 or more): the pitch climbs by this many
  // semitones for each link after the first, and stops climbing at `maxSteps` links.
  combo: { semitonesPerStep: 2, maxSteps: 7 },
  // Text blips: one per this many characters that appear in a dialog.
  blipEveryChars: 3,
  // The experimental letters voice for dialog text (issue 075): the spelling
  // voice's per-letter sounds, one per `blipEveryChars` characters that appear
  // (the letter at that slot; a space or mark is a rest). Quiet next to the
  // flashcards (gain), a little random in pitch (0.04 is up to 4 percent either
  // way), and a jump of more than `skipAbove` characters in one frame (the text
  // was skipped) plays nothing.
  dialogLetters: { gain: 0.5, wobble: 0.04, skipAbove: 8 },
  // The dialog voices a player can choose between (the first is the default).
  dialogVoices: ["letters", "beep"] as const,
  // Mini-game keys. The notes game plays a different note for each arrow.
  noteKeys: { up: note(7), down: note(-5), left: note(0), right: note(4) } as Record<string, number>,
  effects: {
    stepWood: { priority: "low", voices: [{ noise: "lowpass", freq: 520, q: 0.7, length: 0.06, gain: 0.22 }] },
    stepStone: { priority: "low", voices: [{ noise: "bandpass", freq: 1500, q: 1.1, length: 0.045, gain: 0.2 }] },
    stepTile: { priority: "low", voices: [{ noise: "highpass", freq: 2600, q: 0.8, length: 0.035, gain: 0.14 }] },
    bump: {
      voices: [
        { wave: "sine", freq: 130, endFreq: 70, length: 0.09, gain: 0.35 },
        { noise: "lowpass", freq: 380, length: 0.05, gain: 0.15 },
      ],
    },
    taskStart: { voices: [{ wave: "triangle", freq: note(0, 392), endFreq: note(2, 392), length: 0.08, gain: 0.22 }] },
    // A pleasant chime: three rising notes (a major arpeggio).
    taskComplete: {
      voices: [
        { wave: "triangle", freq: note(0, 523.25), length: 0.16, gain: 0.3 },
        { wave: "triangle", freq: note(4, 523.25), delay: 0.09, length: 0.16, gain: 0.3 },
        { wave: "triangle", freq: note(7, 523.25), delay: 0.18, length: 0.34, gain: 0.3 },
      ],
    },
    // The combo effect is played after the chime; its pitch is raised for longer chains.
    combo: {
      voices: [
        { wave: "square", freq: 660, length: 0.07, gain: 0.12 },
        { wave: "square", freq: 880, delay: 0.07, length: 0.12, gain: 0.12 },
      ],
    },
    // A small sparkle for finishing a task at its good hour.
    goodHour: {
      voices: [
        { wave: "sine", freq: 1320, delay: 0.3, length: 0.1, gain: 0.14 },
        { wave: "sine", freq: 1760, delay: 0.38, length: 0.2, gain: 0.14 },
      ],
    },
    taskCancelled: { voices: [{ wave: "triangle", freq: 330, endFreq: 247, length: 0.1, gain: 0.18 }] },
    // A low blip when something is not ready (cooldown or a missing requirement).
    taskBlocked: { voices: [{ wave: "square", freq: 110, length: 0.07, gain: 0.16 }] },
    door: {
      voices: [
        { noise: "lowpass", freq: 300, length: 0.09, gain: 0.25 },
        { wave: "sine", freq: 180, endFreq: 120, length: 0.1, gain: 0.18 },
      ],
    },
    // Dialog text blips and menu picks.
    blip: { priority: "low", voices: [{ wave: "square", freq: 520, length: 0.025, gain: 0.07 }] },
    menuPick: { voices: [{ wave: "triangle", freq: 660, length: 0.06, gain: 0.16 }] },
    key: { priority: "low", voices: [{ noise: "bandpass", freq: 1800, q: 0.9, length: 0.02, gain: 0.12 }] },
    // Mumblespeak: one short soft blip per letter of Spanish being "spoken" (issue 026).
    mumble: { priority: "low", voices: [{ wave: "triangle", freq: 330, length: 0.05, gain: 0.16 }] },
    // A snore (issue 078), the quietest sound in the game: the out-breath, a low
    // buzz through two throat resonances with a little air under it.
    snore: {
      priority: "low",
      voices: [
        { source: "sawtooth", freq: 58, formants: [{ freq: 240, q: 3, gain: 2 }, { freq: 520, q: 4, gain: 1.2 }], length: 1.1, gain: SLEEP.sleep.snoreGain },
        { noise: "lowpass", freq: 300, q: 0.7, length: 1.3, gain: 0.04 },
      ],
    },
    ...formantEffects(),
    ...filteredEffects(),
    ...glideEffects(),
    ...diphthongEffects(),
    ...heldVowelEffects(),
    voiceFiltM: nasalEffect(1100),
    voiceFiltN: nasalEffect(1600),
    voiceFiltNY: nasalEffect(2200),
    // The /l/: the source through a low resonance and one around 1300 Hz, the
    // shape of a mouth with the tongue-tip up and the air going round the sides.
    voiceFiltL: {
      priority: "low",
      voices: [
        {
          source: "sawtooth",
          freq: SOURCE_F0,
          formants: [{ freq: 360, q: 4, gain: 2.2 }, { freq: 1300, q: 4, gain: 1.2 }],
          length: 0.06,
          gain: 0.2,
        },
      ],
    },
    voiceFiltB: voicedStopEffect(800),
    voiceFiltD: voicedStopEffect(3200),
    voiceFiltG: voicedStopEffect(1800),
    // The IPA voice (issue 026): one short sound per phoneme, in a chiptune
    // manner. Which symbol uses which effect, at what pitch and for how long on
    // the timeline is the table `FLASHCARDS.voice.symbols`.
    voiceVowel: {
      priority: "low",
      voices: [
        { wave: "square", freq: 330, length: 0.09, gain: 0.11 },
        { wave: "triangle", freq: 660, length: 0.09, gain: 0.05 },
      ],
    },
    voiceVowelStress: {
      priority: "low",
      voices: [
        { wave: "square", freq: 330, length: 0.14, gain: 0.16 },
        { wave: "triangle", freq: 660, length: 0.14, gain: 0.07 },
      ],
    },
    voiceStop: { priority: "low", voices: [{ noise: "bandpass", freq: 1500, q: 1.2, length: 0.025, gain: 0.14 }] },
    voiceVoicedStop: { priority: "low", voices: [{ wave: "triangle", freq: 170, length: 0.04, gain: 0.16 }] },
    voiceHiss: { priority: "low", voices: [{ noise: "bandpass", freq: 5000, q: 0.8, length: 0.07, gain: 0.09 }] },
    voiceNasal: { priority: "low", voices: [{ wave: "sine", freq: 160, length: 0.07, gain: 0.2 }] },
    voiceLiquid: { priority: "low", voices: [{ wave: "triangle", freq: 420, endFreq: 360, length: 0.05, gain: 0.16 }] },
    voiceTap: {
      priority: "low",
      voices: [
        { wave: "triangle", freq: 260, length: 0.02, gain: 0.16 },
        { wave: "triangle", freq: 230, delay: 0.025, length: 0.02, gain: 0.12 },
      ],
    },
    voiceTrill: {
      priority: "low",
      voices: [
        { wave: "triangle", freq: 240, length: 0.02, gain: 0.14 },
        { wave: "triangle", freq: 230, delay: 0.03, length: 0.02, gain: 0.14 },
        { wave: "triangle", freq: 220, delay: 0.06, length: 0.02, gain: 0.14 },
      ],
    },
    voiceGlideDown: { priority: "low", voices: [{ wave: "triangle", freq: 700, endFreq: 450, length: 0.05, gain: 0.14 }] },
    voiceGlideUp: { priority: "low", voices: [{ wave: "triangle", freq: 300, endFreq: 450, length: 0.05, gain: 0.14 }] },
    voiceAffricate: {
      priority: "low",
      voices: [
        { noise: "bandpass", freq: 2800, q: 1, length: 0.02, gain: 0.14 },
        { noise: "bandpass", freq: 4500, q: 0.8, delay: 0.02, length: 0.05, gain: 0.09 },
      ],
    },
    noteKey: { priority: "low", voices: [{ wave: "triangle", freq: 440, length: 0.14, gain: 0.22 }] },
    // An achievement toast: a short, bright two-note figure.
    toast: {
      voices: [
        { wave: "square", freq: note(0, 659.25), length: 0.1, gain: 0.12 },
        { wave: "square", freq: note(7, 659.25), delay: 0.1, length: 0.25, gain: 0.12 },
      ],
    },
    // The needle landing on a record: a soft crackle.
    needle: {
      voices: [
        { noise: "highpass", freq: 3000, length: 0.18, gain: 0.1 },
        { wave: "sine", freq: 90, length: 0.1, gain: 0.12 },
      ],
    },
    unmute: { voices: [{ wave: "triangle", freq: 523.25, length: 0.07, gain: 0.18 }] },
  } as Record<string, EffectDef>,
  // Named moments in a cutscene (`{ cue: "name" }`) that make a sound.
  cues: { "record-spin": "needle", "achievement": "toast" } as Record<string, string>,
};

// Music (issue 009a). Tracks are text files in src/game/music/tracks (see
// docs/music.md for the format); the record player picks one.
export const MUSIC = {
  // Loudness of one note in a channel, before the channel's own volume.
  noteGain: 0.2,
  // A note sounds for this much of its length, so repeated notes stay separate.
  legato: 0.92,
  attack: 0.008,
  // Seconds of notes scheduled ahead of the clock.
  lookahead: 0.25,
  // A note whose time has already passed by more than this is skipped (the tab
  // was in the background) instead of all played at once.
  skipLate: 0.08,
  // Lift to mood while a record plays (issue 038): `moodPerStep` more mood
  // every `everyGameMinutes` of game time, but never past `moodCap`.
  moodPerStep: 1,
  everyGameMinutes: 10,
  moodCap: 80,
  // Choosing a record pays (the task's points and mood) at most once per this many
  // game minutes (issue 068). A change inside the window still switches the record,
  // with no payout. Kept in the sound feature and saved with its settings.
  payoutEveryMinutes: 10,
  // Drum sounds for the "drums" channel: K kick, S snare, H hat. `length` is
  // how long the sound lasts, in seconds, whatever the note's length.
  drums: {
    K: [{ wave: "sine", freq: 150, endFreq: 45, length: 0.14, gain: 1.6 }],
    S: [
      { noise: "bandpass", freq: 1800, q: 0.8, length: 0.1, gain: 1.1 },
      { wave: "triangle", freq: 220, endFreq: 160, length: 0.07, gain: 0.7 },
    ],
    H: [{ noise: "highpass", freq: 6500, q: 0.7, length: 0.035, gain: 0.7 }],
  } as Record<string, Voice[]>,
};

// Particles (issue 009b). Small effects drawn in the world, as whole-pixel
// squares in palette colors (names from art/palette.json). Times are in seconds
// of game time, speeds in pixels per second, offsets in pixels. Marc tunes by
// editing these numbers; adding an effect to a task is one line in `taskEmitters`.
export type Range = [number, number];

export interface ParticleKind {
  // A key of `PARTICLE_SHAPES`.
  shape: string;
  // Palette names; each particle takes one of them (a burst can override this).
  colors: string[];
  life: Range;
  vx: Range;
  vy: Range;
  // Pixels per second squared; positive falls, negative rises.
  gravity: number;
  // Fraction of the speed lost each second (0 keeps it).
  drag: number;
  // A side to side wobble: how far it goes and how many times a second.
  sway?: { amp: number; hz: number };
  // The particle fades out over the last part of its life, starting at this
  // fraction of it (1 means it just vanishes).
  fadeFrom: number;
}

// Tiny pictures: `#` is a pixel, `.` is empty. Every pixel is a whole-pixel square.
export const PARTICLE_SHAPES: Record<string, string[]> = {
  dot: ["#"],
  dot2: ["##", "##"],
  // A Z, for sleeping.
  z: ["###", "..#", ".#.", "#..", "###"],
  // An eighth note.
  note: ["..#", "..##", "..#.#", "..#", "##", "##"],
  // A little four-point sparkle.
  sparkle: [".#.", "###", ".#."],
};

export type EmitterAnchor =
  // The task's zone (its object's tiles), measured from the zone's top-left.
  | { from: "zone"; dx: number; dy: number; spread?: number }
  // The pose sprite the task shows, from its top-left (needs the task's `pose`).
  | { from: "pose"; dx: number; dy: number; spread?: number }
  // A piece of the room by sprite name, from its top-left (only in the room that has it).
  | { from: "piece"; sprite: string; dx: number; dy: number; spread?: number }
  // The player's tile, from its top-left; `byFacing` gives another spot for a
  // direction (the held mug is in a different place each way they face).
  | {
      from: "player";
      dx: number;
      dy: number;
      spread?: number;
      byFacing?: Partial<Record<"up" | "down" | "left" | "right", [number, number]>>;
    };

// Something that keeps making particles for as long as it applies.
export interface EmitterDef {
  kind: string;
  // Seconds between puffs, picked at random each time.
  every: Range;
  // How many particles each time (1 if missing).
  count?: Range;
  // A palette name that replaces the kind's colors (the z is darker on the pale bed).
  color?: string;
  at: EmitterAnchor;
  // Only while the sleep sequence is in one of these phases (issue 078); with no
  // list it goes on as long as the task runs.
  phases?: ("fall" | "asleep" | "wake")[];
}

// What an ambient emitter needs (all that are set must hold).
export interface AmbientWhen {
  // The state variable's value is at least this (and at most `max`).
  state?: { var: string; min?: number; max?: number };
  // A record is playing.
  music?: boolean;
  // No task is running (the player is free to walk).
  free?: boolean;
}

export const PARTICLES = {
  // At most this many live at once. When full, a new one replaces the oldest.
  budget: 200,
  // Particles older than this fraction of their life fade in this many steps
  // (so alpha is 1, 2/3, 1/3 and never a smooth fade).
  fadeSteps: 3,
  kinds: {
    // A step: a few specks kicked up behind the foot. Wood and stone puff a
    // little, tile (the bath) none.
    dustWood: { shape: "dot2", colors: ["paper", "putty"], life: [0.28, 0.42], vx: [-10, 10], vy: [-12, -4], gravity: 20, drag: 1.5, fadeFrom: 0.4 },
    dustStone: { shape: "dot2", colors: ["paper", "dusk"], life: [0.25, 0.38], vx: [-9, 9], vy: [-10, -3], gravity: 20, drag: 1.5, fadeFrom: 0.4 },
    // Running into a wall.
    bump: { shape: "dot", colors: ["paper", "putty"], life: [0.2, 0.35], vx: [-16, 16], vy: [-14, -3], gravity: 40, drag: 1, fadeFrom: 0.4 },
    // Task completion.
    confetti: { shape: "dot2", colors: ["butter", "paper"], life: [0.7, 1.1], vx: [-44, 44], vy: [-82, -34], gravity: 170, drag: 0.3, fadeFrom: 0.6 },
    confettiDull: { shape: "dot", colors: ["mist", "taupe"], life: [0.45, 0.7], vx: [-22, 22], vy: [-46, -20], gravity: 110, drag: 0.5, fadeFrom: 0.5 },
    // The good hour clock in the award popup.
    sparkle: { shape: "sparkle", colors: ["butter", "paper"], life: [0.5, 0.8], vx: [-3, 3], vy: [-17, -8], gravity: 0, drag: 0, fadeFrom: 0.3 },
    // Coffee and warm things.
    steam: { shape: "dot2", colors: ["paper"], life: [0.9, 1.4], vx: [-2, 2], vy: [-14, -8], gravity: 0, drag: 0, sway: { amp: 1.6, hz: 1.4 }, fadeFrom: 0.35 },
    // The sink.
    bubble: { shape: "dot2", colors: ["sky", "teal"], life: [0.9, 1.5], vx: [-3, 3], vy: [-16, -9], gravity: 0, drag: 0, sway: { amp: 1.5, hz: 1.1 }, fadeFrom: 0.6 },
    // Sleeping.
    z: { shape: "z", colors: ["paper"], life: [1.8, 2.4], vx: [3, 7], vy: [-9, -6], gravity: 0, drag: 0, sway: { amp: 1.5, hz: 0.7 }, fadeFrom: 0.5 },
    // Music.
    note: { shape: "note", colors: ["butter", "tangerine", "paper"], life: [1.5, 2.1], vx: [4, 9], vy: [-12, -8], gravity: 0, drag: 0, sway: { amp: 1.8, hz: 0.9 }, fadeFrom: 0.5 },
    // The plant grows or perks up (issue 063): a few green and pale bits drifting up.
    leafGlint: { shape: "dot2", colors: ["leaf", "paper", "butter"], life: [0.8, 1.3], vx: [-6, 6], vy: [-16, -7], gravity: 0, drag: 0.2, sway: { amp: 1.2, hz: 1 }, fadeFrom: 0.4 },
    // A sigh over the head when mood drops low.
    sigh: { shape: "dot2", colors: ["mist"], life: [0.8, 1.1], vx: [3, 9], vy: [-7, -3], gravity: 0, drag: 0.3, sway: { amp: 1, hz: 1 }, fadeFrom: 0.4 },
  } as Record<string, ParticleKind>,
  // Walking. Which floor each room has is `SOUND.floors`; a floor with no
  // entry here (tile) makes no dust.
  step: {
    // Where the puff starts: this far below the top of the tile the player left.
    footY: 14,
    puffs: {
      wood: { kind: "dustWood", count: [2, 3] },
      stone: { kind: "dustStone", count: [1, 2] },
    } as Record<string, { kind: string; count: Range }>,
    // Tired (energy below ENERGY.lowBelow) and shuffling: no dust.
  },
  bump: { kind: "bump", count: [3, 4] as Range },
  // A burst of squares from the task's zone when it completes.
  burst: {
    // The count for a chain of one, the extra for each further link, and the most.
    base: 8,
    perChain: 4,
    max: 40,
    // Colors by chain length (the last list serves every longer chain): one
    // color, two, then the multicolor confetti from the palette.
    colors: [
      ["butter", "paper"],
      ["butter", "tangerine", "paper"],
      ["brick", "tangerine", "butter", "leaf", "teal", "sky", "plum", "blush", "paper"],
    ] as string[][],
    kind: "confetti",
    // A repeat with diminishing returns (award.repeatFactor below 1): the
    // count is scaled by the factor (at least `minCount`), in duller colors.
    repeat: { kind: "confettiDull", minCount: 2 },
  },
  // The good hour sparkle, around the clock icon in the award popup. Where the
  // icon is follows from the popup's layout (render/popups.ts: a gap of `lineGap`
  // between lines, the amount line twice the text height, then the combo, repeat
  // and quality lines when they apply, then the icon line); the popup starts
  // out at the top of the task's zone and rises, and so do the sparkles.
  sparkle: { kind: "sparkle", count: [4, 5] as Range, spreadX: 11, spreadY: 6, lineGap: 2 },
  // The sigh over the head when mood drops below MOOD.lowBelow.
  sigh: { kind: "sigh", count: [3, 4] as Range, dx: 12, dy: 1, spread: 2 },
  // The plant grew a stage, or came back from drooping (issue 063): where it
  // sits on the bookshelf piece (`plant-shelf`, see apartment.ts).
  plantGrow: {
    kind: "leafGlint",
    count: [7, 9] as Range,
    at: { from: "piece", sprite: "bookshelf", dx: 8, dy: 42 } as EmitterAnchor,
    spread: { x: 5, y: 4 },
  },
  // Effects that go on while a task runs, by task id.
  taskEmitters: {
    // Steam over the kettle and the dripper on the table.
    coffee: [
      { kind: "steam", every: [0.16, 0.3], at: { from: "zone", dx: 45, dy: 4, spread: 1 } },
      { kind: "steam", every: [0.4, 0.7], at: { from: "zone", dx: 56, dy: 5, spread: 1 } },
    ],
    // Steam from the mug while you drink it (the pose shows it on the table).
    "drink-coffee": [{ kind: "steam", every: [0.2, 0.35], at: { from: "pose", dx: 8, dy: 12, spread: 2 } }],
    // Bubbles from the sink.
    dishes: [{ kind: "bubble", every: [0.2, 0.4], at: { from: "zone", dx: 11, dy: 12, spread: 5 } }],
    // A z drifting up from the pillow, and from the sofa.
    // Only while asleep, a little slower than before the sequence (`SLEEP.*.zEvery`).
    sleep: [{ kind: "z", every: SLEEP.sleep.zEvery, phases: ["asleep"], color: "denim", at: { from: "pose", dx: 28, dy: 12, spread: 1 } }],
    nap: [{ kind: "z", every: SLEEP.nap.zEvery, phases: ["asleep"], at: { from: "pose", dx: 13, dy: 0, spread: 1 } }],
    // Notes from the guitar.
    guitar: [{ kind: "note", every: [0.6, 1.1], at: { from: "pose", dx: 23, dy: 3, spread: 2 } }],
  } as Record<string, EmitterDef[]>,
  // Effects that go on whatever the player is doing, while their condition holds.
  ambientEmitters: [
    // Steam from the mug of coffee you carry.
    {
      when: { state: { var: "mug", min: 1 }, free: true },
      emitter: { kind: "steam", every: [0.35, 0.6], at: { from: "player", dx: 12, dy: 7, spread: 1, byFacing: { up: [14, 8], down: [12, 7], left: [3, 7], right: [12, 7] } } },
    },
    // Notes from the record player while a record plays.
    {
      when: { music: true },
      emitter: { kind: "note", every: [1, 2], at: { from: "piece", sprite: "record-stand", dx: 8, dy: 2, spread: 3 } },
    },
  ] as { when: AmbientWhen; emitter: EmitterDef }[],
};

// Studying Spanish at the computer (issue 026, docs/flashcards.md). The cards
// and the schedule belong to the real flashcards app; these are only the
// game's own numbers.
export const FLASHCARDS = {
  // Where the sync key and the points cap are remembered. The key is typed in
  // by the player and is never in the code. Bump the number to start afresh.
  storageKey: "life.flashcards.v1",
  // A sync key is 32 characters of a-z and 0-9; a pasted link is longer.
  keyLength: 32,
  maxPastedChars: 300,
  // Points for each card answered "got it" and delivered to the server, and how
  // many such cards pay before the cap resets (a game day). "Again" pays nothing,
  // and nothing here is a streak or a penalty.
  pointsPerCard: 4,
  dailyCardCap: 20,
  capResetHours: 24,
  // Where a missed card comes back in the session, counted from the one just
  // missed (used by the demo deck; the real core owns this once it is wired).
  requeueGap: 5,
  // Where the flashcards app lives: its progress endpoint and its compiled
  // core. A Vite build can point elsewhere with `VITE_FLASHCARDS_ORIGIN` (a
  // preview deploy). The app's CORS list allows `*.mcord.dev` and Vite's dev
  // server on localhost:5173.
  origin: "https://palabras.mcord.dev",
  // The core's contract version. The game imports `core.v<version>.js` and
  // refuses a module that reports another, so a breaking change on the app's
  // side is a decision here too.
  coreVersion: 1,
  language: "es",
  // Which dialect's transcriptions the voice asks the core for (a BCP 47 tag, the
  // name of the app's `IPA <tag>` column).
  dialect: "es-MX",
  // Mumblespeak: the Spanish side is "spoken" as a run of short blips, one per
  // letter (a space or a mark is a rest), in the manner of Animal Crossing. The
  // pitch of a letter is fixed, so a word always sounds the same. A pitch is a
  // multiple of the blip's base frequency.
  mumble: {
    lettersPerSecond: 13,
    // Longest run spoken, so a long example sentence does not drone on.
    maxChars: 40,
    // Vowels sit in a higher, rounder band; consonants wobble below them.
    vowelPitch: { a: 1.0, e: 1.25, i: 1.5, o: 0.85, u: 0.7 } as Record<string, number>,
    consonantPitches: [0.6, 0.66, 0.75, 0.8, 0.9, 0.95, 1.1, 1.2],
    // The key that says it again.
    repeatKey: "KeyR",
  },
  // The IPA voice: one sound per phoneme of a card's transcription, so the
  // rhythm follows how the word is said and not how it is spelled. Each symbol
  // names a sound effect (see `SOUND.effects`, `voice*`), a pitch (a multiple
  // of that effect's frequencies; for noise it moves the filter) and how long
  // it takes on the timeline, in seconds. Sounds may overlap their slot.
  voice: {
    // The pause for a space or a word break in the transcription.
    gap: 0.1,
    // Longest run, in phonemes.
    maxPhonemes: 80,
    // A vowel after the stress mark (the ˈ before its syllable) is longer,
    // louder and a little higher. A long vowel (ː) lasts this much longer.
    stress: { effect: "voiceVowelStress", pitch: 1.1, length: 0.15 },
    // The speech-like voice, in parts that each add to the one before (V steps
    // down through them in the practice deck, from the best: see `style` below). Part 1, `formants`: vowels by timbre (FORMANTS above)
    // at one pitch, stress by length and loudness only. Part 2, `intonation`: the
    // pitch of everything drifts down over the phrase, the stressed vowel gets a
    // small bump and the last vowel falls (fractions of the pitch, so 0.07 is
    // 7 percent, a little over a semitone). Part 3, `jitter`: every sound is a
    // few percent off, in a fixed pattern, so no two vowels are quite alike.
    formants: { length: VOWEL_TIME.plain, stressLength: VOWEL_TIME.stress },
    intonation: { declination: -0.08, stressBump: 0.07, finalFall: -0.06 },
    jitter: 0.03,
    // The source-filter voices (styles 5 and 6): vowels from a source at one pitch
    // through resonances, so no vowel is higher than another, and the whole voice
    // slowed by `slow` (2 is half speed; the sounds are stretched too).
    slow: 1.15,
    // Three timing variants of the diphthong voice to hear against it (V steps to
    // them after it): style 10 makes the single vowels longer (`longerVowels`, a
    // multiple of their length) and holds them at full level like a diphthong, so
    // they sit with the diphthongs; style 11 adds speed to everything (`faster`, a
    // multiple of the time it takes, 0.82 so that the words are about as long as
    // style 9's, which the longer vowels had made 20 percent longer); style 12
    // instead makes only the consonants quicker (`quickConsonants`) and leaves the
    // vowels and the pauses; style 13 is style 11 a little faster again (`fastest`,
    // 0.74, about 10 percent quicker than `faster`).
    variants: { longerVowels: 1.4, faster: 0.82, quickConsonants: 0.75, fastest: 0.74 },
    // Which voice a card gets before V is pressed (an index into `VOICE_STYLES`):
    // 0 spelling, 1 ipa (the original), 2 formants, 3 intonation, 4 jitter, 5
    // filtered (the source-filter voice slowed), 6 filtered with intonation and
    // jitter, 7 glides, 8 murmurs, 9 diphthongs, 10 longer vowels, 11 faster, 12
    // quicker consonants, 13 fastest. The default is 13 (fastest; 11 is the
    // slightly slower alternative); V steps between those two in the practice deck (`DEMO_VOICES`), or through
    // every voice with `&voices=all` (the default, the newest candidates, then each
    // earlier one down to spelling).
    style: 13,
    longer: 1.5,
    symbols: {
      a: { effect: "voiceVowel", pitch: 1, length: 0.1, vowel: true },
      e: { effect: "voiceVowel", pitch: 1.26, length: 0.1, vowel: true },
      i: { effect: "voiceVowel", pitch: 1.5, length: 0.1, vowel: true },
      o: { effect: "voiceVowel", pitch: 0.84, length: 0.1, vowel: true },
      u: { effect: "voiceVowel", pitch: 0.75, length: 0.1, vowel: true },
      p: { effect: "voiceStop", pitch: 0.5, length: 0.04 },
      t: { effect: "voiceStop", pitch: 2, length: 0.04 },
      k: { effect: "voiceStop", pitch: 1, length: 0.04 },
      b: { effect: "voiceVoicedStop", pitch: 0.9, length: 0.045 },
      d: { effect: "voiceVoicedStop", pitch: 1.2, length: 0.045 },
      g: { effect: "voiceVoicedStop", pitch: 1, length: 0.045 },
      s: { effect: "voiceHiss", pitch: 1, length: 0.07 },
      f: { effect: "voiceHiss", pitch: 0.6, length: 0.07 },
      x: { effect: "voiceHiss", pitch: 0.4, length: 0.07 },
      m: { effect: "voiceNasal", pitch: 0.9, length: 0.07 },
      n: { effect: "voiceNasal", pitch: 1, length: 0.07 },
      "ɲ": { effect: "voiceNasal", pitch: 1.15, length: 0.07 },
      l: { effect: "voiceLiquid", pitch: 1, length: 0.05 },
      "ɾ": { effect: "voiceTap", pitch: 1, length: 0.04 },
      r: { effect: "voiceTrill", pitch: 1, length: 0.09 },
      j: { effect: "voiceGlideDown", pitch: 1, length: 0.05, glide: "i" },
      w: { effect: "voiceGlideUp", pitch: 1, length: 0.05, glide: "u" },
      "tʃ": { effect: "voiceAffricate", pitch: 1, length: 0.07 },
    } as Record<string, { effect: string; pitch: number; length: number; vowel?: boolean; glide?: string }>,
    // How long the formant glides take on the timeline (styles 7 and 8): going into
    // a vowel, and coming out of one.
    glideLength: GLIDE_TIME,
    // The nasals and voiced stops of the source-filter voice (style 8), keyed by
    // the symbol they replace in `symbols`.
    // `gain` multiplies the loudness of that sound (1 is as the effect is written).
    murmurs: {
      m: { effect: "voiceFiltM", pitch: 1, length: 0.07, gain: 0.8 },
      n: { effect: "voiceFiltN", pitch: 1, length: 0.07, gain: 0.8 },
      "ɲ": { effect: "voiceFiltNY", pitch: 1, length: 0.07, gain: 0.8 },
      l: { effect: "voiceFiltL", pitch: 1, length: 0.06 },
      b: { effect: "voiceFiltB", pitch: 1, length: 0.05 },
      d: { effect: "voiceFiltD", pitch: 1, length: 0.05 },
      g: { effect: "voiceFiltG", pitch: 1, length: 0.05 },
    } as Record<string, { effect: string; pitch: number; length: number; gain?: number }>,
    // Symbols that sound like one in the table above (other transcriptions,
    // other dialects, or the occasional allophone), so the voice never goes
    // quiet on a mark it did not expect.
    like: {
      "ɡ": "g", "β": "b", "ð": "d", "ɣ": "g", "ʝ": "j", "ʎ": "ɲ", "ŋ": "n", "z": "s", "θ": "s", "ʃ": "s", "h": "x", "ɛ": "e", "ɔ": "o", "ɪ": "i", "ʊ": "u", "ɑ": "a", "ə": "a", "ɨ": "i", "ʒ": "j", "dʒ": "tʃ", "ɟ": "j",
    } as Record<string, string>,
  },
  // "demo" studies a small built-in deck with no server and pays nothing (for
  // trying the screens); "real" talks to the app.
  backend: "real" as "demo" | "real",
};
