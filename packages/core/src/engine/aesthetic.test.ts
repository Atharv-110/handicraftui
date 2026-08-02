import { beforeEach, describe, expect, it } from "vitest";
import {
  BASE_STROKE_WIDTH,
  capFill,
  generateSketch,
  taperForSize,
  __resetSketchEngine,
  type FillLevel,
  type SketchPath,
} from "./generator";
import { POOL_SIZE, seedFrom } from "./seed";

/**
 * These are the tests that keep the library looking hand-drawn.
 *
 * The aesthetic regressed once already, silently, because the parameters that
 * suppress it (`preserveVertices`, low roughness, no fill) are all individually
 * reasonable-looking choices. Screenshots would have caught it only if someone
 * looked. These assertions measure the geometry instead.
 */

const INSET = 0;

function points(paths: SketchPath[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const p of paths) {
    for (const m of p.d.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)) {
      out.push([Number(m[1]), Number(m[2])]);
    }
  }
  return out;
}

/** How far the drawn line strays outside the element's nominal box. */
function overshoot(paths: SketchPath[], w: number, h: number): number {
  const pts = points(paths);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return Math.max(
    INSET - Math.min(...xs),
    INSET - Math.min(...ys),
    Math.max(...xs) - w,
    Math.max(...ys) - h,
  );
}

/**
 * Largest distance between a nominal corner and the nearest point the pen
 * actually visits.
 *
 * This, not bounding-box wander, is what distinguishes a drawn box from a
 * rendered one. `preserveVertices: true` pins every corner to exactly 0.00,
 * while leaving the *edges* free to bow — so bbox overshoot is actually
 * slightly LARGER with vertices pinned (7.25px vs 6.39px measured), and using
 * it as the guard would assert the opposite of the intent.
 */
function cornerMiss(paths: SketchPath[], w: number, h: number, strokeWidth: number): number {
  const pad = strokeWidth / 2;
  const corners: Array<[number, number]> = [
    [pad, pad],
    [w - pad, pad],
    [w - pad, h - pad],
    [pad, h - pad],
  ];
  const pts = points(paths);
  return Math.max(
    ...corners.map(([cx, cy]) => Math.min(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)))),
  );
}

function commandCount(paths: SketchPath[]): number {
  return paths.reduce((n, p) => n + (p.d.match(/[MLCQAZ]/gi)?.length ?? 0), 0);
}

beforeEach(() => {
  __resetSketchEngine();
});

describe("corner overshoot", () => {
  it("does not pin the corners", async () => {
    // The single most important visual property, and the one that regressed.
    // Measured: vertices free → each corner missed by 0.6–2.0px; vertices
    // pinned → exactly 0.00 at all four. Re-enabling `preserveVertices` fails
    // here immediately.
    const paths = await generateSketch(
      { shape: "rect", width: 190, height: 52 },
      { seed: seedFrom("«r1»"), fillLevel: "no", ink: "plain" },
    );
    expect(cornerMiss(paths, 190, 52, BASE_STROKE_WIDTH)).toBeGreaterThan(0.5);
  });

  it("keeps the stroke visibly loose", async () => {
    // Separate guard, for roughness being dialled back rather than vertices
    // being pinned. Catches a different regression than the corner test.
    const paths = await generateSketch(
      { shape: "rect", width: 190, height: 52 },
      { seed: seedFrom("«r1»"), fillLevel: "no", ink: "plain" },
    );
    expect(overshoot(paths, 190, 52)).toBeGreaterThan(3);
  });
});

describe("size-aware taper", () => {
  it("is the identity at or above the pivot", () => {
    expect(taperForSize(190, 52).k).toBe(1);
    expect(taperForSize(44, 44).k).toBe(1);
  });

  it("pulls parameters back on small elements", () => {
    const small = taperForSize(20, 20);
    expect(small.k).toBeLessThan(1);
    expect(small.scaleRoughness(2.2)).toBeLessThan(2.2);
    expect(small.scaleStroke(BASE_STROKE_WIDTH)).toBeLessThan(BASE_STROKE_WIDTH);
  });

  it("keeps a checkbox-sized frame readable", async () => {
    // Untapered, roughness 2.2 on a 20×20 box makes the strokes overlap each
    // other and the shape fills in as an unreadable blob. This is the guard
    // against a future "make it rougher" change quietly destroying every
    // checkbox, radio, switch and badge on the page.
    const small = await generateSketch(
      { shape: "rect", width: 20, height: 20 },
      { seed: seedFrom("«r1»"), fillLevel: "no", ink: "plain" },
    );
    const large = await generateSketch(
      { shape: "rect", width: 190, height: 52 },
      { seed: seedFrom("«r1»"), fillLevel: "no", ink: "plain" },
    );
    expect(overshoot(small, 20, 20)).toBeLessThan(2);
    // Relative check too, so the absolute threshold above cannot be satisfied
    // by simply making everything tame.
    expect(overshoot(small, 20, 20)).toBeLessThan(overshoot(large, 190, 52) / 2);
  });

  it("never lets the stroke go hairline", () => {
    expect(taperForSize(8, 8).scaleStroke(BASE_STROKE_WIDTH)).toBeGreaterThanOrEqual(1.1);
  });
});

describe("seed pool", () => {
  it("bounds distinct geometries by the pool size", async () => {
    // 500 unique seeds cost ~110ms of generation because the cache never hits.
    // Pooling is what makes tier 2 viable as the default.
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const paths = await generateSketch(
        { shape: "rect", width: 190, height: 52 },
        { seed: seedFrom(`_R_${i.toString(32)}_`), fillLevel: "no", ink: "plain" },
      );
      seen.add(paths.map((p) => p.d).join());
    }
    expect(seen.size).toBeLessThanOrEqual(POOL_SIZE);
  });

  it("still uses most of the pool", async () => {
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(seedFrom(`_R_${i.toString(32)}_`));
    // A pool that collapses to two or three seeds would make a page of
    // components look stamped rather than drawn.
    expect(seen.size).toBeGreaterThanOrEqual(POOL_SIZE - 2);
  });

  it("offsets to a different geometry, which is what rescribble rides on", () => {
    expect(seedFrom("«r1»", 1)).not.toBe(seedFrom("«r1»"));
  });
});

describe("fill levels", () => {
  const geom = { shape: "rect", width: 190, height: 52 } as const;

  it("adds progressively more ink", async () => {
    const counts: number[] = [];
    for (const level of ["no", "low", "med", "high"] as FillLevel[]) {
      const paths = await generateSketch(geom, {
        seed: seedFrom("«r1»"),
        fill: "#333",
        fillLevel: level,
        ink: "plain",
      });
      counts.push(commandCount(paths));
    }
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]!, `level ${i} should be denser than ${i - 1}`).toBeGreaterThan(
        counts[i - 1]!,
      );
    }
  });

  it("emits nothing extra at `no`", async () => {
    const none = await generateSketch(geom, {
      seed: seedFrom("«r1»"),
      fill: "#333",
      fillLevel: "no",
      ink: "plain",
    });
    expect(none).toHaveLength(1);
  });
});

describe("capFill", () => {
  it("takes the lower of intent and ceiling", () => {
    expect(capFill("high", "low")).toBe("low");
    expect(capFill("low", "high")).toBe("low");
    expect(capFill("med", "med")).toBe("med");
  });

  it("lets a page flatten everything", () => {
    // The provider is a ceiling, not a default. Without this, a component that
    // hardcodes its level ignores the page-wide control entirely — which is
    // exactly the bug this replaced.
    for (const intent of ["no", "low", "med", "high"] as FillLevel[]) {
      expect(capFill(intent, "no")).toBe("no");
    }
  });
});

describe("layered ink", () => {
  const geom = { shape: "rect", width: 190, height: 52 } as const;

  it("adds the under-drawing and pooling passes", async () => {
    const plain = await generateSketch(geom, {
      seed: seedFrom("«r1»"),
      fillLevel: "no",
      ink: "plain",
    });
    const layered = await generateSketch(geom, {
      seed: seedFrom("«r1»"),
      fillLevel: "no",
      ink: "layered",
    });
    expect(layered.length).toBeGreaterThan(plain.length);
    // Under-drawing is a faint pass; pooling marks are filled, not stroked.
    expect(layered.some((p) => (p.opacity ?? 1) < 0.3)).toBe(true);
    expect(layered.some((p) => p.stroke === "none")).toBe(true);
  });

  it("skips pooling on shapes with no corners", async () => {
    const circle = await generateSketch(
      { shape: "circle", width: 60, height: 60 },
      { seed: seedFrom("«r1»"), fillLevel: "no", ink: "layered" },
    );
    expect(circle.every((p) => p.stroke !== "none")).toBe(true);
  });
});
