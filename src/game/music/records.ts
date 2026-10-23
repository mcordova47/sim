import { choice, menu, say, type Menu } from "../dialog";
import { parseTrack, type Track } from "./track";

// The records on the player. Every `.track` file in `tracks/` is one record,
// listed in file name order (so "01-", "02-" put them in a chosen order). Drop a
// file in and it appears in the record player's menu; nothing else to change.
// This file only reads text, it makes no sound, so the game does not need
// the sound feature to build the menu.
const FILES = import.meta.glob("./tracks/*.track", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

// What the record player's menu offers to stop the music.
export const STOP_LABEL = "Stop the music";

// Parses the files. A track with a mistake is reported with its line and left
// out, so one bad track can't stop the game (the tests fail on it instead).
export function loadTracks(files: Record<string, string>, onError: (error: Error) => void = () => {}): Track[] {
  const tracks: Track[] = [];
  for (const path of Object.keys(files).sort()) {
    const id = path.replace(/^.*\//, "").replace(/\.track$/, "");
    try {
      const track = parseTrack(files[path], `${id}.track`, id);
      if (track.title === STOP_LABEL || tracks.some((t) => t.title === track.title)) {
        throw new Error(`${id}.track: another record already has the title "${track.title}"`);
      }
      tracks.push(track);
    } catch (error) {
      onError(error as Error);
    }
  }
  return tracks;
}

export const TRACK_FILES = FILES;
export const TRACKS: Track[] = loadTracks(FILES, (e) => console.error(e.message));

// The task at the record player (tasks.ts), whose menu picks the record.
export const RECORD_TASK = "record-play";

// The line shown when a record is chosen (and by the now-playing note).
export const nowPlayingText = (track: Track): string => `Now playing: ${track.title}.${track.note ? ` ${track.note}` : ""}`;

// The choice that opens the list of the player's own demos (issue 059).
export const DEMOS_LABEL = "Demos...";

// The record player's menu: one choice per track, then `Demos...` (only when
// there is at least one demo; it opens a second menu of their titles), then one
// to stop. Escape backs out of it. It is built each time the player presses
// the interact key at the record stand, because demos come and go while playing.
export function recordMenu(tracks: readonly Track[], demos: readonly Track[] = []): Menu {
  return menu("Which record?", [
    ...tracks.map((t) => choice(t.title, say(nowPlayingText(t)))),
    ...(demos.length > 0
      ? [choice(DEMOS_LABEL, menu("Which demo?", demos.map((t) => choice(t.title, say(nowPlayingText(t))))))]
      : []),
    choice(STOP_LABEL, say("You lift the needle.")),
  ]);
}

export const RECORD_MENU = recordMenu(TRACKS);

// The track a menu label stands for, or null for "stop" (or anything else).
export function trackForLabel(label: string, tracks: readonly Track[] = TRACKS): Track | null {
  return tracks.find((t) => t.title === label) ?? null;
}
