import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { root } from "./sprite-lib.mjs";
import { problemsIn } from "./check-dist.mjs";

const read = (p) => readFileSync(join(root, p), "utf8");

function fakeDist(js) {
  const dist = mkdtempSync(join(tmpdir(), "dist-"));
  mkdirSync(join(dist, "assets"));
  writeFileSync(join(dist, "assets", "a.js"), js);
  writeFileSync(join(dist, "favicon.png"), "x");
  writeFileSync(join(dist, "social.png"), "x");
  writeFileSync(
    join(dist, "index.html"),
    `<title>t</title><meta name="description" content="d"><meta name="theme-color" content="#111"><link rel="icon" href="/favicon.png"><meta property="og:image" content="https://sim.mcord.dev/social.png"><meta name="twitter:card" content="x"><script src="/assets/a.js"></script>`,
  );
  return dist;
}

describe("check-dist", () => {
  it("accepts a clean build", () => {
    expect(problemsIn(fakeDist('console.log("hi")'))).toEqual([]);
  });
  it("flags dev shortcuts and personal content", () => {
    expect(problemsIn(fakeDist('new URLSearchParams(s).get("own")')).join()).toMatch(/\?own=/);
    expect(problemsIn(fakeDist('ownFromSearch()')).join()).toMatch(/dev shortcut/);
    expect(problemsIn(fakeDist('"someone@example.com"')).join()).toMatch(/email/);
    expect(problemsIn(fakeDist('"/Users/x/reference-photos"')).join()).toMatch(/local path/);
  });
  it("flags a head tag that points at a missing file", () => {
    const dist = fakeDist("0");
    writeFileSync(join(dist, "index.html"), read("index.html"));
    expect(problemsIn(dist).join()).toMatch(/not in dist|loads \/src/);
  });
});

describe("deploy setup", () => {
  const toml = read("netlify.toml");
  it("builds with npm run build into dist with a pinned Node", () => {
    expect(toml).toMatch(/command = "npm run build"/);
    expect(toml).toMatch(/publish = "dist"/);
    expect(toml).toMatch(/NODE_VERSION = "\d+"/);
  });
  it("caches hashed assets for good and revalidates the page and sprites", () => {
    expect(toml).toMatch(/for = "\/assets\/\*"[\s\S]*?immutable/);
    expect(toml).toMatch(/for = "\/index\.html"[\s\S]*?must-revalidate/);
    expect(toml).toMatch(/for = "\/sprites\/\*"[\s\S]*?must-revalidate/);
  });
  it("serves from the root (no Vite base) and loads sprites from /sprites/", () => {
    expect(existsSync(join(root, "vite.config.ts")) || existsSync(join(root, "vite.config.js"))).toBe(false);
    expect(read("src/render/sprites.ts")).toMatch(/BASE_URL.*SPRITE_DIR/);
  });
  it("has the head tags, using only files that exist in public/", () => {
    const html = read("index.html");
    for (const tag of ['name="description"', 'property="og:image"', 'name="twitter:card"', 'rel="icon"', 'rel="apple-touch-icon"', 'name="robots" content="noindex'])
      expect(html).toContain(tag);
    for (const f of ["favicon.png", "apple-touch-icon.png", "social.png"]) expect(existsSync(join(root, "public", f))).toBe(true);
  });
  it("keeps the ?set= shortcut dev-only", () => {
    expect(read("src/main.ts")).toMatch(/import\.meta\.env\.DEV \? new URLSearchParams\(location\.search\)\.get\("set"\)/);
  });
  it("has icons that match the sprites they are made from", () => {
    const r = spawnSync("node", [join(root, "scripts", "brand.mjs"), "--check"], { encoding: "utf8" });
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });
});
