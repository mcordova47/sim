import { DESKTOP_VIEW, NARROW, NARROW_VIEW, VIEW } from "../game/config";

export interface Screen {
  canvas: HTMLCanvasElement;
  // What the game draws into: `VIEW` game pixels (320 x 192, or the phone's narrow view).
  readonly ctx: CanvasRenderingContext2D;
  // Copies the finished picture to the visible canvas (touch mode; nothing to do otherwise).
  present(): void;
  // Call once a frame, after the view size (`VIEW`) may have changed (a full-screen picture on the
  // phone's narrow view, issue 090): resizes the offscreen picture and refits the canvas.
  sync(): void;
  // True on the touch layer with the phone turned sideways (issue 092): the picture has room for the
  // full 320 x 192 view then, with the controls in columns at its sides.
  readonly landscape: boolean;
  // Switches between the desktop fit and the phone fit (device pixels, safe areas).
  setTouch(on: boolean): void;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Fit {
  // Device pixels per game pixel (a whole number).
  scaleDev: number;
  // Size on the page, in CSS pixels.
  cssWidth: number;
  cssHeight: number;
  // Size of the backing store, in device pixels.
  backingWidth: number;
  backingHeight: number;
}

// The largest whole number of device pixels per game pixel that fits `width` x `height`
// CSS pixels, never below 1 (a window too small for 1x is cropped, not shrunk). Counting
// in device pixels gives more sizes than whole CSS pixels (docs/mobile.md section 2.1).
export function fitScale(width: number, height: number, dpr: number, view: { width: number; height: number } = VIEW): Fit {
  const d = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  const raw = Math.floor(Math.min((width * d) / view.width, (height * d) / view.height));
  const scaleDev = Math.max(1, Number.isFinite(raw) ? raw : 1);
  return {
    scaleDev,
    cssWidth: (view.width * scaleDev) / d,
    cssHeight: (view.height * scaleDev) / d,
    backingWidth: view.width * scaleDev,
    backingHeight: view.height * scaleDev,
  };
}

// Side margin kept on each side of a full-screen picture, and the step its scale moves in
// (device pixels per game pixel), for `fitFill`.
export const FILL_MARGIN = 6;
export const FILL_STEP = 0.25;

// For a full-screen 320 x 192 piece on the narrow view (issue 090): the largest scale, in steps
// of a quarter device pixel, that fits the width less a small margin and the height. It is not a
// whole number (a 390 phone at DPR 3 cannot reach 4 and 3 is only 1.0x), so game pixels are 3 or 4
// device pixels wide in a regular pattern; the copy to the canvas uses nearest neighbour. A
// quarter-step keeps the backing store a whole number of device pixels (320 x 0.25 is whole).
// Never below the whole-number fit (`fitScale`), so it never shrinks the piece.
export function fitFill(width: number, height: number, dpr: number, view: { width: number; height: number } = VIEW): Fit {
  const d = dpr > 0 && Number.isFinite(dpr) ? dpr : 1;
  const whole = fitScale(width, height, d, view);
  const raw = Math.min(((width - 2 * FILL_MARGIN) * d) / view.width, (height * d) / view.height);
  const scaleDev = Number.isFinite(raw) ? Math.max(whole.scaleDev, Math.floor(raw / FILL_STEP) * FILL_STEP) : whole.scaleDev;
  return {
    scaleDev,
    cssWidth: (view.width * scaleDev) / d,
    cssHeight: (view.height * scaleDev) / d,
    backingWidth: view.width * scaleDev,
    backingHeight: view.height * scaleDev,
  };
}

// The room the controls need below the picture in portrait, in CSS pixels.
export const PORTRAIT_CONTROLS_HEIGHT = 330;

// Landscape (issue 092): the controls sit in a column at each side of the picture, never over it.
// Sizes are CSS pixels at scale 1. `side` is the column's width; the controls are drawn in it by
// index.html through the custom properties `createScreen` sets (`--ls-k` is the shrink factor).
export const LANDSCAPE = {
  side: 146,
  dpad: 120,
  faceWidth: 132,
  faceHeight: 104,
  pillWidth: 120,
  pillHeight: 36,
  pillGap: 8,
  pills: 3,
  // Space from the screen edge (inside the safe area) to the controls' top or bottom.
  edge: 12,
  // The smallest the controls get when the screen is too narrow for full-size columns.
  minShrink: 0.7,
};

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LandscapeLayout {
  // Width of each side column and the factor the controls are drawn at (1 = full size).
  side: number;
  shrink: number;
  // The area between the columns that the picture is fitted in and centred in.
  area: Rect;
  picture: Rect;
  scaleDev: number;
  dpad: Rect;
  face: Rect;
  pills: Rect;
}

// Where everything goes in landscape on a `viewWidth` x `viewHeight` page (inside `insets`): a column
// at each side for the controls, the picture fitted into what is left. If the page is too narrow for
// full-size columns beside a 1x picture they shrink (down to `minShrink`); below that the picture
// would overlap them, which `landscapeLayout` reports by the rectangles intersecting (a screen
// narrower than about 530 px, no current phone in landscape).
export function landscapeLayout(
  viewWidth: number,
  viewHeight: number,
  insets: Insets,
  dpr: number,
  view: { width: number; height: number } = VIEW,
): LandscapeLayout {
  const L = LANDSCAPE;
  const width = Math.max(0, viewWidth - insets.left - insets.right);
  const height = Math.max(0, viewHeight - insets.top - insets.bottom);
  const room = Math.floor((width - view.width) / 2);
  const shrink = Math.min(1, Math.max(L.minShrink, room / L.side));
  const side = Math.round(L.side * shrink);
  const area = { x: insets.left + side, y: insets.top, width: Math.max(0, width - 2 * side), height };
  const f = fitScale(area.width, area.height, dpr, view);
  const picture = {
    x: area.x + (area.width - f.cssWidth) / 2,
    y: area.y + (area.height - f.cssHeight) / 2,
    width: f.cssWidth,
    height: f.cssHeight,
  };
  const k = shrink;
  const bottom = viewHeight - insets.bottom - L.edge * k;
  const dpad = { x: insets.left + ((L.side - L.dpad) / 2) * k, y: bottom - L.dpad * k, width: L.dpad * k, height: L.dpad * k };
  const rightEdge = viewWidth - insets.right;
  const face = {
    x: rightEdge - ((L.side - L.faceWidth) / 2 + L.faceWidth) * k,
    y: bottom - L.faceHeight * k,
    width: L.faceWidth * k,
    height: L.faceHeight * k,
  };
  const pillsHeight = L.pills * L.pillHeight + (L.pills - 1) * L.pillGap;
  const pills = {
    x: rightEdge - ((L.side - L.pillWidth) / 2 + L.pillWidth) * k,
    y: insets.top + L.edge * k,
    width: L.pillWidth * k,
    height: pillsHeight * k,
  };
  return { side, shrink, area, picture, scaleDev: f.scaleDev, dpad, face, pills };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

// The area for the picture on a phone. Portrait puts the controls below it; landscape puts them
// in a column at each side (`landscapeLayout`). Inside the safe areas.
export function pictureArea(
  viewWidth: number,
  viewHeight: number,
  insets: Insets,
): { width: number; height: number; portrait: boolean } {
  const width = Math.max(0, viewWidth - insets.left - insets.right);
  const height = Math.max(0, viewHeight - insets.top - insets.bottom);
  const portrait = viewHeight > viewWidth;
  if (portrait) return { width, height: height - PORTRAIT_CONTROLS_HEIGHT, portrait };
  const area = landscapeLayout(viewWidth, viewHeight, insets, 1).area;
  return { width: area.width, height: area.height, portrait };
}

// The desktop rule, unchanged: the largest whole CSS-pixel factor, at least 1.
export function desktopScale(width: number, height: number): number {
  return Math.max(1, Math.floor(Math.min(width / VIEW.width, height / VIEW.height)));
}

// The safe-area insets, read through a probe element (env() is only readable from CSS).
function readInsets(): Insets {
  try {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;" +
      "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.appendChild(probe);
    const s = getComputedStyle(probe);
    const insets = {
      top: parseFloat(s.paddingTop) || 0,
      right: parseFloat(s.paddingRight) || 0,
      bottom: parseFloat(s.paddingBottom) || 0,
      left: parseFloat(s.paddingLeft) || 0,
    };
    probe.remove();
    return insets;
  } catch {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
}

// Tells index.html how big the landscape columns are (it positions the controls with these).
function setLayoutVars(l: LandscapeLayout): void {
  try {
    const style = document.documentElement.style;
    style.setProperty("--ls-side", `${l.side}px`);
    style.setProperty("--ls-k", String(l.shrink));
  } catch {
    // No document element (tests).
  }
}

// Sets up the canvas and keeps it scaled to the window. On a desktop the canvas is 320 x 192
// at the largest whole CSS-pixel factor, as always. In touch mode the game draws into a
// 320 x 192 offscreen canvas that is copied, smoothing off, onto a backing store made of
// whole device pixels per game pixel, so pixels stay crisp at 1.33x and the like.
export function createScreen(canvas: HTMLCanvasElement): Screen {
  const main = canvas.getContext("2d");
  if (!main) throw new Error("2D canvas context not available");
  const off = document.createElement("canvas");
  off.width = VIEW.width;
  off.height = VIEW.height;
  const offCtx = off.getContext("2d");
  if (!offCtx) throw new Error("2D canvas context not available");
  offCtx.imageSmoothingEnabled = false;

  let touch = false;
  let landscape = false;

  const size = (width: number, height: number) => {
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    main.imageSmoothingEnabled = false;
  };

  const fit = () => {
    if (!touch) {
      size(VIEW.width, VIEW.height);
      const scale = desktopScale(window.innerWidth, window.innerHeight);
      canvas.style.width = `${VIEW.width * scale}px`;
      canvas.style.height = `${VIEW.height * scale}px`;
      return;
    }
    const vv = window.visualViewport;
    const insets = readInsets();
    const area = pictureArea(vv?.width ?? window.innerWidth, vv?.height ?? window.innerHeight, insets);
    const dpr = window.devicePixelRatio || 1;
    landscape = !area.portrait;
    if (landscape) {
      // Landscape: the picture sits between the two control columns, whatever view is live.
      setLayoutVars(landscapeLayout(vv?.width ?? window.innerWidth, vv?.height ?? window.innerHeight, insets, dpr));
      const l = fitScale(area.width, area.height, dpr);
      size(l.backingWidth, l.backingHeight);
      canvas.style.width = `${l.cssWidth}px`;
      canvas.style.height = `${l.cssHeight}px`;
      canvas.style.marginBottom = "0px";
      return;
    }
    // A full-screen piece on the narrow view fills the width (fractional scale) instead of staying at 1.0x.
    const filling = NARROW && VIEW.width === DESKTOP_VIEW.width;
    const f = filling ? fitFill(area.width, area.height, dpr) : fitScale(area.width, area.height, dpr);
    size(f.backingWidth, f.backingHeight);
    canvas.style.width = `${f.cssWidth}px`;
    canvas.style.height = `${f.cssHeight}px`;
    // A full-screen picture is shorter than the narrow view: keep the room it leaves so the
    // controls below do not jump under the player's thumbs when the picture changes size.
    const reserve = NARROW ? fitScale(area.width, area.height, window.devicePixelRatio || 1, NARROW_VIEW).cssHeight : 0;
    canvas.style.marginBottom = `${Math.max(0, reserve - f.cssHeight)}px`;
  };

  fit();
  // The size the offscreen picture and the canvas were last fitted for.
  let fitted = `${VIEW.width}x${VIEW.height}`;
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
  window.visualViewport?.addEventListener("resize", fit);

  return {
    canvas,
    get ctx() {
      return touch ? offCtx : main;
    },
    present() {
      if (!touch) return;
      main.imageSmoothingEnabled = false;
      main.drawImage(off, 0, 0, canvas.width, canvas.height);
    },
    get landscape() {
      return touch && landscape;
    },
    sync() {
      const now = `${VIEW.width}x${VIEW.height}`;
      if (now === fitted) return;
      fitted = now;
      off.width = VIEW.width;
      off.height = VIEW.height;
      offCtx.imageSmoothingEnabled = false;
      fit();
    },
    setTouch(on: boolean) {
      if (touch === on) return;
      touch = on;
      fit();
    },
  };
}
