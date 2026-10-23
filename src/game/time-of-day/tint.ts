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
