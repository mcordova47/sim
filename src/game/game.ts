import { NO_INPUT, type Controls } from "../input/controls";
import { Camera } from "../render/camera";
import { COLOR } from "../render/colors";
import { drawDialog } from "../render/dialog-box";
import { Hud } from "../render/hud";
import { Popups, type PopupLine } from "../render/popups";
import { drawText } from "../render/font";
import { STATUS_BOX } from "../render/layout";
import { playerFrame } from "../render/player-sprite";
import { RoomPainter, drawFloorAndWalls } from "../render/room-painter";
import type { SpriteDrawer } from "../render/sprites";
import { GOOD_HOUR_ICON, GOOD_HOUR_ICON_SIZE, drawProgress, drawPrompt } from "../render/world-ui";
import { pickVariant, type Appearance, type Variant } from "./appearance";
import { Decor } from "./decor";
import { Deliveries } from "./deliveries";
import { EncounterActivity } from "./activities/encounter";
import type { Ad } from "./encounter-ads";
import { Encounters } from "./encounters";
import { CLOCK, DEBUG, DIALOG, ENERGY, MOOD, TILE, VIEW } from "./config";
import type { ActivityHost, RecordState } from "./activity";
import type { Interactable } from "./interactable";
import { DialogRunner, say, type DialogNode, type DialogResult, type DialogView } from "./dialog";
import { DELTA, DIRECTIONS, type Direction } from "./direction";
import { Emitter, type GameEvents } from "./events";
import { Grid } from "./grid";
import { InteractionSystem } from "./interaction";
import { validateLevel, type Door, type Level, type Piece } from "./level";
import { outfitPrefix } from "./outfits";
import { Player } from "./player";
import { settlePlant } from "./plant";
import { CARRIED, POSES, breathBand, heldSprite, type PoseDef } from "./poses";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
import type { SleepScene } from "./sleep";
import { boundsOf, type Rect, type Solid } from "./world";

// An extra thing the game updates and draws, added with `Game.addLayer`. Every
// hook is optional. Layers run in the order they were added.
//
// Each draw hook runs between its own `save()` and `restore()`, so a layer can
// change `globalAlpha`, the fill style or the transform without cleaning up.
// A layer must still balance its own `save`/`restore` calls. If it doesn't (it
// throws between them, forgets one or calls `restore` too often), the game
// puts the canvas back to a known state (the camera transform for world
// layers, the identity transform for HUD layers, `globalAlpha` 1 and
// `source-over` compositing) before the next layer, after the world pass and at
// the start of the next frame, so the damage stops there. It can't undo
// leftover entries on the canvas state stack, so an unbalanced layer is still a
// bug. A layer cannot move the camera: a translate in `drawWorld` only lasts
// for that layer (screen shake would need a camera API).
//
// A layer may remove itself or another layer from inside a hook, and it gets a
// copy of the camera position. A layer that throws is reported (with its
// `name`) and removed, so one broken feature can't stop the game. A layer added
// during a frame first runs on the next one. Adding the same layer object
// twice is ignored.
export interface Layer {
  // Shown in the log when the layer throws, so it's clear which feature broke.
  name?: string;
  update?(dt: number): void;
  // Drawn in world space, inside the camera transform, after the player.
  // `camera` is the world position of the top-left of the view.
  drawWorld?(ctx: CanvasRenderingContext2D, camera: { x: number; y: number }): void;
  // Drawn in screen space, after the HUD.
  drawHud?(ctx: CanvasRenderingContext2D): void;
}

// How to set up a game beyond its first level.
export interface GameOptions {
  // The other levels the level's doorways lead to, by id.
  rooms?: Readonly<Record<string, Level>>;
  // The apartment and character state; a fresh one by default (a saved one
  // can be passed in).
  state?: ApartmentState;
  // What is on the walls and shelves (issue 062); today's room by default (a
  // saved one can be passed in).
  decor?: Decor;
  // A random number from 0 up to 1, for the mini-games. Math.random by default;
  // tests pass a seeded one.
  random?: () => number;
  // Whether the browser asked for less motion (issue 080: the ad encounter fades instead of
  // flashing). Asked each time one starts. Not asked by default.
  reducedMotion?: () => boolean;
  // Where the sprites come from. Without it (tests) everything is drawn as
  // plain coloured rectangles.
  sprites?: SpriteDrawer;
}

// The running game: owns the player, tasks, scoring and the UI built on them.
// It never touches the keyboard or the loop, so it can be driven by tests.
// The dialog voice setting as the list screen sees it (issue 075).
export interface DialogVoiceSetting {
  // Text such as "DIALOG VOICE: BEEP".
  label(): string;
  toggle(): void;
}

export class Game {
  readonly player: Player;
  readonly interaction: InteractionSystem;
  readonly camera: Camera;
  // The room the player is in (for lighting and the like).
  get currentLevel(): Level {
    return this.level;
  }

  // The apartment and character: dishes, the bed, energy and the clock.
  readonly state: ApartmentState;
  // The decor you own and where it is placed. Drawn from every frame, so a change shows at once.
  readonly decor: Decor;
  // Items on their way to the door, and the package waiting there (issue 062 stage 3a).
  readonly deliveries: Deliveries;
  // When an ad may appear after a task, and what is remembered about the last ones (issue 043 stage B).
  readonly encounters = new Encounters();
  // The ad blocker switch (issue 043 stage B). The sound feature loads it from and saves it to the
  // settings; `setAdBlocker` is what the list screen's key calls.
  adBlockerOn = false;
  onAdBlockerChange?: (on: boolean) => void;
  // Announces steps, bumps into things, and task starts, completions and refusals.
  readonly events = new Emitter<GameEvents>();
  private readonly hud = new Hud();
  private readonly popups: Popups;
  private readonly layers: Layer[] = [];
  // Game minutes that have gone by (the clock held still by an activity does not count).
  private minutes = 0;
  // Set by the sound feature: what is on the record player (issue 068). Without it
  // nothing is playing and every choice may pay.
  jukebox: (() => RecordState) | null = null;
  // Set by the sound feature (issue 075): the dialog voice setting, so the
  // achievements list screen can show it and switch it without knowing about sound.
  dialogVoice: DialogVoiceSetting | null = null;
  private level: Level;
  private grid: Grid;
  private readonly dialog: DialogRunner;
  // Who currently has the controls (a dialog, later an activity or cutscene).
  private readonly locks = new Set<object>();
  private releaseDialogLock: (() => void) | null = null;
  // The other levels the level's doorways lead to, by id.
  private readonly rooms: Readonly<Record<string, Level>>;
  private readonly random: () => number;
  private readonly reducedMotion: () => boolean;
  private readonly painter: RoomPainter;
  private readonly spriteDrawer: SpriteDrawer | undefined;
  // For layers that draw sprites of their own (the achievements legend).
  get sprites(): SpriteDrawer | undefined {
    return this.spriteDrawer;
  }
  // The piece the player was facing when the running task started, which is
  // what its pose is drawn on.
  // `sprite` is the pose's art, picked then too (a bed is slept on made or unmade).
  private doing: { item: Interactable; piece: Piece | null; sprite: string | null } | null = null;

  constructor(level: Level, options: GameOptions = {}) {
    this.state = options.state ?? new ApartmentState(STATE_VARS);
    this.decor = options.decor ?? new Decor();
    this.deliveries = new Deliveries(this.decor);
    validateLevel(level, this.validation());
    this.decor.checkLevel(level);
    for (const room of Object.values(options.rooms ?? {})) this.decor.checkLevel(room);
    this.level = level;
    this.rooms = options.rooms ?? {};
    this.random = options.random ?? Math.random;
    this.reducedMotion = options.reducedMotion ?? (() => false);
    this.spriteDrawer = options.sprites;
    this.popups = new Popups(options.sprites);
    this.painter = new RoomPainter(options.sprites);
    this.grid = new Grid(level.size, this.activeSolids());
    this.state.onChange = (change) => this.stateChanged(change);
    // Sleeping and napping skip hours, and a delivery due in that time arrives when you wake.
    this.state.onClockSkip = (hours) => this.deliveries.advance(hours);
    this.deliveries.canArrive = () => !this.onPackageSpot();
    this.deliveries.onArrive = () => {
      this.syncParcel();
      // Said once a frame at most, so arrivals at one moment never stack their text (issue 079).
      this.arrivalNoted = true;
    };
    this.player = new Player(level.spawn.x, level.spawn.y, level.facing);
    this.camera = new Camera(level.size, VIEW);
    this.camera.snapTo(this.playerCentre());
    this.interaction = new InteractionSystem(level.interactables, ({ item, award }) => {
      const lines: PopupLine[] = [{ text: `+${award.points}`, color: COLOR.butter, scale: 2 }];
      if (award.multiplier > 1) {
        lines.push({ text: `COMBO X${award.multiplier.toFixed(1)}`, color: COLOR.tangerine });
      }
      if (award.repeatFactor < 1) {
        lines.push({ text: `REPEAT X${award.repeatFactor.toFixed(2)}`, color: COLOR.mist });
      }
      // How well a mini-game went, when it made a difference.
      if (Math.abs(award.qualityFactor - 1) > 0.005) {
        lines.push({
          text: `${award.qualityFactor > 1 ? "NICE" : "SLOPPY"} X${award.qualityFactor.toFixed(2)}`,
          color: award.qualityFactor > 1 ? COLOR.leaf : COLOR.mist,
        });
      }
      // Done at the right hour.
      if (award.timeFactor > 1) {
        const x = `X${award.timeFactor.toFixed(1)}`;
        lines.push(
          this.spriteDrawer?.has(GOOD_HOUR_ICON)
            ? { text: x, color: COLOR.butter, icon: { name: GOOD_HOUR_ICON, size: GOOD_HOUR_ICON_SIZE } }
            : { text: `GOOD HOUR ${x}`, color: COLOR.butter },
        );
      }
      const zone = boundsOf(item.zones);
      this.popups.add(zone.x + zone.w / 2, zone.y, lines);
      this.events.emit("taskComplete", { item, award });
      this.maybeEncounter(item);
    }, this.state);
    this.interaction.onStart = (item) => {
      const def = item.pose ? POSES[item.pose] : undefined;
      const sprite = def ? (def.variants?.find((v) => this.state.matchesAll(v.when))?.sprite ?? def.sprite) : null;
      this.doing = { item, piece: this.facedPiece(), sprite };
      this.events.emit("taskStart", { item });
    };
    this.interaction.onCancelled = (item) => this.events.emit("taskCancelled", { item });
    this.interaction.host = this.activityHost();
    // A swap with nothing to swap to is not offered (no prompt, not in the choice cycle).
    this.interaction.hidden = (item) =>
      (item.decorSlot !== undefined && !this.decor.canChange(item.decorSlot)) || (item.delivery === true && !this.deliveries.waiting) ||
      // Taking out the recycling is only offered at the boxes when they are flat (issues 070 and 071); otherwise Flatten the boxes is what shows.
      (item.id === "recycle-boxes" && this.state.has("boxes") && this.state.get("boxes") !== 0);
    this.dialog = new DialogRunner({
      onOpen: () => {
        this.releaseDialogLock?.();
        this.releaseDialogLock = this.lockInput();
        this.interaction.clearPressBuffer();
        this.events.emit("dialogOpen", {});
      },
      onChoose: (label, path) => this.events.emit("dialogChoose", { label, path }),
      onClose: (result) => {
        this.releaseDialogLock?.();
        this.releaseDialogLock = null;
        this.events.emit("dialogClose", result);
      },
    });
    this.interaction.onBlocked = (item, reason, message) =>
      this.events.emit("taskBlocked", { item, reason, ...(message && { message }) });
  }

  // After a completed task: may an ad appear (issue 043 stage B)? Only when nothing else is open.
  private maybeEncounter(item: Interactable): void {
    const ad = this.encounters.roll({
      taskId: item.id,
      hours: this.deliveries.hours,
      random: () => this.random(),
      blocked: this.adBlockerOn,
      busy: this.dialog.open || this.inputLocked || this.interaction.busy,
      usable: (a) => this.decor.item(a.item) !== undefined,
    });
    if (ad) this.startEncounter(ad);
  }

  // Shows `ad` as an encounter now (the roll does, and so does the dev shortcut). False if something
  // else is running or open, or its item does not exist.
  startEncounter(ad: Ad): boolean {
    const product = this.decor.item(ad.item);
    if (!product || this.interaction.busy || this.dialog.open) return false;
    const activity = new EncounterActivity(ad, this.activityHost(), {
      owns: (id) => this.decor.owns(id),
      queued: (id) => this.deliveries.pendingItems.some((p) => p.id === id) || this.deliveries.waitingItems.includes(id),
      deliver: (id, hours) => this.deliveries.deliver(id, hours),
      mood: () => (this.state.has("mood") ? this.state.get("mood") : MOOD.rest),
      addMood: (n) => {
        if (this.state.has("mood")) this.state.applyEffects([{ var: "mood", add: n }]);
      },
      failedUnsubscribe: () => this.encounters.failedUnsubscribe(),
      random: () => this.random(),
      reducedMotion: () => this.reducedMotion(),
      product: { sprite: product.sprite, w: product.w, h: product.h },
    });
    return this.interaction.begin(ENCOUNTER_TASK, activity);
  }

  // Switches the ad blocker on or off (saved by the sound feature, which keeps the settings).
  setAdBlocker(on: boolean): void {
    this.adBlockerOn = on;
    this.onAdBlockerChange?.(on);
  }

  // What level checks may ask of this game.
  private validation(): { hasState(id: string): boolean } {
    return { hasState: (id) => this.state.has(id) };
  }

  // What activities (cutscenes, dialogs, mini-games) are allowed to ask of the game.
  private activityHost(): ActivityHost {
    const player = this.player;
    return {
      openDialog: (node, onDone) => this.openDialog(node, onDone),
      cue: (name, pitch) => this.events.emit("cue", pitch === undefined ? { name } : { name, pitch }),
      setState: (id, value) => this.state.applyEffects([{ var: id, set: value }]),
      player: {
        get col() {
          return player.col;
        },
        get row() {
          return player.row;
        },
        get facing() {
          return player.facing;
        },
        get stepping() {
          return player.stepping;
        },
        face: (direction) => {
          player.facing = direction;
        },
      },
      route: (col, row) => this.routeTo(col, row),
      previewTrack: (track, live = false) => this.events.emit("preview", { track, live }),
      blip: (freq) => this.events.emit("blip", { freq }),
      voice: (sound) => this.events.emit("voice", sound),
      records: () => this.jukebox?.() ?? { playingId: null, payoutReady: true },
      recordChosen: (id, paid) => this.events.emit("record", { id, paid }),
      reward: (points, effects) => this.interaction.award(points, effects)?.points ?? null,
      gameMinutes: () => this.minutes,
      decor: this.decor,
      collectDeliveries: (onClosed) => this.collectDeliveries(onClosed),
      sprites: this.spriteDrawer,
      getState: (id) => this.state.get(id),
      random: () => this.random(),
    };
  }

  // The shortest walk from the player's tile to another in this room that
  // does not step on a doorway (that would take them to another room), or null.
  private routeTo(col: number, row: number): Direction[] | null {
    const key = (c: number, r: number) => `${c},${r}`;
    const start = { col: this.player.col, row: this.player.row };
    const doors = new Set(this.level.doors.map((d) => key(d.col, d.row)));
    const open = (c: number, r: number) => !this.grid.isBlocked(c, r) && !doors.has(key(c, r));
    if (!open(col, row)) return null;
    const via = new Map<string, { from: string; dir: Direction }>();
    const seen = new Set([key(start.col, start.row)]);
    let frontier = [start];
    while (frontier.length && !seen.has(key(col, row))) {
      const next: typeof frontier = [];
      for (const here of frontier) {
        for (const dir of DIRECTIONS) {
          const c = here.col + DELTA[dir].dc;
          const r = here.row + DELTA[dir].dr;
          const k = key(c, r);
          if (seen.has(k) || !open(c, r)) continue;
          seen.add(k);
          via.set(k, { from: key(here.col, here.row), dir });
          next.push({ col: c, row: r });
        }
      }
      frontier = next;
    }
    if (!seen.has(key(col, row))) return null;
    const steps: Direction[] = [];
    for (let k = key(col, row); k !== key(start.col, start.row); ) {
      const v = via.get(k)!;
      steps.unshift(v.dir);
      k = v.from;
    }
    return steps;
  }

  // The solids that block right now: those with no condition, or whose condition holds.
  private activeSolids(level: Level = this.level): Solid[] {
    return level.solids.filter((s) => !s.blockedWhen || this.state.matchesAll(s.blockedWhen));
  }

  // True if the player is on (or stepping onto) the tile where the package box goes.
  private onPackageSpot(): boolean {
    for (const item of this.level.interactables) {
      if (!item.delivery) continue;
      if (item.zones.some((z) => this.player.occupies(z.x / TILE, z.y / TILE))) return true;
    }
    return false;
  }

  // The box by the door shows (and blocks its tile) while a package waits. The state
  // variable only follows the queue, and is brought in step the moment the queue
  // changes, so no step can be taken into a box that has arrived but is not blocking yet.
  private syncParcel(): void {
    const parcel = this.deliveries.waiting ? 1 : 0;
    if (this.state.has("parcel") && this.state.get("parcel") !== parcel) this.state.applyEffects([{ var: "parcel", set: parcel }]);
  }

  // An arrival happened this frame and has not been said yet.
  private arrivalNoted = false;

  // One plain line over the player.
  private say(text: string): void {
    this.popups.add(this.player.x + TILE / 2, this.player.y, [{ text, color: COLOR.paper }]);
  }

  // Opens the waiting packages: the items are added, and each one is named in one line.
  private collectDeliveries(onClosed?: () => void): void {
    const got = this.deliveries.collect();
    this.syncParcel();
    // The new package's box joins the pile, so there is always something to flatten (issue 066).
    if (got.length > 0 && this.state.has("boxes")) this.state.applyEffects([{ var: "boxes", set: 1 }]);
    const lines = got.map((id) => `OPENED: ${this.decor.item(id)?.name ?? "A PACKAGE"}`);
    if (lines.length === 0) {
      onClosed?.();
      return;
    }
    // One page per item, in order, so several gifts never pile up on one spot (issue 079).
    // Everything is owned already, so closing the dialog early loses nothing.
    let node: DialogNode | undefined;
    for (let i = lines.length - 1; i >= 0; i--) node = say(lines[i], node);
    // Another dialog already open: one plain line for the lot instead.
    if (!this.openDialog(node!, () => onClosed?.())) {
      this.say(lines.join(" "));
      onClosed?.();
    }
  }

  private stateChanged(change: { id: string; value: number; previous: number }): void {
    // Enough waterings and the plant grows a stage (issue 063). Its own changes
    // come back through here, which settles any growth left over.
    if (change.id === "plantGrowth" && this.state.has("plantStage")) settlePlant(this.state);
    // Doors, piles and the like may now block or not.
    if (this.level.solids.some((s) => s.blockedWhen)) this.grid.setSolids(this.activeSolids());
    this.events.emit("stateChanged", change);
    // Dropping below the tired line shows a yawn over the player.
    if (
      change.id === "energy" &&
      change.previous >= ENERGY.lowBelow &&
      change.value < ENERGY.lowBelow
    ) {
      this.popups.add(this.player.x + TILE / 2, this.player.y, [{ text: "YAWN...", color: COLOR.mist }]);
    }
    // Dropping below the low-mood line shows a sigh. That is all low mood
    // does for now (a slumped walk is left for later).
    if (change.id === "mood" && change.previous >= MOOD.lowBelow && change.value < MOOD.lowBelow) {
      this.popups.add(this.player.x + TILE / 2, this.player.y, [{ text: "SIGH...", color: COLOR.mist }]);
    }
  }

  // Adds an extra layer (sound, particles, toasts, lighting...). Returns a
  // function that removes it again. A layer that is already added is not added
  // a second time.
  addLayer(layer: Layer): () => void {
    if (!this.layers.includes(layer)) this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  // Takes the controls away from the player and the interaction system until
  // the returned function is called (calling it more than once is harmless).
  // A dialog, an activity or a cutscene uses this so they don't each need
  // their own way to freeze the player.
  lockInput(): () => void {
    const token = {};
    this.locks.add(token);
    return () => {
      this.locks.delete(token);
    };
  }

  get inputLocked(): boolean {
    return this.locks.size > 0;
  }

  // The look of the sleep sequence this frame, or null when nobody is asleep
  // (finished, cancelled and an error all read as null: everything that reads it
  // goes back to normal by itself).
  get sleepScene(): SleepScene | null {
    return this.interaction.active?.activity.scene ?? null;
  }

  get dialogOpen(): boolean {
    return this.dialog.open;
  }

  // What the open dialog shows right now (for features that react to its text
  // appearing, like sound), or null.
  get dialogView(): DialogView | null {
    return this.dialog.view;
  }

  // Opens a dialog or menu. Returns false if one is already open. `onDone` is
  // called when this dialog closes, with the labels the player picked.
  openDialog(node: DialogNode, onDone?: (result: DialogResult) => void): boolean {
    return this.dialog.start(node, onDone, this.strayKeysPossible() ? DIALOG.inputDelay : 0);
  }

  // A typing or notes game is running, or ended a moment ago: the player may
  // still be pressing keys, so a dialog opening now must not hear them (issue 081).
  private strayKeysPossible(): boolean {
    const running = this.interaction.active?.activity;
    return this.sinceKeyGame < DIALOG.strayWindow || !!(running && (running.readsKeys || running.strayKeys));
  }

  // The one rule for global hotkeys (the achievements list, the sound mute, the time-of-day
  // dev keys): while a typing, notes, track-editor or flashcards game runs, the keys belong
  // to it, so a hotkey must not fire (issue 081). Escape is always free. `softLetters`: the
  // key may still work while the running game is not reading letters as text (the mute key
  // in the track editor outside naming).
  hotkeyBlocked(code: string, softLetters = false): boolean {
    if (code === "Escape") return false;
    const running = this.interaction.active?.activity;
    if (!running || !(running.readsKeys || running.strayKeys)) {
      // The game just ended: the keys still coming belong to it until all have been let go
      // (a keydown arrives between frames, after the game finished and before its gate cleared).
      return this.keysGate;
    }
    return !(softLetters && running.readsLetters === false);
  }

  // Set while a key game runs and stays set after it ends until every key has been let go,
  // so a key still held (or pressed in the last frames) never becomes movement or a new task.
  private keysGate = false;
  private keysGateAge = 0;

  // Seconds since an activity that reads keys last ran (large when none has).
  private sinceKeyGame = Infinity;

  // Moves the player into another room: the level, the tile and the way they
  // face. Score, combos, cooldowns, popups, events and layers carry on.
  loadLevel(level: Level, col: number, row: number, facing: Direction): void {
    validateLevel(level, this.validation());
    if (!Number.isInteger(col) || !Number.isInteger(row)) {
      throw new Error(`Can't enter ${level.id ?? "the room"} at col ${col}, row ${row}: not a whole tile`);
    }
    if (new Grid(level.size, this.activeSolids(level)).isBlocked(col, row)) {
      throw new Error(`Can't enter ${level.id ?? "the room"} at col ${col}, row ${row}: it is blocked`);
    }
    this.level = level;
    this.grid = new Grid(level.size, this.activeSolids());
    this.interaction.setItems(level.interactables);
    this.player.placeAt(col, row, facing);
    this.camera.setWorld(level.size);
    this.camera.snapTo(this.playerCentre());
  }

  private enterDoor(door: Door): void {
    const room = this.rooms[door.to];
    if (!room) throw new Error(`The door at col ${door.col}, row ${door.row} leads to "${door.to}", which is not a known room`);
    this.loadLevel(room, door.arrive.col, door.arrive.row, door.arrive.facing);
    this.events.emit("room", { id: door.to, level: room });
  }

  update(dt: number, controls: Controls): void {
    // After a load the saved box state may not match the queue (a save written as a package arrived).
    this.syncParcel();
    // A swap preview lasts only while the swap list is open, whatever closed it.
    if (this.decor.previewing && !this.interaction.active) this.decor.clearPreview();
    // Escape backs out of the running action even while its text or menu is up
    // (the dialog would otherwise own the key). The action is cancelled first, so
    // when the dialog's close reaches it, it is already over.
    let heldClock = false;
    if (this.dialog.open && controls.keys.includes("Escape")) {
      heldClock = this.interaction.active?.activity.holdsClock === true;
      if (this.interaction.cancelActive()) {
        this.dialog.abort();
        controls = NO_INPUT;
      } else heldClock = false;
    }
    const running = this.interaction.active?.activity;
    const keyGame = !!running && (running.readsKeys || running.strayKeys);
    this.sinceKeyGame = keyGame ? 0 : this.sinceKeyGame + dt;
    if (keyGame) {
      // Escape backs out on purpose: that is not a stray key.
      this.keysGate = !controls.keys.includes("Escape");
      this.keysGateAge = 0;
    } else if (this.keysGate && !this.dialog.open) {
      this.keysGateAge += dt;
      const real = (c: string) => !/^(Shift|Control|Alt|Meta|OS)(Left|Right)$|^CapsLock$/.test(c);
      const held = this.keysGateAge < DIALOG.gateMaxSeconds && (controls.keysDown.some(real) || controls.keys.some(real) || controls.dir !== null || controls.dirPressed !== null || controls.interactPressed);
      if (held) controls = NO_INPUT;
      else this.keysGate = false;
    }
    if (this.dialog.open) {
      // The dialog has the controls. Unless the clock is set to run on, time
      // stands still while it is open (task cooldowns, the combo, and the
      // apartment's clock and energy), and the press that closes it can't also
      // start a task.
      this.dialog.update(dt, controls);
      if (!DIALOG.pauseClock) {
        this.tickClock(dt);
        this.interaction.update(dt, this.player, NO_INPUT);
      }
    } else {
      // The frame that backs out of a clock-holding activity leaves the clock exactly as it was.
      if (!heldClock) this.tickClock(dt);
      this.interaction.update(dt, this.player, this.inputLocked ? NO_INPUT : controls);
    }
    this.player.stepTimeScale = this.state.get("energy") < ENERGY.lowBelow ? ENERGY.tiredStepFactor : 1;
    // Free to walk unless a task is running or something else has the controls.
    // A running activity may walk the player by script (a cutscene).
    const walking = !this.inputLocked && !this.interaction.busy;
    const scripted = this.inputLocked ? null : this.interaction.playerControls;
    this.player.update(dt, walking ? (this.keysGate ? NO_INPUT : controls) : (scripted ?? NO_INPUT), this.grid);
    if (this.player.arrivedThisUpdate) this.events.emit("step", this.player.arrivedThisUpdate);
    if (this.player.bumpedThisUpdate) this.events.emit("bump", this.player.bumpedThisUpdate);
    const arrived = this.player.arrivedThisUpdate;
    const door = arrived && this.level.doors.find((d) => d.col === arrived.col && d.row === arrived.row);
    if (door) this.enterDoor(door);
    this.camera.update(dt, this.playerCentre());
    if (this.arrivalNoted) {
      this.arrivalNoted = false;
      this.say("A PACKAGE HAS ARRIVED.");
    }
    this.popups.update(dt);
    this.hud.update(dt, this.interaction.scoreboard.score);
    this.eachLayer((layer) => layer.update?.(dt));
  }

  // Passes `dt` seconds of game time, unless the running activity holds the
  // clock still (the track editor has no time pressure).
  private tickClock(dt: number): void {
    if (this.interaction.active?.activity.holdsClock) return;
    this.state.tick(dt);
    this.minutes += dt * CLOCK.minutesPerSecond;
    this.deliveries.advance((dt * CLOCK.minutesPerSecond) / 60);
    this.syncParcel();
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    // Interpolate between the last two simulation states for smooth motion.
    const { player } = this;
    const actor = {
      x: Math.round(player.prevX + (player.x - player.prevX) * alpha),
      y: Math.round(player.prevY + (player.y - player.prevY) * alpha),
      w: player.w,
      h: player.h,
    };

    const hardened = this.layers.some((l) => l.drawWorld || l.drawHud);
    if (hardened) resetCanvas(ctx);
    // With the tileset the ink shows where a room has no wall tile (corners, filler).
    ctx.fillStyle = this.painter.active ? COLOR.ink : COLOR.night;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // The world is drawn shifted by the camera. Everything uses the same
    // whole-pixel camera offset, so nothing shimmers against anything else.
    const cam = this.camera.position(alpha);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    this.drawWorld(ctx, actor);
    this.eachLayer((layer) =>
      this.drawLayer(ctx, () => layer.drawWorld?.(ctx, { ...cam }), layer.drawWorld, cam),
    );
    ctx.restore();
    if (hardened) resetCanvas(ctx);

    // World UI is laid out in screen space (it must stay on screen and clear
    // of the HUD), so it gets screen positions, then the HUD goes on top.
    this.drawWorldUi(ctx, { ...actor, x: actor.x - cam.x, y: actor.y - cam.y }, cam);
    this.drawHud(ctx);
    // A mini-game's own picture, then any dialog on top of it.
    this.drawActivity(ctx);
    const dialogView = this.dialog.view;
    if (dialogView) drawDialog(ctx, dialogView);
    if (this.interaction.active?.activity.cancellable && this.interaction.active.item.decorSlot === undefined && !this.interaction.active.item.encounter) this.hud.drawStopHint(ctx);
    this.eachLayer((layer) => this.drawLayer(ctx, () => layer.drawHud?.(ctx), layer.drawHud));
  }

  // A mini-game's picture. One that throws cancels its task (like a throwing
  // `update`) and the loop carries on.
  private drawActivity(ctx: CanvasRenderingContext2D): void {
    const active = this.interaction.active;
    if (!active?.activity.draw) return;
    try {
      active.activity.draw(ctx, VIEW);
    } catch (error) {
      this.interaction.abandonActive(error);
    }
  }

  // Runs `fn` for each layer, in order. It works on a snapshot, so layers can
  // add or remove layers (including themselves) while it runs without anyone
  // being skipped or called twice; a layer removed earlier in the pass is not
  // called. A layer that throws is reported and removed.
  private eachLayer(fn: (layer: Layer) => void): void {
    for (const layer of [...this.layers]) {
      if (!this.layers.includes(layer)) continue;
      try {
        fn(layer);
      } catch (error) {
        const label = layer.name ? ` "${layer.name}"` : "";
        console.error(`A layer${label} threw and was removed`, error);
        const i = this.layers.indexOf(layer);
        if (i >= 0) this.layers.splice(i, 1);
      }
    }
  }

  // Runs one draw hook inside its own save/restore, but only if there is one.
  // It starts from a known state: the camera transform when `cam` is given
  // (world layers), otherwise the identity transform.
  private drawLayer(
    ctx: CanvasRenderingContext2D,
    draw: () => void,
    hook: unknown,
    cam?: { x: number; y: number },
  ): void {
    if (!hook) return;
    ctx.save();
    resetCanvas(ctx, cam ? -cam.x : 0, cam ? -cam.y : 0);
    try {
      draw();
    } finally {
      ctx.restore();
    }
  }

  // The piece on the tile the player is facing, if any.
  private facedPiece(): Piece | null {
    const target = this.player.target;
    if (!target) return null;
    const col = target.x / TILE;
    const row = target.y / TILE;
    return this.level.pieces.find((p) => p.tiles.some((t) => t.col === col && t.row === row)) ?? null;
  }

  // The pose the player is in right now: the running task's, if it belongs to
  // the piece it was started at and its art exists (otherwise the plain
  // player is drawn, and the missing file is logged once).
  private currentPose(): { def: PoseDef; piece: Piece; sprite: string } | null {
    const active = this.interaction.active?.item;
    if (!active?.pose || this.doing?.item !== active || !this.doing.piece) return null;
    const def = POSES[active.pose];
    const piece = this.doing.piece;
    const sprite = this.doing.sprite ?? def?.sprite;
    if (!def || !sprite || piece.sprite !== def.on || !this.painter.available(sprite)) return null;
    return { def, piece, sprite };
  }

  // The look of an object that changes: the item in its decor slot, or the first
  // variant whose state holds. A slot item with no art is a labelled box.
  private appearanceLook(appearance: Appearance): Variant | null {
    if (appearance.slot === undefined) return pickVariant(appearance.variants, this.state);
    const { sprite, color, label } = this.decor.look(appearance.slot, this.state);
    return { sprite, ...(color && { color }), label };
  }

  private playerCentre(): { x: number; y: number } {
    return { x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2 };
  }

  // The floor and walls, then furniture and the player ordered by how far down
  // the screen the bottom edge of their footprint is, so whatever is nearer the
  // viewer is drawn in front (the player stands behind a piece below them and
  // in front of one above). Pieces draw their sprite at the top-left of their
  // bounds, so rows above the footprint overhang the tile behind. Anything
  // whose sprite is missing (or all of it, without a sprite source) is a
  // coloured rectangle. Task zones only show in debug.
  private drawWorld(ctx: CanvasRenderingContext2D, actor: Actor): void {
    const { painter, level } = this;
    drawFloorAndWalls(ctx, level, painter);

    const walled = painter.active && level.walls !== undefined;
    const drawables: { bottom: number; draw: () => void }[] = [];
    const pose = this.currentPose();
    // Tiles whose rectangle is not needed because a sprite covers them, and
    // every tile that belongs to some piece (the rest of the solids are walls).
    const covered = new Set<string>();
    const pieceTiles = new Set<string>();
    const tileKey = (col: number, row: number) => `${col},${row}`;
    for (const piece of level.pieces) for (const t of piece.tiles) pieceTiles.add(tileKey(t.col, t.row));

    const looksChange = new Set<Appearance>();
    const slotDrawables = new Map<Appearance, { bottom: number; draw: () => void }>();
    for (const appearance of level.appearances ?? []) {
      looksChange.add(appearance);
      const variant = this.appearanceLook(appearance);
      if (!variant) continue;
      const { area } = appearance;
      const drawable = {
        bottom: area.y + area.h,
        draw: () => {
          if (painter.draw(ctx, variant.sprite, area.x, area.y)) return;
          ctx.fillStyle = COLOR[variant.color ?? "mist"];
          ctx.fillRect(area.x, area.y, area.w, area.h);
          if (variant.label) {
            drawText(ctx, variant.label, area.x + area.w / 2, area.y + area.h / 2 - 3, {
              color: COLOR.ink,
              align: "center",
              shadow: null,
            });
          }
        },
      };
      // A decor slot is drawn where its piece would be, so the order of drawing
      // (and so what is in front on a tie) is the same as for a plain piece.
      if (appearance.slot !== undefined) slotDrawables.set(appearance, drawable);
      else drawables.push(drawable);
    }
    // Pieces that look the same whatever the state are drawn from their sprite.
    const changing = (piece: Piece) =>
      [...looksChange].some((a) => sameRect(a.area, piece.bounds));
    for (const piece of level.pieces) {
      const slotted = [...slotDrawables].find(([a]) => sameRect(a.area, piece.bounds));
      if (slotted) {
        drawables.push(slotted[1]);
        slotDrawables.delete(slotted[0]);
        continue;
      }
      if (!piece.sprite || changing(piece) || !painter.available(piece.sprite)) continue;
      const { x, y, h } = piece.bounds;
      for (const t of piece.tiles) covered.add(tileKey(t.col, t.row));
      if (pose?.def.replacesPiece && pose.piece === piece) continue;
      drawables.push({ bottom: y + h, draw: () => painter.draw(ctx, piece.sprite!, x, y) });
    }

    for (const left of slotDrawables.values()) drawables.push(left);

    // Props sit on top of their piece: drawn with it, in front of it.
    for (const prop of level.props ?? []) {
      if (prop.when && !this.state.matchesAll(prop.when)) continue;
      const variant = this.decor.hasSlot(prop.slot)
        ? this.decor.look(prop.slot, this.state)
        : pickVariant(prop.variants ?? [], this.state);
      const sprite = variant?.sprite ?? prop.sprite;
      const { x, y, w, h } = prop.area;
      drawables.push({
        bottom: prop.on.bounds.y + prop.on.bounds.h,
        draw: () => {
          if (sprite && painter.draw(ctx, sprite, x, y)) return;
          ctx.fillStyle = COLOR[variant?.color ?? prop.color ?? "leaf"];
          ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
        },
      });
    }

    for (const s of this.activeSolids()) {
      if (s.hidden) continue;
      const k = tileKey(s.x / TILE, s.y / TILE);
      // Walls are drawn as tiles; furniture with a sprite is drawn from it.
      if (covered.has(k) || (walled && !pieceTiles.has(k))) continue;
      drawables.push({
        bottom: s.y + s.h,
        draw: () => {
          ctx.fillStyle = s.color ?? COLOR.dusk;
          ctx.fillRect(s.x, s.y, s.w, s.h);
        },
      });
    }
    if (pose) {
      // Over the piece it is on, and in front of anything it overlaps.
      const { def, piece, sprite } = pose;
      const x = piece.bounds.x + def.at.x;
      const y = piece.bounds.y + def.at.y;
      // The sleeper's breath (issue 078): 0 whenever there is no sleep scene. A pose
      // with a band moves only that band (the bed stays still); one without moves
      // the whole picture. The draw order key (`bottom`) does not move.
      const lift = this.sleepScene?.breath ?? 0;
      const band = lift > 0 ? breathBand(def, sprite) : null;
      drawables.push({
        bottom: y + def.size.h,
        draw: () => {
          if (lift === 0) painter.draw(ctx, sprite, x, y);
          else if (!band) painter.draw(ctx, sprite, x, y - lift);
          else {
            painter.draw(ctx, sprite, x, y);
            painter.drawRegion(ctx, sprite, band, x + band.x, y + band.y - lift);
          }
        },
      });
    } else {
      drawables.push({ bottom: actor.y + actor.h, draw: () => this.drawPlayer(ctx, actor) });
    }
    // The sort is stable, so on a tie the player (added last) is in front.
    drawables.sort((a, b) => a.bottom - b.bottom);
    for (const d of drawables) d.draw();

    if (DEBUG.zones) {
      ctx.strokeStyle = COLOR.butter;
      for (const item of this.level.interactables) {
        for (const z of item.zones) ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
      }
    }
  }

  // The player's idle or walking frame for the way they face; without it, a
  // rectangle with a small mark on the side it is facing.
  private drawPlayer(ctx: CanvasRenderingContext2D, actor: Actor): void {
    const { player, painter } = this;
    const prefix = outfitPrefix(this.state.get("outfit"));
    // An outfit with no art for this frame falls back to the everyday clothes,
    // and the missing file is logged once.
    const step = (has: (n: string) => boolean) =>
      playerFrame(player.facing, player.stepping, player.stepsTaken, has, prefix);
    if (prefix !== outfitPrefix(0)) painter.available(step(() => true).name);
    const frame = step((n) => painter.has(n));
    const drawn = painter.draw(ctx, frame.name, actor.x, actor.y, frame.flip);
    // What is in their hands: the running task's item, else a coffee they are carrying.
    const held =
      this.interaction.active?.item.held ?? (this.state.get(CARRIED.var) >= 1 ? CARRIED.item : null);
    if (held) painter.draw(ctx, heldSprite(held, player.facing), actor.x, actor.y);
    if (drawn) return;
    ctx.fillStyle = COLOR.brick;
    ctx.fillRect(actor.x, actor.y, actor.w, actor.h);
    const { dc, dr } = DELTA[player.facing];
    ctx.fillStyle = COLOR.paper;
    ctx.fillRect(actor.x + 6 + dc * 5, actor.y + 6 + dr * 5, 4, 4);
  }

  // `actor` is in screen coordinates; `cam` is the world position of the
  // top-left of the view, for things (popups) that live at world positions.
  private drawWorldUi(
    ctx: CanvasRenderingContext2D,
    actor: Actor,
    cam: { x: number; y: number },
  ): void {
    const { interaction } = this;
    // Labels keep clear of any popup that is still floating up.
    const popupBoxes = [...this.popups.boxes(VIEW, cam), STATUS_BOX];
    // No prompt while a dialog is open: it would only sit behind the boxes.
    if (!this.dialog.open) {
      // (A decor swap draws its own list, which hides what it is changing otherwise.)
      if (interaction.active) {
        if (interaction.active.item.decorSlot === undefined && !interaction.active.item.encounter) {
          // The banner fades while asleep, so it is not over the sleeper's head (issue 078).
          const alpha = this.sleepScene?.bannerAlpha ?? 1;
          if (alpha >= 1) drawProgress(ctx, actor, interaction.active.item, interaction.progress, VIEW, popupBoxes);
          else if (alpha > 0.01) {
            ctx.globalAlpha = alpha;
            drawProgress(ctx, actor, interaction.active.item, interaction.progress, VIEW, popupBoxes);
            ctx.globalAlpha = 1;
          }
        }
      } else if (interaction.nearby) {
        const cooldown = interaction.cooldownRemaining(interaction.nearby);
        const unavailable = interaction.unavailableReason(interaction.nearby);
        const goodTime = unavailable === null && cooldown === 0 && interaction.isGoodTime(interaction.nearby);
        drawPrompt(ctx, actor, interaction.nearby, cooldown, VIEW, popupBoxes, unavailable, goodTime, this.spriteDrawer, interaction.choices.length > 1 ? { index: interaction.choiceIndex, count: interaction.choices.length } : null);
      }
    }
    this.popups.draw(ctx, VIEW, cam);
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    this.hud.draw(ctx, this.interaction.scoreboard, this.interaction.time, this.state);
  }
}

// The stand-in task an ad encounter runs as (it is in no room, pays nothing and always ends quietly).
const ENCOUNTER_TASK: Interactable = { id: "encounter", name: "Ad", prompt: "", duration: 0, points: 0, encounter: true, zones: [] };

// The state every frame starts from: no transform (or just a translation),
// fully opaque, normal compositing.
function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function resetCanvas(ctx: CanvasRenderingContext2D, tx = 0, ty = 0): void {
  ctx.setTransform(1, 0, 0, 1, tx, ty);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

interface Actor {
  x: number;
  y: number;
  w: number;
  h: number;
}
