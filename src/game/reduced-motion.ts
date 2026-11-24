// Whether the browser asks for less motion. False where there is no `matchMedia` (tests, old browsers).
export function reducedMotionAsked(): boolean {
  try {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// A reader for things that run continuously (the candle): the setting is held and follows the
// MediaQueryList `change` event, so it is cheap every frame and takes effect without a reload.
// Without `matchMedia` (tests, old browsers) it is always false.
export function liveReducedMotion(): () => boolean {
  let list: MediaQueryList | null = null;
  let asked = false;
  return () => {
    if (list === null) {
      try {
        if (typeof matchMedia !== "function") return false;
        const l = matchMedia("(prefers-reduced-motion: reduce)");
        asked = l.matches;
        l.addEventListener?.("change", (e) => (asked = e.matches));
        list = l;
      } catch {
        return false;
      }
    }
    return asked;
  };
}
