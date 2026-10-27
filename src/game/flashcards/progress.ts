import type { ProgressSummary } from "./study";

// The progress page (issue 082): plain facts from the app's own figures, in the
// game's words. Pure, so the lines can be tested without a canvas. Nothing here
// is invented: no summary means no figures, and the page says only that nothing
// is due.

// A summary from whatever a core answered, or null if it is not a set of plain
// counts that fit together. A page with a wrong number on it is worse than none.
export function readSummary(raw: unknown): ProgressSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const count = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
  const { total, seen, mastered, dueNow, dueTomorrow, nextDueIn } = r;
  if (!count(total) || !count(seen) || !count(mastered) || !count(dueNow) || !count(dueTomorrow)) return null;
  if (total === 0 || seen > total || mastered > seen || dueNow > seen || dueTomorrow > seen - dueNow) return null;
  if (nextDueIn !== null && (typeof nextDueIn !== "number" || !Number.isFinite(nextDueIn) || nextDueIn < 0)) return null;
  return { total, seen, mastered, dueNow, dueTomorrow, nextDueInMs: nextDueIn ?? null };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

// A wait in round units, coarse on purpose ("4 hours", "3 days").
export function describeWait(ms: number): string {
  if (ms < MINUTE) return "under a minute";
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 60) return plural(minutes, "minute");
  const hours = Math.round(ms / HOUR);
  if (hours < 24) return plural(hours, "hour");
  return plural(Math.round(ms / DAY), "day");
}

export type Tone = "paper" | "mist" | "leaf" | "butter";
export interface PageLine {
  text: string;
  tone: Tone;
  // Extra rows of space above this line.
  gap?: number;
}

export interface Tally {
  gotIt: number;
  again: number;
}

// The text of the page, top to bottom. `tally` is what was answered this visit
// (nothing, when the page is the first thing seen).
export function pageLines(summary: ProgressSummary, tally: Tally): PageLine[] {
  const lines: PageLine[] = [
    { text: `${summary.mastered} of ${summary.total} words known`, tone: "paper", gap: 0 },
    { text: `${summary.seen} of ${summary.total} words met`, tone: "mist" },
  ];
  if (summary.dueNow > 0) {
    lines.push({ text: `${plural(summary.dueNow, "card")} due now.`, tone: "butter", gap: 4 });
  } else {
    lines.push({ text: "Nothing is due. That is all for now.", tone: "butter", gap: 4 });
  }
  if (summary.nextDueInMs !== null) lines.push({ text: `The next one is due in ${describeWait(summary.nextDueInMs)}.`, tone: "mist" });
  if (summary.dueTomorrow > 0) lines.push({ text: `${plural(summary.dueTomorrow, "card")} within a day.`, tone: "mist" });
  if (tally.gotIt + tally.again > 0) lines.push({ text: `This time: ${tally.gotIt} got it, ${tally.again} again.`, tone: "paper", gap: 4 });
  return lines;
}

// How much of the bar is each part, in whole pixels of `width`: known, then met
// but not yet known. A part that is not empty is at least one pixel wide.
export function barParts(summary: ProgressSummary, width: number): { known: number; met: number } {
  const px = (n: number) => (n <= 0 ? 0 : Math.max(1, Math.floor((n / summary.total) * width)));
  const known = px(summary.mastered);
  const seen = Math.min(width, px(summary.seen));
  return { known: Math.min(known, seen), met: Math.max(0, seen - known) };
}
