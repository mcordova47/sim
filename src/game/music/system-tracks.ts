import { parseTrack, type Track } from "./track";

// The system tracks: music the game plays for itself, such as the lullaby of the
// sleep sequence (issue 078). They live in `system/`, a folder the record player
// never reads, so they are not in its menu, cannot be chosen as the record and are
// not saved with the sound settings. Like `records.ts` this only reads text.
const FILES = import.meta.glob("./system/*.track", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

// Parses the files, by id (the file name without ".track"). A track with a
// mistake is reported with its line and left out; the tests fail on it.
export function loadSystemTracks(files: Record<string, string>, onError: (error: Error) => void = () => {}): Record<string, Track> {
  const tracks: Record<string, Track> = {};
  for (const path of Object.keys(files).sort()) {
    const id = path.replace(/^.*\//, "").replace(/\.track$/, "");
    try {
      tracks[id] = parseTrack(files[path], `${id}.track`, id);
    } catch (error) {
      onError(error as Error);
    }
  }
  return tracks;
}

export const SYSTEM_TRACK_FILES = FILES;
export const SYSTEM_TRACKS: Record<string, Track> = loadSystemTracks(FILES, (e) => console.error(e.message));

// The sleep sequence's lullaby (null if its file is missing or broken: the sequence is silent then).
export const SLEEP_LULLABY: Track | null = SYSTEM_TRACKS["sleep-lullaby"] ?? null;

// The ad encounter's battle loop (issue 091a; null if its file is missing or broken: the encounter is silent then).
export const ENCOUNTER_BATTLE: Track | null = SYSTEM_TRACKS["encounter-battle"] ?? null;
