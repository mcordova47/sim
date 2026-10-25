import type { Decor } from "./decor";

// Dev shortcut (issue 062 stage 2): `?own=test` owns every TEST item and
// `?own=id,id` owns those items, so the swap can be tried before gifts and finds
// exist. The caller only uses it in the dev server (main.ts). Unknown ids and
// ids already owned are ignored. Returns the ids that were added.
export function ownFromSearch(decor: Decor, search: string): string[] {
  const asked = (new URLSearchParams(search).get("own") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ids = asked.flatMap((id) => (id === "test" ? decor.testItemIds() : [id]));
  return ids.filter((id) => decor.own(id));
}
