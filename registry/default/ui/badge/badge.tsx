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
import { cn, composeRefs, useSketchFrame, type FillLevel } from "@handicraft/core";

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
 * identically through `--hc-fill-color`. It is the only per-variant channel
 * both tiers agree on, so it is the only one Badge uses: four visibly distinct
 * badges by what is scribbled inside them, with no colour flip anywhere.
 *
 * Rejected: tinting the text per variant the way Button does. Two independent
 * reasons. It causes the handover flip above. And same-hue text over its own
 * hachure — danger text on a danger fill — measures under AA at every level;
 * that is a finding against Button, not a reason to repeat the pattern here.
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
  danger: "var(--hc-danger)",
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
 * `seedKey` is not needed — no state changes a badge's fill and it never
 * portals, so `useId` alone gives each badge in a list its own geometry.
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
  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rect",
    fill: fill ?? FILL_LEVELS[variant],
    fillColor: FILL_COLORS[variant],
  });
  const { ref: frameRef, ...frameAttrs } = frameProps;

  return (
    <span
      {...frameAttrs}
      ref={composeRefs(frameRef as React.Ref<HTMLSpanElement>, ref)}
      className={cn(
        "hc-frame font-hand text-hc-ink inline-flex h-6 min-w-6 items-center justify-center px-2",
        "text-sm leading-none select-none",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {sketchLayer}
      {children}
    </span>
  );
}
