import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../../input/controls";
import { FakeStorage } from "../achievements/fake-storage";
import { SOUND } from "../config";
import { mumbleNotes } from "../flashcards/mumble";
import { Game } from "../game";
import { parseTileMap } from "../tilemap";
import goldenText from "./golden/dialog-beep-voices.json?raw";
import { FakeAudioContext } from "./fake-audio";
import { SoundFeature, devDialogVoice, type KeyEventLike, type Listenable } from "./feature";

// Issue 075: the dialog voice setting. `beep` must sound exactly as it did before
// the setting existed: `dialog-beep-voices.json` was recorded on main (with the
// recorder below, before the change) and the beep path is compared with it call by call.
// To record it again (only after a deliberate change to the beep): UPDATE_GOLDEN=1 npm test.
type Env = { env: Record<string, string | undefined> };
const env = (globalThis as unknown as { process?: Env }).process?.env ?? {};

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

// A repeatable "random": the same run always gets the same numbers.
function seeded(): () => number {
  let n = 12345;
  return () => {
    n = (Math.imul(n, 1103515245) + 12345) >>> 0;
    return n / 4294967296;
  };
}

interface Options {
  storage?: FakeStorage;
  dialogVoice?: "beep" | "letters";
  saved?: string;
}

function setup(options: Options = {}) {
  const ctx = new FakeAudioContext();
  const keys = new FakeKeys();
  const storage = options.storage ?? new FakeStorage();
  if (options.saved !== undefined) storage.setItem("life.sound.v1", options.saved);
  const game = new Game(parseTileMap(["#####", "#.@.#", "#####"], {}));
  // `dialogVoice` is left out of the options unless asked for, so the same
  // recorder runs on the code from before the setting existed.
  const feature = new SoundFeature(game, {
    audio: () => ctx,
    storage,
    keys,
    random: seeded(),
    tracks: [],
    start: "main",
    ...(options.dialogVoice ? { dialogVoice: options.dialogVoice } : {}),
  });
  const frame = (controls: Controls = NO_INPUT) => {
    ctx.currentTime += dt;
    game.update(dt, controls);
  };
  const run = (seconds: number, controls: Controls = NO_INPUT) => {
    for (let i = 0; i < Math.round(seconds / dt); i++) frame(controls);
  };
  const unlock = () => keys.press("KeyZ");
  return { ctx, keys, storage, game, feature, frame, run, unlock };
}

type S = ReturnType<typeof setup>;

const LONG = "It was a quiet morning in the apartment. The coffee was cold, the plant was thirsty, and the cat had opinions about both of them. Nothing was going to get done.";

// Everything the audio context was asked to make, as plain data.
function record(ctx: FakeAudioContext) {
  return {
    oscillators: ctx.oscillators.map((o) => ({
      type: o.type,
      freq: o.frequency.calls,
      start: o.startedAt,
      stop: o.stoppedAt,
    })),
    sources: ctx.sources.length,
    gains: ctx.gains.map((g) => g.gain.calls),
  };
}

// Three sample dialogs: a short line, a long text over several pages, and text
// that is skipped partway. Returns the sounds each one made, in order.
function playSamples(s: S) {
  s.unlock();
  const out: Record<string, ReturnType<typeof record>> = {};
  const take = (name: string) => {
    out[name] = record(s.ctx);
  };
  s.game.openDialog({ type: "say", text: "Hello there, this is some text to read." });
  s.run(2);
  s.game.update(dt, press);
  take("short");
  s.game.openDialog({ type: "say", text: LONG });
  for (let page = 0; page < 5 && s.game.dialogOpen; page++) {
    s.run(2.5);
    s.frame(press);
  }
  take("long");
  s.game.openDialog({ type: "say", text: LONG });
  s.run(0.3);
  s.frame(press); // skips ahead
  s.run(1);
  s.frame(press);
  s.frame(press);
  s.run(1);
  take("skipped");
  return out;
}

describe("the dialog voice setting: beep (the other option)", () => {
  it("is byte-identical to the beep recorded before the setting existed", async () => {
    const out = playSamples(setup({ dialogVoice: "beep" }));
    if (env.UPDATE_GOLDEN === "1") {
      // @ts-ignore node module, only used when asked to write files
      const fs = await import("node:fs");
      fs.writeFileSync(new URL("./golden/dialog-beep-voices.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
      return;
    }
    const golden = JSON.parse(goldenText);
    expect(out).toEqual(golden);
    // Not an empty comparison: there are blips in all three samples.
    expect(golden.short.oscillators.length).toBeGreaterThan(10);
    expect(golden.long.oscillators.length).toBeGreaterThan(golden.short.oscillators.length);
  });

  it("stays the beep when the setting is saved as beep, and when asked for beep", () => {
    const base = playSamples(setup({ dialogVoice: "beep" }));
    expect(playSamples(setup({ saved: '{"muted":false,"track":null,"payoutLeft":0,"dialogVoice":"beep"}' }))).toEqual(base);
    expect(playSamples(setup({ dialogVoice: "beep" }))).toEqual(base);
    // ...and it is the golden, not just self-consistent.
    if (env.UPDATE_GOLDEN !== "1") expect(base).toEqual(JSON.parse(goldenText));
  });
});

describe("the dialog voice setting: letters", () => {
  // The frequency each sound started at.
  const freqs = (ctx: FakeAudioContext) => ctx.oscillators.map((o) => o.frequency.calls[0].value);
  const base = SOUND.effects.mumble.voices[0] as { freq: number };

  it("plays a soft per-letter sound as text appears, with rests for spaces and marks", () => {
    const text = "Aa, e o. u";
    const s = setup({ dialogVoice: "letters" });
    s.unlock();
    s.game.openDialog({ type: "say", text: text.repeat(4) });
    s.run(2);
    const made = freqs(s.ctx);
    const every = SOUND.blipEveryChars;
    const full = text.repeat(4);
    // One slot per `every` characters; a slot on a letter sounds, on a space or mark is a rest.
    let letterSlots = 0;
    for (let k = 1; k * every <= full.length; k++) if (mumbleNotes(full[k * every - 1])[0] !== null) letterSlots++;
    expect(letterSlots).toBeGreaterThan(0);
    expect(made.length).toBe(letterSlots);
    // Each pitch is the letter's own, within the wobble.
    const wobble = SOUND.dialogLetters.wobble;
    const allowed = [...new Set(mumbleNotes(full).filter((n): n is number => n !== null))];
    for (const f of made) {
      const ratio = f / base.freq;
      expect(allowed.some((n) => Math.abs(ratio / n - 1) <= wobble + 1e-9), String(ratio)).toBe(true);
    }
  });

  it("is quiet and uses the soft effect, not the beep", () => {
    const s = setup({ dialogVoice: "letters" });
    s.unlock();
    s.game.openDialog({ type: "say", text: "Hello there, this is some text to read." });
    s.run(1.5);
    expect(s.ctx.oscillators.length).toBeGreaterThan(5);
    for (const o of s.ctx.oscillators) expect(o.type).toBe("triangle");
    // Quieter than the same letter in the flashcards' voice.
    const peak = (ctx: FakeAudioContext) => Math.max(...ctx.gains.filter((g) => g.gain.calls.length > 1).flatMap((g) => g.gain.calls.map((c) => c.value)));
    const card = setup();
    card.unlock();
    card.game.events.emit("voice", { pitch: 1 });
    expect(peak(s.ctx)).toBeGreaterThan(0);
    expect(peak(s.ctx)).toBeLessThan(peak(card.ctx));
  });

  it("is silent before the first key press, and while muted", () => {
    const s = setup({ dialogVoice: "letters" });
    s.game.openDialog({ type: "say", text: "Hello there, this is some text to read." });
    s.run(1);
    expect(s.ctx.started).toBe(0);
    s.unlock();
    s.keys.press("KeyM");
    const before = s.ctx.started;
    s.game.openDialog({ type: "say", text: "Another line of talk to read here." });
    s.run(1);
    expect(s.ctx.started).toBe(before);
  });

  it("follows the typing speed and stops when the text is all shown or the dialog closes", () => {
    const s = setup({ dialogVoice: "letters" });
    s.unlock();
    s.game.openDialog({ type: "say", text: "Hello there, this is some text to read." });
    s.run(3); // all shown, waiting
    const done = s.ctx.started;
    s.run(1);
    expect(s.ctx.started).toBe(done);
    s.frame(press); // close
    expect(s.game.dialogOpen).toBe(false);
    s.run(1);
    expect(s.ctx.started).toBe(done);
    // Slower than the characters appear: at most one sound per slot.
    const chars = "Hello there, this is some text to read.".length;
    expect(done).toBeLessThanOrEqual(Math.floor(chars / SOUND.blipEveryChars));
  });

  it("plays nothing for text that is skipped ahead", () => {
    const s = setup({ dialogVoice: "letters" });
    s.unlock();
    s.game.openDialog({ type: "say", text: LONG });
    s.frame();
    const before = s.ctx.started;
    s.frame(press); // the page appears at once
    expect(s.ctx.started).toBe(before);
  });

  it("never plays more voices than the cap", () => {
    const s = setup({ dialogVoice: "letters" });
    s.unlock();
    s.game.openDialog({ type: "say", text: LONG });
    let most = 0;
    for (let i = 0; i < 400; i++) {
      s.frame();
      most = Math.max(most, (s.feature.engine as unknown as { synth: { voices: number } }).synth.voices);
    }
    expect(most).toBeGreaterThan(0);
    expect(most).toBeLessThanOrEqual(SOUND.maxVoices - SOUND.lowReserve);
  });

  it("is the same every time with the same random numbers", () => {
    const a = playSamples(setup({ dialogVoice: "letters" }));
    const b = playSamples(setup({ dialogVoice: "letters" }));
    expect(a).toEqual(b);
    expect(a).not.toEqual(playSamples(setup({ dialogVoice: "beep" })));
  });
});

describe("saving and switching the dialog voice", () => {
  it("saves with the sound settings and loads on the next visit", () => {
    const storage = new FakeStorage();
    const s = setup({ storage });
    expect(s.feature.dialogVoice).toBe("letters");
    s.game.dialogVoice!.toggle();
    expect(s.feature.dialogVoice).toBe("beep");
    expect(JSON.parse(storage.getItem("life.sound.v1")!).dialogVoice).toBe("beep");
    expect(setup({ storage }).feature.dialogVoice).toBe("beep");
    s.game.dialogVoice!.toggle();
    expect(setup({ storage }).feature.dialogVoice).toBe("letters");
  });

  it("labels the setting for the list screen", () => {
    const s = setup();
    expect(s.game.dialogVoice!.label()).toBe("DIALOG VOICE: LETTERS");
    s.game.dialogVoice!.toggle();
    expect(s.game.dialogVoice!.label()).toBe("DIALOG VOICE: BEEP");
  });

  it("an old save without the field, or with junk, means letters; an explicit beep stays beep", () => {
    for (const saved of ['{"muted":true,"track":null,"payoutLeft":0}', '{"dialogVoice":"shout"}', '{"dialogVoice":5}', '{"dialogVoice":null}']) {
      expect(setup({ saved }).feature.dialogVoice, saved).toBe("letters");
    }
    expect(setup({ saved: '{"dialogVoice":"beep"}' }).feature.dialogVoice).toBe("beep");
    // No storage at all (private window) is letters too.
    expect(new SoundFeature(new Game(parseTileMap(["#####", "#.@.#", "#####"], {})), { audio: () => new FakeAudioContext(), storage: null, keys: new FakeKeys(), random: seeded(), tracks: [], start: "main" }).dialogVoice).toBe("letters");
  });

  it("keeps the other settings when it is switched", () => {
    const storage = new FakeStorage();
    const s = setup({ storage, saved: '{"muted":true,"track":null,"payoutLeft":3}' });
    s.game.dialogVoice!.toggle();
    expect(JSON.parse(storage.getItem("life.sound.v1")!)).toEqual({ muted: true, track: null, payoutLeft: 3, dialogVoice: "beep" });
  });

  it("the URL override applies for the visit without being saved", () => {
    const storage = new FakeStorage();
    const s = setup({ storage, dialogVoice: "beep" });
    expect(s.feature.dialogVoice).toBe("beep");
    s.feature.setMuted(true); // any save
    expect(JSON.parse(storage.getItem("life.sound.v1")!).dialogVoice).toBe("letters");
    expect(setup({ storage }).feature.dialogVoice).toBe("letters");
  });

  it("reads ?dialogvoice= only in the dev server, and only known values", () => {
    expect(devDialogVoice("?dialogvoice=letters", true)).toBe("letters");
    expect(devDialogVoice("?x=1&dialogvoice=beep", true)).toBe("beep");
    expect(devDialogVoice("?dialogvoice=letters", false)).toBeUndefined();
    expect(devDialogVoice("?dialogvoice=shout", true)).toBeUndefined();
    expect(devDialogVoice("", true)).toBeUndefined();
  });
});
