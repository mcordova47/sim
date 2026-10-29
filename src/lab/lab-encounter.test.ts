import { describe, expect, it } from "vitest";
import { ENCOUNTERS } from "../game/config";
import type { Game, Layer } from "../game/game";
import { FakeAudioContext } from "../game/sound/fake-audio";
import { SoundEngine } from "../game/sound/engine";
import { LAB_ENCOUNTER, labEncounterMusic } from "./lab-encounter";
import { LAB_KEY, saveLab, type StoreLike } from "./lab-store";
import { SAMPLE_TEXT } from "./lab-text";

function setup(search = "?encounter=ad-candle&labmusic=1", text = SAMPLE_TEXT) {
  const ctx = new FakeAudioContext();
  const engine = new SoundEngine(() => ctx);
  engine.unlock();
  const data: Record<string, string> = {};
  const store: StoreLike = { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
  saveLab(store, { text, mode: "both", live: true, tweaks: { gains: {}, muted: [] } });
  const fake = { encounter: false, dialogOpen: false, layer: null as Layer | null };
  const game = {
    interaction: { get active() { return fake.encounter ? { item: { encounter: true } } : null; } },
    get dialogOpen() { return fake.dialogOpen; },
    addLayer(l: Layer) { fake.layer = l; return () => {}; },
  } as unknown as Game;
  const attached = labEncounterMusic(game, engine, search, store);
  const frame = (n = 1) => { for (let i = 0; i < n; i++) { ctx.currentTime += 1 / 60; fake.layer!.update!(1 / 60); } };
  return { ctx, engine, fake, attached, frame, store, data };
}

describe("labEncounterMusic", () => {
  it("does nothing without &labmusic=1 or without saved text", () => {
    expect(setup("?encounter=ad-candle").attached).toBe(false);
    const empty = new SoundEngine(() => new FakeAudioContext());
    const game = { addLayer() {} } as unknown as Game;
    expect(labEncounterMusic(game, empty, "?labmusic=1", { getItem: () => null, setItem() {} })).toBe(false);
    expect(LAB_KEY).toBe("life.musiclab.v1");
  });

  it("ducks the record at once, starts at the hit frame and stops after the encounter", () => {
    const { ctx, engine, fake, frame } = setup();
    const hit = ENCOUNTERS.entrance.sounds.find(([, cue]) => cue === "encounter-hit")![0];
    frame(5); // nothing going on yet
    expect(ctx.oscillators).toHaveLength(0);
    fake.encounter = true;
    frame(1);
    // Ducked to silence over duckDown.
    ctx.currentTime += LAB_ENCOUNTER.duckDown;
    expect(engine.busLevel("music")).toBe(0);
    frame(hit - 3);
    expect(ctx.oscillators).toHaveLength(0); // before the hit: silent
    frame(10);
    expect(ctx.oscillators.length).toBeGreaterThan(0); // the lab track is playing
    expect(engine.busLevel("sleep")).toBeCloseTo(LAB_ENCOUNTER.defaultGain, 6);
    fake.encounter = false;
    frame(1);
    ctx.currentTime += LAB_ENCOUNTER.fadeOut + 0.1;
    expect(engine.busLevel("sleep")).toBe(0);
    ctx.currentTime += LAB_ENCOUNTER.duckUp + 0.1;
    expect(engine.busLevel("music")).toBeCloseTo(0.7, 6);
    const n = ctx.started;
    frame(120);
    expect(ctx.started).toBe(n); // stopped
  });

  it("starts at once when the card opens early (E skipped the entrance)", () => {
    const { ctx, fake, frame } = setup();
    fake.encounter = true;
    frame(10);
    expect(ctx.oscillators).toHaveLength(0);
    fake.dialogOpen = true;
    frame(10);
    expect(ctx.oscillators.length).toBeGreaterThan(0);
  });

  it("puts the record back when the encounter is dropped at any frame", () => {
    for (const at of [1, 7, 31, 32, 33, 80]) {
      const { ctx, engine, fake, frame } = setup();
      fake.encounter = true;
      frame(at);
      fake.encounter = false;
      frame(1);
      ctx.currentTime += 3;
      expect(engine.busLevel("music")).toBeCloseTo(0.7, 6);
      expect(engine.busLevel("sleep")).toBe(0);
    }
  });
});
