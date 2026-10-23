import { TILE, VIEW } from "./game/config";
import { startLoop } from "./game/loop";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();

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
}

startLoop({ update, render });
