import { SYNC } from "../config";
import { normaliseDoc, type SyncDoc, type SyncEnv, type SyncError } from "./merge";

// The save code and the save file (issue 102, docs/sync.md section 6). A code is the document as JSON,
// deflated and written in base64url after `LIFE1.` (where the browser has no CompressionStream, plain
// base64 after `LIFE1p.`; both are read). The file is the same JSON. Reading is hostile-input safe:
// a size limit before and after inflating, JSON.parse inside a guard, and then `normaliseDoc`.

export type DecodeError = SyncError | "tooBig" | "unreadable";
export type Decoded = { ok: true; doc: SyncDoc } | { ok: false; error: DecodeError };

const toBase64Url = (bytes: Uint8Array): string => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (text: string): Uint8Array<ArrayBuffer> => {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: { writable: WritableStream<BufferSource>; readable: ReadableStream<Uint8Array> }, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const writer = stream.writable.getWriter();
  void writer.write(bytes).then(() => writer.close()).catch(() => {});
  const reader = stream.readable.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      throw new RangeError("too big");
    }
    parts.push(value);
  }
  const out = new Uint8Array(new ArrayBuffer(size));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const hasStreams = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

export async function encodeSave(doc: SyncDoc): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  if (!hasStreams()) return SYNC.plainPrefix + toBase64Url(bytes);
  try {
    return SYNC.codePrefix + toBase64Url(await pipe(bytes, new CompressionStream("deflate"), SYNC.maxChars));
  } catch {
    return SYNC.plainPrefix + toBase64Url(bytes);
  }
}

// The document as the text of a file.
export const saveFileText = (doc: SyncDoc): string => JSON.stringify(doc);

// Reads a pasted code, a whole file, or a code with spaces or line breaks in it.
export async function decodeSave(input: string, env: SyncEnv = {}): Promise<Decoded> {
  if (typeof input !== "string" || input.length > SYNC.maxChars) return { ok: false, error: "tooBig" };
  const text = input.trim();
  let json: string;
  try {
    if (text.startsWith("{")) json = text;
    else {
      const plain = text.startsWith(SYNC.plainPrefix);
      const packed = text.startsWith(SYNC.codePrefix);
      if (!plain && !packed) return { ok: false, error: "notASave" };
      const body = text.slice((plain ? SYNC.plainPrefix : SYNC.codePrefix).length).replace(/\s+/g, "");
      if (!/^[A-Za-z0-9_-]*$/.test(body)) return { ok: false, error: "unreadable" };
      const bytes = fromBase64Url(body);
      if (plain) {
        if (bytes.length > SYNC.maxChars) return { ok: false, error: "tooBig" };
        json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } else {
        if (!hasStreams()) return { ok: false, error: "unreadable" };
        json = new TextDecoder("utf-8", { fatal: true }).decode(await pipe(bytes, new DecompressionStream("deflate"), SYNC.maxChars));
      }
    }
  } catch (error) {
    return { ok: false, error: error instanceof RangeError ? "tooBig" : "unreadable" };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "unreadable" };
  }
  return normaliseDoc(raw, env);
}
