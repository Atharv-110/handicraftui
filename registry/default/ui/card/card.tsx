"use client";

import * as React from "react";
import { cn, composeRefs, useSketchFrame } from "@handcraft/core";

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
        <span aria-hidden="true" className="bg-hc-red/45 absolute inset-y-4 left-7 w-px" />
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
