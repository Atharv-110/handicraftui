/**
 * Module-scope path cache.
 *
 * A resizing element fires a stream of sub-pixel width changes; regenerating
 * rough.js geometry for each one is pure waste, because a 0.4px delta is not
 * visible through a hand-drawn stroke anyway. Dimensions are quantized before
 * they reach the key, so a drag-resize collapses into a handful of real
 * generations.
 *
 * Bounded with a simple insertion-order eviction (Map preserves it) so a long
 * session with many distinct sizes cannot grow without limit.
 */

const MAX_ENTRIES = 512;

/** Snap to a 2px grid. Below this, differences vanish under the stroke. */
export const QUANT = 2;

export function quantize(value: number): number {
  return Math.max(0, Math.round(value / QUANT) * QUANT);
}

export function createCache<V>(maxEntries: number = MAX_ENTRIES) {
  const map = new Map<string, V>();

  return {
    get(key: string): V | undefined {
      const hit = map.get(key);
      if (hit === undefined) return undefined;
      // Refresh recency: delete + re-set moves it to the end of the iteration order.
      map.delete(key);
      map.set(key, hit);
      return hit;
    },
    set(key: string, value: V): void {
      if (map.size >= maxEntries) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined) map.delete(oldest);
      }
      map.set(key, value);
    },
    get size(): number {
      return map.size;
    },
    clear(): void {
      map.clear();
    },
  };
}
