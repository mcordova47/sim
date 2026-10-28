import { describe, expect, it } from "vitest";
import { SYNC } from "../config";
import { decodeSave, encodeSave, saveFileText } from "./code";
import { emptyDoc, NOW, randomDoc, rng } from "./gen";
import { canon } from "./merge";

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

describe("save codes and files", () => {
  it("round trips a code, a code with spaces and line breaks in it, a whole file, and the plain form", async () => {
    const r = rng(30);
    for (let i = 0; i < 40; i++) {
      const doc = randomDoc(r);
      const code = await encodeSave(doc);
      expect(code.startsWith(SYNC.codePrefix)).toBe(true);
      const read = await decodeSave(code);
      expect(read.ok && canon(read.doc)).toBe(canon(doc));
      const wrapped = await decodeSave(`  ${code.replace(/(.{40})/g, "$1\n ")}\n`);
      expect(wrapped.ok && canon(wrapped.doc)).toBe(canon(doc));
      const file = await decodeSave(saveFileText(doc));
      expect(file.ok && canon(file.doc)).toBe(canon(doc));
      const plain = await decodeSave(SYNC.plainPrefix + toBase64Url(new TextEncoder().encode(JSON.stringify(doc))));
      expect(plain.ok && canon(plain.doc)).toBe(canon(doc));
    }
  });

  it("a save code is a few KB at most", async () => {
    expect((await encodeSave(randomDoc(rng(31)))).length).toBeLessThan(6000);
  });

  it("refuses text that is not a code, damaged codes, wrong versions and nothing", async () => {
    const good = await encodeSave(emptyDoc());
    const bad = ["", "   ", "hello", "LIFE1.", "LIFE1.!!!!", "LIFE1.abc", good.slice(0, -6), good.slice(0, 12) + "AAAA" + good.slice(16), "LIFE2." + good.slice(6), "{", "{}", "[]", "null", '{"app":"life","format":9}', "LIFE1p.@@"];
    for (const text of bad) {
      const read = await decodeSave(text);
      expect(read.ok, JSON.stringify(text)).toBe(false);
    }
    expect(await decodeSave('{"app":"life","format":9}')).toEqual({ ok: false, error: "newer" });
    expect(await decodeSave('{"app":"x","format":1}')).toEqual({ ok: false, error: "notASave" });
  });

  it("refuses input over the limit unread, and a small code that inflates past it", async () => {
    expect(await decodeSave("x".repeat(SYNC.maxChars + 1))).toEqual({ ok: false, error: "tooBig" });
    const stream = new CompressionStream("deflate");
    const writer = stream.writable.getWriter();
    void writer.write(new Uint8Array(20 * 1024 * 1024)).then(() => writer.close());
    const bytes = new Uint8Array(await new Response(stream.readable).arrayBuffer());
    expect(bytes.length).toBeLessThan(SYNC.maxChars);
    expect(await decodeSave(SYNC.codePrefix + toBase64Url(bytes))).toEqual({ ok: false, error: "tooBig" });
  });

  it("a pasted junk, a script or html is just refused text, and a hostile document is made safe", async () => {
    expect((await decodeSave("<script>alert(1)</script>")).ok).toBe(false);
    const read = await decodeSave(JSON.stringify({ app: "life", format: 1, device: "<img>", activeAt: NOW, progress: { unlocked: ["<b>"], stats: { rooms: ["<i>"] } }, tracks: [{ text: "<x>", made: 1 }] }));
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.doc.device).toBe("unknown");
      expect(read.doc.progress.unlocked).toEqual([]);
      expect(read.doc.tracks).toEqual([]);
    }
  });
});
