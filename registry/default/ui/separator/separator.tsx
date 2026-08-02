"use client";

/**
 * Handicraft UI — Separator
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Atharv Vani
 *
 * https://github.com/Atharv-110/handicraftui
 * The Handicraft UI name and logo are not covered by the MIT licence. Forks are
 * welcome — give yours its own name. See TRADEMARK.md.
 */

import * as React from "react";
import { cn, composeRefs, useSketchFrame } from "@handicraft/core";

const ORIENTATIONS = {
  horizontal: "h-0.5 w-full border-t-2",
  vertical: "w-0.5 self-stretch border-l-2",
} as const;

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: keyof typeof ORIENTATIONS;
  /** Purely visual rules leave the accessibility tree; structural ones stay in it. */
  decorative?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

/**
 * A `<div>`, not an `<hr>`. `<hr>` is the native separator and would normally
 * settle the element choice outright, but it is a void element and cannot hold
 * children — `sketchLayer` would have nowhere to mount and the frame would have
 * nothing to be positioned against, exactly the reason Input's frame lives on a
 * wrapper rather than on the `<input>` itself. `role="separator"` recovers the
 * semantics `<hr>` would have given for free.
 *
 * `decorative` defaults to `false`. A rule between content sections is
 * meaningful; a rule in a toolbar is not. Defaulting to the honest semantic and
 * letting a consumer opt out is the platform-first reading — shadcn's wrapper
 * defaults the other way, which is a convenience for its own callers rather than
 * a correctness argument that applies here.
 *
 * `fill: "no"`, and it is correctness rather than taste. A rule has no interior:
 * on `shape: "underline"`, a `fillColor` would still push one extra fill pass
 * that draws nothing (rough.js does not fill an open line, so the pass comes
 * back as `strokeWidth: 0.001`, `stroke: "none"`) and simply costs a path.
 * Withholding the colour entirely, not just capping the level, is what keeps
 * that pass from being pushed at all.
 *
 * Tier 1 does not use `.hc-frame`'s own border. `::before` carries
 * `border: var(--hc-stroke-w) solid currentColor` with `inset: 0`; on a 2px-tall
 * element in `border-box` that border cannot fit inside the box, and the
 * pseudo-element renders as a solid bar several pixels tall instead of a line.
 * `::after` then repeats it rotated by `--hc-skew`, which on a wide rule
 * displaces the ends further still. Both pseudo-elements are hidden here with
 * `before:hidden after:hidden` — utilities, which Tailwind sorts after the
 * frame's own `@layer components` rules, the same mechanism a consumer's `bg-*`
 * already relies on to beat the frame's background — and the element's own
 * `border-t`/`border-l` draws the flat rule instead. If a browser ever shows the
 * pseudo-elements painting through this, the fallback is `[&::before]:hidden
 * [&::after]:hidden`, which wins on specificity instead of layer order; that is
 * the only sanctioned second mechanism; a stylesheet change is not, because it
 * would move a core touchpoint this component deliberately leaves untouched.
 *
 * `border-t-2` is 2px, the rounded value of the drawn stroke's 1.752px, so tier
 * 1 and tier 2 read close in weight rather than a box handing over to a line.
 * `border-transparent`, not `border-t-0`, once tier 2 draws: removing the
 * border would reflow the box by 2px at the exact moment the SVG mounts, which
 * is a layout shift on every page load — transparent keeps the box identical
 * and only changes what paints. `print:border-hc-ink` restores the rule for
 * print, where `@media print` already hides the sketch SVG and `::before` is
 * hidden here too; every other component falls back to `::before` in print, so
 * this is the separator's equivalent.
 *
 * Orientation never touches the taper: `taperForSize` reads `Math.min(width,
 * height)`, which for a rule is always its 2px thickness in either direction, so
 * both orientations land on the same floor (`k = 0.4`) and draw with the same
 * roughness, bowing and stroke weight. A vertical separator with no resolvable
 * parent height measures 0 tall; `generateSketch` returns `[]` on its `h <= 0`
 * guard and the flat border renders at zero height rather than throwing.
 *
 * `self-stretch` and no `h-full`. The two look complementary and are mutually
 * exclusive: `align-self: stretch` only stretches an item whose cross size is
 * `auto`, so an explicit `height: 100%` suppresses the stretch and then resolves
 * against a content-height flex container, giving zero. Shipping both measured
 * 0px tall in a flex row; removing `h-full` alone measured 20px. A consumer who
 * needs a fixed height passes one — `className="h-20"` survives `cn`, because
 * tailwind-merge treats `h-*` and `self-*` as different groups.
 *
 * `seedKey` is not needed — nothing about a rule changes its fill and it never
 * portals, so neither trigger in the contract applies; `useId` already gives
 * each separator on a page its own pool index. `focusWithin` is not set — a
 * rule holds no children and is not itself focusable, so `:has(> :focus-visible)`
 * could never match. `rescribble` is not set — a separator affords nothing to
 * hover.
 */
export function Separator({
  className,
  orientation = "horizontal",
  decorative = false,
  children,
  ref,
  ...props
}: SeparatorProps) {
  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "underline",
    fill: "no",
  });
  const { ref: frameRef, ...frameAttrs } = frameProps;
  const drawn = frameAttrs["data-hc-fidelity"] === "high";

  return (
    <div
      {...frameAttrs}
      ref={composeRefs(frameRef as React.Ref<HTMLDivElement>, ref)}
      className={cn(
        "hc-frame relative before:hidden after:hidden",
        ORIENTATIONS[orientation],
        !drawn && "border-hc-ink",
        drawn && "border-transparent",
        "print:border-hc-ink",
        className,
      )}
      {...(decorative
        ? { role: "none" as const }
        : {
            role: "separator" as const,
            ...(orientation === "vertical" ? { "aria-orientation": "vertical" as const } : {}),
          })}
      {...props}
    >
      {sketchLayer}
      {children}
    </div>
  );
}
