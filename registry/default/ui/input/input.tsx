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
 * `<input>` is a replaced element, so it renders no ::before/::after — the
 * tier-1 stroke layers would simply never appear. The wrapper also gives the
 * tier-2 SVG something to be positioned against without interfering with the
 * input's own box.
 *
 * The ring is drawn by the frame rather than by the input: `focusWithin` puts
 * `data-hc-focus-within` on the wrapper and one unlayered rule in the stylesheet
 * rings it while a direct child has `:focus-visible`. This component used to
 * hand-roll that with `focus-within:` utilities. It worked here and was silently
 * forgotten on Checkbox, which shipped with no visible focus ring at all — the
 * wrapper-framed shape repeats across most of what is left to build, so it
 * belongs in the hook.
 */
export function Input({ className, disabled, ref, ...props }: InputProps) {
  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rect",
    // No fill, ever. A text field is the one surface where the user's own
    // content has to stay perfectly legible, and hachure behind an input value
    // is exactly the wrong trade.
    fill: "no",
    focusWithin: true,
  });

  return (
    <div
      {...frameProps}
      // px-4 is the control ramp's `md` padding, the same 16px Button `md`
      // carries. Text inset from the frame is what a reader notices when a field
      // and the button that submits it share a row, and this was 12px until
      // cycle 002b — a disagreement nobody chose. DESIGN-SYSTEM.md §4 is the ramp.
      className={cn(
        "hc-frame bg-hc-paper-raised relative flex h-11 w-full items-center px-4",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {sketchLayer}
      <input
        ref={ref}
        disabled={disabled}
        // `ink-soft`, not `ink-faint`: measured against this field's own
        // paper-raised surface, faint is 3.0:1 in light and 3.4:1 on the
        // blackboard, both under the 4.5:1 AA floor for text. Faint stays the
        // hachure colour, where the requirement is texture rather than reading.
        className={cn(
          "font-body text-hc-ink placeholder:text-hc-ink-soft h-full w-full",
          "border-0 bg-transparent text-base outline-none",
          "disabled:cursor-not-allowed",
        )}
        {...props}
      />
    </div>
  );
}
