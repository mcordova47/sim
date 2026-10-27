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

// The area for the picture on a phone. Portrait puts the controls below it; landscape lets
// them float over the picture, so it takes the whole viewport. Inside the safe areas.
export function pictureArea(
  viewWidth: number,
  viewHeight: number,
  insets: Insets,
): { width: number; height: number; portrait: boolean } {
  const width = Math.max(0, viewWidth - insets.left - insets.right);
  const height = Math.max(0, viewHeight - insets.top - insets.bottom);
  const portrait = viewHeight > viewWidth;
  return { width, height: portrait ? height - PORTRAIT_CONTROLS_HEIGHT : height, portrait };
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
    const area = pictureArea(vv?.width ?? window.innerWidth, vv?.height ?? window.innerHeight, readInsets());
    const dpr = window.devicePixelRatio || 1;
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
