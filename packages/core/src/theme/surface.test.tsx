import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { HandicraftSurface } from "./surface";

/**
 * S1 and S2 — cycle 005 §4.3.
 *
 * The defect these guard is not hypothetical and did not look like a bug in
 * the DOM. `globals.css:14-17` paints `body` from `var(--hc-paper)` resolved
 * at `:root`, and `.dark` may land on any descendant of `body`, so the theme
 * class and the paint are separable by construction. Cycle 004 iteration 1
 * separated them — `<main>` carried `.dark`, a descendant carried the paint —
 * and 26 of 67 committed baselines rendered chalk ink on light paper at
 * 1.1924:1 before F1 moved both onto the same element. `HandicraftSurface`
 * is the structural version of that fix, so what has to be asserted is the
 * coupling itself: not "it emits a class" and separately "it emits a paint",
 * but that one call emits both onto one element.
 *
 * Whole-token class matching throughout, never `String.includes`. `dark` is a
 * substring of every Tailwind `dark:` variant and of `darkish`, and a
 * substring check would report the class present on markup that carries no
 * theme class at all — the same vacuity shape `hasClass` exists for in
 * `design-tokens.test.ts`.
 *
 * No Rule V3 tier-2 concern here: this component renders no `.hc-frame` and
 * calls no engine code, so there is no `ResizeObserver` to stub and no
 * generated geometry to prove activated. The analogous "passes for the wrong
 * reason" hazard is jsdom silently dropping a `var()` value out of an inline
 * style, which would make every paint assertion below vacuous — so each one
 * asserts the value rather than the property's presence.
 */

/** The rendered root, typed. `container.firstElementChild` is the surface
 *  itself because the component renders exactly one element and no wrapper —
 *  the property cycle 005 §3.6 depends on to keep all 68 baselines
 *  byte-identical, and which S2's tag assertion pins from the other side. */
function surfaceOf(container: HTMLElement): HTMLElement {
  const el = container.firstElementChild;
  expect(el, "HandicraftSurface rendered nothing").not.toBeNull();
  return el as HTMLElement;
}

function classTokens(el: HTMLElement): string[] {
  return (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

it("S1 — HandicraftSurface emits the theme class and the paint on one element", () => {
  const dark = render(<HandicraftSurface dark />);
  const darkEl = surfaceOf(dark.container);

  expect(classTokens(darkEl), "dark surface carries no `dark` class token").toContain("dark");
  expect(darkEl.style.backgroundColor, "dark surface paints no background").toBe("var(--hc-paper)");
  expect(darkEl.style.color, "dark surface sets no ink colour").toBe("var(--hc-ink)");

  dark.unmount();

  // The other half of the coupling, and the half that actually distinguishes
  // this component from a `className={dark && "dark"}` helper: the paint does
  // not depend on the theme. A light surface that stopped painting would let
  // an ancestor's `.dark` reach through it, which is the 1.1924:1 render
  // arriving from the opposite direction.
  const light = render(<HandicraftSurface dark={false} />);
  const lightEl = surfaceOf(light.container);

  expect(classTokens(lightEl), "light surface carries a `dark` class token").not.toContain("dark");
  expect(lightEl.style.backgroundColor, "light surface paints no background").toBe(
    "var(--hc-paper)",
  );
  expect(lightEl.style.color, "light surface sets no ink colour").toBe("var(--hc-ink)");
});

it("S2 — `as` renders the requested tag, and the caller's className and style merge", () => {
  const { container } = render(
    <HandicraftSurface
      as="main"
      dark
      className="min-h-screen"
      style={{ backgroundColor: "rebeccapurple" }}
    />,
  );
  const el = surfaceOf(container);

  // `as="main"` is what `apps/playground/app/page.tsx` and
  // `apps/playground/app/matrix/page.tsx` both pass. A component that
  // silently rendered a `div` there would insert no element and break no
  // baseline, but it would change the document's landmark structure, which
  // axe reads and no screenshot does.
  expect(el.tagName, 'as="main" did not render a <main>').toBe("MAIN");

  const tokens = classTokens(el);
  expect(tokens, "the theme class was lost when a caller className was passed").toContain("dark");
  expect(tokens, "the caller's className was lost").toContain("min-h-screen");

  // The whole mitigation for painting inline rather than through a
  // `.hc-surface` class in `handicraft.css` is that the caller's `style`
  // spreads last, so a consumer can still override either declaration. Cycle
  // 005 §6 argues that mitigation is weak; this is the assertion that it at
  // least exists. `color` is untouched by the caller and must survive.
  expect(el.style.backgroundColor, "the caller's style did not override the default paint").toBe(
    "rebeccapurple",
  );
  expect(el.style.color, "overriding one declaration dropped the other").toBe("var(--hc-ink)");
});
