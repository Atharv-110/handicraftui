import { beforeEach, describe, expect, it } from "vitest";
import { __resetSketchEngine, generateSketch } from "./generator";
import { quantize, QUANT } from "./cache";
import { seedFrom } from "./seed";

const geom = { shape: "rounded", width: 160, height: 44, radius: 8 } as const;

describe("generateSketch", () => {
  beforeEach(() => {
    __resetSketchEngine();
  });

  it("produces identical geometry for the same seed", async () => {
    // This is the property the whole SSR story rests on. roughViz never seeds
    // its generator, so it could not make this guarantee.
    const a = await generateSketch(geom, { seed: 42 });
    __resetSketchEngine();
    const b = await generateSketch(geom, { seed: 42 });

    expect(a.length).toBeGreaterThan(0);
    expect(a.map((p) => p.d)).toEqual(b.map((p) => p.d));
  });

  it("produces different geometry for different seeds", async () => {
    const a = await generateSketch(geom, { seed: 42 });
    const b = await generateSketch(geom, { seed: 4242 });
    expect(a[0]?.d).not.toBe(b[0]?.d);
  });

  it("derives a usable seed from a React id", async () => {
    const a = await generateSketch(geom, { seed: seedFrom("«r3»") });
    const b = await generateSketch(geom, { seed: seedFrom("«r3»") });
    expect(a[0]?.d).toBe(b[0]?.d);
  });

  it("returns nothing for a zero-area element", async () => {
    expect(await generateSketch({ shape: "rect", width: 0, height: 0 }, { seed: 1 })).toEqual([]);
  });

  it("serves sub-quantum resize deltas from cache", async () => {
    // A drag-resize emits a stream of sub-pixel widths. Regenerating for each
    // is waste, since the difference is invisible under a hand-drawn stroke.
    const a = await generateSketch({ ...geom, width: 160 }, { seed: 7 });
    const b = await generateSketch({ ...geom, width: 160.4 }, { seed: 7 });
    expect(b).toBe(a);
  });

  it("regenerates once the change exceeds the quantum", async () => {
    const a = await generateSketch({ ...geom, width: 160 }, { seed: 7 });
    const b = await generateSketch({ ...geom, width: 160 + QUANT * 2 }, { seed: 7 });
    expect(b).not.toBe(a);
  });

  it("emits extra passes when filled", async () => {
    const plain = await generateSketch(geom, { seed: 9, fillLevel: "no" });
    const filled = await generateSketch(geom, { seed: 9, fill: "#333", fillLevel: "med" });
    expect(filled.length).toBeGreaterThan(plain.length);
  });

  it("supports every shape", async () => {
    for (const shape of ["rect", "rounded", "pill", "circle", "underline"] as const) {
      const paths = await generateSketch({ shape, width: 120, height: 40 }, { seed: 5 });
      expect(paths.length, shape).toBeGreaterThan(0);
      expect(paths[0]?.d, shape).toMatch(/^M/);
    }
  });
});

describe("quantize", () => {
  it("snaps to the grid and never goes negative", () => {
    expect(quantize(160.4)).toBe(160);
    expect(quantize(161.2)).toBe(QUANT * Math.round(161.2 / QUANT));
    expect(quantize(-5)).toBe(0);
  });
});
