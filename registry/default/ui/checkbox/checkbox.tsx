"use client";

/**
 * Handicraft UI — Checkbox
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Atharv Vani
 *
 * https://github.com/Atharv-110/handicraftui
 * The Handicraft UI name and logo are not covered by the MIT licence. Forks are
 * welcome — give yours its own name. See TRADEMARK.md.
 */

import * as React from "react";
import { cn, SketchMark, useSketchFrame } from "@handicraft/core";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * The native input stays in the DOM and keeps every behaviour that matters â
 * focus, keyboard, form participation, screen-reader semantics. It is made
 * transparent rather than replaced, and the drawn box and tick sit behind it.
 *
 * The tick is a `SketchMark`, not an icon font: it shares the frame's seed pool,
 * hand and size taper, so tick and box look like one drawing. A geometric
 * checkmark inside a wobbly box reads as two different hands on one object.
 */
export function Checkbox({
  className,
  label,
  id,
  checked,
  defaultChecked,
  disabled,
  onChange,
  ref,
  ...props
}: CheckboxProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;

  const [internal, setInternal] = React.useState(defaultChecked ?? false);
  const isChecked = checked ?? internal;

  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rect",
    // Texture is affordable here precisely because a 20Ã20 box carries no text.
    // `low` rather than `high` so the tick drawn on top still reads â a
    // cross-hatched box competes with the mark it is supposed to be holding.
    fill: isChecked ? "low" : "no",
    fillColor: "var(--hc-ink)",
    // Both states share one seed, so ticking does not redraw the box.
    seedKey: inputId,
  });
  const { ref: frameRef, ...frameAttrs } = frameProps;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "font-hand text-hc-ink inline-flex cursor-pointer items-center gap-2.5 select-none",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <span
        {...frameAttrs}
        ref={frameRef as React.Ref<HTMLSpanElement>}
        className="hc-frame relative inline-flex size-5 shrink-0 items-center justify-center"
      >
        {sketchLayer}
        {isChecked ? (
          <SketchMark
            name="check"
            size={18}
            seedKey={inputId}
            // Ink, not paper. Hachure is a scribble, not a solid â a
            // paper-coloured tick over it has almost nothing to contrast
            // against and simply disappears.
            color="var(--hc-ink)"
            className="pointer-events-none absolute"
          />
        ) : null}
        <input
          id={inputId}
          type="checkbox"
          ref={ref}
          disabled={disabled}
          checked={isChecked}
          onChange={(e) => {
            setInternal(e.target.checked);
            onChange?.(e);
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          {...props}
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
