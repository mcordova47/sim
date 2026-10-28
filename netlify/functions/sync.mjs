// The sync function (issue 103, docs/sync.md section 8): one path, /api/sync, the logic in ../lib/sync-handler.mjs.
// It needs nothing configured: Netlify gives a function its Blobs access at runtime.
import { getStore } from "@netlify/blobs";
import { handle } from "../lib/sync-handler.mjs";

export default async (request, context) => {
  // Production has its own store; previews and `netlify dev` use another, so they never touch it.
  const name = context?.deploy?.context === "production" ? "sync" : "sync-preview";
  return handle(request, getStore({ name, consistency: "strong" }));
};

export const config = {
  path: "/api/sync",
  // Per IP: far above what one player does (a dozen syncs a day) and low enough to slow a script.
  // Applies to every method of this path. Needs the plan to allow code-based rules (the docs say all plans do).
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
