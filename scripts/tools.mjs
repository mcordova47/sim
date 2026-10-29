// One place to find and run the project's tools: `npm run tools` lists them, `npm run tools -- <name>` runs one.
// Shortcuts: `npm run lab`, `npm run pixel`. Never pushes or deploys anything.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function openFile(path) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  return spawnSync(cmd, [path], { stdio: "inherit", shell: process.platform === "win32" }).status ?? 1;
}
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, stdio: "inherit" }).status ?? 1;

const TOOLS = {
  lab: {
    what: "music lab: edit a .track live with the game's own synth (dev server, opens the page)",
    run: () => run("npx", ["vite", "--open", "/music-lab.html"]),
  },
  pixel: {
    what: "pixel looks: see a picture through the game's palette at several sizes (opens the page)",
    run: () => openFile(resolve(root, "art/tools/pixel-looks.html")),
  },
  dev: { what: "the game itself on the dev server", run: () => run("npx", ["vite"]) },
  sprites: { what: "rebuild public/sprites from art/src/*.sprite", run: () => run("node", ["scripts/sprites.mjs"]) },
  brand: { what: "rebuild the favicon and link-preview images (add --check to only verify)", run: () => run("node", ["scripts/brand.mjs", ...process.argv.slice(3)]) },
  walk: { what: "walk-cycle preview sheet to art/walk-preview.png", run: () => run("node", ["scripts/walk-preview.mjs"]) },
  room: { what: "main room mockup to art/main-room-mockup.png", run: () => run("node", ["scripts/main-room-mockup.mjs"]) },
  check: { what: "everything before a release: tests, build, check:dist", run: () => run("npm", ["test"]) || run("npm", ["run", "build"]) || run("npm", ["run", "check:dist"]) },
  worktrees: { what: "show finished issue worktrees that could be removed (dry run)", run: () => run("bash", ["scripts/clean-worktrees.sh"]) },
};

const name = process.argv[2];
if (!name || name === "list" || name === "help" || !TOOLS[name]) {
  if (name && !TOOLS[name] && name !== "list" && name !== "help") console.log(`Unknown tool: ${name}\n`);
  console.log("Tools (npm run tools -- <name>):\n");
  for (const [k, t] of Object.entries(TOOLS)) console.log(`  ${k.padEnd(10)} ${t.what}`);
  console.log("\nShortcuts: npm run lab, npm run pixel");
  process.exit(name && !TOOLS[name] && name !== "list" && name !== "help" ? 1 : 0);
}
if (!existsSync(resolve(root, "package.json"))) process.exit(1);
process.exit(TOOLS[name].run());
