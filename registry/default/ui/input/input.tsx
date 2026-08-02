"use client";

/**
 * Handicraft UI — Input
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Atharv Vani
 *
 * https://github.com/Atharv-110/handicraftui
 * The Handicraft UI name and logo are not covered by the MIT licence. Forks are
 * welcome — give yours its own name. See TRADEMARK.md.
 */

import * as React from "react";
import { cn, useSketchFrame } from "@handicraft/core";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * The frame lives on a wrapper, not on the input itself.
 *
 * `<input>` is a replaced element, so it renders no ::before/::after â the
 * tier-1 stroke layers would simply never appear. The wrapper also gives the
 * tier-2 SVG something to be positioned against without interfering with the
 * input's own box.
 *
 * Focus is forwarded from the input to the wrapper via :focus-within, so the
 * ring still tracks real keyboard focus rather than being faked.
 */
export function Input({ className, disabled, ref, ...props }: InputProps) {
  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rect",
    // No fill, ever. A text field is the one surface where the user's own
    // content has to stay perfectly legible, and hachure behind an input value
    // is exactly the wrong trade.
    fill: "no",
  });

  return (
    <div
      {...frameProps}
      className={cn(
        "hc-frame bg-hc-paper-raised relative flex h-11 w-full items-center px-3",
        "focus-within:outline-hc-focus focus-within:outline-2 focus-within:outline-offset-[3px]",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {sketchLayer}
      <input
        ref={ref}
        disabled={disabled}
        className={cn(
          "font-body text-hc-ink placeholder:text-hc-ink-faint h-full w-full",
          "border-0 bg-transparent text-base outline-none",
          "disabled:cursor-not-allowed",
        )}
        {...props}
      />
    </div>
  );
}
