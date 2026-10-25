import { FLASHCARDS as F } from "../config";
import { demoBackend } from "./demo";
import type { StudyBackend } from "./study";

// The backend the game studies against. Stage 2 returns the real one.
export function studyBackend(): StudyBackend {
  if (F.backend === "real") throw new Error("The real flashcards backend is not wired yet (issue 026 stage 2)");
  return demoBackend;
}
