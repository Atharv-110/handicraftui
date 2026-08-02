"use client";

/**
 * Handicraft UI — Label
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Atharv Vani
 *
 * https://github.com/Atharv-110/handicraftui
 * The Handicraft UI name and logo are not covered by the MIT licence. Forks are
 * welcome — give yours its own name. See TRADEMARK.md.
 */

import * as React from "react";
import { cn } from "@handicraft/core";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  ref?: React.Ref<HTMLLabelElement>;
}

/**
 * Label does not frame. A label that draws a box around itself is a field, not
 * a label, and it would compete with the Input it sits above. This is the
 * first component that exists purely for typography and `htmlFor` semantics,
 * and it imports only `cn` — no `useSketchFrame`, no engine participation. That
 * is not a gap in the engine's coverage: forcing engine participation here to
 * make the component feel consistent would be the tail wagging the dog, and it
 * would ship a frame nobody asked for into every form. It is also worth
 * proving in itself — Label is the first evidence that the two-tier machinery
 * is genuinely opt-in rather than ambient, since `.hc-frame` is a class a
 * component chooses and the provider forces nothing.
 *
 * There is a real engine gap adjacent to this decision, surfaced from the other
 * side by Separator: `MARK_STROKES` contains `underline` and `strike`, but
 * `SketchMark` renders into a square box (`width={size} height={size}`), so
 * there is no way to draw a hand mark that spans a run of text of arbitrary
 * width. A hand-underlined label would want exactly that. Named here as a
 * future engine cycle's problem, not opened in this one.
 *
 * `select-none`, because a label's text is chrome — dragging across it while
 * aiming for the checkbox beside it is the common accident. Not
 * `cursor-pointer`: the label points at whatever it is `htmlFor`, and a
 * disabled control with a pointer cursor over its label is a lie.
 *
 * shadcn's `peer-disabled:cursor-not-allowed peer-disabled:opacity-70` is
 * deliberately not copied. `peer-*` matches a *following* sibling, and a label
 * here almost always precedes its control; Handicraft's Input carries no
 * `peer` class and there is no form-item group to hang
 * `group-data-[disabled]` on either. Copying those utilities in would ship as
 * dead CSS into every consumer's repository.
 *
 * Label must not wrap a Checkbox. Checkbox renders its own `<label htmlFor>`
 * internally, so nesting a Label around it produces nested `<label>` elements —
 * invalid HTML, and it gives the inner control two labels. Pass Checkbox's own
 * `label` prop instead.
 *
 * `htmlFor` comes free from `React.LabelHTMLAttributes` and stays optional,
 * because a wrapping label is legal HTML. Left documented rather than enforced
 * with a runtime warning — that is a cost every consumer would pay forever for
 * a mistake made once.
 */
export function Label({ className, ref, ...props }: LabelProps) {
  return (
    <label
      ref={ref}
      className={cn(
        "font-hand text-hc-ink inline-block text-sm leading-none select-none",
        className,
      )}
      {...props}
    />
  );
}
