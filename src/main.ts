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
