import { expect, test } from "@playwright/test";

/**
 * The landing — cycle 012, added under the founder's own ruling (§7 of
 * `012-landing-shell.md`, 2026-08-08) against the architect's brief, which
 * had recommended shipping the landing with zero Playwright coverage.
 *
 * `landing.spec.ts` joins the existing `e2e` project's `testMatch` array
 * rather than becoming a fifth project — one new entry, no new
 * `pnpm test:e2e:docs` script, no new CI step. The cost of that choice is
 * this file's own: the `e2e` project's `baseURL` is
 * `http://localhost:4322` (the playground), so every navigation here is an
 * **absolute** `http://localhost:4323` URL rather than a relative one
 * against that base.
 *
 * `tests/e2e/landing.spec.ts` and `playwright.config.ts` are `hc-dev`'s
 * (cycle 012 §7.1) — every Playwright spec in this repository has been
 * dev's in practice across cycles 003 through 009, and cycle 009's F-11 is
 * what assigning one to `hc-qa` costs: a fix brief did that, QA correctly
 * refused to write into a file outside its test-dot-ts(x) glob contract,
 * and the guard went unwritten by anyone. `hc-qa` re-runs this file and its
 * mutations, and reports; it does not write into it.
 */
const LANDING_URL = "http://localhost:4323/";

test.describe("landing", () => {
  /**
   * LN-1 — the landing renders, asserted positively. `.hc-frame` count
   * exactly 70 at the project's default 1280 viewport (§1.10's derivation,
   * mechanised, and independently re-derived against this cycle's actual
   * built files — 7 + 4 + 10 + 8 + 9 + 8 + 23 + 1 = 70, cross-checked by
   * component: Card 15 + Separator 12 + Button 7 + Checkbox 4 + Input 6 +
   * Badge 26 = 70). A count assertion, never a "did not throw" —
   * `QA-CONTRACT.md`'s "a filter matching nothing still exits 0" in page
   * form: a blank page passes every negative assertion ever written.
   */
  test("LN-1 — renders 70 frames and a non-empty h1", async ({ page }) => {
    await page.goto(LANDING_URL);

    await expect(page.locator(".hc-frame")).toHaveCount(70);

    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).not.toBeEmpty();
  });

  /**
   * LN-2 — no horizontal overflow at 375. Reported as both numbers, never
   * as a boolean. The non-vacuity floor is `.hc-frame` count `> 0` rather
   * than the exact 67 §1.10 derives — hero.tsx's own comment records why
   * that exact figure is not reachable through `hidden md:flex` alone
   * (`display: none` does not remove a node from
   * `document.querySelectorAll`), so this floor is deliberately a floor and
   * not the exact number, exactly as the brief specifies: "so a change to
   * §7's badge inventory does not make this test fail for a reason it does
   * not claim."
   */
  test("LN-2 — no horizontal overflow at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(LANDING_URL);

    await expect(page.locator(".hc-frame").first()).toBeVisible();
    const frameCount = await page.locator(".hc-frame").count();
    expect(frameCount).toBeGreaterThan(0);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      scrollWidth,
      `scrollWidth ${scrollWidth} vs clientWidth ${clientWidth}`,
    ).toBeLessThanOrEqual(clientWidth);
  });

  /**
   * LN-3 — the hero's four draw events carry their delays. The one
   * genuinely novel mechanism in the cycle and nothing else guards it: if a
   * wrapper's `--hc-draw-delay` custom property does not inherit into the
   * SVG beneath it, every one of these reads 286ms and the hero has no
   * stagger — precisely the failure a manual pass would sign off as "looks
   * staggered" and never catch again.
   *
   * `calc(var(--hc-draw-delay, 0ms) + var(--hc-draw-duration, 1100ms) *
   * 0.26)`, read via `getComputedStyle` on an ink-pass path — the widest,
   * always-present pass regardless of shape (Card's rectangle, Separator's
   * underline) — inside each of hero.tsx's four `data-testid` wrappers.
   * Browsers report a computed `animation-delay` in seconds; parsed and
   * rounded to the nearest millisecond for the comparison.
   */
  test("LN-3 — the four hero draw events read 286 / 426 / 566 / 706ms", async ({ page }) => {
    await page.goto(LANDING_URL);

    const expected: Record<string, number> = {
      "hero-event-1": 286,
      "hero-event-2": 426,
      "hero-event-3": 566,
      "hero-event-4": 706,
    };

    for (const [testId, expectedMs] of Object.entries(expected)) {
      const inkPath = page
        .locator(`[data-testid="${testId}"] .hc-sketch-svg path[data-hc-kind="ink"]`)
        .first();
      await expect(inkPath).toHaveCount(1);

      const delaySeconds = await inkPath.evaluate((el) => getComputedStyle(el).animationDelay);
      const delayMs = Math.round(parseFloat(delaySeconds) * 1000);
      expect(delayMs, `${testId} computed animation-delay ${delaySeconds}`).toBe(expectedMs);
    }
  });

  /**
   * LN-4 — the theme toggle flips the surface, in both directions. A toggle
   * that only goes one way passes a one-directional test, which is exactly
   * why this clicks twice and asserts both the forward and the return trip.
   * Both the accessible name (the button's own text, "paper" /
   * "blackboard") and section 5's computed `background-color` are read —
   * MU-11 (dropping `dark` from `HandicraftSurface`) leaves the name
   * changing while the colour does not, so asserting only one would pass
   * against that mutation.
   */
  test("LN-4 — the blackboard toggle flips the surface and back", async ({ page }) => {
    await page.goto(LANDING_URL);

    const toggle = page.getByTestId("blackboard-toggle");
    const surface = page.getByTestId("blackboard-surface");

    const initialName = await toggle.innerText();
    const initialColor = await surface.evaluate((el) => getComputedStyle(el).backgroundColor);

    await toggle.click();
    await expect(toggle).not.toHaveText(initialName);
    const toggledColor = await surface.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(toggledColor).not.toBe(initialColor);

    await toggle.click();
    await expect(toggle).toHaveText(initialName);
    const revertedColor = await surface.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(revertedColor).toBe(initialColor);
  });
});
