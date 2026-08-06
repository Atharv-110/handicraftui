import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HandicraftProvider, type Fidelity } from "../theme/context";
import { useSketchFrame } from "./useSketchFrame";

/**
 * `data-hc-fidelity` publishes the tier a frame has **resolved** to, not the
 * tier currently painting. Three states: `"lite"` when the provider has decided
 * tier 2 will not run, absent while tier 2 was asked for and has not arrived,
 * `"high"` once geometry exists.
 *
 * This file deliberately stubs nothing. `tier2.test.tsx` stubs `ResizeObserver`,
 * `offsetWidth`, `offsetHeight` and `getBoundingClientRect` so tier 2 can
 * activate; these tests need the exact opposite. Under jsdom's defaults
 * `measureBorderBox` reads `offsetWidth || 0` and gets 0, so
 * `useSketchFrame`'s geometry effect early-returns on `size.w <= 0` and
 * `setPaths([])` runs forever. That makes the state under test terminal rather
 * than merely early, which is the whole property being asserted — an absence
 * that is true before the thing it rules out could have happened proves
 * nothing, and that failure is the reason cycle 007 exists at all.
 *
 * Sharing a file with `tier2.test.tsx` would mean fighting its `beforeEach`;
 * a separate file is cheaper than a per-test unstub that has to stay correct.
 */

/**
 * The same 50 × 10ms budget `tier2.test.tsx`'s own mount helper allows a real
 * tier-2 mount, drained in full rather than exited early.
 *
 * That budget is the control. Those tests pass inside it with the measurement
 * stubs present, so it is long enough for rough.js to load from disk and for
 * geometry to land. Draining it here with no stubs and finding nothing is
 * therefore evidence that tier 2 cannot activate, not evidence that this test
 * read the DOM too soon.
 */
const SETTLE_TURNS = 50;
const SETTLE_STEP_MS = 10;

async function mountUnmeasured(fidelity: Fidelity) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  await act(async () => {
    createRoot(container).render(
      <StrictMode>
        <HandicraftProvider fidelity={fidelity}>
          <Box />
        </HandicraftProvider>
      </StrictMode>,
    );
  });

  for (let i = 0; i < SETTLE_TURNS; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, SETTLE_STEP_MS));
    });
  }

  const frame = container.querySelector(".hc-frame");
  expect(frame, "nothing painted — the mount itself failed").not.toBeNull();
  // Proves the box really was unmeasurable and the drain really was drained.
  // Without this the two tests below would still pass on a mount that threw
  // before it ever reached the attribute.
  expect(
    container.querySelector(".hc-sketch-svg"),
    "tier 2 activated — the no-stub premise of this file is broken",
  ).toBeNull();

  return frame!;
}

function Box() {
  const { frameProps, sketchLayer } = useSketchFrame({ shape: "rounded", radius: 8 });
  return (
    <div className="hc-frame" {...frameProps}>
      {sketchLayer}
      content
    </div>
  );
}

describe("the tier-resolution marker", () => {
  it("F1 — stays absent at fidelity=high while the answer is still open", async () => {
    // The semantics pin. Tier 1 is what is painting and will keep painting, so
    // paint semantics would publish `"lite"` here. Resolution semantics
    // publish nothing, because `fidelity="high"` means tier 2 was asked for and
    // an unmeasurable box is not the provider deciding against it.
    //
    // Publishing `"lite"` in this window is what would reintroduce H4: it makes
    // "every frame is on tier 1" true at first paint on a page that is one
    // frame from handing over, and a web-first assertion resolves the instant
    // it is true.
    const frame = await mountUnmeasured("high");

    expect(frame.getAttribute("data-hc-fidelity")).toBeNull();
  });

  it("F2 — reads lite at fidelity=lite, without anything having been measured", async () => {
    // Pairs with F1 to prove the marker is a decision rather than a
    // measurement. Identical mount, identical zeroed box, opposite answer —
    // the only input that differs is what the provider was asked for.
    const frame = await mountUnmeasured("lite");

    expect(frame.getAttribute("data-hc-fidelity")).toBe("lite");
  });

  it("F3 — the server render publishes the same answer as the client", async () => {
    // This is the assertion that licenses every Playwright wait built on the
    // marker. The fixture's `.hc-frame:not([data-hc-fidelity="lite"])` reaching
    // zero is only a state read rather than a race because the answer is
    // already in the HTML before a byte of script runs.
    const lite = renderToString(
      <HandicraftProvider fidelity="lite">
        <Box />
      </HandicraftProvider>,
    );
    expect(lite).toContain('data-hc-fidelity="lite"');

    // The server has measured nothing and rough.js has not run, so at the
    // default fidelity the answer genuinely is not known yet. Asserting on the
    // bare attribute name rather than on `="high"` is deliberate: it fails on
    // any value at all, including a `"lite"` a paint-semantics regression would
    // put here.
    const high = renderToString(
      <HandicraftProvider fidelity="high">
        <Box />
      </HandicraftProvider>,
    );
    expect(high).not.toContain("data-hc-fidelity");
  });
});
