import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { HandicraftProvider } from "@handicraft/core";
import { Label } from "../default/ui/label/label";

async function mount(children: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(<HandicraftProvider>{children}</HandicraftProvider>);
  });
  return container;
}

describe("Label", () => {
  it("A15: renders zero .hc-frame and zero svg — the mechanical form of 'Label does not frame'", async () => {
    // HandicraftProvider itself always mounts one wobble-filter <svg> (see
    // separator.test.tsx's A9 comment), regardless of children — so the
    // meaningful comparison is against that baseline, not against a bare
    // zero, which would be false for any component under this provider.
    const baseline = await mount(null);
    const baselineSvgCount = baseline.querySelectorAll("svg").length;
    expect(baselineSvgCount).toBeGreaterThan(0);

    const container = await mount(<Label htmlFor="x">Email</Label>);
    expect(container.querySelectorAll(".hc-frame")).toHaveLength(0);
    expect(container.querySelectorAll("svg")).toHaveLength(baselineSvgCount);
  });

  it("A16: class list carries font-hand and text-sm, and no peer- class", async () => {
    const container = await mount(<Label htmlFor="x">Email</Label>);
    const el = container.querySelector("label")!;
    expect(el.className).toMatch(/\bfont-hand\b/);
    expect(el.className).toMatch(/\btext-sm\b/);
    expect(el.className).not.toMatch(/\bpeer-/);
  });

  it("A17: htmlFor is forwarded, so the label's DOM association resolves to the input", async () => {
    // jsdom does not implement the browser's click-to-focus delegation for
    // <label for>/<input> pairs (confirmed empirically: label.click() never
    // moves document.activeElement here, unlike a real browser), so this
    // cannot assert the actual focus-on-click outcome — that is the browser
    // pass's job (per the QA plan's keyboard verification). What jsdom DOES
    // implement correctly is HTMLLabelElement.control, the same resolution
    // mechanism a real browser's click delegation reads from, so asserting
    // that the label's `control` finds the right input is a faithful proxy:
    // dropping htmlFor from the forwarded props breaks it here exactly as it
    // would break real click delegation in a browser.
    const container = await mount(
      <>
        <Label htmlFor="hc-x">Email</Label>
        <input id="hc-x" />
      </>,
    );
    const label = container.querySelector("label") as HTMLLabelElement;
    const input = container.querySelector("input")!;
    expect(label.control).toBe(input);
  });
});
