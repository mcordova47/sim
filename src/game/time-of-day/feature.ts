import { APARTMENT } from "../apartment";
import { TILE, TIME_DEV, TIME_OF_DAY, VIEW } from "../config";
import type { Game, Layer } from "../game";
import type { Level } from "../level";
import { COLOR, withAlpha } from "../../render/colors";
import { lightAt, roomWashes, sleepLight } from "./tint";

// The parts of a window the dev shortcuts listen to, so tests can pass fakes.
export interface KeyEventLike {
  code: string;
  repeat?: boolean;
}
export interface Listenable<E> {
  addEventListener(type: string, listener: (event: E) => void): void;
}

export interface TimeOfDayOptions {
  // Turns on the developer shortcuts: `?hour=` and `?room=` in the page address
  // and the bracket keys that move the clock. Off unless this is the dev
  // server (`import.meta.env.DEV`), so a built game has none of it.
  dev?: boolean;
  // The page address's query string, such as "?hour=20".
  search?: string;
  keys?: Listenable<KeyEventLike>;
  rooms?: Readonly<Record<string, Level>>;
}

// The light of the day: a tint over the world that follows the game clock, a
// faint glow around lamps at night, and (with `dev`) shortcuts to jump the
// clock. It reads the clock every frame, so the light moves smoothly between
// the hourly `stateChanged` events. It draws only inside the world pass, after
// the player, so the prompts, popups, HUD, dialogs and full-screen views drawn
// later are never tinted and stay as readable as always.
export class TimeOfDayFeature implements Layer {
  readonly name = "time-of-day";

  // What the sleep scene has done to the light so far (issue 078). They follow
  // the scene exactly while it runs; once it is gone they ease back to 0 (after
  // Escape: `escapeRestore`) or snap to 0 (it finished: the clock has jumped
  // and the light of the new hour is the plain one).
  private dark = 0;
  private morning = 0;
  private skipHours = 0;
  private darkAlpha = 0;
  private darkLamps = 1;
  private restore = 0.4;
  private sceneClock = 0;

  constructor(private readonly game: Game, options: TimeOfDayOptions = {}) {
    if (options.dev) {
      const rooms = options.rooms ?? APARTMENT.rooms;
      this.applySearch(options.search ?? "", rooms);
      options.keys?.addEventListener("keydown", (e) => this.devKey(e));
    }
    game.addLayer(this);
  }

  // How far the sleep sequence has darkened and brightened the light right now (for tests).
  get sleepDark(): number {
    return this.dark;
  }
  get sleepMorning(): number {
    return this.morning;
  }

  update(dt: number): void {
    const scene = this.game.sleepScene;
    if (scene) {
      this.dark = scene.dark;
      this.morning = scene.morning;
      this.skipHours = scene.skipHours;
      this.darkAlpha = scene.settings.darkAlpha;
      this.darkLamps = scene.settings.darkLamps;
      this.restore = scene.settings.escapeRestore;
      this.sceneClock = this.game.state.get("clock");
    } else if (this.dark > 0 || this.morning > 0) {
      // The finish moved the clock by the whole jump; after Escape it only ticks on a little.
      const moved = (((this.game.state.get("clock") - this.sceneClock) % 24) + 24) % 24;
      if (this.skipHours > 0 && moved >= this.skipHours - 0.01) {
        this.dark = 0;
        this.morning = 0;
      } else {
        const step = this.restore > 0 ? dt / this.restore : 1;
        this.dark = Math.max(0, this.dark - step);
        this.morning = Math.max(0, this.morning - step);
      }
    }
  }

  // Moves the clock by `hours` (dev shortcut).
  jump(hours: number): void {
    const { state } = this.game;
    state.applyEffects([{ var: "clock", add: hours }]);
  }

  private applySearch(search: string, rooms: Readonly<Record<string, Level>>): void {
    const params = new URLSearchParams(search);
    const hour = params.get(TIME_DEV.hourParam);
    if (hour !== null && hour.trim() !== "" && Number.isFinite(Number(hour))) {
      this.game.state.applyEffects([{ var: "clock", set: Number(hour) }]);
    }
    const room = rooms[params.get(TIME_DEV.roomParam) ?? ""];
    if (room) {
      try {
        const col = Math.round(room.spawn.x / TILE);
        const row = Math.round(room.spawn.y / TILE);
        this.game.loadLevel(room, col, row, room.facing ?? "down");
        this.game.events.emit("room", { id: room.id ?? "", level: room });
      } catch (error) {
        console.error("Could not start in the requested room", error);
      }
    }
  }

  private devKey(e: KeyEventLike): void {
    if (e.repeat) return;
    // Not while something has the keyboard (the typing game reads brackets as letters).
    if (this.game.inputLocked || this.game.dialogOpen || this.game.interaction.busy) return;
    if (e.code === TIME_DEV.backKey) this.jump(-1);
    else if (e.code === TIME_DEV.forwardKey) this.jump(1);
  }

  drawWorld(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }): void {
    const { state } = this.game;
    const level = this.game.currentLevel;
    const clock = state.get("clock");
    const asleep = this.dark > 0 || this.morning > 0;
    const sleep = asleep ? sleepLight(clock, this.skipHours, this.dark, this.morning, this.darkAlpha, this.darkLamps) : null;
    const light = sleep ? sleep.base : lightAt(clock);
    const washes = roomWashes(light, level.id, state.has("blinds") ? state.get("blinds") >= 1 : true);
    // The extra night wash of the sleep sequence goes over the hour's own light.
    if (sleep?.extra) washes.push(sleep.extra);
    const lamps = sleep ? sleep.lamps : light.lamps;

    // The wash covers everything the camera sees, the dark around the room too,
    // so the kitchen's filler blocks and the empty edge shift together.
    for (const wash of washes) {
      ctx.fillStyle = withAlpha(COLOR[wash.color], wash.alpha);
      ctx.fillRect(camera.x, camera.y, VIEW.width, VIEW.height);
    }

    // Lamps shine over the wash, in the main room only (the one with lamps).
    if (lamps > 0.01 && level.id === "main") {
      // The glow of what is in each decor slot first (issue 069: the item decides,
      // not the slot or the sprite), then the pieces that glow by their sprite.
      const glows: { x: number; y: number; radius: number; alpha: number }[] = [];
      for (const a of level.appearances ?? []) {
        const glow = a.slot === undefined ? undefined : this.game.decor.itemIn(a.slot).glow;
        if (glow) glows.push({ x: a.area.x + a.area.w / 2, y: a.area.y + a.area.h / 2, ...glow });
      }
      for (const glow of TIME_OF_DAY.glows) {
        for (const piece of level.pieces) {
          if (piece.sprite !== glow.sprite) continue;
          glows.push({ x: piece.bounds.x + piece.bounds.w / 2, y: piece.bounds.y + piece.bounds.h / 2, ...glow });
        }
      }
      for (const glow of glows) {
        // Three rings, so the edge steps down instead of ending sharply.
        for (const ring of [1, 0.66, 0.33]) {
          ctx.fillStyle = withAlpha(COLOR.butter, glow.alpha * lamps * 0.5);
          ctx.beginPath();
          ctx.arc(glow.x, glow.y, glow.radius * ring, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

// Switches the feature on for a game: the one call in features.ts.
export function attachTimeOfDay(game: Game, options: TimeOfDayOptions = {}): TimeOfDayFeature {
  const env = (import.meta as { env?: { DEV?: boolean } }).env;
  return new TimeOfDayFeature(game, {
    dev: env?.DEV === true,
    search: typeof window === "undefined" ? "" : window.location.search,
    keys: typeof window === "undefined" ? undefined : window,
    ...options,
  });
}
