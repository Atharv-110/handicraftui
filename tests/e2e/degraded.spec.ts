import { expect } from "@playwright/test";
import { test } from "./fixtures";

/**
 * D-NJS's shared baseline tolerance. Both sides render tier 1 through the
 * identical CSS path (cycle 003 §3.2's whole point — a script-disabled
 * browser can only ever reach tier 1), so this is a same-tier comparison, not
 * the cross-tier one `tier-parity.spec.ts`'s P3 attempted and was removed for
 * (§15.4 — `preserveVertices: false` makes tier 1 and tier 2 strokes
 * deliberately non-coincident, which has no bearing here since both sides of
 * this comparison are tier 1). Measured inside the pinned container: 0.01
 * (1207 pixels), from a 1px full-page height difference (1280x2010 vs
 * 1280x2011) between the two navigations, not from any visible rendering
 * gap. Rounded up to the next 0.01.
 *
 * Deliberately not the instrument for stroke presence. `::after` is a
 * second, offset, rotated pass at partial opacity, so losing `::before`'s
 * border alone dilutes a page-wide diff to roughly 1%, under this tolerance
 * — the two numbers were derived from unrelated things and happened to land
 * close enough that one could mask the other. The `frameChecks` block below
 * reads `border-style` and `border-width` on both passes directly instead.
 */
const NO_JS_MAX_DIFF_PIXEL_RATIO = 0.02;

/**
 * Degraded modes — cycle 003 §3.2.
 *
 * Converts `TESTING.md` §8's three manual DevTools steps and §5's no-JS
 * walkthrough into four specs.
 *
 * `page.evaluate` was confirmed empirically to work in a context created with
 * `javaScriptEnabled: false` — Playwright drives it over CDP's `Runtime`
 * domain, which is a separate channel from the page's own script execution
 * flag, so Playwright's automation is never subject to the same restriction
 * the page's own `<script>` tags are. Recorded here as fact rather than left
 * as the brief's open question: a probe run against this exact server
 * returned a `.hc-frame` locator count of 31 and a `page.evaluate` count of
 * 31 in the same no-JS context, in agreement. D-NJS below uses this to check
 * that a filled frame's hachure actually painted, not only that the attribute
 * that should produce one is present.
 */
test.describe("degraded modes", () => {
  test("D-NJS — tier 1 renders complete, hachured frames with JavaScript disabled", async ({
    browser,
    page,
  }) => {
    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto("/");

    const noJsFrames = noJsPage.locator(".hc-frame");
    const noJsCount = await noJsFrames.count();

    // The comparison page carries JavaScript but is pinned to `fidelity=lite`,
    // so both sides render tier 1 — the only tier a script-disabled browser
    // can ever reach. Comparing frame counts this way never hard-codes 31 or
    // 32 (cycle 003 §0), so 002a's merge cannot desync this assertion from
    // reality.
    await page.goto("/?fidelity=lite");
    const liteCount = await page.locator(".hc-frame").count();

    expect(noJsCount).toBe(liteCount);
    expect(noJsCount).toBeGreaterThan(0);

    await expect(noJsPage.locator(".hc-sketch-svg")).toHaveCount(0);

    for (let i = 0; i < noJsCount; i++) {
      const frame = noJsFrames.nth(i);
      await expect(frame).toHaveAttribute("data-hc-seed", /^\d+$/);
      await expect(frame).toHaveAttribute("data-hc-fill", /^(no|low|med|high)$/);
    }

    // Every frame whose fill is not "no" actually paints a hachure gradient,
    // not merely carries the attribute the CSS selector keys off. This is
    // the "complete, hachured frames" claim from `TESTING.md` §5, checked
    // directly rather than inferred from the attribute alone.
    //
    // Both stroke passes, checked directly rather than left to the screenshot.
    // The screenshot cannot carry this: `::after` is a second, offset, rotated
    // pass at partial opacity, so removing `::before`'s border still leaves a
    // visible outline on every frame and the page differs by roughly 1% of its
    // pixels — under the tolerance above, which was derived from an unrelated
    // 1px full-page height jitter. Two numbers chosen without reference to each
    // other happened to land close enough that one absorbed the other. Width is
    // non-zero rather than an exact figure because `[data-hc-weight="strong"]`
    // overrides it, so `2.4px` would be wrong for a subset of frames.
    const frameChecks = await noJsFrames.evaluateAll((frames) =>
      frames.map((el) => ({
        fill: el.getAttribute("data-hc-fill"),
        backgroundImage: getComputedStyle(el).backgroundImage,
        beforeStyle: getComputedStyle(el, "::before").borderStyle,
        beforeWidth: getComputedStyle(el, "::before").borderTopWidth,
        afterStyle: getComputedStyle(el, "::after").borderStyle,
        afterWidth: getComputedStyle(el, "::after").borderTopWidth,
      })),
    );
    for (const check of frameChecks) {
      if (check.fill !== "no") {
        expect(check.backgroundImage).not.toBe("none");
      }
      expect(check.beforeStyle).not.toBe("none");
      expect(check.afterStyle).not.toBe("none");
      expect(parseFloat(check.beforeWidth)).toBeGreaterThan(0);
      expect(parseFloat(check.afterWidth)).toBeGreaterThan(0);
    }

    // Screenshots are Docker-only (cycle 003 §2.3) — CoreText and FreeType
    // hint and antialias differently, and this repo's committed baselines are
    // all Linux-rendered. The DOM assertions above already ran for real on
    // whatever platform this test executes on; only the pixel comparison
    // needs the pinned container.
    // `tests/e2e/**` is deliberately outside every turbo task (cycle 003
    // §1 — the whole reason Playwright lives at the repo root), so this
    // variable never affects a cached turbo hash the way a task-scoped env
    // read would.
    test.skip(
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      process.env.HC_SNAPSHOT_ENV !== "docker",
      "screenshots are Docker-only, see cycle 003 §2.3",
    );
    await expect(noJsPage).toHaveScreenshot("no-js-vs-lite.png", {
      fullPage: true,
      maxDiffPixelRatio: NO_JS_MAX_DIFF_PIXEL_RATIO,
    });
    await expect(page).toHaveScreenshot("no-js-vs-lite.png", {
      fullPage: true,
      maxDiffPixelRatio: NO_JS_MAX_DIFF_PIXEL_RATIO,
    });

    await noJsContext.close();
  });

  test("D-FC — forced-colors hides both stroke passes and the sketch SVG", async ({ page, hc }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await hc.goto({});

    const frameChecks = await page.locator(".hc-frame").evaluateAll((frames) =>
      frames.map((el) => ({
        before: getComputedStyle(el, "::before").display,
        after: getComputedStyle(el, "::after").display,
        borderTopWidth: getComputedStyle(el).borderTopWidth,
      })),
    );
    expect(frameChecks.length).toBeGreaterThan(0);
    for (const check of frameChecks) {
      expect(check.before).toBe("none");
      expect(check.after).toBe("none");
      // The forced-colors fallback is a single plain `1px solid ButtonBorder`
      // border — two near-identical pseudo-element borders a fraction of a
      // degree apart is noise in this mode, not charm (`handicraft.css`'s own
      // comment on the block this reads).
      expect(check.borderTopWidth).toBe("1px");
    }

    const svgDisplays = await page
      .locator(".hc-sketch-svg")
      .evaluateAll((svgs) => svgs.map((el) => getComputedStyle(el).display));
    expect(svgDisplays.length).toBeGreaterThan(0);
    for (const display of svgDisplays) {
      expect(display).toBe("none");
    }

    const liftShadows = await page
      .locator(".hc-lift")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).boxShadow));
    expect(liftShadows.length).toBeGreaterThan(0);
    for (const shadow of liftShadows) {
      expect(shadow).toBe("none");
    }
  });

  test("D-RM — reduced motion resets the draw-on entrance instead of freezing it hidden", async ({
    page,
    hc,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await hc.goto({ drawOn: true });

    const paths = page.locator(".hc-sketch-svg[data-hc-draw] path");
    await expect(paths.first()).toBeAttached();

    const results = await paths.evaluateAll((els) =>
      els.map((el) => {
        const cs = getComputedStyle(el);
        return {
          animationName: cs.animationName,
          strokeDasharray: cs.strokeDasharray,
          strokeDashoffset: cs.strokeDashoffset,
          opacity: cs.opacity,
        };
      }),
    );
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.animationName).toBe("none");
      expect(r.strokeDasharray).toBe("none");
      // The dash has to be reset alongside the animation, or every stroke
      // stays frozen at its hidden start value and the frame never appears
      // at all — the failure `handicraft.css`'s own comment on this block
      // warns about. (d) below is the assertion that would catch exactly
      // that: kept only because it has a real mutation (changing the
      // `opacity: revert-layer !important` fallback to `opacity: 0
      // !important`), not because it is decoration.
      expect(r.strokeDashoffset).toBe("0px");
      expect(Number(r.opacity)).toBeGreaterThan(0);
    }
  });

  test("D-PR — print drops the second stroke pass, the SVG, lift shadows and paper textures", async ({
    page,
    hc,
  }) => {
    await page.emulateMedia({ media: "print" });
    await hc.goto({});

    const svgDisplays = await page
      .locator(".hc-sketch-svg")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).display));
    expect(svgDisplays.length).toBeGreaterThan(0);
    for (const display of svgDisplays) {
      expect(display).toBe("none");
    }

    const frameChecks = await page.locator(".hc-frame").evaluateAll((els) =>
      els.map((el) => ({
        after: getComputedStyle(el, "::after").display,
        beforeBorderColor: getComputedStyle(el, "::before").borderColor,
      })),
    );
    expect(frameChecks.length).toBeGreaterThan(0);
    for (const check of frameChecks) {
      expect(check.after).toBe("none");
      expect(check.beforeBorderColor).toBe("rgb(0, 0, 0)");
    }

    const liftShadows = await page
      .locator(".hc-lift")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).boxShadow));
    expect(liftShadows.length).toBeGreaterThan(0);
    for (const shadow of liftShadows) {
      expect(shadow).toBe("none");
    }

    const textureBackgrounds = await page
      .locator(".hc-ruled, .hc-grid")
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundImage));
    expect(textureBackgrounds.length).toBeGreaterThan(0);
    for (const bg of textureBackgrounds) {
      expect(bg).toBe("none");
    }
  });
});
