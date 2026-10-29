import { MAKE_TRACKS as M } from "../config";
import { parseTrack, TrackError, type Track } from "./track";

// The model behind the track editor (issue 059, docs/make-tracks.md): a small
// grid of steps, and the two ways between it and `.track` text. The editor never
// keeps a format of its own. What it saves is plain `.track` text that
// `parseTrack` reads, so a made track plays like a record and can be copied into
// `src/game/music/tracks/`. Nothing here touches the screen, the keyboard or
// storage, so all of it is tested on its own.

export const CHANNELS = ["melody", "bass", "beat"] as const;
export type ChannelId = (typeof CHANNELS)[number];

// The drum hits, in the order of a note's `key` in the beat channel (0, 1, 2).
export const DRUM_LETTERS = ["K", "S", "H"] as const;

// One note in the grid. `step` counts from 0. `key` is a MIDI number for the
// melody and the bass (C4 is 60) and the drum index (0 kick, 1 snare, 2 hat) for
// the beat. `length` is in steps. One note at a time in a channel, never overlapping.
export interface GridNote {
  step: number;
  key: number;
  length: number;
}

export interface DemoGrid {
  title: string;
  tempo: number;
  steps: number;
  channels: Record<ChannelId, GridNote[]>;
}

// The names the menus already use, so a track cannot be given one of them.
export const RESERVED_NAMES = ["Stop the music", "Demos...", "New track", "Continue your draft", "Cancel", "Yes", "No", "Back"];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// "C4" for MIDI 60.
export function noteName(midi: number): string {
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

// The lowest and highest `key` a channel takes.
export function keyRange(channel: ChannelId): { low: number; high: number } {
  if (channel === "beat") return { low: 0, high: DRUM_LETTERS.length - 1 };
  return { low: M[channel].low, high: M[channel].high };
}

// Where the cursor starts in a channel.
export function startKey(channel: ChannelId): number {
  return channel === "beat" ? 0 : M[channel].start;
}

export const emptyGrid = (title: string): DemoGrid => ({
  title,
  tempo: M.tempo.default,
  steps: M.steps.default,
  channels: { melody: [], bass: [], beat: [] },
});

export function cloneGrid(grid: DemoGrid): DemoGrid {
  return {
    title: grid.title,
    tempo: grid.tempo,
    steps: grid.steps,
    channels: {
      melody: grid.channels.melody.map((n) => ({ ...n })),
      bass: grid.channels.bass.map((n) => ({ ...n })),
      beat: grid.channels.beat.map((n) => ({ ...n })),
    },
  };
}

const whole = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

// -- Names ------------------------------------------------------------------

// Why a name will not do, or null if it will. The text is plain words for the footer.
export function nameProblem(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "Give it a name.";
  if (trimmed.length > M.nameMax) return `Names are at most ${M.nameMax} letters.`;
  if (!M.nameChars.test(trimmed)) return "That name has a character the editor cannot use.";
  return null;
}

// Names are compared without caring about case, because the font draws capitals.
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function nameTaken(name: string, taken: Iterable<string>): boolean {
  for (const other of taken) if (sameName(name, other)) return true;
  return false;
}

// "Untitled 1", "Untitled 2", ...: the first one that is not taken.
export function untitledName(taken: Iterable<string>): string {
  const all = [...taken];
  for (let n = 1; ; n++) {
    const name = `${M.untitled} ${n}`;
    if (!nameTaken(name, all)) return name;
  }
}

// A name with anything the editor cannot use taken out and cut to length (used for a draft read back from storage).
export function cleanName(name: string): string {
  const kept = [...name].filter((ch) => M.nameChars.test(ch)).join("").trim();
  return kept.slice(0, M.nameMax).trim();
}

// -- Making a grid safe ------------------------------------------------------

// The grid as it will be written: tempo and size in range, and in every channel
// only valid notes, in order, none past the end, none overlapping (an earlier one
// is cut short where the next begins), drum hits one step long. Does not change
// the grid it is given: the editor keeps notes past the end of a track it has
// shortened until it saves, so lengthening it again brings them back.
export function normalizeGrid(grid: DemoGrid): DemoGrid {
  const steps = clamp(Math.round(Number(grid.steps)) || M.steps.default, 1, M.steps.max);
  const tempo = clamp(Math.round(Number(grid.tempo)) || M.tempo.default, M.tempo.min, M.tempo.max);
  const channels = { melody: [], bass: [], beat: [] } as Record<ChannelId, GridNote[]>;
  for (const id of CHANNELS) {
    const { low, high } = keyRange(id);
    const valid = (grid.channels[id] ?? [])
      .filter((n) => whole(n.step) && whole(n.key) && whole(n.length) && n.step >= 0 && n.step < steps && n.key >= low && n.key <= high && n.length >= 1)
      .map((n) => ({ step: n.step, key: n.key, length: id === "beat" ? 1 : Math.min(n.length, M.maxNoteSteps) }))
      .sort((a, b) => a.step - b.step);
    const out: GridNote[] = [];
    for (const note of valid) {
      const last = out.at(-1);
      if (last && last.step === note.step) continue; // two at one step: the first stays
      if (last && last.step + last.length > note.step) last.length = note.step - last.step;
      out.push(note);
    }
    for (const note of out) note.length = Math.min(note.length, steps - note.step);
    channels[id] = out;
  }
  return { title: grid.title, tempo, steps, channels };
}

export function countNotes(grid: DemoGrid): number {
  const g = normalizeGrid(grid);
  return CHANNELS.reduce((sum, id) => sum + g.channels[id].length, 0);
}

export function channelsWithNotes(grid: DemoGrid): number {
  const g = normalizeGrid(grid);
  return CHANNELS.filter((id) => g.channels[id].length > 0).length;
}

// -- Editing -----------------------------------------------------------------

// The note that covers `step` (it starts there or is being held through it), if any.
export function noteAt(grid: DemoGrid, channel: ChannelId, step: number): GridNote | undefined {
  const len = (n: GridNote) => (channel === "beat" ? 1 : n.length);
  return grid.channels[channel].find((n) => step >= n.step && step < n.step + len(n));
}

// How many steps from `step` are free in the channel before the next note or the
// end of the track, so a note placed here can be at most this long.
export function roomAt(grid: DemoGrid, channel: ChannelId, step: number): number {
  let room = grid.steps - step;
  for (const n of grid.channels[channel]) if (n.step > step) room = Math.min(room, n.step - step);
  return Math.max(0, room);
}

// Puts a note at `step`, as long as `length` allows (it is cut to the free room).
// A note already covering the step is replaced. Returns false if the step or
// key is outside the grid.
export function placeNote(grid: DemoGrid, channel: ChannelId, step: number, key: number, length: number): boolean {
  const { low, high } = keyRange(channel);
  if (!whole(step) || !whole(key) || step < 0 || step >= grid.steps || key < low || key > high) return false;
  removeNote(grid, channel, step);
  const wanted = channel === "beat" ? 1 : clamp(Math.floor(length), 1, M.maxNoteSteps);
  const room = roomAt(grid, channel, step);
  if (room < 1) return false;
  grid.channels[channel].push({ step, key, length: Math.min(wanted, room) });
  grid.channels[channel].sort((a, b) => a.step - b.step);
  return true;
}

// Takes away the note covering `step`. Returns whether there was one.
export function removeNote(grid: DemoGrid, channel: ChannelId, step: number): boolean {
  const note = noteAt(grid, channel, step);
  if (!note) return false;
  grid.channels[channel] = grid.channels[channel].filter((n) => n !== note);
  return true;
}

// The next length in the list after `length` (1, 2, 4, then 1 again).
export function nextLength(length: number): number {
  return M.lengths.find((l) => l > length) ?? M.lengths[0];
}

// Gives the note at `step` its next length that fits (back to 1 if none does).
// Returns the new length, or null if there is no note there.
export function cycleNoteLength(grid: DemoGrid, channel: ChannelId, step: number): number | null {
  if (channel === "beat") return null;
  const note = noteAt(grid, channel, step);
  if (!note) return null;
  const room = roomAt(grid, channel, note.step);
  let next = nextLength(note.length);
  for (let guard = 0; guard < M.lengths.length && next > room; guard++) next = nextLength(next);
  note.length = Math.min(next, room);
  return note.length;
}

// -- To text -----------------------------------------------------------------

const beats = (steps: number) => String(steps * M.stepBeats);

function channelText(grid: DemoGrid, id: ChannelId): string {
  const notes = grid.channels[id];
  const tokens: string[] = [];
  let step = 0;
  const bar = () => {
    if (step > 0 && step % 8 === 0) tokens.push("|");
  };
  while (step < grid.steps) {
    bar();
    const note = notes.find((n) => n.step === step);
    if (note) {
      const pitch = id === "beat" ? DRUM_LETTERS[note.key] : noteName(note.key);
      tokens.push(`${pitch}:${beats(note.length)}`);
      step += note.length;
      continue;
    }
    // A run of rests up to the next note, the next bar line or the end.
    let end = step + 1;
    const next = notes.find((n) => n.step > step)?.step ?? grid.steps;
    while (end < next && end < grid.steps && end % 8 !== 0) end++;
    tokens.push(`R:${beats(end - step)}`);
    step = end;
  }
  return tokens.join(" ");
}

// The grid as `.track` text, ready for `parseTrack` (and for a file in
// `src/game/music/tracks/`). All three channels are written, the same length, so
// the loop is clean. A grid with no notes at all makes text that `parseTrack`
// refuses ("it has no notes to play"), so saving checks for notes first.
export function gridToTrackText(input: DemoGrid): string {
  const grid = normalizeGrid(input);
  const lines = [`title: ${input.title.trim()}`, `tempo: ${grid.tempo}`];
  for (const id of CHANNELS) {
    const def = M[id];
    lines.push(`[${def.name} ${def.wave} ${def.volume}]`, channelText(grid, id));
  }
  return `${lines.join("\n")}\n`;
}

// -- From text (import, and reading a saved track back) -----------------------

// Pasted text as it arrives by phone, made ready for `parseTrack` (issue 106d). Notes, Messages and mail
// change plain text in small ways: \r\n line endings, non-breaking and other odd spaces, zero-width marks
// and a byte order mark, curly quotes and dashes (in a title), a "> " quote mark on every line, a code
// fence, and a signature at the end ("Sent from my phone", "Get Outlook for ...", or a "--" line and
// everything after it). All of those are taken out or made plain. Text that is not a track is left for the
// parser to refuse with its own message.
export function cleanTrackText(text: string): string {
  let lines = text
    .replace(/[\uFEFF\u200B-\u200D\u2060\u00AD]/g, "")
    .replace(/\r\n?|[\u2028\u2029\u0085]/g, "\n")
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000\t]/g, " ")
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .split("\n");
  if (lines.some((l) => l.trim() !== "") && lines.every((l) => l.trim() === "" || /^\s*>/.test(l))) {
    lines = lines.map((l) => l.replace(/^\s*>\s?/, ""));
  }
  lines = lines.filter((l) => !/^\s*(```|~~~)/.test(l));
  const cut = lines.findIndex((l) => /^\s*[-_]{2,}\s*$/.test(l));
  if (cut >= 0) lines = lines.slice(0, cut);
  const signature = /^\s*(sent (from|via|with|using|by)|get outlook|shared from|shared via)\b/i;
  while (lines.length > 0 && (lines.at(-1)!.trim() === "" || signature.test(lines.at(-1)!))) lines.pop();
  return lines.map((l) => l.replace(/\s+$/, "")).join("\n").replace(/^\n+/, "") + "\n";
}

export type GridResult = { ok: true; grid: DemoGrid } | { ok: false; message: string };

const fail = (message: string): GridResult => ({ ok: false, message });
const onHalfBeat = (beats: number) => Math.abs(beats * 2 - Math.round(beats * 2)) < 1e-9;
const midiOf = (freq: number) => Math.round(69 + 12 * Math.log2(freq / 440));
const bytesOf = (text: string) => new TextEncoder().encode(text).length;

// Reads `.track` text into a grid, but only if the editor can show all of it:
// at most one drum channel and two pitched ones, every start and length on the
// half beat, notes at most 4 steps long, at most 32 steps, notes inside the
// editor's ranges, a tempo and a name it accepts, and a size it allows. Anything
// else is refused with a plain reason, and nothing is changed. A different wave
// or volume is not a problem: the editor's own are used.
export function trackTextToGrid(text: string, source = "pasted track"): GridResult {
  if (bytesOf(text) > M.maxTextBytes) return fail(`That is too big (over ${M.maxTextBytes / 1024} KB).`);
  let track: Track;
  try {
    track = parseTrack(text, source);
  } catch (error) {
    return fail(error instanceof TrackError ? error.message : "That is not a track.");
  }
  const problem = nameProblem(track.title);
  if (problem) return fail(problem);
  if (!Number.isInteger(track.tempo) || track.tempo < M.tempo.min || track.tempo > M.tempo.max) {
    return fail(`The tempo must be a whole number from ${M.tempo.min} to ${M.tempo.max}.`);
  }
  if (!onHalfBeat(track.beats)) return fail("The track must end on a half beat.");
  const steps = Math.round(track.beats / M.stepBeats);
  if (steps > M.steps.max) return fail(`Too long for the editor (more than ${M.steps.max} steps).`);

  const used = track.channels.filter((c) => c.notes.length > 0);
  const drums = used.filter((c) => c.wave === "drums");
  const pitched = used.filter((c) => c.wave !== "drums");
  if (drums.length > 1 || pitched.length > 2) return fail("Too many channels for the editor (one beat and two tunes at most).");

  const grid = emptyGrid(track.title.trim());
  grid.tempo = track.tempo;
  grid.steps = Math.max(1, steps);

  // A note's start and length in steps, or a reason it cannot be shown.
  const place = (note: { start: number; length: number }): { step: number; length: number } | string => {
    if (!onHalfBeat(note.start) || !onHalfBeat(note.length)) return "Notes must start and end on the half beat.";
    return { step: Math.round(note.start / M.stepBeats), length: Math.round(note.length / M.stepBeats) };
  };

  for (const channel of drums) {
    for (const note of channel.notes) {
      const at = place(note);
      if (typeof at === "string") return fail(at);
      grid.channels.beat.push({ step: at.step, key: DRUM_LETTERS.indexOf(note.drum as "K"), length: 1 });
    }
  }

  const keysOf = (channel: Track["channels"][number]) => channel.notes.map((n) => midiOf(n.freq!));
  const mean = (keys: number[]) => keys.reduce((a, b) => a + b, 0) / keys.length;
  // With two tunes the lower one is the bass; with one, the melody if it fits there, else the bass.
  // A channel named "melody" or "bass" (as the editor writes them) goes where its name says.
  const assign: { channel: Track["channels"][number]; id: "melody" | "bass" }[] = [];
  const named = (c: Track["channels"][number]) => (c.name === "melody" || c.name === "bass" ? c.name : null);
  const names = pitched.map(named);
  if (pitched.length > 0 && names.every((n) => n !== null) && new Set(names).size === names.length) {
    pitched.forEach((channel, i) => assign.push({ channel, id: names[i]! }));
  } else if (pitched.length === 2) {
    const [a, b] = pitched;
    const lowerIsB = mean(keysOf(b)) < mean(keysOf(a));
    assign.push({ channel: a, id: lowerIsB ? "melody" : "bass" }, { channel: b, id: lowerIsB ? "bass" : "melody" });
  } else if (pitched.length === 1) {
    const keys = keysOf(pitched[0]);
    const fits = (id: "melody" | "bass") => keys.every((k) => k >= M[id].low && k <= M[id].high);
    assign.push({ channel: pitched[0], id: fits("melody") || !fits("bass") ? "melody" : "bass" });
  }
  for (const { channel, id } of assign) {
    for (const note of channel.notes) {
      const at = place(note);
      if (typeof at === "string") return fail(at);
      if (at.length > M.maxNoteSteps) return fail(`A note is too long for the editor (step ${at.step + 1}).`);
      const key = midiOf(note.freq!);
      if (key < M[id].low || key > M[id].high) {
        return fail(`A note is out of the editor's range (step ${at.step + 1}, ${noteName(key)}).`);
      }
      grid.channels[id].push({ step: at.step, key, length: at.length });
    }
  }
  const result = normalizeGrid(grid);
  result.title = grid.title;
  return { ok: true, grid: result };
}

// A grid read from storage (a draft), keeping what is usable and leaving out
// what is not. Unlike `normalizeGrid` it keeps notes past the end of the track,
// which the editor holds on to until it saves. Null if it is not a grid at all.
export function readGrid(raw: unknown): DemoGrid | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const channels = r.channels;
  if (typeof channels !== "object" || channels === null) return null;
  if (typeof r.title !== "string" || typeof r.tempo !== "number" || typeof r.steps !== "number") return null;
  if (!Number.isFinite(r.tempo) || !Number.isFinite(r.steps)) return null;
  const grid = emptyGrid(cleanName(r.title) || M.untitled);
  grid.tempo = clamp(Math.round(r.tempo), M.tempo.min, M.tempo.max);
  grid.steps = clamp(Math.round(r.steps), 1, M.steps.max);
  for (const id of CHANNELS) {
    const list = (channels as Record<string, unknown>)[id];
    if (!Array.isArray(list)) continue;
    const { low, high } = keyRange(id);
    const taken = new Set<number>();
    for (const n of list.slice(0, M.steps.max * 2)) {
      if (typeof n !== "object" || n === null) continue;
      const { step, key, length } = n as Record<string, unknown>;
      if (!whole(step) || !whole(key) || !whole(length)) continue;
      if (step < 0 || step >= M.steps.max || key < low || key > high || length < 1 || taken.has(step)) continue;
      taken.add(step);
      grid.channels[id].push({ step, key, length: id === "beat" ? 1 : Math.min(length, M.maxNoteSteps) });
    }
    grid.channels[id].sort((a, b) => a.step - b.step);
  }
  return grid;
}
