import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `resize-bus` keeps its observer, the callback map and the dirty set as
 * module-level singletons on purpose (see the file's own header comment: one
 * shared `ResizeObserver` for every tier-2 sketch on the page). That is the
 * right design for the app, but it means a fresh module instance is needed
 * per test — otherwise the second test's `observeResize` call would silently
 * reuse the first test's already-constructed `ResizeObserver` instance
 * instead of the one this test just stubbed. `vi.resetModules()` plus a
 * dynamic re-import gives each test its own copy of the module state.
 */

class StubResizeObserver {
  static instances: StubResizeObserver[] = [];
  observed: Element[] = [];
  unobserved: Element[] = [];
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    StubResizeObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve(el: Element) {
    this.unobserved.push(el);
  }
  disconnect() {}
}

// Stands in for requestAnimationFrame, as a queue a test can drain on its own
// schedule instead of waiting on a real frame.
let rafQueue: FrameRequestCallback[] = [];
function drainRaf() {
  const queued = rafQueue;
  rafQueue = [];
  for (const cb of queued) cb(0);
}

beforeEach(() => {
  vi.resetModules();
  StubResizeObserver.instances = [];
  rafQueue = [];
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("observeResize", () => {
  it("observes once and unobserves the same element on teardown", async () => {
    const { observeResize } = await import("./resize-bus");
    const el = document.createElement("div");

    const teardown = observeResize(el, () => {});
    const ro = StubResizeObserver.instances[0]!;

    expect(ro.observed).toEqual([el]);

    teardown();

    expect(ro.unobserved).toEqual([el]);
  });

  it("does not deliver a flush that arrives for an element after its own teardown", async () => {
    const { observeResize } = await import("./resize-bus");
    const el = document.createElement("div");
    const cb = vi.fn();

    const teardown = observeResize(el, cb);
    teardown();

    // Simulate the browser's observer still delivering one more notification
    // for `el` after unobserve was requested — a real race, since unobserve
    // does not retroactively cancel a notification already in flight. The
    // bus's defence against this is deleting the callback entry, not merely
    // removing `el` from the dirty set (which teardown also does, but which
    // a late-arriving entry re-populates on its own by calling straight into
    // the shared observer's callback).
    const ro = StubResizeObserver.instances[0]!;
    ro.callback(
      [{ target: el } as unknown as ResizeObserverEntry],
      ro as unknown as ResizeObserver,
    );

    drainRaf();

    expect(cb).not.toHaveBeenCalled();
  });
});
