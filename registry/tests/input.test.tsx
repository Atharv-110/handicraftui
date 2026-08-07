import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { HandicraftProvider } from "@handicraft/core";
import { Input } from "../default/ui/input/input";

/**
 * Cycle 009. Input is one of the two components wired to the state model, and
 * the only one whose error state exists at all.
 *
 * Its frame sits on a wrapper `<div>`, not on the `<input>` — a replaced element
 * renders no `::before`/`::after`, so the tier-1 stroke layers would never
 * appear on the control itself. Every assertion below therefore reads
 * `data-hc-state` off the wrapper and `aria-invalid` off the inner control, and
 * that split is the point rather than an implementation detail: tier 1's CSS
 * matches `.hc-frame:has(> [aria-invalid="true"])`, which only resolves because
 * the control is the wrapper's direct child.
 */
async function mount(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(<HandicraftProvider>{node}</HandicraftProvider>);
  });
  return container;
}

const stateOf = (c: HTMLElement) => c.querySelector(".hc-frame")!.getAttribute("data-hc-state");

describe("Input — state", () => {
  it("I1 — aria-invalid=true reaches both the frame's state and the control's own markup", async () => {
    const container = await mount(<Input aria-invalid="true" placeholder="you@example.com" />);

    // The engine half: the wrapper publishes `error`, so tier 2 draws with the
    // error row's roughness, bowing and danger ink.
    expect(stateOf(container)).toBe("error");

    // The accessibility half, and the reason this state is derived from
    // `aria-invalid` rather than from a new boolean prop. It is real ARIA on the
    // real control, so the state is announced rather than only drawn, it is
    // server-rendered so tier 1 is correct with no JavaScript, and the component
    // adds zero public API to get it.
    const control = container.querySelector("input")!;
    expect(control.getAttribute("aria-invalid")).toBe("true");

    // The wrapper must not carry it. `.hc-frame[aria-invalid="true"]` is a
    // separate selector family meant for self-framed controls; if the wrapper
    // also carried the attribute both families would match one element and the
    // duplication would be invisible until one of them changed.
    expect(container.querySelector(".hc-frame")!.hasAttribute("aria-invalid")).toBe(false);
  });

  it("I2 — aria-invalid=false and no aria-invalid at all both stay default", async () => {
    // "false" is a legal ARIA value meaning "checked, and valid" — the state a
    // field lands in immediately after it passes validation. Treating a bare
    // attribute as an error would draw a red skewed box around a field the user
    // has just fixed, which is worse than never drawing one.
    const explicitlyValid = await mount(<Input aria-invalid="false" />);
    expect(stateOf(explicitlyValid)).toBe("default");

    const unspecified = await mount(<Input />);
    expect(stateOf(unspecified)).toBe("default");
  });

  it("I3 — disabled publishes disabled, and beats error when both are true", async () => {
    const disabled = await mount(<Input disabled />);
    expect(stateOf(disabled)).toBe("disabled");
    expect(disabled.querySelector("input")!.disabled).toBe(true);

    // `STATE_PRECEDENCE` puts disabled above error, and the component's own
    // branch has to agree with it. A disabled field cannot be corrected, so
    // drawing it as an error asks the user to fix something they cannot reach.
    const both = await mount(<Input disabled aria-invalid="true" />);
    expect(stateOf(both)).toBe("disabled");
  });
});
