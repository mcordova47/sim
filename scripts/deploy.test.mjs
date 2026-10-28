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
    // There is a vite.config.ts since issue 103 (the sync dev fake); it must not set a base.
    expect(read("vite.config.ts")).not.toMatch(/\bbase\s*:/);
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

describe("check-dist and the sync server (issue 103)", () => {
  it("flags the sync dev fake, server code and a baked-in pairing link, and accepts the client's own mentions", () => {
    expect(problemsIn(fakeDist('"life-dev-sync-fake"')).join()).toMatch(/sync dev fake/);
    expect(problemsIn(fakeDist("const a={unplayedMs:1}")).join()).toMatch(/sync dev fake/);
    expect(problemsIn(fakeDist(`"https://x/#sync=${"a1".repeat(16)}"`)).join()).toMatch(/pairing link/);
    expect(problemsIn(fakeDist('fetch("/api/sync",{headers:{"X-Sync-Key":k}});const m="#sync=";const h="' + "b2".repeat(16) + '"')).join()).toBe("");
  });
  it("the function, its handler and the dev fake exist, and the config adds no secrets or settings", () => {
    const fn = read("netlify/functions/sync.mjs");
    expect(fn).toMatch(/path: "\/api\/sync"/);
    expect(fn).not.toMatch(/process\.env|Netlify\.env|token|secret/i);
    expect(read("netlify.toml")).toMatch(/\[functions\][\s\S]*directory = "netlify\/functions"/);
    expect(read("netlify.toml")).not.toMatch(/SECRET|TOKEN|KEY\s*=/);
    expect(read("vite.config.ts")).toMatch(/life-dev-sync-fake/);
  });
});
