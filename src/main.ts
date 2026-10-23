import { VIEW } from "./game/config";
import { InteractionSystem } from "./game/interaction";
import { startLoop } from "./game/loop";
import { Player } from "./game/player";
import { PLACEHOLDER_INTERACTABLES } from "./game/placeholder-interactables";
import { PLACEHOLDER_SOLIDS, PLACEHOLDER_SPAWN } from "./game/placeholder-room";
import { NO_INPUT, readControls } from "./input/controls";
import { Keyboard } from "./input/keyboard";
import { createScreen } from "./render/canvas";
import { Hud } from "./render/hud";
import { Popups, type PopupLine } from "./render/popups";
import { drawProgress, drawPrompt } from "./render/world-ui";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { ctx } = createScreen(canvas);
const keyboard = new Keyboard();

const solids = PLACEHOLDER_SOLIDS;
const player = new Player(PLACEHOLDER_SPAWN.x, PLACEHOLDER_SPAWN.y);
const hud = new Hud();
const popups = new Popups();

const interaction = new InteractionSystem(PLACEHOLDER_INTERACTABLES, ({ item, award }) => {
  const lines: PopupLine[] = [{ text: `+${award.points}`, color: "#ffd166", scale: 2 }];
  if (award.multiplier > 1) {
    lines.push({ text: `COMBO X${award.multiplier.toFixed(1)}`, color: "#ef476f" });
  }
  if (award.repeatFactor < 1) {
    lines.push({ text: `REPEAT X${award.repeatFactor.toFixed(2)}`, color: "#8d99ae" });
  }
  popups.add(item.zone.x + item.zone.w / 2, item.zone.y, lines);
});

function update(dt: number) {
  const controls = readControls(keyboard);
  interaction.update(dt, player, controls);
  // Locked in place while a task runs.
  player.update(dt, interaction.busy ? NO_INPUT : controls, solids);
  popups.update(dt);
  hud.update(dt, interaction.scoreboard.score);
  keyboard.endFrame();
}

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

  // World-space UI. Coordinates are world positions; the camera in issue 010
  // will convert them to screen positions here.
  const actor = { x, y, w: player.w, h: player.h };
  if (interaction.active) {
    drawProgress(ctx, actor, interaction.active.item, interaction.progress, VIEW);
  } else if (interaction.nearby) {
    const cooldown = interaction.cooldownRemaining(interaction.nearby);
    drawPrompt(ctx, actor, interaction.nearby, cooldown, VIEW);
  }
  popups.draw(ctx, VIEW.width);

  // Screen-space HUD.
  hud.draw(ctx, interaction.scoreboard, interaction.time);
}

startLoop({ update, render });
