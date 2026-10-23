import { Game } from "./game/game";
import { PLACEHOLDER_LEVEL } from "./game/level";
import { startLoop } from "./game/loop";
import { readControls } from "./input/controls";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();
const game = new Game(PLACEHOLDER_LEVEL);

startLoop({
  update(dt) {
    game.update(dt, readControls(keyboard));
    keyboard.endFrame();
  },
  render(alpha) {
    game.render(ctx, alpha);
  },
});
