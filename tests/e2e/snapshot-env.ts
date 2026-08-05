/**
 * Cycle 004a. The constants both architecture guards (`matrix.spec.ts`'s M10,
 * `degraded.spec.ts`'s D-ARCH) assert against, kept out of `fixtures.ts` on
 * purpose — `fixtures.ts` is imported by every spec including `perf.spec.ts`,
 * which has nothing to do with screenshots, and it already carries the
 * `visual` blast-radius filter's meaning (`matrixUrl`, `gotoSpecimen`) on its
 * own. Folding two unrelated constants into it would make that filter entry
 * mean two things at once. A separate file keeps both the import graph and
 * `.github/workflows/e2e.yml`'s blast radius honest — this path is listed
 * there alongside it.
 *
 * The values themselves are `node`'s own vocabulary — `process.platform`
 * reports `"linux"`, `process.arch` reports `"arm64"` — not Docker's, because
 * the guards read `process.platform`/`process.arch` directly rather than
 * asking the daemon. See the guards for why: in CI there is no daemon to
 * query, the job runs *inside* the pinned container.
 */

export const SNAPSHOT_PLATFORM = "linux";
export const SNAPSHOT_ARCH = "arm64";

/**
 * `HC_SNAPSHOT_ENV=docker` is the same gate every screenshot assertion in
 * this repo already checks (cycle 003 §2.3) — CoreText and FreeType hint and
 * antialias differently outside the pinned container, so nothing here should
 * run on a bare host. Centralised so the two architecture guards can never
 * drift from that gate or from each other.
 */
export function isSnapshotEnv(): boolean {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  return process.env.HC_SNAPSHOT_ENV === "docker";
}
