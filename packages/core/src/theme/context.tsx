"use client";

import { createContext, use, useEffect, useMemo, type ReactNode } from "react";
import { preloadSketchEngine, type FillLevel, type InkStyle } from "../engine/generator";

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

export interface HandcraftConfig {
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
}

const DEFAULTS: HandcraftConfig = {
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
};

const HandcraftContext = createContext<HandcraftConfig>(DEFAULTS);

export function useHandcraft(): HandcraftConfig {
  return use(HandcraftContext);
}

/** Resolved rough.js parameters for the active hand. */
export function useHandProfile(): HandProfile {
  return HANDS[useHandcraft().hand];
}

export interface HandcraftProviderProps extends Partial<HandcraftConfig> {
  children: ReactNode;
}

export function HandcraftProvider({
  children,
  fidelity = DEFAULTS.fidelity,
  hand = DEFAULTS.hand,
  ink = DEFAULTS.ink,
  fill = DEFAULTS.fill,
  handOffset = DEFAULTS.handOffset,
  texture = DEFAULTS.texture,
  drawOn = DEFAULTS.drawOn,
  drawOnDuration = DEFAULTS.drawOnDuration,
}: HandcraftProviderProps) {
  // Start fetching roughjs immediately rather than waiting for the first
  // component to ask for it. Combined with the sync generate path, this is what
  // stops every page load showing the CSS frame for a beat and then visibly
  // changing to rough.js geometry.
  useEffect(() => {
    if (fidelity === "high") preloadSketchEngine();
  }, [fidelity]);

  const value = useMemo<HandcraftConfig>(
    () => ({ fidelity, hand, ink, fill, handOffset, texture, drawOn, drawOnDuration }),
    [fidelity, hand, ink, fill, handOffset, texture, drawOn, drawOnDuration],
  );

  return (
    <HandcraftContext.Provider value={value}>
      {texture ? <TextureDefs /> : null}
      {children}
    </HandcraftContext.Provider>
  );
}

/**
 * One turbulence filter for the whole document, referenced by
 * `filter: url(#hc-wobble)` in handcraft.css. Rendered once by the provider
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
