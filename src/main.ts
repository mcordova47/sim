import { APARTMENT_LEVEL } from "./game/apartment";
import { Game } from "./game/game";
import { startLoop } from "./game/loop";
import { readControls } from "./input/controls";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";
import { PLAYER_FRAMES } from "./render/player-sprite";
import { Sprites } from "./render/sprites";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();
const sprites = new Sprites();
const game = new Game(APARTMENT_LEVEL, sprites);

// Load every sprite before the first frame. A missing one falls back to a
// labelled rectangle rather than blocking the game.
const names = [
  ...new Set([...APARTMENT_LEVEL.scene!.props.map((p) => p.sprite), ...PLAYER_FRAMES]),
];
sprites.load(names).then(() => {
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
