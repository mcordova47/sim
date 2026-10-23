// The track format: a text score Marc can write by hand. See docs/music.md.
//
//   title: Porch Light          (required; shown in the game)
//   note: Slow and warm.        (optional short line shown with the title)
//   tempo: 96                   (beats per minute, 30 to 300; default 100)
//
//   [lead square 0.6]           a channel: a name, a wave and a volume (0 to 1)
//   C4:1 E4:1 G4:2 | R:1        notes: pitch and length in beats; R is a rest
//   [bass triangle]
//   C2:2 G2:2
//   [beat drums 0.8]            the "drums" wave plays K (kick), S (snare), H (hat)
//   K:1 H:1 S:1 H:1
//
// A note is a letter A to G, an optional # or b, an octave 0 to 8 (C4 is middle
// C), then ":" and its length in beats (1, 0.5, .25 or 1/2; one beat if left
// off). "|" is ignored, to mark bars. "#" at the start of a word, or after
// spaces, begins a comment to the end of the line. Channels play together and
// the whole track loops; it is as long as its longest channel.

export const WAVES = ["square", "triangle", "sawtooth", "sine", "drums"] as const;
export type TrackWave = (typeof WAVES)[number];

export interface TrackNote {
  // When it starts and how long it lasts, in beats.
  start: number;
  length: number;
  // Frequency in Hz for a pitched note; the drum letter for a drum hit.
  freq?: number;
  drum?: string;
}

export interface TrackChannel {
  name: string;
  wave: TrackWave;
  volume: number;
  notes: TrackNote[];
}

export interface Track {
  id: string;
  title: string;
  note: string;
  tempo: number;
  channels: TrackChannel[];
  // Length of one pass, in beats.
  beats: number;
}

export class TrackError extends Error {
  constructor(source: string, line: number, message: string) {
    super(`${source}${line > 0 ? `, line ${line}` : ""}: ${message}`);
    this.name = "TrackError";
  }
}

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const DRUMS = new Set(["K", "S", "H"]);
export const MAX_NOTE_BEATS = 64;
// The shortest note (a 32nd of a beat), so a typo can't ask for thousands of notes a second.
export const MIN_NOTE_BEATS = 1 / 32;
export const TEMPO_RANGE = { min: 30, max: 300, default: 100 };

// Frequency in Hz of a note name such as "C4", "F#3" or "Bb2", or null if it is not one.
export function noteFrequency(name: string): number | null {
  const m = /^([A-Ga-g])([#b]?)([0-8])$/.exec(name);
  if (!m) return null;
  const semitone = SEMITONE[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

// A length in beats: "1", "0.5", ".25" or "1/2". Null if it is not a positive, sensible number.
export function parseBeats(text: string): number | null {
  let value: number;
  const fraction = /^(\d+)\/(\d+)$/.exec(text);
  if (fraction) value = Number(fraction[1]) / Number(fraction[2]);
  else if (/^(\d+\.?\d*|\.\d+)$/.test(text)) value = Number(text);
  else return null;
  return Number.isFinite(value) && value >= MIN_NOTE_BEATS && value <= MAX_NOTE_BEATS ? value : null;
}

// Reads a track. `source` names it in error messages (a file name). Throws a
// TrackError that says which line and what is wrong, so a typo is easy to find.
export function parseTrack(text: string, source = "track", id = source): Track {
  const meta = new Map<string, string>();
  const channels: TrackChannel[] = [];
  let current: TrackChannel | null = null;
  let cursor = 0; // beats into the current channel
  const lengths = new Map<TrackChannel, number>();

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.replace(/(^|\s)#.*$/, "").trim();
    if (!line) return;
    const fail = (message: string): never => {
      throw new TrackError(source, lineNo, message);
    };

    const header = /^\[(.*)\]$/.exec(line);
    if (header) {
      const [name, wave, volume, ...extra] = header[1].trim().split(/\s+/);
      if (!name) return fail("a channel needs a name, like [lead square 0.6]");
      if (extra.length) return fail(`too many words in the channel line "${line}"`);
      if (!WAVES.includes(wave as TrackWave)) {
        return fail(`channel "${name}" needs a wave: ${WAVES.join(", ")} (got "${wave ?? ""}")`);
      }
      const level = volume === undefined ? 1 : Number(volume);
      if (!Number.isFinite(level) || level < 0 || level > 1) return fail(`volume "${volume}" must be 0 to 1`);
      if (channels.some((c) => c.name === name)) return fail(`there are two channels named "${name}"`);
      current = { name, wave: wave as TrackWave, volume: level, notes: [] };
      channels.push(current);
      cursor = 0;
      return;
    }

    const keyed = /^([a-z]+)\s*:\s*(.*)$/i.exec(line);
    if (!current && keyed) {
      const key = keyed[1].toLowerCase();
      if (!["title", "note", "tempo"].includes(key)) return fail(`unknown setting "${keyed[1]}" (use title, note or tempo)`);
      if (meta.has(key)) return fail(`"${key}" is set twice`);
      meta.set(key, keyed[2].trim());
      return;
    }
    if (!current) return fail(`notes must come after a channel line like [lead square]; got "${line}"`);

    for (const token of line.split(/\s+/)) {
      if (token === "|") continue;
      const [pitch, lengthText] = token.split(":");
      const length = lengthText === undefined ? 1 : parseBeats(lengthText);
      if (length === null) return fail(`"${token}" has a length that is not a number of beats (try 1, 0.5 or 1/2)`);
      const start = cursor;
      cursor += length;
      if (pitch.toUpperCase() === "R") continue;
      if (current.wave === "drums") {
        const drum = pitch.toUpperCase();
        if (!DRUMS.has(drum)) return fail(`"${token}": drum channels use K, S, H and R (rest)`);
        current.notes.push({ start, length, drum });
        continue;
      }
      const freq = noteFrequency(pitch);
      if (freq === null) return fail(`"${token}" is not a note (examples: C4, F#3, Bb2, R for a rest)`);
      current.notes.push({ start, length, freq });
    }
    // Remember where this channel has got to, for the track's length.
    lengths.set(current, cursor);
  });

  const title = meta.get("title");
  if (!title) throw new TrackError(source, 0, 'it needs a "title: ..." line');
  const tempoText = meta.get("tempo");
  const tempo = tempoText === undefined ? TEMPO_RANGE.default : Number(tempoText);
  if (!Number.isFinite(tempo) || tempo < TEMPO_RANGE.min || tempo > TEMPO_RANGE.max) {
    throw new TrackError(source, 0, `tempo "${tempoText}" must be ${TEMPO_RANGE.min} to ${TEMPO_RANGE.max}`);
  }
  if (!channels.some((c) => c.notes.length > 0)) throw new TrackError(source, 0, "it has no notes to play");
  const beats = Math.max(...channels.map((c) => lengths.get(c) ?? 0));
  return { id, title, note: meta.get("note") ?? "", tempo, channels, beats };
}
