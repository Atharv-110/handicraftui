import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { HandicraftProvider } from "../theme/context";
import { SketchMark } from "./SketchMark";

/**
 * The tier-1 mark fallback's mechanism (`DESIGN-SYSTEM.md` §4.6). Placed
 * here rather than folded into `design-tokens.test.ts` (a structural CSS
 * assertion would blur what a red result there means) or extended onto
 * `tier-agreement.test.ts` (that file may not be edited in any 002 cycle —
 * see the cycle document §11).
 */

const css = readFileSync(resolve(process.cwd(), "src/styles/handicraft.css"), "utf8");

describe("M1 — data-hc-drawn only once geometry exists", () => {
  it("M1(a) — server render carries neither the attribute nor a path", () => {
    const html = renderToString(<SketchMark name="cross" size={14} />);
    expect(html).not.toContain("data-hc-drawn");
    expect(html).not.toContain("<path");
  });

  it("M1(b) — once mounted and geometry lands, the svg carries the attribute and a path", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container).render(
        <HandicraftProvider>
          <SketchMark name="cross" size={14} />
        </HandicraftProvider>,
      );
    });

    // The first tier-2 draw in a process waits on roughjs loading from disk,
    // which outlasts a single macrotask — poll for the real condition
    // instead of a fixed delay, the same technique tier2.test.tsx uses for
    // the frame. QA-CONTRACT.md Rule V3: prove tier 2 activated, not merely
    // that nothing threw. If roughjs cannot be made to resolve in this
    // environment the wait times out and this assertion goes red, which is
    // the correct outcome — silently dropping the check is not.
    let svg: SVGSVGElement | null = null;
    for (let i = 0; i < 50; i++) {
      svg = container.querySelector("svg[data-hc-drawn]");
      if (svg) break;
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });
    }

    expect(svg, "tier 2 never activated — svg[data-hc-drawn] never appeared").not.toBeNull();
    expect(svg!.querySelectorAll("path").length).toBeGreaterThan(0);
  });
});

describe("M2 — the stylesheet declares both halves of the fallback", () => {
  it("declares the fallback glyph and its hide rule, each exactly once, at brace depth 1", () => {
    const glyphSelector = ".hc-mark-slot::before";
    const hideSelector = ".hc-mark-slot:has(> svg[data-hc-drawn])::before";

    expect(css.split(glyphSelector).length - 1, "glyph selector occurrence count").toBe(1);
    expect(css.split(hideSelector).length - 1, "hide selector occurrence count").toBe(1);

    const glyphIndex = css.indexOf(glyphSelector);
    const glyphBraceOpen = css.indexOf("{", glyphIndex);
    const glyphBraceClose = css.indexOf("}", glyphBraceOpen);
    const glyphBlock = css.slice(glyphBraceOpen, glyphBraceClose);
    expect(glyphBlock).toContain('content: "\\00D7"');

    const hideIndex = css.indexOf(hideSelector);
    const hideBraceOpen = css.indexOf("{", hideIndex);
    const hideBraceClose = css.indexOf("}", hideBraceOpen);
    const hideBlock = css.slice(hideBraceOpen, hideBraceClose);
    expect(hideBlock).toContain("display: none");

    // Brace depth 1 — inside @layer components, not unlayered, not nested
    // any further. Same running open-minus-close count T18 already uses in
    // tier-agreement.test.ts, and it inherits that file's Trap 1: the count
    // reads raw text including comments, so a lone unbalanced `{` in a CSS
    // comment above either selector would fail this with a message pointing
    // at the wrong rule.
    for (const selector of [glyphSelector, hideSelector]) {
      const index = css.indexOf(selector);
      const before = css.slice(0, index);
      const opens = before.match(/\{/g)?.length ?? 0;
      const closes = before.match(/\}/g)?.length ?? 0;
      expect(opens - closes, `${selector} brace depth`).toBe(1);
    }
  });
});

describe("F1 — the fallback glyph carries the measured centring correction", () => {
  it("declares the transform correcting the glyph's ink offset from the slot's geometric centre", () => {
    // Reuses M2's own block-slicing method rather than a fresh one, cycle
    // document §18.5. Flex centring puts the glyph's line box on the slot's
    // centre, not its ink — measured against Kalam at (+0.19, -1.585) CSS px
    // relative to that centre, agreeing within 0.11px across two badges
    // (cycle document §18.1, §18.3). The correction is the negated,
    // 0.05px-rounded mean: translate(-0.2px, 1.6px).
    const glyphSelector = ".hc-mark-slot::before";
    const glyphIndex = css.indexOf(glyphSelector);
    const glyphBraceOpen = css.indexOf("{", glyphIndex);
    const glyphBraceClose = css.indexOf("}", glyphBraceOpen);
    const glyphBlock = css.slice(glyphBraceOpen, glyphBraceClose);

    expect(glyphBlock).toMatch(/transform:\s*translate\(\s*-0?\.2px\s*,\s*1\.6px\s*\)/);
  });
});
