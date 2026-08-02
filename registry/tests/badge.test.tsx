import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetSketchEngine, generateSketch, HandicraftProvider } from "@handicraft/core";
import { Badge } from "../default/ui/badge/badge";

async function mount(children: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(<HandicraftProvider>{children}</HandicraftProvider>);
  });
  return container;
}

describe("Badge geometry — direct engine calls, no DOM", () => {
  beforeEach(() => {
    __resetSketchEngine();
  });

  it("A11: a 62x24 rect (h-6) emits zero pool paths — passes are exactly under, ink", async () => {
    // 24px is the pinned badge height. k = 24/44 = 0.5454, under the 0.55
    // pooling gate, so no corner dots should appear at the size every badge
    // actually ships at.
    const paths = await generateSketch(
      { shape: "rect", width: 62, height: 24 },
      { seed: 5, ink: "layered" },
    );
    expect(paths.map((p) => p.kind)).toEqual(["under", "ink"]);
    expect(paths.some((p) => p.kind === "pool")).toBe(false);
  });

  it("A12: a 62x26 rect emits exactly four pool paths — the boundary from the other side", async () => {
    // 26 is the first quantized height past the k > 0.55 gate (k = 0.5909),
    // the tightest witness available: a threshold nudged to 0.58 would still
    // pass at 28 but not survive being checked here.
    const paths = await generateSketch(
      { shape: "rect", width: 62, height: 26 },
      { seed: 5, ink: "layered" },
    );
    const pools = paths.filter((p) => p.kind === "pool");
    expect(pools).toHaveLength(4);
  });
});

describe("Badge — rendered DOM", () => {
  it("A13: class list carries h-6 and min-w-6", async () => {
    const container = await mount(<Badge>Draft</Badge>);
    const el = container.querySelector(".hc-frame")!;
    expect(el.className).toMatch(/\bh-6\b/);
    expect(el.className).toMatch(/\bmin-w-6\b/);
  });

  it("A14: FILL_LEVELS.marked is low while default and danger are med, and every variant keeps text-hc-ink", async () => {
    // Sequential, not Promise.all — each mount does its own act(), and
    // overlapping act() calls are unsupported (React warns and the results
    // become unreliable).
    const variants = ["default", "marked", "danger", "ghost"] as const;
    const els: HTMLElement[] = [];
    for (const variant of variants) {
      const container = await mount(<Badge variant={variant}>x</Badge>);
      els.push(container.querySelector(".hc-frame") as HTMLElement);
    }

    // Every variant renders the same text colour — the only per-variant
    // channel is the hachure, never the text, or tier 1 and tier 2 disagree
    // on the frame's stroke colour at the handover (section 1's argument).
    for (const el of els) {
      expect(el.className).toMatch(/\btext-hc-ink\b/);
    }

    const [defaultEl, markedEl, dangerEl] = els;
    expect(defaultEl!.getAttribute("data-hc-fill")).toBe("med");
    expect(markedEl!.getAttribute("data-hc-fill")).toBe("low");
    expect(dangerEl!.getAttribute("data-hc-fill")).toBe("med");
  });
});
