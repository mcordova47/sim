import { APARTMENT } from "../apartment";
import { ACHIEVEMENTS_UI as UI, SYNC } from "../config";
import type { Game, Layer } from "../game";
import type { Level } from "../level";
import { clearGuestCards } from "../flashcards/guest";
import { STATE_VARS } from "../state-vars";
import { ACHIEVEMENTS, type Achievement } from "./data";
import { touchHints } from "../../render/hints";
import { demoStore } from "../music/demo-library";
import type { DemoStore } from "../music/demo-store";
import { decodeSave, encodeSave, saveFileText, type DecodeError } from "../sync/code";
import { HttpBackend, linkFor, type SyncBackend } from "../sync/client";
import { browserIO, type TransferIO } from "../sync/io";
import { SyncLocal } from "../sync/local";
import { canon, mergeSaves, normaliseDoc, normaliseProgress, type SyncDoc, type SyncProgress } from "../sync/merge";
import { AutoSync } from "../sync/auto";
import { STATUS_TEXT, SyncService } from "../sync/service";
import type { TapTarget } from "../../input/tap";
import { drawThings, moveThingsCursor, thingsButtons, thingsCells, thingsPage, thingsPages, thingsGrid, type ThingsView } from "./inventory-draw";
import { drawPhotos, photosLayout, PHOTOS_REMOVED, type PhotosView } from "./photos-draw";
import { addPhotos, summaryLines } from "../reel/photo-add";
import { browserPhotoIO, type PhotoIO } from "../reel/photo-io";
import { openReelStore, type ReelPic, type ReelStore, type ReelStoreHandle } from "../reel/reel-store";
import { drawList, drawSync, drawToasts, drawTransfer, listRows, pageButton, pauseButtons, syncButtons, touchPageSize, transferButtons, type ListView, type SyncView, type TransferView } from "./draw";
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
  ctrlKey?: boolean;
  metaKey?: boolean;
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
  // The clock for `activeAt` (milliseconds), and what the transfer page uses (issue 102). The defaults are the real ones.
  now?: () => number;
  demos?: DemoStore;
  io?: TransferIO;
  // The photo reel (issue 113c): its store (the default is the browser's IndexedDB, opened when first needed) and the
  // browser parts of adding pictures.
  reel?: ReelStoreHandle;
  photoIO?: PhotoIO;
  // The sync server (issue 103). The default is the real one on this origin.
  backend?: SyncBackend;
  // The origin the pairing link is made on. The default is this page's.
  origin?: string;
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
  private readonly storage: KeyValueStorage | null;
  private room: string;
  private listOpen = false;
  private cursor = 0;
  private confirmReset = false;
  private resetting = false;
  private releaseLock: (() => void) | null = null;
  // "AD BLOCKER: ON", shown in the hint's place for a moment after B is pressed.
  private flash: string | null = null;
  private flashFor = 0;
  private sinceSave = 0;
  private sinceCheck = 0;
  // Sync (issue 102, docs/sync.md): when the player last really did something (a finished task or a decor
  // change), whether that has happened this visit, this device's sync data, the made tracks, the transfer page.
  private activeAt = 0;
  private acted = false;
  private readonly now: () => number;
  readonly sync: SyncLocal;
  private readonly demos: DemoStore;
  private readonly io: TransferIO;
  private page: "list" | "transfer" | "sync" | "things" | "photos" = "list";
  private thingsCursor = 0;
  // The PHOTOS page (issue 113c). The store is opened when first asked for, so a player who never opens the
  // page never touches IndexedDB. Photos are not part of the save, the sync document or a reset.
  private reelHandle: ReelStoreHandle | null;
  private readonly photoIO: PhotoIO;
  private photos: readonly ReelPic[] | null = null;
  private photoProgress: { done: number; total: number } | null = null;
  private photoMessage: readonly string[] = [];
  private confirmRemove = false;
  readonly syncService: SyncService;
  private readonly auto: AutoSync;
  private readonly origin: string;
  private confirmSync: "stop" | "pair" | null = null;
  private pairKey: string | null = null;
  private confirmRestore = false;

  constructor(private readonly game: Game, options: AchievementOptions = {}) {
    // The list is drawn for 320 x 192, so the phone's narrow view switches size while it is open (issue 090).
    game.fullPictureWhen.push(() => this.listOpen);
    // The pause screen holds the clock (issue 093): it is a pause, and the game has no pressure.
    game.pausedWhen.push(() => this.listOpen);
    this.list = options.list ?? ACHIEVEMENTS;
    this.rooms = options.rooms ?? APARTMENT.rooms;
    this.unlocks = new Unlocks(this.list);
    this.storage = options.storage === undefined ? browserStorage() : options.storage;
    this.store = new ProgressStore(this.storage, UI.storageKey);
    const ids = new Set<string>();
    // Changing the decor ends quietly and is never a completion, so it is not part of "every task".
    for (const level of Object.values(this.rooms)) for (const item of level.interactables) if (item.decorSlot === undefined && !item.delivery) ids.add(item.id);
    this.ctx = { allTaskIds: [...ids] };
    this.room = options.start ?? APARTMENT.start;
    this.now = options.now ?? Date.now;
    this.sync = new SyncLocal(this.storage, { achievementIds: new Set(this.list.map((a) => a.id)) });
    this.demos = options.demos ?? demoStore();
    this.io = options.io ?? browserIO;
    this.reelHandle = options.reel ?? null;
    this.photoIO = options.photoIO ?? browserPhotoIO;
    this.origin = options.origin ?? (typeof location === "undefined" ? "" : location.origin);
    this.syncService = new SyncService(options.backend ?? new HttpBackend(), this.sync, {
      doc: () => this.doc(),
      mergeIncoming: (doc) => this.mergeIncoming(doc),
      now: () => this.now(),
      env: () => this.syncEnv(),
    });

    // Automatic sync (issue 104): the first try comes a few seconds after load, in the background.
    this.auto = new AutoSync(
      {
        now: () => this.now(),
        idle: () => !this.listOpen && !this.game.inputLocked && !this.game.dialogOpen && !this.game.interaction.busy,
        changed: () => this.syncService.changed(),
        sync: () => this.syncService.auto(),
      },
      () => this.sync.auto() && this.sync.key() !== null,
    );

    // Load before listening, so restoring the apartment does not count as playing.
    const saved = this.store.load();
    this.activeAt = saved.activeAt ?? 0;
    this.stats.load(saved.stats);
    this.unlocks.load(saved.unlocked);
    if (saved.world) this.restoreWorld(saved.world);
    // A missing decor field (an old save) leaves the room as it is today.
    if (saved.decor !== undefined) this.game.decor.load(saved.decor);
    // Owning or placing an item saves at once, so closing the tab right after a swap keeps it.
    // A decor change by the player is real play for the sync's "most recent" rule (a delivery arriving is not).
    this.game.decor.onChange = () => {
      if (this.resetting) return;
      this.acts();
      this.save();
    };
    // A missing deliveries field (an old save) means nothing is queued.
    if (saved.deliveries !== undefined) this.game.deliveries.load(saved.deliveries);
    this.game.deliveries.onChange = () => {
      if (!this.resetting) this.save();
    };
    // A missing encounters field (an old save) means a fresh start: no cooldown, nothing seen.
    // After the deliveries, so a `last` from the future is pulled back to the delivery clock.
    this.game.encounters.load(saved.encounters, this.game.deliveries.hours);
    this.game.encounters.onChange = () => {
      if (!this.resetting) this.save();
    };
    // A merge held for later (issue 102) is applied at load, before anything can be played over it.
    this.applyHeld();
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
      this.acts();
      this.after(() => this.stats.completed(item, award, game.interaction.scoreboard.score));
      this.save();
    });

    options.keys?.addEventListener("keydown", (e) => this.key(e));
    options.visibility?.addEventListener("visibilitychange", () => {
      if (options.visibility?.hidden) {
        this.save();
        this.auto.hidden();
      } else this.auto.shown();
    });
    this.check();
    // Ctrl+V on the transfer page imports what was pasted.
    this.io.onPaste((text) => {
      if (this.listOpen && this.page === "transfer") this.importText(text);
      if (this.listOpen && this.page === "sync") this.run(this.syncService.pair(text));
    });
    game.addLayer(this);
  }

  // -- Sync (issue 102) -----------------------------------------------------------------------

  // The player really did something: the time the merge compares. Never called by a delivery or an apply.
  private acts(): void {
    this.acted = true;
    this.activeAt = this.now();
  }

  // The live state as a document, run through the same parsers as anything imported.
  private doc(): SyncDoc {
    const raw = {
      unlocked: this.unlocks.ids(),
      stats: this.stats.toJSON(),
      world: parseWorld(this.snapshot()),
      decor: this.game.decor.toJSON(),
      deliveries: this.game.deliveries.toJSON(),
      encounters: this.game.encounters.toJSON(),
    };
    const tracks = this.demos.list().map((d) => ({ text: d.text, made: d.made }));
    const read = normaliseDoc({ app: SYNC.app, format: SYNC.format, device: this.sync.device(), activeAt: this.activeAt, progress: raw, tracks }, this.syncEnv());
    if (!read.ok) throw new Error("the live state is not a valid document");
    return read.doc;
  }

  private syncEnv() {
    return { achievementIds: new Set(this.list.map((a) => a.id)) };
  }

  // Replaces the progress group with `p`, through the loaders in the order they depend on each other. Their
  // change hooks save, so the feature's guard is up and there is one save at the end.
  private applyProgress(p: SyncProgress): void {
    const liveWorld = canon(parseWorld(this.snapshot()));
    this.resetting = true;
    try {
      this.stats.load(p.stats);
      this.unlocks.load(p.unlocked);
      if (p.world && canon(p.world) !== liveWorld) this.restoreWorld(p.world);
      this.game.decor.load(p.decor);
      this.game.deliveries.load(p.deliveries);
      this.game.encounters.load(p.encounters, this.game.deliveries.hours);
    } finally {
      this.resetting = false;
    }
  }

  // Merges `incoming` with the live state and applies the result. The old progress group is kept as the
  // one-step backup when the merge changes it. Made tracks are added one by one (safe at any time).
  // Returns whether anything changed, and whether a track did not fit.
  private applyIncoming(incoming: SyncDoc): { changed: boolean; trackFull: boolean } {
    const live = this.doc();
    const merged = mergeSaves(live, incoming, this.now());
    const changed = canon(merged.progress) !== canon(live.progress);
    if (changed) {
      this.sync.setBackup({ progress: live.progress, activeAt: live.activeAt });
      this.applyProgress(merged.progress);
    }
    // The winner's time, not now: applying is not playing.
    this.activeAt = merged.activeAt;
    let added = 0;
    let trackFull = false;
    for (const t of merged.tracks) {
      const result = this.demos.add(t.text, t.made);
      if (result === "added") added++;
      if (result === "full") trackFull = true;
    }
    this.save();
    return { changed: changed || added > 0, trackFull };
  }

  // Nothing is running that a change of the apartment could break (the same guard as opening the pause screen).
  private canApplyNow(): boolean {
    return this.listOpen || !(this.game.inputLocked || this.game.dialogOpen || this.game.interaction.busy);
  }

  // A remote document from the server: applied now when nothing is running (the pause screen counts), else
  // held for the pause screen or the next load.
  private mergeIncoming(doc: SyncDoc): void {
    // Never under the player's thumb (issue 104): only with the pause screen open, else held (applied at once
    // only if nothing has been played yet this visit).
    if (this.listOpen) this.applyIncoming(doc);
    else this.holdMerge(doc);
  }

  // The game was opened with a pairing link (issue 103): shows the sync page asking whether to sync with it.
  // Called at load, so nothing is running; the key was already taken out of the address bar.
  offerPairing(key: string): void {
    if (!this.openList()) return;
    this.openSync();
    this.pairKey = key;
    this.confirmSync = "pair";
    this.flash = null;
  }

  // Keeps a merge for later (stage 3 uses this) and applies it at once only if the player has not done
  // anything yet this visit and nothing is running; otherwise it waits for the pause screen or the next load.
  holdMerge(incoming: SyncDoc): void {
    const prior = this.sync.held();
    this.sync.hold(prior ? mergeSaves(prior, incoming, this.now()) : incoming);
    if (!this.acted && this.canApplyNow()) this.applyHeld();
  }

  // Applies a held merge, merged again with the live state first (what was played meanwhile counts).
  applyHeld(): void {
    const held = this.sync.held();
    if (!held) return;
    this.sync.hold(null);
    this.applyIncoming(held);
  }

  // Goes back to the progress group as it was before the last import that changed it. The player's own
  // action: the restored apartment is the newest, so the next merge does not just undo it. Tracks stay.
  restoreBackup(): boolean {
    const backup = this.sync.backup();
    if (!backup) return false;
    this.applyProgress(normaliseProgress(backup.progress, this.syncEnv()));
    this.acts();
    this.sync.hold(null);
    this.save();
    return true;
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
    return this.store.save(this.unlocks.ids(), this.stats.toJSON(), parseWorld(this.snapshot()), this.game.decor.toJSON(), this.game.deliveries.toJSON(), this.game.encounters.toJSON(), this.activeAt);
  }

  // Runs a stats change, then unlocks whatever it earned.
  private after(change: () => void): void {
    change();
    this.check();
  }

  private check(): void {
    const fresh = this.unlocks.check(this.stats, this.ctx);
    for (const a of fresh) this.toasts.push(a.name, a.description);
    // Checkpoints for gifts (issue 062 stage 3a, issue 043 stage A): quiet, each fires
    // once. After the unlocks, so an achievement just earned counts at once.
    const s = this.stats.toJSON();
    this.game.deliveries.check({ points: s.totalPoints, tasks: this.stats.completions, days: this.game.deliveries.hours / 24 }, (id) => this.unlocks.has(id));
    // A named moment, for sound and the like to react to.
    if (fresh.length > 0) this.game.events.emit("cue", { name: "achievement" });
    if (fresh.length > 0) this.save();
  }

  // Forgets all progress: unlocks, stats, the saved game, and the apartment goes back to the start.
  reset(): void {
    this.stats.reset();
    this.unlocks.clear();
    this.toasts.clear();
    this.store.clear();
    // A guest's flashcard progress (issue 089) goes with the rest; the sync key and the points window do not.
    clearGuestCards(this.storage);
    this.resetting = true;
    try {
      this.game.decor.reset();
      this.game.deliveries.reset();
      // The cooldown and the ads seen start over; the ad blocker is a preference and stays.
      this.game.encounters.reset();
    } finally {
      this.resetting = false;
    }
    this.confirmReset = false;
    try {
      this.game.state.applyEffects(STATE_VARS.map((v) => ({ var: v.id, set: v.initial })));
    } catch (error) {
      console.error("Could not reset the apartment state", error);
    }
    this.stats.visited(this.room);
    // Resetting is real play: the emptied apartment is the newest. Saved with the next save, not at once
    // (a reset still writes nothing by itself).
    this.acts();
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
    this.flash = null;
    this.flashFor = 0;
    this.releaseLock = this.game.lockInput();
    this.page = "list";
    this.confirmRestore = false;
    // A held merge waits for exactly this moment.
    this.applyHeld();
    return true;
  }

  closeList(): void {
    if (!this.listOpen) return;
    this.listOpen = false;
    this.confirmReset = false;
    this.confirmSync = null;
    this.pairKey = null;
    this.page = "list";
    this.confirmRestore = false;
    this.releaseLock?.();
    this.releaseLock = null;
  }

  private key(e: KeyEventLike): void {
    if (e.repeat) return;
    // Not while a key game owns the keyboard (mashing L in the typing game).
    if (!this.listOpen && this.game.hotkeyBlocked(e.code)) return;
    if (e.code === UI.listKey) {
      if (this.listOpen) this.closeList();
      else this.openList();
      return;
    }
    if (!this.listOpen) return;
    if (this.page === "transfer") return this.transferKey(e);
    if (this.page === "sync") return this.syncKeyPress(e);
    if (this.page === "things") return this.thingsKey(e);
    if (this.page === "photos") return this.photosKey(e);
    if (e.code === "Escape") return this.closeList();
    if (e.code === UI.transferKey && !e.shiftKey) return this.openTransfer();
    if (e.code === UI.syncKey && !e.shiftKey) return this.openSync();
    if (e.code === UI.thingsKey && !e.shiftKey) return this.openThings();
    if (e.code === UI.photosKey && !e.shiftKey) return this.openPhotos();
    if (e.code === UI.dialogVoiceKey && !e.shiftKey) return this.toggleVoice();
    if (e.code === UI.adBlockerKey && !e.shiftKey) return this.toggleAdBlocker();
    // The arrows, and W and S (the touch layer's pad sends those).
    const down = e.code === "ArrowDown" || e.code === "KeyS";
    if (down || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault?.();
      this.moveCursor(down ? 1 : -1);
      return;
    }
    if (this.confirmReset && e.code === "KeyY") return this.reset();
    this.confirmReset = e.code === "KeyR" && !!e.shiftKey;
  }

  // -- The transfer page ----------------------------------------------------------------------

  // -- The THINGS page (issue 109b): read-only, so it changes nothing and saves nothing ------------

  private openThings(): void {
    this.page = "things";
    this.thingsCursor = 0;
    this.confirmReset = false;
    this.flash = null;
    this.flashFor = 0;
  }

  private thingsKey(e: KeyEventLike): void {
    if (e.ctrlKey || e.metaKey) return;
    if (e.code === "Escape" || (e.code === UI.thingsKey && !e.shiftKey)) {
      this.page = "list";
      return;
    }
    const dir = ({ ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" } as const)[e.code as "ArrowLeft"];
    if (!dir) return;
    e.preventDefault?.();
    this.thingsCursor = moveThingsCursor(this.thingsCursor, this.game.decor.entries().length, dir);
  }

  private thingsView(): ThingsView {
    const entries = this.game.decor.entries();
    return { entries, cursor: Math.min(this.thingsCursor, Math.max(0, entries.length - 1)), touch: touchHints(), sprites: this.game.sprites };
  }

  private thingsTargets(): TapTarget[] {
    const view = this.thingsView();
    const targets: TapTarget[] = [];
    for (const { index, rect } of thingsCells(view)) targets.push({ ...rect, run: () => void (this.thingsCursor = index) });
    const actions = {
      back: () => void (this.page = "list"),
      // The first entry of the next page, back to the first page after the last.
      page: () => void (this.thingsCursor = ((thingsPage(view) + 1) % thingsPages(view.entries.length)) * thingsGrid().perPage),
    };
    for (const b of thingsButtons(view)) targets.push({ ...b.rect, run: actions[b.id] });
    return targets;
  }

  // -- The PHOTOS page (issue 113c) -------------------------------------------------------------

  // The store for the reel, made on first use.
  get reel(): ReelStoreHandle {
    return (this.reelHandle ??= openReelStore());
  }

  private openPhotos(): void {
    this.page = "photos";
    this.confirmReset = false;
    this.confirmRemove = false;
    this.photoMessage = [];
    this.photos = null;
    this.flash = null;
    this.flashFor = 0;
    void this.refreshPhotos();
  }

  // Reads the list again; a failing store shows as an empty list and a line, never a crash.
  private async refreshPhotos(): Promise<void> {
    try {
      this.photos = await this.reel.store.list();
    } catch {
      this.photos = [];
      this.photoMessage = ["This browser could not read the pictures."];
    }
  }

  private photosKey(e: KeyEventLike): void {
    if (e.ctrlKey || e.metaKey) return;
    const wasArmed = this.confirmRemove;
    this.confirmRemove = false;
    if (e.code === "Escape") {
      // Escape first puts away the question; with none asked it goes back.
      if (!wasArmed) this.page = "list";
      return;
    }
    if (e.code === UI.photosKey && !e.shiftKey && !wasArmed) {
      this.page = "list";
      return;
    }
    if (e.code === "KeyA") return this.addPictures();
    if (e.code === "KeyR" || (wasArmed && e.code === "KeyY")) return this.removePictures(wasArmed);
  }

  // Called straight from the tap or key press: the chooser has to open in this call (iOS).
  private addPictures(): void {
    if (this.photoProgress || !this.reel.persistent) return;
    const chosen = this.photoIO.pickImages();
    this.photoMessage = [];
    void chosen.then(async (files) => {
      if (!files || files.length === 0 || this.photoProgress) return;
      this.photoProgress = { done: 0, total: files.length };
      try {
        const summary = await addPhotos(files, this.photoIO, this.reel.store, (done, total) => (this.photoProgress = { done, total }));
        this.photoMessage = summaryLines(summary);
      } catch {
        this.photoMessage = ["This browser could not keep them all."];
      } finally {
        this.photoProgress = null;
      }
      await this.refreshPhotos();
    });
  }

  // The first press asks; the second (R or the button again, or Y) does it.
  private removePictures(confirmed: boolean): void {
    if (this.photoProgress || !this.reel.persistent || !this.photos || this.photos.length === 0) return;
    if (!confirmed) {
      this.confirmRemove = true;
      return;
    }
    const store: ReelStore = this.reel.store;
    this.photoMessage = [];
    void store.clear().then(
      () => (this.photoMessage = [PHOTOS_REMOVED]),
      () => (this.photoMessage = ["This browser could not remove them all."]),
    ).then(() => this.refreshPhotos());
  }

  private photosView(): PhotosView {
    return {
      touch: touchHints(),
      pics: this.photos,
      persistent: this.reel.persistent,
      progress: this.photoProgress,
      message: this.photoMessage,
      confirmRemove: this.confirmRemove,
    };
  }

  private photosTargets(): TapTarget[] {
    const actions = {
      add: () => {
        this.confirmRemove = false;
        this.addPictures();
      },
      remove: () => {
        const was = this.confirmRemove;
        this.confirmRemove = false;
        this.removePictures(was);
      },
      back: () => {
        this.confirmRemove = false;
        this.page = "list";
      },
    };
    return photosLayout(this.photosView()).buttons.map((b) => ({ ...b.rect, run: actions[b.id] }));
  }

  // -- The sync page (issue 103) --------------------------------------------------------------

  private openSync(): void {
    this.page = "sync";
    this.confirmReset = false;
    this.confirmSync = null;
    this.pairKey = null;
    this.flash = null;
    this.flashFor = 0;
  }

  // Runs a sync call and shows what it says. The page may have closed by then; the message is simply not seen.
  private run(job: Promise<string>): void {
    void job.then((m) => {
      this.say(m);
      if (this.syncService.status() === "on") this.auto.resume();
    });
  }

  private syncKeyPress(e: KeyEventLike): void {
    if (e.ctrlKey || e.metaKey) return;
    if (this.confirmSync) {
      if (e.code === "KeyY") this.answerSync(true);
      else this.answerSync(false);
      return;
    }
    if (e.code === "Escape") {
      this.page = "list";
      this.flash = null;
      return;
    }
    if (this.syncService.key === null) {
      if (e.code === "KeyN") return this.run(this.syncService.turnOn());
    } else {
      if (e.code === "KeyC") return this.copyLink();
      if (e.code === "KeyS") return this.run(this.syncService.syncNow());
      if (e.code === "KeyA") return this.toggleAuto();
      if (e.code === "KeyX") {
        this.confirmSync = "stop";
        this.flash = null;
        return;
      }
    }
    if (e.code === "KeyV") return this.pasteKey();
  }

  private toggleAuto(): void {
    this.sync.setAuto(!this.sync.auto());
    if (this.sync.auto()) this.auto.resume();
    this.say(this.sync.auto() ? "AUTOMATIC SYNC IS ON" : "AUTOMATIC SYNC IS OFF. SYNC NOW STILL WORKS");
  }

  // The status line in plain words: what is going on, and when it last worked.
  private statusLine(): string {
    const status = this.syncService.status();
    const text = STATUS_TEXT[status];
    if (status === "noConnection") return this.sync.auto() ? `${text}. TRYING AGAIN LATER` : text;
    if (status === "keyNotFound") return `${text}. PASTE A NEW KEY`;
    if (status !== "on") return text;
    if (!this.sync.auto()) return `${text}. AUTOMATIC SYNC IS OFF`;
    const at = this.syncService.lastOkAt;
    if (at === null) return text;
    const min = Math.floor((this.now() - at) / 60000);
    return `${text}. LAST SYNCED ${min < 1 ? "JUST NOW" : min < 60 ? `${min} MIN AGO` : `${Math.floor(min / 60)} H AGO`}`;
  }

  private answerSync(yes: boolean): void {
    const asked = this.confirmSync;
    const key = this.pairKey;
    this.confirmSync = null;
    this.pairKey = null;
    if (!yes) return;
    if (asked === "stop") this.run(this.syncService.stop());
    else if (asked === "pair" && key) this.run(this.syncService.pair(key));
  }

  private copyLink(): void {
    const key = this.syncService.key;
    if (key === null) return;
    void this.io.copy(linkFor(this.origin, key)).then((ok) => this.say(ok ? "LINK COPIED" : "COULD NOT COPY. THE LINK IS IN THE CONSOLE."));
  }

  private pasteKey(): void {
    const ask = touchHints() ? "COULD NOT READ THE CLIPBOARD" : "PRESS CTRL+V TO PASTE";
    this.io.read().then(
      (text) => (text === null ? this.say(ask) : this.run(this.syncService.pair(text))),
      () => this.say(ask),
    );
  }

  private syncView(): SyncView {
    const key = this.syncService.key;
    return {
      touch: touchHints(),
      message: this.flashFor > 0 ? this.flash : null,
      status: this.statusLine(),
      auto: this.sync.auto(),
      keyLine: key ? `KEY: ${key.slice(0, 4).toUpperCase()}...${key.slice(-4).toUpperCase()}` : null,
      isOn: key !== null,
      confirm: this.confirmSync,
      busy: this.syncService.busy,
    };
  }

  private syncTargets(): TapTarget[] {
    const actions: Record<string, () => void> = {
      on: () => this.run(this.syncService.turnOn()),
      copy: () => this.copyLink(),
      now: () => this.run(this.syncService.syncNow()),
      auto: () => this.toggleAuto(),
      paste: () => this.pasteKey(),
      stop: () => {
        this.confirmSync = "stop";
        this.flash = null;
      },
      yes: () => this.answerSync(true),
      no: () => this.answerSync(false),
      back: () => {
        this.page = "list";
        this.flash = null;
      },
    };
    return syncButtons(this.syncView()).map((b) => ({ ...b.rect, run: actions[b.id] }));
  }

  private openTransfer(): void {
    this.page = "transfer";
    this.confirmReset = false;
    this.confirmRestore = false;
    this.flash = null;
    this.flashFor = 0;
  }

  private say(message: string): void {
    this.flash = message;
    this.flashFor = SYNC.flashSeconds;
  }

  private transferKey(e: KeyEventLike): void {
    // Ctrl+V is the browser's paste, which arrives as a paste event; the V key alone asks the clipboard.
    if (e.ctrlKey || e.metaKey) return;
    if (this.confirmRestore) {
      if (e.code === "KeyY") this.restore();
      else this.confirmRestore = false;
      return;
    }
    if (e.code === "Escape") {
      this.page = "list";
      this.flash = null;
      return;
    }
    if (e.code === "KeyC") return this.copyCode();
    if (e.code === "KeyV") return this.pasteCode();
    if (e.code === "KeyF") return this.saveFile();
    if (e.code === "KeyO") return this.openFile();
    if (e.code === "KeyR" && e.shiftKey) this.confirmRestore = true;
  }

  private restore(): void {
    this.confirmRestore = false;
    this.say(this.restoreBackup() ? "BACK TO BEFORE THE LAST IMPORT" : "NOTHING TO GO BACK TO");
  }

  private copyCode(): void {
    void encodeSave(this.doc()).then(
      (code) => this.io.copy(code).then((ok) => this.say(ok ? "CODE COPIED" : "COULD NOT COPY. THE CODE IS IN THE CONSOLE.")),
      () => this.say("COULD NOT MAKE A CODE"),
    );
  }

  private saveFile(): void {
    this.say(this.io.saveFile(SYNC.fileName, saveFileText(this.doc())) ? "FILE SAVED" : "COULD NOT SAVE A FILE");
  }

  private pasteCode(): void {
    const ask = touchHints() ? "COULD NOT READ THE CLIPBOARD. TRY OPEN FILE." : "PRESS CTRL+V TO PASTE";
    this.io.read().then(
      (text) => (text === null ? this.say(ask) : this.importText(text)),
      () => this.say(ask),
    );
  }

  // Called straight from the tap or key, so the browser lets the chooser open.
  private openFile(): void {
    this.io.pickFile().then((file) => {
      if (file === null) return;
      if ("tooBig" in file) return this.say(this.problem("tooBig"));
      this.importText(file.text);
    }, () => this.say("COULD NOT READ THAT FILE"));
  }

  private problem(error: DecodeError): string {
    return {
      notASave: "NOT A SAVE FROM THIS GAME",
      newer: "THAT SAVE IS FROM A NEWER GAME",
      damaged: "THAT SAVE COULD NOT BE READ",
      unreadable: "THAT SAVE COULD NOT BE READ",
      tooBig: "THAT SAVE IS TOO BIG",
    }[error];
  }

  // A pasted code or an opened file: merged into this save at once, never replacing it.
  importText(text: string): void {
    void decodeSave(text, this.syncEnv()).then((result) => {
      if (!result.ok) return this.say(this.problem(result.error));
      // Should the page have closed meanwhile, or something started, it waits for the pause screen instead.
      if (!this.canApplyNow()) return this.sync.hold(result.doc);
      const { changed, trackFull } = this.applyIncoming(result.doc);
      this.say(!changed ? "NOTHING NEW IN THAT SAVE" : trackFull ? "SAVE MERGED. THE TRACK LIST IS FULL." : "SAVE MERGED");
    });
  }

  private transferView(): TransferView {
    return {
      touch: touchHints(),
      message: this.flashFor > 0 ? this.flash : null,
      confirmRestore: this.confirmRestore,
    };
  }

  private toggleVoice(): void {
    this.game.dialogVoice?.toggle();
  }

  // The ad blocker (issue 043 stage B): kept with the settings, so a progress reset leaves it alone.
  private toggleAdBlocker(): void {
    this.confirmReset = false;
    this.game.setAdBlocker(!this.game.adBlockerOn);
    this.flash = `AD BLOCKER: ${this.game.adBlockerOn ? "ON" : "OFF"}`;
    this.flashFor = UI.flashSeconds;
  }

  private moveCursor(step: number): void {
    const n = this.list.length;
    this.cursor = (this.cursor + step + n) % n;
    this.confirmReset = false;
  }

  // What the screen shows right now. One place, so the picture and the taps agree.
  private view(): ListView {
    const touch = touchHints();
    return {
      achievements: this.list,
      unlocked: (id) => this.unlocks.has(id),
      cursor: this.cursor,
      voice: this.game.dialogVoice?.label() ?? null,
      // On touch the question is drawn with YES and NO buttons, so it has no text line.
      message: this.confirmReset ? (touch ? null : "RESET ALL PROGRESS? Y: YES") : this.flashFor > 0 ? this.flash : null,
      adBlocker: this.game.adBlockerOn,
      sprites: this.game.sprites,
      touch,
      confirmReset: this.confirmReset,
    };
  }

  // Everything on the pause screen that a finger can press (issue 093): each setting, RESET with
  // its YES and NO, CLOSE, the achievement rows and the page button.
  tapTargets(): TapTarget[] {
    if (!this.listOpen || !touchHints()) return [];
    if (this.page === "transfer") return this.transferTargets();
    if (this.page === "sync") return this.syncTargets();
    if (this.page === "things") return this.thingsTargets();
    if (this.page === "photos") return this.photosTargets();
    const view = this.view();
    const actions: Record<string, () => void> = {
      adBlocker: () => this.toggleAdBlocker(),
      voice: () => this.toggleVoice(),
      transfer: () => this.openTransfer(),
      sync: () => this.openSync(),
      things: () => this.openThings(),
      photos: () => this.openPhotos(),
      reset: () => {
        this.confirmReset = true;
      },
      yes: () => this.reset(),
      no: () => {
        this.confirmReset = false;
      },
      close: () => this.closeList(),
    };
    const targets: TapTarget[] = [];
    for (const { index, rect } of listRows(view)) {
      targets.push({ ...rect, run: () => {
        this.cursor = index;
        this.confirmReset = false;
      } });
    }
    const page = pageButton(view);
    if (page) {
      const size = touchPageSize();
      targets.push({ ...page.rect, run: () => {
        // The first achievement of the next page, back to the first page after the last.
        this.cursor = ((Math.floor(this.cursor / size) + 1) * size) % this.list.length;
        this.confirmReset = false;
      } });
    }
    for (const b of pauseButtons(view)) targets.push({ ...b.rect, run: actions[b.id] });
    return targets;
  }

  private transferTargets(): TapTarget[] {
    const actions: Record<string, () => void> = {
      copy: () => this.copyCode(),
      paste: () => this.pasteCode(),
      save: () => this.saveFile(),
      open: () => this.openFile(),
      restore: () => {
        this.confirmRestore = true;
      },
      yes: () => this.restore(),
      no: () => {
        this.confirmRestore = false;
      },
      back: () => {
        this.page = "list";
        this.flash = null;
      },
    };
    return transferButtons(this.transferView()).map((b) => ({ ...b.rect, run: actions[b.id] }));
  }

  update(dt: number): void {
    this.stats.played(dt);
    this.toasts.update(dt);
    if (this.flashFor > 0) {
      this.flashFor -= dt;
      if (this.flashFor <= 0) this.flash = null;
    }
    this.sinceSave += dt;
    this.sinceCheck += dt;
    if (this.sinceCheck >= UI.checkEvery) {
      this.sinceCheck = 0;
      this.check();
    }
    if (this.sinceSave >= UI.saveEvery) this.save();
    this.auto.tick();
  }

  drawHud(ctx: CanvasRenderingContext2D): void {
    drawToasts(ctx, this.toasts.views());
    if (this.listOpen) {
      if (this.page === "transfer") drawTransfer(ctx, this.transferView());
      else if (this.page === "sync") drawSync(ctx, this.syncView());
      else if (this.page === "things") drawThings(ctx, this.thingsView());
      else if (this.page === "photos") drawPhotos(ctx, this.photosView());
      else drawList(ctx, this.view());
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
