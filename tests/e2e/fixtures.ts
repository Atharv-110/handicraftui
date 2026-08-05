import { expect, test as base } from "@playwright/test";
import type { Cell } from "./matrix-grid";

export type Hand = "steady" | "natural" | "loose" | "hurried";
export type Ink = "layered" | "plain";
export type Fill = "no" | "low" | "med" | "high";
export type Fidelity = "high" | "lite";

export interface HcState {
  fidelity?: Fidelity;
  dark?: boolean;
  texture?: boolean;
  stress?: boolean;
  drawOn?: boolean;
  hand?: Hand;
  ink?: Ink;
  fill?: Fill;
  drawMs?: number;
}

const HANDS = new Set<Hand>(["steady", "natural", "loose", "hurried"]);
const FILLS = new Set<Fill>(["no", "low", "med", "high"]);

/**
 * Emits query parameters matching `apps/playground/app/page.tsx`'s parsing
 * verbatim, key by key. That parsing is asymmetric — most keys read "present
 * with a specific value means non-default" — but `texture` inverts it:
 * `params.texture !== "0"`, so its *absence* means on. A builder that emits
 * `texture=1` for the true case is silently correct (the page never reads
 * that literal) and silently wrong for anything using the URL to know the
 * true state, so `texture` is the one key omitted for its true value and
 * emitted only for its false one — every other key is the other way round.
 */
export function hcUrl(path: string, state: HcState = {}): string {
  const params = new URLSearchParams();

  if (state.fidelity === "lite") params.set("fidelity", "lite");
  if (state.dark === true) params.set("dark", "1");
  if (state.texture === false) params.set("texture", "0");
  if (state.stress === true) params.set("stress", "1");
  if (state.drawOn === true) params.set("drawOn", "1");
  if (state.hand && HANDS.has(state.hand)) params.set("hand", state.hand);
  if (state.ink === "plain") params.set("ink", "plain");
  if (state.fill && FILLS.has(state.fill)) params.set("fill", state.fill);
  if (state.drawMs !== undefined) params.set("drawMs", String(state.drawMs));

  const qs = params.toString();
  return qs.length > 0 ? `${path}?${qs}` : path;
}

/**
 * Builds a `/matrix` URL from a grid cell — cycle 004. `c` is the specimen
 * id; `sfill` and `fill` are matrix-only and shared-vocabulary keys
 * respectively, both omitted unless the cell actually sets them so a cell
 * with `hand: null` (tier 1) never emits a `hand=` key the route would
 * otherwise have to specially ignore.
 */
export function matrixUrl(cell: Cell): string {
  const params = new URLSearchParams();
  params.set("c", cell.component);
  if (cell.tier === "lite") params.set("fidelity", "lite");
  if (cell.theme === "dark") params.set("dark", "1");
  if (cell.hand) params.set("hand", cell.hand);
  if (cell.sfill) params.set("sfill", cell.sfill);
  params.set("fill", cell.ceil);
  return `/matrix?${params.toString()}`;
}

export interface HcFixture {
  /**
   * Navigate and wait for the tier the state asked for to actually be the one
   * on screen, then park the cursor away from the content.
   *
   * At `fidelity: "high"` the one web-first assertion is that no `.hc-frame`
   * is left short of `data-hc-fidelity="high"` — every frame has upgraded.
   * At `"lite"` it is the reverse: zero mounted `.hc-sketch-svg` and at least
   * one `.hc-frame`, proving tier 1 painted and tier 2 never took over.
   * Auto-retry does the waiting in both cases; nothing in this file calls
   * `waitForTimeout`.
   */
  goto(state?: HcState, path?: string): Promise<void>;
  /** `.hc-frame` count, read at runtime so no spec hard-codes 31 or 32. */
  frameCount(): Promise<number>;
  /**
   * Navigate to a matrix cell's URL and wait for both the requested tier to
   * settle and the webfont it will be measured against to finish loading.
   * Screenshot geometry is a function of the font metrics Kalam resolves to,
   * and `goto()`'s own settle condition — "the requested tier is on screen"
   * — says nothing about whether those metrics have arrived yet. Kept as its
   * own method rather than added to `goto()`, so the 64 existing specs stay
   * on the exact wait they were built and verified against — `goto()` is
   * untouched by this cycle, provable with `git diff` showing zero lines
   * changed on that function.
   */
  gotoSpecimen(cell: Cell): Promise<void>;
}

export const test = base.extend<{ hc: HcFixture }>({
  hc: async ({ page }, use) => {
    const fixture: HcFixture = {
      async goto(state = {}, path = "/") {
        await page.goto(hcUrl(path, state));

        if ((state.fidelity ?? "high") === "lite") {
          await expect(page.locator(".hc-sketch-svg")).toHaveCount(0);
          await expect(page.locator(".hc-frame")).not.toHaveCount(0);
        } else {
          await expect(page.locator('.hc-frame:not([data-hc-fidelity="high"])')).toHaveCount(0);
        }

        // Button carries `hover:bg-hc-paper-sunken` and a 100ms transition,
        // and `rescribble` shifts the pool seed on `pointerenter`. A cursor
        // left over a specimen from the previous test would change both the
        // paint and the geometry of whatever the next test measures — the
        // single likeliest source of a flaky screenshot, for one line.
        await page.mouse.move(0, 0);
      },
      async frameCount() {
        return page.locator(".hc-frame").count();
      },
      async gotoSpecimen(cell) {
        await page.goto(matrixUrl(cell));

        if (cell.tier === "lite") {
          await expect(page.locator(".hc-sketch-svg")).toHaveCount(0);
        } else {
          // Label holds no `.hc-frame` at all, so this correctly resolves at
          // zero-equals-zero for that one specimen rather than hanging.
          await expect(page.locator('.hc-frame:not([data-hc-fidelity="high"])')).toHaveCount(0);
        }

        await page.evaluate(() => document.fonts.ready);
        await page.mouse.move(0, 0);
      },
    };
    await use(fixture);
  },
});
