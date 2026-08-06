"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface HandicraftSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  /** Blackboard rather than paper. Emits the theme class and the paint on one
   *  element, so the two cannot be applied separately. */
  dark?: boolean;
  as?: "div" | "main" | "section" | "article";
  ref?: React.Ref<HTMLElement>;
}

/**
 * `globals.css:14-17` paints `body` from `var(--hc-paper)` resolved at
 * `:root`, and `.dark` may land on any descendant of `body` — paint and
 * theme are separable by construction. Cycle 004 iteration 1 separated them
 * by accident: `<main>` carried `.dark` while a descendant carried the
 * paint, and 26 of 67 committed baselines rendered chalk ink on light paper
 * at 1.1924:1 until F1 fixed it by moving both onto `<main>` itself. This
 * component is the structural version of that fix — the theme class and the
 * paint are emitted together, from one call, so they cannot drift apart a
 * second time the way three hand-written call sites already let them.
 *
 * The paint is an inline style rather than a `.hc-surface` class in
 * `handicraft.css`. That is the weakest decision in this file, and cycle
 * 005's own §6 argues both sides of it in full rather than here. Short
 * version: a stylesheet rule fires Rule R1's blast radius across every
 * component `handicraft.css` touches; an inline declaration provably moves
 * zero of the 68 committed baselines, which a stylesheet change cannot
 * promise in advance. `--color-hc-paper` is `@theme inline`
 * (`handicraft.css:230-231`), so `bg-hc-paper`'s `var()` and this inline
 * `backgroundColor` resolve to the identical computed value either way.
 *
 * One element, no wrapper. `apps/playground/app/matrix/page.tsx`'s own F1
 * comment records why painting the existing element rather than inserting
 * one is what kept every committed light baseline's geometry provably
 * unchanged — nothing entered the tree. The same property has to hold here,
 * or this migration costs 68 regenerated PNGs instead of zero.
 *
 * `as` is a closed union, not a generic `<T extends ElementType>`. Every
 * call site in this repository names its tag explicitly, so a polymorphic
 * generic would buy type precision nothing here uses and cost every reader
 * the inference it takes to read one.
 */
export function HandicraftSurface({
  as = "div",
  dark = false,
  className,
  style,
  ref,
  ...props
}: HandicraftSurfaceProps) {
  const Tag = as;

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      // This is the one file a bare `dark` class is allowed to originate
      // from. Every call site below gets it through the `dark` prop instead
      // of writing the token by hand, which is the defect this component and
      // this rule both exist to close.
      // eslint-disable-next-line hc/no-bare-dark-class
      className={cn(dark && "dark", className)}
      style={{
        backgroundColor: "var(--hc-paper)",
        color: "var(--hc-ink)",
        // Caller's style spreads last, so a consumer can still override
        // either declaration — the inline route's one concession to the
        // overridability a `.hc-surface` class would have had by default.
        ...style,
      }}
      {...props}
    />
  );
}
