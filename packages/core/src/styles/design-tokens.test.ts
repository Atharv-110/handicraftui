import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
/**
 * `packages/eslint-config` is plain ESM JavaScript with no `.d.ts` beside it
 * and no `types` condition on its `exports` map, so TypeScript resolves this
 * specifier to an untyped `.js` and reports TS7016 under `strict`. An
 * in-file `declare module` cannot fix it either — TS2665, an untyped module
 * cannot be augmented — so the suppression is the only route that keeps this
 * import inside a test file. It is deliberately `@ts-expect-error` rather
 * than `@ts-ignore`: the moment `packages/eslint-config` grows declarations,
 * TypeScript reports the directive as unused and this line fails the gate
 * until it is removed. A suppression that cannot outlive its cause.
 *
 * Filed as cycle 005 finding M2. The shape below is asserted at runtime by
 * R6 itself, which is what stops the local cast from quietly agreeing with a
 * renamed export.
 */
// @ts-expect-error `packages/eslint-config` ships plain ESM with no type declarations.
import * as handicraftRules from "@handicraft/eslint-config/handicraft-rules";
import { describe, expect, it } from "vitest";
import { FILL_LEVELS, taperForSize } from "../engine/generator";
import {
  CONTROL_RAMP,
  GEOMETRY_PINS,
  HAND_FACE_EXCEPTIONS,
  SPACING,
  TOKEN_RAMP,
  TYPE_SCALE,
} from "./ramps";

/**
 * The contrast instrument for cycle 002a. Reproduces the model
 * `DESIGN-SYSTEM.md` §1 describes — oklch to linear sRGB, gamma encode,
 * clamp and quantize to 8 bits, composite a hatch line on the gamma-encoded
 * channels, then WCAG relative luminance — so every ratio in this file is
 * measured at the rasterised hex a browser actually paints, not at the float
 * oklch model. The model lives here rather than in `packages/core/src`
 * because it is an assertion instrument, not product code — reversible if a
 * future lint rule wants it shipped.
 *
 * D1 is the load-bearing test. Without it, a subtly wrong converter would
 * make D2 through D5 pass vacuously and this file becomes decoration —
 * confirm the converter against four known values before trusting anything
 * it says about the actual tokens.
 */

// Resolved from the vitest root rather than `import.meta.url`: under jsdom
// that is not a `file:` URL and `fileURLToPath` throws.
const css = readFileSync(resolve(process.cwd(), "src/styles/handicraft.css"), "utf8");

// ---------------------------------------------------------------------------
// oklch -> rasterised hex
// ---------------------------------------------------------------------------

/** oklch to linear sRGB. Björn Ottosson's published OKLab matrices. */
function oklchToLinearSrgb(L: number, C: number, hueDeg: number): [number, number, number] {
  const h = (hueDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [r, g, bl];
}

/**
 * The sRGB OETF, extended past [0, 1] rather than clamped first. D6 needs
 * the pre-clamp value to measure how far a channel excurses out of gamut, so
 * this function must not clamp — clamping here would make every D6 check
 * pass vacuously at exactly the boundary.
 */
function gammaEncodeUnclamped(linear: number): number {
  return linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
}

function gammaDecode(encoded: number): number {
  return encoded <= 0.04045 ? encoded / 12.92 : Math.pow((encoded + 0.055) / 1.055, 2.4);
}

interface Rendered {
  /** Gamma-encoded, pre-clamp, 0-1 scale. D6 reads this directly. */
  levels: [number, number, number];
  /** Clamped and quantized to 8 bits — the rasterised hex every other D
   * assertion measures at. */
  rgb8: [number, number, number];
  hex: string;
}

function render(L: number, C: number, hueDeg: number): Rendered {
  const [r, g, b] = oklchToLinearSrgb(L, C, hueDeg);
  const levels: [number, number, number] = [
    gammaEncodeUnclamped(r),
    gammaEncodeUnclamped(g),
    gammaEncodeUnclamped(b),
  ];
  const rgb8 = levels.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255)) as [
    number,
    number,
    number,
  ];
  const hex =
    "#" +
    rgb8
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
  return { levels, rgb8, hex };
}

function relativeLuminance(rgb8: [number, number, number]): number {
  const [r, g, b] = rgb8.map((c) => gammaDecode(c / 255));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const L1 = relativeLuminance(a);
  const L2 = relativeLuminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * fill x alpha + ground x (1 - alpha), on the gamma-encoded 0-255 channels —
 * what a hatch line optically composites to, not a re-quantized pixel. The
 * result is deliberately kept as a float rather than rounded again: rounding
 * here was tried and it moved every calibration figure by 0.01-0.02, out of
 * the filed figures' own precision.
 */
function compositeHachure(
  fillRgb8: [number, number, number],
  groundRgb8: [number, number, number],
  alpha: number,
): [number, number, number] {
  return [0, 1, 2].map((i) => fillRgb8[i]! * alpha + groundRgb8[i]! * (1 - alpha)) as [
    number,
    number,
    number,
  ];
}

const LOW_ALPHA = FILL_LEVELS.low!.opacity;
const MED_ALPHA = FILL_LEVELS.med!.opacity;
const HIGH_ALPHA = FILL_LEVELS.high!.opacity;

// ---------------------------------------------------------------------------
// Reading tokens out of the stylesheet, block-scoped
// ---------------------------------------------------------------------------

/**
 * Slices to one selector's block before matching, the same technique as
 * `cssNumberInBlock` in `tier-agreement.test.ts:44` — duplicated here rather
 * than shared, per that file's own note that a token block genuinely needs
 * a real parser only once it nests braces, which neither `:root` nor
 * `.dark` does today. A plain `css.match` with no global flag would
 * silently return `:root`'s value even when the caller means `.dark`; that
 * blindness is exactly `QA-CONTRACT.md` Rule V3 — a test passing for the
 * wrong reason.
 */
function oklchInBlock(selector: string, tokenName: string): [number, number, number] {
  const start = css.indexOf(selector);
  expect(start, `no ${selector} block found`).toBeGreaterThanOrEqual(0);
  const braceOpen = css.indexOf("{", start);
  const braceClose = css.indexOf("}", braceOpen);
  const block = css.slice(braceOpen, braceClose);
  const pattern = new RegExp(
    `--hc-${tokenName}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`,
  );
  const match = block.match(pattern);
  expect(match, `no oklch match for --hc-${tokenName} inside ${selector}`).not.toBeNull();
  return [Number(match![1]) / 100, Number(match![2]), Number(match![3])];
}

/**
 * The same block-slicing technique as `oklchInBlock`, for a plain declaration
 * value rather than an oklch triple. Hoisted to module scope in cycle 002c so
 * R5 and E1 share one reader: duplicating it would put the same slicing
 * blindness in two places, which is the one thing `oklchInBlock`'s own note
 * says it did deliberately once and would not do twice.
 *
 * Block-scoped for the reason that note gives — a global `css.match` returns
 * `:root`'s value whatever selector the caller meant, and a test that cannot
 * tell the two apart passes for the wrong reason.
 */
function pxInBlock(selector: string, tokenName: string): string {
  const start = css.indexOf(selector);
  expect(start, `no ${selector} block found`).toBeGreaterThanOrEqual(0);
  const braceOpen = css.indexOf("{", start);
  const braceClose = css.indexOf("}", braceOpen);
  const block = css.slice(braceOpen, braceClose);
  expect(block.length, `${selector} block read empty`).toBeGreaterThan(0);
  const match = block.match(new RegExp(`--hc-${tokenName}:\\s*([^;]+);`));
  expect(match, `no --hc-${tokenName} declaration inside ${selector}`).not.toBeNull();
  return match![1]!.trim();
}

function renderToken(selector: ":root" | ".dark", tokenName: string): Rendered {
  const [L, C, H] = oklchInBlock(selector, tokenName);
  return render(L, C, H);
}

const ROLES = ["danger", "warning", "success", "info", "accent"] as const;

// ---------------------------------------------------------------------------
// Converter self-test — run first. A subtly wrong converter would make every
// assertion below pass over the wrong numbers.
// ---------------------------------------------------------------------------

describe("converter self-test", () => {
  it("reproduces four known colours before any project token is trusted", () => {
    expect(render(0.628, 0.2577, 29.23).hex).toBe("#FF0000");
    expect(render(1, 0, 0).hex).toBe("#FFFFFF");
    expect(render(0, 0, 0).hex).toBe("#000000");
    expect(contrastRatio(render(1, 0, 0).rgb8, render(0, 0, 0).rgb8)).toBeCloseTo(21.0, 2);
  });
});

// ---------------------------------------------------------------------------
// D1 — calibration
// ---------------------------------------------------------------------------

describe("D1", () => {
  it("D1 — reproduces four filed measurements within +/-0.01 of the pre-002 tokens", () => {
    // Frozen literals of the pre-002 token values, not read from the CSS.
    // Two of the four inputs (old --hc-danger) no longer exist in the
    // stylesheet at all, so all four stay literal for consistency rather
    // than half-read, half-frozen.
    const paperLight = render(0.978, 0.006, 90);
    const paperDark = render(0.24, 0.014, 255);
    const inkFaintLight = render(0.66, 0.018, 265);
    const inkDark = render(0.92, 0.012, 85);
    const highlighterDark = render(0.84, 0.15, 105);
    const oldDangerLight = render(0.54, 0.2, 27);
    const oldDangerDark = render(0.68, 0.18, 27);

    const inkFaintOnPaperLight = contrastRatio(inkFaintLight.rgb8, paperLight.rgb8);
    const inkOverHighlighterMedDark = contrastRatio(
      inkDark.rgb8,
      compositeHachure(highlighterDark.rgb8, paperDark.rgb8, MED_ALPHA),
    );
    const oldDangerOverOwnLowLight = contrastRatio(
      oldDangerLight.rgb8,
      compositeHachure(oldDangerLight.rgb8, paperLight.rgb8, LOW_ALPHA),
    );
    const oldDangerOverOwnLowDark = contrastRatio(
      oldDangerDark.rgb8,
      compositeHachure(oldDangerDark.rgb8, paperDark.rgb8, LOW_ALPHA),
    );

    expect(Math.abs(inkFaintOnPaperLight - 2.93), "ink-faint on paper, light").toBeLessThanOrEqual(
      0.01,
    );
    expect(
      Math.abs(inkOverHighlighterMedDark - 3.64),
      "ink over highlighter@med, dark",
    ).toBeLessThanOrEqual(0.01);
    expect(
      Math.abs(oldDangerOverOwnLowLight - 3.56),
      "old danger over own hachure@low, light",
    ).toBeLessThanOrEqual(0.01);
    expect(
      Math.abs(oldDangerOverOwnLowDark - 3.74),
      "old danger over own hachure@low, dark",
    ).toBeLessThanOrEqual(0.01);
  });
});

// ---------------------------------------------------------------------------
// D2 — role ink on plain paper
// ---------------------------------------------------------------------------

it("D2 — every role ink clears 4.5:1 as text on plain paper, both themes", () => {
  // Keyed by cell rather than tracked as a running minimum. A running
  // minimum breaks isolation: mutating any one role's ink can make that
  // role the new global worst even while it stays well above 4.5, which
  // would fail this test on a mutation D3 alone is supposed to catch. Found
  // running D3's own mutation against a first draft of this test — it
  // dropped light warning's cell to 5.2412, still comfortably legal, but a
  // `Math.min` version read that as the baseline moving and failed anyway.
  const cells: Record<string, number> = {};
  for (const selector of [":root", ".dark"] as const) {
    const theme = selector === ":root" ? "light" : "dark";
    const paper = renderToken(selector, "paper");
    for (const role of ROLES) {
      const ink = renderToken(selector, `${role}-ink`);
      const ratio = contrastRatio(ink.rgb8, paper.rgb8);
      expect(ratio, `${theme} ${role} ink on paper`).toBeGreaterThanOrEqual(4.5);
      cells[`${theme}-${role}`] = ratio;
    }
  }
  // Baseline worst cell, dark danger.
  expect(cells["dark-danger"]).toBeCloseTo(5.362251, 4);
});

// ---------------------------------------------------------------------------
// D3 — role ink over its own fill's low hachure, over paper
// ---------------------------------------------------------------------------

it("D3 — every role ink clears 4.5:1 over its own fill's hachure at low, over paper", () => {
  const cells: Record<string, number> = {};
  for (const selector of [":root", ".dark"] as const) {
    const theme = selector === ":root" ? "light" : "dark";
    const paper = renderToken(selector, "paper");
    for (const role of ROLES) {
      const ink = renderToken(selector, `${role}-ink`);
      const fill = renderToken(selector, `${role}-fill`);
      const hatch = compositeHachure(fill.rgb8, paper.rgb8, LOW_ALPHA);
      const ratio = contrastRatio(ink.rgb8, hatch);
      expect(ratio, `${theme} ${role} ink over own low fill`).toBeGreaterThanOrEqual(4.5);
      cells[`${theme}-${role}`] = ratio;
    }
  }
  // Baseline worst cell is dark danger at 4.509427 — see DESIGN-SYSTEM.md
  // §7.3. Not pinned here: dark danger's cell shares --hc-danger-fill with
  // D5, and pinning its exact value broke isolation the first time this was
  // run — D5(a)'s mutation moves this cell to 4.537629, still comfortably
  // over the 4.5 floor the loop above already checked, so it must not fail
  // this test. Pin only the cell with no cross-test input: light warning,
  // fed by --hc-warning-ink/-fill, which no other D assertion's mutation
  // touches.
  expect(cells["light-warning"]).toBeCloseTo(4.514918, 4);
});

// ---------------------------------------------------------------------------
// D4 — --hc-ink over every role fill@med, ink-faint@high, highlighter@low
// ---------------------------------------------------------------------------

it("D4 — --hc-ink clears 4.5:1 over role fills@med, ink-faint@high and highlighter@low, over paper", () => {
  const cells: Record<string, number> = {};
  let count = 0;
  for (const selector of [":root", ".dark"] as const) {
    const theme = selector === ":root" ? "light" : "dark";
    const paper = renderToken(selector, "paper");
    const ink = renderToken(selector, "ink");

    for (const role of ROLES) {
      const fill = renderToken(selector, `${role}-fill`);
      const hatch = compositeHachure(fill.rgb8, paper.rgb8, MED_ALPHA);
      const ratio = contrastRatio(ink.rgb8, hatch);
      expect(ratio, `${theme} ink over ${role} fill@med`).toBeGreaterThanOrEqual(4.5);
      cells[`${theme}-${role}-med`] = ratio;
      count++;
    }

    const inkFaint = renderToken(selector, "ink-faint");
    const hatchFaintHigh = compositeHachure(inkFaint.rgb8, paper.rgb8, HIGH_ALPHA);
    const ratioFaint = contrastRatio(ink.rgb8, hatchFaintHigh);
    expect(ratioFaint, `${theme} ink over ink-faint@high`).toBeGreaterThanOrEqual(4.5);
    cells[`${theme}-ink-faint-high`] = ratioFaint;
    count++;

    const highlighter = renderToken(selector, "highlighter");
    const hatchHighlighterLow = compositeHachure(highlighter.rgb8, paper.rgb8, LOW_ALPHA);
    const ratioHighlighter = contrastRatio(ink.rgb8, hatchHighlighterLow);
    expect(ratioHighlighter, `${theme} ink over highlighter@low`).toBeGreaterThanOrEqual(4.5);
    cells[`${theme}-highlighter-low`] = ratioHighlighter;
    count++;
  }

  expect(count).toBe(14);
  // Baseline worst cell.
  expect(cells["dark-ink-faint-high"]).toBeCloseTo(5.038862, 4);
  // Button primary's actual numbers — verified here rather than by eye.
  expect(cells["dark-highlighter-low"]).toBeCloseTo(7.1992, 3);
  expect(cells["light-highlighter-low"]).toBeCloseTo(14.8184, 3);
});

// ---------------------------------------------------------------------------
// D5 — the house design guideline (not WCAG, see DESIGN-SYSTEM.md §1's
// 1.4.11-exempt decision): role fills at or above 3.0 against paper, with
// success dark the one named, deliberate exception. Do not tighten this to
// a clean 3.0 floor without re-reading DESIGN-SYSTEM.md §1.4 — the value
// that clears 3.0 breaks D3's real 4.5:1 floor on the same cell.
// ---------------------------------------------------------------------------

it("D5 — house design guideline, not WCAG: role fills >= 3.0 against paper, success dark the named exception", () => {
  const cells: Record<string, number> = {};
  for (const selector of [":root", ".dark"] as const) {
    const theme = selector === ":root" ? "light" : "dark";
    const paper = renderToken(selector, "paper");
    for (const role of ROLES) {
      const fill = renderToken(selector, `${role}-fill`);
      cells[`${theme}-${role}`] = contrastRatio(fill.rgb8, paper.rgb8);
    }
  }

  // The one recorded exception. Asserted at its exact shipped value, never
  // against 3.0 — DESIGN-SYSTEM.md §1.4 shows the adjusted value that clears
  // 3.0 drops D3's same cell under the real 4.5:1 floor.
  expect(cells["dark-success"]).toBeCloseTo(2.994881, 4);

  for (const key of Object.keys(cells)) {
    if (key === "dark-success") continue;
    expect(cells[key]!, `${key} fill vs paper`).toBeGreaterThanOrEqual(3.0);
  }
  // Worst of the other nine.
  expect(cells["dark-danger"]).toBeCloseTo(3.000424, 4);
});

// ---------------------------------------------------------------------------
// D6 — gamut. Every colour token, both themes, all three channels.
// ---------------------------------------------------------------------------

it("D6 — every colour token renders in gamut, no channel clips before rounding", () => {
  const tokenNames = [
    "paper",
    "paper-raised",
    "paper-sunken",
    "ink",
    "ink-soft",
    "ink-faint",
    "highlighter",
    "biro",
    "focus",
    "danger-ink",
    "danger-fill",
    "warning-ink",
    "warning-fill",
    "success-ink",
    "success-fill",
    "info-ink",
    "info-fill",
    "accent-ink",
    "accent-fill",
  ];
  expect(tokenNames.length).toBe(19);

  // A channel that rounds to 0 or 255 is legal; a channel that has to be
  // clipped to get there is not. Half a level either side of the legal
  // range is the tolerance for float error in the conversion itself.
  const TOLERANCE = 0.5 / 255;
  let checked = 0;
  for (const selector of [":root", ".dark"] as const) {
    for (const name of tokenNames) {
      const [L, C, H] = oklchInBlock(selector, name);
      const [rLin, gLin, bLin] = oklchToLinearSrgb(L, C, H);
      const channels: [string, number][] = [
        ["r", rLin],
        ["g", gLin],
        ["b", bLin],
      ];
      for (const [channel, linear] of channels) {
        const level = gammaEncodeUnclamped(linear);
        expect(
          level,
          `${selector} --hc-${name} ${channel} excurses out of gamut: ${level}`,
        ).toBeGreaterThanOrEqual(-TOLERANCE);
        expect(
          level,
          `${selector} --hc-${name} ${channel} excurses out of gamut: ${level}`,
        ).toBeLessThanOrEqual(1 + TOLERANCE);
        checked++;
      }
    }
  }
  expect(checked).toBe(114);
});

// ---------------------------------------------------------------------------
// collectSourceFiles — the shared source walker, read by D9, R3 and R4
//
// D7 lived here and asserted that no `text-hc-ink-faint` token appeared in
// registry or playground source. Cycle 005 deleted it: `hc/no-ink-faint-text`
// in `packages/eslint-config/handicraft-rules.js` makes the same assertion
// from inside the lint task of the package that owns each file.
// `QA-CONTRACT.md` Rule V1b names D7's runtime `readFileSync` walk as the one
// escape left open after cycle 003a — `@handicraft/core#test` hashes 45
// inputs and zero of them are under `apps/playground`, so a warm local
// `pnpm test` replayed green over a regression this test would have caught
// cold. `@handicraft/playground#lint` hashes 16 inputs, all of them under
// `apps/playground`. The check moved to the task whose hash is exactly what
// it reads.
//
// The walker outlives its own test because three others read it.
// ---------------------------------------------------------------------------

/**
 * Walks a directory for `.ts`/`.tsx` source, skipping build output. Scoped
 * to `registry/default/**` and `apps/playground/app/**` specifically —
 * `apps/playground/.next` and `.next-dev` regenerate on every `pnpm dev` /
 * `pnpm build` and would otherwise make this test fail intermittently, by
 * machine, on gitignored files no source fix can remove.
 */
function collectSourceFiles(dir: string): string[] {
  const skip = new Set(["node_modules", ".next", ".next-dev", "dist"]);
  const out: string[] = [];
  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (skip.has(entry.name)) continue;
        walk(join(current, entry.name));
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        out.push(join(current, entry.name));
      }
    }
  }
  walk(dir);
  return out;
}

// ---------------------------------------------------------------------------
// D8 — --hc-focus against plain paper
// ---------------------------------------------------------------------------

it("D8 — --hc-focus clears 3:1 against plain paper, both themes", () => {
  const light = contrastRatio(
    renderToken(":root", "focus").rgb8,
    renderToken(":root", "paper").rgb8,
  );
  const dark = contrastRatio(
    renderToken(".dark", "focus").rgb8,
    renderToken(".dark", "paper").rgb8,
  );

  expect(light).toBeGreaterThanOrEqual(3.0);
  expect(dark).toBeGreaterThanOrEqual(3.0);
  expect(light).toBeCloseTo(5.208, 3);
  expect(dark).toBeCloseTo(7.2146, 3);
});

// ---------------------------------------------------------------------------
// D9 — a role ink on text always pairs with a pinned frame stroke
// ---------------------------------------------------------------------------

it("D9 — text-hc-<role>-ink always pairs with stroke: var(--hc-ink) on useSketchFrame", () => {
  const registryDir = resolve(process.cwd(), "../../registry/default");
  const files = collectSourceFiles(registryDir);
  const roleInkPattern = /text-hc-(?:danger|warning|success|info|accent)-ink\b/;
  const strokePattern = /stroke:\s*"var\(--hc-ink\)"/;

  const filesWithRoleInk = files.filter((f) => roleInkPattern.test(readFileSync(f, "utf8")));
  // Today that is Button and only Button — a floor so this cannot pass
  // vacuously over an empty match.
  expect(filesWithRoleInk.length).toBeGreaterThan(0);

  for (const file of filesWithRoleInk) {
    const content = readFileSync(file, "utf8");
    expect(
      content,
      `${file} puts a role ink on text but its useSketchFrame call has no stroke: "var(--hc-ink)"`,
    ).toMatch(strokePattern);
  }
});

// ---------------------------------------------------------------------------
// R1 to R5 — cycle 002b. The size ramps, the type scale and the two spacing
// floors, cross-checked against what components actually ship.
//
// `ramps.ts` is imported by no component and exported from no barrel, so
// these five assertions are its only consumer. That is deliberate: the file
// exists so the doctrine's numbers live somewhere a test can read, while the
// components keep the literal Tailwind strings a user who ejects them can
// still edit.
// ---------------------------------------------------------------------------

/** The two interactive touch-target literals, frozen from DESIGN-SYSTEM.md §4
 * rather than derived, so a typo in `ramps.ts` cannot agree with itself. */
const TOUCH_AAA = "AAA (>=44)";
const TOUCH_AA = "AA (>=24, spacing rule applies)";

/**
 * Tailwind's `--spacing` is 0.25rem against a 16px root, so a spacing
 * utility's suffix is its pixel value over four. Written as division rather
 * than a lookup table on purpose: a ramp value off the 4px grid then produces
 * a suffix no Tailwind class carries — 36 gives `h-9`, 38 gives `h-9.5` — and
 * the containment check fails loudly instead of quietly matching nothing.
 */
function spacingClass(prefix: string, px: number): string {
  return `${prefix}-${px / 4}`;
}

/** The type step at this pixel size, or `undefined`. R1 and R3 both need the
 * miss to fail an assertion rather than throw, so this does not use `!`. */
function typeUtilityFor(px: number): string | undefined {
  return Object.values(TYPE_SCALE).find((step) => step.px === px)?.utility;
}

/**
 * Reduces a source file to only the text that can actually become a class:
 * comments stripped, then the contents of its double-quoted string literals.
 *
 * Both steps are load-bearing and the first one is here because the naive
 * version was caught by its own mutation. Cycle 002b ships a comment above
 * Input's `className` reading "px-4 is the control ramp's `md` padding", and
 * Checkbox's says "gap-2 is the control ramp's `md` gap". A check that reads
 * raw file text therefore finds `px-4` in `input.tsx` whether or not the
 * element still carries it — reverting `px-4` to `px-3` left this test green.
 * That is `QA-CONTRACT.md` Rule V3 in source-read form: a comment documenting
 * a value is not the value, and a guard that cannot tell them apart guards
 * nothing.
 *
 * The `[^:"'\`\\]` guard on the line-comment pattern keeps a `//` inside a
 * URL from eating the rest of its line.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "\n").replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, "$1");
}

function classSource(source: string): string {
  return (stripComments(source).match(/"[^"\n]*"/g) ?? []).join(" ");
}

/**
 * Whole-token class match. A plain `includes` would let `px-4` match inside
 * `px-40` and `gap-2` match inside `gap-2.5` — and `gap-2.5` is the exact
 * value cycle 002b replaced in Checkbox, so a substring check would have made
 * that regression guard vacuous on the very string it guards.
 */
function hasClass(source: string, className: string): boolean {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w.-])`).test(source);
}

const registryRoot = resolve(process.cwd(), "../../registry/default");

/** A component's applied class text, with the vacuity floor attached: a path
 * that resolves but yields nothing would fail every positive check below for
 * the wrong reason, and the assertion here says which. */
function registryClasses(relativePath: string): string {
  const content = readFileSync(join(registryRoot, relativePath), "utf8");
  expect(content.length, `${relativePath} read empty`).toBeGreaterThan(0);
  const classes = classSource(content);
  expect(classes.length, `${relativePath} yielded no class text`).toBeGreaterThan(0);
  return classes;
}

it("R1 — CONTROL_RAMP matches DESIGN-SYSTEM.md §4 and every row's type is a TYPE_SCALE step", () => {
  // Frozen literals of §4's control-ramp table. R3 anchors the shipped class
  // strings to `CONTROL_RAMP` and this anchors `CONTROL_RAMP` to the
  // doctrine, so the two ends of that chain are checked against different
  // sources rather than against each other.
  const expected = {
    sm: { height: 36, padX: 12, type: 14, gap: 6 },
    md: { height: 44, padX: 16, type: 16, gap: 8 },
    lg: { height: 48, padX: 24, type: 18, gap: 10 },
  };

  // Reads the control ramp only. If it also read TOKEN_RAMP, the mutation on
  // Badge's height would fail this test and R4 together and neither would be
  // isolating what it claims — DESIGN-SYSTEM.md §4's whole reason for two
  // ramps is that Badge's height answers to the taper gate, not to §4's
  // control table.
  expect(Object.keys(CONTROL_RAMP)).toEqual(["sm", "md", "lg"]);

  for (const [size, spec] of Object.entries(expected)) {
    const row = CONTROL_RAMP[size as keyof typeof CONTROL_RAMP];
    expect(row.height, `${size} height`).toBe(spec.height);
    expect(row.padX, `${size} padding-x`).toBe(spec.padX);
    expect(row.type, `${size} type`).toBe(spec.type);
    expect(row.gap, `${size} gap`).toBe(spec.gap);
  }

  for (const [size, row] of Object.entries(CONTROL_RAMP)) {
    expect(
      typeUtilityFor(row.type),
      `${size}'s ${row.type}px type is on no TYPE_SCALE step`,
    ).toBeDefined();
  }
});

it("R2 — touch, denseDesktopOnly and hand are derived from their own numbers, not declared beside them", () => {
  for (const [size, row] of Object.entries(CONTROL_RAMP)) {
    expect([TOUCH_AAA, TOUCH_AA], `${size} touch is not one of the two literals`).toContain(
      row.touch,
    );
    // The house rule is 44px (WCAG 2.5.5, Level AAA). 2.5.8's 24px Level AA
    // floor is what `sm` at 36px actually clears, which is why `sm` is
    // dense-desktop-only rather than a compliance defect.
    expect(row.touch, `${size} touch disagrees with its own ${row.height}px height`).toBe(
      row.height >= 44 ? TOUCH_AAA : TOUCH_AA,
    );
    expect(
      row.denseDesktopOnly,
      `${size} denseDesktopOnly disagrees with its own ${row.height}px height`,
    ).toBe(row.height < 44);
  }

  expect(TOKEN_RAMP.xs.touch).toBe("non-interactive");
  // Absent rather than false. Dense-desktop-only is a property of an
  // interactive control's touch target, and a non-interactive token has none.
  expect(Object.keys(TOKEN_RAMP.xs)).not.toContain("denseDesktopOnly");

  for (const [name, step] of Object.entries(TYPE_SCALE)) {
    expect(step.hand, `${name} at ${step.px}px disagrees with the 18px hand-face floor`).toBe(
      step.px >= 18,
    );
  }

  // Closed on purpose — a list that can grow is not lintable, and
  // DESIGN-SYSTEM.md §2 says adding a fourth is a doctrine amendment.
  expect(HAND_FACE_EXCEPTIONS).toEqual(["badge-text", "label-text", "button-label"]);
});

it("R3 — Button, Input and Checkbox ship class strings that decode to CONTROL_RAMP", () => {
  // A walk resolving to the wrong path returns an empty list and passes green
  // over nothing. Seven components ship today; assert the floor before any
  // check below can mean anything.
  expect(collectSourceFiles(registryRoot).length).toBeGreaterThanOrEqual(7);

  // Button's three rows live in one object literal, so they are located in
  // the raw file and then comment-stripped, rather than read out of the
  // flattened class text every other component uses.
  const buttonRaw = readFileSync(join(registryRoot, "ui/button/button.tsx"), "utf8");
  const inputSrc = registryClasses("ui/input/input.tsx");
  const checkboxSrc = registryClasses("ui/checkbox/checkbox.tsx");

  const sizesStart = buttonRaw.indexOf("const SIZES = {");
  expect(sizesStart, "button.tsx has no `const SIZES = {` block").toBeGreaterThanOrEqual(0);
  const sizesEnd = buttonRaw.indexOf("} as const;", sizesStart);
  expect(sizesEnd, "button.tsx's SIZES block is not closed by `} as const;`").toBeGreaterThan(
    sizesStart,
  );
  const sizesBlock = stripComments(buttonRaw.slice(sizesStart, sizesEnd));
  expect(sizesBlock.length, "button.tsx's SIZES block read empty").toBeGreaterThan(0);

  let rowsChecked = 0;
  for (const [size, row] of Object.entries(CONTROL_RAMP)) {
    const match = sizesBlock.match(new RegExp(`\\b${size}:\\s*"([^"]+)"`));
    expect(match, `button.tsx's SIZES has no \`${size}\` row`).not.toBeNull();
    const classes = match![1]!.trim().split(/\s+/);

    expect(classes, `Button ${size} height`).toContain(spacingClass("h", row.height));
    expect(classes, `Button ${size} padding-x`).toContain(spacingClass("px", row.padX));
    expect(classes, `Button ${size} gap`).toContain(spacingClass("gap", row.gap));

    const utility = typeUtilityFor(row.type);
    expect(utility, `Button ${size}'s ${row.type}px type is on no TYPE_SCALE step`).toBeDefined();
    expect(classes, `Button ${size} type`).toContain(utility);
    rowsChecked++;
  }
  expect(rowsChecked, "no SIZES row was checked").toBe(3);

  // Input and Checkbox each ship the `md` row only, spread across more than
  // one string literal, so they are matched as whole class tokens in the file
  // rather than parsed out of one array.
  const md = CONTROL_RAMP.md;
  const mdHeight = spacingClass("h", md.height);
  const mdType = typeUtilityFor(md.type);
  expect(mdType, `md's ${md.type}px type is on no TYPE_SCALE step`).toBeDefined();

  expect(hasClass(inputSrc, mdHeight), `input.tsx is missing ${mdHeight}`).toBe(true);
  expect(
    hasClass(inputSrc, spacingClass("px", md.padX)),
    `input.tsx is missing ${spacingClass("px", md.padX)} — the ramp's md padding is ${md.padX}px`,
  ).toBe(true);
  expect(hasClass(inputSrc, mdType!), `input.tsx is missing ${mdType}`).toBe(true);

  // Checkbox's height is a minimum because the drawn box is 20px and the row
  // is padded up to it, so the class carries a `min-` prefix the ramp does not.
  expect(hasClass(checkboxSrc, `min-${mdHeight}`), `checkbox.tsx is missing min-${mdHeight}`).toBe(
    true,
  );
  expect(
    hasClass(checkboxSrc, spacingClass("gap", md.gap)),
    `checkbox.tsx is missing ${spacingClass("gap", md.gap)} — the ramp's md gap is ${md.gap}px`,
  ).toBe(true);
});

it("R4 — Badge decodes to TOKEN_RAMP, and 24px stays on the quiet side of the corner-pooling gate", () => {
  expect(collectSourceFiles(registryRoot).length).toBeGreaterThanOrEqual(7);

  // Comment-stripped for the same reason R3 is: badge.tsx's own comment block
  // names `h-6`, `min-w-6`, `text-sm` and `h-7` in prose, so a raw file read
  // would satisfy every check below out of the documentation rather than out
  // of the element.
  const badgeSrc = registryClasses("ui/badge/badge.tsx");
  const checkboxSrc = registryClasses("ui/checkbox/checkbox.tsx");

  // DESIGN-SYSTEM.md §4's token-ramp row, frozen. Reads the token ramp only —
  // the mirror of R1's control-ramp-only rule, and the reason a mutation to
  // either ramp isolates to one of the two tests.
  const xs = TOKEN_RAMP.xs;
  expect(xs.height).toBe(24);
  expect(xs.padX).toBe(8);
  expect(xs.type).toBe(14);
  expect(xs.gap).toBe(6);

  expect(hasClass(badgeSrc, spacingClass("h", xs.height))).toBe(true);
  // `min-w-6` keeps width the larger term, which is what pins `min(w, h)` at
  // the height for every badge rather than letting a one-character badge
  // drift into a different taper regime.
  expect(hasClass(badgeSrc, spacingClass("min-w", xs.height))).toBe(true);
  expect(hasClass(badgeSrc, spacingClass("px", xs.padX))).toBe(true);
  expect(hasClass(badgeSrc, spacingClass("gap", xs.gap))).toBe(true);
  const xsType = typeUtilityFor(xs.type);
  expect(xsType, `the token ramp's ${xs.type}px type is on no TYPE_SCALE step`).toBeDefined();
  expect(hasClass(badgeSrc, xsType!)).toBe(true);

  // generator.ts pins TAPER_PIVOT at 44 and gates corner pooling at k > 0.55,
  // so the threshold height is 24.2px and Badge sits 0.2px under it. Asserted
  // from both sides: a ramp edit that raised the height to 26 would cross the
  // gate and switch four corner dots on across every badge in every
  // consumer's app, with no error and no other test failing.
  expect(taperForSize(xs.height, 999).k).toBeCloseTo(0.545454, 5);
  expect(taperForSize(xs.height, 999).k).toBeLessThan(0.55);
  expect(taperForSize(26, 999).k).toBeGreaterThan(0.55);

  // Checkbox's drawn box is the same shape with 4.2px more room. 20 is not a
  // ramp value on either ramp; it is a geometry pin, and cycle 005 moved it
  // out of this local literal into `ramps.ts`'s `GEOMETRY_PINS` so that
  // `hc/no-off-scale-class`'s allowance list has a home a test can read. Read
  // from there rather than repeated here: a local `20` would let the exported
  // pin drift away from the number this assertion actually checks, which is
  // the drift R6 below exists to catch one level further out.
  const CHECKBOX_BOX_PX = GEOMETRY_PINS.checkboxBox;
  expect(hasClass(checkboxSrc, spacingClass("size", CHECKBOX_BOX_PX))).toBe(true);
  expect(taperForSize(CHECKBOX_BOX_PX, CHECKBOX_BOX_PX).k).toBeCloseTo(0.454545, 5);
  expect(taperForSize(CHECKBOX_BOX_PX, CHECKBOX_BOX_PX).k).toBeLessThan(0.55);
});

it("R5 — the two spacing floors agree between handicraft.css and ramps.ts", () => {
  expect(SPACING.gapFrame).toBe(24);
  expect(SPACING.padPage).toBe(12);
  // Two facing frames each contribute one excursion; a page edge faces one.
  // The relationship is the derivation, so it is asserted rather than left as
  // a coincidence of two independent literals.
  expect(SPACING.gapFrame).toBe(SPACING.padPage * 2);

  // The stylesheet is the second home of both numbers and nothing in the type
  // system connects the two, which is the Rule R2 drift shape.
  expect(pxInBlock(":root", "gap-frame")).toBe(`${SPACING.gapFrame}px`);
  expect(pxInBlock(":root", "pad-page")).toBe(`${SPACING.padPage}px`);
});

// ---------------------------------------------------------------------------
// R6 — cycle 005. `hc/no-off-scale-class`'s constants against `ramps.ts`.
//
// `packages/eslint-config/handicraft-rules.js` hand-copies these five tables
// rather than importing `ramps.ts`, and its own header says why: importing
// would make one file the source of truth for both sides of the comparison
// and erase the drift this test exists to catch. So the copy is deliberate
// and this is what pays for it — the same shape as R5 and
// `tier-agreement.test.ts`, two independently authored homes for one number
// with nothing in the type system connecting them.
//
// The tables are compared rather than spot-checked, so a value added to
// either side without the other fails here rather than at whichever component
// happens to use it next.
// ---------------------------------------------------------------------------

it("R6 — hc/no-off-scale-class's constants agree with ramps.ts", () => {
  const { SIZE_PX, PAD_X_PX, TYPE_UTILITIES, SUB_18_TYPE_UTILITIES, HAND_FACE_EXCEPTION_FILES } =
    handicraftRules as {
      SIZE_PX: number[];
      PAD_X_PX: number[];
      TYPE_UTILITIES: string[];
      SUB_18_TYPE_UTILITIES: string[];
      HAND_FACE_EXCEPTION_FILES: string[];
    };

  /** The rules file stores each table sorted ascending with duplicates
   *  collapsed — `SPACING.padPage` is 12 and so is `CONTROL_RAMP.sm.padX`.
   *  Derive the same normal form here rather than hand-writing the expected
   *  array, or this test would be a third home for the numbers instead of a
   *  comparison of the two that exist. */
  const sortedUnique = (values: number[]): number[] => [...new Set(values)].sort((a, b) => a - b);

  expect(SIZE_PX, "SIZE_PX is not the ramps' heights plus the two geometry pins").toEqual(
    sortedUnique([
      ...Object.values(CONTROL_RAMP).map((row) => row.height),
      TOKEN_RAMP.xs.height,
      ...Object.values(GEOMETRY_PINS),
    ]),
  );

  expect(PAD_X_PX, "PAD_X_PX is not the ramps' padX plus the page padding floor").toEqual(
    sortedUnique([
      ...Object.values(CONTROL_RAMP).map((row) => row.padX),
      TOKEN_RAMP.xs.padX,
      SPACING.padPage,
    ]),
  );

  // Order matters here and is asserted rather than normalised: TYPE_SCALE is
  // declared smallest to largest, and a rules-file copy that lost that order
  // would still lint correctly today while reading as a different table to
  // the next person who diffs the two files.
  expect(TYPE_UTILITIES, "TYPE_UTILITIES is not every TYPE_SCALE step's utility").toEqual(
    Object.values(TYPE_SCALE).map((step) => step.utility),
  );

  expect(
    SUB_18_TYPE_UTILITIES,
    "SUB_18_TYPE_UTILITIES is not exactly the TYPE_SCALE steps whose hand is false",
  ).toEqual(
    Object.values(TYPE_SCALE)
      .filter((step) => !step.hand)
      .map((step) => step.utility),
  );

  // Compared by length, not by value. `HAND_FACE_EXCEPTIONS` names surfaces
  // ("badge-text") and `HAND_FACE_EXCEPTION_FILES` names path fragments
  // ("ui/badge/") — different vocabularies for one closed list, so the only
  // thing that can be checked mechanically is that neither grew without the
  // other. DESIGN-SYSTEM.md §2 says a fourth entry is a doctrine amendment;
  // this is what makes adding one to the lint rule alone fail a gate.
  expect(
    HAND_FACE_EXCEPTION_FILES.length,
    "the lint rule's exception list and ramps.ts's disagree on how many exceptions exist",
  ).toBe(HAND_FACE_EXCEPTIONS.length);
});

// ---------------------------------------------------------------------------
// E1 to E4 — cycle 002c. The `on-page` elevation level, and the CardFooter
// collision floor 002b routed here.
//
// `E` marks the cycle, not the subject: E1 to E3 are elevation, E4 is the
// footer gap. DESIGN-SYSTEM.md §5 defines two elevation levels and only
// `on-page` has a consumer today, so these assertions cover the shipped level
// and hold the door shut on the absent one.
// ---------------------------------------------------------------------------

it("E1 — the on-page shadow is a 3px offset with a literally zero blur, composed from one token", () => {
  expect(pxInBlock(":root", "shadow-offset")).toBe("3px");

  // Split on whitespace rather than parsed: `var(--hc-shadow-offset)` carries
  // no internal space, so the four positional parts of a box-shadow are
  // recoverable without a CSS parser. Length is asserted first because a
  // four-part shape is what makes indexing parts[2] mean "blur radius" at all.
  const shadow = pxInBlock(":root", "shadow").split(/\s+/);
  expect(shadow.length, `--hc-shadow is not a four-part box-shadow: ${shadow.join(" ")}`).toBe(4);

  // Both offsets read the token rather than repeating `3px`. If they were
  // literals, E3's drift check would be comparing button.tsx against a number
  // that no longer has a single home, and the pair could disagree three ways
  // instead of two.
  expect(shadow[0], "--hc-shadow x offset does not read --hc-shadow-offset").toBe(
    "var(--hc-shadow-offset)",
  );
  expect(shadow[1], "--hc-shadow y offset does not read --hc-shadow-offset").toBe(
    "var(--hc-shadow-offset)",
  );

  // The literal `0`, not `0px` and not a length. A blur radius is the one
  // property that would make this read as a rendered UI drop shadow rather
  // than as a sheet of paper lifted off the page, which is the whole aesthetic
  // claim DESIGN-SYSTEM.md §5 makes for this level.
  expect(shadow[2], "--hc-shadow has a non-zero blur radius").toBe("0");
  expect(shadow[3], "--hc-shadow is not drawn in ink").toBe("var(--hc-ink)");

  const shadowSm = pxInBlock(":root", "shadow-sm").split(/\s+/);
  expect(shadowSm.length, `--hc-shadow-sm is not a four-part box-shadow`).toBe(4);
  expect(shadowSm[2], "--hc-shadow-sm has a non-zero blur radius").toBe("0");
});

it("E2 — paper tokens cannot carry elevation alone: every raised/sunken pair is under 3:1", () => {
  // DESIGN-SYSTEM.md §5's `over-page` level is deliberately unbuilt, and the
  // obvious shortcut for an overlay author is to reach for --hc-paper-raised
  // and call the job done. These three surfaces are a depth *hint* on top of a
  // frame that already identifies the component; none of them is separable
  // enough to identify one on its own. 3:1 is the floor any non-text
  // component-identifying signal has to clear, so measuring under it is the
  // evidence that the shortcut does not work.
  //
  // Asserted as a bound rather than at the six filed figures on purpose. The
  // worst pair measures about 1.24 and the ceiling is 3.0, so a hundredth of
  // drift in the compositing model cannot make this flaky — where pinning the
  // figures would have made it a tripwire for model precision instead of for
  // the claim.
  let checked = 0;
  for (const selector of [":root", ".dark"] as const) {
    const theme = selector === ":root" ? "light" : "dark";
    const paper = renderToken(selector, "paper");
    const raised = renderToken(selector, "paper-raised");
    const sunken = renderToken(selector, "paper-sunken");

    const pairs: [string, number][] = [
      [`${theme} raised vs paper`, contrastRatio(raised.rgb8, paper.rgb8)],
      [`${theme} sunken vs paper`, contrastRatio(sunken.rgb8, paper.rgb8)],
      [`${theme} raised vs sunken`, contrastRatio(raised.rgb8, sunken.rgb8)],
    ];

    for (const [label, ratio] of pairs) {
      expect(
        ratio,
        `${label} measures ${ratio.toFixed(6)} — a paper token now clears 3:1 and could be mistaken for a component-identifying signal, which is what DESIGN-SYSTEM.md §5's over-page level exists to carry`,
      ).toBeLessThan(3.0);
      checked++;
    }
  }
  // Three pairs in two themes. A loop that measured fewer would pass the bound
  // over whatever it happened to reach.
  expect(checked, "not every raised/sunken pair was measured").toBe(6);
});

it("E3 — Button's press offset is the shadow offset, read from the stylesheet rather than pinned", () => {
  // A walk resolving to the wrong path returns an empty list and passes green
  // over nothing. Seven components ship today; assert the floor first.
  expect(collectSourceFiles(registryRoot).length).toBeGreaterThanOrEqual(7);

  // The token is the source of truth and this test derives from it. Pinning
  // `3` here instead would make the pair agree with the test rather than with
  // each other, and a token edit would then move the shadow while leaving the
  // press offset behind with nothing red.
  const offset = pxInBlock(":root", "shadow-offset");
  const offsetMatch = offset.match(/^([\d.]+)px$/);
  expect(offsetMatch, `--hc-shadow-offset is not a px length: ${offset}`).not.toBeNull();
  const offsetPx = Number(offsetMatch![1]);
  expect(Number.isFinite(offsetPx) && offsetPx > 0, `--hc-shadow-offset is not usable`).toBe(true);

  // Comment-stripped, because the stylesheet comment two files away is not the
  // only place this number is written in prose and a raw read would eventually
  // find one.
  const buttonSrc = registryClasses("ui/button/button.tsx");

  // Extracted and compared numerically rather than checked for containment, so
  // a failure says which two numbers disagree instead of only that one string
  // is missing. Nothing in the type system connects a CSS length to a Tailwind
  // arbitrary value — the same Rule R2 drift shape --hc-stroke-w already
  // answers for against engine/generator.ts.
  for (const axis of ["x", "y"] as const) {
    const match = buttonSrc.match(new RegExp(`active:translate-${axis}-\\[([\\d.]+)px\\]`));
    expect(match, `button.tsx has no active:translate-${axis}-[<n>px] press offset`).not.toBeNull();
    expect(
      Number(match![1]),
      `button.tsx presses ${match![1]}px on ${axis} but --hc-shadow-offset is ${offsetPx}px, so the button lands beside its own shadow rather than on it`,
    ).toBe(offsetPx);
  }
});

it("E4 — CardFooter ships the gap that SPACING.gapFrame decodes to, not the 8px it collided at", () => {
  expect(collectSourceFiles(registryRoot).length).toBeGreaterThanOrEqual(7);

  const cardSrc = registryClasses("ui/card/card.tsx");
  const expectedGap = spacingClass("gap", SPACING.gapFrame);
  expect(expectedGap, "SPACING.gapFrame no longer decodes to a 4px-grid utility").toBe("gap-6");

  expect(
    hasClass(cardSrc, expectedGap),
    `card.tsx is missing ${expectedGap} — DESIGN-SYSTEM.md §3's ${SPACING.gapFrame}px collision floor is what a footer's two facing drawn frames need`,
  ).toBe(true);

  // The regression guard for the filed bug, and simultaneously a live test of
  // the comment-stripping reader. card.tsx's shipped comment writes
  // `className="gap-2"` in prose — it is the documented override for a
  // text-only footer — so a raw-text read finds `gap-2` whether or not the
  // element carries it. This assertion is red against an unstripped reader and
  // green against the real one, which is the only way to know the stripper is
  // still doing its job.
  expect(
    hasClass(cardSrc, "gap-2"),
    "card.tsx's applied class text contains gap-2 — either the footer regressed to the 8px that measured -2.13px of clearance, or stripComments stopped stripping and this guard is now reading the comment",
  ).toBe(false);
});

// ---------------------------------------------------------------------------
// E5 — cycle 002c, iteration 2. The composed-token rule.
//
// A custom property's `var()` references are substituted where that property is
// declared, and descendants inherit the already-resolved string. So a token
// composed only in `:root` freezes whatever `:root` resolved and no theme block
// downstream can reach it. That shipped: `--hc-shadow` rendered the light ink on
// the blackboard at 1.0054:1 against a ground where the intended chalk reads
// 12.9270:1, forced by both colours being authored at 24% lightness.
//
// The browser is how a defect of this class gets found once. This is how it
// stops coming back — the source condition is static, so it is checkable here
// across the whole class at no runtime cost, rather than one token at a time in
// a browser.
// ---------------------------------------------------------------------------

/**
 * `handicraft.css` with every block comment removed.
 *
 * E5 *enumerates* declarations where every other reader in this file looks one
 * up by name, and that difference is what makes the shared readers unusable
 * here. `css.indexOf(":root")` lands on the literal `:root` inside the file
 * header comment at `:6`, so `oklchInBlock` and `pxInBlock` slice from
 * `@layer base {` rather than from the selector — a superset that happens to
 * contain the real block whole. Harmless when the caller names its token,
 * wrong when the caller is counting.
 *
 * Stripping first also deletes the two false `:root` hits in the header and the
 * one inside `.dark`'s own comment at `:190`, which is what lets the uniqueness
 * guard in `declarationsIn` be an assertion rather than a hope.
 *
 * The shared readers are deliberately left alone. Teaching them to strip
 * comments would close three filed traps at once, and it would also change a
 * reader fifteen existing assertions depend on, so it needs its own mutation
 * pass over all of them rather than a ride-along here.
 */
const bareCss = css.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Every `--hc-<name>` declared directly inside one selector's block, mapped to
 * its trimmed value text.
 *
 * Known limit, marked rather than hidden: the two block names are hard-coded by
 * the caller. A third theme block would have to be added to E5's list by hand.
 * There is exactly one theme block today and adding one is a deliberate act,
 * where a general block enumerator is how this file's slicing bugs arrived in
 * the first place.
 */
function declarationsIn(selector: ":root" | ".dark"): Map<string, string> {
  const start = bareCss.indexOf(selector);
  expect(start, `no ${selector} block found`).toBeGreaterThanOrEqual(0);

  // Ambiguity is the one failure this cannot absorb: a second occurrence would
  // silently make the slice below depend on which one the file happens to
  // reach first, which is the Rule V3 shape the readers above already carry.
  expect(
    bareCss.lastIndexOf(selector),
    `${selector} appears more than once outside comments — the slice below is no longer unambiguous`,
  ).toBe(start);

  const braceOpen = bareCss.indexOf("{", start);
  const braceClose = bareCss.indexOf("}", braceOpen);
  const block = bareCss.slice(braceOpen, braceClose);
  expect(block.length, `${selector} block read empty`).toBeGreaterThan(0);

  const out = new Map<string, string>();
  for (const m of block.matchAll(/--hc-([a-z0-9-]+):\s*([^;]+);/g)) {
    out.set(m[1]!, m[2]!.trim());
  }
  return out;
}

it("E5 — a composed token is redeclared, identically, in every theme block whose tokens it reads", () => {
  const root = declarationsIn(":root");
  const dark = declarationsIn(".dark");

  // A slice that resolved to the wrong block returns an empty map, and every
  // check below then passes over nothing. Counted at cycle 002c iteration 2:
  // :root declares 34 and .dark declares 23, so both floors carry margin for
  // ordinary token work rather than tripping on the next token anyone adds.
  expect(root.size, ":root read empty or truncated").toBeGreaterThanOrEqual(30);
  expect(dark.size, ".dark read empty or truncated").toBeGreaterThanOrEqual(20);

  // A count alone cannot tell a whole block from a truncated one that happens
  // to be long enough, so both ends are named. --hc-paper opens each block, and
  // --hc-pad-page is the marker for :root. For .dark the end marker is
  // --hc-stroke-w-strong — the last declaration that predates cycle 002c's fix —
  // deliberately not the redeclared shadow tokens, which are the thing under test.
  //
  // --hc-pad-page stopped being the *last* :root declaration in cycle 009, which
  // appended the motion tokens, --hc-opacity-disabled and --hc-shadow-hover after
  // it. The assertion is unaffected — the slice runs to the block's closing brace
  // and this only has to land inside it — but "closes :root" was the wrong word
  // for what it does, and a marker described as an end marker is one someone will
  // eventually move to keep it last.
  expect(root.has("paper") && root.has("pad-page"), ":root slice does not span the block").toBe(
    true,
  );
  expect(
    dark.has("paper") && dark.has("stroke-w-strong"),
    ".dark slice does not span the block",
  ).toBe(true);
  expect(dark.has("ink"), ".dark no longer overrides --hc-ink").toBe(true);

  // The composed set is discovered, not named: any :root declaration whose
  // value substitutes another token. A third composed token is then covered on
  // the day it lands rather than on the day someone remembers it exists.
  const composed = new Map<string, string[]>();
  for (const [name, value] of root) {
    const deps = [...value.matchAll(/var\(\s*--hc-([a-z0-9-]+)\s*\)/g)].map((m) => m[1]!);
    if (deps.length > 0) composed.set(name, deps);
  }

  // Measured, not guessed: :root carries exactly two composed declarations,
  // handicraft.css:148 and :149, and both read --hc-ink. Written as a lower
  // bound and two names rather than as an exact count, because a third composed
  // token should join the covered set instead of tripping the floor.
  expect(
    composed.size,
    "no composed declarations found in :root — the scan resolved to the wrong block",
  ).toBeGreaterThanOrEqual(2);
  expect(composed.has("shadow"), "--hc-shadow is no longer composed from other tokens").toBe(true);
  expect(composed.has("shadow-sm"), "--hc-shadow-sm is no longer composed from other tokens").toBe(
    true,
  );

  let checked = 0;
  for (const [name, deps] of composed) {
    const overridden = deps.filter((dep) => dark.has(dep));
    if (overridden.length === 0) continue;
    const reads = overridden.map((dep) => `--hc-${dep}`).join(", ");

    expect(
      dark.has(name),
      `--hc-${name} composes ${reads}, which .dark overrides, but .dark does not redeclare --hc-${name}. Its var() references are substituted at :root, so it inherits the light value into the blackboard and this theme's own ink can never reach it`,
    ).toBe(true);

    // Present is not enough, and this is the clause that matters. A hard-coded
    // chalk value here would resolve correctly in a browser and look right,
    // while giving the token a second home to drift from — the fix that
    // reintroduces, inside the fix, the defect being fixed.
    expect(
      dark.get(name),
      `.dark's --hc-${name} is not textually identical to :root's, so the value now has two homes. Redeclaring must re-run the same composition at this level, never hard-code what it currently resolves to`,
    ).toBe(root.get(name));

    checked++;
  }

  // Both shadow tokens depend on --hc-ink, which .dark overrides, so both must
  // have been reached. A loop that reached neither would satisfy every
  // assertion above it.
  expect(
    checked,
    "no composed token was actually checked against .dark — the dependency intersection came back empty",
  ).toBeGreaterThanOrEqual(2);
});
