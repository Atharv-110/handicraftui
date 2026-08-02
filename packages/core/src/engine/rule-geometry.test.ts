import { beforeEach, describe, expect, it } from "vitest";
import { __resetSketchEngine, generateSketch, taperForSize, BASE_STROKE_WIDTH } from "./generator";

/**
 * Reads the drawing, not the code that made it. Every coordinate pair in an
 * SVG path `d` string is pulled out with a regex and reduced to a bounding
 * span — this is what lets A1/A2 tell a real vertical rule apart from the
 * near-zero degenerate the pre-fix `underline` arm produced on a box taller
 * than it is wide.
 */
function span(d: string) {
  const nums = d.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    xs.push(nums[i]!);
    ys.push(nums[i + 1]!);
  }
  return {
    spanX: Math.max(...xs) - Math.min(...xs),
    spanY: Math.max(...ys) - Math.min(...ys),
  };
}

describe("underline axis branch — rule-geometry", () => {
  beforeEach(() => {
    __resetSketchEngine();
  });

  it("A1: a 700x2 rule spans horizontally, at least 5x wider than tall", async () => {
    // Measured at baseline e9eda22 (before the axis branch existed, where this
    // was the only arm): 699.19 x 1.68, ratio ~416. Threshold set well inside
    // that so run-to-run wobble never reads as a regression.
    const paths = await generateSketch({ shape: "underline", width: 700, height: 2 }, { seed: 42 });
    const ink = paths.find((p) => p.kind === "ink");
    expect(ink, "no ink pass produced").toBeDefined();
    const { spanX, spanY } = span(ink!.d);
    expect(spanX).toBeGreaterThanOrEqual(5 * spanY);
  });

  it("A2: a 2x200 rule spans vertically, at least 5x taller than wide", async () => {
    // Measured on the fixed engine: 2.40 x 200.13, ratio ~83.5. Measured
    // independently against the engine still at baseline e9eda22 (single
    // horizontal expression, no axis branch): 0.277 x 0.032 — the line ran
    // backwards and collapsed to a dot, because `w - pad` (1.124) landed left
    // of `pad` (0.876) once the stroke was wider than the 2px box.
    const paths = await generateSketch({ shape: "underline", width: 2, height: 200 }, { seed: 42 });
    const ink = paths.find((p) => p.kind === "ink");
    expect(ink, "no ink pass produced").toBeDefined();
    const { spanX, spanY } = span(ink!.d);
    expect(spanY).toBeGreaterThanOrEqual(5 * spanX);
  });

  it("A3: separator ink stroke is 1.752 to 3 decimals, at both orientations", async () => {
    const horiz = await generateSketch({ shape: "underline", width: 700, height: 2 }, { seed: 1 });
    const vert = await generateSketch({ shape: "underline", width: 2, height: 200 }, { seed: 2 });
    const horizInk = horiz.find((p) => p.kind === "ink");
    const vertInk = vert.find((p) => p.kind === "ink");
    expect(horizInk).toBeDefined();
    expect(vertInk).toBeDefined();

    // The literal, from section 1's arithmetic: max(1.1, 2.4 * (0.55 + 0.45 * 0.4)).
    expect(horizInk!.strokeWidth).toBeCloseTo(1.752, 3);
    expect(vertInk!.strokeWidth).toBeCloseTo(1.752, 3);

    // Cross-check against taperForSize's own return, so a taper drift and a
    // literal drift show up as two separate failures rather than one absorbing
    // the other.
    expect(taperForSize(700, 2).scaleStroke(BASE_STROKE_WIDTH)).toBeCloseTo(1.752, 3);
    expect(taperForSize(2, 200).scaleStroke(BASE_STROKE_WIDTH)).toBeCloseTo(1.752, 3);
  });

  it("A4: taper k is exactly 0.4 at both orientations — orientation never moves it", () => {
    expect(taperForSize(700, 2).k).toBe(0.4);
    expect(taperForSize(2, 200).k).toBe(0.4);
  });

  it("A5: underline at fillLevel high with no fill colour emits zero fill paths", async () => {
    // The obvious form of this assertion is false: supplying a fillColor DOES
    // produce one degenerate fill pass (strokeWidth 0.001, stroke/fill "none")
    // even on an open line, because rough.js still runs the hachure pass and
    // simply draws nothing with it. The invariant Separator relies on is the
    // missing colour, not the fill level, so that is what this asserts.
    const paths = await generateSketch(
      { shape: "underline", width: 700, height: 2 },
      { seed: 3, fillLevel: "high" },
    );
    expect(paths.map((p) => p.kind)).toEqual(["under", "ink"]);
    expect(paths.some((p) => p.kind === "fill")).toBe(false);
  });

  it("A6: underline emits zero pool paths at 700x60, where k=1 and pooling would otherwise fire", async () => {
    expect(taperForSize(700, 60).k).toBe(1);
    const underline = await generateSketch(
      { shape: "underline", width: 700, height: 60 },
      { seed: 4, ink: "layered" },
    );
    expect(underline.some((p) => p.kind === "pool")).toBe(false);

    // Control: a rect at the identical size and ink DOES pool, proving the
    // exclusion is underline-specific rather than an artefact of this size.
    const rect = await generateSketch(
      { shape: "rect", width: 700, height: 60 },
      { seed: 4, ink: "layered" },
    );
    expect(rect.some((p) => p.kind === "pool")).toBe(true);
  });
});
