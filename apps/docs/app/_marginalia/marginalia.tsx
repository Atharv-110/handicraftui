import type { ReactNode } from "react";

/**
 * The one hand-face-below-18px surface on the landing.
 *
 * `font-hand text-sm` is illegal everywhere else in `apps/docs` —
 * `HAND_FACE_EXCEPTIONS` in `packages/core/src/styles/ramps.ts` names
 * `"marketing-marginalia"` as the fourth and only marketing exception, and
 * `HAND_FACE_EXCEPTION_FILES` in `packages/eslint-config/handicraft-rules.js`
 * closes it to this one path fragment. A `font-hand text-sm` pair written
 * anywhere else under `apps/docs` is a lint error by design — see
 * DESIGN-SYSTEM.md §2's interference table for why the pairing is capped at
 * all: hachure fill crosses a handwritten glyph's x-height band below 18px,
 * landing mid-letter where it reads as a stem.
 *
 * No `useSketchFrame` call and no `.hc-frame` class — this is a margin note,
 * not a component, and it carries no frame in the §1.10 count for exactly
 * that reason. Plain server-renderable markup, no `"use client"` needed.
 */
export function Marginalia({ children }: { children: ReactNode }) {
  return <p className="font-hand text-hc-ink-soft text-sm leading-snug">{children}</p>;
}
