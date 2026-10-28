import { afterEach, describe, expect, it, vi } from "vitest";
import { drawText } from "../render/font";
import { setTouchHints } from "../render/hints";
import { Hud, stopHintAt } from "../render/hud";
import { drawPrompt } from "../render/world-ui";
import { textWidth } from "../render/font";
import { Game } from "../game/game";
import type { Interactable } from "../game/interactable";
import type { Level } from "../game/level";
import { parseTileMap } from "../game/tilemap";
import { NO_INPUT } from "./controls";
import { pointToGame, targetAt, type TapTarget } from "./tap";

vi.mock("../render/font", async (original) => ({ ...(await original<typeof import("../render/font")>()), drawText: vi.fn() }));

afterEach(() => setTouchHints(false));

describe("pointToGame", () => {
  const rect = { left: 10, top: 20, width: 640, height: 384 };
  const view = { width: 320, height: 192 };
  it("maps a point on the canvas to game pixels, at any scale", () => {
    expect(pointToGame(10, 20, rect, view)).toEqual({ x: 0, y: 0 });
    expect(pointToGame(330, 212, rect, view)).toEqual({ x: 160, y: 96 });
    // The narrow view: the same canvas shows a taller picture.
    expect(pointToGame(330, 212, rect, { width: 320, height: 256 })).toEqual({ x: 160, y: 128 });
  });
  it("is null outside the picture or for an empty canvas", () => {
    expect(pointToGame(9, 100, rect, view)).toBeNull();
    expect(pointToGame(650, 100, rect, view)).toBeNull();
    expect(pointToGame(100, 405, rect, view)).toBeNull();
    expect(pointToGame(5, 5, { left: 0, top: 0, width: 0, height: 0 }, view)).toBeNull();
  });
});

describe("targetAt", () => {
  const run = () => {};
  const a: TapTarget = { x: 0, y: 0, w: 100, h: 100, run };
  const b: TapTarget = { x: 50, y: 50, w: 20, h: 20, run };
  it("finds the one drawn last under the point, and none outside every target", () => {
    expect(targetAt([a, b], 60, 60)).toBe(b);
    expect(targetAt([a, b], 10, 10)).toBe(a);
    expect(targetAt([a, b], 100, 100)).toBeNull();
    expect(targetAt([], 1, 1)).toBeNull();
  });
});

const item: Interactable = { id: "t", name: "Task", prompt: "Make coffee", duration: 1, points: 1, zones: [] };
const ctx = { fillRect: () => {}, fillStyle: "" } as unknown as CanvasRenderingContext2D;
const drawn = () => vi.mocked(drawText).mock.calls.map((c) => c[1]);

describe("the in-world prompt and the stop hint follow the controls", () => {
  it("the prompt's key cap says E on the desktop and A on touch, live", () => {
    vi.mocked(drawText).mockClear();
    drawPrompt(ctx, { x: 100, y: 100, w: 10, h: 10 }, item, 0, { width: 320, height: 192 });
    expect(drawn()).toContain("E");
    setTouchHints(true);
    vi.mocked(drawText).mockClear();
    drawPrompt(ctx, { x: 100, y: 100, w: 10, h: 10 }, item, 0, { width: 320, height: 192 });
    expect(drawn()).toContain("A");
    expect(drawn()).not.toContain("E");
    setTouchHints(false);
    vi.mocked(drawText).mockClear();
    drawPrompt(ctx, { x: 100, y: 100, w: 10, h: 10 }, item, 0, { width: 320, height: 192 });
    expect(drawn()).toContain("E");
  });

  it("the stop hint says B TO STOP on touch and still fits where it is put", () => {
    setTouchHints(true);
    vi.mocked(drawText).mockClear();
    new Hud().drawStopHint(ctx);
    expect(drawn()).toEqual(["B TO STOP"]);
    for (const width of [320, 320, 280]) {
      const [cx] = stopHintAt({ width });
      expect(cx - textWidth("B TO STOP") / 2).toBeGreaterThanOrEqual(0);
    }
  });
});

// The whole path in a game: a flashcards task, the touch layer's taps, and the text field.
describe("a game running the flashcards task", () => {
  const task: Omit<Interactable, "zones"> = { id: "cards", name: "Study", prompt: "Study Spanish", duration: 1, points: 0, activity: { type: "flashcards" } };
  const level: Level = {
    ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [task] } }),
    facing: "right",
  };
  const E = { ...NO_INPUT, interactPressed: true, keys: ["KeyE"] };

  it("taps the choice screen into the key screen, which wants text; the game hands the text to the screen", () => {
    setTouchHints(true);
    const game = new Game(level, { random: () => 0.5 });
    game.update(1 / 60, NO_INPUT);
    game.update(1 / 60, E);
    expect(game.interaction.busy).toBe(true);
    // The choice screen has no text field yet; its rows are buttons.
    expect(game.wantsText).toBe(false);
    const targets = game.tapTargets();
    expect(targets.length).toBe(2);
    const second = targets[1];
    expect(game.tapAt(second.x + 4, second.y + 4)).toBe(true);
    game.update(1 / 60, NO_INPUT);
    expect(game.wantsText).toBe(true);
    game.setText("abc");
    expect(game.textValue()).toBe("abc");
    // Escape (B) leaves the activity, and the text field goes with it.
    game.update(1 / 60, { ...NO_INPUT, keys: ["Escape"], cancelPressed: true });
    expect(game.interaction.busy).toBe(false);
    expect(game.wantsText).toBe(false);
    expect(game.textValue()).toBe("");
    game.setText("ignored");
    expect(game.tapTargets()).toEqual([]);
  });
});
