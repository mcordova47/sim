// The sync server's whole logic (issue 103, docs/sync.md sections 8 and 9), as one function of a Request
// and a store, so the Netlify Function, the Vite dev fake and the tests all run the same code.
// The store is the small part of a Netlify Blobs store used here (see `fakeStore` in the tests):
//   getWithMetadata(key, { type: "text" }) -> { data, etag, metadata } | null
//   getMetadata(key) -> { etag, metadata } | null
//   set(key, text, { metadata, onlyIfNew, onlyIfMatch }) -> { modified }
//   delete(key), list() -> { blobs: [{ key }] }
// The key travels in the X-Sync-Key header. Nothing is logged here, and nothing is read from the
// environment: no secrets, no settings.

export const LIMITS = {
  // The body, in bytes (a real save is a few KB; 36 tracks of 2 KB make about 72 KB at the very most).
  maxBytes: 128 * 1024,
  maxKeys: 1000,
  maxTracks: 36,
  // A key whose save was never played (or is empty) goes after 7 days; any key not read or written for 90.
  unplayedMs: 7 * 24 * 3600 * 1000,
  unseenMs: 90 * 24 * 3600 * 1000,
  // "Last seen" is written on a read at most this often (a read of a key costs one write otherwise).
  seenEveryMs: 24 * 3600 * 1000,
  // The sweep (one metadata read per key) runs at mint time once there are more keys than this.
  sweepAbove: 100,
};

export const KEY_PATTERN = /^[a-z0-9]{32}$/;
const TOP_KEYS = new Set(["app", "format", "device", "activeAt", "progress", "tracks"]);
const FORMAT = 1;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  // Never stored by a browser or a cache. No CORS headers on purpose: the game calls its own origin.
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const send = (status, body) => new Response(body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body), { status, headers: HEADERS });
const fail = (status, error) => send(status, { error });

// 32 characters of a-z0-9 from the platform's random source. Bytes of 252 or more are thrown away,
// so every character is equally likely (252 is 7 x 36).
export function mintKey(random = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  let out = "";
  while (out.length < 32) {
    for (const b of random(48)) {
      if (b < 252 && out.length < 32) out += ALPHABET[b % 36];
    }
  }
  return out;
}

const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

// The checks a blob must pass: an object of the game's own shape, only known top-level keys.
// (Everything inside is read again by the client's tolerant parsers; the server only bounds the shape.)
export function problemWith(text) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return "not JSON";
  }
  if (!isRecord(doc)) return "not an object";
  if (doc.app !== "life") return "not a save from this game";
  if (doc.format !== FORMAT) return "unknown format";
  for (const k of Object.keys(doc)) if (!TOP_KEYS.has(k)) return "unknown field";
  if (!isRecord(doc.progress)) return "no progress";
  if (!Array.isArray(doc.tracks) || doc.tracks.length > LIMITS.maxTracks) return "bad tracks";
  if (doc.device !== undefined && typeof doc.device !== "string") return "bad device";
  if (doc.activeAt !== undefined && (typeof doc.activeAt !== "number" || !Number.isFinite(doc.activeAt))) return "bad activeAt";
  return null;
}

// Whether the save has ever been played (a task done or the decor changed gives activeAt a time).
const wasPlayed = (doc) => typeof doc.activeAt === "number" && doc.activeAt > 0;

export const expired = (meta, now) => {
  if (!isRecord(meta) || typeof meta.created !== "number" || typeof meta.seen !== "number") return true;
  return (!meta.played && now - meta.created > LIMITS.unplayedMs) || now - meta.seen > LIMITS.unseenMs;
};

// Removes the keys that have expired. One metadata read per key: its cost at the cap is unverified.
export async function sweep(store, now) {
  const { blobs } = await store.list();
  let removed = 0;
  for (const { key } of blobs) {
    const entry = await store.getMetadata(key);
    if (entry && expired(entry.metadata, now)) {
      await store.delete(key);
      removed++;
    }
  }
  return removed;
}

async function mint(store, now) {
  let { blobs } = await store.list();
  if (blobs.length > LIMITS.sweepAbove) {
    await sweep(store, now);
    blobs = (await store.list()).blobs;
  }
  if (blobs.length >= LIMITS.maxKeys) return fail(503, "full");
  for (let attempt = 0; attempt < 4; attempt++) {
    const key = mintKey();
    const { modified } = await store.set(key, "", { metadata: { created: now, seen: now, played: false }, onlyIfNew: true });
    if (modified) return send(201, { key });
  }
  return fail(500, "could not mint");
}

// Reads the body as bytes with the cap applied (a wrong or missing Content-Length cannot get past it).
async function readBody(request) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > LIMITS.maxBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const parts = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > LIMITS.maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    all.set(p, at);
    at += p.length;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(all);
  } catch {
    return undefined;
  }
}

// One request in, one response out. `now` is a number of milliseconds (tests fix it).
export async function handle(request, store, now = Date.now()) {
  try {
    const method = request.method;
    if (method === "POST") return await mint(store, now);
    if (method !== "GET" && method !== "PUT" && method !== "DELETE") return fail(405, "method not allowed");

    const key = request.headers.get("x-sync-key") ?? "";
    if (!KEY_PATTERN.test(key)) return fail(400, "bad key");

    const entry = await store.getWithMetadata(key, { type: "text" });
    if (entry && expired(entry.metadata, now)) {
      await store.delete(key);
      return fail(404, "not found");
    }
    if (!entry) return fail(404, "not found");

    if (method === "DELETE") {
      await store.delete(key);
      return send(200, { ok: true });
    }

    if (method === "GET") {
      // Last seen, at most once a day; the etag guard keeps this from overwriting a save that arrived meanwhile.
      if (now - entry.metadata.seen > LIMITS.seenEveryMs) {
        await store.set(key, entry.data ?? "", { metadata: { ...entry.metadata, seen: now }, onlyIfMatch: entry.etag }).catch(() => {});
      }
      // An entry that was minted and never written reads as an empty object.
      return send(200, entry.data ? entry.data : "{}");
    }

    const text = await readBody(request);
    if (text === null) return fail(413, "too big");
    if (text === undefined) return fail(400, "not UTF-8");
    const why = problemWith(text);
    if (why) return fail(400, why);
    await store.set(key, text, { metadata: { created: entry.metadata.created, seen: now, played: wasPlayed(JSON.parse(text)) } });
    return send(200, { ok: true });
  } catch {
    // The reason is not logged (a log line could carry a key or a save).
    return fail(500, "server error");
  }
}
