import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { MATRIX_CELLS, nameFor, type Component } from "./matrix-grid";
import { isSnapshotEnv, SNAPSHOT_ARCH, SNAPSHOT_PLATFORM } from "./snapshot-env";

/**
 * Both measured, not inherited as a hypothesis. `W` (the worst
 * differing-pixel count across two separate container invocations of all 67
 * pairs) came back as byte identity, not merely zero, in cycle 004 both
 * before and after F1's fix: iteration 1 measured it across four separate
 * invocations of the pre-fix set, and iteration 2 re-ran the two-invocation
 * protocol on the regenerated set (26 dark baselines moved by F1, the other
 * 41 confirmed byte-identical against their pre-fix copies) and got the
 * same result. Pool seeds are fixed constants, `useId` is deterministic for
 * a fixed tree, `feTurbulence` runs at a fixed `seed={3}`, and the clip is
 * an element box rather than a full-page height, so §3.6's mechanical
 * argument held both times.
 *
 * `threshold` stays alongside it rather than at Playwright's default 0.2,
 * because at byte identity there is no differing pixel for either constant
 * to act on — `threshold: 0` costs nothing in stability here — while at 0.2
 * the pre-fix gate measurably could not see real regressions: a
 * `no`-to-`low` fill change on 9 of 10 cells, a hand swap on 6 dark cells,
 * and a complete turbulence-filter removal on 3 dark tier-1 cells all
 * passed at 0.2 and registered 275 to 2,512 differing pixels at 0.
 */
const HC_MATRIX_MAX_DIFF_PIXELS = 0;
const HC_MATRIX_THRESHOLD = 0;

/** `component`s appear once each — the seven ids the route recognises. */
const ALL_COMPONENTS = [...new Set(MATRIX_CELLS.map((c) => c.component))] as Component[];

function tally(values: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return out;
}

test.describe("matrix guards", () => {
  test("M1 — every grid component id renders its specimen, none the unknown marker", async ({
    page,
  }) => {
    for (const id of ALL_COMPONENTS) {
      await page.goto(`/matrix?c=${id}`);
      await expect(page.locator('[data-testid="hc-specimen"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="hc-specimen-unknown"]')).toHaveCount(0);
      // Fix F5, cycle 004 iteration 2, declared growth. The wrapper existing
      // is not the same claim as this test's own title — "renders its
      // specimen" — and without this a specimen returning `null` still
      // passes: the wrapper div renders unconditionally regardless of what
      // `renderSpecimen` returns. All seven specimens render an element
      // child (Button a `<button>`, Label a `<label>`, the rest a `<div>` or
      // the component's own root), so this holds for every id.
      await expect(page.locator('[data-testid="hc-specimen"] > *')).not.toHaveCount(0);
    }
  });

  test("M2 — an unknown component id renders the unknown marker naming the id", async ({
    page,
  }) => {
    await page.goto("/matrix?c=not-a-real-component");
    const marker = page.locator('[data-testid="hc-specimen-unknown"]');
    await expect(marker).toHaveCount(1);
    await expect(marker).toHaveText("not-a-real-component");
    await expect(page.locator('[data-testid="hc-specimen"]')).toHaveCount(0);
  });

  test("M3 — every specimen wrapper carries >= 14px padding on all sides; records clip area and seed", async ({
    page,
  }) => {
    for (const id of ALL_COMPONENTS) {
      await page.goto(`/matrix?c=${id}`);
      const wrapper = page.locator('[data-testid="hc-specimen"]');

      const padding = await wrapper.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          top: parseFloat(cs.paddingTop),
          right: parseFloat(cs.paddingRight),
          bottom: parseFloat(cs.paddingBottom),
          left: parseFloat(cs.paddingLeft),
        };
      });
      // The 13.81px stroke-wander floor from PRINCIPLES.md, derived in
      // cycle 004 §3.4 to 24px (`--hc-gap-frame`) but asserted here at its
      // own 14px floor so a future `p-3` fails review on the number that
      // actually matters, not on this cycle's particular token choice.
      expect(padding.top).toBeGreaterThanOrEqual(14);
      expect(padding.right).toBeGreaterThanOrEqual(14);
      expect(padding.bottom).toBeGreaterThanOrEqual(14);
      expect(padding.left).toBeGreaterThanOrEqual(14);

      const box = await wrapper.boundingBox();
      expect(box).not.toBeNull();

      const frame = wrapper.locator(".hc-frame").first();
      const seed = (await frame.count()) > 0 ? await frame.getAttribute("data-hc-seed") : null;

      // Recorded, not asserted — §4.4 measurements 1 and 3. QA reads these
      // lines to fill in the seven clip areas and seven seed values the
      // findings owe.
      console.log(
        `M3 clip: ${id} ${box!.width}x${box!.height}=${Math.round(box!.width * box!.height)}px seed=${seed ?? "n/a"}`,
      );
    }
  });

  test("M4a — the eight data-hc-cell-* keys echo the parsed state; drawOn is inert on this route", async ({
    page,
  }) => {
    await page.goto(
      "/matrix?c=button&hand=loose&dark=1&fidelity=lite&texture=0&ink=plain&sfill=high&fill=high&drawOn=1",
    );
    const main = page.locator("main");
    await expect(main).toHaveAttribute("data-hc-cell-component", "button");
    await expect(main).toHaveAttribute("data-hc-cell-hand", "loose");
    await expect(main).toHaveAttribute("data-hc-cell-ink", "plain");
    await expect(main).toHaveAttribute("data-hc-cell-fill", "high");
    await expect(main).toHaveAttribute("data-hc-cell-sfill", "high");
    await expect(main).toHaveAttribute("data-hc-cell-fidelity", "lite");
    await expect(main).toHaveAttribute("data-hc-cell-dark", "1");
    await expect(main).toHaveAttribute("data-hc-cell-texture", "off");

    // A screenshot gate cannot tolerate an animating stroke, so `drawOn` must
    // never reach this route's provider regardless of what the URL asks for.
    await expect(page.locator("[data-hc-draw]")).toHaveCount(0);
  });

  test("M4b — texture absent means on, texture=0 means off, read at fidelity=lite", async ({
    page,
  }) => {
    await page.goto("/matrix?c=button&fidelity=lite");
    const onFilter = await page
      .locator(".hc-frame")
      .first()
      .evaluate((el) => getComputedStyle(el, "::before").filter);
    expect(onFilter).not.toBe("none");

    await page.goto("/matrix?c=button&fidelity=lite&texture=0");
    const offFilter = await page
      .locator(".hc-frame")
      .first()
      .evaluate((el) => getComputedStyle(el, "::before").filter);
    expect(offFilter).toBe("none");
  });

  test("M5 — the four hands produce four distinct path sets on the button specimen", async ({
    page,
  }) => {
    const pathSets = new Set<string>();
    for (const hand of ["steady", "natural", "loose", "hurried"] as const) {
      await page.goto(`/matrix?c=button&hand=${hand}`);
      await expect(page.locator('.hc-frame:not([data-hc-fidelity="high"])')).toHaveCount(0);
      const d = await page
        .locator(".hc-sketch-svg path")
        .evaluateAll((paths) => paths.map((p) => p.getAttribute("d")).join("|"));
      pathSets.add(d);
    }
    expect(pathSets.size).toBe(4);
  });

  test("M6 — Button's own fill prop drives data-hc-fill, capped at the default ceiling", async ({
    page,
  }) => {
    // No `fill=` key here — the ceiling resolves to the provider default,
    // "med", so `sfill: "high"` is expected to clamp down to "med" and every
    // other level to pass through unchanged.
    const expected: Record<"no" | "low" | "med" | "high", string> = {
      no: "no",
      low: "low",
      med: "med",
      high: "med",
    };
    for (const sfill of ["no", "low", "med", "high"] as const) {
      await page.goto(`/matrix?c=button&sfill=${sfill}`);
      await expect(page.locator('.hc-frame:not([data-hc-fidelity="high"])')).toHaveCount(0);
      await expect(page.locator(".hc-frame")).toHaveAttribute("data-hc-fill", expected[sfill]);
    }

    // Fix F8, cycle 004 iteration 2, declared growth. The loop above proves
    // the clamp happens at the default ceiling; nothing proved it stops
    // happening once the ceiling is raised, and the 11 cells generated at
    // `sfill: "high", ceil: "high"` would all silently render "med" with
    // every guard here green — the exact class of clamp §3.3 names and this
    // test's own title claims to cover.
    await page.goto("/matrix?c=button&sfill=high&fill=high");
    await expect(page.locator('.hc-frame:not([data-hc-fidelity="high"])')).toHaveCount(0);
    await expect(page.locator(".hc-frame")).toHaveAttribute("data-hc-fill", "high");
  });

  test("M7 — the ceiling clamps: sfill=high with fill=no reads data-hc-fill=no", async ({
    page,
  }) => {
    await page.goto("/matrix?c=button&sfill=high&fill=no");
    await expect(page.locator('.hc-frame:not([data-hc-fidelity="high"])')).toHaveCount(0);
    await expect(page.locator(".hc-frame")).toHaveAttribute("data-hc-fill", "no");
  });

  test("M8 — fidelity=lite renders zero sketch SVGs and at least one frame", async ({
    page,
    hc,
  }) => {
    // Fix F3, cycle 004 iteration 2. Routed through `hc.gotoSpecimen` rather
    // than a bare `page.goto` plus this test's own assertions — the settle
    // that makes "zero sketch SVGs" a real check rather than a check that is
    // true before the thing it tests lives once in `fixtures.ts`, not here
    // and there. See that file for why a plain `toHaveCount(0)` was a false
    // green (H4, iteration 1): it resolves the instant it is true, and a
    // page that starts correct and mounts tier 2 late is correct at the
    // first poll regardless.
    await hc.gotoSpecimen({
      component: "button",
      state: "default",
      tier: "lite",
      hand: null,
      sfill: null,
      ceil: "med",
      theme: "light",
    });
    await expect(page.locator(".hc-sketch-svg")).toHaveCount(0);
    await expect(page.locator(".hc-frame")).not.toHaveCount(0);
  });

  test("M9 — the grid is exactly 67 cells with 67 unique screenshot names, matching the derived cross-checks", () => {
    expect(MATRIX_CELLS.length).toBe(67);

    // Fix F6, cycle 004 iteration 2, figure. This line cannot itself fail by
    // mutation — the test title *is* `nameFor(cell)` (below), so a colliding
    // name aborts Playwright's own collection with a duplicate-title error
    // before a single test runs. Uniqueness is enforced there; this
    // restates the intent rather than adding a reachable check, and keeping
    // it is worth more than deleting a statement of intent that enforces
    // nothing new.
    const names = new Set(MATRIX_CELLS.map(nameFor));
    expect(names.size).toBe(67);

    // Fix F6, cycle 004 iteration 2, declared growth — the second half of
    // the split. Injectivity of the on-disk filename follows from every
    // token matching this shape (lowercase ASCII sits between the
    // snapshot-path sanitizer's `\x5B-\x60` and `\x7B-\x7F` ranges, so `__`
    // is the only substring it ever rewrites, and the seven-token tuple
    // survives split on `-`) — proven by construction, not by counting. The
    // token shape is the cause; the on-disk name set is its consequence.
    // Asserting the cause fires the moment a bad `state` value is typed in a
    // future cycle (§1.1's reserved segment); asserting only the effect
    // would not fire until 67 files already existed on disk.
    for (const cell of MATRIX_CELLS) {
      for (const token of [
        cell.component,
        cell.state,
        cell.tier,
        cell.hand ?? "na",
        cell.sfill ?? "na",
        cell.ceil,
        cell.theme,
      ]) {
        expect(token).toMatch(/^[a-z]+$/);
      }
    }

    expect(tally(MATRIX_CELLS.map((c) => c.component))).toEqual({
      button: 40,
      badge: 5,
      card: 5,
      checkbox: 5,
      input: 5,
      separator: 5,
      label: 2,
    });

    expect(tally(MATRIX_CELLS.map((c) => c.tier))).toEqual({ high: 59, lite: 8 });

    expect(tally(MATRIX_CELLS.map((c) => c.theme))).toEqual({ light: 41, dark: 26 });

    const tier2Hands = MATRIX_CELLS.filter((c) => c.tier === "high").map((c) => c.hand ?? "na");
    expect(tally(tier2Hands)).toEqual({ natural: 20, steady: 13, loose: 13, hurried: 13 });
  });

  test("M11 — a tier-1 specimen publishes data-hc-fidelity=lite on every frame", async ({
    page,
  }) => {
    await page.goto("/matrix?c=button&fidelity=lite");
    await expect(page.locator(".hc-frame")).toHaveAttribute("data-hc-fidelity", "lite");
    await expect(page.locator(".hc-sketch-svg")).toHaveCount(0);
  });

  // Cycle 004a. The old rule — real baselines only ever committed from
  // inside `mcr.microsoft.com/playwright:v1.62.1-noble` — was satisfied on
  // both sides of cycle 004's first CI failure. `docker manifest inspect` on
  // that tag returns an OCI image *index* with two entries, sha256:c091b21d…
  // for linux/amd64 and sha256:941cc91e… for linux/arm64, and the daemon
  // picks by host architecture: the same tag string, two different Chromium
  // binaries. 11 of 67 cells disagreed, 146 to 874 differing pixels,
  // including two tier-1 cells that run no JavaScript at all — a
  // rasterization difference, not a code one. Every committed baseline is
  // now `linux/arm64` specifically, and this assertion is what makes that
  // fact enforced rather than only written down.
  test("M10 — baselines are compared on the architecture they were generated on", async () => {
    test.skip(!isSnapshotEnv(), "architecture only constrains the snapshot environment");
    expect(process.platform).toBe(SNAPSHOT_PLATFORM);
    expect(process.arch).toBe(SNAPSHOT_ARCH);
  });

  test("M12 — a filled tier-2 frame paints no CSS background-image, and tier 1 still does", async ({
    page,
  }) => {
    // Both directions, deliberately. The positive half alone would pass if the
    // gradient stopped rendering for some unrelated reason — the A0 lesson:
    // a guard that has never been observed to fail proves nothing about the
    // instrument. The tier-1 read is the negative control, and it is also the
    // standing check that this fix did not overshoot into tier 1, which paints
    // the lattice correctly and must keep painting it.
    for (const level of ["low", "med", "high"] as const) {
      await page.goto(`/matrix?c=badge&sfill=${level}&fill=${level}`);
      await expect(page.locator('.hc-frame:not([data-hc-fidelity="high"])')).toHaveCount(0);
      const high = await page
        .locator(".hc-frame")
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(high, `tier 2 at fill=${level}`).toBe("none");

      await page.goto(`/matrix?c=badge&sfill=${level}&fill=${level}&fidelity=lite`);
      await expect(page.locator('.hc-frame:not([data-hc-fidelity="lite"])')).toHaveCount(0);
      const lite = await page
        .locator(".hc-frame")
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(lite, `tier 1 at fill=${level}`).not.toBe("none");
    }
  });
});

test.describe("matrix screenshots", () => {
  for (const cell of MATRIX_CELLS) {
    const name = nameFor(cell);

    test(name, async ({ page, hc }) => {
      // Same gate as D-NJS (`degraded.spec.ts:116-120`, cycle 003 §2.3):
      // CoreText and FreeType hint and antialias differently, and every
      // baseline this repo commits is Linux-rendered inside the pinned
      // container. Skipped first, before navigating, so a local run does not
      // pay for 67 page loads it is going to discard anyway.
      test.skip(
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        process.env.HC_SNAPSHOT_ENV !== "docker",
        "screenshots are Docker-only, see cycle 003 §2.3",
      );

      await hc.gotoSpecimen(cell);
      await expect(page.locator('[data-testid="hc-specimen"]')).toHaveScreenshot(name, {
        maxDiffPixels: HC_MATRIX_MAX_DIFF_PIXELS,
        threshold: HC_MATRIX_THRESHOLD,
      });
    });
  }
});
