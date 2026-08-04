import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FILL_LEVELS } from "../engine/generator";

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
// D7 — no text-hc-ink-faint in shipped or playground source
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

it("D7 — no text-hc-ink-faint in registry/default or apps/playground/app source", () => {
  const registryDir = resolve(process.cwd(), "../../registry/default");
  const playgroundDir = resolve(process.cwd(), "../../apps/playground/app");

  const registryFiles = collectSourceFiles(registryDir);
  const playgroundFiles = collectSourceFiles(playgroundDir);

  // A walk resolving to the wrong path returns an empty list and passes
  // green over nothing — QA-CONTRACT.md's "a filter matching nothing still
  // exits 0", in file-walk form. Assert real floors before the negative
  // check below can mean anything.
  expect(registryFiles.length).toBeGreaterThanOrEqual(7);
  expect(playgroundFiles.length).toBeGreaterThanOrEqual(6);

  for (const file of [...registryFiles, ...playgroundFiles]) {
    const content = readFileSync(file, "utf8");
    expect(content, `${file} still uses text-hc-ink-faint`).not.toContain("text-hc-ink-faint");
  }
});

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
