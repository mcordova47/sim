import { APARTMENT_LEVEL } from "./game/apartment";
import { attachFeatures } from "./game/features";
import { Game } from "./game/game";
import { startLoop } from "./game/loop";
import { readControls } from "./input/controls";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();
const game = new Game(APARTMENT_LEVEL);
attachFeatures(game);

startLoop({
  update(dt) {
    game.update(dt, readControls(keyboard));
    keyboard.endFrame();
  },
  render(alpha) {
    game.render(ctx, alpha);
  },
});
