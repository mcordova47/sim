import { describe, expect, it, vi } from "vitest";
import { SOUND } from "../config";
import { FakeAudioContext } from "./fake-audio";
import { SoundEngine } from "./engine";

describe("SoundEngine", () => {
  it("makes no audio until unlock, and plays nothing before it", () => {
    const factory = vi.fn(() => new FakeAudioContext());
    const engine = new SoundEngine(factory);
    engine.play("bump");
    engine.update();
    expect(factory).not.toHaveBeenCalled();
    expect(engine.ready).toBe(false);
  });

  it("creates the context once on unlock and resumes it", () => {
    const ctx = new FakeAudioContext();
    const factory = vi.fn(() => ctx);
    const engine = new SoundEngine(factory);
    engine.unlock();
    engine.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(ctx.resumed).toBe(1);
    expect(engine.ready).toBe(true);
    engine.play("bump");
    expect(ctx.oscillators.length + ctx.sources.length).toBeGreaterThan(0);
  });

  it("tries to resume again on a later key press if the browser kept it suspended", () => {
    const ctx = new FakeAudioContext();
    ctx.resume = () => {
      ctx.resumed++;
      return Promise.resolve();
    };
    const engine = new SoundEngine(() => ctx);
    engine.unlock();
    engine.unlock();
    expect(ctx.resumed).toBe(2);
  });

  it("never throws or logs when there is no AudioContext", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const engine = new SoundEngine(() => null);
    expect(() => {
      engine.unlock();
      engine.play("bump");
      engine.update();
    }).not.toThrow();
    expect(engine.unavailable).toBe(true);
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    log.mockRestore();
    warn.mockRestore();
  });

  it("never throws when making the context throws, and does not try again", () => {
    const factory = vi.fn(() => {
      throw new Error("blocked");
    });
    const engine = new SoundEngine(factory);
    expect(() => {
      engine.unlock();
      engine.unlock();
      engine.play("bump");
    }).not.toThrow();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(engine.ready).toBe(false);
  });

  it("survives a context whose resume rejects or throws", () => {
    const ctx = new FakeAudioContext();
    ctx.resume = () => Promise.reject(new Error("no"));
    const engine = new SoundEngine(() => ctx);
    expect(() => engine.unlock()).not.toThrow();
    ctx.resume = () => {
      throw new Error("no");
    };
    expect(() => engine.unlock()).not.toThrow();
  });

  it("survives a context that fails while playing", () => {
    const ctx = new FakeAudioContext();
    const engine = new SoundEngine(() => ctx);
    engine.unlock();
    ctx.createOscillator = () => {
      throw new Error("boom");
    };
    expect(() => engine.play("taskComplete")).not.toThrow();
  });

  it("ignores an unknown effect name", () => {
    const ctx = new FakeAudioContext();
    const engine = new SoundEngine(() => ctx);
    engine.unlock();
    const before = ctx.started;
    engine.play("nope");
    expect(ctx.started).toBe(before);
  });

  it("plays nothing while muted, even if muted before audio started", () => {
    const ctx = new FakeAudioContext();
    const engine = new SoundEngine(() => ctx);
    engine.muted = true;
    engine.unlock();
    engine.play("bump");
    expect(ctx.started).toBe(0);
    expect(ctx.gains[0].gain.calls.at(-1)).toMatchObject({ value: 0 });
    engine.muted = false;
    engine.play("bump");
    expect(ctx.started).toBeGreaterThan(0);
    expect(ctx.gains[0].gain.calls.at(-1)).toMatchObject({ value: SOUND.master });
  });

  it("every effect in the config can play without error", () => {
    const ctx = new FakeAudioContext();
    const engine = new SoundEngine(() => ctx);
    engine.unlock();
    for (const name of Object.keys(SOUND.effects)) {
      ctx.currentTime += 5;
      const before = ctx.started;
      engine.play(name);
      expect(ctx.started, name).toBeGreaterThan(before);
    }
  });
});
