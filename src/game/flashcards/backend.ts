import { FLASHCARDS as F } from "../config";
import { loadCore, type Core } from "./core";
import { demoBackend } from "./demo";
import { realBackend } from "./real";
import type { StudyBackend } from "./study";

// The core is fetched once per page, and fetched again after a failure.
let core: Promise<Core> | null = null;

function origin(): string {
  const fromBuild = (import.meta.env as Record<string, string | undefined>).VITE_FLASHCARDS_ORIGIN;
  return fromBuild || F.origin;
}

// The backend the game studies against (config `FLASHCARDS.backend`).
export function studyBackend(): StudyBackend {
  if (F.backend === "demo") return demoBackend;
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
