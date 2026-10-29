import type { ViewRect } from "../game/view-zoom";
import type { SpriteDrawer } from "./sprites";

// Composed full-screen pictures (issue 111c): a cutscene `view` step names a sprite, but for
// some names a painter draws the picture at run time instead. The cutscene asks this registry
// first; a painter that cannot draw (a missing sprite, an error) returns false and the cutscene
// falls back to the sprite of the same name.
export interface ComposedView {
  // Draws the window `from` of the picture (the whole picture is FULL_VIEW) filling the screen.
  // Returns false if it could not, and then must not have left anything on `ctx`.
  draw(ctx: CanvasRenderingContext2D, sprites: SpriteDrawer, from: ViewRect): boolean;
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
