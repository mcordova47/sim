// Guard for issue 085: personal docs stay local and are never tracked.
// 1. Fails if the git index or the tracked files include the ignored personal paths.
// 2. Optional: if PERSONAL_FORBIDDEN_WORDS_FILE points at a local file (kept OUTSIDE the
//    repo, one word or phrase per line, # for comments), fails if any tracked text file
//    contains one of them (case-insensitive). Skipped when the variable is unset.
//    Failures name the file, line and entry number only, never the word itself.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PERSONAL_PATHS = ["docs/about-marc.md", "docs/tasks-v2.md"];

function tracked() {
  try {
    const out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return out.split("\0").filter(Boolean);
  } catch {
    return null; // not a git checkout (for example an exported tarball)
  }
}

const files = tracked();
const wordsFile = process.env.PERSONAL_FORBIDDEN_WORDS_FILE;

describe("personal info guard", () => {
  it.skipIf(files === null)("tracks none of the ignored personal paths", () => {
    const hits = PERSONAL_PATHS.filter((p) => files.includes(p));
    expect(hits.length, `tracked personal paths: ${hits.length}`).toBe(0);
  });

  it("keeps the personal paths in .gitignore", () => {
    const ignore = readFileSync(".gitignore", "utf8").split("\n").map((l) => l.trim());
    for (const p of PERSONAL_PATHS) expect(ignore).toContain(p);
  });

  it.skipIf(files === null || !wordsFile)("has no forbidden word from the local list in a tracked file", () => {
    expect(existsSync(wordsFile), "PERSONAL_FORBIDDEN_WORDS_FILE does not exist").toBe(true);
    const words = readFileSync(wordsFile, "utf8")
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l && !l.startsWith("#"));
    const found = [];
    for (const f of files) {
      let st;
      try { st = statSync(f); } catch { continue; }
      if (!st.isFile() || st.size > 2_000_000) continue;
      const buf = readFileSync(f);
      if (buf.includes(0)) continue; // binary
      const lines = buf.toString("utf8").toLowerCase().split("\n");
      lines.forEach((line, i) => {
        words.forEach((w, n) => {
          if (line.includes(w)) found.push(`${f}:${i + 1} (entry ${n + 1})`);
        });
      });
    }
    expect(found, "forbidden words found at").toEqual([]);
  });
});
