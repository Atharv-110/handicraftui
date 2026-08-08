/**
 * Handicraft UI — the permanent tripwire fixture (cycle 005 §3.7).
 *
 * Deliberately-violating source. Imported by nothing, rendered by nothing —
 * `packages/eslint-config` has no `eslint.config.mjs`, no `lint` script and
 * no `typecheck` script, and this directory sits outside the root
 * `eslint.config.mjs`'s `scripts`/`tests` scope, so nothing in this
 * repository's gates ever compiles or lints this file. That invisibility is
 * what makes an intentionally-bad file safe here.
 *
 * It exists so every `hc` rule keeps one confirmed-firing example. Without
 * it, `hc/base-ui-focus-within` has no subject anywhere in this repository
 * until Phase 2 Wave A, twelve to eighteen cycles away — "the first Base UI
 * cycle will notice if it breaks" is the exact reasoning that let `visual`
 * skip `main` for two cycles unnoticed. `packages/eslint-config/*.test.ts`
 * (`hc-qa`'s `tripwires.test.ts`) lints this file through ESLint's Node API
 * and asserts the six message counts below by name.
 *
 * Six violations, one per line group, none extra:
 *   hc/base-ui-focus-within   1   the @base-ui/react import plus the
 *                                 useSketchFrame call below with no
 *                                 focusWithin
 *   hc/no-off-scale-class     3   px-5 (size half, 20px is on SIZE_PX and
 *                                 not on PAD_X_PX) + text-6xl (type half,
 *                                 60px, past heroLg's 48px and size-shaped
 *                                 under XL_STEP while sitting on no
 *                                 TYPE_SCALE step) +
 *                                 font-hand text-sm (hand-face half, outside
 *                                 the three closed exception files)
 *   hc/no-ink-faint-text      1   text-hc-ink-faint in a className
 *   hc/no-bare-dark-class     1   a bare dark token in a className
 *   total hc/ messages        6   = 1 + 3 + 1 + 1
 */
import { CheckboxRoot } from "@base-ui/react/checkbox";
import { useSketchFrame } from "@handicraft/core";

export function TripwireFixture() {
  // hc/base-ui-focus-within: this file imports @base-ui/react and this call
  // has no focusWithin, so the wrapper below draws a frame around a control
  // it does not own with no way to show it focused.
  const { frameProps } = useSketchFrame({ shape: "rect" });

  return (
    <CheckboxRoot {...frameProps}>
      {/* hc/no-off-scale-class, size half: px-5 decodes to 20px, which is
          on SIZE_PX but not on PAD_X_PX. hc/no-off-scale-class, type half:
          text-6xl is 60px — past cycle 012's heroLg step (48px, text-5xl)
          and still size-shaped under XL_STEP, but on no TYPE_SCALE step.
          Cycle 012 extended TYPE_SCALE to text-4xl, which this fixture used
          to rely on as its off-scale example; text-6xl is chosen so the
          next scale extension has to reach past 60px before it silently
          disarms this guard again. */}
      <span className="px-5 text-6xl">Off scale</span>
      {/* hc/no-off-scale-class, hand-face half: font-hand below 18px outside
          the three closed exception files. */}
      <span className="font-hand text-sm">Hand face too small</span>
      {/* hc/no-ink-faint-text: 1.19:1 to 1.31:1 against paper, under every
          AA floor this library holds text to. */}
      <span className="text-hc-ink-faint">Too faint to read</span>
      {/* hc/no-bare-dark-class: this class must come from HandicraftSurface,
          which pairs it with the paint. */}
      <span className="dark">Bare dark, no surface</span>
    </CheckboxRoot>
  );
}
