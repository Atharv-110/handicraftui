"use client";

/**
 * Handicraft UI — Card
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Atharv Vani
 *
 * https://github.com/Atharv-110/handicraftui
 * The Handicraft UI name and logo are not covered by the MIT licence. Forks are
 * welcome — give yours its own name. See TRADEMARK.md.
 */

import * as React from "react";
import { cn, composeRefs, useSketchFrame } from "@handicraft/core";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Draws the exercise-book margin rule down the left edge. Structural, not
   * decorative: it marks where the content column begins.
   */
  ruled?: boolean;
  ref?: React.Ref<HTMLDivElement>;
}

export function Card({ className, ruled = false, children, ref, ...props }: CardProps) {
  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rect",
    // Capped at `low` on purpose. Cards carry paragraphs, and measured against
    // body copy the `med` and `high` hachure levels visibly cost legibility.
    // Small one-word surfaces (Badge, checked Checkbox) can go denser; this
    // cannot.
    fill: "low",
    fillColor: "var(--hc-ink-faint)",
  });
  const { ref: frameRef, ...frameAttrs } = frameProps;

  return (
    <div
      {...frameAttrs}
      ref={composeRefs(frameRef as React.Ref<HTMLDivElement>, ref)}
      className={cn(
        "hc-frame hc-lift bg-hc-paper-raised text-hc-ink relative p-6",
        ruled && "pl-10",
        className,
      )}
      {...props}
    >
      {sketchLayer}
      {ruled ? (
        // `--hc-red` collapsed into the role table (perceptual distance 0.0234
        // from --hc-danger — a just-noticeable step is ~0.02). `danger-ink`,
        // not `accent-ink`, is the closer match: old red rendered #CC3336
        // light / #EF6661 dark against danger-ink's #B52A27 / #F2675C, while
        // accent-ink at hue 10 renders visibly pinker. Decorative at 45%
        // alpha with aria-hidden, so no contrast floor binds either choice.
        <span aria-hidden="true" className="bg-hc-danger-ink/45 absolute inset-y-4 left-7 w-px" />
      ) : null}
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 flex flex-col gap-1", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-hand text-xl leading-tight", className)} {...props} />;
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("font-body text-hc-ink-soft text-sm leading-relaxed", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-body text-sm leading-relaxed", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex items-center gap-2", className)} {...props} />;
}
