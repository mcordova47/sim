// Checks a production build (`npm run build` first) before it is deployed: the dev shortcuts are not
// reachable, every sprite the page can ask for is in dist/, the head tags point at files that exist,
// and nothing personal-looking is in the bundle. Exits 1 with a list of problems. Run: npm run check:dist
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { root } from "./sprite-lib.mjs";

export function problemsIn(dist) {
  const problems = [];
  const read = (p) => readFileSync(join(dist, p), "utf8");
  if (!existsSync(join(dist, "index.html"))) return ["dist/index.html is missing: run npm run build"];
  const html = read("index.html");

  for (const m of html.matchAll(/(?:src|href|content)="(\/[^"#?]*\.(?:png|js|css|ico|svg))"/g)) {
    if (!existsSync(join(dist, m[1]))) problems.push(`index.html points at ${m[1]}, which is not in dist/`);
  }
  for (const m of html.matchAll(/content="https:\/\/[^/"]+(\/[^"]+\.png)"/g)) {
    if (!existsSync(join(dist, m[1]))) problems.push(`social image ${m[1]} is not in dist/`);
  }
  if (/src="\/src\//.test(html)) problems.push("index.html still loads /src/ (the build did not run)");
  for (const needle of ["<title>", 'name="description"', 'property="og:image"', 'name="twitter:card"', 'rel="icon"', 'name="theme-color"'])
    if (!html.includes(needle)) problems.push(`index.html lacks ${needle}`);

  const assets = join(dist, "assets");
  const js = existsSync(assets) ? readdirSync(assets).filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(assets, f), "utf8")).join("\n") : "";
  if (!js) problems.push("no JavaScript bundle in dist/assets");
  // Each dev shortcut reads its query parameter by name; in a build the code is removed or the
  // function that reads it is unreachable, so the parameter reads must be gone.
  for (const p of ["own", "deliver", "days", "encounter", "again"]) {
    if (js.includes(`get("${p}")`)) problems.push(`the bundle still reads ?${p}=`);
  }
  if (/DEV_CHECKPOINTS|ownFromSearch|deliverFromSearch|skipDaysFromSearch|encounterOnFirstKey/.test(js)) problems.push("dev shortcut code is in the bundle");
  // The dev music lab (issue 122) is a root page the dev server serves and a build never includes; its code
  // and its saved-state key must not be in the bundle, and no lab page may be in dist/.
  if (existsSync(join(dist, "music-lab.html"))) problems.push("dist/ contains music-lab.html (the dev music lab)");
  if (/life\.musiclab|labEncounterMusic|LabMusicPlayer|IntroPreview|dev-lab-encounter|simSoundEngine|labmusic/.test(js + html)) problems.push("the dev music lab code is in the bundle");
  // ?set= is also read once by the flashcards practice deck, which is off in a build (its backend is
  // the real one); the main.ts shortcut would be a second read.
  if ((js.match(/get\("set"\)/g) ?? []).length > 1) problems.push("the bundle reads ?set= outside the flashcards demo");
  if (/get\("hour"\)|get\("room"\)/.test(js)) problems.push("the bundle still reads ?hour= or ?room=");
  if (/"flashcards"\)==="demo"/.test(js) && !/\w+&&new URLSearchParams\(\w+\)\.get\("flashcards"\)==="demo"/.test(js))
    problems.push("the ?flashcards=demo check is not behind the dev flag");

  // The sync server's dev fake lives in vite.config.ts only (issue 103), and the server code is the
  // Netlify Function's: neither may be in the bundle. No pairing link with a key may be baked in either
  // (a plain 32 character test would match bundle hashes, so it must follow `#sync=`).
  if (/life-dev-sync-fake|unplayedMs|sweepAbove/.test(js)) problems.push("the sync dev fake or server code is in the bundle");
  if (/#sync=[a-z0-9]{32}/.test(js + html)) problems.push("the bundle or page contains a sync pairing link");

  // Personal content: email addresses, local paths, and the reference photos folder.
  const everything = js + html;
  for (const [re, what] of [
    [/[\w.+-]+@[\w-]+\.[a-z]{2,}/i, "an email address"],
    [/\/Users\/[a-z]/i, "a local path"],
    [/reference-photos/, "the reference photos folder"],
  ]) if (re.test(everything)) problems.push(`the bundle or page contains ${what}`);
  if (existsSync(join(dist, "reference-photos"))) problems.push("dist/ contains reference-photos/");
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = problemsIn(join(root, "dist"));
  if (problems.length) {
    console.error(problems.map((p) => `- ${p}`).join("\n"));
    process.exit(1);
  }
  console.log("dist/ looks ready to deploy");
}
