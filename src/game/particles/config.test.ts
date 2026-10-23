import { describe, expect, it } from "vitest";
import palette from "../../../art/palette.json";
import { APARTMENT } from "../apartment";
import { PARTICLES, PARTICLE_SHAPES, type EmitterDef } from "../config";
import { POSES } from "../poses";
import { TASKS } from "../tasks";

const names = new Set(Object.values(palette.colors as Record<string, { name: string }>).map((c) => c.name));
const pieceSprites = new Set(Object.values(APARTMENT.rooms).flatMap((l) => l.pieces.map((p) => p.sprite)));
const everyEmitter = (): { label: string; def: EmitterDef; task?: string }[] => [
  ...Object.entries(PARTICLES.taskEmitters).flatMap(([task, defs]) =>
    defs.map((def, i) => ({ label: `${task}[${i}]`, def, task })),
  ),
  ...PARTICLES.ambientEmitters.map(({ emitter }, i) => ({ label: `ambient[${i}]`, def: emitter })),
];

describe("particle settings", () => {
  it("uses only palette colors, in every kind and in the burst colors", () => {
    for (const [name, kind] of Object.entries(PARTICLES.kinds)) {
      expect(kind.colors.length, name).toBeGreaterThan(0);
      for (const c of kind.colors) expect(names.has(c), `${name}: ${c}`).toBe(true);
    }
    for (const list of PARTICLES.burst.colors) for (const c of list) expect(names.has(c), c).toBe(true);
    for (const { label, def } of everyEmitter()) if (def.color) expect(names.has(def.color), label).toBe(true);
  });

  it("describes every kind sensibly: a real shape, lifetimes and ranges the right way round", () => {
    for (const [name, kind] of Object.entries(PARTICLES.kinds)) {
      expect(PARTICLE_SHAPES[kind.shape], `${name} shape`).toBeDefined();
      expect(kind.life[0], name).toBeGreaterThan(0);
      expect(kind.life[0], name).toBeLessThanOrEqual(kind.life[1]);
      expect(kind.vx[0], name).toBeLessThanOrEqual(kind.vx[1]);
      expect(kind.vy[0], name).toBeLessThanOrEqual(kind.vy[1]);
      expect(kind.fadeFrom, name).toBeGreaterThan(0);
      expect(kind.fadeFrom, name).toBeLessThanOrEqual(1);
      expect(kind.drag, name).toBeGreaterThanOrEqual(0);
      expect(kind.drag, name).toBeLessThan(10);
    }
  });

  it("draws shapes from whole pixels only, with at least one", () => {
    for (const [name, rows] of Object.entries(PARTICLE_SHAPES)) {
      expect(rows.join("")).toMatch(/^[#.]+$/);
      expect(rows.join(""), name).toContain("#");
    }
  });

  it("points every effect at a kind that exists", () => {
    const kind = (k: string) => expect(PARTICLES.kinds[k], k).toBeDefined();
    for (const { def } of everyEmitter()) kind(def.kind);
    for (const p of Object.values(PARTICLES.step.puffs)) kind(p.kind);
    kind(PARTICLES.bump.kind);
    kind(PARTICLES.burst.kind);
    kind(PARTICLES.burst.repeat.kind);
    kind(PARTICLES.sparkle.kind);
    kind(PARTICLES.sigh.kind);
  });

  it("has ranges the right way round and a positive time between puffs", () => {
    for (const { label, def } of everyEmitter()) {
      expect(def.every[0], label).toBeGreaterThan(0);
      expect(def.every[0], label).toBeLessThanOrEqual(def.every[1]);
      if (def.count) expect(def.count[0], label).toBeLessThanOrEqual(def.count[1]);
    }
  });

  it("keys the task effects by real tasks, and a pose anchor only for a task that has that pose's piece", () => {
    const tasks = new Map(TASKS.map((t) => [t.id, t]));
    for (const { label, def, task } of everyEmitter()) {
      if (!task) continue;
      expect(tasks.has(task), label).toBe(true);
      if (def.at.from === "pose") {
        const pose = tasks.get(task)!.pose;
        expect(pose, `${label} needs a pose on the task`).toBeDefined();
        expect(pieceSprites.has(POSES[pose!].on), `${label}: the pose's piece`).toBe(true);
      }
    }
  });

  it("anchors ambient effects to something that exists", () => {
    for (const { when, emitter } of PARTICLES.ambientEmitters) {
      expect(["zone", "pose"]).not.toContain(emitter.at.from); // there is no task to hang them on
      if (emitter.at.from === "piece") expect(pieceSprites.has(emitter.at.sprite)).toBe(true);
      expect(Object.keys(when).length).toBeGreaterThan(0);
    }
  });

  it("keeps the effects of the issue's list: coffee, dishes, sleep, nap, guitar", () => {
    for (const id of ["coffee", "dishes", "sleep", "nap", "guitar"]) expect(PARTICLES.taskEmitters[id], id).toBeDefined();
    expect(PARTICLES.ambientEmitters.some((a) => a.when.music)).toBe(true);
    expect(PARTICLES.ambientEmitters.some((a) => a.when.state?.var === "mug")).toBe(true);
  });

  it("has a sane budget", () => {
    expect(PARTICLES.budget).toBeGreaterThan(50);
    expect(PARTICLES.budget).toBeLessThanOrEqual(1000);
  });
});
