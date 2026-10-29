import { describe, expect, it } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { APARTMENT } from "./apartment";
import { Game } from "./game";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";
import { createMemoryReelStore } from "./reel/reel-store";
import type { ReelPic } from "./reel/reel-store";

const dt = 1 / 60;
const press: Controls = { ...NO_INPUT, interactPressed: true };
const esc: Controls = { ...NO_INPUT, keys: ["Escape"], cancelPressed: true };
const key = (code: string): Controls => ({ ...NO_INPUT, keys: [code] });
const task = () => TASKS.find((t) => t.id === "scroll-photos")!;
const level = () => ({
  ...parseTileMap(["#########", "#.......#", "#..@X...#", "#.......#", "#########"], { X: { tasks: [task()] } }),
  facing: "right" as const,
});
const frames = (g: Game, n: number, c: Controls = NO_INPUT) => {
  for (let i = 0; i < n; i++) g.update(dt, c);
};
const pic = (id: number): ReelPic => ({ id, w: 48, h: 36, px: new Uint8Array(48 * 36).fill(id), palette: 1 });
const handle = () => ({ store: createMemoryReelStore(), persistent: true });

describe("the sofa task Scroll through photos", () => {
  it("is not in the real apartment's start-of-game state when there are no pictures", async () => {
    const g = new Game(APARTMENT.rooms[APARTMENT.start], { rooms: APARTMENT.rooms, reel: handle() });
    await Promise.resolve();
    frames(g, 5);
    expect(g.state.get("hasPhotos")).toBe(0);
    expect(task().requires).toEqual([{ var: "hasPhotos", min: 1, reason: "NO PICTURES" }]);
  });

  it("does not start with no pictures", async () => {
    const g = new Game(level(), { reel: handle(), random: () => 0.5 });
    await Promise.resolve();
    frames(g, 12);
    g.update(dt, press);
    frames(g, 5);
    expect(g.interaction.active).toBeNull();
  });

  it("plays with pictures, pays 5 and changes no mood, and ends after the pass", async () => {
    const reel = handle();
    await reel.store.add([pic(1), pic(2)]);
    const g = new Game(level(), { reel, random: () => 0.5 });
    await new Promise((r) => setTimeout(r, 0));
    frames(g, 12);
    expect(g.state.get("hasPhotos")).toBe(1);
    const awards: number[] = [];
    const moods: number[] = [];
    g.events.on("taskComplete", ({ award }) => awards.push(award.points));
    g.events.on("stateChanged", ({ id }) => id === "mood" && moods.push(1));
    g.update(dt, press);
    expect(g.interaction.active?.item.id).toBe("scroll-photos");
    // Browsing alone never pays and never ends the scene; E opens a close-up and E again leaves, paying 5.
    frames(g, 60 * 30);
    expect(g.interaction.active).not.toBeNull();
    expect(awards).toEqual([]);
    g.update(dt, key("KeyE"));
    expect(g.interaction.active).not.toBeNull();
    expect(awards).toEqual([]);
    g.update(dt, key("KeyE"));
    frames(g, 3);
    expect(g.interaction.active).toBeNull();
    expect(awards).toEqual([5]);
    expect(moods).toEqual([]);
  });

  it("Escape leaves and the game goes on", async () => {
    const reel = handle();
    await reel.store.add([pic(1)]);
    const g = new Game(level(), { reel, random: () => 0.5 });
    await new Promise((r) => setTimeout(r, 0));
    frames(g, 12);
    g.update(dt, press);
    expect(g.interaction.active).not.toBeNull();
    g.update(dt, esc);
    frames(g, 3);
    expect(g.interaction.active).toBeNull();
  });

  it("Escape from the close-up pays nothing and starts no cooldown", async () => {
    const reel = handle();
    await reel.store.add([pic(1), pic(2)]);
    const g = new Game(level(), { reel, random: () => 0.5 });
    await new Promise((r) => setTimeout(r, 0));
    frames(g, 12);
    const awards: number[] = [];
    g.events.on("taskComplete", ({ award }) => awards.push(award.points));
    g.update(dt, press);
    g.update(dt, key("KeyE"));
    g.update(dt, esc);
    frames(g, 3);
    expect(g.interaction.active).toBeNull();
    expect(awards).toEqual([]);
    // No cooldown: it can start again at once.
    g.update(dt, press);
    expect(g.interaction.active?.item.id).toBe("scroll-photos");
  });

  it("follows the store: the PHOTOS page telling the game of no pictures takes the task away at once", async () => {
    const reel = handle();
    await reel.store.add([pic(1)]);
    const g = new Game(level(), { reel });
    await new Promise((r) => setTimeout(r, 0));
    expect(g.state.get("hasPhotos")).toBe(1);
    g.photosChanged([]);
    expect(g.state.get("hasPhotos")).toBe(0);
  });
});
