import { TIME_OF_DAY, type TintKey } from "../config";

// One flat wash of a palette color over the world.
export interface Wash {
  color: TintKey["color"];
  alpha: number;
}

export interface Light {
  // At most two washes: the key before the hour fading out and the one after
  // fading in (one wash when both are the same color).
  washes: Wash[];
  // How much the lamps are on, 0 to 1.
  lamps: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// The light at an hour (0 up to 24, wrapping). Between two keys everything
// blends linearly, so nothing jumps, including at midnight (the first and last
// keys match).
export function lightAt(hour: number, keys: readonly TintKey[] = TIME_OF_DAY.tint): Light {
  const h = ((hour % 24) + 24) % 24;
  let i = keys.length - 2;
  while (i > 0 && keys[i].hour > h) i--;
  const a = keys[i];
  const b = keys[i + 1];
  const t = b.hour === a.hour ? 0 : Math.min(1, Math.max(0, (h - a.hour) / (b.hour - a.hour)));
  const lamps = lerp(a.lamps, b.lamps, t);
  if (a.color === b.color) return { washes: [{ color: a.color, alpha: lerp(a.alpha, b.alpha, t) }], lamps };
  return {
    washes: [
      { color: a.color, alpha: a.alpha * (1 - t) },
      { color: b.color, alpha: b.alpha * t },
    ],
    lamps,
  };
}

// The washes for a room: scaled by how much outside light it gets, and, in
// the room with the blinds, dimmed more while they are closed (by day).
export function roomWashes(
  light: Light,
  room: string | undefined,
  blindsOpen: boolean,
  cfg: Pick<typeof TIME_OF_DAY, "roomLight" | "blindsClosedDim"> = TIME_OF_DAY,
): Wash[] {
  const scale = (room !== undefined ? cfg.roomLight[room] : undefined) ?? 1;
  const washes = light.washes.map((w) => ({ ...w, alpha: w.alpha * scale }));
  if (room === "main" && !blindsOpen) {
    washes.push({ color: "night", alpha: cfg.blindsClosedDim * (1 - light.lamps) });
  }
  return washes.filter((w) => w.alpha > 0.001);
}

// Blends two lights: each color's alpha and the lamps move from `a` toward `b`.
// At t 0 it is `a` itself and at t 1 it is `b` itself (the very same washes, so
// the last frame of a blend is exactly the picture that follows it).
export function mixLight(a: Light, b: Light, t: number): Light {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const colors: TintKey["color"][] = [];
  for (const w of [...a.washes, ...b.washes]) if (!colors.includes(w.color)) colors.push(w.color);
  const alphaOf = (light: Light, color: TintKey["color"]) => light.washes.filter((w) => w.color === color).reduce((sum, w) => sum + w.alpha, 0);
  return {
    washes: colors.map((color) => ({ color, alpha: lerp(alphaOf(a, color), alphaOf(b, color), t) })),
    lamps: lerp(a.lamps, b.lamps, t),
  };
}

// The light while asleep (issue 078): the hour you lay down at, blended toward
// the hour you will wake at by `morning`, with how dark it is separately: the
// extra night wash (none when `dark` is 0) and the lamps' strength after dimming.
export interface SleepLight {
  base: Light;
  extra: Wash | null;
  lamps: number;
}

export function sleepLight(
  hour: number,
  skipHours: number,
  dark: number,
  morning: number,
  darkAlpha: number,
  darkLamps: number,
): SleepLight {
  const base = mixLight(lightAt(hour), lightAt(hour + skipHours), morning);
  const extraAlpha = darkAlpha * dark;
  return {
    base,
    extra: extraAlpha > 0.001 ? { color: "night", alpha: extraAlpha } : null,
    lamps: dark > 0 ? base.lamps * (1 - dark * (1 - darkLamps)) : base.lamps,
  };
}
