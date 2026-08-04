import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetSketchEngine, generateSketch, HandicraftProvider } from "@handicraft/core";
import { Badge } from "../default/ui/badge/badge";

// Same source-as-text technique as design-tokens.test.ts's D9 — the only way
// to prove two props share one identifier when jsdom never activates tier 2.
const badgeSource = readFileSync(
  resolve(process.cwd(), "../../registry/default/ui/badge/badge.tsx"),
  "utf8",
);

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

/**
 * B1 through B5 — cycle 002a's non-colour signal. jsdom leaves tier 2
 * inactive, so `sketchLayer` is `null` and the only `<svg>` a mounted Badge
 * ever holds is the mark's — filtered on `svg:not(.hc-sketch-svg)` anyway,
 * so this stays correct if a future `tier2.test.tsx`-style stub set lands
 * in this file.
 */
describe("Badge — the non-colour signal (cycle 002a)", () => {
  it("B1: danger renders exactly one glyph svg at width 14; default, marked, ghost render zero", async () => {
    // Scoped to the frame, not the whole container: HandicraftProvider
    // itself renders a top-level <svg> (the wobble filter's <defs>), a
    // sibling of the frame rather than a child of it, and an unscoped
    // querySelectorAll would count that as a false positive glyph on every
    // variant. Caught by actually running this against "default" first —
    // it read 1 glyph where 0 was expected.
    const variants = ["default", "marked", "danger", "ghost"] as const;
    for (const variant of variants) {
      const container = await mount(<Badge variant={variant}>x</Badge>);
      const frame = container.querySelector(".hc-frame")!;
      const glyphs = frame.querySelectorAll("svg:not(.hc-sketch-svg)");
      if (variant === "danger") {
        expect(glyphs.length, `${variant} glyph count`).toBe(1);
        expect(glyphs[0]!.getAttribute("width")).toBe("14");
      } else {
        expect(glyphs.length, `${variant} glyph count`).toBe(0);
      }
    }
  });

  it("B2: the glyph is aria-hidden with no role=img and no aria-label", async () => {
    const container = await mount(<Badge variant="danger">Overdue</Badge>);
    const frame = container.querySelector(".hc-frame")!;
    const glyph = frame.querySelector("svg:not(.hc-sketch-svg)")!;
    expect(glyph.getAttribute("aria-hidden")).toBe("true");
    expect(glyph.getAttribute("role")).not.toBe("img");
    expect(glyph.getAttribute("aria-label")).toBeNull();
  });

  it("B3: the marker precedes the text in DOM order, and {sketchLayer} precedes it in source", async () => {
    const container = await mount(<Badge variant="danger">Overdue</Badge>);
    const frame = container.querySelector(".hc-frame")!;
    const children = [...frame.childNodes];

    // Identified structurally — the element wrapping the glyph svg — rather
    // than by its "hc-mark-slot" class. That class is B5's own mutation
    // target, and keying on it here broke isolation the first time this
    // ran: B5 legitimately strips the class and this check has nothing to
    // say about the wrapper's class name, only its position.
    const markerIndex = children.findIndex(
      (n) => n instanceof HTMLElement && n.querySelector("svg") !== null,
    );
    const textIndex = children.findIndex(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent === "Overdue",
    );
    expect(markerIndex, "marker not found in frame's children").toBeGreaterThanOrEqual(0);
    expect(textIndex, "text not found in frame's children").toBeGreaterThan(markerIndex);

    // jsdom never renders {sketchLayer} (tier 2 stays inactive), so its JSX
    // position can only be checked by reading source — same technique D9
    // uses for a cross-file invariant nothing in the DOM can prove. Anchored
    // on "<SketchMark" rather than "hc-mark-slot": the latter is the
    // wrapper's class, which is B5's own mutation target, and anchoring on
    // it here broke isolation the first time this ran — B5's mutation
    // legitimately fails B5 alone, and this check has nothing to say about
    // the wrapper's class name.
    const sketchLayerIndex = badgeSource.indexOf("{sketchLayer}");
    const markerJsxIndex = badgeSource.indexOf("<SketchMark");
    expect(sketchLayerIndex, "{sketchLayer} not found in badge.tsx").toBeGreaterThanOrEqual(0);
    expect(markerJsxIndex, "<SketchMark not found in badge.tsx").toBeGreaterThan(sketchLayerIndex);
  });

  it("B4: badge.tsx passes the same seedKey identifier to useSketchFrame and SketchMark", () => {
    const frameSeedKey = badgeSource.match(/useSketchFrame\(\{[^}]*seedKey:\s*(\w+)/s);
    const markSeedKey = badgeSource.match(/<SketchMark[^>]*seedKey=\{(\w+)\}/s);
    expect(frameSeedKey, "no seedKey passed to useSketchFrame").not.toBeNull();
    expect(markSeedKey, "no seedKey passed to SketchMark").not.toBeNull();
    expect(frameSeedKey![1]).toBe(markSeedKey![1]);
  });

  it("B5: the server output carries the fallback and not the mark", () => {
    const dangerHtml = renderToString(<Badge variant="danger">Overdue</Badge>);
    expect(dangerHtml).toContain("hc-mark-slot");
    expect(dangerHtml).toMatch(/class="hc-mark-slot" aria-hidden="true"/);
    expect(dangerHtml).toMatch(/<svg[^>]*width="14"/);
    expect(dangerHtml).not.toContain("data-hc-drawn");
    expect(dangerHtml).not.toContain("<path");

    // Negative half — a variant with no glyph carries no fallback wrapper.
    const draftHtml = renderToString(<Badge>Draft</Badge>);
    expect(draftHtml).not.toContain("hc-mark-slot");
  });
});
