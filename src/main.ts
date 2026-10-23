import { VIEW } from "./game/config";
import { startLoop } from "./game/loop";
import { Player } from "./game/player";
import { PLACEHOLDER_SOLIDS, PLACEHOLDER_SPAWN } from "./game/placeholder-room";
import { readControls } from "./input/controls";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();

const solids = PLACEHOLDER_SOLIDS;
const player = new Player(PLACEHOLDER_SPAWN.x, PLACEHOLDER_SPAWN.y);

function update(dt: number) {
  player.update(dt, readControls(keyboard), solids);
  keyboard.endFrame();
}

function render(alpha: number) {
  ctx.fillStyle = "#2b2d42";
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  for (const s of solids) {
    ctx.fillStyle = s.oneWay ? "#8d99ae" : "#4a4e69";
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }

  // Interpolate between the last two simulation states for smooth motion.
  const x = Math.round(player.prevX + (player.x - player.prevX) * alpha);
  const y = Math.round(player.prevY + (player.y - player.prevY) * alpha);
  ctx.fillStyle = "#ef233c";
  ctx.fillRect(x, y, player.w, player.h);
  // Eye on the facing side so direction is visible.
  ctx.fillStyle = "#edf2f4";
  ctx.fillRect(x + (player.facing > 0 ? player.w - 3 : 1), y + 3, 2, 2);
}

startLoop({ update, render });
