import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { HandicraftProvider, type Fidelity } from "../theme/context";
import { useSketchFrame } from "./useSketchFrame";

/**
 * `data-hc-focus-within` is a capability marker, not a state — nothing in
 * JavaScript toggles it, the stylesheet's `:has(> :focus-visible)` rule
 * carries the actual state. So the only thing to verify at this level is that
 * the marker is present exactly when the option is set, and that this holds
 * regardless of tier — the attribute is not supposed to depend on whether
 * rough.js geometry ever activates.
 */
function Box({ focusWithin }: { focusWithin: boolean }) {
  const { frameProps, sketchLayer } = useSketchFrame({ shape: "rect", focusWithin });
  return (
    <div className="hc-frame" {...frameProps}>
      {sketchLayer}
    </div>
  );
}

async function mount(fidelity: Fidelity, focusWithin: boolean) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <StrictMode>
        <HandicraftProvider fidelity={fidelity}>
          <Box focusWithin={focusWithin} />
        </HandicraftProvider>
      </StrictMode>,
    );
  });
  return container;
}

describe("T17 — focusWithin emits the marker, and only when asked", () => {
  it.each<Fidelity>(["lite", "high"])(
    "at fidelity=%s: present when set, absent when not",
    async (fidelity) => {
      const withOption = await mount(fidelity, true);
      expect(withOption.querySelector(".hc-frame")!.hasAttribute("data-hc-focus-within")).toBe(
        true,
      );

      const withoutOption = await mount(fidelity, false);
      expect(withoutOption.querySelector(".hc-frame")!.hasAttribute("data-hc-focus-within")).toBe(
        false,
      );
    },
  );
});
