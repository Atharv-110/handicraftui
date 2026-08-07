import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HandicraftProvider, HANDS } from "../theme/context";
import { useSketchFrame, type UseSketchFrameOptions } from "./useSketchFrame";
import { __resetSketchEngine, generateSketch } from "../engine/generator";
import { seedFrom } from "../engine/seed";
import { applyStateDelta } from "../engine/state";

/**
 * `data-hc-state` and the parameter model, through the hook.
 *
 * Rule V3 governs this whole file. jsdom has no `ResizeObserver` and returns
 * zeroed `offsetWidth`/`offsetHeight` and a zeroed bounding rect, so tier 2
 * never activates and every tier-2 assertion below would pass without executing
 * one line of rough.js. The stub set is copied verbatim from `tier2.test.tsx`
 * for that reason, and H4 asserts generated paths exist before it asserts
 * anything about their contents.
 */
const BOX = { width: 160, height: 44 };

beforeEach(() => {
  __resetSketchEngine();

  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(BOX.width);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(BOX.height);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    ...BOX,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: BOX.width,
    bottom: BOX.height,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Box(options: UseSketchFrameOptions) {
  const { frameProps, sketchLayer } = useSketchFrame({ shape: "rect", ...options });
  return (
    <div className="hc-frame" {...frameProps}>
      {sketchLayer}
      content
    </div>
  );
}

interface MountOptions {
  fidelity?: "lite" | "high";
  handOffset?: number;
  frame?: UseSketchFrameOptions;
}

async function mount({ fidelity = "high", handOffset = 0, frame = {} }: MountOptions = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);

  await act(async () => {
    createRoot(container).render(
      <StrictMode>
        <HandicraftProvider fidelity={fidelity} handOffset={handOffset}>
          <Box seedKey="«r1»" {...frame} />
        </HandicraftProvider>
      </StrictMode>,
    );
  });

  // The first tier-2 mount in a process waits on rough.js loading from disk,
  // which is longer than a single macrotask. Poll for the real condition rather
  // than a fixed delay, the same way `tier2.test.tsx` does.
  if (fidelity === "high") {
    for (let i = 0; i < 50 && !container.querySelector(".hc-sketch-svg path"); i++) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
    }
  } else {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }

  return container;
}

/**
 * Fires a real native event and lets React's own delegation turn it into the
 * synthetic handler the hook registered.
 *
 * `pointerenter` and `pointerleave` are not native listeners in React — the
 * enter/leave plugin synthesises them from `pointerover` and `pointerout`, which
 * is why those are the names dispatched here. Calling the handler off
 * `frameProps` directly would be simpler and would prove nothing about whether
 * the handler is actually attached to the element.
 */
async function fire(el: Element, type: string) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
  });
}

const stateOf = (c: HTMLElement) => c.querySelector(".hc-frame")!.getAttribute("data-hc-state");
const ds = (c: HTMLElement) =>
  [...c.querySelectorAll(".hc-sketch-svg path")].map((p) => p.getAttribute("d")).join("|");

describe("data-hc-state", () => {
  it("H1 — publishes `default` on a fresh mount at both tiers", async () => {
    // Published unconditionally, including `"default"`. Cycle 007 made the same
    // call for `data-hc-fidelity` and gave the reason: a positive marker beats
    // an inferred absence, and there is no third state here for a missing
    // attribute to mean. A reader of the DOM should never have to know whether
    // the absence is "default" or "the hook did not run".
    const lite = await mount({ fidelity: "lite" });
    expect(stateOf(lite)).toBe("default");

    const high = await mount({ fidelity: "high" });
    expect(stateOf(high)).toBe("default");
    expect(
      high.querySelectorAll(".hc-sketch-svg path").length,
      "tier 2 did not activate — the stubs above are not working",
    ).toBeGreaterThan(0);
  });

  it("H2 — tracks the pointer through hover, press and back out, with rescribble on", async () => {
    const container = await mount({ frame: { rescribble: true } });
    const frame = container.querySelector(".hc-frame")!;

    // The opt-in marker is computed from a prop, not from fidelity or from a
    // pointer, so it is in the server HTML and never moves. That is what lets
    // `.hc-frame[data-hc-rescribble]:hover` in the stylesheet gate tier 1's
    // hover pair on the same opt-in tier 2 uses.
    expect(frame.hasAttribute("data-hc-rescribble")).toBe(true);
    expect(stateOf(container)).toBe("default");

    await fire(frame, "pointerover");
    expect(stateOf(container)).toBe("hover");

    await fire(frame, "pointerdown");
    expect(stateOf(container)).toBe("press");

    // Back to hover, not to default: the pointer is still over the element.
    await fire(frame, "pointerup");
    expect(stateOf(container)).toBe("hover");

    await fire(frame, "pointerout");
    expect(stateOf(container)).toBe("default");

    expect(frame.hasAttribute("data-hc-rescribble")).toBe(true);
  });

  it("H3 — an explicit state beats a pointer-derived one", async () => {
    // A mouse hovering a disabled button must not un-disable its geometry.
    // `disabled` and `error` are facts only the component can know, so
    // `STATE_PRECEDENCE` puts them above anything the hook derives itself.
    const container = await mount({ frame: { rescribble: true, state: "disabled" } });
    const frame = container.querySelector(".hc-frame")!;

    expect(stateOf(container)).toBe("disabled");
    await fire(frame, "pointerover");
    expect(stateOf(container)).toBe("disabled");
    await fire(frame, "pointerdown");
    expect(stateOf(container)).toBe("disabled");
  });

  it("H4 — hover shifts parameters on the same seed, never to another pool member", async () => {
    const container = await mount({ frame: { rescribble: true } });
    const frame = container.querySelector(".hc-frame")!;

    // Rule V3's precondition, first and unconditionally: without real generated
    // geometry every comparison below is a comparison of two empty strings and
    // this test is decoration.
    const atRest = ds(container);
    expect(atRest.length, "tier 2 did not activate — no geometry to compare").toBeGreaterThan(0);
    expect(container.querySelector(".hc-sketch-svg path")!.getAttribute("d")).toMatch(/^M/);

    const seedBefore = frame.getAttribute("data-hc-seed");

    await fire(frame, "pointerover");
    expect(stateOf(container)).toBe("hover");
    const hovered = ds(container);

    expect(hovered.length).toBeGreaterThan(0);
    expect(hovered).not.toBe(atRest);
    expect(frame.getAttribute("data-hc-seed")).toBe(seedBefore);

    // The discriminating half, and the only assertion anywhere in the suite that
    // can tell the parameter model from the seed model it replaced.
    //
    // Neither of the two obvious cheaper checks reaches it. `data-hc-seed` is
    // `seedBucket(seedKey)` — the tier-1 bucket — and has never carried the hand
    // offset, so it reads identically under either model. And `generator.test.ts`'s
    // C5 is an engine test: it proves no pool member's *default* geometry equals
    // hover's, which stays true even if the hook shifts the seed, because the
    // hook would still apply the roughness delta on top. The pool index tier 2
    // actually draws from is not in the DOM at all.
    //
    // So the claim is checked as an identity instead: the geometry this frame
    // mounted must be exactly what the engine returns for the *unshifted* seed
    // at hover's parameters. Any state term added back to the hook's seed line
    // shifts the pool index and breaks this equality immediately. The style
    // object below mirrors the hook's for the options this Box passes —
    // `natural` hand, `layered` ink, the provider's `med` fill ceiling, chalk
    // off — which is the price of the only assertion that can see the mutation.
    const expected = await generateSketch(
      { shape: "rect", width: BOX.width, height: BOX.height, radius: undefined },
      {
        seed: seedFrom("«r1»", 0),
        ...applyStateDelta(
          {
            roughness: HANDS.natural.roughness,
            bowing: HANDS.natural.bowing,
            strokeWidth: HANDS.natural.strokeWidth,
          },
          "hover",
        ),
        fill: undefined,
        fillLevel: "med",
        hachureAngle: undefined,
        ink: "layered",
        chalk: false,
      },
    );
    expect(expected.length).toBeGreaterThan(0);
    expect(
      hovered,
      "hover did not draw at the unshifted pool seed — a state term is back in the seed",
    ).toBe(expected.map((p) => p.d).join("|"));

    // And the same seed at rest is genuinely a different drawing, so the
    // equality above cannot be satisfied by hover having quietly stopped
    // shifting anything.
    expect(atRest).not.toBe(hovered);
  });

  it("H5 — the server HTML already carries the state, and the opt-in only when asked", async () => {
    // Server-rendered rather than hydrated-in. A `data-hc-rescribble` that
    // appeared only on the client would leave a window where the page disagrees
    // with itself about which frames opted in, and tier 1's hover rule keys off
    // exactly that attribute.
    const plain = renderToString(
      <HandicraftProvider>
        <Box seedKey="«r1»" />
      </HandicraftProvider>,
    );
    expect(plain).toContain('data-hc-state="default"');
    expect(plain).not.toContain("data-hc-rescribble");

    const optedIn = renderToString(
      <HandicraftProvider>
        <Box seedKey="«r1»" rescribble />
      </HandicraftProvider>,
    );
    expect(optedIn).toContain('data-hc-state="default"');
    expect(optedIn).toContain("data-hc-rescribble");
  });
});
