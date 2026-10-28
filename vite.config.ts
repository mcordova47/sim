import type { IncomingMessage } from "node:http";
import { defineConfig, type Plugin } from "vite";
import { memoryStore } from "./netlify/lib/memory-store.mjs";
import { handle } from "./netlify/lib/sync-handler.mjs";

// The dev fake for /api/sync (issue 103, docs/sync.md section 10): the same `handle` the Netlify Function
// runs, over a store in memory (cleared when the server stops). It serves `npm run dev` and `npm run preview`
// only. It lives in this file, never in the bundle: `npm run check:dist` looks for its marker.
const MARKER = "life-dev-sync-fake";

function syncFake(): Plugin {
  const store = memoryStore();
  const serve = async (req: IncomingMessage, res: import("node:http").ServerResponse, next: () => void) => {
    if (new URL(req.url ?? "/", "http://localhost").pathname !== "/api/sync") return next();
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request("http://localhost/api/sync", { method: req.method, headers, body: req.method === "GET" || req.method === "HEAD" ? undefined : body });
    const response = await handle(request, store);
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await response.arrayBuffer()));
  };
  return {
    name: MARKER,
    apply: (_config, env) => env.command === "serve",
    configureServer: (server) => void server.middlewares.use((q, s, n) => void serve(q, s, n)),
    configurePreviewServer: (server) => void server.middlewares.use((q, s, n) => void serve(q, s, n)),
  };
}

export default defineConfig({ plugins: [syncFake()] });
