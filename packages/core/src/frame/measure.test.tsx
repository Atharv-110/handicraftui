import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { HandicraftProvider } from "../theme/context";
import { useSketchFrame } from "./useSketchFrame";
import { composeRefs } from "../lib/compose-refs";
import { __resetSketchEngine } from "../engine/generator";

/**
 * Case 2c (cycle 000): a popup mounting mid `scale()` entrance measured its
 * transformed `getBoundingClientRect()` and never corrected it, because a
 * ResizeObserver watches the untransformed border box and so never delivers a
 * correcting entry. The fix reads `offsetWidth`/`offsetHeight` instead
 * (`resize-bus.ts`'s `measureBorderBox`). These tests stub both APIs to
 * DIFFERENT numbers — 160/44 for offsetWidth/Height, 80/22 for
 * getBoundingClientRect, standing in for a `scale(0.5)` entrance — so a
 * regression back to the bounding rect is visible as a width mismatch rather
 * than accidentally passing because both stubs agree.
 *
 * The offsetWidth/Height stub is `isConnected`-aware (real value while
 * attached, 0 once detached) rather than a flat return, because T13 needs a
 * detached node to genuinely measure 0×0 the way a real browser's layout
 * engine would — jsdom's own default is always 0 regardless of attachment,
 * which would make the `isConnected` guard in `resize-bus.ts` untestable at
 * this level (removing the guard would measure the same 160/44 either way).
 */
const BOX = { width: 160, height: 44 };
const TRANSFORMED_RECT = { width: 80, height: 22 };

/**
 * `resize-bus.ts` keeps its `ResizeObserver` as a module-level singleton,
 * constructed lazily on the first `observeResize()` call and reused for the
 * rest of the process (see `resize-bus.test.ts`'s own header comment on the
 * same constraint). Every test below goes through `useSketchFrame`, so the
 * very first mount in this file constructs the one-and-only observer instance
 * for the whole file — `StubResizeObserver.instances` is deliberately never
 * reset in `beforeEach`, or tests after the first would find it empty with no
 * way to repopulate it (the constructor never runs again). Tests that need to
 * inspect what the observer saw snapshot `observed.length`/`unobserved.length`
 * before acting and diff from there, since the arrays accumulate across the
 * whole file rather than resetting per test.
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

/** Stands in for requestAnimationFrame as a queue a test can drain on its own schedule. */
let rafQueue: FrameRequestCallback[] = [];
function drainRaf() {
  const queued = rafQueue;
  rafQueue = [];
  for (const cb of queued) cb(0);
}

let offsetWidthSpy: MockInstance;
let offsetHeightSpy: MockInstance;

beforeEach(() => {
  __resetSketchEngine();
  rafQueue = [];
  vi.stubGlobal("ResizeObserver", StubResizeObserver);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });

  offsetWidthSpy = vi
    .spyOn(HTMLElement.prototype, "offsetWidth", "get")
    .mockImplementation(function (this: HTMLElement) {
      return this.isConnected ? BOX.width : 0;
    });
  offsetHeightSpy = vi
    .spyOn(HTMLElement.prototype, "offsetHeight", "get")
    .mockImplementation(function (this: HTMLElement) {
      return this.isConnected ? BOX.height : 0;
    });

  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    ...TRANSFORMED_RECT,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: TRANSFORMED_RECT.width,
    bottom: TRANSFORMED_RECT.height,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Box({ seedKey }: { seedKey: string }) {
  const { frameProps, sketchLayer } = useSketchFrame({ shape: "rect", seedKey });
  return (
    <div className="hc-frame" {...frameProps}>
      {sketchLayer}
    </div>
  );
}

async function mountBox(seedKey: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    createRoot(container).render(
      <StrictMode>
        <HandicraftProvider fidelity="high">
          <Box seedKey={seedKey} />
        </HandicraftProvider>
      </StrictMode>,
    );
  });
  for (let i = 0; i < 50 && !container.querySelector(".hc-sketch-svg"); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  return container;
}

describe("T10 — measures the untransformed border box", () => {
  it("reads offsetWidth/offsetHeight, not the transformed bounding rect", async () => {
    const container = await mountBox("«t10»");
    const svg = container.querySelector(".hc-sketch-svg");

    // Prove tier 2 actually activated before trusting the width assertion
    // below — Rule V3. A frame that never activated would trivially have no
    // width to be wrong about.
    expect(svg, "tier 2 did not activate — the stubs above are not working").not.toBeNull();
    expect(svg!.querySelectorAll("path").length).toBeGreaterThan(0);

    expect(svg!.getAttribute("width")).toBe("160");
    expect(svg!.getAttribute("height")).toBe("44");
  });
});

describe("T13 — a detached node cannot zero a live frame's geometry", () => {
  it("ignores a flush delivered for an element no longer in the document", async () => {
    const container = await mountBox("«t13»");
    const frameEl = container.querySelector(".hc-frame")!;
    const svgBefore = frameEl.querySelector(".hc-sketch-svg");
    expect(svgBefore, "tier 2 did not activate").not.toBeNull();
    // Captured, not hardcoded: this test is about whether the guard protects
    // whatever the frame was already showing, not about which measurement API
    // produced that number — T10 is the test that owns that question. Pinning
    // this to a literal "160" would make T13 fail on T10's own mutation too,
    // which is not the invariant T13 guards.
    const widthBefore = svgBefore!.getAttribute("width");

    const ro = StubResizeObserver.instances[0]!;
    frameEl.remove(); // detached — isConnected is now false, subscription deliberately left live

    act(() => {
      ro.callback(
        [{ target: frameEl } as unknown as ResizeObserverEntry],
        ro as unknown as ResizeObserver,
      );
      drainRaf();
    });

    // container no longer holds frameEl after remove(); query the detached
    // subtree directly.
    const svgAfter = frameEl.querySelector(".hc-sketch-svg");
    expect(
      svgAfter,
      "the isConnected guard failed — a detached node's flush zeroed a live frame's geometry",
    ).not.toBeNull();
    expect(svgAfter!.getAttribute("width")).toBe(widthBefore);
  });
});

/**
 * T14 through T16 reproduce the shape Button and Card actually ship —
 * `ref={composeRefs(frameRef, localRef)}` called inline in JSX — because
 * `composeRefs` returns a new function every render and that is precisely
 * what makes the naive fixes for case 3b loop (see `useSketchFrame.tsx`'s own
 * comment on the reconcile effect). Anything else tests a shape this library
 * does not ship.
 */
let tagSwapRenderCount = 0;

function TagSwap({
  tag,
  localRef,
}: {
  tag: "div" | "section";
  localRef: { current: HTMLElement | null };
}) {
  tagSwapRenderCount++;
  const { frameProps, sketchLayer } = useSketchFrame({ shape: "rect", seedKey: "«tagswap»" });
  const { ref: frameRef, ...rest } = frameProps;
  const Tag = tag;
  return (
    <Tag className="hc-frame" ref={composeRefs(frameRef, localRef)} {...rest}>
      {sketchLayer}
    </Tag>
  );
}

/** offsetWidth keyed off tagName, so div and section genuinely disagree. */
function useTagAwareOffsetStub() {
  offsetWidthSpy.mockImplementation(function (this: HTMLElement) {
    if (!this.isConnected) return 0;
    return this.tagName === "SECTION" ? 300 : 160;
  });
  offsetHeightSpy.mockImplementation(function (this: HTMLElement) {
    return this.isConnected ? 44 : 0;
  });
}

async function mountTagSwap(tag: "div" | "section") {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const localRef: { current: HTMLElement | null } = { current: null };
  await act(async () => {
    root.render(
      <StrictMode>
        <HandicraftProvider fidelity="high">
          <TagSwap tag={tag} localRef={localRef} />
        </HandicraftProvider>
      </StrictMode>,
    );
  });
  for (let i = 0; i < 50 && !container.querySelector(".hc-sketch-svg"); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
  return { container, root, localRef };
}

async function rerenderTagSwap(
  root: Root,
  tag: "div" | "section",
  localRef: { current: HTMLElement | null },
) {
  await act(async () => {
    root.render(
      <StrictMode>
        <HandicraftProvider fidelity="high">
          <TagSwap tag={tag} localRef={localRef} />
        </HandicraftProvider>
      </StrictMode>,
    );
  });
  for (let i = 0; i < 50; i++) {
    const svg = document.querySelector(".hc-sketch-svg");
    if (svg && svg.getAttribute("width") === (tag === "section" ? "300" : "160")) break;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
}

describe("T14 — a frame that swaps its rendered tag keeps measuring", () => {
  it("measures the new node after a div-to-section swap", async () => {
    useTagAwareOffsetStub();

    const { container, root, localRef } = await mountTagSwap("div");
    expect(container.querySelector(".hc-sketch-svg")!.getAttribute("width")).toBe("160");

    await rerenderTagSwap(root, "section", localRef);

    expect(container.querySelector(".hc-sketch-svg")!.getAttribute("width")).toBe("300");
  });
});

describe("T15 — the swap moves the subscription", () => {
  it("unobserves the old node and observes the new one", async () => {
    useTagAwareOffsetStub();

    const { container, root, localRef } = await mountTagSwap("div");
    const divNode = container.querySelector(".hc-frame")!;
    // Captured after the mount, not before: the resize-bus ResizeObserver is
    // constructed lazily on the first observeResize() call, so grabbing
    // instances[0] before any mount assumes an earlier test already
    // triggered construction — true only when this file runs as a whole,
    // and false (throws on undefined) when this test runs in isolation.
    const ro = StubResizeObserver.instances[0]!;

    // Snapshot AFTER the initial mount, not before: StrictMode double-invokes
    // effects on a component's first mount (mount, simulated unmount,
    // remount), so the div's own initial subscribe already carries one extra
    // observe/unobserve pair by the time this line runs. That pair is React's
    // own StrictMode contract, not something this test is about — isolating
    // to the swap itself is what actually exercises T15's invariant.
    const observedBefore = ro.observed.length;
    const unobservedBefore = ro.unobserved.length;

    await rerenderTagSwap(root, "section", localRef);
    const sectionNode = container.querySelector(".hc-frame")!;

    expect(ro.observed.slice(observedBefore)).toEqual([sectionNode]);
    expect(ro.unobserved.slice(unobservedBefore)).toEqual([divNode]);
  });
});

describe("T16 — re-rendering does not re-subscribe (the loop guard)", () => {
  it("stays at one subscription across three parent re-renders of the same tag", async () => {
    useTagAwareOffsetStub();

    const { container, root, localRef } = await mountTagSwap("div");
    // Rule V3: prove tier 2 activated before trusting anything past this line.
    // Not pinned to a literal width — T16 is about observe/unobserve counts,
    // not about which measurement API produced the number, so it should not
    // fail on a mutation to that API (T10's, specifically) as a side effect.
    expect(container.querySelector(".hc-sketch-svg")).not.toBeNull();
    // Captured after the mount, not before — see T15's comment on the same
    // point; instances[0] does not exist until something has subscribed.
    const ro = StubResizeObserver.instances[0]!;

    // Snapshot AFTER the initial mount's own subscribe call, so the deltas
    // below count only what the three re-renders add — the shared singleton
    // observer (see the file header) means these arrays already carry every
    // earlier test's activity, so an absolute count is not meaningful here,
    // only the delta this test itself produces.
    const observedBefore = ro.observed.length;
    const unobservedBefore = ro.unobserved.length;
    // The loop guard's real signature turned out not to be "observe gets
    // called again" — the QA plan's own prescribed mutation (see below) never
    // adds an extra observe/unobserve call, because React's Object.is bailout
    // on a useState setter absorbs a churned-but-unchanged node reference
    // before it reaches any effect. What the mutation actually costs is
    // wasted component-function invocations: setNode(null) then
    // setNode(node) inside one ref-detach/reattach cycle forces one extra
    // render pass every time, even though nothing observable changes.
    // Measured directly against this file's own fixed baseline: 6 renders for
    // 3 external re-renders here; the T16 mutation below produces 12 — an
    // exact doubling. That doubling, not the subscription count, is what
    // distinguishes the two implementations, so it is what this assertion
    // guards.
    const renderCountBefore = tagSwapRenderCount;

    for (let i = 0; i < 3; i++) {
      await rerenderTagSwap(root, "div", localRef);
    }

    expect(ro.observed.slice(observedBefore)).toHaveLength(0);
    expect(ro.unobserved.slice(unobservedBefore)).toHaveLength(0);
    // 2 renders per external re-render (StrictMode's extra pass included) is
    // this fixture's own measured baseline — not a number pulled from
    // nowhere. A setState-in-ref-callback regression doubles it.
    expect(tagSwapRenderCount - renderCountBefore).toBeLessThanOrEqual(6);
  });
});
