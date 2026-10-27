import { APARTMENT } from "./game/apartment";
import { attachFeatures } from "./game/features";
import { deliverFromSearch, encounterOnFirstKey, ownFromSearch, skipDaysFromSearch } from "./game/decor-dev";
import { Game } from "./game/game";
import { startLoop } from "./game/loop";
import { reducedMotionAsked } from "./game/reduced-motion";
import { readControls } from "./input/controls";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";
import { spriteNames } from "./render/sprite-names";
import { Sprites } from "./render/sprites";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();
const sprites = new Sprites();
const game = new Game(APARTMENT.rooms[APARTMENT.start], {
  rooms: APARTMENT.rooms,
  sprites,
  reducedMotion: () => reducedMotionAsked(),
});
attachFeatures(game);

// A dev shortcut for looking at a state without playing to it: `?set=plantStage:3`
// or `?set=plantStage:1,plantDry:100` (the plant drooping). Comma separated
// `variable:value` pairs, applied after any saved progress is loaded. Unknown
// names and bad numbers are ignored. It is quiet: no events, so no particles or
// popups, and the room is set up again so doors and the like follow the values.
try {
  const effects = (new URLSearchParams(location.search).get("set") ?? "")
    .split(",")
    .map((pair) => pair.split(":"))
    .filter(([id, value]) => game.state.has(id) && value !== "" && Number.isFinite(Number(value)))
    .map(([id, value]) => ({ var: id, set: Number(value) }));
  if (effects.length) {
    const listener = game.state.onChange;
    game.state.onChange = undefined;
    game.state.applyEffects(effects);
    game.state.onChange = listener;
    const { player } = game;
    game.loadLevel(game.currentLevel, player.col, player.row, player.facing);
  }
} catch {
  // No address to read (never in a browser).
}

// A dev shortcut to own decor you cannot get yet (issue 062 stage 2): `?own=test`
// owns every TEST item, or list ids: `?own=art-test-barn,lamp-test-stool`. Only in
// the dev server; a built game ignores it.
try {
  if (import.meta.env.DEV) ownFromSearch(game.decor, location.search);
} catch {
  // No address to read (never in a browser).
}

// Also dev only (issue 062 stage 3a): `?deliver=test` switches on the dev gift
// checkpoints (TEST items), or `?deliver=id,id` sends those items to the door.
try {
  if (import.meta.env.DEV) deliverFromSearch(game.deliveries, location.search);
  // `?days=3` skips three game days (the real gifts fire; each arrives 2 game hours later).
  if (import.meta.env.DEV) skipDaysFromSearch(game.deliveries, location.search);
  // `?encounter=ad-candle` shows that ad's encounter on the first key press, so audio is unlocked (`random` picks one; `&again=1` replays after each one).
  if (import.meta.env.DEV) encounterOnFirstKey(game, location.search, window, () => keyboard.endFrame());
} catch {
  // No address to read (never in a browser).
}

// Load every sprite before the first frame. A missing one draws as a coloured
// rectangle (and is logged) rather than blocking the game.
sprites.load(spriteNames(Object.values(APARTMENT.rooms))).then(() => {
  startLoop({
    update(dt) {
      game.update(dt, readControls(keyboard));
      keyboard.endFrame();
    },
    render(alpha) {
      game.render(ctx, alpha);
    },
  });
});
