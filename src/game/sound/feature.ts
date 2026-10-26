import { COLOR, withAlpha } from "../../render/colors";
import { drawText, textWidth } from "../../render/font";
import { APARTMENT } from "../apartment";
import type { KeyValueStorage } from "../achievements/progress";
import { CLOCK, DIALOG, SOUND, VIEW } from "../config";
import { isTypingKey } from "../activities/typing";
import type { Game, Layer } from "../game";
import { demoStore } from "../music/demo-library";
import type { DemoStore } from "../music/demo-store";
import { RECORD_TASK, STOP_LABEL, TRACKS, trackForLabel } from "../music/records";
import type { Track } from "../music/track";
import { browserAudio, type AudioFactory } from "./audio-types";
import { MoodLift, comboPitch, floorOf, noteKeyPitch, stepEffect, stepGain, stepPitch } from "./decisions";
import { SoundEngine } from "./engine";
import { SettingsStore } from "./settings";

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
  // What the record player's menu picked, applied when the task finishes (and
  // dropped if the player backs out). `undefined` means nothing picked.
  private picked: { track: Track | null } | undefined;
  // Seconds left on the "now playing" line and on the mute indicator.
  private nowPlayingFor = 0;
  private indicatorFor = 0;
  // Characters of dialog text that had appeared at the last frame.
  private shown = 0;

  constructor(private readonly game: Game, options: SoundOptions = {}) {
    this.random = options.random ?? Math.random;
    this.tracks = options.tracks ?? TRACKS;
    this.demos = options.demos ?? demoStore();
    this.demoVersion = this.demos.version;
    this.room = options.start ?? APARTMENT.start;
    this.engine = new SoundEngine(options.audio ?? browserAudio, this.random);
    this.store = new SettingsStore(options.storage === undefined ? browserStorage() : options.storage, SOUND.storageKey);

    const saved = this.store.load();
    this.engine.muted = saved.muted;
    this.selected = this.everyTrack().find((t) => t.id === saved.track) ?? null;
    this.engine.music.play(this.selected);

    const { events } = game;
    events.on("step", () => this.step());
    events.on("bump", () => this.engine.play("bump"));
    events.on("room", ({ id }) => {
      this.room = id;
      this.engine.play("door");
    });
    events.on("taskStart", () => {
      this.picked = undefined;
      this.engine.play("taskStart");
    });
    events.on("taskComplete", ({ item, award }) => {
      this.engine.play("taskComplete");
      if (award.chain > 1) this.engine.play("combo", { pitch: comboPitch(award.chain) });
      if (award.timeFactor > 1) this.engine.play("goodHour");
      if (item.id === RECORD_TASK && this.picked) this.setTrack(this.picked.track);
      this.picked = undefined;
      // The editor pays while it is still open; its preview goes on then.
      if (!game.interaction.active) this.endPreview();
    });
    events.on("taskCancelled", () => {
      this.picked = undefined;
      if (!game.interaction.active) this.endPreview();
      this.engine.play("taskCancelled");
    });
    events.on("taskBlocked", () => this.engine.play("taskBlocked"));
    events.on("dialogChoose", ({ label }) => {
      this.engine.play("menuPick");
      if (game.interaction.active?.item.id === RECORD_TASK) {
        // Only a record, a demo or "stop" is a pick ("Demos..." just opens a list).
        const track = trackForLabel(label, this.everyTrack());
        if (track || label === STOP_LABEL) this.picked = { track };
      }
    });
    events.on("preview", ({ track, live }) => this.preview(track, live));
    events.on("voice", ({ pitch }) => this.engine.play("mumble", { pitch }));
    events.on("blip", ({ freq }) => this.engine.play("noteKey", { pitch: freq / 440 }));
    events.on("cue", ({ name }) => {
      const effect = SOUND.cues[name];
      if (effect) this.engine.play(effect);
    });

    options.keys?.addEventListener("keydown", (e) => this.key(e));
    game.addLayer(this);
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

  private save(): void {
    this.store.save({ muted: this.engine.muted, track: this.selected?.id ?? null });
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
    const lettersAreText = task?.activity.readsLetters ?? task?.activity.readsKeys;
    if (e.code === SOUND.muteKey && !lettersAreText) {
      this.setMuted(!this.engine.muted);
    } else if (activity === "typing" && isTypingKey(e.code)) {
      this.engine.play("key", { pitch: 0.9 + this.random() * 0.2 });
    } else if (activity === "notes") {
      const pitch = noteKeyPitch(e.code);
      if (pitch !== null) this.engine.play("noteKey", { pitch });
    }
  }

  update(dt: number): void {
    this.nowPlayingFor = Math.max(0, this.nowPlayingFor - dt);
    this.indicatorFor = Math.max(0, this.indicatorFor - dt);
    this.engine.update();
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
    if (Math.floor(now / SOUND.blipEveryChars) > Math.floor(this.shown / SOUND.blipEveryChars)) {
      this.engine.play("blip", { pitch: 0.95 + this.random() * 0.1 });
    }
    this.shown = now;
  }

  // While a record plays, mood climbs a little over game time. The clock stands
  // still while a dialog is open (DIALOG.pauseClock), and so does this.
  private liftMood(dt: number): void {
    const { state } = this.game;
    if (!this.selected || !state.has("mood")) return;
    if (this.game.dialogOpen && DIALOG.pauseClock) return;
    // The editor holds the clock: no mood from the music while it is open.
    if (this.game.interaction.active?.activity.holdsClock) return;
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
  return new SoundFeature(game, {
    keys: typeof window === "undefined" ? undefined : window,
    ...options,
  });
}
