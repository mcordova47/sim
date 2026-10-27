import { DEV_CHECKPOINTS } from "./delivery-checkpoints";
import type { Decor } from "./decor";
import type { Deliveries } from "./deliveries";
import { ADS, adById, type Ad } from "./encounter-ads";
import type { Game } from "./game";
import { VIEW } from "./config";
import { drawText } from "../render/font";

// Dev shortcut (issue 062 stage 2): `?own=test` owns every TEST item and
// `?own=id,id` owns those items, so the swap can be tried before gifts and finds
// exist. The caller only uses it in the dev server (main.ts). Unknown ids and
// ids already owned are ignored. Returns the ids that were added.
export function ownFromSearch(decor: Decor, search: string): string[] {
  const asked = (new URLSearchParams(search).get("own") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ids = asked.flatMap((id) => (id === "test" ? decor.testItemIds() : [id]));
  return ids.filter((id) => decor.own(id));
}

// Dev shortcut (issue 062 stage 3a): `?deliver=test` switches on the dev checkpoint
// list (TEST items at 20 points, 3 tasks done and 1 game day) and `?deliver=id,id`
// queues those items to arrive in half a game hour (about 15 seconds of play).
// Only used in the dev server (main.ts). Fired checkpoints are saved with the
// progress, so each fires once per save (reset progress to see them again).
// Returns the item ids that were queued.
export function deliverFromSearch(deliveries: Deliveries, search: string): string[] {
  const asked = (new URLSearchParams(search).get("deliver") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const queued: string[] = [];
  for (const id of asked) {
    if (id === "test") deliveries.milestones = DEV_CHECKPOINTS;
    else if (deliveries.deliver(id, 0.5)) queued.push(id);
  }
  return queued;
}

// Dev shortcut (issue 043 stage A): `?days=N` moves the delivery clock on by N game
// days at once, so the real checkpoints (day gifts) fire without playing for
// minutes: each gift arrives 2 game hours later (about a minute of play). Dev
// server only (main.ts). Returns the hours skipped.
export function skipDaysFromSearch(deliveries: Deliveries, search: string): number {
  const n = Number(new URLSearchParams(search).get("days"));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const hours = Math.min(n, 400) * 24;
  deliveries.advance(hours);
  return hours;
}

// Dev shortcut (issue 043 stage B): `?encounter=ad-candle` shows that ad's encounter at once
// (`?encounter=random`, or any other word, picks one), so the three cards and the menu can be looked
// at without playing to one. It ignores the gates (the day, the cooldown, the ad blocker) and does
// not count for them. Dev server only (main.ts). Returns the ad shown, or null.
export function encounterFromSearch(game: Game, search: string): Ad | null {
  const asked = new URLSearchParams(search).get("encounter");
  if (asked === null) return null;
  const ad = adById(asked.trim()) ?? ADS[Math.floor(Math.random() * ADS.length)];
  return game.startEncounter(ad) ? ad : null;
}

// Dev shortcut, the way to hear the entrance (issue 080): `?encounter=ad-candle` starts at once, before
// any key press, so the browser has not let audio start and the stinger is silent. With this the
// encounter waits for the first key press (the sound feature's own key listener unlocks audio first,
// as it is added earlier), shows PRESS ANY KEY at the foot of the screen, and swallows that key so it
// does nothing else. With `&again=1` it waits again each time the encounter is over, so the entrance
// can be replayed without a reload. Dev server only (main.ts). Returns false if there is no
// `?encounter=` in `search`.
export interface KeyTarget {
  addEventListener(type: "keydown", listener: (e: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; repeat?: boolean }) => void): void;
}

export function encounterOnFirstKey(game: Game, search: string, target: KeyTarget, swallowKey: () => void = () => {}): boolean {
  const params = new URLSearchParams(search);
  const asked = params.get("encounter");
  if (asked === null) return false;
  const again = params.get("again") === "1";
  let waiting = true;
  game.addLayer({
    name: "dev-encounter-wait",
    update() {
      // Once it is over, wait for the next key (only with `again`).
      if (!waiting && again && !game.interaction.busy) waiting = true;
    },
    drawHud(ctx) {
      if (waiting) drawText(ctx, "PRESS ANY KEY", VIEW.width / 2, VIEW.height - 10, { align: "center" });
    },
  });
  target.addEventListener("keydown", (e) => {
    // Browser shortcuts (a reload) are not a key press for this.
    if (!waiting || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (game.interaction.busy || game.dialogOpen) return;
    if (!encounterFromSearch(game, `?encounter=${encodeURIComponent(asked)}`)) return;
    waiting = false;
    swallowKey();
  });
  return true;
}
