"use client";

import * as React from "react";
import { cn } from "../lib/cn";

export interface HandicraftSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  /** Blackboard rather than paper. Emits the theme class and the paint on one
   *  element, so the two cannot be applied separately.
   *
   *  Kept as a boolean alias for `theme="blackboard"` — cycle 013 — rather
   *  than retired in its favour: every existing call site already passes
   *  this, and rewriting three of them for a rename that changes nothing
   *  about what renders would be churn with no payoff. Still controls the
   *  `.dark` class on its own, independent of `theme`, which is what lets a
   *  caller drive both signals at once. `matrix/page.tsx`'s `&theme=`
   *  matrix-only key does exactly that for M18, which is the entire reason
   *  `[data-hc-theme="<name>"]:not(.dark)` exists in the stylesheet: one
   *  element can carry `.dark` and `data-hc-theme="fixture"` together, and
   *  the CSS has to resolve which one wins. */
  dark?: boolean;
  /**
   * The theme to paint, addressed by `data-hc-theme`. An explicit value
   * always wins for the attribute, even over `dark` — that is what lets one
   * element carry `.dark` (from `dark`) and `data-hc-theme="fixture"` (from
   * `theme`) at once. When omitted, defaults to `"blackboard"` if `dark` is
   * set (the alias above) and to `"notebook"` otherwise.
   *
   * `"blackboard"` is the one name that also sets the `.dark` class:
   * `handicraft.css`'s theme-slot comment is what argues blackboard needs
   * no `:not(.dark)` exclusion of its own, since `.dark` and
   * `[data-hc-theme="blackboard"]` share one block. Any other name emits
   * the attribute alone.
   */
  theme?: string;
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
  theme,
  className,
  style,
  ref,
  ...props
}: HandicraftSurfaceProps) {
  const Tag = as;
  // An explicit `theme` always decides the attribute; `dark` only supplies
  // the fallback name when nobody passed one. This is what keeps `dark` and
  // `theme` independent controls rather than one silently overriding the
  // other — see this prop's own comment for why that independence is load-
  // bearing rather than an accident of implementation.
  const resolvedTheme = theme ?? (dark ? "blackboard" : "notebook");

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      // This is the one file a bare `dark` class is allowed to originate
      // from. Every call site below gets it through the `dark` prop instead
      // of writing the token by hand, which is the defect this component and
      // this rule both exist to close. `dark` can turn the class on by
      // itself (the legacy path) and so can `theme="blackboard"` even with
      // `dark` left false (TH8's claim that the two "emit the identical
      // class") — the class is not simply `dark && "dark"` any more.
      // eslint-disable-next-line hc/no-bare-dark-class
      className={cn((dark || resolvedTheme === "blackboard") && "dark", className)}
      data-hc-theme={resolvedTheme}
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
