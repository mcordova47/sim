// A stretch of the day, in hours since midnight (0 up to 24): from `from` up
// to, but not including, `to`. When `to` is less than `from` it runs past
// midnight: { from: 22, to: 4 } is 10 PM to 4 AM.
export interface HourWindow {
  from: number;
  to: number;
}

export function inWindow(hour: number, w: HourWindow): boolean {
  // The clock is 0 up to 24, but anything is folded into that range.
  const h = ((hour % 24) + 24) % 24;
  return w.from < w.to ? h >= w.from && h < w.to : h >= w.from || h < w.to;
}

export function inAnyWindow(hour: number, windows: readonly HourWindow[] | undefined): boolean {
  return !!windows && windows.some((w) => inWindow(hour, w));
}

// Why a window is not usable, or null. Used to check the task data.
export function windowProblem(w: HourWindow): string | null {
  if (!Number.isFinite(w.from) || !Number.isFinite(w.to)) return "from and to must be numbers";
  if (w.from < 0 || w.from >= 24) return "from must be at least 0 and under 24";
  if (w.to <= 0 || w.to > 24) return "to must be over 0 and at most 24";
  if (w.from === w.to) return "from and to must differ";
  return null;
}
