import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { MATRIX_CELLS, nameFor, type Component } from "./matrix-grid";

/**
 * §3.6's starting hypothesis, not a measured constant. Inside one pinned
 * image the pool seeds are fixed, `useId` is deterministic for a fixed tree,
 * `feTurbulence` runs at a fixed `seed={3}`, and the clip is an element box
 * rather than a full-page height — the one jitter cycle 003 measured (D-NJS,
 * ~1px of full-page height across separate container invocations) has no
 * mechanism on a fixed-size element clip. That is an inference, not a
 * measurement: QA executes the two-invocation protocol §3.6 pre-registers
 * and fixes the real constant. This value ships as the hypothesis it is.
 */
const HC_MATRIX_MAX_DIFF_PIXELS = 0;

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
  });

  test("M7 — the ceiling clamps: sfill=high with fill=no reads data-hc-fill=no", async ({
    page,
  }) => {
    await page.goto("/matrix?c=button&sfill=high&fill=no");
    await expect(page.locator('.hc-frame:not([data-hc-fidelity="high"])')).toHaveCount(0);
    await expect(page.locator(".hc-frame")).toHaveAttribute("data-hc-fill", "no");
  });

  test("M8 — fidelity=lite renders zero sketch SVGs and at least one frame", async ({ page }) => {
    await page.goto("/matrix?c=button&fidelity=lite");
    await expect(page.locator(".hc-sketch-svg")).toHaveCount(0);
    await expect(page.locator(".hc-frame")).not.toHaveCount(0);
  });

  test("M9 — the grid is exactly 67 cells with 67 unique screenshot names, matching the derived cross-checks", () => {
    expect(MATRIX_CELLS.length).toBe(67);

    const names = new Set(MATRIX_CELLS.map(nameFor));
    expect(names.size).toBe(67);

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
      });
    });
  }
});
