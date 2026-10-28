import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { FakeStorage } from "../achievements/fake-storage";
import { SOUND, type EffectDef } from "../config";
import { Decor } from "../decor";
import type { DecorData, DecorItem, DecorSlot } from "../decor-data";
import { Game } from "../game";
import { TASKS } from "../tasks";
import { parseTileMap } from "../tilemap";
import { guitarEffect } from "./decisions";
import { FakeAudioContext } from "./fake-audio";
import { SoundFeature, devGuitarVoice, type KeyEventLike, type Listenable } from "./feature";

// Issue 108: the guitar's timbre follows the instrument in hand.
const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };

class FakeKeys implements Listenable<KeyEventLike> {
  fns: ((e: KeyEventLike) => void)[] = [];
  addEventListener(_t: string, fn: (e: KeyEventLike) => void) {
    this.fns.push(fn);
  }
  press(code: string) {
    for (const fn of this.fns) fn({ code });
  }
}

const slot: DecorSlot = { id: "guitar", room: "main", name: "GUITAR", area: { x: 0, y: 0, w: 16, h: 16 }, kinds: ["instrument"], default: "instrument-steel" };
const item = (id: string, sprite: string): DecorItem => ({ id, name: id.toUpperCase(), kind: "instrument", sprite, w: 16, h: 16 });
const data: DecorData = { slots: [slot], items: [item("instrument-steel", "guitar"), item("instrument-nylon", "guitar-nylon")], families: {} };

function setup(opts: { withSlot?: boolean; guitarVoice?: string; muted?: boolean } = {}) {
  const guitar = TASKS.find((t) => t.id === "guitar")!;
  const level = {
    ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [guitar] } }),
    facing: "right" as const,
  };
  const decor = opts.withSlot ? new Decor(data) : undefined;
  const game = new Game(level, decor ? { decor } : {});
  const ctx = new FakeAudioContext();
  const keys = new FakeKeys();
  const feature = new SoundFeature(game, { audio: () => ctx, storage: new FakeStorage(), keys, random: () => 0.5, tracks: [], start: "main", ...(opts.guitarVoice ? { guitarVoice: opts.guitarVoice } : {}) });
  keys.press("KeyZ");
  if (opts.muted) feature.setMuted(true);
  for (let i = 0; i < 12; i++) game.update(dt, NO_INPUT);
  game.update(dt, press);
  const play = (code = "ArrowUp") => {
    ctx.currentTime += 5;
    const before = ctx.oscillators.length;
    keys.press(code);
    return ctx.oscillators.slice(before);
  };
  return { game, decor, feature, ctx, play };
}

const toneCount = (def: EffectDef) => def.voices.filter((v) => "wave" in v).length;

describe("the guitar voice table", () => {
  it("has a voice and an effect for every instrument, and the default is one of them", () => {
    expect(SOUND.instruments[SOUND.defaultInstrument]).toBeDefined();
    for (const [id, inst] of Object.entries(SOUND.instruments)) {
      expect(SOUND.guitarVoices[inst.voice], id).toBeDefined();
      expect(SOUND.effects[SOUND.guitarVoices[inst.voice]], id).toBeDefined();
    }
    expect(SOUND.instruments.guitar.voice).toBe("steel");
    expect(SOUND.instruments["guitar-nylon"].voice).toBe("nylon");
  });

  it("keeps the old voice restorable as 'plain', the original triangle blip", () => {
    expect(SOUND.guitarVoices.plain).toBe("noteKey");
    expect(SOUND.effects.noteKey.voices).toEqual([{ wave: "triangle", freq: 440, length: 0.14, gain: 0.22 }]);
  });

  it("has parameters in range: audible gains, finite lengths, partials that die faster as they climb", () => {
    for (const name of ["guitarSteel", "guitarNylon"]) {
      const def = SOUND.effects[name];
      let total = 0;
      for (const v of def.voices) {
        expect(v.gain, name).toBeGreaterThan(0);
        expect(v.gain, name).toBeLessThanOrEqual(0.3);
        expect(v.length, name).toBeGreaterThan(0);
        expect(v.length, name).toBeLessThan(2);
        if ("freq" in v) expect(v.freq).toBeGreaterThan(0);
        total += v.gain;
      }
      // Never louder than a clip would be, and it fits in the voice cap.
      expect(total, name).toBeLessThan(0.7);
      expect(def.voices.length, name).toBeLessThan(SOUND.maxVoices / 2);
      const tones = def.voices.filter((v): v is Extract<typeof v, { wave: string }> => "wave" in v);
      for (let i = 1; i < tones.length; i++) if (tones[i].freq > tones[i - 1].freq) expect(tones[i].length).toBeLessThanOrEqual(tones[0].length);
    }
  });

  it("makes steel brighter than nylon (more, and louder, high partials)", () => {
    const high = (name: string) => SOUND.effects[name].voices.filter((v) => "wave" in v && v.freq > 600).reduce((n, v) => n + v.gain, 0);
    expect(high("guitarSteel")).toBeGreaterThan(high("guitarNylon"));
  });
});

describe("choosing the voice", () => {
  it("follows the instrument, and an unknown or missing one gets the default", () => {
    expect(guitarEffect("guitar")).toBe("guitarSteel");
    expect(guitarEffect("guitar-nylon")).toBe("guitarNylon");
    expect(guitarEffect("ukulele")).toBe("guitarSteel");
    expect(guitarEffect(null)).toBe("guitarSteel");
    expect(guitarEffect(undefined)).toBe("guitarSteel");
  });

  it("plays steel by default (no guitar slot in the apartment yet)", () => {
    const s = setup();
    expect(s.feature.instrument).toBe(SOUND.defaultInstrument);
    expect(s.game.interaction.active?.item.id).toBe("guitar");
    expect(s.play()).toHaveLength(toneCount(SOUND.effects.guitarSteel));
  });

  it("plays nylon when the nylon guitar is in the slot, and steel when it is the stand guitar", () => {
    const s = setup({ withSlot: true });
    expect(s.feature.instrument).toBe("guitar");
    expect(s.play()).toHaveLength(toneCount(SOUND.effects.guitarSteel));
    s.decor!.own("instrument-nylon");
    expect(s.decor!.place("guitar", "instrument-nylon")).toBe(true);
    expect(s.feature.instrument).toBe("guitar-nylon");
    const made = s.play();
    expect(made).toHaveLength(toneCount(SOUND.effects.guitarNylon));
    expect(made[0].type).toBe("sine");
    expect(made[0].frequency.calls[0].value).toBeCloseTo(SOUND.effects.guitarNylon.voices[0] && (SOUND.noteKeys.up as number), 1);
  });

  it("keeps the pitch of each arrow the same in every voice", () => {
    const pitchOf = (voice: string) => setup({ guitarVoice: voice }).play("ArrowRight")[0].frequency.calls[0].value;
    expect(pitchOf("steel")).toBeCloseTo(SOUND.noteKeys.right, 1);
    expect(pitchOf("nylon")).toBeCloseTo(SOUND.noteKeys.right, 1);
    expect(pitchOf("plain")).toBeCloseTo(SOUND.noteKeys.right, 1);
  });

  it("the override restores the old voice exactly: one triangle", () => {
    const made = setup({ guitarVoice: "plain" }).play();
    expect(made).toHaveLength(1);
    expect(made[0].type).toBe("triangle");
  });

  it("ignores an unknown override", () => {
    const s = setup({ guitarVoice: "banjo" });
    expect(s.play()).toHaveLength(toneCount(SOUND.effects.guitarSteel));
  });

  it("stays silent while muted", () => {
    const s = setup({ muted: true });
    expect(s.play()).toHaveLength(0);
    s.feature.setMuted(false);
    expect(s.play().length).toBeGreaterThan(0);
  });

  it("does not play a guitar note for the other keys", () => {
    expect(setup().play("KeyQ")).toHaveLength(0);
  });
});

describe("the dev override", () => {
  it("is read only on the dev server and only for a known voice", () => {
    expect(devGuitarVoice("?guitarvoice=nylon", true)).toBe("nylon");
    expect(devGuitarVoice("?guitarvoice=plain", true)).toBe("plain");
    expect(devGuitarVoice("?guitarvoice=banjo", true)).toBeUndefined();
    expect(devGuitarVoice("", true)).toBeUndefined();
    expect(devGuitarVoice("?guitarvoice=nylon", false)).toBeUndefined();
  });
});
