/**
 * The theme registry — cycle 013, mechanism only.
 *
 * A theme owns colours (declared in a stylesheet block, see handicraft.css's
 * `.dark` and any `[data-hc-theme="<name>"]:not(.dark)` block a theme file
 * adds) and texture parameters (this file). It never owns geometry:
 * roughness, bowing, stroke width and the hand presets stay PRINCIPLES.md's
 * locked engine invariants, each its own DECISION-REQUIRED. This file is
 * the second half of that split — the four chalk constants that used to be
 * literals inside generator.ts's `compose`, given one name and one home
 * each instead of a hard-coded pair.
 */

/**
 * The four constants DESIGN-SYSTEM.md's Known-limits section names —
 * declarable as of this cycle, still uncalibrated. Absorbing the
 * declaration half of the long-deferred chalk-calibration backlog item is
 * what this cycle does; whether 0.13 is the right dust opacity, say, is
 * untouched and stays owed to a browser pass over a chalk-specific
 * specimen set.
 */
export interface TextureProfile {
  /** Added to the pass's stroke width for the wide faint dust pass under the ink. */
  dustStrokeBoost: number;
  /** The dust pass's own opacity. */
  dustOpacity: number;
  /** Multiplies the level's hachure gap. Chalk does not hatch finely. */
  hachureGapScale: number;
  /** The ink pass's opacity. Chalk on slate reads harder than ink on paper at 1. */
  inkOpacity: number;
}

export interface HandicraftTheme {
  name: string;
  chalk: boolean;
  treatment: TextureProfile;
}

/**
 * The four literals `generator.ts`'s `compose` carried inline before this
 * cycle: `strokeWidth + 2.6` for the dust pass, `0.13` for its opacity,
 * `hachureGap * 1.3` for chalk's wider hatch, `0.92` for the ink pass's
 * opacity. Exported on its own — not only reachable through
 * `THEMES.blackboard.treatment` — so generator.ts's own fallback (a caller
 * passing `chalk: true` with no `texture` opinion at all) reads the exact
 * object `THEMES.blackboard.treatment` does, rather than a second literal
 * copy of the same four numbers that could drift from it the way
 * `--hc-stroke-w` and `BASE_STROKE_WIDTH` already have to be guarded
 * against drifting from each other.
 */
export const BLACKBOARD_TREATMENT: TextureProfile = {
  dustStrokeBoost: 2.6,
  dustOpacity: 0.13,
  hachureGapScale: 1.3,
  inkOpacity: 0.92,
};

/**
 * Inert rather than absent. `compose()` only ever reads a texture profile
 * inside a `style.chalk` branch (generator.ts), so these four numbers have
 * no effect while notebook is active — but `HandicraftTheme.treatment` is
 * not optional, and leaving it out would push "what if this theme turns
 * chalk on later" onto every reader of this table instead of answering it
 * once, here, with values that are individually correct no-ops: no boost,
 * no dust, no gap widening, full opacity.
 */
const NOTEBOOK_TREATMENT: TextureProfile = {
  dustStrokeBoost: 0,
  dustOpacity: 0,
  hachureGapScale: 1,
  inkOpacity: 1,
};

/**
 * What `HandicraftProvider`'s `theme` prop resolves a string against. Not
 * exhaustive by design — the same prop also accepts a `HandicraftTheme`
 * object directly, the extension seam for a theme this library never
 * registered. That seam is safe against the cache because
 * `generator.ts`'s cache key serialises the four texture numbers
 * themselves, not a theme name, so an unregistered profile still gets its
 * own cache entries rather than colliding with blackboard's.
 *
 * A plain `Record<string, HandicraftTheme>` rather than a closed union of
 * keys — `THEMES[name]` has to type-check for an arbitrary runtime string,
 * which is what a lookup against user input is.
 */
export const THEMES: Record<string, HandicraftTheme> = {
  notebook: { name: "notebook", chalk: false, treatment: NOTEBOOK_TREATMENT },
  blackboard: { name: "blackboard", chalk: true, treatment: BLACKBOARD_TREATMENT },
};
