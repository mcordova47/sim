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
import { drawProgress, drawPrompt } from "../render/world-ui";
import { pickVariant, type Appearance } from "./appearance";
import { DEBUG, DIALOG, ENERGY, MOOD, TILE, VIEW } from "./config";
import type { ActivityHost } from "./activity";
import type { Interactable } from "./interactable";
import { DialogRunner, type DialogNode, type DialogResult } from "./dialog";
import { DELTA, DIRECTIONS, type Direction } from "./direction";
import { Emitter, type GameEvents } from "./events";
import { Grid } from "./grid";
import { InteractionSystem } from "./interaction";
import { validateLevel, type Door, type Level, type Piece } from "./level";
import { outfitPrefix } from "./outfits";
import { Player } from "./player";
import { CARRIED, POSES, heldSprite, type PoseDef } from "./poses";
import { ApartmentState } from "./state";
import { STATE_VARS } from "./state-vars";
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
  // A random number from 0 up to 1, for the mini-games. Math.random by default;
  // tests pass a seeded one.
  random?: () => number;
  // Where the sprites come from. Without it (tests) everything is drawn as
  // plain coloured rectangles.
  sprites?: SpriteDrawer;
}

// The running game: owns the player, tasks, scoring and the UI built on them.
// It never touches the keyboard or the loop, so it can be driven by tests.
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
  // Announces steps, bumps into things, and task starts, completions and refusals.
  readonly events = new Emitter<GameEvents>();
  private readonly hud = new Hud();
  private readonly popups = new Popups();
  private readonly layers: Layer[] = [];
  private level: Level;
  private grid: Grid;
  private readonly dialog: DialogRunner;
  // Who currently has the controls (a dialog, later an activity or cutscene).
  private readonly locks = new Set<object>();
  private releaseDialogLock: (() => void) | null = null;
  // The other levels the level's doorways lead to, by id.
  private readonly rooms: Readonly<Record<string, Level>>;
  private readonly random: () => number;
  private readonly painter: RoomPainter;
  private readonly spriteDrawer: SpriteDrawer | undefined;
  // The piece the player was facing when the running task started, which is
  // what its pose is drawn on.
  private doing: { item: Interactable; piece: Piece | null } | null = null;

  constructor(level: Level, options: GameOptions = {}) {
    this.state = options.state ?? new ApartmentState(STATE_VARS);
    validateLevel(level, this.validation());
    this.level = level;
    this.rooms = options.rooms ?? {};
    this.random = options.random ?? Math.random;
    this.spriteDrawer = options.sprites;
    this.painter = new RoomPainter(options.sprites);
    this.grid = new Grid(level.size, this.activeSolids());
    this.state.onChange = (change) => this.stateChanged(change);
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
        lines.push({ text: `GOOD HOUR X${award.timeFactor.toFixed(1)}`, color: COLOR.butter });
      }
      const zone = boundsOf(item.zones);
      this.popups.add(zone.x + zone.w / 2, zone.y, lines);
      this.events.emit("taskComplete", { item, award });
    }, this.state);
    this.interaction.onStart = (item) => {
      this.doing = { item, piece: this.facedPiece() };
      this.events.emit("taskStart", { item });
    };
    this.interaction.onCancelled = (item) => this.events.emit("taskCancelled", { item });
    this.interaction.host = this.activityHost();
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

  // What level checks may ask of this game.
  private validation(): { hasState(id: string): boolean } {
    return { hasState: (id) => this.state.has(id) };
  }

  // What activities (cutscenes, dialogs, mini-games) are allowed to ask of the game.
  private activityHost(): ActivityHost {
    const player = this.player;
    return {
      openDialog: (node, onDone) => this.openDialog(node, onDone),
      cue: (name) => this.events.emit("cue", { name }),
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
      sprites: this.spriteDrawer,
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

  private stateChanged(change: { id: string; value: number; previous: number }): void {
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

  get dialogOpen(): boolean {
    return this.dialog.open;
  }

  // Opens a dialog or menu. Returns false if one is already open. `onDone` is
  // called when this dialog closes, with the labels the player picked.
  openDialog(node: DialogNode, onDone?: (result: DialogResult) => void): boolean {
    return this.dialog.start(node, onDone);
  }

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
    // Escape backs out of the running action even while its text or menu is up
    // (the dialog would otherwise own the key). The action is cancelled first, so
    // when the dialog's close reaches it, it is already over.
    if (this.dialog.open && controls.keys.includes("Escape") && this.interaction.cancelActive()) {
      this.dialog.abort();
      controls = NO_INPUT;
    }
    if (this.dialog.open) {
      // The dialog has the controls. Unless the clock is set to run on, time
      // stands still while it is open (task cooldowns, the combo, and the
      // apartment's clock and energy), and the press that closes it can't also
      // start a task.
      this.dialog.update(dt, controls);
      if (!DIALOG.pauseClock) {
        this.state.tick(dt);
        this.interaction.update(dt, this.player, NO_INPUT);
      }
    } else {
      this.state.tick(dt);
      this.interaction.update(dt, this.player, this.inputLocked ? NO_INPUT : controls);
    }
    this.player.stepTimeScale = this.state.get("energy") < ENERGY.lowBelow ? ENERGY.tiredStepFactor : 1;
    // Free to walk unless a task is running or something else has the controls.
    // A running activity may walk the player by script (a cutscene).
    const walking = !this.inputLocked && !this.interaction.busy;
    const scripted = this.inputLocked ? null : this.interaction.playerControls;
    this.player.update(dt, walking ? controls : (scripted ?? NO_INPUT), this.grid);
    if (this.player.arrivedThisUpdate) this.events.emit("step", this.player.arrivedThisUpdate);
    if (this.player.bumpedThisUpdate) this.events.emit("bump", this.player.bumpedThisUpdate);
    const arrived = this.player.arrivedThisUpdate;
    const door = arrived && this.level.doors.find((d) => d.col === arrived.col && d.row === arrived.row);
    if (door) this.enterDoor(door);
    this.camera.update(dt, this.playerCentre());
    this.popups.update(dt);
    this.hud.update(dt, this.interaction.scoreboard.score);
    this.eachLayer((layer) => layer.update?.(dt));
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
    if (this.interaction.active?.activity.cancellable) this.hud.drawStopHint(ctx);
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
  private currentPose(): { def: PoseDef; piece: Piece } | null {
    const active = this.interaction.active?.item;
    if (!active?.pose || this.doing?.item !== active || !this.doing.piece) return null;
    const def = POSES[active.pose];
    const piece = this.doing.piece;
    if (!def || piece.sprite !== def.on || !this.painter.available(def.sprite)) return null;
    return { def, piece };
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
    for (const appearance of level.appearances ?? []) {
      looksChange.add(appearance);
      const variant = pickVariant(appearance.variants, this.state);
      if (!variant) continue;
      const { area } = appearance;
      drawables.push({
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
      });
    }
    // Pieces that look the same whatever the state are drawn from their sprite.
    const changing = (piece: Piece) =>
      [...looksChange].some((a) => sameRect(a.area, piece.bounds));
    for (const piece of level.pieces) {
      if (!piece.sprite || changing(piece) || !painter.available(piece.sprite)) continue;
      const { x, y, h } = piece.bounds;
      for (const t of piece.tiles) covered.add(tileKey(t.col, t.row));
      if (pose?.def.replacesPiece && pose.piece === piece) continue;
      drawables.push({ bottom: y + h, draw: () => painter.draw(ctx, piece.sprite!, x, y) });
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
      const { def, piece } = pose;
      const x = piece.bounds.x + def.at.x;
      const y = piece.bounds.y + def.at.y;
      drawables.push({ bottom: y + def.size.h, draw: () => painter.draw(ctx, def.sprite, x, y) });
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
      if (interaction.active) {
        drawProgress(ctx, actor, interaction.active.item, interaction.progress, VIEW, popupBoxes);
      } else if (interaction.nearby) {
        const cooldown = interaction.cooldownRemaining(interaction.nearby);
        const unavailable = interaction.unavailableReason(interaction.nearby);
        const goodTime = unavailable === null && cooldown === 0 && interaction.isGoodTime(interaction.nearby);
        drawPrompt(ctx, actor, interaction.nearby, cooldown, VIEW, popupBoxes, unavailable, goodTime);
      }
    }
    this.popups.draw(ctx, VIEW, cam);
  }

  private drawHud(ctx: CanvasRenderingContext2D): void {
    this.hud.draw(ctx, this.interaction.scoreboard, this.interaction.time, this.state);
  }
}

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
