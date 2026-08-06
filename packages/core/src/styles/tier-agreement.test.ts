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
 * Strips `/* ... *\/` comments, so every assertion below reads code and never
 * prose about code.
 *
 * This is not tidiness. Cycle 008 measured the failure directly: the `"low"`
 * iteration of "declares a CSS hachure level for every fill level that has one"
 * passed against the raw stylesheet **only** because the fill rules' own
 * explanatory comment names `.dark .hc-frame[data-hc-fill="low"]` as an
 * illustration, and `toContain` cannot tell that sentence from the rule it
 * describes. Two of three levels failed loudly; the third passed for a reason
 * unrelated to what it claims. Cycle 002b paid for the same trap in a different
 * file, where an `input.tsx` comment saying `px-4` satisfied a check while the
 * element carried `px-3`. The standing ruling from that one transfers unchanged:
 * the comments are correct and stay; the reader is what has to change.
 *
 * Naive by construction — a `*\/` sequence inside a CSS string would terminate a
 * comment early. No such sequence exists in this stylesheet, and if one ever
 * lands, this needs a real tokenizer rather than a wider regex.
 *
 * T-STRIP proves this helper on a fixture before anything trusts it, the same
 * way `design-tokens.test.ts` reproduces four known colours before trusting its
 * converter.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

const CSS_CODE = stripComments(css);

/**
 * The fill rule's selector in either spelling — bare, or wrapped in `:where()`
 * as cycle 008 writes it. The wrapper is a specificity device and carries no
 * meaning for the density invariant the two tests using this matcher guard, so
 * tolerating both is precision rather than looseness. Which spelling actually
 * ships is T-WHERE's claim; whether the cascade resolves the way that spelling
 * intends is M12's, in a browser. Three assertions, three separate claims, no
 * overlap — which is what stops any one of them from being widened until it
 * means nothing.
 *
 * No capture groups, deliberately. `String.prototype.split` with a grouped
 * pattern interleaves the captures into the result array, which would silently
 * shift the `[1]` the gap test reads.
 */
function fillSelector(level: FillLevel): RegExp {
  return new RegExp(
    `\\.hc-frame:where\\(\\[data-hc-fill="${level}"\\]\\)|\\.hc-frame\\[data-hc-fill="${level}"\\]`,
  );
}

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
 *
 * Reads `CSS_CODE`, not `css`: a brace inside a comment would otherwise close
 * the block early and a declaration named in prose would otherwise satisfy the
 * match.
 */
function cssNumberInBlock(selector: string, pattern: RegExp): number {
  const start = CSS_CODE.indexOf(selector);
  expect(start, `no ${selector} block found`).toBeGreaterThanOrEqual(0);
  const braceOpen = CSS_CODE.indexOf("{", start);
  const braceClose = CSS_CODE.indexOf("}", braceOpen);
  const block = CSS_CODE.slice(braceOpen, braceClose);
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
    // Matches either spelling through `fillSelector`, because what this guards
    // is that a gradient exists per level — not how the selector spends its
    // specificity budget.
    for (const level of Object.keys(FILL_LEVELS) as FillLevel[]) {
      if (!FILL_LEVELS[level]) continue;
      expect(CSS_CODE, `missing tier-1 hachure for fill="${level}"`).toMatch(fillSelector(level));
    }
  });

  it("matches each hachure gap to the rough.js gap", () => {
    // The gradient period is what makes the CSS texture read at the same
    // density as the generated hachure.
    for (const level of ["low", "med"] as FillLevel[]) {
      const gap = FILL_LEVELS[level]!.hachureGap;
      const block = CSS_CODE.split(fillSelector(level))[1] ?? "";
      expect(block.slice(0, 400), `fill="${level}" gap`).toContain(`${gap}px`);
    }
  });

  it("hides the CSS hachure once real geometry mounts", () => {
    // Otherwise the gradient sits underneath the rough.js fill and doubles it.
    expect(CSS_CODE).toMatch(
      /\.hc-frame\[data-hc-fidelity="high"\]\s*\{[^}]*background-image:\s*none/,
    );
  });

  it("T-WHERE — the three fill rules zero their own specificity with `:where()`", () => {
    // The declaration above it, `background-image: none` at equal specificity,
    // only wins because these three sit at (0,1,0) rather than (0,2,0). Remove
    // one `:where()` and that rule loses the cascade again on every frame at
    // that fill level — silently, because the losing declaration is still
    // present and still reads as correct.
    //
    // This is a text claim in a text instrument, and that is all it is: it
    // cannot see whether the cascade actually resolves the way the spelling
    // intends. `matrix.spec.ts`'s M12 reads the computed style in a browser and
    // owns that half. The pair is deliberate — this one fails in milliseconds
    // when someone "cleans up" an idiom they do not recognise.
    for (const level of ["low", "med", "high"] as FillLevel[]) {
      expect(CSS_CODE, `fill="${level}" must stay specificity-zeroed`).toContain(
        `.hc-frame:where([data-hc-fill="${level}"])`,
      );
    }
  });

  it("T-STRIP — the reader cannot see a selector that only appears in a comment", () => {
    // The exact shape cycle 008 measured on this stylesheet's own comment: a
    // selector written as prose inside a comment satisfied a `toContain` that
    // was meant to prove the rule ships. Proven on a fixture rather than on the
    // real stylesheet, so this cannot start passing for an unrelated reason the
    // day someone edits the CSS.
    const fixture = `/* mentions .hc-frame[data-hc-fill="low"] in prose */\n.a { color: red; }`;
    expect(stripComments(fixture)).not.toContain("data-hc-fill");
    expect(stripComments(fixture)).toContain(".a { color: red; }");
  });

  it("authors a radius variant for every seed bucket", () => {
    for (let i = 0; i < SEED_BUCKETS; i++) {
      expect(CSS_CODE, `missing variant ${i}`).toContain(`.hc-frame[data-hc-seed="${i}"]`);
    }
  });

  it("keeps tier-1 corners near-square to match tier 2's sharp rect", () => {
    // Tier 2 draws a sharp rectangle. Tier-1 radii above ~6px change the shape
    // at the handover, which is a far more obvious tell than a stroke that
    // merely gets looser.
    const radii = [...CSS_CODE.matchAll(/--hc-r-[ab]:\s*([^;]+);/g)].flatMap((m) =>
      [...m[1]!.matchAll(/([\d.]+)px/g)].map((n) => Number(n[1])),
    );
    expect(radii.length).toBeGreaterThan(0);
    expect(Math.max(...radii)).toBeLessThanOrEqual(6);
  });

  it("T-CSS — keys no rule off the tier-1 resolution value", () => {
    // Cycle 007 added `data-hc-fidelity="lite"`, and the whole claim that the
    // change is invisible to all 68 committed baselines rests on zero selectors
    // matching it: an attribute no rule reads contributes no box, no paint and
    // no layout. That is load-bearing and it currently rests on nobody having
    // edited this file, which is not a guarantee.
    //
    // Measured rather than assumed — the mutation adding
    // `.hc-frame[data-hc-fidelity="lite"] { background-image: none; }` moves 7
    // committed baselines (6 block-B hachure cells plus D-NJS). So this is not
    // a hypothetical class of edit; it is one line away.
    //
    // A future cycle that genuinely wants a `lite`-keyed rule updates this test
    // and regenerates baselines on purpose, which is the gate working.
    //
    // Reading `CSS_CODE` sharpens this rather than weakening it. The claim is
    // about selectors, and a comment naming `lite` in prose keys no rule off
    // anything — under the raw text that comment would have failed this test
    // for writing a sentence.
    expect(CSS_CODE).not.toContain('data-hc-fidelity="lite"');

    // The positive half. The negative above would also pass on a stylesheet
    // that had lost the fidelity rules entirely, which is the opposite defect
    // and a far louder one — tier 2's geometry would paint on top of tier 1's
    // strokes and hachure instead of replacing them.
    //
    // Asserted as three selector forms rather than as an occurrence count. That
    // was originally to survive the drawn-mark rule's comment quoting
    // `.hc-frame[data-hc-fidelity="high"]` in prose, which would have made a
    // count read 4; against `CSS_CODE` the count would now be stable, but the
    // three-form assertion says more than a number does and stays.
    expect(CSS_CODE).toContain('.hc-frame[data-hc-fidelity="high"]::before');
    expect(CSS_CODE).toContain('.hc-frame[data-hc-fidelity="high"]::after');
    expect(CSS_CODE).toMatch(/\.hc-frame\[data-hc-fidelity="high"\]\s*\{/);
  });

  it("drives turbulence through an inheritable custom property", () => {
    // `filter` does not inherit, so matching the attribute on `.hc-frame` only
    // works if every component re-declares it — which is how this silently did
    // nothing before.
    expect(CSS_CODE).toMatch(/\[data-hc-texture="on"\]\s*\{[^}]*--hc-texture-filter/);
    expect(CSS_CODE).toMatch(/filter:\s*var\(--hc-texture-filter/);
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
    // Counted over `CSS_CODE`. A comment quoting this selector would otherwise
    // read as a second declaration and fail a rule that had not moved.
    const occurrences = CSS_CODE.split(focusWithinSelector).length - 1;
    expect(occurrences).toBe(1);
  });

  it("sits at brace depth 0 — top level, unlayered, outranks every layer", () => {
    const index = CSS_CODE.indexOf(focusWithinSelector);
    expect(index, "focus-within rule not found").toBeGreaterThanOrEqual(0);

    // Depth is the running count of `{` minus `}` from the top of the file to
    // this selector. Depth 0 means nothing has opened a block this selector
    // sits inside of — in particular, no @layer. Counted over `CSS_CODE`, since
    // an unbalanced brace inside a comment would otherwise shift the depth of
    // every rule after it.
    const before = CSS_CODE.slice(0, index);
    const opens = before.match(/\{/g)?.length ?? 0;
    const closes = before.match(/\}/g)?.length ?? 0;
    expect(opens - closes).toBe(0);
  });

  it("is a rule of its own, not folded into the .hc-focusable:focus-visible list", () => {
    const listSelector = ".hc-focusable:focus-visible";
    const listIndex = CSS_CODE.indexOf(listSelector);
    const focusWithinIndex = CSS_CODE.indexOf(focusWithinSelector);
    expect(listIndex, "comma-separated focus block not found").toBeGreaterThanOrEqual(0);
    expect(focusWithinIndex).toBeGreaterThan(listIndex);

    // A `}` between the two selectors means the first rule's block already
    // closed before the second selector opens — two rules, not one list.
    // Merging them would remove this `}`, since a comma-separated list has no
    // brace between its selectors. Over `CSS_CODE`, so a brace inside an
    // intervening comment cannot satisfy this on a merged list.
    const between = CSS_CODE.slice(listIndex, focusWithinIndex);
    expect(between).toContain("}");
  });
});
