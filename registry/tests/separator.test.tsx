import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { HandicraftProvider, taperForSize, BASE_STROKE_WIDTH } from "@handicraft/core";
import { Separator } from "../default/ui/separator/separator";

/**
 * Deliberately tier-1 only. jsdom has no `ResizeObserver` and returns zeroed
 * `getBoundingClientRect`/`offsetWidth`/`offsetHeight` (Rule V3), so tier 2
 * never activates here without the full stub set `tier2.test.tsx` carries.
 * Anything that depends on real rough.js geometry belongs in
 * `rule-geometry.test.ts`, which calls `generateSketch` directly instead.
 */
async function mount(children: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(<HandicraftProvider>{children}</HandicraftProvider>);
  });
  return container;
}

describe("Separator — tier 1", () => {
  it("A7: carries border-t-2, and that rounds from the taper's own 700x2 stroke", async () => {
    const container = await mount(<Separator />);
    const el = container.querySelector(".hc-frame")!;
    expect(el.className).toMatch(/\bborder-t-2\b/);

    // The number, not just the class: border-t-2 is 2px, which must be
    // Math.round of the taper's own computed stroke for a 700x2 rule. If
    // TAPER_PIVOT or the scaleStroke coefficients ever drift, this fails
    // independently of A3 in rule-geometry.test.ts — two witnesses, not one.
    expect(Math.round(taperForSize(700, 2).scaleStroke(BASE_STROKE_WIDTH))).toBe(2);
  });

  it("A8: default carries role=separator with no aria-orientation; vertical adds it; decorative gives role=none and neither", async () => {
    const horizontal = await mount(<Separator />);
    const horizontalEl = horizontal.querySelector(".hc-frame")!;
    expect(horizontalEl.getAttribute("role")).toBe("separator");
    expect(horizontalEl.hasAttribute("aria-orientation")).toBe(false);

    const vertical = await mount(<Separator orientation="vertical" />);
    const verticalEl = vertical.querySelector(".hc-frame")!;
    expect(verticalEl.getAttribute("role")).toBe("separator");
    expect(verticalEl.getAttribute("aria-orientation")).toBe("vertical");

    const decorative = await mount(<Separator decorative />);
    const decorativeEl = decorative.querySelector(".hc-frame")!;
    expect(decorativeEl.getAttribute("role")).toBe("none");
    expect(decorativeEl.hasAttribute("aria-orientation")).toBe(false);
  });

  it("A9: a parent with zero height renders without throwing and mounts no svg", async () => {
    // No explicit height anywhere in the chain — jsdom gives every element
    // 0x0 by default, so this exercises the real h<=0 guard rather than a
    // contrived zero.
    //
    // `.hc-sketch-svg`, not a bare `svg` selector: HandicraftProvider mounts
    // its own always-present wobble-filter `<svg>` regardless of tier, so a
    // bare selector would match that instead of the sketch layer and assert
    // nothing about this component.
    const container = await mount(<Separator orientation="vertical" />);
    expect(container.querySelector(".hc-frame")).not.toBeNull();
    expect(container.querySelector(".hc-sketch-svg")).toBeNull();
  });

  it("A10: carries before:hidden and after:hidden", async () => {
    const container = await mount(<Separator />);
    const el = container.querySelector(".hc-frame")!;
    expect(el.className).toMatch(/\bbefore:hidden\b/);
    expect(el.className).toMatch(/\bafter:hidden\b/);
  });

  it("A10b: carries data-hc-fill=no and no --hc-fill-color inline custom property", async () => {
    const container = await mount(<Separator />);
    const el = container.querySelector(".hc-frame") as HTMLElement;
    expect(el.getAttribute("data-hc-fill")).toBe("no");
    expect(el.style.getPropertyValue("--hc-fill-color")).toBe("");
  });
});
