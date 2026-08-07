import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { HandicraftProvider } from "@handicraft/core";
import { Checkbox } from "../default/ui/checkbox/checkbox";

/**
 * Cycle 009 iteration 2. Checkbox is the third component wired to the state
 * model, and it was wired because the cycle had already reached it without
 * meaning to.
 *
 * §3.6's `.hc-frame:has(> :disabled)` rule was written for the wrapper-framed
 * shape, and Checkbox is the one shipped component whose real control is a
 * direct child of its frame — so a disabled Checkbox drew a dashed border at
 * tier 1 while publishing `data-hc-state="default"` and full opacity, the only
 * frame on the harness that disagreed with itself. The state option is the
 * other half of the rule that already matched it.
 */
async function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(<HandicraftProvider>{node}</HandicraftProvider>);
  });
  return container;
}

describe("Checkbox — state", () => {
  it("K1 — a disabled Checkbox publishes disabled and fades by the token, not a literal", async () => {
    const container = await mount(<Checkbox label="Disabled, checked" defaultChecked disabled />);
    const frame = container.querySelector(".hc-frame")!;

    expect(frame.getAttribute("data-hc-state")).toBe("disabled");
    // The native attribute is what keeps the control out of the tab order and
    // out of form submission; the drawn state is only the picture of it.
    expect(container.querySelector("input")!.disabled).toBe(true);

    // The fade lives on the <label>, not on the frame — the whole row dims
    // together, text included, which is why this reads the frame's own parent
    // rather than the frame.
    const row = container.querySelector("label")!;
    expect(row.className).toContain("opacity-[var(--hc-opacity-disabled)]");
    expect(row.className, "a literal opacity survived beside the token").not.toMatch(
      /(^|\s|:)opacity-50(\s|$)/,
    );

    // 0.45, one home, the same number Button and Input already read. Three
    // disabled frames on the harness had three different treatments before this
    // — the point of the fix is that they now read alike, so the negative
    // control matters as much as the positive.
    const enabled = await mount(<Checkbox label="Remember me" defaultChecked />);
    expect(enabled.querySelector(".hc-frame")!.getAttribute("data-hc-state")).toBe("default");
    expect(enabled.querySelector("label")!.className).not.toContain("opacity-[");
  });
});
