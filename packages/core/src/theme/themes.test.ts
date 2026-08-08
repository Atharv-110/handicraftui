import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { expect, it } from "vitest";
import {
  HandicraftProvider,
  useHandicraft,
  type HandicraftConfig,
  type HandicraftProviderProps,
} from "./context";
import { BLACKBOARD_TREATMENT, THEMES, type TextureProfile } from "./themes";

/**
 * TH5 and TH7 — cycle 013. The texture profile, and the provider's resolution.
 *
 * The refactor these guard is value-preserving by construction: four literals
 * that lived inside `generator.ts`'s `compose` became a per-theme
 * `TextureProfile`, and blackboard's profile carries exactly the four numbers
 * that used to be inline. "By construction" is the claim, not the evidence, so
 * both halves are asserted here — that the numbers did not move, and that the
 * literals genuinely left `compose` rather than being shadowed by a profile
 * nothing reads.
 *
 * No Rule V3 tier-2 concern: nothing in this file renders a `.hc-frame` or
 * calls into rough.js, so there is no `ResizeObserver` to stub and no
 * generated geometry to prove activated. TH5's second half is a source read
 * rather than a behavioural one, and that is a real limit rather than a
 * preference — `compose` is module-private, so the only way to observe which
 * of the four numbers it multiplied by is to render tier 2 and measure the
 * result, which is what the 22 dark tier-2 matrix cells do in a browser.
 * MU-6's declared Playwright count is that half of the evidence; this file
 * carries the half that fails fast and names the constant.
 */

const generatorSrc = readFileSync(resolve(process.cwd(), "src/engine/generator.ts"), "utf8");

/** `generator.ts` with block and line comments removed. The four constants are
 *  named in this file's own prose and in `compose`'s explanatory comments, so a
 *  raw-text read would find `1.3` whether or not any code still multiplies by
 *  it — cycle 008's trap, one file over. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "\n").replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, "$1");
}

const generatorCode = stripComments(generatorSrc);

/** `compose`'s body alone. The four literals are legal elsewhere in the file —
 *  `taperForSize` and `FILL_LEVELS` carry their own numbers — so a
 *  whole-file search for `0.13` would be a different, weaker claim than the one
 *  TH5 makes. */
function composeBody(): string {
  const start = generatorCode.indexOf("function compose(");
  expect(start, "compose() not found in generator.ts").toBeGreaterThanOrEqual(0);
  const next = generatorCode.indexOf("\nfunction ", start + 1);
  return generatorCode.slice(start, next === -1 ? undefined : next);
}

it("TH5 — blackboard's treatment is the four shipped literals, and compose no longer carries them", () => {
  // Half one: the numbers did not move. Written out rather than compared to a
  // constant imported from the same module, which would assert only that a
  // value equals itself. These four are the pre-cycle-013 literals, read from
  // `generator.ts` at `:443`, `:446`, `:487` and `:507` before the refactor.
  const shipped: TextureProfile = {
    dustStrokeBoost: 2.6,
    dustOpacity: 0.13,
    hachureGapScale: 1.3,
    inkOpacity: 0.92,
  };
  expect(
    THEMES["blackboard"]!.treatment,
    "blackboard's texture profile no longer carries the four values compose() shipped with, so the refactor stopped being value-preserving and every dark tier-2 baseline is now wrong",
  ).toEqual(shipped);

  // The exported constant and the registry entry must be the same object, not
  // two copies of four numbers. `generator.ts` falls back to
  // BLACKBOARD_TREATMENT for a caller passing `chalk` with no texture opinion,
  // and if that were a second literal copy it could drift from the registry's
  // — the `--hc-stroke-w` versus `BASE_STROKE_WIDTH` shape this project already
  // needs a whole test file to guard.
  expect(
    THEMES["blackboard"]!.treatment,
    "BLACKBOARD_TREATMENT and THEMES.blackboard.treatment are no longer the same object, so the engine fallback and the theme registry can drift apart",
  ).toBe(BLACKBOARD_TREATMENT);

  // Half two, and the half that catches a profile nothing reads. A `compose`
  // that still multiplied by a literal would satisfy every assertion above
  // while ignoring the theme entirely.
  const body = composeBody();
  for (const [name, literal] of [
    ["dustStrokeBoost", "2.6"],
    ["dustOpacity", "0.13"],
    ["hachureGapScale", "1.3"],
    ["inkOpacity", "0.92"],
  ] as const) {
    expect(
      body.includes(`texture.${name}`),
      `compose() no longer reads texture.${name} — the theme declares it and the engine ignores it, which is a profile that exists and does nothing`,
    ).toBe(true);
    expect(
      body.includes(literal),
      `compose() still carries the literal ${literal} — the constant has two homes again and the per-theme profile is decoration`,
    ).toBe(false);
  }

  // Notebook's profile is inert rather than absent, and every value is
  // individually a no-op. Asserted because "inert" is a claim about these four
  // numbers specifically: a non-zero dustOpacity here would paint a dust pass
  // on paper the moment any caller turned chalk on against notebook.
  expect(THEMES["notebook"]!.treatment, "notebook's treatment is no longer inert").toEqual({
    dustStrokeBoost: 0,
    dustOpacity: 0,
    hachureGapScale: 1,
    inkOpacity: 1,
  });
  expect(THEMES["notebook"]!.chalk, "notebook is no longer the non-chalk theme").toBe(false);
});

// ---------------------------------------------------------------------------
// TH7 — what the provider resolves, in both directions
// ---------------------------------------------------------------------------

/**
 * `createElement` rather than JSX so this file keeps the `.ts` extension the
 * cycle document assigns it. Two elements is the whole tree; a `.tsx` rename
 * would buy nothing but a wider diff.
 */
function resolvedConfig(props: Partial<HandicraftProviderProps>): HandicraftConfig {
  let seen: HandicraftConfig | null = null;
  function Probe() {
    seen = useHandicraft();
    return null;
  }
  const view = render(
    createElement(HandicraftProvider, { ...props, children: createElement(Probe) }),
  );
  view.unmount();
  expect(seen, "the provider rendered nothing and no config was observed").not.toBeNull();
  return seen!;
}

it('TH7 — theme="blackboard" resolves chalk and the blackboard treatment', () => {
  const config = resolvedConfig({ theme: "blackboard" });

  expect(config.chalk, 'theme="blackboard" no longer supplies chalk').toBe(true);
  expect(config.treatment, 'theme="blackboard" no longer resolves the blackboard treatment').toBe(
    BLACKBOARD_TREATMENT,
  );

  // The default direction, so the assertion above cannot be satisfied by a
  // provider that resolves blackboard for everything.
  const fallback = resolvedConfig({});
  expect(fallback.chalk, "the default theme is no longer non-chalk").toBe(false);
  expect(fallback.treatment, "the default theme no longer resolves notebook's treatment").toBe(
    THEMES["notebook"]!.treatment,
  );

  // An unrecognised name degrades to the default rather than throwing — the
  // same posture `generator.ts` takes for a missing roughjs peer. `/matrix`
  // passes this key straight from the URL, so "wrong input" is reachable by
  // typing.
  const unknown = resolvedConfig({ theme: "sepia" });
  expect(unknown.chalk, "an unregistered theme name no longer falls back to notebook").toBe(false);
  expect(unknown.treatment, "an unregistered theme name no longer falls back to notebook").toBe(
    THEMES["notebook"]!.treatment,
  );
});

it("TH7 — an explicit chalk wins over the theme's own, and keeps blackboard's treatment", () => {
  // Direction one: chalk overrides a theme that disagrees with it.
  expect(
    resolvedConfig({ theme: "blackboard", chalk: false }).chalk,
    'an explicit chalk={false} no longer wins over theme="blackboard"',
  ).toBe(false);
  expect(
    resolvedConfig({ theme: "notebook", chalk: true }).chalk,
    'an explicit chalk={true} no longer wins over theme="notebook"',
  ).toBe(true);

  // Direction two, and this is the assertion that stands between the refactor
  // and 26 moved baselines. `apps/playground/app/matrix/page.tsx` passes
  // `chalk={hc.dark}` and no `theme` at all, so the resolved theme is always
  // notebook whatever `&dark=` asks for. Reading the resolved theme's
  // treatment there would hand a chalk-true frame notebook's inert zeros — no
  // dust pass, no hachure widening, ink at full opacity — and every dark
  // tier-2 cell would render differently while every gate stayed green. The
  // treatment has to follow the *effective* chalk value, and this is the call
  // shape that proves it does.
  const matrixCallSite = resolvedConfig({ chalk: true });
  expect(matrixCallSite.chalk, "chalk={true} with no theme prop no longer resolves chalk").toBe(
    true,
  );
  expect(
    matrixCallSite.treatment,
    "chalk={true} with no theme prop resolves notebook's inert treatment instead of blackboard's — this is the exact configuration /matrix renders every dark cell with, and it moves all 26 dark tier-2 baselines",
  ).toBe(BLACKBOARD_TREATMENT);

  // And the mirror: chalk={false} against blackboard must not leave the dust
  // profile switched on. Unobservable today, because compose() gates every
  // texture read on chalk — but the gate and the profile are two independent
  // pieces of state and this is what stops them from being allowed to disagree.
  expect(
    resolvedConfig({ theme: "blackboard", chalk: false }).treatment,
    "chalk={false} against blackboard still resolves the chalk treatment",
  ).toBe(THEMES["notebook"]!.treatment);
});
