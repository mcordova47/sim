import { NO_TWEAKS, type Mode, type Tweaks } from "./lab-text";

// What the lab remembers between visits, and hands to the encounter page (`/?encounter=...&labmusic=1`):
// the text, the mode and the slider values. Dev only; the game never reads it in a build.
export const LAB_KEY = "life.musiclab.v1";

export interface LabState {
  text: string;
  mode: Mode;
  tweaks: Tweaks;
  live: boolean;
}

export interface StoreLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const MODES: Mode[] = ["both", "loop", "intro"];
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

// Reads the saved state, or null if there is none or it is damaged (a bad field falls back, never throws).
export function loadLab(store: StoreLike | null): LabState | null {
  try {
    const raw = store?.getItem(LAB_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (typeof j.text !== "string") return null;
    const t = (j.tweaks ?? {}) as Record<string, unknown>;
    const gains: Record<string, number> = {};
    if (t.gains && typeof t.gains === "object") for (const [k, v] of Object.entries(t.gains)) if (num(v) !== undefined) gains[k] = v as number;
    const muted = Array.isArray(t.muted) ? t.muted.filter((m): m is string => typeof m === "string") : [];
    const tweaks: Tweaks = { ...NO_TWEAKS, gains, muted, tempo: num(t.tempo), master: num(t.master), encounterGain: num(t.encounterGain) };
    return { text: j.text, mode: MODES.includes(j.mode as Mode) ? (j.mode as Mode) : "both", tweaks, live: j.live !== false };
  } catch {
    return null;
  }
}

// Saves it; storage that is blocked or full is ignored (the lab still works, it just forgets).
export function saveLab(store: StoreLike | null, state: LabState): void {
  try {
    store?.setItem(LAB_KEY, JSON.stringify(state));
  } catch {
    // Nothing to do.
  }
}
