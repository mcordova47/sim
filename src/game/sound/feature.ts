import { COLOR, withAlpha } from "../../render/colors";
import { drawText, textWidth } from "../../render/font";
import { APARTMENT } from "../apartment";
import type { KeyValueStorage } from "../achievements/progress";
import { CLOCK, DIALOG, GUITAR_SKILL, MUSIC, SOUND, VIEW } from "../config";
import { isTypingKey } from "../activities/typing";
import type { Game, Layer } from "../game";
import { demoStore } from "../music/demo-library";
import type { DemoStore } from "../music/demo-store";
import { RECORD_TASK, TRACKS } from "../music/records";
import type { Track } from "../music/track";
import { browserAudio, type AudioFactory } from "./audio-types";
import { MoodLift, comboPitch, floorOf, guitarEffect, noteKeyDir, stepEffect, stepGain, stepPitch } from "./decisions";
import { SoundEngine } from "./engine";
import { melodyNote, playKey, skillLevel, strokeEvents, type Dir, type Level, type Stroke } from "./guitar-skill";
import { mumbleNotes } from "../flashcards/mumble";
import { DEFAULT_SETTINGS, SettingsStore, type DialogVoice } from "./settings";

// The parts of a window the feature listens to, so tests can pass fakes.
export interface KeyEventLike {
  code: string;
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}
export interface Listenable<E> {
  addEventListener(type: string, listener: (event: E) => void): void;
}

export interface SoundOptions {
  // Makes the audio context (the browser's by default; tests pass a fake).
  audio?: AudioFactory;
  // Where the settings are saved. Null (or storage that throws) means no saving.
  storage?: KeyValueStorage | null;
  keys?: Listenable<KeyEventLike>;
  random?: () => number;
  // The records on the player (the files in music/tracks by default).
  tracks?: readonly Track[];
  // The tracks the player made, listed as demos (the game's shared store by default).
  demos?: DemoStore;
  // The room the game starts in, for the first footsteps.
  start?: string;
  // Uses this dialog voice for the visit without saving it (the dev URL
  // override `?dialogvoice=letters`, issue 075).
  dialogVoice?: DialogVoice;
  // Uses this guitar voice ("plain", "steel", "nylon": SOUND.guitarVoices) whatever
  // instrument is in hand (the dev URL `?guitarvoice=`, issue 108).
  guitarVoice?: string;
  // How many guitar sessions have been finished (issue 114a); the skill level follows it.
  // Without it the guitar stays at level 1, the single note.
  guitarSessions?: () => number;
  // Forces a skill level, 1 to 6, for the visit (the dev URL `?guitarskill=`).
  guitarSkill?: Level;
  // Turns the pick's tick off for the visit (the dev URL `?guitarpick=off`), to compare.
  guitarPick?: boolean;
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // Even reading `localStorage` can throw when it is blocked.
  }
}

// Sound effects and music, from the game's events. It owns an audio engine,
// reacts to `game.events`, starts audio on the first key press, plays whichever
// record the record player was set to, and lifts mood while one plays. Nothing in
// the game imports it: removing `attachSound(game)` from features.ts removes it all.
export class SoundFeature implements Layer {
  readonly name = "sound";
  readonly engine: SoundEngine;
  private readonly store: SettingsStore;
  private readonly tracks: readonly Track[];
  private readonly demos: DemoStore;
  // The made tracks' version we last looked at, and whether the editor's preview is on.
  private demoVersion: number;
  private previewing = false;
  private readonly random: () => number;
  private readonly lift = new MoodLift();
  private room: string;
  private selected: Track | null = null;
  // Game minutes left before a record choice pays again (issue 068).
  private payoutLeft = 0;
  // Seconds left on the "now playing" line and on the mute indicator.
  private nowPlayingFor = 0;
  private indicatorFor = 0;
  // Characters of dialog text that had appeared at the last frame.
  private shown = 0;
  // How dialog text sounds now, and what is saved (they differ under the URL override).
  private voiceMode: DialogVoice = DEFAULT_SETTINGS.dialogVoice;
  private voiceSaved: DialogVoice = DEFAULT_SETTINGS.dialogVoice;
  private voiceChosen = false;
  // The ad blocker switch, kept with the settings (issue 043 stage B).
  private adBlocker = false;
  private guitarVoice: string | undefined;
  private readonly guitarSessions: () => number;
  private readonly guitarSkill: Level | undefined;
  // The skill level of the session now playing, read once when it starts, and the next stroke.
  private skill: Level = "notes";
  private stroke: Stroke = "down";
  private pick = { ...GUITAR_SKILL.pick };
  // The groove is on for a session or a dev audition (which the activity check leaves alone).
  private grooving = false;
  private auditioning = false;
  private sessionSeed = 0;

  constructor(private readonly game: Game, options: SoundOptions = {}) {
    this.random = options.random ?? Math.random;
    this.guitarVoice = options.guitarVoice;
    this.guitarSessions = options.guitarSessions ?? (() => 0);
    this.guitarSkill = options.guitarSkill;
    if (options.guitarPick !== undefined) this.pick.enabled = options.guitarPick;
    this.tracks = options.tracks ?? TRACKS;
    this.demos = options.demos ?? demoStore();
    this.demoVersion = this.demos.version;
    this.room = options.start ?? APARTMENT.start;
    this.engine = new SoundEngine(options.audio ?? browserAudio, this.random);
    this.store = new SettingsStore(options.storage === undefined ? browserStorage() : options.storage, SOUND.storageKey);

    const saved = this.store.load();
    this.engine.muted = saved.muted;
    this.selected = this.everyTrack().find((t) => t.id === saved.track) ?? null;
    this.payoutLeft = saved.payoutLeft;
    this.voiceSaved = saved.dialogVoice;
    this.voiceChosen = saved.dialogVoiceChosen;
    this.voiceMode = options.dialogVoice ?? saved.dialogVoice;
    this.adBlocker = saved.adBlocker;
    game.adBlockerOn = saved.adBlocker;
    game.onAdBlockerChange = (on) => {
      this.adBlocker = on;
      this.save();
    };
    game.dialogVoice = {
      label: () => `DIALOG VOICE: ${this.voiceMode.toUpperCase()}`,
      toggle: () => this.setDialogVoice(this.voiceMode === "beep" ? "letters" : "beep"),
    };
    game.jukebox = () => ({ playingId: this.selected?.id ?? null, payoutReady: !(this.payoutLeft > 0), tracks: this.everyTrack() });
    this.engine.music.play(this.selected);

    const { events } = game;
    events.on("step", () => this.step());
    events.on("bump", () => this.engine.play("bump"));
    events.on("room", ({ id }) => {
      this.room = id;
      this.engine.play("door");
    });
    events.on("taskStart", ({ item }) => {
      this.engine.play("taskStart");
      if (item.activity?.type === "notes") this.startGuitarSession();
    });
    events.on("taskComplete", ({ award }) => {
      this.stopGroove();
      this.engine.play("taskComplete");
      if (award.chain > 1) this.engine.play("combo", { pitch: comboPitch(award.chain) });
      if (award.timeFactor > 1) this.engine.play("goodHour");
      // The editor pays while it is still open; its preview goes on then.
      if (!game.interaction.active) this.endPreview();
    });
    events.on("taskCancelled", () => {
      this.stopGroove();
      if (!game.interaction.active) this.endPreview();
      this.engine.play("taskCancelled");
    });
    events.on("taskBlocked", () => this.engine.play("taskBlocked"));
    events.on("dialogChoose", () => this.engine.play("menuPick"));
    // The record player's choice (a change, or silence), sent as its task ends.
    events.on("record", ({ id, paid }) => {
      const track = id === null ? null : (this.everyTrack().find((t) => t.id === id) ?? undefined);
      if (track === undefined) return;
      if (paid) this.payoutLeft = MUSIC.payoutEveryMinutes;
      this.setTrack(track);
    });
    events.on("preview", ({ track, live }) => this.preview(track, live));
    events.on("voice", ({ pitch, effect, gain, stretch }) => this.engine.play(effect ?? "mumble", { pitch, gain, stretch }));
    events.on("blip", ({ freq }) => this.engine.play("noteKey", { pitch: freq / 440 }));
    events.on("cue", ({ name, pitch }) => {
      const effect = SOUND.cues[name];
      if (effect) this.engine.play(effect, pitch === undefined ? undefined : { pitch });
    });

    options.keys?.addEventListener("keydown", (e) => this.key(e));
    game.addLayer(this);
  }

  // The instrument in hand: the item in the guitar's decor slot if the apartment has
  // one (its sprite names it), otherwise the default (the guitar on its stand).
  get instrument(): string {
    const { decor } = this.game;
    return decor.hasSlot("guitar") ? decor.placedIn("guitar").sprite : SOUND.defaultInstrument;
  }

  // The effect the guitar's notes play now (issue 108).
  noteEffect(instrument: string = this.instrument): string {
    if (this.guitarVoice !== undefined && this.guitarVoice in SOUND.guitarVoices) return SOUND.guitarVoices[this.guitarVoice];
    return guitarEffect(instrument);
  }

  // Dev audition (issue 108): plays a short run of notes in a voice ("plain",
  // "steel" or "nylon"). Audio must be unlocked by a key press first.
  audition(voice: string): void {
    const effect = SOUND.guitarVoices[voice];
    if (!effect) return;
    this.engine.unlock();
    const pitches = [0, 4, 7, 12, 7, 4, 0].map((n) => 2 ** (n / 12));
    pitches.forEach((pitch, i) => setTimeout(() => this.engine.play(effect, { pitch }), i * 380));
  }

  // The skill is read once when a notes session starts, so it never changes in the middle of
  // one (the session that earns a level still sounds like the one before).
  private startGuitarSession(): void {
    this.skill = this.guitarSkill ?? skillLevel(this.guitarSessions());
    this.sessionSeed = Math.floor(this.random() * 1e6);
    this.stroke = "down";
    this.stopGroove();
    this.grooving = this.skill === "groove";
  }

  // The string tone the groove and the melody use: the instrument's voice.
  private voiceName(): string {
    return this.guitarVoice !== undefined && this.guitarVoice in SOUND.guitarVoices ? this.guitarVoice : (SOUND.instruments[this.instrument]?.voice ?? "steel");
  }

  private stopGroove(): void {
    this.engine.groove.stop();
    this.grooving = false;
  }

  // The groove level (issue 114b): the first arrow starts the loop; every arrow is a single
  // note (the instrument's own voice, on the effects bus) of the chord sounding right now, played
  // at once, never waiting for the loop's grid.
  private playGroove(dir: Dir): void {
    if (!this.engine.groove.running) this.engine.groove.start((SOUND.guitarStrings[this.voiceName()] ?? SOUND.guitarStrings.steel).string, this.sessionSeed);
    const semis = melodyNote(this.engine.groove.chordAt(this.engine.now), dir);
    this.engine.play(this.noteEffect(), { pitch: 2 ** (semis / 12) });
  }

  // What an arrow sounds like now (issue 114a). Level 1 is the plain single note (as in 108).
  // A higher level is one stroke over a chord, handed to the audio clock at once (it is over
  // within about 0.2 s), and nothing plays after it.
  private playArrow(dir: Dir, level: Level = this.skill): void {
    const voice = this.voiceName();
    if (level === "groove") {
      this.playGroove(dir);
      return;
    }
    if (level === "notes") {
      this.engine.play(this.noteEffect(), { pitch: (SOUND.noteKeys[dir] ?? 440) / 440 });
      return;
    }
    for (const e of strokeEvents(playKey(level, dir, 0, this.stroke), voice, this.pick)) {
      this.engine.playAt(e.effect, { pitch: e.pitch, gain: e.gain, stretch: e.stretch }, e.at);
    }
    // The strokes alternate down and up.
    this.stroke = this.stroke === "down" ? "up" : "down";
  }

  // Dev audition (issue 114a): a short run of arrows at a skill level (1 to 6), a second apart.
  auditionSkill(level: number, voice?: string): void {
    const id = GUITAR_SKILL.levels[Math.min(Math.max(Math.floor(level), 1), GUITAR_SKILL.levels.length) - 1].id;
    this.engine.unlock();
    this.stroke = "down";
    const dirs: Dir[] = ["left", "left", "down", "up", "right", "left", "down", "up"];
    dirs.forEach((dir, i) =>
      setTimeout(() => {
        if (voice) this.guitarVoice = voice;
        this.playArrow(dir, id);
      }, i * 1400),
    );
  }

  // Dev audition (issue 114b): the groove loop alone for `bars` bars, or with the arrows as
  // melody over it (a note every beat or so, walking the four arrows). `auditionGuitarGroove(4)`,
  // `auditionGuitarGroove(8, true)`, `auditionGuitarGroove(0)` stops it.
  auditionGroove(bars = 4, melody = false, voice?: string): void {
    this.engine.unlock();
    this.stopGroove();
    if (bars <= 0) {
      this.auditioning = false;
      return;
    }
    if (voice) this.guitarVoice = voice;
    this.auditioning = true;
    this.grooving = true;
    this.engine.groove.start((SOUND.guitarStrings[this.voiceName()] ?? SOUND.guitarStrings.steel).string, 1);
    const beat = 60000 / GUITAR_SKILL.tempo;
    const total = bars * 4 * beat;
    if (melody) {
      const dirs: Dir[] = ["left", "up", "right", "up", "down", "right", "left", "left"];
      for (let i = 0; i * beat * 1.5 < total - beat; i++) setTimeout(() => this.auditioning && this.playGroove(dirs[i % dirs.length]), 400 + i * beat * 1.5);
    }
    setTimeout(() => {
      if (!this.auditioning) return;
      this.auditioning = false;
      this.stopGroove();
    }, total + 400);
  }

  get track(): Track | null {
    return this.selected;
  }

  // The records and the demos, for finding a chosen one.
  private everyTrack(): Track[] {
    return [...this.tracks, ...this.demos.tracks()];
  }

  // The track editor's preview plays over the record without changing which
  // record is on; ending it puts the record back.
  private preview(track: Track | null, live: boolean): void {
    if (track) {
      if (live && this.previewing) this.engine.music.swap(track);
      else this.engine.music.play(track);
      this.previewing = true;
    } else this.endPreview();
  }

  private endPreview(): void {
    if (!this.previewing) return;
    this.previewing = false;
    this.engine.music.play(this.selected);
  }

  // The saved demos changed: a demo that is on the player is looked up again,
  // so a deleted one stops and an edited one plays as it is now.
  private syncDemos(): void {
    this.demoVersion = this.demos.version;
    const on = this.selected;
    if (!on || !/^demo-\d+$/.test(on.id)) return;
    const now = this.demos.tracks().find((t) => t.id === on.id) ?? null;
    if (now === on) return;
    this.selected = now;
    this.lift.reset();
    if (!this.previewing) this.engine.music.play(now);
    this.save();
  }

  get muted(): boolean {
    return this.engine.muted;
  }

  // Puts a record on (or takes it off, with null).
  setTrack(track: Track | null): void {
    this.selected = track;
    this.engine.music.play(track);
    this.lift.reset();
    if (track) {
      this.engine.play("needle");
      this.nowPlayingFor = SOUND.nowPlayingSeconds;
    } else {
      this.nowPlayingFor = 0;
    }
    this.save();
  }

  setMuted(muted: boolean): void {
    this.engine.muted = muted;
    this.indicatorFor = SOUND.indicatorSeconds;
    if (!muted) this.engine.play("unmute");
    this.save();
  }

  get dialogVoice(): DialogVoice {
    return this.voiceMode;
  }

  setDialogVoice(voice: DialogVoice): void {
    this.voiceMode = voice;
    this.voiceSaved = voice;
    this.voiceChosen = true; // only the D toggle gets here
    this.save();
  }

  private save(): void {
    this.store.save({ muted: this.engine.muted, track: this.selected?.id ?? null, payoutLeft: this.payoutLeft, dialogVoice: this.voiceSaved, dialogVoiceChosen: this.voiceChosen, adBlocker: this.adBlocker });
  }

  private step(): void {
    const { state } = this.game;
    this.engine.play(stepEffect(floorOf(this.room)), {
      pitch: stepPitch(this.random()),
      gain: state.has("energy") ? stepGain(state.get("energy")) : 1,
    });
  }

  private key(e: KeyEventLike): void {
    // The first key press is what lets the browser start audio.
    this.engine.unlock();
    if (e.repeat) return;
    // Browser shortcuts (Ctrl+M and the like) are not for the game.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const task = this.game.interaction.active;
    const activity = task?.item.activity?.type;
    // The typing game reads every letter, so M is a letter there, not a mute key
    // (and in the track editor while a name is typed).
    if (e.code === SOUND.muteKey && !this.game.hotkeyBlocked(e.code, true)) {
      this.setMuted(!this.engine.muted);
    } else if (activity === "typing" && isTypingKey(e.code)) {
      this.engine.play("key", { pitch: 0.9 + this.random() * 0.2 });
    } else if (activity === "notes") {
      const dir = noteKeyDir(e.code);
      if (dir !== null) this.playArrow(dir);
    }
  }

  update(dt: number): void {
    this.nowPlayingFor = Math.max(0, this.nowPlayingFor - dt);
    this.indicatorFor = Math.max(0, this.indicatorFor - dt);
    // The groove stops when the notes game is no longer running (or the game is paused).
    if (this.grooving && !this.auditioning && (this.game.interaction.active?.item.activity?.type !== "notes" || this.game.paused)) this.stopGroove();
    this.engine.update();
    this.engine.updateSleep(this.game.sleepScene);
    if (this.demos.version !== this.demoVersion) this.syncDemos();
    this.blips();
    this.liftMood(dt);
  }

  // One blip each time a few more characters of dialog text have appeared.
  private blips(): void {
    const view = this.game.dialogView;
    if (view?.kind !== "say") {
      this.shown = 0;
      return;
    }
    const now = view.lines.reduce((sum, line) => sum + line.length, 0);
    if (now < this.shown) this.shown = 0; // a new page
    if (this.voiceMode === "letters") this.letters(view.lines.join(""), now);
    else if (Math.floor(now / SOUND.blipEveryChars) > Math.floor(this.shown / SOUND.blipEveryChars)) {
      this.engine.play("blip", { pitch: 0.95 + this.random() * 0.1 });
    }
    this.shown = now;
  }

  // The letters voice (issue 075): at each slot of `blipEveryChars` characters
  // that has just appeared, the spelling voice's sound for the letter there
  // (nothing for a space or a mark). Text that jumps ahead (skipped) is silent.
  private letters(text: string, now: number): void {
    const every = SOUND.blipEveryChars;
    const L = SOUND.dialogLetters;
    const slots = Math.floor(now / every) - Math.floor(this.shown / every);
    if (slots < 1 || now - this.shown > L.skipAbove) return;
    const pitch = mumbleNotes(text[Math.floor(now / every) * every - 1] ?? "")[0];
    if (pitch === null || pitch === undefined) return;
    this.engine.play("mumble", { pitch: pitch * (1 + (this.random() * 2 - 1) * L.wobble), gain: L.gain });
  }

  // While a record plays, mood climbs a little over game time. The clock stands
  // still while a dialog is open (DIALOG.pauseClock), and so does this.
  private liftMood(dt: number): void {
    const { state } = this.game;
    if (this.game.dialogOpen && DIALOG.pauseClock) return;
    // The editor holds the clock: no mood from the music while it is open.
    if (this.game.interaction.active?.activity.holdsClock) return;
    // The payout window runs in game time, with or without a record on.
    if (this.payoutLeft > 0) this.payoutLeft = Math.max(0, this.payoutLeft - dt * CLOCK.minutesPerSecond);
    if (!this.selected || !state.has("mood")) return;
    const effect = this.lift.advance(dt * CLOCK.minutesPerSecond, state.get("mood"));
    if (effect) state.applyEffects([effect]);
  }

  // The small tag at the top, between the status panels: MUTE while muted, and
  // SOUND ON for a moment after unmuting. Null when there is nothing to show.
  indicatorText(): string | null {
    if (this.engine.muted) return "MUTE";
    return this.indicatorFor > 0 ? "SOUND ON" : null;
  }

  // The line naming the record, shown for a few seconds after choosing one and
  // while facing the record player. Null when there is nothing to show.
  nowPlayingText(): string | null {
    if (this.game.dialogOpen) return null;
    const facing = this.game.interaction.nearby?.id === RECORD_TASK && !this.game.interaction.busy;
    if (!facing && this.nowPlayingFor <= 0) return null;
    return this.selected ? `NOW PLAYING: ${this.selected.title}` : "NOTHING PLAYING";
  }

  // Both tags sit along the bottom edge, clear of the score and status panels,
  // the toasts and the "ESC TO STOP" hint: the mute tag at the right, the
  // now-playing line at the left (cut to fit beside it).
  drawHud(ctx: CanvasRenderingContext2D): void {
    const y = VIEW.height - 13;
    const tag = this.indicatorText();
    let room = VIEW.width - 4;
    if (tag) {
      const w = textWidth(tag) + 6;
      this.drawTag(ctx, tag, VIEW.width - w - 2, y);
      room -= w + 4;
    }
    const line = this.nowPlayingText();
    if (line) this.drawTag(ctx, fit(line, room - 6), 2, y);
  }

  private drawTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
    ctx.fillStyle = withAlpha(COLOR.ink, 0.75);
    ctx.fillRect(x, y, textWidth(text) + 6, 11);
    drawText(ctx, text, x + 3, y + 2, { color: COLOR.paper, shadow: null });
  }
}

// Cuts text that is too wide for `width` pixels, ending with "...".
export function fit(text: string, width: number): string {
  if (textWidth(text) <= width) return text;
  let cut = text.length;
  while (cut > 1 && textWidth(`${text.slice(0, cut)}...`) > width) cut--;
  return `${text.slice(0, cut)}...`;
}

// Switches the feature on for a game: the one call in features.ts.
export function attachSound(game: Game, options?: SoundOptions): SoundFeature {
  const feature = new SoundFeature(game, {
    keys: typeof window === "undefined" ? undefined : window,
    dialogVoice: devDialogVoice(),
    guitarVoice: devGuitarVoice(),
    guitarSkill: devGuitarSkill(),
    guitarPick: devGuitarPick(),
    ...options,
  });
  // Dev only: `auditionGuitar("steel")` in the console (press a key on the page first).
  if (import.meta.env?.DEV) {
    (globalThis as Record<string, unknown>).auditionGuitar = (voice: string) => feature.audition(voice);
    // `auditionGuitarSkill(3)` (or `(3, "nylon")`): a run of arrows at skill level 1 to 4.
    (globalThis as Record<string, unknown>).auditionGuitarSkill = (level: number, voice?: string) => feature.auditionSkill(level, voice);
    // `auditionGuitarGroove(4)` the loop alone for 4 bars; `(8, true)` with the arrows' melody over it; `(0)` stops.
    (globalThis as Record<string, unknown>).auditionGuitarGroove = (bars?: number, melody?: boolean, voice?: string) => feature.auditionGroove(bars, melody, voice);
  }
  return feature;
}

// Dev only (issue 108): `?guitarvoice=plain|steel|nylon` plays the guitar's notes in that
// voice for the visit, whatever instrument is in hand. A built game ignores it.
export function devGuitarVoice(search = typeof location === "undefined" ? "" : location.search, dev = import.meta.env?.DEV): string | undefined {
  if (!dev) return undefined;
  const asked = new URLSearchParams(search).get("guitarvoice");
  return asked !== null && asked in SOUND.guitarVoices ? asked : undefined;
}

// Dev only (issue 114a): `?guitarskill=1 to 6` forces the guitar's skill level for the
// visit without touching the save. A built game ignores it.
export function devGuitarSkill(search = typeof location === "undefined" ? "" : location.search, dev = import.meta.env?.DEV): Level | undefined {
  if (!dev) return undefined;
  const asked = new URLSearchParams(search).get("guitarskill");
  if (asked === null || !/^[1-9]$/.test(asked)) return undefined;
  return GUITAR_SKILL.levels[Number(asked) - 1]?.id;
}

// Dev only (issue 114a): `?guitarpick=off` leaves out the pick's tick on chords for the visit
// (so it can be compared). A built game ignores it.
export function devGuitarPick(search = typeof location === "undefined" ? "" : location.search, dev = import.meta.env?.DEV): boolean | undefined {
  if (!dev) return undefined;
  return new URLSearchParams(search).get("guitarpick") === "off" ? false : undefined;
}

// Dev only (issue 075): `?dialogvoice=letters` tries the letters voice for the
// visit without saving it. A built game ignores it.
export function devDialogVoice(search = typeof location === "undefined" ? "" : location.search, dev = import.meta.env?.DEV): DialogVoice | undefined {
  if (!dev) return undefined;
  const asked = new URLSearchParams(search).get("dialogvoice");
  return asked === "letters" || asked === "beep" ? asked : undefined;
}
