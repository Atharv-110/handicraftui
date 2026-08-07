import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { HandicraftProvider } from "@handicraft/core";
import { Button } from "../default/ui/button/button";

/**
 * Cycle 009. Button is the component that makes the motion and opacity tokens
 * load-bearing rather than decorative — it is the only consumer either one has
 * today, so a token nobody reads would look exactly like a token that works.
 */
async function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(<HandicraftProvider>{node}</HandicraftProvider>);
  });
  return container;
}

describe("Button — state and tokens", () => {
  it("B1 — a disabled button publishes disabled on its frame", async () => {
    // `disabled` is a fact only the component knows, so it is passed through
    // `useSketchFrame`'s `state` option rather than derived from a pointer. The
    // button is its own frame here, unlike Input's wrapper, so the attribute and
    // the native `disabled` land on the same element.
    const container = await mount(<Button disabled>Disabled</Button>);
    const frame = container.querySelector(".hc-frame")! as HTMLButtonElement;

    expect(frame.getAttribute("data-hc-state")).toBe("disabled");
    // The native attribute has to survive `disabled` being destructured out of
    // the props spread — without it the button would look disabled and still be
    // clickable and still be in the tab order.
    expect(frame.disabled).toBe(true);

    const enabled = await mount(<Button>Save changes</Button>);
    expect(enabled.querySelector(".hc-frame")!.getAttribute("data-hc-state")).toBe("default");
  });

  it("B2 — the class list reads the tokens, with no literal duration or opacity left", async () => {
    // Read off the rendered element, never off the source file. Cycle 002b paid
    // for the difference: an `input.tsx` comment saying `px-4` satisfied a source
    // check while the element itself carried `px-3`.
    //
    // Both halves matter. The positive says the token is actually consumed —
    // 100ms and 0.45 have exactly one home each, and this line is what makes the
    // home load-bearing. The negative says the value it replaced is gone: a
    // stylesheet token sitting beside a surviving `duration-100` literal is two
    // homes for one number, which is the defect DESIGN-SYSTEM.md opens by naming
    // three times over.
    const container = await mount(<Button disabled>Disabled</Button>);
    const classes = container.querySelector(".hc-frame")!.className;

    expect(classes).toContain("duration-[var(--hc-motion-state)]");
    expect(classes).toContain("disabled:opacity-[var(--hc-opacity-disabled)]");

    expect(classes, "a literal duration survived beside the token").not.toMatch(
      /(^|\s|:)duration-100(\s|$)/,
    );
    expect(classes, "a literal opacity survived beside the token").not.toMatch(
      /(^|\s|:)opacity-50(\s|$)/,
    );

    // box-shadow joined the transition list this cycle, because hover's tier-1
    // expression now moves the lift shadow by 1px and an untransitioned shadow
    // would snap while the background faded.
    expect(classes).toContain("transition-[transform,background-color,box-shadow]");
  });
});
