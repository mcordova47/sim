import { describe, expect, it } from "vitest";
import { DIALOG } from "../game/config";
import { Game } from "../game/game";
import type { Interactable } from "../game/interactable";
import type { Level } from "../game/level";
import { parseTileMap } from "../game/tilemap";
import { readControls, type Controls } from "./controls";
import { Keyboard } from "./keyboard";
import { dpadDirection, TOUCH, TOUCH_KEYS, TouchPad, touchLayerVisible, type KeySink } from "./touch";

// A stand-in for window: the sink raises events on it and the real Keyboard listens.
class FakeWindow {
  private fns = new Map<string, Array<(e: any) => void>>();
  addEventListener(type: string, fn: (e: any) => void) {
    this.fns.set(type, [...(this.fns.get(type) ?? []), fn]);
  }
  fire(type: string, event: object) {
    for (const fn of this.fns.get(type) ?? []) fn({ repeat: false, preventDefault() {}, ...event });
  }
}

interface Raised {
  type: "down" | "up";
  code: string;
  shift: boolean;
}

function rig() {
  const win = new FakeWindow();
  const keyboard = new Keyboard(win as unknown as Window);
  const raised: Raised[] = [];
  const sink: KeySink = {
    down: (code, shift) => {
      raised.push({ type: "down", code, shift });
      win.fire("keydown", { code, shiftKey: shift });
    },
    up: (code, shift) => {
      raised.push({ type: "up", code, shift });
      win.fire("keyup", { code, shiftKey: shift });
    },
  };
  const pad = new TouchPad(sink);
  // One game update's worth: read the controls, then end the frame as main.ts does.
  const frame = (): Controls => {
    const controls = readControls(keyboard);
    keyboard.endFrame();
    pad.afterFrame();
    return controls;
  };
  return { win, keyboard, pad, raised, frame };
}

describe("buttons send the keyboard's codes", () => {
  it("A is E, B is Escape, L and M are KeyL and KeyM, a quick tap on the cycle button is Tab", () => {
    const { pad, frame } = rig();
    const cases: Array<[Parameters<TouchPad["pressControl"]>[1], string]> = [
      ["a", "KeyE"],
      ["b", "Escape"],
      ["list", "KeyL"],
      ["mute", "KeyM"],
    ];
    for (const [control, code] of cases) {
      pad.pressControl(1, control);
      const down = frame();
      expect(down.keys).toEqual([code]);
      expect(down.keysDown).toEqual([code]);
      pad.releasePointer(1);
      expect(frame().keysReleased).toEqual([code]);
    }
    pad.pressControl(1, "cycle");
    frame();
    pad.releasePointer(1);
    const tab = frame();
    expect(tab.keys).toEqual(["Tab"]);
    expect(tab.keysDown.includes("ShiftLeft")).toBe(false);
  });

  it("gives interactPressed and cancelPressed once per tap", () => {
    const { pad, frame } = rig();
    pad.pressControl(1, "a");
    expect(frame().interactPressed).toBe(true);
    expect(frame().interactPressed).toBe(false);
    pad.releasePointer(1);
    frame();
    pad.pressControl(1, "b");
    expect(frame().cancelPressed).toBe(true);
    expect(frame().cancelPressed).toBe(false);
  });

  it("a tap that goes down and up between two updates still counts", () => {
    const { pad, frame } = rig();
    pad.pressControl(1, "a");
    pad.releasePointer(1);
    const c = frame();
    expect(c.interactPressed).toBe(true);
    // The held-back release arrives after that update.
    expect(frame().keysReleased).toEqual(["KeyE"]);
    expect(pad.held()).toEqual([]);
  });

  it("a menu tap on the d-pad is one dirPressed, a hold is dir every frame", () => {
    const { pad, frame } = rig();
    pad.padMove(1, "down");
    pad.releasePointer(1);
    const tap = frame();
    expect(tap.dirPressed).toBe("down");
    expect(tap.dir).toBe("down");
    expect(frame().dir).toBe(null);
    pad.padMove(2, "left");
    const a = frame();
    const b = frame();
    const c = frame();
    expect([a.dir, b.dir, c.dir]).toEqual(["left", "left", "left"]);
    expect([a.dirPressed, b.dirPressed, c.dirPressed]).toEqual(["left", null, null]);
  });
});

describe("d-pad geometry", () => {
  it("picks a direction in each quadrant and nothing in the dead zone", () => {
    expect(dpadDirection(0, -50, 150)).toBe("up");
    expect(dpadDirection(0, 50, 150)).toBe("down");
    expect(dpadDirection(-50, 0, 150)).toBe("left");
    expect(dpadDirection(50, 0, 150)).toBe("right");
    expect(dpadDirection(30, -50, 150)).toBe("up");
    expect(dpadDirection(50, 30, 150)).toBe("right");
    expect(dpadDirection(0, 0, 150)).toBe(null);
    expect(dpadDirection(5, -5, 150)).toBe(null);
    // The edge between two zones goes to the vertical, never both.
    expect(dpadDirection(40, 40, 150)).toBe("down");
  });

  it("sliding from left to up lets go of left and presses up, never both down", () => {
    const { pad, raised, frame } = rig();
    pad.padMove(1, "left");
    frame();
    pad.padMove(1, "up");
    expect(raised.map((r) => `${r.type}:${r.code}`)).toEqual(["down:KeyA", "up:KeyA", "down:KeyW"]);
    const c = frame();
    expect(c.dir).toBe("up");
    expect(c.keysDown).toEqual(["KeyW"]);
    // Into the dead zone: nothing held; back on the pad: pressed again.
    pad.padMove(1, null);
    expect(frame().dir).toBe(null);
    pad.padMove(1, "right");
    expect(frame().dir).toBe("right");
  });

  it("a second finger on the pad is ignored", () => {
    const { pad, frame } = rig();
    pad.padMove(1, "left");
    pad.padMove(2, "up");
    expect(frame().keysDown).toEqual(["KeyA"]);
    pad.releasePointer(2);
    expect(frame().keysDown).toEqual(["KeyA"]);
    pad.releasePointer(1);
    frame();
    expect(frame().keysDown).toEqual([]);
  });
});

describe("the cycle button's long press", () => {
  const framesToLong = Math.ceil(TOUCH.longPressMs / TOUCH.frameMs);

  it("holds Shift for a frame before Tab, so Shift is down when Tab is read, then lets both go", () => {
    const { pad, raised, frame } = rig();
    pad.pressControl(1, "cycle");
    const reads: Controls[] = [];
    for (let i = 0; i < framesToLong + 6; i++) reads.push(frame());
    // Nothing is sent until the press is long, and then Shift comes before Tab.
    const down = raised.filter((r) => r.type === "down");
    expect(down.map((r) => r.code)).toEqual(["ShiftLeft", "Tab"]);
    expect(down.every((r) => r.shift)).toBe(true);
    const tabFrame = reads.find((c) => c.keys.includes("Tab"))!;
    expect(tabFrame.keysDown).toContain("ShiftLeft");
    expect(reads.findIndex((c) => c.keysDown.includes("ShiftLeft"))).toBeLessThan(reads.indexOf(tabFrame));
    pad.releasePointer(1);
    const after = [frame(), frame(), frame()];
    expect(after.flatMap((c) => c.keysReleased).sort()).toEqual(["ShiftLeft", "Tab"]);
    expect(pad.held()).toEqual([]);
    // Tab was let go no later than Shift.
    const ups = raised.filter((r) => r.type === "up").map((r) => r.code);
    expect(ups).toEqual(["Tab", "ShiftLeft"]);
  });

  it("lifting just after Shift went down still sends Tab and then lets both go", () => {
    const { pad, frame, raised } = rig();
    pad.pressControl(1, "cycle");
    for (let i = 0; i < framesToLong; i++) frame();
    expect(raised.some((r) => r.code === "ShiftLeft")).toBe(true);
    pad.releasePointer(1);
    const reads = [frame(), frame(), frame(), frame()];
    expect(reads.some((c) => c.keys.includes("Tab") && c.keysDown.includes("ShiftLeft"))).toBe(true);
    expect(pad.held()).toEqual([]);
  });

  it("a short press is a plain Tab with no Shift", () => {
    const { pad, frame, raised } = rig();
    pad.pressControl(1, "cycle");
    for (let i = 0; i < framesToLong - 3; i++) frame();
    pad.releasePointer(1);
    for (let i = 0; i < 4; i++) frame();
    expect(raised.map((r) => `${r.type}:${r.code}:${r.shift}`)).toEqual(["down:Tab:false", "up:Tab:false"]);
  });
});

describe("review fixes", () => {
  const framesToLong = Math.ceil(TOUCH.longPressMs / TOUCH.frameMs);
  it("pressing CHOICE again right after a long press cannot leave Shift down", () => {
    for (const gap of [0, 1, 2, 3]) {
      const { pad, frame } = rig();
      pad.pressControl(1, "cycle");
      for (let i = 0; i < framesToLong + 3; i++) frame();
      pad.releasePointer(1);
      for (let i = 0; i < gap; i++) frame();
      pad.pressControl(1, "cycle");
      pad.releasePointer(1);
      for (let i = 0; i < 10; i++) frame();
      expect(pad.held()).toEqual([]);
    }
  });
  it("sliding the pad within one update never leaves two directions down", () => {
    const { pad, frame, keyboard } = rig();
    pad.padMove(1, "left");
    pad.padMove(1, "up");
    expect(keyboard.heldKeys()).toEqual(["KeyW"]);
    expect(frame().dir).toBe("up");
  });
});

describe("letting go", () => {
  const holdEverything = (pad: TouchPad, frame: () => Controls) => {
    pad.padMove(1, "right");
    pad.pressControl(2, "a");
    pad.pressControl(3, "cycle");
    for (let i = 0; i < 40; i++) frame();
    expect(pad.held().length).toBeGreaterThan(2);
  };

  it("pointercancel on a finger lets go of just its keys", () => {
    const { pad, frame } = rig();
    pad.padMove(1, "right");
    pad.pressControl(2, "a");
    frame();
    pad.releasePointer(1);
    frame();
    const c = frame();
    expect(c.keysDown).toEqual(["KeyE"]);
  });

  it("blur or a hidden page (releaseAll) leaves nothing held and reports each release once", () => {
    const { pad, frame, keyboard } = rig();
    holdEverything(pad, frame);
    pad.releaseAll();
    expect(keyboard.heldKeys()).toEqual([]);
    const released = frame().keysReleased;
    expect(released.length).toBe(new Set(released).size);
    expect(released).toEqual(expect.arrayContaining(["KeyD", "KeyE", "ShiftLeft"]));
    expect(frame().keysReleased).toEqual([]);
    // A late pointerup for a finger that was let go of does nothing.
    pad.releasePointer(1);
    pad.releasePointer(2);
    expect(frame().keysReleased).toEqual([]);
    expect(pad.held()).toEqual([]);
  });

  it("two fingers on the same button press it once and need both lifted", () => {
    const { pad, raised, frame } = rig();
    pad.pressControl(1, "a");
    pad.pressControl(2, "a");
    expect(raised.filter((r) => r.type === "down").length).toBe(1);
    frame();
    pad.releasePointer(1);
    expect(frame().keysDown).toEqual(["KeyE"]);
    pad.releasePointer(2);
    frame();
    expect(frame().keysDown).toEqual([]);
  });

  it("fingers on the pad and a button are independent", () => {
    const { pad, frame } = rig();
    pad.padMove(1, "up");
    pad.pressControl(2, "a");
    const c = frame();
    expect(c.keysDown.sort()).toEqual(["KeyE", "KeyW"]);
    pad.releasePointer(2);
    frame();
    expect(frame().keysDown).toEqual(["KeyW"]);
  });
});

describe("when the touch layer shows", () => {
  const base = { coarse: true, maxTouchPoints: 5, sawRealKey: false };
  it("follows the touch screen, a real key hides it, ?touch overrides", () => {
    expect(touchLayerVisible(base)).toBe(true);
    expect(touchLayerVisible({ ...base, coarse: false })).toBe(false);
    expect(touchLayerVisible({ ...base, maxTouchPoints: 0 })).toBe(false);
    expect(touchLayerVisible({ ...base, sawRealKey: true })).toBe(false);
    expect(touchLayerVisible({ coarse: false, maxTouchPoints: 0, sawRealKey: false })).toBe(false);
    expect(touchLayerVisible({ coarse: false, maxTouchPoints: 0, sawRealKey: false, override: true })).toBe(true);
    expect(touchLayerVisible({ ...base, sawRealKey: true, override: true })).toBe(true);
    expect(touchLayerVisible({ ...base, override: false })).toBe(false);
  });
});

// The 081 stray-key gates, with the touch layer as the source of keys.
describe("stray keys with touch input", () => {
  const dt = 1 / 60;
  const notes: Omit<Interactable, "zones"> = {
    id: "notes", name: "Practice", prompt: "Practice", duration: 1, points: 10, activity: { type: "notes", count: 1 },
  };
  const typing: Omit<Interactable, "zones"> = {
    id: "work", name: "Answer emails", prompt: "Work", duration: 1, points: 10,
    activity: { type: "typing", lines: 1, text: ["ab"] },
  };
  const room = (task: Omit<Interactable, "zones">): Level => ({
    ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [task] } }),
    facing: "right",
  });
  const step = (game: Game, r: ReturnType<typeof rig>) => game.update(dt, r.frame());

  it("a pad direction still held after the notes game does not walk the player until released", () => {
    const game = new Game(room(notes), { random: () => 0.5 });
    const r = rig();
    step(game, r);
    r.pad.pressControl(1, "a");
    step(game, r);
    r.pad.releasePointer(1);
    step(game, r);
    expect(game.interaction.busy).toBe(true);
    const col = game.player.col;
    r.pad.padMove(2, "left");
    for (let i = 0; i < 300 && game.interaction.busy; i++) step(game, r);
    expect(game.interaction.busy).toBe(false);
    for (let i = 0; i < 60; i++) step(game, r);
    expect(game.player.col).toBe(col);
    // Lifted for a frame, then walking works.
    r.pad.releasePointer(2);
    step(game, r);
    step(game, r);
    r.pad.padMove(3, "left");
    for (let i = 0; i < 40; i++) step(game, r);
    expect(game.player.col).toBeLessThan(col);
  });

  it("holding the pad walks the player a tile or more", () => {
    const game = new Game(room(notes), { random: () => 0.5 });
    const r = rig();
    const col = game.player.col;
    r.pad.padMove(1, "left");
    for (let i = 0; i < 40; i++) step(game, r);
    expect(game.player.col).toBeLessThan(col);
  });

  it("A taps count as typing keys and end the typing game; the next menu is gated by them", () => {
    const game = new Game(room(typing), { random: () => 0.5 });
    const r = rig();
    step(game, r);
    const tap = () => {
      r.pad.pressControl(1, "a");
      step(game, r);
      r.pad.releasePointer(1);
      step(game, r);
    };
    tap();
    expect(game.interaction.busy).toBe(true);
    for (let i = 0; i < 8 && game.interaction.busy; i++) tap();
    expect(game.interaction.busy).toBe(false);
  });

  it("a lost pointerup is let go by the cancel path, so the gate does not wait its full cap", () => {
    const game = new Game(room(notes), { random: () => 0.5 });
    const r = rig();
    step(game, r);
    r.pad.padMove(1, "left");
    r.pad.pressControl(2, "a");
    step(game, r);
    r.pad.releasePointer(2);
    step(game, r);
    expect(game.interaction.busy).toBe(true);
    const col = game.player.col;
    for (let i = 0; i < 300 && game.interaction.busy; i++) step(game, r);
    // Still held (the pointerup never came): the player does not walk, and the gate is waiting.
    for (let i = 0; i < 30; i++) step(game, r);
    expect(game.player.col).toBe(col);
    // The page goes away (blur / hidden): everything is let go at once, so the gate opens.
    r.pad.releaseAll();
    step(game, r);
    r.pad.padMove(5, "left");
    let frames = 0;
    for (; frames < 60 && game.player.col >= col; frames++) step(game, r);
    // Well inside the cap: only the step itself took time.
    expect(frames * dt).toBeLessThan(DIALOG.gateMaxSeconds - 0.5);
    expect(game.player.col).toBeLessThan(col);
  });
});

describe("keys raised by the layer carry the keyboard's codes", () => {
  it("the table matches the keyboard bindings", () => {
    expect(TOUCH_KEYS.dir).toEqual({ up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" });
  });
});
