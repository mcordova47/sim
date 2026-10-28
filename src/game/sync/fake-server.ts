import { memoryStore } from "../../../netlify/lib/memory-store.mjs";
import { handle } from "../../../netlify/lib/sync-handler.mjs";
import { SYNC } from "../config";
import type { Fail, Res, SyncBackend } from "./client";

// A sync server for tests: the real handler over an in-memory store, with a clock and scripted failures.
export class FakeServer implements SyncBackend {
  readonly store = memoryStore();
  now = 1_000_000;
  // Failures to give instead of answering, one per call, then normal service.
  script: Array<Fail | "garbage"> = [];
  calls: string[] = [];

  async request(method: string, key: string | null, body?: string): Promise<Response> {
    const headers = new Headers();
    if (key !== null) headers.set(SYNC.keyHeader, key);
    return handle(new Request("http://x" + SYNC.path, { method, headers, body }), this.store, this.now);
  }

  private async call(method: string, key: string | null, body?: string): Promise<Res<Response>> {
    this.calls.push(method);
    const next = this.script.shift();
    if (next && next !== "garbage") return { ok: false, error: next };
    const response = await this.request(method, key, body);
    return { ok: true, value: response };
  }

  async mint(): Promise<Res<string>> {
    const r = await this.call("POST", null);
    if (!r.ok) return r;
    if (r.value.status === 503) return { ok: false, error: "full" };
    return { ok: true, value: (await r.value.json()).key };
  }

  async get(key: string): Promise<Res<string | null>> {
    const garbage = this.script[0] === "garbage";
    const r = await this.call("GET", key);
    if (!r.ok) return r;
    if (garbage) return { ok: true, value: "this is not json" };
    if (r.value.status === 404) return { ok: false, error: "notFound" };
    const text = await r.value.text();
    return { ok: true, value: text.trim() === "{}" ? null : text };
  }

  async put(key: string, text: string): Promise<Res<true>> {
    const r = await this.call("PUT", key, text);
    if (!r.ok) return r;
    if (r.value.status === 404) return { ok: false, error: "notFound" };
    return r.value.status === 200 ? { ok: true, value: true } : { ok: false, error: "refused" };
  }

  async del(key: string): Promise<Res<true>> {
    const r = await this.call("DELETE", key);
    if (!r.ok) return r;
    return r.value.status === 404 ? { ok: false, error: "notFound" } : { ok: true, value: true };
  }
}
