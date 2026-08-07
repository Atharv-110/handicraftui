import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetSketchEngine,
  generateSketch,
  generateSketchSync,
  generateMarkSync,
  sketchCacheStats,
  BASE_STROKE_WIDTH,
  CHALK_STROKE_WIDTH,
} from "./generator";
import { quantize, QUANT } from "./cache";
import { POOL_SIZE, seedFrom } from "./seed";
import { applyStateDelta } from "./state";
import { HANDS } from "../theme/context";

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

describe("chalk", () => {
  beforeEach(() => {
    __resetSketchEngine();
  });

  // Big enough to sit at or above TAPER_PIVOT (44), so the taper factor k is 1
  // and the stroke-width arithmetic is exactly the ratio, not a tapered
  // fraction of it.
  const bigGeom = { shape: "rect", width: 160, height: 64 } as const;

  it("keeps chalk geometry from colliding with non-chalk geometry in the frame cache", async () => {
    // generateSketchSync needs roughjs already loaded (it returns null
    // otherwise) — warm it with one async call before touching the sync path,
    // the same way useSketchFrame's own fast path assumes it has been warmed
    // by the provider.
    await generateSketch(bigGeom, { seed: 800 });

    const plain = generateSketchSync(bigGeom, { seed: 801, chalk: false });
    const chalk = generateSketchSync(bigGeom, { seed: 801, chalk: true });

    expect(plain, "tier 2 did not activate for the plain call").not.toBeNull();
    expect(chalk, "tier 2 did not activate for the chalk call").not.toBeNull();
    expect(plain!.length).toBeGreaterThan(0);
    expect(chalk!.length).toBeGreaterThan(0);

    // Reference inequality, not deep equality: the defect this guards against
    // is the second call literally hitting the first call's cache entry, in
    // which case it would come back as the exact same array object, not
    // merely one that happens to contain equal values.
    expect(chalk).not.toBe(plain);
  });

  it("adds a dust pass only under chalk, painted before every ink path", async () => {
    await generateSketch(bigGeom, { seed: 810 });

    const chalk = generateSketchSync(bigGeom, { seed: 811, chalk: true });
    const plain = generateSketchSync(bigGeom, { seed: 812, chalk: false });

    expect(chalk, "tier 2 did not activate for the chalk call").not.toBeNull();
    expect(plain, "tier 2 did not activate for the plain call").not.toBeNull();
    expect(chalk!.length).toBeGreaterThan(0);
    expect(plain!.length).toBeGreaterThan(0);

    const kinds = chalk!.map((p) => p.kind);
    const firstInk = kinds.indexOf("ink");
    const lastDust = kinds.lastIndexOf("dust");
    expect(lastDust, "no dust pass under chalk").toBeGreaterThanOrEqual(0);
    expect(firstInk, "no ink pass at all").toBeGreaterThanOrEqual(0);
    expect(lastDust, "a dust path paints after an ink path").toBeLessThan(firstInk);

    expect(plain!.some((p) => p.kind === "dust")).toBe(false);
  });

  it("raises the frame's ink stroke by exactly the CHALK_STROKE_WIDTH ratio", async () => {
    await generateSketch(bigGeom, { seed: 820 });

    // Different seeds on purpose: strokeWidth does not depend on seed (only
    // style.strokeWidth, style.chalk and the size-driven taper feed it), so
    // using distinct seeds here keeps this test's cache entries independent
    // of the cache-key test above — a cache-key regression there should not
    // also make this ratio assertion fail for an unrelated reason.
    const plain = generateSketchSync(bigGeom, { seed: 821, chalk: false });
    const chalk = generateSketchSync(bigGeom, { seed: 822, chalk: true });

    expect(plain).not.toBeNull();
    expect(chalk).not.toBeNull();

    // The dust pass also carries strokeWidth (base + 2.6) and pool paths carry
    // 0 — filtering to "ink" is what makes this comparison mean anything.
    const plainInk = plain!.filter((p) => p.kind === "ink");
    const chalkInk = chalk!.filter((p) => p.kind === "ink");
    expect(plainInk.length).toBeGreaterThan(0);
    expect(chalkInk.length).toBeGreaterThan(0);

    const ratio = chalkInk[0]!.strokeWidth / plainInk[0]!.strokeWidth;
    expect(ratio).toBeCloseTo(CHALK_STROKE_WIDTH / BASE_STROKE_WIDTH, 5);
  });

  it("keeps chalk marks from colliding with non-chalk marks in the mark cache", async () => {
    await generateSketch(bigGeom, { seed: 830 });

    const plain = generateMarkSync("check", { seed: 831, size: 24, chalk: false });
    const chalk = generateMarkSync("check", { seed: 831, size: 24, chalk: true });

    expect(plain, "generateMarkSync returned null — roughjs not loaded").not.toBeNull();
    expect(chalk, "generateMarkSync returned null — roughjs not loaded").not.toBeNull();
    expect(plain!.length).toBeGreaterThan(0);
    expect(chalk!.length).toBeGreaterThan(0);

    // Reference inequality — see the frame cache-key test above for why.
    expect(chalk).not.toBe(plain);
  });

  it("raises the mark's stroke by the same CHALK_STROKE_WIDTH ratio", async () => {
    await generateSketch(bigGeom, { seed: 840 });

    // "check" is a stroked mark (MARK_STROKES), not a filled one — a filled
    // mark would emit strokeWidth: 0 on every path and assert nothing.
    //
    // Different seeds, same reasoning as the frame version above: strokeWidth
    // does not depend on seed, so this stays independent of the mark
    // cache-key test's own mutation.
    const plain = generateMarkSync("check", { seed: 841, size: 24, chalk: false });
    const chalk = generateMarkSync("check", { seed: 842, size: 24, chalk: true });

    expect(plain).not.toBeNull();
    expect(chalk).not.toBeNull();
    expect(plain!.length).toBeGreaterThan(0);
    expect(chalk!.length).toBeGreaterThan(0);

    // The mark's base stroke is BASE_STROKE_WIDTH * 0.8, not BASE_STROKE_WIDTH
    // itself, so the ratio is the invariant here, not the absolute width.
    const ratio = chalk![0]!.strokeWidth / plain![0]!.strokeWidth;
    expect(ratio).toBeCloseTo(CHALK_STROKE_WIDTH / BASE_STROKE_WIDTH, 5);
  });
});

describe("quantize", () => {
  it("snaps to the grid and never goes negative", () => {
    expect(quantize(160.4)).toBe(160);
    expect(quantize(161.2)).toBe(QUANT * Math.round(161.2 / QUANT));
    expect(quantize(-5)).toBe(0);
  });
});

/**
 * Cycle 009. The cache's own counters, the mark key's new params dimension, and
 * the one assertion that can tell the parameter model from the seed model it
 * replaced.
 *
 * Every test here calls `__resetSketchEngine()` first: the caches are module
 * scope, so a count taken without a reset measures whatever the file above it
 * happened to generate.
 */
describe("cache instrumentation and the state parameter model", () => {
  const frameGeom = { shape: "rect", width: 160, height: 44 } as const;
  /** The resolved `natural` hand, which is what `useSketchFrame` feeds the engine. */
  const hand = { ...HANDS.natural, stroke: "var(--hc-ink)" };

  beforeEach(() => {
    __resetSketchEngine();
  });

  it("C1 — the frame cache counts a miss then a hit for the same geometry and style", async () => {
    // A rate is only interpretable if both halves are counted, and a Map cannot
    // answer "how many gets missed" after the fact. `perf-readout.tsx` reports
    // this figure live on the harness, so a hit counter that never moved would
    // read as a 0% hit rate rather than as a broken instrument.
    expect(sketchCacheStats().frame).toEqual({ hits: 0, misses: 0, entries: 0 });

    const style = { seed: seedFrom("«r1»"), ...hand };
    const first = await generateSketch(frameGeom, style);
    expect(first.length).toBeGreaterThan(0);
    expect(sketchCacheStats().frame).toEqual({ hits: 0, misses: 1, entries: 1 });

    const second = await generateSketch(frameGeom, style);
    expect(second.map((p) => p.d)).toEqual(first.map((p) => p.d));
    expect(sketchCacheStats().frame).toEqual({ hits: 1, misses: 1, entries: 1 });
  });

  it("C2 — two marks differing only in roughness are two cache entries, not one", async () => {
    // The live defect §2.2 found by reading source. `SketchMark` passes
    // `roughness` and `bowing` from the hand profile and lists both in its
    // effect's dependency array, but neither was in this key — so a warm page
    // switching `hand` re-ran the effect, hit the previous hand's entry, and
    // drew the tick in the old hand while the frame beside it drew in the new
    // one. Same shape as any state that shifts roughness on a mark-bearing
    // component.
    // `generateMarkSync` returns null until roughjs has finished loading, and
    // `__resetSketchEngine()` above deliberately drops the loaded module. One
    // awaited frame generation is what puts it back — the same warm-up the
    // chalk stroke-width test further up this file already uses.
    await generateSketch(frameGeom, { seed: 1, ...hand });

    const base = { seed: 4242, size: 24, chalk: false };
    const calm = generateMarkSync("check", { ...base, roughness: 1.0 });
    const rough = generateMarkSync("check", { ...base, roughness: 3.0 });

    expect(calm, "the mark generator did not run").not.toBeNull();
    expect(rough).not.toBeNull();
    expect(calm!.length).toBeGreaterThan(0);
    expect(rough!.map((p) => p.d)).not.toEqual(calm!.map((p) => p.d));
    expect(sketchCacheStats().mark.entries).toBe(2);
  });

  it("C3 — resetting the engine zeroes both caches, counters included", async () => {
    await generateSketch(frameGeom, { seed: seedFrom("«r1»"), ...hand });
    await generateSketch(frameGeom, { seed: seedFrom("«r1»"), ...hand });
    generateMarkSync("check", { seed: 7, size: 24, chalk: false });

    const warm = sketchCacheStats();
    expect(warm.frame.hits + warm.frame.misses).toBeGreaterThan(0);
    expect(warm.mark.entries).toBeGreaterThan(0);

    __resetSketchEngine();

    expect(sketchCacheStats()).toEqual({
      frame: { hits: 0, misses: 0, entries: 0 },
      mark: { hits: 0, misses: 0, entries: 0 },
    });
  });

  it("C4 — 500 frames cost 12 cache entries per state, not 500", async () => {
    // ROADMAP §5.2's headline claim, proven where it is deterministic and free
    // rather than by adding `rescribble` to the 500-frame stress grid, which
    // would change the conditions `perf.spec.ts`'s trend line is measured under.
    //
    // The bound is structural: every seed key resolves through `seedFrom` into
    // one of `POOL_SIZE` pool members, so distinct ids collapse onto distinct
    // seeds only up to 12. A state is a parameter shift, so it adds one more
    // full pool — never one entry per component.
    const keys = Array.from({ length: 500 }, (_, i) => `«r${i}»`);

    for (const key of keys) {
      await generateSketch(frameGeom, { seed: seedFrom(key), ...hand });
    }
    expect(sketchCacheStats().frame.entries).toBe(POOL_SIZE);

    const hovered = applyStateDelta(hand, "hover");
    for (const key of keys) {
      await generateSketch(frameGeom, { seed: seedFrom(key), ...hovered });
    }
    expect(sketchCacheStats().frame.entries).toBe(POOL_SIZE + POOL_SIZE);

    // The counters say the same thing from the other side: 1000 gets, 24 of
    // which missed. A cache that merely capped its size would show the same
    // entry count and a far worse miss count.
    const { hits, misses } = sketchCacheStats().frame;
    expect(hits + misses).toBe(1000);
    expect(misses).toBe(POOL_SIZE + POOL_SIZE);
  });

  it("C6 — a sync call before roughjs loads records neither a hit nor a miss", () => {
    // FB-4. `cache.get` increments `misses` unconditionally, and
    // `generateSketchSync` used to probe the cache *before* checking whether
    // the generator existed. On a cold page that is one counted miss per frame
    // for a lookup that could never have hit, plus a second on the same key
    // from the async fallback — so §3.11's readout printed `cache 0% (0/64)`
    // on the harness and `0% (0/1064)` under stress, every single load. The
    // counters were not wrong about the cache; they were counting something
    // that is not a cache decision.
    //
    // Behaviour-preserving by construction: an entry can only exist once a
    // generation has succeeded, so any entry implies a loaded generator, and
    // `__resetSketchEngine` clears both together. There is no state in which
    // the moved check can skip a lookup that would have hit.
    expect(sketchCacheStats().frame).toEqual({ hits: 0, misses: 0, entries: 0 });

    const cold = generateSketchSync(frameGeom, { seed: seedFrom("«r1»"), ...hand });
    expect(cold, "the generator was already loaded — this test measures the cold path").toBeNull();
    expect(sketchCacheStats().frame).toEqual({ hits: 0, misses: 0, entries: 0 });
  });

  it("C5 — hover geometry matches no pool member's default geometry", async () => {
    // This is the assertion that distinguishes the parameter model from the seed
    // model, and in this file nothing else does. Under the old model a hovered
    // frame was simply the *next pool member* drawn at rest, so its geometry was
    // by construction some default geometry — one of the twelve below. Under the
    // parameter model it is a shape no seed can produce, because the roughness
    // it was drawn at is not any hand's roughness.
    //
    // The hook-level half of the same claim is `state.test.tsx`'s H4, which is
    // where a mutation to `useSketchFrame`'s seed line gets caught; this one
    // guards the engine's side of it.
    const hovered = applyStateDelta(hand, "hover");
    const hoverPaths = await generateSketch(frameGeom, { seed: seedFrom("«r1»"), ...hovered });
    expect(hoverPaths.length, "the generator did not run").toBeGreaterThan(0);
    const hoverD = hoverPaths.map((p) => p.d).join("|");

    for (let offset = 0; offset < POOL_SIZE; offset++) {
      const atRest = await generateSketch(frameGeom, { seed: seedFrom("«r1»", offset), ...hand });
      expect(atRest.length).toBeGreaterThan(0);
      expect(
        atRest.map((p) => p.d).join("|"),
        `hover reproduced the default geometry at pool offset ${offset}`,
      ).not.toBe(hoverD);
    }
  });
});
