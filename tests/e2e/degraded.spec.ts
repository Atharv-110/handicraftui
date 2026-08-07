import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { isSnapshotEnv, SNAPSHOT_ARCH, SNAPSHOT_PLATFORM } from "./snapshot-env";

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

  // Cycle 004a. `matrix.spec.ts`'s M10 covers the `visual` project; D-NJS
  // above is a committed baseline living in the `e2e` project instead, and a
  // guard that only lived in `visual` would leave exactly this one
  // cross-architecture screenshot uncovered — the same incompleteness this
  // cycle exists to fix, one file over. Shares `snapshot-env.ts`'s constants
  // with M10 rather than repeating them, so the two guards can never drift
  // apart.
  test("D-ARCH — baselines are compared on the architecture they were generated on", async () => {
    test.skip(!isSnapshotEnv(), "architecture only constrains the snapshot environment");
    expect(process.platform).toBe(SNAPSHOT_PLATFORM);
    expect(process.arch).toBe(SNAPSHOT_ARCH);
  });

  test("D-FID — the server publishes the resolved tier, and only when it is resolved", async ({
    browser,
  }) => {
    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();

    // Default fidelity is "high", so on the server the answer is genuinely not
    // known yet — rough.js has not run and may never run. The attribute stays
    // off. Publishing "lite" here would describe what is painting and would
    // make every wait built on the marker true one frame too early.
    await noJsPage.goto("/");
    await expect(noJsPage.locator(".hc-frame")).not.toHaveCount(0);
    await expect(noJsPage.locator(".hc-frame[data-hc-fidelity]")).toHaveCount(0);

    // Pinned to lite, the answer is final before a single byte of script runs,
    // and that is exactly what makes the fixture's wait a state read rather
    // than a race.
    await noJsPage.goto("/?fidelity=lite");
    const frames = noJsPage.locator(".hc-frame");
    const count = await frames.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(frames.nth(i)).toHaveAttribute("data-hc-fidelity", "lite");
    }

    await noJsContext.close();
  });

  test("D-STATE — tier-1 disabled and error render correctly with JavaScript disabled", async ({
    browser,
  }) => {
    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();

    await noJsPage.goto("/matrix?c=button&state=disabled&sfill=low");
    const disabledCheck = await noJsPage
      .locator(".hc-frame")
      .first()
      .evaluate((el) => ({
        beforeStyle: getComputedStyle(el, "::before").borderStyle,
        afterStyle: getComputedStyle(el, "::after").borderStyle,
        backgroundImage: getComputedStyle(el).backgroundImage,
      }));
    expect(disabledCheck.beforeStyle).toBe("dashed");
    expect(disabledCheck.afterStyle).toBe("dashed");
    expect(disabledCheck.backgroundImage).not.toBe("none");

    await noJsPage.goto("/matrix?c=input&state=error");
    const errorCheck = await noJsPage
      .locator(".hc-frame")
      .first()
      .evaluate((el) => ({
        beforeWidth: getComputedStyle(el, "::before").borderTopWidth,
        afterWidth: getComputedStyle(el, "::after").borderTopWidth,
        beforeColor: getComputedStyle(el, "::before").borderTopColor,
        afterColor: getComputedStyle(el, "::after").borderTopColor,
      }));
    // --hc-stroke-w-strong resolves to 3px in light mode — the same computed
    // value degraded.spec.ts's own D-NJS test already reasons about for the
    // unrelated [data-hc-weight="strong"] rule.
    expect(errorCheck.beforeWidth).toBe("3px");
    expect(errorCheck.afterWidth).toBe("3px");

    // Read via a probe element rather than the raw custom-property text, so
    // this compares the actual resolved colour a border paints with — the
    // same colour --hc-danger-ink resolves to anywhere else it is used.
    const dangerRgb = await noJsPage.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.color = "var(--hc-danger-ink)";
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      return rgb;
    });
    expect(errorCheck.beforeColor).toBe(dangerRgb);
    expect(errorCheck.afterColor).toBe(dangerRgb);

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

  test("D-MOT — reduced motion zeroes the four animatable state-motion tokens", async ({
    page,
    hc,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await hc.goto({});

    // Read through a probe's own transition-duration rather than the raw
    // custom-property text, since three of the four tokens (mark, popup,
    // boil-step) have no shipped consumer yet this cycle — this is the only
    // way to observe what they resolve to as an actual CSS <time>, serialized
    // in seconds the way a real animation-duration or transition-duration
    // would be.
    const durations = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.transitionProperty = "opacity";
      document.body.appendChild(probe);
      const read = (token: string) => {
        probe.style.transitionDuration = `var(${token})`;
        return getComputedStyle(probe).transitionDuration;
      };
      const out = {
        mark: read("--hc-motion-mark"),
        state: read("--hc-motion-state"),
        popup: read("--hc-motion-popup"),
        boilStep: read("--hc-motion-boil-step"),
      };
      probe.remove();
      return out;
    });
    expect(durations.mark).toBe("0s");
    expect(durations.state).toBe("0s");
    expect(durations.popup).toBe("0s");
    expect(durations.boilStep).toBe("0s");
  });

  test("D-STAGGER — draw-on delay values compose additively with each pass's own timeline fraction", async ({
    page,
    hc,
  }) => {
    await hc.goto({ drawOn: true });

    // The harness's "Buttons — variants" group, in source order, carrying
    // harness.tsx's drawDelay={0, 120, 240, 360, 480}. The first entry is the
    // positive case for "a frame with no drawDelay computes exactly the
    // fraction" — 0 added to a fraction is the fraction. "Cancel" is the
    // `ghost` variant, whose FILL_LEVELS entry is "no" — compose() never runs
    // a fill pass at all when fillLevel is "no", so that one button carries
    // no `data-hc-kind="fill"` path and is checked on the other three passes.
    const group: Array<{ name: string; delayMs: number; kinds: readonly string[] }> = [
      { name: "Save changes", delayMs: 0, kinds: ["under", "ink", "fill", "pool"] },
      { name: "Publish", delayMs: 120, kinds: ["under", "ink", "fill", "pool"] },
      { name: "Delete", delayMs: 240, kinds: ["under", "ink", "fill", "pool"] },
      { name: "Cancel", delayMs: 360, kinds: ["under", "ink", "pool"] },
      { name: "Disabled", delayMs: 480, kinds: ["under", "ink", "fill", "pool"] },
    ];
    // Fractions read from handicraft.css's own draw-on timeline comment.
    const fractions: Record<string, number> = { under: 0, ink: 0.26, fill: 0.55, pool: 0.88 };
    const durationMs = 1100; // HandicraftConfig's own default drawOnDuration.

    for (const { name, delayMs, kinds } of group) {
      const button = page.getByRole("button", { name });
      for (const kind of kinds) {
        const path = button.locator(`path[data-hc-kind="${kind}"]`).first();
        const computed = await path.evaluate((el) => getComputedStyle(el).animationDelay);
        const expected = (delayMs + fractions[kind]! * durationMs) / 1000;
        expect(parseFloat(computed), `${name} — ${kind}`).toBeCloseTo(expected, 2);
      }
    }
  });

  test("D-DELAY — a delayed frame stays fully visible under reduced motion, no invisible window", async ({
    page,
    hc,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await hc.goto({ drawOn: true });

    // "Disabled" carries the group's largest delay (480ms) — the frame most
    // likely to expose a window if the reduced-motion reset ever missed the
    // delay term, since `animation: none !important` is a shorthand that
    // resets animation-delay to its initial 0s along with everything else.
    const button = page.getByRole("button", { name: "Disabled" });
    const paths = button.locator(".hc-sketch-svg[data-hc-draw] path");
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
