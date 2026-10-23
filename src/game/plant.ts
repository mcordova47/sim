import { PLANT } from "./config";
import type { ApartmentState, Check, Effect, Requirement } from "./state";

// The snake plant's rules (issue 063). Everything is a function of state
// variables (plantStage, plantGrowth, plantDry; see state-vars.ts), and time
// only enters through `plantDry`, which the game clock advances (state.tick)
// and sleeping or napping advance by the hours they skip. So the same clock
// and the same waterings always give the same plant, with no real-time or
// random input.
//
// The tone is a quiet garden: the plant never dies and never loses a stage.
// Left dry for a long while it droops; one watering and it is itself again.

export const STAGE_NAMES = ["sprout", "small", "full", "flowering"] as const;

// Checks that are true when the plant is drooping, and when the soil is still
// damp from the last watering. Used by the tasks and by how it is drawn.
export const DROOPING: Check = { var: "plantDry", min: PLANT.droopAfterHours };
export const THIRSTY: Check = { var: "plantDry", min: PLANT.dampHours };

export const drooping = (state: ApartmentState): boolean => state.matches(DROOPING);
export const needsWater = (state: ApartmentState): boolean => state.matches(THIRSTY);

// Watering the plant: restarts the dry clock, and counts toward growing when
// the soil had dried enough to count (the task only offers itself then).
export const WATER_EFFECTS: Effect[] = [
  { var: "plantGrowth", add: 1 },
  { var: "plantDry", set: 0 },
];

export const WATER_REQUIRES: Requirement[] = [{ ...THIRSTY, reason: "SOIL IS STILL DAMP" }];
export const REVIVE_REQUIRES: Requirement[] = [{ ...DROOPING, reason: "NOT DROOPING" }];

// Moves the plant up a stage when it has had enough waterings. Returns true if
// it grew. At the last stage the count is simply cleared. Call it whenever
// plantGrowth changes (the game does).
export function settlePlant(state: ApartmentState): boolean {
  const stage = state.get("plantStage");
  const growth = state.get("plantGrowth");
  if (growth <= 0) return false;
  if (stage >= PLANT.lastStage) {
    state.applyEffects([{ var: "plantGrowth", set: 0 }]);
    return false;
  }
  if (growth < PLANT.wateringsToGrow[stage]) return false;
  // Growth carries over, so a second watering in the same moment is not lost.
  state.applyEffects([
    { var: "plantStage", set: stage + 1 },
    { var: "plantGrowth", set: growth - PLANT.wateringsToGrow[stage] },
  ]);
  return true;
}
