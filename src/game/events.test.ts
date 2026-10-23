import { afterEach, describe, expect, it, vi } from "vitest";
import { Emitter } from "./events";

interface Events {
  ping: { n: number };
  pong: { text: string };
}

afterEach(() => vi.restoreAllMocks());

describe("Emitter", () => {
  it("calls listeners for the event they asked for, with the payload", () => {
    const e = new Emitter<Events>();
    const pings: number[] = [];
    const pongs: string[] = [];
    e.on("ping", (p) => pings.push(p.n));
    e.on("pong", (p) => pongs.push(p.text));
    e.emit("ping", { n: 1 });
    e.emit("ping", { n: 2 });
    e.emit("pong", { text: "hi" });
    expect(pings).toEqual([1, 2]);
    expect(pongs).toEqual(["hi"]);
  });

  it("calls listeners in the order they were added", () => {
    const e = new Emitter<Events>();
    const order: string[] = [];
    e.on("ping", () => order.push("a"));
    e.on("ping", () => order.push("b"));
    e.emit("ping", { n: 0 });
    expect(order).toEqual(["a", "b"]);
  });

  it("stops calling a listener once it is unsubscribed", () => {
    const e = new Emitter<Events>();
    const seen: number[] = [];
    const off = e.on("ping", (p) => seen.push(p.n));
    e.emit("ping", { n: 1 });
    off();
    off(); // removing twice is harmless
    e.emit("ping", { n: 2 });
    expect(seen).toEqual([1]);
  });

  it("lets a listener unsubscribe itself, or another, while being called", () => {
    const e = new Emitter<Events>();
    const seen: string[] = [];
    const offA = e.on("ping", () => {
      seen.push("a");
      offA();
    });
    e.on("ping", () => seen.push("b"));
    e.emit("ping", { n: 0 });
    e.emit("ping", { n: 0 });
    expect(seen).toEqual(["a", "b", "b"]);
  });

  it("keeps going when a listener throws", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const e = new Emitter<Events>();
    const seen: number[] = [];
    e.on("ping", () => {
      throw new Error("broken feature");
    });
    e.on("ping", (p) => seen.push(p.n));
    expect(() => e.emit("ping", { n: 7 })).not.toThrow();
    expect(seen).toEqual([7]);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("does nothing when nobody is listening", () => {
    expect(() => new Emitter<Events>().emit("pong", { text: "x" })).not.toThrow();
  });
});
