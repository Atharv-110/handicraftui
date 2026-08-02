import { beforeEach, describe, expect, it } from "vitest";
import { generateMark, __resetSketchEngine } from "./generator";
import { FILLED_MARKS, MARK_STROKES, markRotation, type MarkName } from "./marks";
import { seedFrom } from "./seed";

const ALL_MARKS = Object.keys(MARK_STROKES) as MarkName[];

beforeEach(() => {
  __resetSketchEngine();
});

describe("marks", () => {
  it("renders every mark at every real component size", async () => {
    // 12px is the smallest a mark appears at (a badge indicator); 32 is the
    // largest (a button icon). Validated legible across that whole range, so
    // the range is what gets tested.
    for (const name of ALL_MARKS) {
      for (const size of [12, 16, 20, 24, 32]) {
        const paths = await generateMark(name, { seed: seedFrom(name), size });
        expect(paths.length, `${name} @ ${size}`).toBeGreaterThan(0);
        expect(paths[0]!.d, `${name} @ ${size}`).toMatch(/^M/);
      }
    }
  });

  it("draws multi-stroke marks as separate pen strokes", async () => {
    // A cross is two strokes, not one polyline — drawing it as a connected path
    // would put a visible joining line through the middle.
    const cross = await generateMark("cross", { seed: 5, size: 20 });
    const dash = await generateMark("dash", { seed: 5, size: 20 });
    expect(cross.length).toBeGreaterThan(dash.length);
  });

  it("fills the marks that are solid rather than drawn", async () => {
    for (const name of FILLED_MARKS) {
      const paths = await generateMark(name, { seed: 5, size: 16 });
      expect(paths.every((p) => p.stroke === "none")).toBe(true);
    }
  });

  it("keeps geometry inside a sane bound of the box", async () => {
    // Marks sit inside frames, so a mark that wandered far outside its own box
    // would collide with the frame around it.
    //
    // Stroked marks only: filled marks are emitted as arcs, whose parameters
    // are *relative* deltas rather than absolute points, and the coordinate
    // scan below would read `a4.2 4.2 0 1 0 -8.4 0` as a point at y=-8.4.
    for (const name of ALL_MARKS.filter((n) => !FILLED_MARKS.has(n))) {
      const size = 20;
      const paths = await generateMark(name, { seed: seedFrom(name), size });
      for (const p of paths) {
        for (const m of p.d.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)) {
          expect(Number(m[1]), `${name} x`).toBeGreaterThan(-size * 0.35);
          expect(Number(m[1]), `${name} x`).toBeLessThan(size * 1.35);
          expect(Number(m[2]), `${name} y`).toBeGreaterThan(-size * 0.35);
          expect(Number(m[2]), `${name} y`).toBeLessThan(size * 1.35);
        }
      }
    }
  });

  it("is deterministic for a given seed", async () => {
    const a = await generateMark("check", { seed: 11, size: 18 });
    __resetSketchEngine();
    const b = await generateMark("check", { seed: 11, size: 18 });
    expect(a.map((p) => p.d)).toEqual(b.map((p) => p.d));
  });

  it("rotates directional marks to the four quarters", () => {
    expect(markRotation("right")).toBe(0);
    expect(markRotation("down")).toBe(90);
    expect(markRotation("left")).toBe(180);
    expect(markRotation("up")).toBe(270);
  });

  it("samples circle-around densely enough not to read as a polygon", () => {
    // rough.js bows the segments *between* vertices, so a circle built from too
    // few points stays visibly angular however rough the line is.
    expect(MARK_STROKES["circle-around"][0]!.length).toBeGreaterThanOrEqual(12);
  });
});
