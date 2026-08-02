import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_STROKE_WIDTH, FILL_LEVELS, type FillLevel } from "../engine/generator";
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
const css = readFileSync(resolve(process.cwd(), "src/styles/handcraft.css"), "utf8");

function cssNumber(pattern: RegExp): number {
  const match = css.match(pattern);
  expect(match, `no match for ${pattern}`).not.toBeNull();
  return Number(match![1]);
}

describe("tier 1 and tier 2 agree", () => {
  it("uses the same stroke weight", () => {
    // A 1.6px CSS border swapping to a 2.4px rough.js stroke reads as the frame
    // suddenly thickening — the most noticeable part of the handover.
    expect(cssNumber(/--hc-stroke-w:\s*([\d.]+)px/)).toBe(BASE_STROKE_WIDTH);
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
    expect(css).toMatch(
      /\.hc-frame\[data-hc-fidelity="high"\]\s*\{[^}]*background-image:\s*none/,
    );
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
