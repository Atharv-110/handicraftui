"use client";

/**
 * Handicraft UI — Badge
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Atharv Vani
 *
 * https://github.com/Atharv-110/handicraftui
 * The Handicraft UI name and logo are not covered by the MIT licence. Forks are
 * welcome — give yours its own name. See TRADEMARK.md.
 */

import * as React from "react";
import {
  cn,
  composeRefs,
  SketchMark,
  useSketchFrame,
  type FillLevel,
  type MarkName,
} from "@handicraft/core";

/**
 * Every variant carries the same ink text and the same ink stroke. That looks
 * like a missed opportunity until the tier-1/tier-2 stroke colour is traced
 * through: tier 1 draws its stroke from `.hc-frame::before,::after { border: …
 * solid currentColor; color: var(--hc-ink) }`, which fixes `currentColor` to
 * ink regardless of the element's own text colour, while tier 2 draws its
 * stroke from `style.stroke ?? "currentColor"`, resolved against the element.
 * A component that tints its text and lets the stroke follow `currentColor`
 * therefore has its frame change colour at the handover — tier 1 in ink, tier 2
 * in the tint. The hachure colour, by contrast, is threaded to both tiers
 * identically through `--hc-fill-color`, so it is the one per-variant channel
 * both tiers agree on and Badge still uses it for that reason.
 *
 * Rejected: tinting the text per variant the way Button does. Two independent
 * reasons. It causes the handover flip above. And same-hue text over its own
 * hachure — danger text on a danger fill — measures under AA at every level;
 * that is a finding against Button, not a reason to repeat the pattern here.
 *
 * Hachure colour alone is no longer the whole story, though. `default` and
 * `danger` both fill at `med` and differ only in which colour is scribbled —
 * a colour-only distinction is exactly what DESIGN-SYSTEM.md's rule forbids
 * for a variant that genuinely signals status. `danger` carries a leading
 * `SketchMark` glyph for that reason; see the render below. `marked` needs no
 * glyph — highlighter is emphasis, not status, so losing its colour costs
 * salience, not information.
 */
const VARIANTS = {
  default: "text-hc-ink",
  marked: "text-hc-ink",
  danger: "text-hc-ink",
  ghost: "text-hc-ink",
} as const;

const FILL_COLORS: Record<keyof typeof VARIANTS, string> = {
  default: "var(--hc-ink-faint)",
  marked: "var(--hc-highlighter)",
  danger: "var(--hc-danger-fill)",
  ghost: "transparent",
};

/**
 * `med` is Badge's intent generally — a badge is one word, scanned as a shape
 * with no line-tracking to lose, so the readability finding against paragraph
 * copy at `med`/`high` does not apply here. `marked` is the one exception, and
 * it is a contrast number rather than taste: the worst case is a glyph pixel on
 * a hatch line, composited over paper at the level's own opacity. Highlighter at
 * `med` measures 3.64:1 on the blackboard — under the 4.5:1 AA floor — so
 * `marked` is forced down to `low`, where it measures clear in both themes.
 * `default` and `danger` hold `med` on both ink-faint and danger hachure, in
 * both themes.
 */
const FILL_LEVELS: Record<keyof typeof VARIANTS, FillLevel> = {
  default: "med",
  marked: "low",
  danger: "med",
  ghost: "no",
};

/**
 * `default` and `danger` both fill at `med` and would otherwise differ only
 * in hachure colour — exactly the colour-only distinction
 * DESIGN-SYSTEM.md's rule forbids for a variant that signals status. `cross`
 * is the canonical mark for `danger` (DESIGN-SYSTEM.md §1). `marked` and
 * `default` stay `null`: `marked` is highlighter, which is emphasis rather
 * than status and is documented as explicitly non-semantic, and `default`
 * carries no status to begin with. `ghost` has no fill at all, so it is
 * already distinguished by texture.
 */
const VARIANT_MARKS: Record<keyof typeof VARIANTS, MarkName | null> = {
  default: null,
  marked: null,
  danger: "cross",
  ghost: null,
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof VARIANTS;
  /** Override the variant's scribbled fill density. */
  fill?: FillLevel;
  ref?: React.Ref<HTMLSpanElement>;
}

/**
 * `h-6` is not a size choice, it is a geometry pin. An explicit 24px height
 * fixes `Math.min(w, h)` at 24 for every badge on every page, because
 * `min-w-6` keeps width the larger term. That puts the taper `k` at 0.5454 and
 * keeps corner pooling off, since pooling gates at `k > 0.55` — a margin of
 * only 0.2px, which is why the height is pinned rather than left to
 * line-height. `h-7` would silently switch four filled corner dots on; that is
 * the right side of the gate to be on, because four ~2px dots on a 60×24 badge
 * read as dirt rather than as a mark.
 *
 * `min-w-6` also keeps a single-character badge square-ish, so a narrow badge
 * cannot drift `min(w,h)` into a different taper regime.
 *
 * `text-sm` at 14px in `font-hand`, not `text-xs`: small handwriting over a
 * 5.5px hatch period is the combination most at risk, and 14px sits close to
 * Button's 16px over the identical hatch.
 *
 * No `hc-lift`. The 3px offset shadow reads as paper lifted off the page,
 * which fits a card or a button; a badge is a note written on the page, not an
 * object sitting on it.
 *
 * `seedKey` is now needed. `danger`'s leading glyph is a second `SketchMark`
 * beside the frame, and without a shared key it falls back to its own
 * `useId` — a different tree position and therefore a different pool seed,
 * so the mark and the frame would be drawn by two different hands. `autoId`
 * is threaded to both `useSketchFrame` and `SketchMark`, the same pattern
 * Checkbox already uses with `inputId`. `useId` is still per-instance, so
 * each badge in a list keeps its own geometry regardless.
 * `focusWithin` is not set — a badge is non-interactive, wraps no control, and
 * its own frame element is not focusable, so `:focus-visible` correctly never
 * fires. `rescribble` is not set — nothing here affords a hover. The 44px
 * touch-target floor does not apply: Badge is a `<span>` with no handler, no
 * `tabIndex` and no role, and that is recorded here rather than left to look
 * like a skipped requirement.
 *
 * A `success` variant is deferred on purpose. The palette has `--hc-success`
 * and it is a common ask, but the palette-to-variant mapping is one design
 * decision that should be made once across Badge, Alert and Toast together
 * rather than badge-first and retrofitted twice. `ghost`, not `outline`, for
 * vocabulary parity with Button, where `ghost` already means "no fill".
 */
export function Badge({
  className,
  variant = "default",
  fill,
  children,
  ref,
  ...props
}: BadgeProps) {
  const autoId = React.useId();
  // Read once into a local: TypeScript does not narrow a repeated index
  // expression across a JSX ternary, and a cast here would silently accept a
  // future variant that maps to `null`.
  const mark = VARIANT_MARKS[variant];

  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rect",
    fill: fill ?? FILL_LEVELS[variant],
    fillColor: FILL_COLORS[variant],
    seedKey: autoId,
  });
  const { ref: frameRef, ...frameAttrs } = frameProps;

  return (
    <span
      {...frameAttrs}
      ref={composeRefs(frameRef as React.Ref<HTMLSpanElement>, ref)}
      className={cn(
        "hc-frame font-hand text-hc-ink inline-flex h-6 min-w-6 items-center justify-center gap-1.5",
        "px-2 text-sm leading-none select-none",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {sketchLayer}
      {mark ? (
        // aria-hidden here is not a duplicate of SketchMark's own. That one
        // hides the <svg>; this one hides the CSS ::before that paints before
        // hydration, which Chrome and NVDA read out as text. Without it this
        // badge is announced with a multiplication sign in front of it, but
        // only until it hydrates — so the bug would be invisible in every
        // manual test that starts after the page settles.
        <span className="hc-mark-slot" aria-hidden="true">
          <SketchMark
            name={mark}
            size={14}
            seedKey={autoId}
            // Pinned, not currentColor. The frame's two tiers resolve their
            // stroke against different elements and flip colour at the
            // handover if a component tints its text; this mark has two
            // tiers now and can do the same thing.
            color="var(--hc-ink)"
          />
        </span>
      ) : null}
      {children}
    </span>
  );
}
