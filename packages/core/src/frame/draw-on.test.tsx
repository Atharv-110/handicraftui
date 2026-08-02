import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HandcraftProvider } from "../theme/context";
import { useSketchFrame } from "./useSketchFrame";
import { __resetSketchEngine, generateSketch } from "../engine/generator";
import { seedFrom } from "../engine/seed";

const BOX = { width: 190, height: 52 };

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

function Box() {
  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rect",
    fill: "med",
    fillColor: "#F2C14E",
    seedKey: "«r1»",
  });
  return (
    <div className="hc-frame" {...frameProps}>
      {sketchLayer}
    </div>
  );
}

async function mount(drawOn: boolean) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <StrictMode>
        <HandcraftProvider drawOn={drawOn}>
          <Box />
        </HandcraftProvider>
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

describe("pass kinds", () => {
  it("labels every layer so the animation can sequence them", async () => {
    const paths = await generateSketch(
      { shape: "rect", ...BOX },
      { seed: seedFrom("«r1»"), fill: "#F2C14E", fillLevel: "med", ink: "layered" },
    );
    const kinds = new Set(paths.map((p) => p.kind));
    expect(kinds).toContain("under");
    expect(kinds).toContain("fill");
    expect(kinds).toContain("ink");
    expect(kinds).toContain("pool");
  });

  it("paints in order: guideline, fill, ink, pen marks", async () => {
    // Order is meaningful, not incidental — the ink has to land on top of the
    // fill, and the pooling marks on top of the ink.
    const paths = await generateSketch(
      { shape: "rect", ...BOX },
      { seed: seedFrom("«r1»"), fill: "#F2C14E", fillLevel: "med", ink: "layered" },
    );
    const order = paths.map((p) => p.kind);
    expect(order.indexOf("under")).toBeLessThan(order.indexOf("fill"));
    expect(order.indexOf("fill")).toBeLessThan(order.indexOf("ink"));
    expect(order.indexOf("ink")).toBeLessThan(order.indexOf("pool"));
  });
});

describe("draw-on timeline", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/handcraft.css"), "utf8");

  /** Delay and duration for a pass, as fractions of the whole sequence. */
  function slice(kind: string): { start: number; end: number } {
    const block =
      css.split(`path[data-hc-kind="${kind}"]`)[1]?.split("}")[0] ?? "";
    const delay = block.match(/animation-delay:[^;]*\*\s*([\d.]+)\)/);
    const duration = block.match(/animation-duration:[^;]*\*\s*([\d.]+)\)/);
    const start = delay ? Number(delay[1]) : 0;
    const end = start + (duration ? Number(duration[1]) : 0);
    return { start, end };
  }

  it("runs the passes in drawing order", () => {
    // Every pass expresses its slice as a fraction of one total duration. When
    // each carried its own full duration plus a delay instead, the pen marks
    // landed at 546ms while the fill was still fading until 780ms — the
    // sequence finished out of order and nothing caught it.
    const under = slice("under");
    const ink = slice("ink");
    const fill = slice("fill");
    const pool = slice("pool");

    expect(under.start).toBeLessThan(ink.start);
    expect(ink.start).toBeLessThan(fill.start);
    expect(fill.start).toBeLessThan(pool.start);

    // Ink must finish after the guideline it is tracing over.
    expect(ink.end).toBeGreaterThan(under.end);
    // The pen lands last, and the whole thing ends when it says it does.
    expect(pool.end).toBeGreaterThanOrEqual(fill.end);
    expect(pool.end).toBeCloseTo(1, 2);
  });

  it("overlaps the passes rather than queueing them", () => {
    // A strictly sequential timeline reads as four separate events. The ink
    // should start while the guideline is still being drawn.
    const under = slice("under");
    const ink = slice("ink");
    expect(ink.start).toBeLessThan(under.end);
  });
});

describe("draw-on entrance", () => {
  it("tags the layer and normalises pathLength when enabled", async () => {
    const container = await mount(true);
    const svg = container.querySelector(".hc-sketch-svg")!;

    expect(svg.hasAttribute("data-hc-draw")).toBe(true);
    const paths = [...svg.querySelectorAll("path")];
    expect(paths.length).toBeGreaterThan(0);
    // pathLength=1 is what lets one set of keyframes drive a 20px checkbox and
    // a 400px card without measuring either.
    expect(paths.every((p) => p.getAttribute("pathLength") === "1")).toBe(true);
    expect(paths.every((p) => p.hasAttribute("data-hc-kind"))).toBe(true);
  });

  it("adds nothing at all when disabled", async () => {
    // The default path must not pay for a feature it is not using.
    const container = await mount(false);
    const svg = container.querySelector(".hc-sketch-svg")!;

    expect(svg.hasAttribute("data-hc-draw")).toBe(false);
    expect(svg.querySelector("path[data-hc-kind]")).toBeNull();
    expect(svg.querySelector("path[pathLength]")).toBeNull();
  });
});
