import { describe, expect, it } from "vitest";
import { CAMERA, TIMESTEP } from "../game/config";
import { Camera } from "./camera";

const view = { width: 320, height: 192 };
const wide = { width: 560, height: 192 };
const dt = TIMESTEP;

function run(camera: Camera, target: { x: number; y: number }, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) camera.update(dt, target);
}

describe("Camera", () => {
  it("starts centred on the target, kept inside the world", () => {
    const camera = new Camera(wide, view);
    camera.snapTo({ x: 300, y: 100 });
    expect(camera.x).toBe(140);

    camera.snapTo({ x: 10, y: 100 });
    expect(camera.x).toBe(0);
    camera.snapTo({ x: 550, y: 100 });
    expect(camera.x).toBe(wide.width - view.width);
  });

  it("never scrolls past the edges of the world", () => {
    const camera = new Camera(wide, view);
    camera.snapTo({ x: 100, y: 100 });
    run(camera, { x: 5000, y: 100 }, 5);
    expect(camera.x).toBeLessThanOrEqual(wide.width - view.width);
    run(camera, { x: -5000, y: 100 }, 5);
    expect(camera.x).toBeGreaterThanOrEqual(0);
  });

  it("follows the target and settles with it inside the dead zone", () => {
    const camera = new Camera(wide, view);
    camera.snapTo({ x: 160, y: 96 });
    const target = { x: 330, y: 96 };
    run(camera, target, 4);
    const centre = camera.x + view.width / 2;
    expect(Math.abs(target.x - centre)).toBeLessThanOrEqual(CAMERA.deadzoneX + 0.5);
  });

  it("doesn't scroll while the target stays inside the dead zone", () => {
    const camera = new Camera(wide, view);
    camera.snapTo({ x: 300, y: 96 });
    const x = camera.x;
    run(camera, { x: 300 + CAMERA.deadzoneX - 1, y: 96 }, 2);
    expect(camera.x).toBe(x);
  });

  it("moves smoothly instead of jumping when the target does", () => {
    const camera = new Camera(wide, view);
    camera.snapTo({ x: 160, y: 96 });
    camera.update(dt, { x: 400, y: 96 });
    // One step covers only part of the distance.
    expect(camera.x).toBeGreaterThan(0);
    expect(camera.x).toBeLessThan(40);
  });

  it("feels the same at different step sizes", () => {
    const a = new Camera(wide, view);
    const b = new Camera(wide, view);
    a.snapTo({ x: 160, y: 96 });
    b.snapTo({ x: 160, y: 96 });
    for (let i = 0; i < 60; i++) a.update(1 / 60, { x: 400, y: 96 });
    for (let i = 0; i < 30; i++) b.update(1 / 30, { x: 400, y: 96 });
    expect(Math.abs(a.x - b.x)).toBeLessThan(2);
  });

  it("keeps a world that fits the view pinned at the top", () => {
    const camera = new Camera(wide, view);
    camera.snapTo({ x: 100, y: 190 });
    run(camera, { x: 100, y: 20 }, 3);
    expect(camera.y).toBe(0);
  });

  it("follows vertically when the world is taller than the view", () => {
    const camera = new Camera({ width: 320, height: 400 }, view);
    camera.snapTo({ x: 160, y: 50 });
    expect(camera.y).toBe(0);
    run(camera, { x: 160, y: 380 }, 4);
    expect(camera.y).toBeGreaterThan(150);
    expect(camera.y).toBeLessThanOrEqual(400 - view.height);
  });

  it("draws at whole pixels, interpolated between steps", () => {
    const camera = new Camera(wide, view);
    camera.snapTo({ x: 160, y: 96 });
    camera.update(dt, { x: 400, y: 96 });
    const start = camera.position(0);
    const end = camera.position(1);
    const mid = camera.position(0.5);
    expect(Number.isInteger(start.x) && Number.isInteger(mid.x) && Number.isInteger(end.x)).toBe(true);
    expect(start.x).toBeLessThanOrEqual(mid.x);
    expect(mid.x).toBeLessThanOrEqual(end.x);
    expect(end.x).toBe(Math.round(camera.x));
  });
});
