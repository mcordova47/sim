import type { ViewRect } from "../game/view-zoom";
import type { SpriteDrawer } from "./sprites";

// Composed full-screen pictures (issue 111c): a cutscene `view` step names a sprite, but for
// some names a painter draws the picture at run time instead. The cutscene asks this registry
// first; a painter that cannot draw (a missing sprite, an error) returns false and the cutscene
// falls back to the sprite of the same name.
// A taller view a picture would like on a portrait phone (issue 125): the same width as the desktop's
// 320 x 192, with a height somewhere in a range. The game uses the tallest height in the range that
// fills the free picture area, or the usual view if the area is shorter than `minHeight`.
export interface PreferredView {
  width: number;
  minHeight: number;
  maxHeight: number;
}

export interface ComposedView {
  // Draws the window `from` of the picture (the whole picture is FULL_VIEW) filling the screen.
  // `size` is the live view (320 x 192, or the taller one this picture asked for).
  // Returns false if it could not, and then must not have left anything on `ctx`.
  draw(ctx: CanvasRenderingContext2D, sprites: SpriteDrawer, from: ViewRect, size?: { width: number; height: number }): boolean;
  // Set by a picture that lays itself out for a taller view on the phone. Others stay 320 x 192.
  readonly preferredView?: PreferredView;
  // Sprites it needs loaded before the first frame.
  sprites(): string[];
}

const views = new Map<string, ComposedView>();

export function registerComposedView(name: string, view: ComposedView): void {
  views.set(name, view);
}

export function composedView(name: string): ComposedView | undefined {
  return views.get(name);
}

// Every sprite the registered painters need, for the loader.
export function composedViewSprites(): string[] {
  return [...views.values()].flatMap((v) => v.sprites());
}
