import { describe, expect, it } from "vitest";
import { PLAYER_SPRITES, playerFrame } from "./player-sprite";

describe("playerFrame", () => {
  it("is the idle frame for the facing direction when standing", () => {
    for (const dir of ["up", "down", "left", "right"] as const) {
      expect(playerFrame(dir, false, 0)).toEqual({ name: `player-idle-${dir}`, flip: false });
      expect(playerFrame(dir, false, 7)).toEqual({ name: `player-idle-${dir}`, flip: false });
    }
  });

  it("walks on foot 1 then foot 2, one per step", () => {
    expect(playerFrame("up", true, 0).name).toBe("player-walk-up-1");
    expect(playerFrame("up", true, 1).name).toBe("player-walk-up-2");
    expect(playerFrame("up", true, 2).name).toBe("player-walk-up-1");
  });

  it("mirrors right for left only when left is not drawn", () => {
    const noLeft = (n: string) => !n.includes("-left");
    expect(playerFrame("left", false, 0, noLeft)).toEqual({ name: "player-idle-right", flip: true });
    expect(playerFrame("left", true, 1, noLeft)).toEqual({ name: "player-walk-right-2", flip: true });
    expect(playerFrame("left", true, 1, () => true)).toEqual({ name: "player-walk-left-2", flip: false });
    // Nothing to mirror from: keep the left name, so the fallback rectangle is used.
    expect(playerFrame("left", false, 0, () => false).flip).toBe(false);
  });

  it("lists every file it can ask for: idle and two walk frames in four directions", () => {
    expect(PLAYER_SPRITES).toHaveLength(12);
    expect(new Set(PLAYER_SPRITES).size).toBe(12);
  });
});

describe("playerFrame in another outfit", () => {
  it("uses the outfit's prefix for idle and walk frames", () => {
    expect(playerFrame("down", false, 0, () => true, "player-casual").name).toBe("player-casual-idle-down");
    expect(playerFrame("up", true, 1, () => true, "player-out").name).toBe("player-out-walk-up-2");
  });

  it("mirrors the outfit's right frame for left when only that is missing", () => {
    const noLeft = (n: string) => !n.includes("-left");
    expect(playerFrame("left", false, 0, noLeft, "player-pajamas")).toEqual({ name: "player-pajamas-idle-right", flip: true });
  });

  it("draws the everyday clothes when the outfit has no art for the frame", () => {
    const homeOnly = (n: string) => !n.startsWith("player-casual");
    expect(playerFrame("right", true, 0, homeOnly, "player-casual")).toEqual({ name: "player-walk-right-1", flip: false });
  });
});
