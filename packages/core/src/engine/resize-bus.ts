/**
 * A single shared ResizeObserver for every tier-2 sketch on the page.
 *
 * roughViz attaches a `window.addEventListener("resize")` handler per chart and
 * tears down the whole SVG on every fire. That is affordable for three charts.
 * It is not affordable for a table with 500 sketched cells, and it misses
 * resizes that don't come from the window (flex reflow, container queries,
 * font swap).
 *
 * One observer + one rAF flush keeps the cost O(changed elements per frame)
 * rather than O(all elements per resize event).
 */

export type ResizeCallback = (width: number, height: number) => void;

const callbacks = new WeakMap<Element, ResizeCallback>();
/** Elements that changed since the last flush. */
let dirty = new Set<Element>();
let frame = 0;
let observer: ResizeObserver | null = null;

function flush(): void {
  frame = 0;
  const batch = dirty;
  dirty = new Set();

  for (const el of batch) {
    const cb = callbacks.get(el);
    if (!cb) continue;
    // Read from the element rather than the ResizeObserverEntry: by flush time
    // the entry's contentRect may be a frame stale.
    const rect = (el as HTMLElement).getBoundingClientRect();
    cb(rect.width, rect.height);
  }
}

function getObserver(): ResizeObserver | null {
  if (typeof ResizeObserver === "undefined") return null;
  if (observer) return observer;

  observer = new ResizeObserver((entries) => {
    for (const entry of entries) dirty.add(entry.target);
    if (frame === 0) frame = requestAnimationFrame(flush);
  });
  return observer;
}

/** Returns an unobserve function, or a no-op when ResizeObserver is unavailable (SSR, jsdom). */
export function observeResize(el: Element, cb: ResizeCallback): () => void {
  const ro = getObserver();
  if (!ro) return () => {};

  callbacks.set(el, cb);
  ro.observe(el);

  return () => {
    callbacks.delete(el);
    dirty.delete(el);
    ro.unobserve(el);
  };
}
