// Whether the browser asks for less motion. False where there is no `matchMedia` (tests, old browsers).
export function reducedMotionAsked(): boolean {
  try {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
