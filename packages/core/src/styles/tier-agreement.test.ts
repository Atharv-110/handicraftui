import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BASE_STROKE_WIDTH,
  CHALK_STROKE_WIDTH,
  FILL_LEVELS,
  type FillLevel,
} from "../engine/generator";
import { SEED_BUCKETS } from "../engine/seed";

/**
 * Tier 1 and tier 2 describe the same drawing in two languages — CSS and
 * rough.js options — and nothing in the type system connects them.
 *
 * That matters more than it used to. rough.js is now the default, so tier 1 is
 * what paints before every hydration; any drift between them shows up as a
 * flash on page load. These tests read the stylesheet as text and assert the
 * shared numbers still agree.
 */

// Resolved from the vitest root rather than `import.meta.url`: under the jsdom
// environment that is not a file: URL and `fileURLToPath` throws.
const css = readFileSync(resolve(process.cwd(), "src/styles/handicraft.css"), "utf8");

/**
 * Reads a number out of one selector's block, not the whole stylesheet.
 *
 * `--hc-stroke-w` is declared twice — once in `:root`, once in `.dark` — and a
 * plain `css.match(pattern)` has no global flag, so it silently returns only
 * the first occurrence. That made the old unscoped `cssNumber(pattern)` blind
 * to `.dark` no matter which selector a caller had in mind: it always read
 * `:root`, whichever block the test's comment claimed to be guarding. That
 * blindness is why a stroke-width drift in `.dark` could survive unguarded —
 * fixing the drifted value without also fixing this would leave the test that
 * is supposed to catch the next one just as blind as it caught this one.
 *
 * The slice from the selector to its next closing brace is naive — it does not
 * track nested braces — but neither `:root` nor `.dark` (nor any other
 * top-level block in this file) declares one, so a flat slice is sufficient
 * today. A future token block that did nest braces would need a real parser
 * here instead.
 */
function cssNumberInBlock(selector: string, pattern: RegExp): number {
  const start = css.indexOf(selector);
  expect(start, `no ${selector} block found`).toBeGreaterThanOrEqual(0);
  const braceOpen = css.indexOf("{", start);
  const braceClose = css.indexOf("}", braceOpen);
  const block = css.slice(braceOpen, braceClose);
  const match = block.match(pattern);
  expect(match, `no match for ${pattern} inside ${selector}`).not.toBeNull();
  return Number(match![1]);
}

describe("tier 1 and tier 2 agree", () => {
  it("uses the same stroke weight", () => {
    // A 1.6px CSS border swapping to a 2.4px rough.js stroke reads as the frame
    // suddenly thickening — the most noticeable part of the handover. Scoped to
    // `:root` explicitly now rather than by accident of match order — `.dark`
    // carries its own stroke width and its own guard alongside it.
    expect(cssNumberInBlock(":root", /--hc-stroke-w:\s*([\d.]+)px/)).toBe(BASE_STROKE_WIDTH);
  });

  it("matches the dark stroke weight to CHALK_STROKE_WIDTH", () => {
    // `.dark` deliberately carries a heavier stroke than `:root` — chalk on
    // slate reads thinner than ink on paper at the same weight, so the
    // blackboard theme compensates rather than merely recolouring. Tier 2
    // has to land on the same number via CHALK_STROKE_WIDTH, or the
    // tier-1-to-tier-2 handover in dark mode visibly thickens or thins.
    //
    // This is the assertion the old unscoped `cssNumber` helper could never
    // have made correctly: `css.match(pattern)` with no global flag returns
    // only the first occurrence in the file, and `:root` comes first, so a
    // caller asking for `.dark`'s value always silently got `:root`'s
    // instead. `cssNumberInBlock` fixes that by slicing to one selector's
    // block before matching.
    expect(cssNumberInBlock(".dark", /--hc-stroke-w:\s*([\d.]+)px/)).toBe(CHALK_STROKE_WIDTH);
  });

  it("declares a CSS hachure level for every fill level that has one", () => {
    for (const level of Object.keys(FILL_LEVELS) as FillLevel[]) {
      if (!FILL_LEVELS[level]) continue;
      expect(css, `missing tier-1 hachure for fill="${level}"`).toContain(
        `.hc-frame[data-hc-fill="${level}"]`,
      );
    }
  });

  it("matches each hachure gap to the rough.js gap", () => {
    // The gradient period is what makes the CSS texture read at the same
    // density as the generated hachure.
    for (const level of ["low", "med"] as FillLevel[]) {
      const gap = FILL_LEVELS[level]!.hachureGap;
      const block = css.split(`.hc-frame[data-hc-fill="${level}"]`)[1] ?? "";
      expect(block.slice(0, 400), `fill="${level}" gap`).toContain(`${gap}px`);
    }
  });

  it("hides the CSS hachure once real geometry mounts", () => {
    // Otherwise the gradient sits underneath the rough.js fill and doubles it.
    expect(css).toMatch(/\.hc-frame\[data-hc-fidelity="high"\]\s*\{[^}]*background-image:\s*none/);
  });

  it("authors a radius variant for every seed bucket", () => {
    for (let i = 0; i < SEED_BUCKETS; i++) {
      expect(css, `missing variant ${i}`).toContain(`.hc-frame[data-hc-seed="${i}"]`);
    }
  });

  it("keeps tier-1 corners near-square to match tier 2's sharp rect", () => {
    // Tier 2 draws a sharp rectangle. Tier-1 radii above ~6px change the shape
    // at the handover, which is a far more obvious tell than a stroke that
    // merely gets looser.
    const radii = [...css.matchAll(/--hc-r-[ab]:\s*([^;]+);/g)].flatMap((m) =>
      [...m[1]!.matchAll(/([\d.]+)px/g)].map((n) => Number(n[1])),
    );
    expect(radii.length).toBeGreaterThan(0);
    expect(Math.max(...radii)).toBeLessThanOrEqual(6);
  });

  it("drives turbulence through an inheritable custom property", () => {
    // `filter` does not inherit, so matching the attribute on `.hc-frame` only
    // works if every component re-declares it — which is how this silently did
    // nothing before.
    expect(css).toMatch(/\[data-hc-texture="on"\]\s*\{[^}]*--hc-texture-filter/);
    expect(css).toMatch(/filter:\s*var\(--hc-texture-filter/);
  });
});

/**
 * T18 (cycle 000b). `focusWithin`'s ring lives in
 * `.hc-frame[data-hc-focus-within]:has(> :focus-visible)`, deliberately
 * unlayered and deliberately its own rule rather than a third selector on the
 * `.hc-frame:focus-visible, .hc-focusable:focus-visible` block above it — one
 * unsupported selector invalidates an entire comma-separated list, so folding
 * it in would cost every browser without `:has()` its ordinary focus ring too.
 * This file already owns exactly this class of invariant (structural facts
 * about the stylesheet, read as text), which is why the assertion lives here
 * rather than starting a third CSS-reading file.
 */
describe("the focus-within rule stays unlayered and separate", () => {
  const focusWithinSelector = ".hc-frame[data-hc-focus-within]:has(> :focus-visible)";

  it("appears exactly once", () => {
    const occurrences = css.split(focusWithinSelector).length - 1;
    expect(occurrences).toBe(1);
  });

  it("sits at brace depth 0 — top level, unlayered, outranks every layer", () => {
    const index = css.indexOf(focusWithinSelector);
    expect(index, "focus-within rule not found").toBeGreaterThanOrEqual(0);

    // Depth is the running count of `{` minus `}` from the top of the file to
    // this selector. Depth 0 means nothing has opened a block this selector
    // sits inside of — in particular, no @layer.
    const before = css.slice(0, index);
    const opens = before.match(/\{/g)?.length ?? 0;
    const closes = before.match(/\}/g)?.length ?? 0;
    expect(opens - closes).toBe(0);
  });

  it("is a rule of its own, not folded into the .hc-focusable:focus-visible list", () => {
    const listSelector = ".hc-focusable:focus-visible";
    const listIndex = css.indexOf(listSelector);
    const focusWithinIndex = css.indexOf(focusWithinSelector);
    expect(listIndex, "comma-separated focus block not found").toBeGreaterThanOrEqual(0);
    expect(focusWithinIndex).toBeGreaterThan(listIndex);

    // A `}` between the two selectors means the first rule's block already
    // closed before the second selector opens — two rules, not one list.
    // Merging them would remove this `}`, since a comma-separated list has no
    // brace between its selectors.
    const between = css.slice(listIndex, focusWithinIndex);
    expect(between).toContain("}");
  });
});
