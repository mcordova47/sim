import { DEV_CHECKPOINTS } from "./delivery-checkpoints";
import type { Decor } from "./decor";
import type { Deliveries } from "./deliveries";

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
