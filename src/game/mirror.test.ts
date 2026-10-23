import { describe, expect, it } from "vitest";
import { NO_INPUT } from "../input/controls";
import { APARTMENT } from "./apartment";
import { MIRROR } from "./config";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";

// Issue 041: the mirror on the bathroom vanity.

const dt = 1 / 60;
const press = { ...NO_INPUT, interactPressed: true };
const rooms = APARTMENT.rooms;
const MIRRORS = ["mirror-tired", "mirror-morning", "mirror-day", "mirror-night"];

function bathGame(clock: number, energy = 80): Game {
  const game = new Game(rooms.bath, { rooms, random: () => 0.5 });
  game.state.applyEffects([{ var: "clock", set: clock }, { var: "energy", set: energy }]);
  return game;
}

function offered(game: Game): string | undefined {
  const spot = taskSpots(rooms.bath).find((s) => s.id === "mirror-day")!;
  game.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  game.update(0, NO_INPUT);
  return game.interaction.nearby?.id;
}

// Do the offered task, reading the dialog to its end.
function lookIn(game: Game): void {
  game.update(dt, press);
  for (let i = 0; i < 60 * 20 && game.interaction.busy; i++) {
    game.update(dt, game.dialogOpen && i % 20 === 0 ? press : NO_INPUT);
  }
}

describe("the bathroom mirror", () => {
  it("is on the vanity, and every variant stands at the same spot", () => {
    const spots = MIRRORS.map((id) => taskSpots(rooms.bath).find((s) => s.id === id));
    for (const s of spots) expect(s).toBeDefined();
    expect(new Set(spots.map((s) => `${s!.stand.col},${s!.stand.row},${s!.face}`)).size).toBe(1);
  });

  it("offers a variant for every hour of the day, and never falls in a gap", () => {
    for (let hour = 0; hour < 24; hour += 0.25) {
      const game = bathGame(hour);
      expect(offered(game), `hour ${hour}`).toMatch(/^mirror-(morning|day|night)$/);
    }
  });

  it("picks morning, day and night by the clock", () => {
    expect(offered(bathGame(8))).toBe("mirror-morning");
    expect(offered(bathGame(15))).toBe("mirror-day");
    expect(offered(bathGame(23))).toBe("mirror-night");
    expect(offered(bathGame(2))).toBe("mirror-night");
    expect(offered(bathGame(MIRROR.morningFrom))).toBe("mirror-morning");
    expect(offered(bathGame(MIRROR.nightFrom + 0.1))).toBe("mirror-night");
  });

  it("is the worn-out line when energy is low, at any hour", () => {
    for (const hour of [3, 8, 15, 23]) expect(offered(bathGame(hour, MIRROR.tiredBelow))).toBe("mirror-tired");
    expect(offered(bathGame(8, MIRROR.tiredBelow + 1))).toBe("mirror-morning");
  });

  it("scores points, leaves the state alone and goes on cooldown, handing the vanity to brushing teeth", () => {
    const game = bathGame(15);
    expect(offered(game)).toBe("mirror-day");
    const before = game.interaction.scoreboard.score;
    const energy = game.state.get("energy");
    lookIn(game);
    expect(game.interaction.busy).toBe(false);
    expect(game.interaction.scoreboard.score).toBeGreaterThan(before);
    // No effect of its own (energy only drains with the time that passed).
    expect(game.state.get("energy")).toBeCloseTo(energy, 0);
    expect(offered(game)).toBe("brush-teeth");
  });

  it("does not score if the dialog is backed out of", () => {
    const game = bathGame(15);
    offered(game);
    const before = game.interaction.scoreboard.score;
    game.update(dt, press);
    expect(game.dialogOpen).toBe(true);
    game.update(dt, { ...NO_INPUT, cancelPressed: true });
    for (let i = 0; i < 30; i++) game.update(dt, NO_INPUT);
    expect(game.interaction.scoreboard.score).toBe(before);
  });

  it("never lists two mirror variants in the choice cycle", () => {
    for (let hour = 0; hour < 24; hour += 0.25) {
      for (const energy of [10, 25, 26, 80]) {
        const game = bathGame(hour, energy);
        offered(game);
        const mirrors = game.interaction.choices.filter((c) => c.id.startsWith("mirror-"));
        expect(mirrors.length, `hour ${hour} energy ${energy}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("offers the worn-out variant first when it is also daytime", () => {
    expect(offered(bathGame(14, 10))).toBe("mirror-tired");
  });
});
