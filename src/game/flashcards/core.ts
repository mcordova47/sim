// The flashcards app's compiled core (`core.v1.js` on the app's site), which
// the game imports at runtime and does not reimplement: the scheduler, the
// deck, grading and merging all live there. This file is the game's side of
// that contract: the shape it expects and the check that it got it.
//
// Progress goes in and out as the JSON string the progress endpoint stores
// (`null` when the server has none yet). Anything that goes wrong throws.

export interface CoreCard {
  slug: string;
  prompt: string;
  answers: string[];
  example: string;
  direction: string;
}

export interface Core {
  version: number;
  session(progress: string | null, now?: number, language?: string): string[];
  card(progress: string | null, slug: string, language?: string): CoreCard;
  grade(progress: string | null, slug: string, gotIt: boolean, now?: number, language?: string): string;
  merge(mine: string | null, theirs: string | null, language?: string): string;
  // How a word is said (a card's own slug), or null if there is no transcription.
  // Optional: a core without it is still usable, and the voice goes by spelling.
  ipa?(slug: string, dialect?: string, language?: string): string | null;
  requeue(slug: string, position: number, queue: string[]): string[];
}

const FUNCTIONS = ["session", "card", "grade", "merge", "requeue"] as const;

// The module as a `Core`, or an error saying what is wrong with it.
export function checkCore(module: unknown, version: number): Core {
  if (typeof module !== "object" || module === null) throw new Error("The flashcards core did not load as a module");
  const m = module as Record<string, unknown>;
  if (m.version !== version) throw new Error(`The flashcards core is version ${String(m.version)}, and the game expects ${version}`);
  for (const name of FUNCTIONS) {
    if (typeof m[name] !== "function") throw new Error(`The flashcards core has no ${name} function`);
  }
  return m as unknown as Core;
}

export type Importer = (url: string) => Promise<unknown>;

// A literal `import()` of a runtime URL: Vite must leave it alone.
const browserImport: Importer = (url) => import(/* @vite-ignore */ url);

export async function loadCore(url: string, version: number, importer: Importer = browserImport): Promise<Core> {
  return checkCore(await importer(url), version);
}
