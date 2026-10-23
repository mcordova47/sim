import { VIEW } from "./game/config";
import { InteractionSystem } from "./game/interaction";
import { startLoop } from "./game/loop";
import { Player } from "./game/player";
import { PLACEHOLDER_INTERACTABLES } from "./game/placeholder-interactables";
import { PLACEHOLDER_SOLIDS, PLACEHOLDER_SPAWN } from "./game/placeholder-room";
import { NO_INPUT, readControls } from "./input/controls";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();

const solids = PLACEHOLDER_SOLIDS;
const player = new Player(PLACEHOLDER_SPAWN.x, PLACEHOLDER_SPAWN.y);
const interaction = new InteractionSystem(PLACEHOLDER_INTERACTABLES);

function update(dt: number) {
  const controls = readControls(keyboard);
  interaction.update(dt, player, controls);
  // Locked in place while a task runs.
  player.update(dt, interaction.busy ? NO_INPUT : controls, solids);
  keyboard.endFrame();
}

function text(s: string, x: number, y: number, color = "#edf2f4") {
  ctx.fillStyle = color;
  ctx.fillText(s, Math.round(x), Math.round(y));
}

// Throwaway debug HUD; issue 004 replaces it with the real one.
function render(alpha: number) {
  ctx.fillStyle = "#2b2d42";
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  for (const s of solids) {
    ctx.fillStyle = s.oneWay ? "#8d99ae" : "#4a4e69";
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffd166";
  for (const item of PLACEHOLDER_INTERACTABLES) {
    ctx.fillRect(item.zone.x, item.zone.y, item.zone.w, item.zone.h);
  }
  ctx.globalAlpha = 1;

  // Interpolate between the last two simulation states for smooth motion.
  const x = Math.round(player.prevX + (player.x - player.prevX) * alpha);
  const y = Math.round(player.prevY + (player.y - player.prevY) * alpha);
  ctx.fillStyle = "#ef233c";
  ctx.fillRect(x, y, player.w, player.h);
  // Eye on the facing side so direction is visible.
  ctx.fillStyle = "#edf2f4";
  ctx.fillRect(x + (player.facing > 0 ? player.w - 3 : 1), y + 3, 2, 2);

  ctx.font = "8px monospace";
  ctx.textAlign = "center";
  if (interaction.active) {
    const w = 24;
    ctx.fillStyle = "#000";
    ctx.fillRect(x + player.w / 2 - w / 2, y - 6, w, 3);
    ctx.fillStyle = "#06d6a0";
    ctx.fillRect(x + player.w / 2 - w / 2, y - 6, w * interaction.progress, 3);
  } else if (interaction.nearby) {
    const cooldown = interaction.cooldownRemaining(interaction.nearby);
    const label =
      cooldown > 0
        ? `${interaction.nearby.prompt} (${Math.ceil(cooldown)}s)`
        : `E: ${interaction.nearby.prompt}`;
    const px = Math.min(Math.max(x + player.w / 2, 60), VIEW.width - 60);
    text(label, px, y - 6, cooldown > 0 ? "#8d99ae" : "#edf2f4");
  }

  const last = interaction.lastCompletion;
  if (last && interaction.time - last.time < 1.5) {
    text(`+${last.award.points}`, x + player.w / 2, y - 14 - (interaction.time - last.time) * 8, "#ffd166");
  }

  ctx.textAlign = "left";
  const { scoreboard, time } = interaction;
  const chain = scoreboard.chainLength(time);
  text(`score ${scoreboard.score}`, 12, 20);
  if (chain > 0) {
    text(
      `combo x${chain} (next x${scoreboard.nextMultiplier(time).toFixed(1)}, ${Math.ceil(scoreboard.comboTimeLeft(time))}s)`,
      12,
      30,
      "#ffd166",
    );
  }
}

startLoop({ update, render });
