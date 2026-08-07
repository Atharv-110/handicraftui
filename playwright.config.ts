import { defineConfig, devices } from "@playwright/test";

/**
 * Root project, not a workspace package — see cycle 003 §1. Three independent
 * signals already point at this placement: `.gitignore` carries an unscoped
 * `# Playwright` block, `scripts/build-registry.ts` already lives at the root
 * rather than under `registry/`, and `pnpm lint` already tails a non-turbo
 * `eslint scripts` command for root-level tooling. The decisive reason is
 * negative: `turbo.json` gives `test` a `dependsOn: ["^build"]`, and a
 * workspace package here would put a browser suite inside `turbo run test`
 * — the five gates must stay fast and must not need browser binaries.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4322",
    trace: "retain-on-failure",
  },

  /**
   * `webServer` is config-global, not per-project — every project below talks
   * to the one production server it starts. That is what makes the amendment
   * in cycle 003 §3.5 free: `perf`'s handover specs move onto `next build &&
   * next start` at zero extra build cost, because `e2e`'s parity, degraded,
   * a11y and overflow specs already require a production server to exist.
   *
   * Four choices here are deliberate, not defaults:
   *   - `pnpm build` inside the command, not `pnpm --filter @handicraft/playground
   *     build`. `pnpm build` is `turbo run build`, which rebuilds
   *     `@handicraft/core` first — Rule V4 (a stale `dist` under a live server)
   *     mechanised so a human cannot skip the core rebuild.
   *   - Port 4322, never 4321. 4321 is the founder's `next dev`. Different ports
   *     means the two can run at once and a spec can never attach to dev by
   *     accident.
   *   - `reuseExistingServer: false`, always — even in local development. This
   *     is what actually keeps a timing spec off `next dev`: `next dev` serves
   *     every chunk with `cache-control: no-store, must-revalidate`, so it is
   *     60x slower under throttling for reasons that have nothing to do with
   *     the code under test (cycle 003 §2.2). Reusing a server would risk
   *     attaching to exactly that server.
   *   - 180s timeout. A cold CI runner with no turbo cache builds slower than
   *     the 12.34s measured locally, and the timeout should never be the thing
   *     that fails.
   *
   * One gap this used to leave open, named because a past reader hit it.
   * `pnpm build` guarantees `@handicraft/core`'s `dist` is current —
   * `@handicraft/core#build` hashes every file under `packages/core`, so a
   * core edit always misses the turbo cache and really rebuilds. It used to
   * read as if that same guarantee covered `.next` as a whole, and it did
   * not: `@handicraft/playground#build` reaches `registry/default/**` only
   * through the `@/ui/*` tsconfig path alias, and turbo's package-graph
   * hashing cannot see through a path alias, so a registry-only edit could
   * leave `.next` stale under an unchanged cache hash. Cycle 003a closed
   * this — `turbo.json` now names `registry/default/**` as an explicit
   * `inputs` entry on `@handicraft/playground#build`, so a registry edit
   * busts that task's hash directly and `.next` tracks registry source like
   * every other input.
   */
  /**
   * Cycle 012 amendment. Array of two — the existing entry above is
   * unchanged, byte for byte. `webServer` array entries start in
   * **parallel**, so the second entry cannot depend on the first entry's
   * build having finished; it repeats `pnpm build` rather than assuming it,
   * and the second `turbo run build` is a cache replay of the first, not a
   * second real build. Named fallback if two concurrent `turbo run build`
   * invocations against one `.turbo` cache ever contend rather than replay:
   * drop `pnpm build &&` from this entry and add a standalone
   * `- run: pnpm build` step to `e2e.yml`'s `e2e` job, the way the `visual`
   * job already does. Not needed today — this shipped as the `pnpm build &&`
   * form.
   *
   * Port 4323, never 4321 (the founder's `next dev`) or 4322 (this file's
   * own playground entry above).
   */
  webServer: [
    {
      command: "pnpm build && pnpm --filter @handicraft/playground exec next start --port 4322",
      url: "http://localhost:4322",
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: "pnpm build && pnpm --filter @handicraft/docs exec next start --port 4323",
      url: "http://localhost:4323",
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],

  // Drops the platform suffix Playwright appends by default (`-darwin`,
  // `-linux`). Only one platform ever writes a baseline — see §2.3 — so the
  // suffix would just be permanent dead weight in every file name.
  //
  // Fixed in cycle 003 §15.5 — the original template started with
  // `{testFilePath}`, which `test.d.ts:544` defines as the path *from*
  // `testDir` *to* the spec file, so for a spec sitting directly in `testDir`
  // it resolves to a bare filename and the whole relative template then
  // resolved against the repository root instead of `tests/e2e/`. `{testDir}`
  // is absolute, so prefixing with it is what actually nests the baselines
  // under `testDir` rather than merely hoping the token already did. `.gitignore`
  // changed in the same commit — see its own comment — because the old
  // pattern only ever matched the accidental root placement this fixes.
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",

  projects: [
    {
      // Tier parity, degraded modes, axe and the overflow sweep, plus the
      // landing (cycle 012) — one more entry, not a fifth project. Parallel,
      // default worker count — none of these five families measures time.
      name: "e2e",
      testMatch: [
        "tier-parity.spec.ts",
        "degraded.spec.ts",
        "a11y.spec.ts",
        "overflow.spec.ts",
        "landing.spec.ts",
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Handover and stress timing. `workers: 1` and `fullyParallel: false`
      // are the point of a separate project: a timing measurement taken next
      // to three other browsers competing for the same CPU is not a
      // measurement. `retries: 0` for the same reason — a flaky timing number
      // that passes on retry is not a number worth trusting either.
      name: "perf",
      testMatch: "perf.spec.ts",
      workers: 1,
      fullyParallel: false,
      retries: 0,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Screenshots do not measure time, so parallelism is free here — unlike
      // `perf`, which serialises for that reason. `retries: 0` is pinned for
      // the opposite half of `perf`'s reasoning: a screenshot that passes on
      // retry is masking a real nondeterminism, and the config carrying no
      // global `retries` today is not a guarantee it never will.
      name: "visual",
      testMatch: "matrix.spec.ts",
      retries: 0,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
