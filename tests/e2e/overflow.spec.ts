import { expect } from "@playwright/test";
import { hcUrl, test } from "./fixtures";

/**
 * O1 — no horizontal overflow, mechanised. Cycle 003 §3.4.
 *
 * `QA-CONTRACT.md`'s viewport matrix and Rule A2 exist because 4 viewports x
 * 2 tiers x 2 themes is sixteen states per route, and a human doing three
 * components in one pass produces a truncated report that looks complete.
 * The check itself is one expression, so the whole matrix is worth running
 * mechanically rather than sampled by eye:
 *
 *   document.documentElement.scrollWidth <= document.documentElement.clientWidth
 *
 * 375 is the hard responsiveness floor from PRINCIPLES.md — an iPhone SE, not
 * a target to round towards.
 */

const VIEWPORTS: Array<{ width: number; height: number }> = [
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];
const FIDELITIES = ["high", "lite"] as const;
const THEMES = [false, true] as const;
const ROUTES = ["/", "/spike-portal"] as const;

test.describe("overflow (O1)", () => {
  for (const viewport of VIEWPORTS) {
    for (const fidelity of FIDELITIES) {
      for (const dark of THEMES) {
        for (const route of ROUTES) {
          test(`${viewport.width}px x fidelity=${fidelity} x ${dark ? "dark" : "light"} x ${route}`, async ({
            page,
          }) => {
            await page.setViewportSize(viewport);
            await page.goto(hcUrl(route, { fidelity, dark }));

            // A route-agnostic settle rather than the `hc` fixture's
            // `goto()`. `/spike-portal` hardcodes `fidelity="high"`
            // regardless of the URL (see `spike.tsx`'s own header comment),
            // so the strict "every frame reached the requested tier"
            // assertion `hc.goto` makes for `/` can never resolve there at
            // `fidelity=lite` — the route silently ignores the param. O1
            // does not care which tier is on screen, only that whichever one
            // is does not overflow, so waiting for the first frame to exist
            // is enough of a settle point for both routes.
            await expect(page.locator(".hc-frame").first()).toBeVisible();

            const noOverflow = await page.evaluate(
              () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            );
            expect(noOverflow).toBe(true);
          });
        }
      }
    }
  }
});
