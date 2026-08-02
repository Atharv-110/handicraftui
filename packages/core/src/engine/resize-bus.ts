/**
 * A single shared ResizeObserver for every tier-2 sketch on the page, and the
 * one place an element's size is read for the frame system.
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

/**
 * The element's layout border box.
 *
 * `offsetWidth`/`offsetHeight` rather than `getBoundingClientRect()` because a
 * bounding rect is measured after every transform on the element and on its
 * ancestors. A popup that mounts halfway through a `scale()` entrance would
 * generate geometry for the scaled size and never correct it — a ResizeObserver
 * watches the border box, which a transform does not change, so no correction
 * would ever arrive. Measured in cycle 000: 10% too small at `scale(0.9)`, 50%
 * at `scale(0.5)`, zero corrections at either.
 *
 * Sub-pixel precision is lost, and it does not matter: geometry is generated at
 * `quantize()`'s 2px grid (engine/cache.ts), which already discards more than
 * this rounding does.
 *
 * `|| 0` guards the elements these properties do not exist on — an SVG or MathML
 * root would return `undefined`, and `undefined` propagates to a NaN width that
 * survives the `w <= 0` gate in the generator and produces a garbage path.
 * Zero falls back to tier 1 instead, which is the honest failure.
 */
export function measureBorderBox(el: Element): { w: number; h: number } {
  const node = el as HTMLElement;
  return { w: node.offsetWidth || 0, h: node.offsetHeight || 0 };
}

function flush(): void {
  frame = 0;
  const batch = dirty;
  dirty = new Set();

  for (const el of batch) {
    const cb = callbacks.get(el);
    if (!cb) continue;
    // Read from the element rather than the ResizeObserverEntry: by flush time
    // the entry's contentRect may be a frame stale.
    //
    // A detached element measures 0×0, and a zero measurement drives the frame
    // back to tier 1 and drops its geometry. Skip rather than unobserve: an
    // element that is re-attached later should resume reporting, and the
    // subscription's real owner is whoever called observeResize.
    if (!el.isConnected) continue;
    const { w, h } = measureBorderBox(el);
    cb(w, h);
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
