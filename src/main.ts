import { TILE, VIEW } from "./game/config";
import { startLoop } from "./game/loop";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";
import { Sprites } from "./render/sprites";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();
const sprites = new Sprites();

// Placeholder scene: proves the loop, input and scaling work. Replaced in issue 002.
let heldLabel = "";

function update(_dt: number) {
  heldLabel = ["KeyA", "KeyD", "Space", "KeyE"]
    .filter((code) => keyboard.isDown(code))
    .join(" ");
  keyboard.endFrame();
}

function render(_alpha: number) {
  ctx.fillStyle = "#2b2d42";
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.fillStyle = "#3b3e5c";
  for (let y = 0; y < VIEW.height; y += TILE) {
    for (let x = 0; x < VIEW.width; x += TILE) {
      if (((x + y) / TILE) % 2 === 0) ctx.fillRect(x, y, TILE, TILE);
    }
  }

  ctx.fillStyle = "#edf2f4";
  ctx.font = "8px monospace";
  ctx.fillText(`keys: ${heldLabel}`, 4, 10);

  // Sprite pipeline demo: two real sprites and one missing (shows the fallback). Removed when scenes land.
  sprites.draw(ctx, "couch", 16, 160);
  sprites.draw(ctx, "coffee-mug", 80, 144);
  sprites.draw(ctx, "missing-sprite", 112, 144);
}

sprites.load(["couch", "coffee-mug", "missing-sprite"]).then(() => startLoop({ update, render }));
