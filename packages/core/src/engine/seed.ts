/**
 * Deterministic seed derivation.
 *
 * This is the load-bearing piece for SSR. roughViz never seeds its generator, so
 * every render produces different path data — harmless for a client-only chart,
 * fatal for a server-rendered component (React would report a hydration
 * mismatch on the `d` attribute of every path).
 *
 * Every sketch in Handcraft derives its seed from a stable string (normally
 * `React.useId()`), so server and client generate byte-identical geometry.
 */

/** Number of pre-authored tier-1 radius variants in handcraft.css. */
export const SEED_BUCKETS = 8;

/**
 * Number of distinct rough.js geometries a page may contain per size.
 *
 * A unique seed per component means a unique generation per component: 500
 * components at `fill="low"` measured **110 ms**, roughly seven dropped frames,
 * because the path cache is keyed on the seed and therefore never hits. Drawing
 * from a small pool instead collapses that to **1.6 ms** — the same 500
 * components share 12 cached geometries.
 *
 * It is not perceptible. Verified by rendering 24 same-size buttons from a
 * 12-seed pool: repeats land non-adjacent and the grid reads as varied. This
 * also mirrors tier 1, which already picks from `SEED_BUCKETS` CSS variants, so
 * both tiers work the same way.
 */
export const POOL_SIZE = 12;

/**
 * Fixed, arbitrary-looking seeds. Hard-coded rather than generated so the
 * geometry of a given component is stable across releases — a build that
 * silently redrew every box would be an unpleasant surprise in a diff.
 */
const POOL_SEEDS: readonly number[] = [
  0x1f3a5c, 0x2b8d41, 0x3c17e9, 0x4d92a7, 0x5e04b3, 0x6f7c28, 0x71e6da, 0x82395f, 0x93ab14,
  0xa4d087, 0xb562c1, 0xc6f39e,
];

/**
 * FNV-1a, 32-bit. Chosen over a cryptographic hash because it is tiny, has no
 * dependencies, and is stable across every JS engine — the last part matters,
 * since server and client must agree exactly.
 */
/**
 * MurmurHash3 finalizer. Without it, FNV-1a's low bits barely move between
 * inputs that differ in one character — and React's `useId` produces exactly
 * that: short base-32 tree positions like `_R_9_`, `_R_h_`, `_R_p_`. Taking
 * `% SEED_BUCKETS` off the raw hash then reads almost-unmixed low bits and
 * collapses a page of components onto two or three wobble variants.
 */
function mix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // hash *= 16777619, via shifts to stay inside 32-bit int math.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return mix32(hash);
}

/**
 * Pool index for a component. `offset` lets the provider shift a whole page to a
 * different "hand", and lets a component shift on hover/active to look re-inked.
 */
export function poolIndex(id: string, offset = 0): number {
  return (((hashString(id) + offset) % POOL_SIZE) + POOL_SIZE) % POOL_SIZE;
}

/**
 * Seed for rough.js (tier 2), drawn from the fixed pool.
 *
 * Every returned value is non-zero by construction — rough.js treats a falsy
 * seed as "unseeded" and falls back to `Math.random()`, which would reintroduce
 * the hydration bug this module exists to prevent.
 */
export function seedFrom(id: string, offset = 0): number {
  return POOL_SEEDS[poolIndex(id, offset)]!;
}

/**
 * Bucket for the tier-1 CSS variant (`data-hc-seed`). Tier 1 cannot compute
 * geometry at runtime, so it selects one of `SEED_BUCKETS` hand-authored
 * border-radius pairs instead.
 */
export function seedBucket(id: string): number {
  return hashString(id) % SEED_BUCKETS;
}
