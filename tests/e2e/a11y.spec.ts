import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";

/**
 * axe — cycle 003 §3.3, strengthened in §15.2 (iteration 2).
 *
 * Tags match the `accessibility` skill's conformance table: A must pass, AA
 * should pass. `wcag2*` plus `wcag21*` plus `wcag22*` rather than one runner
 * default, because axe's default tag set drifts with each dependency bump and
 * pinning the exact WCAG levels is what keeps a passing run meaning the same
 * thing across an `axe-core` version change.
 *
 * A2 used to pin a declared 20-node `color-contrast` set, every entry a
 * `text-hc-ink-faint` site, routed to cycle 002a. 002a landed and moved all
 * of them to `text-hc-ink-soft`; the measured set is now empty. A2 asserts
 * zero instead of a lowered literal, which is strictly stronger — a new
 * violation fails the build rather than being absorbed into a list nobody
 * re-derives.
 *
 * The doctrine correction this block used to report is done: PRINCIPLES.md's
 * accessibility law and QA-CONTRACT.md's axe bullet both now record cycle
 * 000b's real @axe-core/cli 4.12.1 run and name the narrower gap — axe in CI,
 * across the matrix — that this file closes.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"];

async function runAxe(page: Page) {
  return new AxeBuilder({ page }).withTags(TAGS).analyze();
}

// Derived from `runAxe`'s own return type rather than an `axe-core` import —
// pnpm's strict `node_modules` only links declared dependencies at the root,
// and `axe-core` is `@axe-core/playwright`'s transitive dependency, not this
// package's own. Importing it directly would be a phantom import that
// resolves today by accident of hoisting and breaks the moment it does not.
type AxeAnalysis = Awaited<ReturnType<typeof runAxe>>;

/**
 * The one filter every A0/A1 assertion shares. Inlined twice before this
 * iteration (`:40` and `:52` in the pre-fix file) — A0 exists to prove this
 * exact filter can report a critical, so a second inlined copy would verify
 * nothing about the filter A1 actually runs. Every caller in this file goes
 * through here.
 */
function criticalsOf(results: AxeAnalysis): AxeAnalysis["violations"] {
  return results.violations.filter((v) => v.impact === "critical");
}

test.describe("a11y", () => {
  const HARNESS_PAGES = [
    { label: "harness light", state: {} },
    { label: "harness dark", state: { dark: true } },
    { label: "harness lite", state: { fidelity: "lite" as const } },
  ];

  /**
   * A0 — proves the instrument itself, per §15.2. A1's
   * `expect(criticals).toEqual([])` has never been observed to fail on this
   * page: removing `aria-hidden="true"` from `useSketchFrame.tsx`'s SVG (the
   * mutation §3.3 originally named) produces no axe violation at any impact
   * level, because `aria-hidden-focus` fires on the rule's *presence* over
   * focusable content, never on its absence. Hunting for a different page
   * mutation only proves the instrument once, on the day someone runs it, and
   * a fixture proof stays in the suite permanently instead.
   *
   * `page.setContent()` on the plain `page` fixture — no navigation, no route,
   * so the proof cannot be broken by anything happening to `apps/playground`.
   * The planted violation is a single `<img>` with no `alt`, a 1x1
   * transparent GIF data URI. Measured on axe-core 4.12.1 under this file's
   * exact `TAGS`: impact `critical`, exactly 1 violation, 1 node, rule
   * `image-alt`. The same fixture with `alt` restored measures 0 violations
   * and 0 criticals, so the fixture carries nothing incidental — the planted
   * violation is the only one, which is what licenses asserting the exact
   * rule id below rather than a bare non-empty check.
   */
  test("A0 — the critical filter catches a planted violation", async ({ page }) => {
    await page.setContent(
      '<!DOCTYPE html><html lang="en"><body><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7"></body></html>',
    );
    const results = await runAxe(page);
    const criticals = criticalsOf(results);
    expect(criticals.map((v) => v.id)).toEqual(["image-alt"]);
  });

  for (const p of HARNESS_PAGES) {
    test(`A1 — zero critical violations (${p.label})`, async ({ page, hc }) => {
      await hc.goto(p.state);
      const results = await runAxe(page);
      const criticals = criticalsOf(results);
      expect(criticals, JSON.stringify(criticals, null, 2)).toEqual([]);
      // Failure mode 2 (§15.2): the filter works but never saw this page —
      // an early return from `hc.goto()` or a blank navigation would leave
      // `criticals` empty for the wrong reason. A tag set matching no rule
      // measures `passes: 0` on this exact page, so a positive count is the
      // discriminator, not a specific floor — the failure being guarded is
      // "zero rules ran", not "fewer rules ran than last time".
      expect(results.passes.length).toBeGreaterThan(0);
    });
  }

  // `/spike-portal` already carries one logged, routed finding — a
  // `region` violation, moderate, 4 nodes (`000b:1526`) — accepted and
  // assigned to the first portal-component cycle. A1 still asserts zero
  // criticals here; that finding is neither.
  test("A1 — zero critical violations (spike-portal)", async ({ page }) => {
    await page.goto("/spike-portal");
    const results = await runAxe(page);
    const criticals = criticalsOf(results);
    expect(criticals, JSON.stringify(criticals, null, 2)).toEqual([]);
    expect(results.passes.length).toBeGreaterThan(0);
  });

  for (const p of HARNESS_PAGES) {
    test(`A2 — zero serious or moderate violations (${p.label})`, async ({ page, hc }) => {
      await hc.goto(p.state);
      const results = await runAxe(page);
      const counted = results.violations
        .filter((v) => v.impact === "serious" || v.impact === "moderate")
        .map((v) => ({
          id: v.id,
          impact: v.impact,
          targets: v.nodes.map((n) => n.target.join(" ")),
        }));

      expect(counted, JSON.stringify(counted, null, 2)).toEqual([]);

      // "Expect zero" alone cannot tell a clean page from a blank page, a
      // failed navigation or a tag-set typo — all three also measure zero
      // violations. This is true only if the `color-contrast` rule actually
      // ran and found real text that passed, which is what proves axe looked
      // at a rendered harness rather than nothing.
      expect(results.passes.map((r) => r.id)).toContain("color-contrast");
    });
  }
});
