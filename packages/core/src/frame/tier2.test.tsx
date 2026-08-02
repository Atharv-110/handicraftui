import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HandicraftProvider } from "../theme/context";
import { useSketchFrame } from "./useSketchFrame";
import { __resetSketchEngine } from "../engine/generator";

/**
 * jsdom has no ResizeObserver and every getBoundingClientRect returns zeroes,
 * so tier 2 silently never activates and any test written against it would
 * pass without exercising a single line of rough.js. These stubs give the
 * measurement path something real to read.
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

function Box({ seedKey }: { seedKey: string }) {
  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rounded",
    radius: 8,
    seedKey,
  });
  return (
    <div className="hc-frame" {...frameProps}>
      {sketchLayer}
      content
    </div>
  );
}

async function mount(fidelity: "lite" | "high", seedKey = "«r1»") {
  const container = document.createElement("div");
  document.body.appendChild(container);

  await act(async () => {
    createRoot(container).render(
      <StrictMode>
        <HandicraftProvider fidelity={fidelity}>
          <Box seedKey={seedKey} />
        </HandicraftProvider>
      </StrictMode>,
    );
  });
  // The first tier-2 mount in a process has to wait for roughjs to be loaded
  // from disk, which takes more than the single macrotask a fixed delay would
  // give it. Poll for the real condition instead so the suite does not depend
  // on module-load timing.
  if (fidelity === "high") {
    for (let i = 0; i < 50 && !container.querySelector(".hc-sketch-svg"); i++) {
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

describe("tier 2 activation", () => {
  it("actually mounts rough.js geometry", async () => {
    const container = await mount("high");
    const svg = container.querySelector(".hc-sketch-svg");

    expect(svg, "tier 2 did not activate — the stubs above are not working").not.toBeNull();
    expect(svg!.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(svg!.querySelector("path")!.getAttribute("d")).toMatch(/^M/);
  });

  it("hands over only once geometry exists", async () => {
    // data-hc-fidelity is what hides the CSS strokes. Setting it before the
    // SVG is ready would leave the element with no frame at all for a frame or
    // two — a visible flash of borderless UI.
    const lite = await mount("lite");
    expect(lite.querySelector(".hc-frame")!.getAttribute("data-hc-fidelity")).toBeNull();

    const high = await mount("high");
    expect(high.querySelector(".hc-frame")!.getAttribute("data-hc-fidelity")).toBe("high");
  });

  it("keeps the sketch out of the accessibility tree and off the hit path", async () => {
    const container = await mount("high");
    const svg = container.querySelector(".hc-sketch-svg") as SVGElement;

    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("focusable")).toBe("false");
    expect(svg.style.pointerEvents).toBe("none");
    // Absolute + inset:0 is what keeps the frame out of layout, which is the
    // precondition for tier 1 and tier 2 measuring identically.
    expect(svg.style.position).toBe("absolute");
    expect(svg.style.overflow).toBe("visible");
  });

  it("renders identical geometry across two independent mounts", async () => {
    // Stands in for server-then-client: two separate React roots, same seed
    // key, must agree byte for byte or hydration would mismatch.
    const a = await mount("high", "«r7»");
    const b = await mount("high", "«r7»");

    const ds = (c: HTMLElement) =>
      [...c.querySelectorAll(".hc-sketch-svg path")].map((p) => p.getAttribute("d"));

    expect(ds(a).length).toBeGreaterThan(0);
    expect(ds(a)).toEqual(ds(b));
  });

  it("gives different seed keys different geometry", async () => {
    const a = await mount("high", "«r1»");
    const b = await mount("high", "«r2»");

    const d = (c: HTMLElement) => c.querySelector(".hc-sketch-svg path")!.getAttribute("d");
    expect(d(a)).not.toBe(d(b));
  });
});

describe("chalk", () => {
  // drawOn is what puts data-hc-kind on each <path> (useSketchFrame.tsx) —
  // chosen over comparing raw path counts between the two mounts because it
  // is a direct, unambiguous read of which pass produced which path, rather
  // than an inference from a count that could shift for unrelated reasons.
  // drawOn itself adds no extra passes, so turning it on doesn't skew what
  // this test is measuring.
  async function mountChalk(chalk: boolean, seedKey: string) {
    const container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container).render(
        <StrictMode>
          <HandicraftProvider fidelity="high" chalk={chalk} drawOn>
            <Box seedKey={seedKey} />
          </HandicraftProvider>
        </StrictMode>,
      );
    });
    for (let i = 0; i < 50 && !container.querySelector(".hc-sketch-svg"); i++) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
    }
    return container;
  }

  it("reaches generated geometry from the provider, end to end", async () => {
    const withChalk = await mountChalk(true, "«r9»");
    const svgChalk = withChalk.querySelector(".hc-sketch-svg");
    expect(svgChalk, "tier 2 did not activate — chalk mount").not.toBeNull();
    expect(svgChalk!.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(svgChalk!.querySelectorAll('path[data-hc-kind="dust"]').length).toBeGreaterThan(0);

    const withoutChalk = await mountChalk(false, "«r10»");
    const svgPlain = withoutChalk.querySelector(".hc-sketch-svg");
    expect(svgPlain, "tier 2 did not activate — plain mount").not.toBeNull();
    expect(svgPlain!.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(svgPlain!.querySelectorAll('path[data-hc-kind="dust"]').length).toBe(0);
  });
});

describe("tier parity", () => {
  it("leaves the framed element's own attributes unchanged between tiers", async () => {
    const lite = (await mount("lite", "«r5»")).querySelector(".hc-frame")!;
    const high = (await mount("high", "«r5»")).querySelector(".hc-frame")!;

    // Same class list and same seed bucket: the box model cannot differ,
    // because nothing that affects layout changed. Pixel-level proof needs a
    // real browser and lands in the Playwright suite.
    expect(high.className).toBe(lite.className);
    expect(high.getAttribute("data-hc-seed")).toBe(lite.getAttribute("data-hc-seed"));
  });

  it("adds no element to the layout flow", async () => {
    const high = await mount("high", "«r5»");
    const frame = high.querySelector(".hc-frame")!;

    // The only extra child tier 2 introduces is the absolutely-positioned SVG.
    const positioned = [...frame.children].filter(
      (c) => (c as HTMLElement).style?.position !== "absolute",
    );
    expect(positioned).toHaveLength(0);
  });
});
