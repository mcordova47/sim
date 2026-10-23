import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { choice, menu, say } from "./dialog";
import { Game } from "./game";
import type { Level } from "./level";
import { parseTileMap } from "./tilemap";

// Spy on the world prompt and progress bar, to see when they are drawn.
vi.mock("../render/world-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../render/world-ui")>();
  return {
    ...actual,
    drawPrompt: vi.fn(),
    drawProgress: vi.fn(),
  };
});
import { drawProgress, drawPrompt } from "../render/world-ui";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };

function level(): Level {
  return {
    ...parseTileMap(["######", "#.@T.#", "######"], {
      T: {
        task: {
          id: "t",
          name: "Think",
          prompt: "Think",
          duration: 0,
          points: 1,
          dialog: menu("Hm?", [choice("Yes", say("Yes."))]),
        },
      },
    }),
    facing: "right",
  };
}

function fakeContext() {
  return new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("the world prompt and dialogs", () => {
  it("shows the prompt when facing a task, and hides it while a dialog is open", () => {
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => fakeContext() }),
    });
    const game = new Game(level());
    for (let i = 0; i < 10; i++) game.update(dt, NO_INPUT);
    game.render(fakeContext(), 1);
    expect(drawPrompt).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    game.update(dt, press); // opens the dialog
    expect(game.dialogOpen).toBe(true);
    game.render(fakeContext(), 1);
    expect(drawPrompt).not.toHaveBeenCalled();
    expect(drawProgress).not.toHaveBeenCalled();

    vi.clearAllMocks();
    game.update(dt, { ...NO_INPUT, cancelPressed: true }); // closes it
    for (let i = 0; i < 5; i++) game.update(dt, NO_INPUT);
    game.render(fakeContext(), 1);
    expect(drawPrompt).toHaveBeenCalledTimes(1);
  });
});
