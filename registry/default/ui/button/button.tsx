"use client";

/**
 * Handicraft UI — Button
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Atharv Vani
 *
 * https://github.com/Atharv-110/handicraftui
 * The Handicraft UI name and logo are not covered by the MIT licence. Forks are
 * welcome — give yours its own name. See TRADEMARK.md.
 */

import * as React from "react";
import { cn, composeRefs, useSketchFrame, type FillLevel } from "@handicraft/core";

const VARIANTS = {
  default: "text-hc-ink hover:bg-hc-paper-sunken",
  primary: "text-hc-ink",
  danger: "text-hc-danger-ink hover:bg-hc-danger-fill/10",
  ghost: "bg-transparent text-hc-ink hover:bg-hc-paper-sunken",
} as const;

/**
 * Hachure colour per variant. The scribbled fill *is* the surface now, so these
 * replace the flat `bg-*` they used to carry — a flat background behind a
 * hachure pass just muddies it.
 */
const FILL_COLORS: Record<keyof typeof VARIANTS, string> = {
  default: "var(--hc-ink-faint)",
  primary: "var(--hc-highlighter)",
  danger: "var(--hc-danger-fill)",
  ghost: "transparent",
};

/**
 * `primary` is held at "low", not "med". Ink over highlighter hachure at "med"
 * measures 3.64:1 on the blackboard — under the 4.5:1 AA floor — the same
 * defect Badge `marked` hit in cycle 1, from the same token at the same
 * level. At "low" it clears 7.20:1 dark, 14.82:1 light. See
 * DESIGN-SYSTEM.md §1 for the full ceiling table. The rest stay quiet
 * regardless.
 */
const FILL_LEVELS: Record<keyof typeof VARIANTS, FillLevel> = {
  default: "low",
  primary: "low",
  danger: "low",
  ghost: "no",
};

const SIZES = {
  // Heights clear the 44px touch-target floor at md and lg. sm is for dense
  // desktop toolbars only.
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-base gap-2",
  lg: "h-12 px-6 text-lg gap-2.5",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  /** Override the variant's scribbled fill density. */
  fill?: FillLevel;
  /** Redraw the frame on hover and press, so it looks re-inked. */
  rescribble?: boolean;
  /**
   * Stagger this button's draw-on entrance by this many milliseconds, when
   * the provider's `drawOn` is on. Button-only for now rather than a prop on
   * every component: the landing hero (ROADMAP §6.8) is the one planned
   * consumer, and a prop shipped on all seven components with one consumer
   * is API ahead of its own evidence. Widening it later is additive.
   */
  drawDelay?: number;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  className,
  variant = "default",
  size = "md",
  fill,
  rescribble,
  drawDelay,
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const { frameProps, sketchLayer } = useSketchFrame({
    // Sharp corners, not rounded: tested visibly more hand-drawn, because the
    // stroke overshoots past the corner instead of easing around an arc.
    shape: "rect",
    fill: fill ?? FILL_LEVELS[variant],
    fillColor: FILL_COLORS[variant],
    // Pinned rather than left to currentColor. Tier 1's pseudo-element stroke
    // is fixed to --hc-ink in CSS; tier 2 resolves currentColor against this
    // element, which `danger` tints. Without this the frame is ink before
    // hydration and red after — visible at every page load. Unconditional
    // across all four variants rather than gated on `danger`, so the other
    // three (already --hc-ink) agree by construction instead of by
    // coincidence, and a future tinted variant cannot reintroduce the bug by
    // forgetting a branch. DESIGN-SYSTEM.md §1.
    stroke: "var(--hc-ink)",
    ...(rescribble !== undefined ? { rescribble } : {}),
    ...(disabled ? { state: "disabled" as const } : {}),
    ...(drawDelay !== undefined ? { drawDelay } : {}),
  });
  const { ref: frameRef, ...frameAttrs } = frameProps;

  return (
    <button
      {...frameAttrs}
      disabled={disabled}
      ref={composeRefs(frameRef as React.Ref<HTMLButtonElement>, ref)}
      className={cn(
        "hc-frame hc-lift font-hand inline-flex items-center justify-center",
        "select-none transition-[transform,background-color,box-shadow] duration-[var(--hc-motion-state)]",
        // Pressing moves the button onto its own shadow, like pressing a pen
        // down. Uses translate rather than animating box-shadow so it stays on
        // the compositor.
        "active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        "disabled:pointer-events-none disabled:opacity-[var(--hc-opacity-disabled)] disabled:shadow-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {sketchLayer}
      {children}
    </button>
  );
}
