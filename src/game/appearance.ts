import type { COLOR } from "../render/colors";
import type { ApartmentState, Check } from "./state";
import type { Rect } from "./world";

// One way an object can look. The first variant of an object whose `when`
// holds is drawn; one with no `when` is the fallback. `sprite` is the name of
// the art to use. Until it exists the placeholder is drawn with `label` and
// `color` so the state is still visible.
export interface Variant {
  sprite: string;
  when?: Check[];
  label?: string;
  color?: keyof typeof COLOR;
}

// An object whose look depends on state, covering `area`.
export interface Appearance {
  area: Rect;
  variants: Variant[];
}

export function pickVariant(variants: Variant[], state: ApartmentState): Variant | null {
  return variants.find((v) => state.matchesAll(v.when)) ?? null;
}
