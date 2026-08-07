import { describe, expect, it } from "vitest";
import {
  applyStateDelta,
  resolveState,
  BOWING_CAP,
  PRESS_STROKE_RATIO,
  STATE_DELTAS,
  STATE_PRECEDENCE,
  type SketchState,
} from "./state";
import { HANDS, type Hand } from "../theme/context";

/**
 * Cycle 009's policy table, read directly rather than through the hook.
 *
 * `state.ts` is deliberately not exported from the barrel (`index.ts` publishes
 * only `type SketchState`), so this file imports it relatively — the same
 * arrangement `ramps.ts` already has with `tier-agreement.test.ts`. Keeping the
 * table internal is what stops its shape becoming public API before anything
 * outside the package needs to import it.
 *
 * Every expected number below is written as its arithmetic against the live
 * `HANDS` profile rather than as a bare literal, so a hand retune fails the
 * assertion that the *delta* is wrong rather than silently re-anchoring what the
 * test claims to prove.
 */

/**
 * The six values of `SketchState`, as a runtime list.
 *
 * TypeScript unions do not survive to runtime, so a test that wants to iterate
 * every state has to restate them. Restating them is the point rather than a
 * concession: S1 below compares this list against `STATE_DELTAS`'s own keys in
 * both directions, so adding a seventh state to the type without adding a row —
 * or adding a row the type does not name — fails here instead of shipping a
 * state whose parameters are silently `undefined`.
 */
const ALL_STATES: readonly SketchState[] = [
  "default",
  "hover",
  "press",
  "focus",
  "disabled",
  "error",
];

/** The hand profile plus the component-supplied stroke `applyStateDelta` takes. */
function baseFor(hand: Hand) {
  return { ...HANDS[hand], stroke: "var(--hc-ink)" };
}

describe("the state parameter table", () => {
  it("S1 — one delta row per state, and a precedence list naming each exactly once", () => {
    // Both directions. A row for a state the type does not name is dead policy;
    // a state with no row reaches `applyStateDelta` as `undefined` and throws on
    // property access, which is a crash rather than a wrong drawing and would be
    // found late.
    expect(Object.keys(STATE_DELTAS).sort()).toEqual([...ALL_STATES].sort());

    expect(STATE_PRECEDENCE).toHaveLength(ALL_STATES.length);
    expect([...STATE_PRECEDENCE].sort()).toEqual([...ALL_STATES].sort());
    expect(new Set(STATE_PRECEDENCE).size, "a state listed twice in the precedence order").toBe(
      STATE_PRECEDENCE.length,
    );

    // `disabled` first and `default` last is the whole ordering claim: a fact
    // the component knows beats anything a pointer can derive, and "default"
    // means "derive from the pointer" rather than being a state that wins.
    expect(STATE_PRECEDENCE[0]).toBe("disabled");
    expect(STATE_PRECEDENCE[STATE_PRECEDENCE.length - 1]).toBe("default");

    // `resolveState` is the one function that reads that order, so its behaviour
    // belongs to this assertion rather than to a seventh test: an explicit
    // non-default option always wins, and "default" or an absent option means
    // "derive from the pointer". H3 covers the same precedence through the hook,
    // where the pointer half is real.
    expect(resolveState("disabled", "hover")).toBe("disabled");
    expect(resolveState("error", "press")).toBe("error");
    expect(resolveState("default", "hover")).toBe("hover");
    expect(resolveState(undefined, "press")).toBe("press");
    expect(resolveState(undefined, "default")).toBe("default");
  });

  it("S2 — hover adds 0.4 roughness to whichever hand is active, not an absolute", () => {
    // ROADMAP §5.1 writes this row's tier-2 column as "+0.4 roughness", and the
    // natural hand is the check that the translation is faithful: 2.2 + 0.4 =
    // 2.6 lands exactly on the literal that section gives. `steady` is the
    // second hand because an absolute would flatten it to natural's value and
    // this is the assertion that would notice.
    expect(applyStateDelta(baseFor("natural"), "hover").roughness).toBeCloseTo(
      HANDS.natural.roughness + 0.4,
      10,
    );
    expect(applyStateDelta(baseFor("natural"), "hover").roughness).toBeCloseTo(2.6, 10);

    expect(applyStateDelta(baseFor("steady"), "hover").roughness).toBeCloseTo(
      HANDS.steady.roughness + 0.4,
      10,
    );
    expect(applyStateDelta(baseFor("steady"), "hover").roughness).toBeCloseTo(2.0, 10);
  });

  it("S3 — press scales stroke width by a ratio, so each hand keeps its relative weight", () => {
    // §5.1 gives 2.5 against BASE_STROKE_WIDTH's 2.4, so the multiplier is
    // 2.5 / 2.4 and the natural hand reproduces the literal exactly. `hurried`
    // is the witness that this is a ratio and not an assignment: at 1.8 it
    // presses to 1.875, where an absolute would have made the lightest hand
    // press harder than the heaviest one draws.
    expect(applyStateDelta(baseFor("natural"), "press").strokeWidth).toBeCloseTo(2.5, 10);
    expect(applyStateDelta(baseFor("hurried"), "press").strokeWidth).toBeCloseTo(1.875, 10);
    expect(applyStateDelta(baseFor("hurried"), "press").strokeWidth).toBeCloseTo(
      HANDS.hurried.strokeWidth * PRESS_STROKE_RATIO,
      10,
    );
  });

  it("S4 — error bowing clamps at the cap, and the cap is the hand table's own maximum", () => {
    // natural: min(1.4 + 0.6, 2.0) = 2.0, landing on §5.1's literal.
    expect(applyStateDelta(baseFor("natural"), "error").bowing).toBeCloseTo(2.0, 10);
    // loose already sits at the cap, so the +0.6 is a no-op there and error is
    // carried by roughness and ink alone. Stated as an assertion rather than
    // left as a comment, because it is the case the clamp exists for.
    expect(applyStateDelta(baseFor("loose"), "error").bowing).toBeCloseTo(2.0, 10);
    expect(applyStateDelta(baseFor("hurried"), "error").bowing).toBeCloseTo(2.0, 10);

    // The cross-check, and the direction matters: the constant is asserted
    // against the live HANDS table rather than the table against the constant.
    // PRINCIPLES.md says bowing is capped at 2.0 across every preset, nothing in
    // code enforced it until this cycle, and a future hand authored above the
    // cap must fail here rather than be quietly clamped everywhere it is used.
    expect(Math.max(...Object.values(HANDS).map((h) => h.bowing))).toBe(BOWING_CAP);
  });

  it("S5 — disabled changes the fill style and nothing else", () => {
    // §5.1's other half — "ink at 45%" — is `--hc-opacity-disabled` on the
    // component, one home. An ink-opacity field here as well would multiply the
    // two on every disabled frame, which is cycle 008's doubling defect in a new
    // medium. So this row is allowed to move exactly one field.
    const base = baseFor("natural");
    const out = applyStateDelta(base, "disabled");

    expect(out.fillStyle).toBe("dots");
    expect(out.roughness).toBe(base.roughness);
    expect(out.bowing).toBe(base.bowing);
    expect(out.strokeWidth).toBe(base.strokeWidth);
    expect(out.stroke).toBe(base.stroke);
  });

  it("S6 — every state except default and focus is a real parameter shift", () => {
    // `focus` is excluded on purpose and the reason is that it is not a
    // parameter shift at all: its tier-1 expression is the shipped `--hc-focus`
    // outline, complete today, and its tier-2 expression is the pen-circle ring,
    // cycle 010. Its row exists so that cycle adds behaviour rather than
    // widening a public union. Naming the exclusion here rather than filtering
    // it out silently is what stops a later reader treating an empty row as an
    // oversight and "fixing" it.
    const base = baseFor("natural");
    const asDefault = applyStateDelta(base, "default");

    for (const state of ALL_STATES) {
      if (state === "default" || state === "focus") continue;
      const out = applyStateDelta(base, state);
      const moved =
        out.roughness !== asDefault.roughness ||
        out.bowing !== asDefault.bowing ||
        out.strokeWidth !== asDefault.strokeWidth ||
        out.fillStyle !== asDefault.fillStyle ||
        out.stroke !== asDefault.stroke;
      expect(moved, `state "${state}" is indistinguishable from default`).toBe(true);
    }

    // The two states that must not move anything, asserted from the other side
    // so this test cannot pass by moving every row including those two.
    expect(applyStateDelta(base, "focus")).toEqual(asDefault);
  });
});
