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
 * Doctrine correction, reported rather than fixed here: `PRINCIPLES.md`,
 * `QA-CONTRACT.md` and `INDEX.md` all currently say "no axe run has ever
 * happened on this project". That is stale — cycle 000b ran `@axe-core/cli`
 * 4.12.1 for real (`000b-engine-fixes.md:1318-1327`) and found real
 * violations, including the 18-node `color-contrast` set this file's A2
 * reproduces at 20 (harness gained two `Group` headings since that run,
 * neither adding a new `text-hc-ink-faint` site type). `.claude/doctrine/**`
 * is the founder's alone to edit, so this stays a report rather than a diff.
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

  /**
   * A2's declared node set. Measured, not predicted — the pre-registered
   * estimate in cycle 003 §3.3 was 9 `Group` headings + 10 mark captions + 1
   * `perf-readout` = 20, confirmed exactly on all three pages below: every
   * node is `color-contrast`, `serious`, and every one of them is a
   * `text-hc-ink-faint` site.
   *
   * All 20 are routed to cycle 002a, whose assertion D7 forbids
   * `text-hc-ink-faint` in `registry/default/**` and `apps/playground/app/**`
   * — this count is expected to fall to near zero once that cycle merges. A2
   * exists so that drop is independently visible: if 002a lands and this
   * count does not fall, the assertion and the symptom are not measuring the
   * same thing.
   *
   * A literal here rather than an allowlist file, on purpose — lowering it is
   * a one-line diff a reviewer sees land, not a silent edit to a fixture.
   */
  const DECLARED_SERIOUS_MODERATE_TARGETS = [
    // perf-readout.tsx:57 — `text-hc-ink-faint` on the settle readout text.
    'div[data-testid="perf-readout"]',
    // harness.tsx's `Group` component, `text-hc-ink-faint` section heading —
    // one per group, 9 groups on the harness page.
    "section:nth-child(1) > h2",
    "section:nth-child(2) > h2",
    "section:nth-child(3) > h2",
    "section:nth-child(4) > h2",
    "section:nth-child(5) > h2",
    "section:nth-child(6) > h2",
    "section:nth-child(7) > h2",
    "section:nth-child(8) > h2",
    "section:nth-child(9) > h2",
    // harness.tsx's "Marks — drawn, not an icon font" group, one
    // `text-hc-ink-faint` caption per drawn mark — 10 marks.
    ".gap-1.flex-col.flex:nth-child(1) > .text-\\[10px\\].text-hc-ink-faint.font-note",
    ".gap-1.flex-col.flex:nth-child(2) > .text-\\[10px\\].text-hc-ink-faint.font-note",
    ".gap-1.flex-col.flex:nth-child(3) > .text-\\[10px\\].text-hc-ink-faint.font-note",
    ".gap-1.flex-col.flex:nth-child(4) > .text-\\[10px\\].text-hc-ink-faint.font-note",
    ".gap-1.flex-col.flex:nth-child(5) > .text-\\[10px\\].text-hc-ink-faint.font-note",
    ".gap-1.flex-col.flex:nth-child(6) > .text-\\[10px\\].text-hc-ink-faint.font-note",
    ".gap-1.flex-col.flex:nth-child(7) > .text-\\[10px\\].text-hc-ink-faint.font-note",
    ".gap-1.flex-col.flex:nth-child(8) > .text-\\[10px\\].text-hc-ink-faint.font-note",
    ".gap-1.flex-col.flex:nth-child(9) > .text-\\[10px\\].text-hc-ink-faint.font-note",
    ".gap-1.flex-col.flex:nth-child(10) > .text-\\[10px\\].text-hc-ink-faint.font-note",
  ];

  for (const p of HARNESS_PAGES) {
    test(`A2 — serious+moderate count is the declared 20, all routed to 002a (${p.label})`, async ({
      page,
      hc,
    }) => {
      await hc.goto(p.state);
      const results = await runAxe(page);
      const counted = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "moderate",
      );

      // Every violation in this set is `color-contrast` — asserted
      // separately from the count so a *different* rule firing 20 times
      // cannot silently satisfy the number below.
      for (const v of counted) {
        expect(v.id).toBe("color-contrast");
      }

      const targets = counted.flatMap((v) => v.nodes.map((n) => n.target.join(" ")));
      expect(targets.sort(), JSON.stringify(targets, null, 2)).toEqual(
        [...DECLARED_SERIOUS_MODERATE_TARGETS].sort(),
      );
    });
  }
});
