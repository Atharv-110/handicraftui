/**
 * Handicraft UI — size ramps, type scale and spacing floors.
 *
 * Every number here is copied from DESIGN-SYSTEM.md §2, §3 and §4, not
 * recomputed. This file exists so a test can cross-check the doctrine's
 * numbers against what components actually ship, as text — nothing here is
 * consumed at runtime by any component. Not exported from index.ts on
 * purpose: exporting it makes the shape public API before anything needs to
 * import it, the same reasoning that kept resize-bus.ts's measureBorderBox
 * internal.
 *
 * No component imports these tables. A component that did would mean a user
 * who ejects it via `shadcn add` could not change a size without editing
 * @handicraft/core, which fights the own-the-source model this whole
 * distribution rests on. Components keep their literal Tailwind class
 * strings; this file is the doctrine's numbers, once, for tests to read.
 */

/**
 * The control ramp — anything interactive: Button, Input, Checkbox.
 *
 * The touch-target column is a field, not a comment, because a prose caveat
 * on Button is not checkable and this project's own house rule (44px) is
 * stricter than the law it is derived from. WCAG 2.2 Level AA is 2.5.8 at
 * 24×24 CSS px, and 36 clears that outright — sm passes AA. The 44×44 figure
 * is 2.5.5, Level AAA, and is this project's house rule, not a compliance
 * floor. That is why sm is dense-desktop-only rather than a compliance
 * defect: it fails a self-imposed bar, not the law.
 */
export const CONTROL_RAMP = {
  sm: {
    height: 36,
    padX: 12,
    type: 14,
    gap: 6,
    touch: "AA (>=24, spacing rule applies)",
    denseDesktopOnly: true,
  },
  md: {
    height: 44,
    padX: 16,
    type: 16,
    gap: 8,
    touch: "AAA (>=44)",
    denseDesktopOnly: false,
  },
  lg: {
    height: 48,
    padX: 24,
    type: 18,
    gap: 10,
    touch: "AAA (>=44)",
    denseDesktopOnly: false,
  },
} as const;

/**
 * The token ramp — non-interactive marks: Badge today, Chip/Tag/Pill/
 * Avatar-status when they exist.
 *
 * A second ramp rather than folding Badge into the control ramp, because
 * Badge's h-6 is a geometry constraint wearing a size name, not a free
 * choice. generator.ts pins TAPER_PIVOT at 44 and gates corner pooling at
 * `taper.k > 0.55`, so the threshold height is 0.55 * 44 = 24.2px. Badge
 * ships h-6 = 24, giving k = 24 / 44 = 0.545454... — a margin of only 0.2px
 * to the gate. A single ramp that assigned Badge a control-ramp height would
 * silently switch four corner dots on across every badge in every
 * consumer's app. Checkbox's drawn box (size-5 = 20px) sits on the same side
 * of the same gate with more room: k = 20 / 44 = 0.454545..., a 4.2px
 * margin. Neither 20 nor 24 is a ramp value — both are geometry pins, named
 * here so nobody "tidies" size-5 up to a ramp height and crosses the gate
 * (26px would give k = 0.590909... > 0.55).
 *
 * denseDesktopOnly is absent from this row rather than false: dense-desktop-
 * only is a property of an interactive control's touch target, and a
 * non-interactive token has no touch target to be dense about.
 */
export const TOKEN_RAMP = {
  xs: {
    height: 24,
    padX: 8,
    type: 14,
    gap: 6,
    touch: "non-interactive",
  },
} as const;

/**
 * Seven named type steps. `hand` is exactly `px >= 18` — DESIGN-SYSTEM.md
 * §2's "Display scale — hand face, 18px and up" encoded rather than
 * paraphrased, so the doctrine and this table cannot drift apart silently.
 * Below 18px the hand face is legal only on the three surfaces named in
 * HAND_FACE_EXCEPTIONS below. The constraint is on the hand face
 * specifically — it exists because FILL_LEVELS hatch lines cross a
 * handwritten glyph's x-height band, landing mid-letter where it reads as a
 * stem. The body face and the monospace note face are legible machine faces
 * with no hachure-interference problem, so either takes any step on this
 * scale with no exception needed.
 *
 * `display` at 24px has no shipped consumer today. Included anyway because
 * DESIGN-SYSTEM.md §2's own interference table already carries a 24px row —
 * a scale omitting a size its governing doctrine already reasons about would
 * send the next reader back to first principles for no reason.
 */
export const TYPE_SCALE = {
  caption: { px: 12, utility: "text-xs", hand: false },
  small: { px: 14, utility: "text-sm", hand: false },
  body: { px: 16, utility: "text-base", hand: false },
  lead: { px: 18, utility: "text-lg", hand: true },
  title: { px: 20, utility: "text-xl", hand: true },
  display: { px: 24, utility: "text-2xl", hand: true },
  displayLg: { px: 30, utility: "text-3xl", hand: true },
} as const;

/**
 * The three surfaces where the hand face may appear below 18px, per
 * DESIGN-SYSTEM.md §2 as corrected by PR #8. Closed on purpose — that is
 * what makes it lintable, and §2 says outright that lintability is why the
 * two-scales option beat the run-length rule that describes the physics
 * more precisely but cannot be checked. "label-text" covers any element
 * labelling a control, not the Label component alone — Checkbox's inline
 * label included, per the same reading PR #8 already applied to "button
 * labels at any control-ramp size".
 */
export const HAND_FACE_EXCEPTIONS = ["badge-text", "label-text", "button-label"] as const;

/**
 * Two spacing floors, not a spacing scale — DESIGN-SYSTEM.md §3. Strokes
 * wander past their nominal box by 10.76px at p99 across every hand and both
 * themes, so two facing frames need 10.76 * 2 = 21.52px between them,
 * rounded up the 4px grid to 24. Page padding faces one frame rather than
 * two, so it is half: 12. Kept out of the control/token ramps above because
 * this is a collision floor between drawn frames, not a size a component
 * picks — see handicraft.css's own copy of these two numbers, which R5
 * cross-checks against this file.
 */
export const SPACING = {
  gapFrame: 24,
  padPage: 12,
} as const;
