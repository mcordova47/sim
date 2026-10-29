import { describe, expect, it, vi } from "vitest";
import { NO_INPUT, type Controls } from "../input/controls";
import { ENCOUNTERS, REEL } from "./config";
import { Game } from "./game";
import { ReelActivity } from "./activities/reel";
import { fakeHost } from "./activities/fake-host";
import { TASKS } from "./tasks";
import { parseTileMap } from "./tilemap";
import { createMemoryReelStore } from "./reel/reel-store";
import type { ReelPic } from "./reel/reel-store";

// Issue 117f: an ad can interrupt the sofa scene's close-up (docs/photo-gallery-design.md section 6).
// Synthetic pictures only.

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
const seconds = (g: Game, s: number) => frames(g, Math.round(s * 60));
const pic = (id: number): ReelPic => ({ id, w: 48, h: 36, px: new Uint8Array(48 * 36).fill(id), palette: 1 });

// A game in the sofa scene's close-up, `hours` into the delivery clock. random 0.1 hits the 22 percent roll.
async function closeup(over: { hours?: number; random?: () => number; blocker?: boolean } = {}) {
  const reel = { store: createMemoryReelStore(), persistent: true };
  await reel.store.add([pic(1), pic(2), pic(3)]);
  const g = new Game(level(), { reel, random: over.random ?? (() => 0.1) });
  await new Promise((r) => setTimeout(r, 0));
  g.deliveries.advance(over.hours ?? 60);
  if (over.blocker) g.setAdBlocker(true);
  frames(g, 12);
  g.update(dt, press);
  g.update(dt, key("KeyE"));
  const scene = g.interaction.active!.activity as ReelActivity;
  expect(scene.inCloseup).toBe(true);
  const roll = vi.spyOn(g.encounters, "roll");
  return { g, scene, roll };
}
const adUp = (g: Game) => g.encounterScene !== null;
// Plays the entrance until the ad's menu is up.
const toMenu = (g: Game) => {
  for (let i = 0; i < 200 && !g.dialogOpen; i++) g.update(dt, NO_INPUT);
};

describe("an ad over the sofa scene's close-up", () => {
  it("starts once, adAfter seconds into the close-up, and covers the view", async () => {
    const { g, roll } = await closeup();
    seconds(g, REEL.adAfter - 0.5);
    expect(adUp(g)).toBe(false);
    expect(roll).not.toHaveBeenCalled();
    seconds(g, 1);
    expect(adUp(g)).toBe(true);
    expect(roll).toHaveBeenCalledTimes(1);
    expect(roll.mock.calls[0][0]).toMatchObject({ taskId: "scroll-photos", interrupt: true });
    expect(g.showsFullPicture).toBe(true);
    expect(g.interaction.active?.item.id).toBe("scroll-photos");
  });

  it("does not run while the browse grid is up, and the clock stays held", async () => {
    const reel = { store: createMemoryReelStore(), persistent: true };
    await reel.store.add([pic(1)]);
    const g = new Game(level(), { reel, random: () => 0.1 });
    await new Promise((r) => setTimeout(r, 0));
    g.deliveries.advance(60);
    frames(g, 12);
    g.update(dt, press);
    seconds(g, 20);
    expect(adUp(g)).toBe(false);
    g.update(dt, key("KeyE"));
    const hours = g.deliveries.hours;
    seconds(g, REEL.adAfter + 1);
    expect(adUp(g)).toBe(true);
    toMenu(g);
    seconds(g, 5);
    expect(g.deliveries.hours).toBe(hours);
  });

  it("Escape cancels only the ad: the same close-up comes back, a second Escape leaves paying nothing", async () => {
    const { g, scene, roll } = await closeup();
    const before = scene.gallery;
    const caption = scene.caption;
    const awards: number[] = [];
    g.events.on("taskComplete", ({ award }) => awards.push(award.points));
    seconds(g, REEL.adAfter + 0.1);
    expect(adUp(g)).toBe(true);
    g.update(dt, esc);
    expect(adUp(g)).toBe(false);
    expect(g.showsFullPicture).toBe(false);
    expect(g.interaction.active?.activity).toBe(scene);
    expect(scene.gallery).toBe(before);
    expect(scene.caption).toBe(caption);
    // No second ad this session, however long the close-up stays up.
    seconds(g, 60);
    expect(adUp(g)).toBe(false);
    expect(roll).toHaveBeenCalledTimes(1);
    g.update(dt, esc);
    frames(g, 3);
    expect(g.interaction.active).toBeNull();
    expect(awards).toEqual([]);
  });

  it("Escape with the ad's menu up also ends only the ad", async () => {
    const { g, scene } = await closeup();
    seconds(g, REEL.adAfter + 0.1);
    toMenu(g);
    expect(g.dialogOpen).toBe(true);
    g.update(dt, esc);
    expect(g.dialogOpen).toBe(false);
    expect(g.interaction.active?.activity).toBe(scene);
    expect(scene.inCloseup).toBe(true);
    frames(g, 5);
    expect(g.interaction.active?.activity).toBe(scene);
    g.update(dt, esc);
    frames(g, 3);
    expect(g.interaction.active).toBeNull();
  });

  it("an ad played to its end returns to the close-up, and its finishing press does not close it", async () => {
    const { g, scene } = await closeup();
    const before = scene.gallery;
    seconds(g, REEL.adAfter + 0.1);
    toMenu(g);
    // Ignore (the first entry), then the closing line, then the exit wipe: E throughout.
    for (let i = 0; i < 600 && adUp(g); i++) g.update(dt, i % 15 === 0 ? press : NO_INPUT);
    expect(adUp(g)).toBe(false);
    expect(g.interaction.active?.activity).toBe(scene);
    expect(scene.gallery).toBe(before);
    expect(scene.inCloseup).toBe(true);
    // E now finishes it as usual and pays.
    const awards: number[] = [];
    g.events.on("taskComplete", ({ award }) => awards.push(award.points));
    frames(g, 30);
    g.update(dt, key("KeyE"));
    frames(g, 3);
    expect(g.interaction.active).toBeNull();
    expect(awards).toEqual([5]);
  });

  it("the ad's first dialog ignores keys for a moment, as after a key game", async () => {
    const { g } = await closeup();
    seconds(g, REEL.adAfter + 0.1);
    const ad = (g.interaction.active!.activity as unknown as { child: { staleKeys: boolean } }).child;
    expect(ad.staleKeys).toBe(true);
  });

  it("leaving sooner than adAfter means no roll at all", async () => {
    const { g, roll } = await closeup();
    seconds(g, REEL.adAfter - 1);
    g.update(dt, key("KeyE"));
    frames(g, 3);
    expect(g.interaction.active).toBeNull();
    // Only the completion roll asked, and it does not answer for this task.
    expect(roll.mock.calls.filter((c) => c[0].interrupt === true)).toEqual([]);
    expect(adUp(g)).toBe(false);
  });

  it("a miss rolls once and never again", async () => {
    const { g, roll } = await closeup({ random: () => 0.9 });
    seconds(g, REEL.adAfter + 30);
    expect(adUp(g)).toBe(false);
    expect(roll).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the ad blocker is on", { blocker: true }],
    ["before game day 2", { hours: ENCOUNTERS.firstDay * 24 - 1 }],
  ])("nothing starts when %s", async (_n, over) => {
    const { g, scene } = await closeup(over);
    seconds(g, REEL.adAfter + 5);
    expect(adUp(g)).toBe(false);
    expect(g.interaction.active?.activity).toBe(scene);
  });

  it("nothing starts on cooldown or after two a day", async () => {
    const { g } = await closeup();
    g.encounters.begin(g.encounters.ads[0], g.deliveries.hours - 1);
    seconds(g, REEL.adAfter + 5);
    expect(adUp(g)).toBe(false);
    const again = await closeup();
    again.g.encounters.begin(again.g.encounters.ads[0], again.g.deliveries.hours - 5);
    again.g.encounters.begin(again.g.encounters.ads[1], again.g.deliveries.hours - 4);
    seconds(again.g, REEL.adAfter + 5);
    expect(adUp(again.g)).toBe(false);
  });

  it("a hit is recorded like any ad and counts toward the cooldown", async () => {
    const { g } = await closeup();
    const save = () => JSON.parse(JSON.stringify(g.encounters.toJSON()));
    expect(save().today).toBe(0);
    seconds(g, REEL.adAfter + 0.1);
    expect(save().today).toBe(1);
    expect(save().last).toBe(g.deliveries.hours);
  });

  it("finishing the scene does not roll the completion odds (interrupts are not completion tasks)", async () => {
    const { g, roll } = await closeup();
    g.update(dt, key("KeyE"));
    frames(g, 5);
    expect(g.interaction.active).toBeNull();
    expect(adUp(g)).toBe(false);
    // `maybeEncounter` asked, and the interrupt list does not answer a completion.
    for (const call of roll.mock.calls) expect(call[0].interrupt).not.toBe(true);
    expect(g.encounters.eligible({ taskId: "scroll-photos", hours: 60, random: () => 0, blocked: false, busy: false })).toBe(false);
    expect(g.encounters.eligible({ taskId: "doomscroll", hours: 60, random: () => 0, blocked: false, busy: false, interrupt: true })).toBe(false);
  });
});

describe("the scene hosts a broken ad safely", () => {
  const pics = [pic(1), pic(2)];
  const sceneWith = (ad: () => unknown) => {
    const { host } = fakeHost(3);
    const h = { ...host, reelPictures: () => pics, interruptWithAd: ad } as never;
    return new ReelActivity(h);
  };

  it("an ad that throws is dropped and the close-up is untouched", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const scene = sceneWith(() => ({ done: false, start() {}, update() { throw new Error("boom"); }, cancel() {}, draw() {} }));
    scene.start();
    scene.update(dt, key("KeyE"));
    const before = scene.gallery;
    scene.update(REEL.adAfter, NO_INPUT);
    scene.update(dt, NO_INPUT);
    expect(scene.showsPicture).toBe(false);
    expect(scene.gallery).toBe(before);
    expect(scene.done).toBe(false);
    err.mockRestore();
  });

  it("an ad that is done at once, or a missing host method, changes nothing", () => {
    const quick = sceneWith(() => ({ done: true, start() {}, update() {}, cancel() {} }));
    quick.update(dt, key("KeyE"));
    quick.update(REEL.adAfter, NO_INPUT);
    expect(quick.showsPicture).toBe(false);
    const { host } = fakeHost(3);
    const none = new ReelActivity({ ...host, reelPictures: () => pics } as never);
    none.update(dt, key("KeyE"));
    none.update(REEL.adAfter * 3, NO_INPUT);
    expect(none.showsPicture).toBe(false);
    expect(none.done).toBe(false);
  });
});
