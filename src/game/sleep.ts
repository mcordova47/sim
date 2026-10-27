import { SLEEP, type SleepSettings } from "./config";

// The sleep sequence's timeline (issue 078, docs/sleep.md). A pure function of
// the seconds elapsed, so it can be tested with plain numbers. The running
// activity publishes the result as its `scene`; the light and the banner read
// it and know nothing else about sleeping. No scene means normal.

export type SleepKind = "sleep" | "nap";
export type SleepPhase = "fall" | "asleep" | "wake";

export interface SleepScene {
  kind: SleepKind;
  phase: SleepPhase;
  // Seconds into the sequence.
  t: number;
  // 0 awake to 1 fully dark (the extra night wash).
  dark: number;
  // 0 to 1: how far the light has moved from the hour you lay down at to the
  // hour you will wake at.
  morning: number;
  // The clock jump the task will make at the end, in game hours (for the wake light).
  skipHours: number;
  // 1 normal to 0 hidden: the progress banner.
  bannerAlpha: number;
  settings: SleepSettings;
}

export const sleepTotal = (s: SleepSettings): number => s.fall + s.asleep + s.wake;

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export function sleepSceneAt(kind: SleepKind, t: number, skipHours: number): SleepScene {
  const s = SLEEP[kind];
  const total = sleepTotal(s);
  const time = Math.min(total, Math.max(0, t));
  let phase: SleepPhase = "asleep";
  let dark = 1;
  let morning = 0;
  if (time < s.fall) {
    phase = "fall";
    dark = clamp01(time / s.fall);
  } else if (time >= s.fall + s.asleep) {
    phase = "wake";
    const w = clamp01((time - s.fall - s.asleep) / s.wake);
    dark = 1 - w;
    morning = w;
  }
  // Fades out over the first `bannerFade` seconds, stays hidden, and is back
  // over the last `bannerFade` seconds.
  const f = s.bannerFade;
  const bannerAlpha = f <= 0 ? 1 : time < total / 2 ? 1 - clamp01(time / f) : clamp01((time - (total - f)) / f);
  return { kind, phase, t: time, dark, morning, skipHours, bannerAlpha, settings: s };
}
