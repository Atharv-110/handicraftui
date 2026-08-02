import type { NextConfig } from "next";

const config: NextConfig = {
  // Registry components live outside this app's directory — they are source
  // templates copied into consumer projects, not a published package. This
  // lets Next compile them in place so the playground tests the exact files
  // the registry will ship.
  experimental: {
    externalDir: true,
  },

  /**
   * Dev and production builds get separate output directories.
   *
   * `pnpm build` at the repo root runs `next build` for this app as part of the
   * turbo pipeline. With a shared `.next`, doing that while `next dev` is
   * running replaces the dev server's chunks underneath it, and the next
   * request fails with `Cannot find module './93.js'` — a stale-chunk error
   * that gives no hint about its actual cause.
   *
   * `next dev` runs with NODE_ENV=development; `next build` and `next start`
   * both run as production, so they continue to share `.next` as usual.
   */
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default config;
