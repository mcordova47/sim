// The music lab's pure parts (issue 122, docs/music-lab.md): reading the lab text, choosing which section
// plays, applying the sliders, and writing the slider values back into the text. No audio and no page here.
//
// The `.track` format has no intro (docs/music.md), and the lab does not change it. The lab text is a
// plain `.track` with two optional marker lines that split it into sections:
//
//   title: Quiet Siren
//   tempo: 120
//   == intro ==        channels played once ...
//   [melody square 0.5]
//   ...
//   == loop ==         ... then these channels, forever
//   [melody square 0.5]
//
// Lines before the first marker may only be `title:`, `note:` and `tempo:` (shared by both sections). With
// no marker at all the whole text is the loop, so any `.track` file pastes in as it is.
import { TEMPO_RANGE, TrackError, parseTrack, type Track } from "../game/music/track";

export type Section = "intro" | "loop";
// What plays: the intro once and then the loop, the loop alone, or the intro alone (repeating, to tune it).
export type Mode = "both" | "loop" | "intro";

export interface LabTrack {
  intro: Track | null;
  loop: Track;
}

export interface Tweaks {
  // Overrides the text's tempo (beats per minute).
  tempo?: number;
  // Channel volume overrides, keyed `intro.<channel>` or `loop.<channel>`.
  gains: Record<string, number>;
  // Channels left out while listening (never written back to the text).
  muted: string[];
  // SOUND.master (whole game level), and the encounter music's level (the lab's stand-in for
  // ENCOUNTERS.music.gain in the 091 design).
  master?: number;
  encounterGain?: number;
}

export const NO_TWEAKS: Tweaks = { gains: {}, muted: [] };
export const channelKey = (section: Section, channel: string): string => `${section}.${channel}`;

const MARKER = /^==\s*(intro|loop)\s*==$/i;
const stripComment = (raw: string): string => raw.replace(/(^|\s)#.*$/, "").trim();

interface Split {
  // Which section each line belongs to; "pre" is the shared top of the text.
  where: ("pre" | Section)[];
  hasMarkers: boolean;
}

// Works out which section every line is in. Throws a TrackError for a repeated marker or a channel (or
// notes) above the first marker.
function split(text: string): Split {
  const lines = text.split(/\r?\n/);
  const where: Split["where"] = [];
  const seen = new Set<string>();
  let at: "pre" | Section = "pre";
  lines.forEach((raw, i) => {
    const marker = MARKER.exec(stripComment(raw));
    if (marker) {
      const name = marker[1].toLowerCase() as Section;
      if (seen.has(name)) throw new TrackError("lab", i + 1, `there are two "== ${name} ==" lines`);
      seen.add(name);
      at = name;
    }
    where.push(at);
  });
  // No marker: the whole text is the loop (its settings above the first channel are still "pre").
  if (seen.size === 0) {
    let channels = false;
    return {
      where: lines.map((raw) => ((channels ||= stripComment(raw).startsWith("[")) ? "loop" : "pre")),
      hasMarkers: false,
    };
  }
  lines.forEach((raw, i) => {
    if (where[i] !== "pre") return;
    const line = stripComment(raw);
    if (line && !/^(title|note|tempo)\s*:/i.test(line)) {
      throw new TrackError("lab", i + 1, `above the first "== ... ==" line only title:, note: and tempo: may appear; put "${line}" under == intro == or == loop ==`);
    }
  });
  return { where, hasMarkers: true };
}

// The text of one section as a complete `.track`: the shared top and that section's lines, every other
// line blanked, so a parse error names the line the author sees.
function sectionText(text: string, s: Split, section: Section): string {
  return text
    .split(/\r?\n/)
    .map((line, i) => (s.where[i] === "pre" || (s.where[i] === section && !MARKER.test(stripComment(line))) ? line : ""))
    .join("\n");
}

export type ParseResult = { ok: true; lab: LabTrack } | { ok: false; error: string };

// Reads the lab text. Never throws: a mistake comes back as a message that names the line.
export function parseLab(text: string): ParseResult {
  try {
    const s = split(text);
    const loop = parseTrack(sectionText(text, s, "loop"), s.hasMarkers ? "loop section" : "track", "lab-loop");
    const hasIntro = s.where.includes("intro");
    const intro = hasIntro ? parseTrack(sectionText(text, s, "intro"), "intro section", "lab-intro") : null;
    return { ok: true, lab: { intro, loop } };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e.message };
    throw e;
  }
}

// Which tracks to play for a mode. `loop` is what repeats; `intro` plays once before it (null: no intro).
// "intro" mode repeats the intro by itself; an intro-less lab falls back to the loop.
export function selectSection(lab: LabTrack, mode: Mode): { intro: Track | null; loop: Track } {
  if (mode === "intro" && lab.intro) return { intro: null, loop: lab.intro };
  if (mode === "loop") return { intro: null, loop: lab.loop };
  return { intro: lab.intro, loop: lab.loop };
}

const clampTempo = (t: number): number => Math.min(TEMPO_RANGE.max, Math.max(TEMPO_RANGE.min, t));
const clampUnit = (v: number): number => Math.min(1, Math.max(0, v));

// A track with the sliders applied: the tempo, each channel's volume, and muted channels taken out (the
// track keeps its length, so a muted longest channel does not change the loop).
export function applyTweaks(track: Track, section: Section, tweaks: Tweaks): Track {
  const tempo = tweaks.tempo === undefined ? track.tempo : clampTempo(tweaks.tempo);
  const channels = track.channels
    .filter((c) => !tweaks.muted.includes(channelKey(section, c.name)))
    .map((c) => {
      const g = tweaks.gains[channelKey(section, c.name)];
      return g === undefined ? c : { ...c, volume: clampUnit(g) };
    });
  return { ...track, tempo, channels };
}

// What the speakers get for a mode: the section choice and then the sliders (the sliders' keys follow the
// section a track came from, so "intro" mode, which repeats the intro, still uses the `intro.` keys).
export function playable(lab: LabTrack, mode: Mode, tweaks: Tweaks): { intro: Track | null; loop: Track } {
  const picked = selectSection(lab, mode);
  const loopSection: Section = mode === "intro" && lab.intro ? "intro" : "loop";
  return {
    intro: picked.intro ? applyTweaks(picked.intro, "intro", tweaks) : null,
    loop: applyTweaks(picked.loop, loopSection, tweaks),
  };
}

// One slider row per channel: where it is, its written volume and its key.
export interface ChannelRow {
  key: string;
  section: Section;
  name: string;
  wave: string;
  volume: number;
}

export function channelRows(lab: LabTrack): ChannelRow[] {
  const rows = (t: Track | null, section: Section): ChannelRow[] =>
    t ? t.channels.map((c) => ({ key: channelKey(section, c.name), section, name: c.name, wave: c.wave, volume: c.volume })) : [];
  return [...rows(lab.intro, "intro"), ...rows(lab.loop, "loop")];
}

const round = (n: number, places: number): number => Number(n.toFixed(places));

// The text with the slider values written in: the `tempo:` line and each channel's volume in its
// `[name wave volume]` line. Comments, notes and every other line are left exactly as they were. Muting is
// not written (it is only for listening). Call it with text that parses.
export function copyBack(text: string, tweaks: Tweaks): string {
  const s = split(text);
  const lines = text.split(/\r?\n/);
  let tempoSeen = false;
  const out = lines.map((raw, i) => {
    const section = s.where[i] === "pre" ? null : s.where[i];
    if (section === null && tweaks.tempo !== undefined && /^\s*tempo\s*:/i.test(raw)) {
      tempoSeen = true;
      return raw.replace(/^(\s*tempo\s*:\s*)[^#\s]*/i, `$1${round(clampTempo(tweaks.tempo), 2)}`);
    }
    if (section === null) return raw;
    const header = /^(\s*\[\s*)(\S+)(\s+)(\S+)(?:\s+(\S+))?(\s*\])/.exec(raw);
    if (!header || stripComment(raw)[0] !== "[") return raw;
    const g = tweaks.gains[channelKey(section, header[2])];
    if (g === undefined) return raw;
    return `${header[1]}${header[2]}${header[3]}${header[4]} ${round(clampUnit(g), 2)}${header[6]}${raw.slice(header[0].length)}`;
  });
  if (tweaks.tempo !== undefined && !tempoSeen) {
    const at = lines.findIndex((l) => /^\s*title\s*:/i.test(l));
    out.splice(at + 1, 0, `tempo: ${round(clampTempo(tweaks.tempo), 2)}`);
  }
  return out.join("\n");
}

// The values that live in config.ts rather than in the text, ready to copy over.
export function configLines(tweaks: Tweaks): string {
  const lines: string[] = [];
  if (tweaks.master !== undefined) lines.push(`SOUND.master = ${round(clampUnit(tweaks.master), 2)}`);
  if (tweaks.encounterGain !== undefined) lines.push(`encounter music level = ${round(clampUnit(tweaks.encounterGain), 3)}`);
  return lines.join("\n");
}

// A starting text for the lab (made up for it; it is not one of the game's records).
export const SAMPLE_TEXT = `title: Lab Sample
note: An intro that plays once, then a loop. Edit anything.
tempo: 120

== intro ==
[melody square 0.5]
G4:1 R:1 B4:1 R:1 | D5:2 R:2
[bass triangle 0.8]
G2:4 D3:4
[beat drums 0.5]
R:4 K:1 S:1 K:1 S:1

== loop ==
[melody square 0.5]
G4:0.5 G4:0.5 R:1 B4:1 D5:1 | C5:0.5 C5:0.5 R:1 A4:1 R:1
G4:0.5 G4:0.5 R:1 B4:1 D5:1 | E5:2 D5:1 R:1
[bass triangle 0.8]
G2:1 G2:1 G2:1 G2:1 | C3:1 C3:1 C3:1 C3:1
G2:1 G2:1 G2:1 G2:1 | D3:1 D3:1 D3:1 D3:1
[beat drums 0.5]
K:1 H:1 S:1 H:1 | K:1 H:1 S:1 H:1
K:1 H:1 S:1 H:1 | K:1 H:1 S:1 K:1
`;
