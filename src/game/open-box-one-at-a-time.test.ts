import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { APARTMENT } from "./apartment";
import { GIFT_ITEMS } from "./decor-data";
import { Game } from "./game";
import { taskSpots } from "./plan-checks";

// Issue 079: opening the box with several gifts shows them one page at a time.

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, cancelPressed: true, keys: ["Escape"] };
const TEN = GIFT_ITEMS.slice(0, 10).map((i) => i.id);

const newGame = () => new Game(APARTMENT.rooms.main, { rooms: APARTMENT.rooms, random: () => 0.5 });
const popupCount = (g: Game) => (g as unknown as { popups: { count: number } }).popups.count;
const nameOf = (g: Game, id: string) => `OPENED: ${g.decor.item(id)!.name}`;
const pageText = (g: Game) => {
  const v = g.dialogView;
  return v && v.kind === "say" ? v.lines.join(" ") : null;
};
// Runs until the page is fully showing.
function reveal(g: Game) {
  for (let i = 0; i < 2000 && !(g.dialogView?.kind === "say" && g.dialogView.waiting); i++) g.update(dt, NO_INPUT);
}
function queue(g: Game, ids: string[]) {
  for (const id of ids) expect(g.deliveries.deliver(id, 0)).toBe(true);
  g.update(dt, NO_INPUT);
}
function openBox(g: Game) {
  const spot = taskSpots(APARTMENT.rooms.main).find((s) => s.id === "collect-delivery")!;
  g.player.placeAt(spot.stand.col, spot.stand.row, spot.face);
  g.update(dt, NO_INPUT);
  expect(g.interaction.nearby?.id).toBe("collect-delivery");
  g.update(dt, press);
  g.update(dt, NO_INPUT);
}

describe("opening a box with several gifts", () => {
  it("ten items: ten pages in order, one name at a time, no popups, all owned at once", () => {
    const g = newGame();
    queue(g, TEN);
    g.state.applyEffects([{ var: "boxes", set: 0 }]);
    const before = popupCount(g);
    openBox(g);
    // Nothing is stacked over the player, and everything is already owned.
    expect(g.dialogOpen).toBe(true);
    expect(TEN.every((id) => g.decor.owns(id))).toBe(true);
    expect(popupCount(g)).toBeLessThanOrEqual(before);
    const seen: (string | null)[] = [];
    for (let n = 0; n < 10; n++) {
      reveal(g);
      seen.push(pageText(g));
      g.update(dt, press);
    }
    expect(seen).toEqual(TEN.map((id) => nameOf(g, id)));
    g.update(dt, NO_INPUT);
    expect(g.dialogOpen).toBe(false);
    expect(g.deliveries.waiting).toBe(false);
    expect(g.state.get("parcel")).toBe(0);
    expect(g.state.get("boxes")).toBe(1);
    expect(g.interaction.busy).toBe(false);
  });

  it("the task owns the controls while the pages show and ends quietly, with Enter or with Escape", () => {
    for (const how of ["finish", "escape"]) {
      const g = newGame();
      const events: string[] = [];
      for (const n of ["taskStart", "taskComplete", "taskCancelled"] as const) g.events.on(n, () => events.push(n));
      queue(g, TEN.slice(0, 3));
      const score = g.interaction.scoreboard.score;
      openBox(g);
      expect(g.interaction.busy, how).toBe(true);
      expect(g.dialogOpen, how).toBe(true);
      if (how === "finish") {
        for (let n = 0; n < 3; n++) {
          reveal(g);
          g.update(dt, press);
        }
      } else g.update(dt, esc);
      for (let i = 0; i < 5; i++) g.update(dt, NO_INPUT);
      expect(g.interaction.busy, how).toBe(false);
      expect(g.dialogOpen, how).toBe(false);
      expect(events, how).toEqual(["taskStart"]);
      expect(g.interaction.scoreboard.score, how).toBe(score);
      expect(TEN.slice(0, 3).every((id) => g.decor.owns(id)), how).toBe(true);
      expect(g.state.get("parcel"), how).toBe(0);
    }
  });

  it("Escape part way through loses nothing and leaves the controls free", () => {
    const g = newGame();
    queue(g, TEN);
    openBox(g);
    reveal(g);
    g.update(dt, press);
    reveal(g);
    g.update(dt, esc);
    for (let i = 0; i < 5; i++) g.update(dt, NO_INPUT);
    expect(g.dialogOpen).toBe(false);
    expect(g.interaction.busy).toBe(false);
    expect(TEN.every((id) => g.decor.owns(id))).toBe(true);
    expect(g.deliveries.waiting).toBe(false);
    expect(g.state.get("parcel")).toBe(0);
  });

  it("one item: one page, one press to read, one to close, no cooldown", () => {
    const g = newGame();
    queue(g, [TEN[0]]);
    openBox(g);
    reveal(g);
    expect(pageText(g)).toBe(nameOf(g, TEN[0]));
    g.update(dt, press);
    expect(g.dialogOpen).toBe(false);
    expect(g.decor.owns(TEN[0])).toBe(true);
    const item = APARTMENT.rooms.main.interactables.find((i) => i.id === "collect-delivery")!;
    expect(g.interaction.cooldownRemaining(item)).toBe(0);
  });

  it("another dialog already open: one plain line for all of them, nothing lost", () => {
    const g = newGame();
    queue(g, TEN.slice(0, 3));
    expect(g.openDialog({ type: "say", text: "Hello." })).toBe(true);
    const before = popupCount(g);
    (g as unknown as { collectDeliveries(): void }).collectDeliveries();
    expect(TEN.slice(0, 3).every((id) => g.decor.owns(id))).toBe(true);
    expect(popupCount(g) - before).toBe(1);
  });
});

describe("several arrivals at one moment", () => {
  it("a sleep skip with ten gifts due says one line, not ten", () => {
    const g = newGame();
    for (const id of TEN) g.deliveries.deliver(id, 2);
    g.update(dt, NO_INPUT);
    const before = popupCount(g);
    g.state.applyEffects([{ var: "clock", add: 6 }]);
    g.update(dt, NO_INPUT);
    expect(g.deliveries.waitingItems).toHaveLength(10);
    expect(popupCount(g) - before).toBe(1);
  });

  it("arrivals in separate calls within one frame still make one line", () => {
    const g = newGame();
    g.deliveries.deliver(TEN[0], 0);
    g.deliveries.deliver(TEN[1], 0);
    g.deliveries.advance(1);
    g.deliveries.advance(1);
    const before = popupCount(g);
    g.update(dt, NO_INPUT);
    expect(popupCount(g) - before).toBe(1);
  });
});
