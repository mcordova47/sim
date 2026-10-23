import { describe, expect, it } from "vitest";
import { unsupportedChars } from "../../render/font";
import { RECORD_MENU, STOP_LABEL, TRACKS, TRACK_FILES, loadTracks, nowPlayingText, recordMenu, trackForLabel } from "./records";
import { parseTrack } from "./track";

describe("the records on the player", () => {
  it("has every track file parse, with no mistakes (a typo in a track fails here, with its line)", () => {
    for (const [path, text] of Object.entries(TRACK_FILES)) {
      expect(() => parseTrack(text, path), path).not.toThrow();
    }
    expect(TRACKS).toHaveLength(Object.keys(TRACK_FILES).length);
    expect(TRACKS.length).toBeGreaterThanOrEqual(2);
  });

  it("lists them in file name order with unique ids and titles", () => {
    const ids = TRACKS.map((t) => t.id);
    expect(ids).toEqual([...ids].sort());
    expect(new Set(TRACKS.map((t) => t.title)).size).toBe(TRACKS.length);
  });

  it("only uses characters the pixel font can draw in titles and notes", () => {
    for (const t of TRACKS) expect(unsupportedChars(`${t.title} ${t.note} ${nowPlayingText(t)}`), t.id).toEqual([]);
  });

  it("keeps every title short enough for a menu line", () => {
    for (const t of TRACKS) expect(t.title.length).toBeLessThanOrEqual(30);
  });

  it("makes a menu with one choice per record and one to stop", () => {
    expect(RECORD_MENU.choices.map((c) => c.label)).toEqual([...TRACKS.map((t) => t.title), STOP_LABEL]);
  });

  it("finds the track for a label, and none for stop or something else", () => {
    expect(trackForLabel(TRACKS[0].title)).toBe(TRACKS[0]);
    expect(trackForLabel(STOP_LABEL)).toBeNull();
    expect(trackForLabel("nope")).toBeNull();
    expect(recordMenu([]).choices).toHaveLength(1);
  });
});

describe("loadTracks", () => {
  const ok = "title: A\n[x sine]\nC4";
  it("reports a broken track and keeps the rest", () => {
    const errors: string[] = [];
    const tracks = loadTracks({ "./tracks/02-b.track": "oops", "./tracks/01-a.track": ok }, (e) => errors.push(e.message));
    expect(tracks.map((t) => t.id)).toEqual(["01-a"]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("02-b.track");
  });
  it("refuses a repeated title, and the title of the stop choice", () => {
    const errors: string[] = [];
    const tracks = loadTracks(
      { "./a/1.track": ok, "./a/2.track": ok, "./a/3.track": `title: ${STOP_LABEL}\n[x sine]\nC4` },
      (e) => errors.push(e.message),
    );
    expect(tracks).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });
});
