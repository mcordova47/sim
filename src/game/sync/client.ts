import { SYNC } from "../config";

// The sync server as the game sees it (issue 103, docs/sync.md sections 8 and 12): four calls, each
// answering with a result and never throwing, so the game works the same with no network. `HttpBackend`
// is the real one (same origin, the key in a header); tests use `FakeServer`.

export type Fail = "offline" | "notFound" | "refused" | "full" | "server";
export type Res<T> = { ok: true; value: T } | { ok: false; error: Fail };

export interface SyncBackend {
  // Asks the server to make a key.
  mint(): Promise<Res<string>>;
  // The saved text, or null when the key is known but nothing has been saved yet.
  get(key: string): Promise<Res<string | null>>;
  put(key: string, text: string): Promise<Res<true>>;
  del(key: string): Promise<Res<true>>;
}

const ok = <T>(value: T): Res<T> => ({ ok: true, value });
const no = (error: Fail): Res<never> => ({ ok: false, error });

function failFor(status: number): Fail {
  if (status === 404) return "notFound";
  if (status === 503) return "full";
  if (status === 400 || status === 413) return "refused";
  // 429 (rate limited) and 5xx: try again later.
  return "server";
}

export class HttpBackend implements SyncBackend {
  constructor(
    private readonly path: string = SYNC.path,
    private readonly timeoutMs: number = SYNC.timeoutMs,
  ) {}

  private async call(method: string, key: string | null, body?: string): Promise<{ status: number; text: string } | null> {
    const controller = typeof AbortController === "undefined" ? null : new AbortController();
    const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null;
    try {
      const headers: Record<string, string> = {};
      if (key !== null) headers[SYNC.keyHeader] = key;
      if (body !== undefined) headers["Content-Type"] = "application/json";
      const keepalive = body !== undefined && body.length <= SYNC.auto.keepaliveMaxChars;
      const response = await fetch(this.path, { method, headers, body, cache: "no-store", keepalive, signal: controller?.signal });
      return { status: response.status, text: await response.text() };
    } catch {
      return null;
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  }

  async mint(): Promise<Res<string>> {
    const r = await this.call("POST", null);
    if (!r) return no("offline");
    if (r.status !== 201) return no(failFor(r.status));
    try {
      const key: unknown = JSON.parse(r.text).key;
      return typeof key === "string" && SYNC.keyPattern.test(key) ? ok(key) : no("server");
    } catch {
      return no("server");
    }
  }

  async get(key: string): Promise<Res<string | null>> {
    const r = await this.call("GET", key);
    if (!r) return no("offline");
    if (r.status !== 200) return no(failFor(r.status));
    return ok(r.text.trim() === "{}" ? null : r.text);
  }

  async put(key: string, text: string): Promise<Res<true>> {
    const r = await this.call("PUT", key, text);
    if (!r) return no("offline");
    return r.status === 200 ? ok(true) : no(failFor(r.status));
  }

  async del(key: string): Promise<Res<true>> {
    const r = await this.call("DELETE", key);
    if (!r) return no("offline");
    return r.status === 200 ? ok(true) : no(failFor(r.status));
  }
}

// The key in a pasted link or a bare key (spaces and a line break around it do not matter), or null.
export function keyFromText(text: string): string | null {
  const t = text.trim();
  const at = t.indexOf(SYNC.linkMark);
  const candidate = (at >= 0 ? t.slice(at + SYNC.linkMark.length) : t).trim().toLowerCase();
  return SYNC.keyPattern.test(candidate) ? candidate : null;
}

export const linkFor = (origin: string, key: string): string => `${origin}/${SYNC.linkMark}${key}`;
