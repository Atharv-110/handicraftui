/**
 * The state parameter model — cycle 009.
 *
 * A policy table, not a compositor. It lands in its own file rather than
 * inside generator.ts for the reason ramps.ts's own header gives: a table of
 * doctrine numbers is easier to find and harder to break when it is not
 * buried in a 600-line file that consumes it. It also keeps generator.ts's
 * diff small, which matters because golden-shapes.test.ts is the Rule R1
 * instrument against that file.
 *
 * Every row is expressed relative to the active hand's own profile, not as
 * an absolute. ROADMAP.md §5.1 writes some numbers as absolutes
 * ("strokeWidth 2.5") and shipping that literally is wrong — HANDS.hurried is
 * already roughness 2.6, so an absolute error roughness of 2.4 would make an
 * error *calmer* than default on that one hand, inverting the intent. Every
 * row here is a delta or a ratio against the hand instead, and the
 * natural-hand result lands exactly on §5.1's literal — the check that the
 * translation is faithful rather than convenient.
 */

import type { SketchFillStyle } from "./generator";

export type SketchState = "default" | "hover" | "press" | "focus" | "disabled" | "error";

/**
 * Bowing is capped at 2.0 across every hand preset per PRINCIPLES.md — past
 * that the edges bow so hard they read pinched rather than drawn. Every
 * authored HANDS value already obeys it, but nothing in code enforced it;
 * `taperForSize` scales bowing and never clamps. A state delta is the first
 * thing that can push past the cap, so the clamp lands here rather than as a
 * silent trust that every future row stays under it by hand. S4 cross-checks
 * this constant against the live HANDS table instead of the reverse, so the
 * two cannot drift apart unnoticed.
 */
export const BOWING_CAP = 2.0;

/**
 * `press`'s stroke-width multiplier, written as a ratio rather than an
 * assignment — the same argument generator.ts already makes for
 * CHALK_STROKE_WIDTH: a ratio preserves each hand's relative weight, where an
 * absolute would flatten steady and loose to identical press weights.
 * ROADMAP.md §5.1 gives 2.5 against BASE_STROKE_WIDTH's 2.4; the natural hand
 * (2.4) lands on exactly 2.5 under this ratio, which is what proves it
 * reproduces the literal rather than merely resembling it.
 */
export const PRESS_STROKE_RATIO = 2.5 / 2.4;

interface StateDelta {
  /** Added to the hand's roughness. */
  roughnessDelta: number;
  /** Added to the hand's bowing, then clamped at BOWING_CAP. */
  bowingDelta: number;
  /** Multiplies the hand's strokeWidth. */
  strokeWidthRatio: number;
  /** Overrides the level's own fillStyle when set. Never raises density — see applyStateDelta. */
  fillStyle?: SketchFillStyle;
  /** Overrides the component's own stroke colour when set. */
  stroke?: string;
}

/**
 * One row per SketchState, complete rather than inherited. `press` restates
 * hover's +0.4 roughness instead of composing on top of a separate `hover`
 * row, because a press only ever happens with the pointer already down on the
 * element — hover is structurally true underneath it — so a reader reads one
 * row rather than reconstructing a composition chain.
 *
 * `focus` is an empty row on purpose. Its tier-1 expression is the shipped
 * `--hc-focus` outline, complete today; its tier-2 expression is the
 * pen-circle ring, cycle 010. The value exists in the type and in the
 * `&state=` vocabulary from day one so that cycle adds behaviour rather than
 * widening a public union.
 *
 * `disabled` changes only `fillStyle`. §5.1's other half — "ink at 45%" — is
 * a single opacity token the component applies (`--hc-opacity-disabled`).
 * Adding an ink-opacity field here too would multiply the two together on
 * every disabled frame: cycle 008's doubling defect, in a new medium. One
 * home, one number.
 */
export const STATE_DELTAS: Record<SketchState, StateDelta> = {
  default: { roughnessDelta: 0, bowingDelta: 0, strokeWidthRatio: 1 },
  hover: { roughnessDelta: 0.4, bowingDelta: 0, strokeWidthRatio: 1 },
  press: { roughnessDelta: 0.4, bowingDelta: 0, strokeWidthRatio: PRESS_STROKE_RATIO },
  focus: { roughnessDelta: 0, bowingDelta: 0, strokeWidthRatio: 1 },
  disabled: { roughnessDelta: 0, bowingDelta: 0, strokeWidthRatio: 1, fillStyle: "dots" },
  error: {
    roughnessDelta: 0.2,
    bowingDelta: 0.6,
    strokeWidthRatio: 1,
    stroke: "var(--hc-danger-ink)",
  },
};

/**
 * Highest-precedence state wins, as an ordered array rather than a chain of
 * conditionals — `resolveState` below reads it directly rather than
 * reimplementing the order as if/else branches that could silently disagree
 * with this list.
 */
export const STATE_PRECEDENCE: readonly SketchState[] = [
  "disabled",
  "error",
  "press",
  "hover",
  "focus",
  "default",
];

/**
 * Resolves a component's explicit `state` option against the pointer-derived
 * state `useSketchFrame` tracks internally. An explicit option other than
 * `"default"` always wins — disabled and error are facts only the component
 * can know, and a mouse hovering a disabled button must not un-disable its
 * geometry. `"default"` (or omitting the option) means "derive from the
 * pointer".
 */
export function resolveState(
  option: SketchState | undefined,
  pointerState: SketchState,
): SketchState {
  if (option && option !== "default") return option;
  return pointerState;
}

interface StateableStyle {
  roughness: number;
  bowing: number;
  strokeWidth: number;
  stroke?: string;
}

interface StatedStyle extends StateableStyle {
  fillStyle?: SketchFillStyle;
}

/**
 * Applies one state row to already-resolved hand parameters. Runs before
 * `taperForSize`, not after — `compose()` already tapers whatever it
 * receives, so applying a state delta first is what keeps a 20×20 checkbox's
 * hover proportional to its size, in exactly the way generator.ts already
 * argues for chalk's stroke boost (`compose`'s own comment on `strokeWidth`).
 */
export function applyStateDelta(base: StateableStyle, state: SketchState): StatedStyle {
  const delta = STATE_DELTAS[state];
  return {
    roughness: base.roughness + delta.roughnessDelta,
    bowing: Math.min(base.bowing + delta.bowingDelta, BOWING_CAP),
    strokeWidth: base.strokeWidth * delta.strokeWidthRatio,
    stroke: delta.stroke ?? base.stroke,
    ...(delta.fillStyle !== undefined ? { fillStyle: delta.fillStyle } : {}),
  };
}
