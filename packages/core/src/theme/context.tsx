"use client";

import { createContext, use, useEffect, useMemo, type ReactNode } from "react";
import { preloadSketchEngine, type FillLevel, type InkStyle } from "../engine/generator";
import { THEMES, type HandicraftTheme, type TextureProfile } from "./themes";

/**
 * `lite`  — CSS-only frame. No JavaScript, no measurement, SSR-exact.
 * `high`  — rough.js geometry, mounted after measurement.
 *
 * `high` is the default. CSS cannot express corner overshoot or hachure fill,
 * so a CSS-default library will always read as rounded rectangles no matter how
 * the parameters are tuned. Tier 1 remains the pre-hydration paint, the no-JS
 * fallback, and the opt-out for very large lists.
 */
export type Fidelity = "lite" | "high";

/**
 * A drawing personality, not just a seed — each preset shifts roughness, bowing
 * and stroke weight together, the way a different person with a different pen
 * would.
 */
export type Hand = "steady" | "natural" | "loose" | "hurried";

export interface HandProfile {
  roughness: number;
  bowing: number;
  strokeWidth: number;
}

export const HANDS: Record<Hand, HandProfile> = {
  steady: { roughness: 1.6, bowing: 1.0, strokeWidth: 2.0 },
  natural: { roughness: 2.2, bowing: 1.4, strokeWidth: 2.4 },
  loose: { roughness: 3.0, bowing: 2.0, strokeWidth: 2.6 },
  // Bowing is capped at 2.0 across every preset: past that the edges bow so
  // hard they read pinched rather than drawn.
  hurried: { roughness: 2.6, bowing: 2.0, strokeWidth: 1.8 },
};

export interface HandicraftConfig {
  fidelity: Fidelity;
  hand: Hand;
  ink: InkStyle;
  /**
   * The page's texture budget — a **ceiling**, not a default. Components declare
   * their own intent and get the lower of the two, so `fill="no"` flattens the
   * whole UI while a component that has decided its surface needs to stay
   * readable is never forced denser.
   */
  fill: FillLevel;
  /** Shifts every component's pool index, so one page is drawn by one hand. */
  handOffset: number;
  /** Adds a turbulence filter to the tier-1 stroke layers. */
  texture: boolean;
  /**
   * Animate frames in as if being drawn: pencil guideline, then ink, then the
   * fill fades and the pen lands. Off by default — on a dense page every frame
   * animating at once is a lot of motion, and it only really pays on an
   * entrance the user is looking at. Always suppressed under
   * `prefers-reduced-motion`.
   */
  drawOn: boolean;
  /**
   * Duration of the whole draw-on sequence in milliseconds — not of any single
   * pass. Each pass takes a fraction of it, so changing this speeds up or slows
   * down the entire drawing without reordering it.
   */
  drawOnDuration: number;
  /**
   * Draw as chalk on slate rather than ink on paper: a wide faint dust pass under
   * a heavier, softer stroke, and a wider hachure gap.
   *
   * The application sets this alongside whatever puts `.dark` on the tree, because
   * React cannot see a CSS class. Detecting it instead — matchMedia, or observing
   * an ancestor — would give the server no way to agree with the client, and the
   * mismatch would land as a visible flash on the one code path whose whole design
   * goal is that the handover never announces itself.
   */
  chalk: boolean;
  /**
   * The active theme's texture treatment, resolved once here rather than
   * left for every frame to re-resolve the theme registry itself — see
   * `HandicraftProviderProps.theme`. Threaded to `SketchStyle.texture`
   * (`useSketchFrame.tsx`), which is what lets the four chalk constants
   * live per theme instead of as literals inside `generator.ts`.
   */
  treatment: TextureProfile;
}

/** The theme a provider resolves to when its `theme` prop is omitted, or
 *  names something `THEMES` does not recognise. Kept as a name rather than
 *  a direct `THEMES.notebook` reference so the "unrecognised name" branch
 *  below reads as a lookup falling back to the same default, not a special
 *  case with its own literal. */
const DEFAULT_THEME_NAME = "notebook";

const DEFAULTS: HandicraftConfig = {
  fidelity: "high",
  hand: "natural",
  ink: "layered",
  // `med` so a component's own intent is honoured up to that point; raising the
  // ceiling further would not change anything, since the result is always the
  // lower of ceiling and intent.
  fill: "med",
  handOffset: 0,
  texture: true,
  drawOn: false,
  // Long enough to read as a hand moving rather than as a flicker. The first
  // pass at 520ms was over before the eye could follow it.
  drawOnDuration: 1100,
  chalk: false,
  treatment: THEMES[DEFAULT_THEME_NAME]!.treatment,
};

const HandicraftContext = createContext<HandicraftConfig>(DEFAULTS);

export function useHandicraft(): HandicraftConfig {
  return use(HandicraftContext);
}

/** Resolved rough.js parameters for the active hand. */
export function useHandProfile(): HandProfile {
  return HANDS[useHandicraft().hand];
}

export interface HandicraftProviderProps extends Partial<Omit<HandicraftConfig, "treatment">> {
  children: ReactNode;
  /**
   * "notebook" (default) or "blackboard" by name, resolved through the
   * built-in registry above, or a `HandicraftTheme` object for a theme
   * this library never registered — the extension seam
   * `generator.ts`'s cache key exists for: it serialises the four texture
   * numbers themselves, not a name, so an unregistered profile still gets
   * its own cache entries rather than colliding with blackboard's.
   *
   * Only supplies a *default* for `chalk` and the resolved `treatment`; an
   * explicit `chalk` prop below still wins, which is what keeps
   * `matrix/page.tsx`'s `chalk={hc.dark}` correct with no edit to that call
   * site even though it never passes `theme` at all.
   */
  theme?: string | HandicraftTheme;
}

export function HandicraftProvider({
  children,
  fidelity = DEFAULTS.fidelity,
  hand = DEFAULTS.hand,
  ink = DEFAULTS.ink,
  fill = DEFAULTS.fill,
  handOffset = DEFAULTS.handOffset,
  texture = DEFAULTS.texture,
  drawOn = DEFAULTS.drawOn,
  drawOnDuration = DEFAULTS.drawOnDuration,
  theme = DEFAULT_THEME_NAME,
  // No default value here on purpose — chalk stays `undefined` unless a
  // caller actually passed it, which is the only way "explicit wins" below
  // can tell that case apart from "the caller never mentioned chalk and it
  // happens to equal the theme's own default".
  chalk,
}: HandicraftProviderProps) {
  // Start fetching roughjs immediately rather than waiting for the first
  // component to ask for it. Combined with the sync generate path, this is what
  // stops every page load showing the CSS frame for a beat and then visibly
  // changing to rough.js geometry.
  useEffect(() => {
    if (fidelity === "high") preloadSketchEngine();
  }, [fidelity]);

  // A string resolves through the registry, falling back to notebook for a
  // name nobody registered rather than throwing — the same "wrong input
  // degrades, does not crash" posture generator.ts already takes for a
  // missing roughjs peer dependency. An object (the extension seam) is used
  // directly.
  const resolvedTheme: HandicraftTheme =
    typeof theme === "string" ? (THEMES[theme] ?? THEMES[DEFAULT_THEME_NAME]!) : theme;

  const effectiveChalk = chalk !== undefined ? chalk : resolvedTheme.chalk;

  // Theme and the *effective* chalk can disagree once chalk is overridden —
  // matrix/page.tsx passes chalk={hc.dark} with no theme prop at all, so
  // resolvedTheme is always notebook (chalk: false, an inert treatment)
  // regardless of what the URL's &dark= asks for. Reading
  // resolvedTheme.treatment unconditionally there would hand a chalk-true
  // frame the notebook profile's zeros — no dust pass, no hachure widening,
  // full-opacity ink — and move every one of the 26 committed dark matrix
  // baselines. Falling back to the built-in profile that matches the
  // *effective* chalk value is what keeps that call site correct with no
  // edit: the fallback only fires on a mismatch, so a theme whose own chalk
  // already agrees with the resolved value — blackboard picked directly, or
  // a self-consistent custom theme object — still gets its own treatment
  // untouched.
  const treatment: TextureProfile =
    effectiveChalk === resolvedTheme.chalk
      ? resolvedTheme.treatment
      : THEMES[effectiveChalk ? "blackboard" : DEFAULT_THEME_NAME]!.treatment;

  const value = useMemo<HandicraftConfig>(
    () => ({
      fidelity,
      hand,
      ink,
      fill,
      handOffset,
      texture,
      drawOn,
      drawOnDuration,
      chalk: effectiveChalk,
      treatment,
    }),
    [
      fidelity,
      hand,
      ink,
      fill,
      handOffset,
      texture,
      drawOn,
      drawOnDuration,
      effectiveChalk,
      treatment,
    ],
  );

  return (
    <HandicraftContext.Provider value={value}>
      {texture ? <TextureDefs /> : null}
      {children}
    </HandicraftContext.Provider>
  );
}

/**
 * One turbulence filter for the whole document, referenced by
 * `filter: url(#hc-wobble)` in handicraft.css. Rendered once by the provider
 * rather than per component.
 *
 * `scale` is 5, not the 2 this started at. At 2 the effect is invisible; at 5
 * the CSS borders genuinely break and wobble, which is what lets tier 1 stand
 * in for tier 2 during the first paint without the swap announcing itself.
 */
function TextureDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter id="hc-wobble">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves={4}
            seed={3}
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
        </filter>
      </defs>
    </svg>
  );
}
