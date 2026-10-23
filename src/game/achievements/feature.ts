import { APARTMENT } from "../apartment";
import { ACHIEVEMENTS_UI as UI } from "../config";
import type { Game, Layer } from "../game";
import type { Level } from "../level";
import { STATE_VARS } from "../state-vars";
import { ACHIEVEMENTS, type Achievement } from "./data";
import { drawList, drawToasts } from "./draw";
import { ProgressStore, parseWorld, type KeyValueStorage, type WorldSave } from "./progress";
import { Stats } from "./stats";
import { ToastQueue } from "./toasts";
import { Unlocks, type UnlockContext } from "./unlock";

// The parts of a window or document the feature listens to, so tests can pass
// fakes. `preventDefault` is only used to keep the arrows from scrolling the page.
export interface KeyEventLike {
  code: string;
  shiftKey?: boolean;
  repeat?: boolean;
  preventDefault?(): void;
}
export interface Listenable<E> {
  addEventListener(type: string, listener: (event: E) => void): void;
}

export interface AchievementOptions {
  // Where progress is saved. Null (or storage that throws) means no saving.
  storage?: KeyValueStorage | null;
  keys?: Listenable<KeyEventLike>;
  // Told when the page is hidden (`hidden()` says whether it is), to save.
  visibility?: Listenable<unknown> & { hidden?: boolean };
  rooms?: Readonly<Record<string, Level>>;
  // The id of the room the game starts in.
  start?: string;
  list?: readonly Achievement[];
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // Even reading `localStorage` can throw when it is blocked.
  }
}

// Tracks stats from the game's events, unlocks achievements, shows toasts,
// keeps a list screen behind a key and saves progress between visits.
export class AchievementsFeature implements Layer {
  readonly name = "achievements";
  readonly stats = new Stats();
  readonly unlocks: Unlocks;
  readonly toasts = new ToastQueue();
  readonly store: ProgressStore;
  private readonly list: readonly Achievement[];
  private readonly rooms: Readonly<Record<string, Level>>;
  private readonly ctx: UnlockContext;
  private room: string;
  private listOpen = false;
  private cursor = 0;
  private confirmReset = false;
  private releaseLock: (() => void) | null = null;
  private sinceSave = 0;
  private sinceCheck = 0;

  constructor(private readonly game: Game, options: AchievementOptions = {}) {
    this.list = options.list ?? ACHIEVEMENTS;
    this.rooms = options.rooms ?? APARTMENT.rooms;
    this.unlocks = new Unlocks(this.list);
    this.store = new ProgressStore(options.storage === undefined ? browserStorage() : options.storage, UI.storageKey);
    const ids = new Set<string>();
    for (const level of Object.values(this.rooms)) for (const item of level.interactables) ids.add(item.id);
    this.ctx = { allTaskIds: [...ids] };
    this.room = options.start ?? APARTMENT.start;

    // Load before listening, so restoring the apartment does not count as playing.
    const saved = this.store.load();
    this.stats.load(saved.stats);
    this.unlocks.load(saved.unlocked);
    if (saved.world) this.restoreWorld(saved.world);
    this.stats.visited(this.room);

    game.events.on("step", () => this.after(() => this.stats.stepped()));
    game.events.on("bump", () => this.after(() => this.stats.bumped()));
    game.events.on("taskCancelled", () => this.after(() => this.stats.cancel()));
    game.events.on("room", ({ id }) =>
      this.after(() => {
        this.room = id;
        this.stats.visited(id);
      }),
    );
    game.events.on("taskComplete", ({ item, award }) => {
      this.after(() => this.stats.completed(item, award, game.interaction.scoreboard.score));
      this.save();
    });

    options.keys?.addEventListener("keydown", (e) => this.key(e));
    options.visibility?.addEventListener("visibilitychange", () => {
      if (options.visibility?.hidden) this.save();
    });
    this.check();
    game.addLayer(this);
  }

  // Puts the apartment and the player back as they were saved. Unknown
  // variables are ignored, missing ones keep their starting values, and a room
  // or tile that is no longer valid leaves the player where the game started.
  private restoreWorld(world: WorldSave): void {
    try {
      const effects = Object.entries(world.vars)
        .filter(([id]) => this.game.state.has(id))
        .map(([id, value]) => ({ var: id, set: value }));
      this.game.state.applyEffects(effects);
    } catch (error) {
      console.error("Could not restore the saved apartment state", error);
    }
    const level = this.rooms[world.room];
    if (!level) return;
    const { col, row } = world;
    const inside = col >= 0 && row >= 0 && col < level.size.width / 16 && row < level.size.height / 16;
    if (!inside || level.doors.some((d) => d.col === col && d.row === row)) return;
    try {
      this.game.loadLevel(level, col, row, world.facing);
      this.room = world.room;
    } catch {
      // The tile is blocked now: stay at the start.
    }
  }

  // The state to save: the apartment's variables and where the player is.
  private snapshot(): WorldSave {
    const vars: Record<string, number> = {};
    for (const v of STATE_VARS) if (this.game.state.has(v.id)) vars[v.id] = this.game.state.get(v.id);
    const { col, row, facing } = this.game.player;
    return { vars, room: this.room, col, row, facing };
  }

  save(): boolean {
    this.sinceSave = 0;
    // Round trip the snapshot through the parser so anything we write can be read back.
    return this.store.save(this.unlocks.ids(), this.stats.toJSON(), parseWorld(this.snapshot()));
  }

  // Runs a stats change, then unlocks whatever it earned.
  private after(change: () => void): void {
    change();
    this.check();
  }

  private check(): void {
    const fresh = this.unlocks.check(this.stats, this.ctx);
    for (const a of fresh) this.toasts.push(a.name, a.description);
    if (fresh.length > 0) this.save();
  }

  // Forgets all progress: unlocks, stats, the saved game, and the apartment goes back to the start.
  reset(): void {
    this.stats.reset();
    this.unlocks.clear();
    this.toasts.clear();
    this.store.clear();
    this.confirmReset = false;
    try {
      this.game.state.applyEffects(STATE_VARS.map((v) => ({ var: v.id, set: v.initial })));
    } catch (error) {
      console.error("Could not reset the apartment state", error);
    }
    this.stats.visited(this.room);
  }

  get listVisible(): boolean {
    return this.listOpen;
  }

  openList(): boolean {
    // Not while a task runs: a mash-the-keys task would open it by accident.
    if (this.listOpen || this.game.inputLocked || this.game.dialogOpen || this.game.interaction.busy) return false;
    this.listOpen = true;
    this.cursor = 0;
    this.confirmReset = false;
    this.releaseLock = this.game.lockInput();
    return true;
  }

  closeList(): void {
    if (!this.listOpen) return;
    this.listOpen = false;
    this.confirmReset = false;
    this.releaseLock?.();
    this.releaseLock = null;
  }

  private key(e: KeyEventLike): void {
    if (e.repeat) return;
    if (e.code === UI.listKey) {
      if (this.listOpen) this.closeList();
      else this.openList();
      return;
    }
    if (!this.listOpen) return;
    if (e.code === "Escape") return this.closeList();
    if (e.code === "ArrowUp" || e.code === "ArrowDown") {
      e.preventDefault?.();
      const n = this.list.length;
      this.cursor = (this.cursor + (e.code === "ArrowDown" ? 1 : n - 1)) % n;
      this.confirmReset = false;
      return;
    }
    if (this.confirmReset && e.code === "KeyY") return this.reset();
    this.confirmReset = e.code === "KeyR" && !!e.shiftKey;
  }

  update(dt: number): void {
    this.stats.played(dt);
    this.toasts.update(dt);
    this.sinceSave += dt;
    this.sinceCheck += dt;
    if (this.sinceCheck >= UI.checkEvery) {
      this.sinceCheck = 0;
      this.check();
    }
    if (this.sinceSave >= UI.saveEvery) this.save();
  }

  drawHud(ctx: CanvasRenderingContext2D): void {
    drawToasts(ctx, this.toasts.views());
    if (this.listOpen) {
      drawList(ctx, {
        achievements: this.list,
        unlocked: (id) => this.unlocks.has(id),
        cursor: this.cursor,
        message: this.confirmReset ? "RESET ALL PROGRESS? Y: YES" : null,
      });
    }
  }
}

// Switches the feature on for a game: the one call in features.ts.
export function attachAchievements(game: Game, options?: AchievementOptions): AchievementsFeature {
  return new AchievementsFeature(game, {
    keys: typeof window === "undefined" ? undefined : window,
    visibility: typeof document === "undefined" ? undefined : document,
    ...options,
  });
}
