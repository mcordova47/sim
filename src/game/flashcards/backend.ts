import { FLASHCARDS as F } from "../config";
import { loadCore, type Core } from "./core";
import { demoBackendFor } from "./demo";
import { realBackend } from "./real";
import type { StudyBackend } from "./study";

// The core is fetched once per page, and fetched again after a failure.
let core: Promise<Core> | null = null;

function origin(): string {
  const fromBuild = (import.meta.env as Record<string, string | undefined>).VITE_FLASHCARDS_ORIGIN;
  return fromBuild || F.origin;
}

// The practice deck is asked for with `?flashcards=demo` in a dev build (never
// in a production build), so a different backend needs no edit to the config.
// `&set=sentences|diphthongs|consonants|words` picks one set of its cards, and
// `&voices=all` lets V step through every voice, not only the two being compared.
export function wantsDemo(search: string, dev: boolean): boolean {
  return dev && new URLSearchParams(search).get("flashcards") === "demo";
}

function currentSearch(): string {
  try {
    return typeof location === "undefined" ? "" : location.search;
  } catch {
    return "";
  }
}

// The backend the game studies against: the practice deck when asked for, else
// the one in the config (`FLASHCARDS.backend`).
export function studyBackend(search: string = currentSearch(), dev: boolean = import.meta.env.DEV): StudyBackend {
  if (F.backend === "demo" || wantsDemo(search, dev)) {
    const params = new URLSearchParams(search);
    return demoBackendFor(params.get("set"), params.get("voices"));
  }
  return realBackend({
    origin: origin(),
    core: () => {
      core ??= loadCore(`${origin()}/core.v${F.coreVersion}.js`, F.coreVersion).catch((error) => {
        core = null;
        throw error;
      });
      return core;
    },
  });
}
