import { expect, test as base, type Page } from "@playwright/test";
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

/**
 * One painted frame past the current one — two nested
 * `requestAnimationFrame` calls. This is the two-frame anchor
 * `gotoSpecimen`'s lite branch waits on before reading `.hc-sketch-svg`.
 * No longer exported: fix F16, cycle 004 iteration 4, removed the only
 * external call site, a calibration in `matrix.spec.ts` that checked this
 * anchor against a real tier-2 mount on every run. See the comment at the
 * anchor's use below for why the calibration is gone rather than repaired.
 */
function settleOneFrame(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
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
          // Fix F3, cycle 004 iteration 2 (H4). A bare `toHaveCount(0)` here
          // is a web-first assertion, which resolves the instant it is
          // true — and at `fidelity=lite` the page starts with zero
          // `.hc-sketch-svg` regardless of whether tier 2 is about to mount
          // anyway, so the assertion was true before the thing it exists to
          // rule out could happen. Measured live under the fix brief's named
          // mutation (`matrix/page.tsx` forcing `fidelity="high"`): count 0
          // the instant `goto()` returns, count 1 after a 2s settle.
          //
          // Tier 2's mount is not signalled by any DOM attribute — there is
          // no `data-hc-fidelity="lite"`, only `"high"` when tier 2 is
          // active (`useSketchFrame.tsx:269`) — so there is no positive
          // marker to wait for instead. What there is: the frame's first
          // size measurement happens synchronously inside a layout effect on
          // mount (`useSketchFrame.tsx:172-187`, no `ResizeObserver` round
          // trip needed for the initial read), and the geometry pass that
          // follows takes the synchronous `generateSketchSync` path whenever
          // the engine is already warm. Both land within the same handful of
          // commits, so `settleOneFrame` — one full painted frame past
          // hydration — anchors past the boundary a real tier-2 mount would
          // have already crossed, without waiting on an arbitrary timeout.
          //
          // Fix F13, cycle 004 iteration 3. The margin was not measured when
          // the paragraph above was written; it now is. Across 12 trials,
          // tier 2 mounts at rAF index 1 on 11 and at index 2 on 1, against
          // this anchor sitting at index 2 — one frame of margin, not a
          // guarantee. The settle itself is real: 0 of 10 local runs see the
          // mount at `goto()`'s return, 10 of 10 see it at the anchor, and
          // M8 fails 10 of 10 under its named mutation.
          // If the mount ever slips to index 3 on a slower machine, this
          // anchor goes vacuously true again with H4's exact shape —
          // silently.
          //
          // Fix F16, cycle 004 iteration 4. A calibration used to sit in M8
          // and point at this paragraph: it navigated at high fidelity,
          // waited on this same anchor, and asserted a mounted
          // `.hc-sketch-svg` so a slow machine would fail loudly instead of
          // passing vacuously. It was removed because its own named
          // mutation could not be made to bind. Tier 2's mount *races* the
          // `load` event rather than following it, so deleting the anchor
          // leaves the read sitting on the boundary instead of before it.
          // Measured 2026-08-05, `next build && next start`, 40 trials, two
          // count reads one CDP round trip apart: already present at
          // `goto()`'s return on 24, first seen on the second read on 14,
          // absent on both on 2. A guard whose mutation is a coin flip has
          // no derived count, and an integer written beside it would be a
          // figure nobody could reproduce.
          //
          // So the margin above is recorded and unwatched. It stops being a
          // timing question when the frame publishes a positive
          // tier-resolution attribute in *both* directions — today
          // `data-hc-fidelity="high"` appears only when tier 2 wins, so at
          // `fidelity=lite` there is nothing to wait for. That is
          // `packages/core/src/frame/**`, Rule R1 fires, and it is its own
          // cycle.
          await settleOneFrame(page);
          await expect(page.locator(".hc-sketch-svg")).toHaveCount(0);
          // The positive half `goto()`'s own lite branch already carries —
          // the `.hc-frame` not-empty assertion inside `HcFixture.goto`'s
          // own lite branch, above — proves the page actually painted
          // something rather than having gone blank, which the negative
          // assertion alone cannot distinguish.
          //
          // Fix F18, cycle 004 iteration 4. This comment cited "line ~106
          // above". The citation was correct when iteration 1 wrote it, and
          // F13 broke it — inserting fifteen lines above the target moved it
          // to 121 — after which F16's revert moved it three further, to
          // 124. Two edits in two iterations, neither aimed at this line.
          // Naming the assertion instead of a line number cannot go stale
          // the same way.
          //
          // F14, cycle 004 iteration 3. This assertion carries no carve-out
          // the way the `else` branch below does for Label, and it needs
          // none today: this whole `if` branch only ever runs for block B,
          // which is Button-only (§3.5), so a `.hc-frame` always exists to
          // find. That is an assumption on the branch, not a fact about the
          // type, and it is worth writing down rather than leaving implicit
          // — the day a tier-1 Label cell is added (§6.3), this assertion
          // fails loudly and immediately, naming the exact locator, which is
          // a gate working rather than a trap, not a defect to pre-empt with
          // untested code written against a cycle that does not exist yet.
          await expect(page.locator(".hc-frame")).not.toHaveCount(0);
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
