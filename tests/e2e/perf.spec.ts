import { expect, type Page } from "@playwright/test";
import { hcUrl, test } from "./fixtures";

/**
 * Handover and stress timing — cycle 003 §3.5.
 *
 * Every reading here is taken against `next build && next start`.
 * `webServer` in playwright.config.ts is config-global — confirmed live,
 * not assumed: running `--project=e2e` alone with zero matching spec files
 * still invoked the build command before reporting "No tests found", and
 * Playwright 1.62.1's own types settle it statically too — `webServer` exists
 * only on `TestConfig`, never on `TestProject`. So every project in this
 * config, including this one, already talks to the same production server;
 * moving handover onto it costs nothing extra.
 *
 * §9.3 settled which instrument H1/H2 assert on: both are recorded on the
 * same navigation, and the assertion is on the DOM `MutationObserver`
 * reading, never on `perf-readout.tsx`. The reason is arithmetic, not
 * preference — `perf-readout.tsx` polls on a 16ms timer and needs three
 * consecutive stable counts before it reports anything, and tick 1
 * initialises `lastCount` from `-1` so it can never be the tick that
 * stabilises the count. `frames >= 3` is therefore first reachable on tick 4,
 * and `4 x 16 = 64ms` — a hard floor before a single frame's real work is
 * measured. Every production reading the 110ms budget was derived from (68,
 * 71, 76, 79, 82ms — `000b-engine-fixes.md:1680`) sits inside that engine's
 * own declared 64-90ms "at the floor" band. `perf-readout.tsx` is still
 * recorded on every reading below, for continuity with those numbers and
 * because it is the correct instrument for S1/S2's CPU-bound stress settle —
 * just never the instrument H1/H2 assert against. The budget itself stays at
 * 110ms; a like-for-like re-derivation against the MutationObserver instrument
 * is owed and routed, not performed here (cycle 003 §3.5, §7.4).
 */

/**
 * Chrome DevTools' "Fast 4G" preset, confirmed against Chromium's own
 * source (`front_end/core/sdk/NetworkManager.ts`, `Fast4GConditions`) rather
 * than assumed. The brief's placeholder triple — 4 Mbit/s down, 3 Mbit/s up,
 * 20ms RTT — was flagged unverified and turned out to be wrong on every
 * figure. The real preset applies a 0.9 throughput derating and a 2.75x
 * latency multiplier on top of its nominal 9 Mbps / 1.5 Mbps / 60ms:
 *
 *   download: 9 * 1000 * 1000 / 8 * 0.9  =  1,012,500 B/s
 *   upload:   1.5 * 1000 * 1000 / 8 * 0.9 =   168,750 B/s
 *   latency:  60 * 2.75                   =       165 ms
 */
const FAST_4G = {
  offline: false,
  latency: 60 * 2.75,
  downloadThroughput: ((9 * 1000 * 1000) / 8) * 0.9,
  uploadThroughput: ((1.5 * 1000 * 1000) / 8) * 0.9,
};

const HANDOVER_BUDGET_MS = 110;
const STRESS_BUDGET_MS = 300;

/**
 * Cycle 003 §5: the nightly `perf` workflow job asserts E1 and
 * records H1/H2/S1/S2 without asserting their budgets — a shared 2-vCPU
 * runner is not the condition either budget is stated under, and asserting a
 * budget under conditions it explicitly excludes manufactures failures that
 * are correct to ignore, which trains people to wave the whole check through.
 * `pnpm test:e2e:perf` on the founder's own machine, under the stated
 * conditions, is what actually gates the budget — set by nothing locally, so
 * that command keeps asserting by default. Only `.github/workflows/e2e.yml`'s
 * `perf` job sets this.
 */
// eslint-disable-next-line turbo/no-undeclared-env-vars -- tests/e2e/** is outside every turbo task, see cycle 003 §1.
const RECORD_ONLY = process.env.HC_PERF_RECORD_ONLY === "1";

/**
 * Registered once per page via `addInitScript`, which Playwright re-runs at
 * the start of every subsequent navigation in that page — exactly what a
 * "reload 3 times and time each one" loop needs. Zero point is document
 * start, matching the instrument 002a's own benchmark named in words ("DOM
 * MutationObserver timing `data-hc-fidelity=\"high\"` ... from document
 * start"): the script runs before the page's own scripts, so `performance
 * .now()` at that point is as close to navigation start as page script can
 * observe. `document.documentElement` looked like the obvious observe target
 * — it exists before `<body>` is parsed — but `addInitScript` runs earlier
 * still, before the HTML parser has created it at all (confirmed
 * empirically: observing it threw "parameter 1 is not of type 'Node'" on the
 * first real run). The `Document` node itself is the one
 * thing guaranteed to exist at that point, so it is the observe target
 * instead — `subtree: true` still catches attribute mutations on elements
 * that do not exist yet when `observe()` is called.
 */
async function installHandoverInstrument(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __hcHandover: Promise<number> }).__hcHandover = new Promise<number>(
      (resolve) => {
        const start = performance.now();
        const settled = () => {
          const frames = document.querySelectorAll(".hc-frame");
          return (
            frames.length > 0 &&
            document.querySelectorAll('.hc-frame:not([data-hc-fidelity="high"])').length === 0
          );
        };
        if (settled()) {
          resolve(performance.now() - start);
          return;
        }
        const mo = new MutationObserver(() => {
          if (settled()) {
            mo.disconnect();
            resolve(performance.now() - start);
          }
        });
        mo.observe(document, {
          subtree: true,
          attributes: true,
          attributeFilter: ["data-hc-fidelity"],
        });
      },
    );
  });
}

async function readMutationObserverMs(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __hcHandover: Promise<number> }).__hcHandover);
}

async function readPerfReadoutMs(page: Page): Promise<number | null> {
  const text = await page.locator('[data-testid="perf-readout"]').textContent();
  const match = text?.match(/settled in (\d+)ms/);
  return match ? Number(match[1]) : null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

test.describe("perf", () => {
  test("E1 — served page reports production", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-hc-env", "production");
  });

  for (const dark of [false, true] as const) {
    test(`${dark ? "H2" : "H1"} — handover, ${dark ? "dark" : "light"}, median of 3 warm reloads, Fast 4G`, async ({
      page,
      context,
      hc,
    }) => {
      const client = await context.newCDPSession(page);
      await client.send("Network.enable");
      await client.send("Network.emulateNetworkConditions", FAST_4G);

      await installHandoverInstrument(page);

      const url = hcUrl("/", { dark });
      // Warm-up navigation, discarded. The doctrine table's own production
      // figures split 260.4ms cold-cache from 44.9ms warm — a 5.8x spread
      // from cache state alone (cycle 003 §3.5) — so a median of 3 that
      // mixes one cold navigation with two warm ones is not a median of
      // anything.
      await page.goto(url);

      const mutationObserverReadings: number[] = [];
      const perfReadoutReadings: number[] = [];
      for (let i = 0; i < 3; i++) {
        await page.reload();
        mutationObserverReadings.push(await readMutationObserverMs(page));
        // MutationObserver settles in the tens of milliseconds — faster than
        // perf-readout.tsx's own 64ms floor — so it is reliably still
        // reporting "measuring…" the instant the primary reading above
        // resolves. Waited for here, after the asserted reading is already
        // captured, so recording it for continuity never slows down or
        // perturbs the number this test actually asserts on.
        await expect(page.locator('[data-testid="perf-readout"]')).not.toHaveText("measuring…");
        const perf = await readPerfReadoutMs(page);
        if (perf !== null) perfReadoutReadings.push(perf);
      }

      const frameCount = await hc.frameCount();
      const mutationObserverMedian = median(mutationObserverReadings);

      console.log(
        `[perf] ${dark ? "H2" : "H1"} frameCount=${frameCount} ` +
          `mutationObserver=${mutationObserverReadings.map((n) => n.toFixed(1)).join(",")} ` +
          `(median ${mutationObserverMedian.toFixed(1)}ms) ` +
          `perfReadout=${perfReadoutReadings.join(",")} ` +
          `command="next build && next start" throttle="Fast 4G (verified: 9Mbps*0.9 down, 1.5Mbps*0.9 up, 165ms RTT)" ` +
          `instrument=MutationObserver date=${new Date().toISOString().slice(0, 10)}`,
      );

      if (!RECORD_ONLY) {
        expect(mutationObserverMedian).toBeLessThanOrEqual(HANDOVER_BUDGET_MS);
      }
    });
  }

  for (const dark of [false, true] as const) {
    test(`${dark ? "S2" : "S1"} — stress settle, ${dark ? "dark" : "light"}, median of 3, unthrottled`, async ({
      page,
      hc,
    }) => {
      const url = hcUrl("/", { dark, stress: true });
      await page.goto(url);

      const readings: number[] = [];
      for (let i = 0; i < 3; i++) {
        if (i > 0) await page.reload();
        await expect(page.locator('[data-testid="perf-readout"]')).not.toHaveText("measuring…");
        const ms = await readPerfReadoutMs(page);
        expect(ms, "perf-readout did not report a settled ms figure").not.toBeNull();
        readings.push(ms!);
      }

      const frameCount = await hc.frameCount();
      const settleMedian = median(readings);

      console.log(
        `[perf] ${dark ? "S2" : "S1"} frameCount=${frameCount} ` +
          `perfReadout=${readings.join(",")} (median ${settleMedian}ms) ` +
          `command="next build && next start" throttle="none" ` +
          `instrument=perf-readout.tsx date=${new Date().toISOString().slice(0, 10)}`,
      );

      if (!RECORD_ONLY) {
        expect(settleMedian).toBeLessThanOrEqual(STRESS_BUDGET_MS);
      }
    });
  }
});
