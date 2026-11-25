// Writes the candidate looks of art/options/towel/outfits.json (issue 184) as ordinary sprite files in art/options/towel/:
// the 12 walking sprites and the 5 doing poses of each look, made by the same generator as the shipped outfits (scripts/outfits.mjs).
// Run by `npm run tools -- options` before it builds the page. Nothing here touches art/src or the game.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { root } from "./sprite-lib.mjs";
import { generateOutfit, generatePoses, loadPoses } from "./outfits.mjs";

const dir = join(root, "art", "options", "towel");
const read = (name) => readFileSync(join(root, "art", "src", `${name}.sprite`), "utf8");
export const loadCandidates = () => JSON.parse(readFileSync(join(dir, "outfits.json"), "utf8")).outfits;

export function writeCandidates() {
  mkdirSync(dir, { recursive: true });
  const written = [];
  for (const def of loadCandidates()) {
    for (const [name, text] of Object.entries({ ...generateOutfit(def, read), ...generatePoses(def, loadPoses(), read) })) {
      const path = join(dir, `${name}.sprite`);
      if (existsSync(path) && readFileSync(path, "utf8") === text) continue;
      writeFileSync(path, text);
      written.push(name);
    }
  }
  return written;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(`Wrote ${writeCandidates().length} candidate sprite(s) to art/options/towel`);
