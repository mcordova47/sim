import { lookById, DEFAULT_LOOK_ID } from "./looks";
import { pixelate } from "./pixelate";
import type { PhotoIO } from "./photo-io";
import { REEL_CAP, type ReelPicInput, type ReelStore } from "./reel-store";

// The add flow (issue 113c): one file at a time is decoded, made into palette indices and dropped.
// Only the indices go to the store, in one batch at the end. The big picture is never held past its turn.

export interface AddSummary {
  added: number;
  duplicates: number;
  full: number;
  // Could not be decoded (or was not a valid picture once made).
  unreadable: number;
  // The store failed part-way: what was stored so far is counted in `added`, from a fresh list.
  storageError: boolean;
}

export type AddProgress = (done: number, total: number) => void;

const nextTurn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export async function addPhotos(files: readonly Blob[], io: PhotoIO, store: ReelStore, onProgress: AddProgress = () => {}, lookId: string = DEFAULT_LOOK_ID): Promise<AddSummary> {
  const look = lookById(lookId);
  const summary: AddSummary = { added: 0, duplicates: 0, full: 0, unreadable: 0, storageError: false };
  let before: number;
  try {
    before = (await store.list()).length;
  } catch {
    return { ...summary, storageError: true };
  }
  const room = Math.max(0, REEL_CAP - before);
  const made: ReelPicInput[] = [];
  for (let i = 0; i < files.length; i++) {
    if (made.length >= room) {
      // No room for more: the rest are not even decoded.
      summary.full += files.length - i;
      break;
    }
    onProgress(i + 1, files.length);
    try {
      const image = await io.decode(files[i]);
      if (image) {
        const { w, h, px } = pixelate(image.rgba, image.width, image.height, { size: { w: look.w, h: look.h }, dither: look.dither });
        made.push({ w, h, px, look: look.id });
      } else summary.unreadable++;
    } catch {
      summary.unreadable++;
    }
    await nextTurn();
  }
  if (made.length > 0) {
    try {
      const result = await store.add(made);
      summary.added = result.added;
      summary.duplicates = result.duplicates;
      summary.full += result.full;
      summary.unreadable += result.invalid;
    } catch {
      // A storage error part-way: some may have been kept. Count what is really there.
      summary.storageError = true;
      try {
        summary.added = Math.max(0, (await store.list()).length - before);
      } catch {
        summary.added = 0;
      }
    }
  }
  if (summary.added > 0) io.keepStorage();
  return summary;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// What the page says afterwards (the wording is in docs/text-review.md).
export function summaryLines(s: AddSummary): string[] {
  const lines: string[] = [];
  if (s.added > 0) lines.push(`${plural(s.added, "picture", "pictures")} added.`);
  else if (!s.storageError && s.duplicates === 0 && s.full === 0 && s.unreadable === 0) lines.push("No pictures added.");
  if (s.duplicates > 0) lines.push(s.duplicates === 1 ? "1 was already here." : `${s.duplicates} were already here.`);
  if (s.unreadable > 0) lines.push(`${s.unreadable} could not be read.`);
  if (s.full > 0) lines.push(`Room for ${REEL_CAP}. The rest stayed where they were.`);
  if (s.storageError) lines.push("This browser could not keep them all.");
  return lines;
}
