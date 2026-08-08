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

/**
 * TH8 — cycle 013. The DOM half of the theme slot.
 *
 * `data-hc-theme` is the selector every theme block after blackboard declares
 * under, so a surface that stops emitting it makes every such block
 * unreachable — with nothing else red, because the tokens still resolve at
 * `:root` and the page still paints. That is the same silent-inheritance shape
 * E5 guards one level down, arriving through the DOM instead of the cascade.
 *
 * Whole-token class matching here too, for the reason S1's header gives.
 */
it('TH8 — the surface emits data-hc-theme, and theme="blackboard" emits the identical class as dark', () => {
  // The attribute is emitted unconditionally, including for the default. That
  // is deliberate rather than incidental: no selector anywhere matches
  // `[data-hc-theme="notebook"]` — handicraft.css declares only
  // `[data-hc-theme="blackboard"]`, and a theme file declares its own name —
  // so the default value is inert in the cascade and exists to be addressable
  // from a test and from a consumer's own CSS.
  const notebook = render(<HandicraftSurface />);
  const notebookEl = surfaceOf(notebook.container);
  expect(
    notebookEl.getAttribute("data-hc-theme"),
    "the default surface emits no data-hc-theme, so no theme block is addressable",
  ).toBe("notebook");
  expect(classTokens(notebookEl), "the default surface carries a `dark` class token").not.toContain(
    "dark",
  );
  notebook.unmount();

  // The alias claim, and the reason `dark` did not need retiring: two spellings
  // of one intent must produce the same element. Compared as whole attribute
  // and class sets rather than as two separate `toContain` checks, because
  // "both carry `dark`" is satisfied by markup that also differs somewhere
  // else — which is precisely how a baseline moves under a green test.
  const viaDark = render(<HandicraftSurface dark />);
  const viaDarkEl = surfaceOf(viaDark.container);
  const darkClasses = classTokens(viaDarkEl).sort();
  const darkTheme = viaDarkEl.getAttribute("data-hc-theme");
  viaDark.unmount();

  const viaTheme = render(<HandicraftSurface theme="blackboard" />);
  const viaThemeEl = surfaceOf(viaTheme.container);

  expect(
    classTokens(viaThemeEl).sort(),
    'theme="blackboard" and dark no longer emit the identical class list, so the boolean alias and the named theme have drifted apart',
  ).toEqual(darkClasses);
  expect(darkClasses, "the dark surface carries no `dark` class token").toContain("dark");
  expect(
    viaThemeEl.getAttribute("data-hc-theme"),
    'theme="blackboard" and dark no longer emit the identical data-hc-theme',
  ).toBe(darkTheme);
  expect(darkTheme, "the dark surface no longer identifies itself as blackboard").toBe(
    "blackboard",
  );
  viaTheme.unmount();

  // Both signals on one element, independently controlled. This is the
  // configuration `[data-hc-theme="<name>"]:not(.dark)` exists to resolve and
  // the one M18 drives in a real browser: `dark` still decides the class while
  // `theme` decides the attribute, so a caller can put a foreign theme's name
  // on a blackboard element and let the cascade pick the winner.
  const both = render(<HandicraftSurface dark theme="fixture" />);
  const bothEl = surfaceOf(both.container);
  expect(
    classTokens(bothEl),
    "dark no longer emits its class when an explicit theme is also passed, so the two signals cannot be driven at once and M18's subject cannot be built",
  ).toContain("dark");
  expect(
    bothEl.getAttribute("data-hc-theme"),
    "an explicit theme no longer wins for the attribute when dark is also set",
  ).toBe("fixture");
  both.unmount();
});
