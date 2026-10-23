import { APARTMENT } from "./game/apartment";
import { attachFeatures } from "./game/features";
import { Game } from "./game/game";
import { startLoop } from "./game/loop";
import { readControls } from "./input/controls";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";
import { spriteNames } from "./render/sprite-names";
import { Sprites } from "./render/sprites";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();
const sprites = new Sprites();
const game = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, sprites });
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
