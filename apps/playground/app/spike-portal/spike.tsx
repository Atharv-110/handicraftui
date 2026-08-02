"use client";

/**
 * Portal spike — a diagnostic rig, not a component to copy.
 *
 * Nothing in this codebase has ever called `createPortal` before this file.
 * Five of the seventeen remaining components (Dialog, Popover, Tooltip,
 * DropdownMenu, Select) need to portal content to `document.body`, and every
 * one of them will inherit whatever the sketch engine does when it is measured
 * and animated outside the normal document flow. Rather than let each of the
 * five re-discover the same hazards independently, this route asks every
 * question once, in isolation, using raw `createPortal` rather than a UI
 * library — that way a defect can be attributed to the engine's own
 * measurement path rather than to whatever portal abstraction happened to sit
 * on top of it.
 *
 * This route is deliberately unlinked from the rest of the playground — no
 * navigation points here, it is reached only by typing the URL — and it stays
 * that way on purpose. Deleting it once the five components ship would mean
 * rebuilding this rig five times, once per component, as each one hits the
 * same measurement hazards independently.
 *
 * Every case below writes one JSON line into the `<pre data-testid=
 * "spike-readout">` at the bottom of the page, so a browser automation tool
 * can read numbers instead of a human eyeballing pixels. Fixed at
 * `fidelity="high"` throughout: tier 1 mounts no geometry at all, so every
 * question this rig asks is specific to tier 2.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { HandicraftProvider, composeRefs, useSketchFrame } from "@handicraft/core";
import { Button } from "@/ui/button/button";
import { Card, CardContent, CardTitle } from "@/ui/card/card";

/* ------------------------------------------------------------------ *
 * Shared plumbing
 * ------------------------------------------------------------------ */

interface ReadoutEntry {
  case: string;
  [key: string]: unknown;
}

/** Every case reads this to append one line to the shared readout below. */
const ReadoutContext = createContext<(entry: ReadoutEntry) => void>(() => {});

function useRecord(): (entry: ReadoutEntry) => void {
  return useContext(ReadoutContext);
}

// Same isomorphic alias `useSketchFrame.tsx` uses: `useLayoutEffect` warns
// during SSR, and there is no layout to read on a server anyway. Used below
// instead of `useEffect` for the two "flip a flag once mounted" hooks — an
// unconditional `setState` as the first line of a plain `useEffect` body is
// exactly the synchronous-setState-in-effect pattern the lint config's React
// Compiler rules flag, because it forces an extra post-paint render. A layout
// effect runs before paint, so the same flip costs nothing extra.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Creates one throwaway `<div>`, appends it to `document.body`, and hands it
 * back once mounted. Every case that needs a portal target gets its own
 * container rather than sharing one, so a leak or a stray child in one case
 * cannot be mistaken for another case's result.
 *
 * `document` does not exist during SSR, so the container is created inside an
 * effect. Every portal below checks for a non-null container before calling
 * `createPortal` — skipping that gate is the exact mistake the cycle brief
 * calls out: `createPortal(children, document.body)` throws on the server.
 */
function usePortalContainer(): HTMLDivElement | null {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    const node = document.createElement("div");
    document.body.appendChild(node);
    setEl(node);
    return () => {
      node.remove();
    };
  }, []);
  return el;
}

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useIsomorphicLayoutEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Polls `data-hc-fidelity` via a MutationObserver rather than a fixed delay,
 * so the measurement is the real activation time rather than a guess padded
 * large enough to usually work. Falls back to a timeout so a case that never
 * activates still resolves and reports rather than hanging the rig.
 */
function waitForFidelityHigh(el: Element, timeoutMs = 2000): Promise<{ hit: boolean; ms: number }> {
  return new Promise((resolve) => {
    const start = performance.now();
    if (el.getAttribute("data-hc-fidelity") === "high") {
      resolve({ hit: true, ms: performance.now() - start });
      return;
    }
    const mo = new MutationObserver(() => {
      if (el.getAttribute("data-hc-fidelity") === "high") {
        mo.disconnect();
        clearTimeout(timer);
        resolve({ hit: true, ms: performance.now() - start });
      }
    });
    mo.observe(el, { attributes: true, attributeFilter: ["data-hc-fidelity"] });
    const timer = setTimeout(() => {
      mo.disconnect();
      resolve({ hit: false, ms: performance.now() - start });
    }, timeoutMs);
  });
}

/** Constrains a portalled card to the viewport at 375px without a media query. */
const PORTAL_CARD_WIDTH = "w-[min(20rem,calc(100vw-2rem))]";

function CaseHeading({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="font-hand text-lg">
      Case {n} — {title}
    </h2>
  );
}

/* ------------------------------------------------------------------ *
 * Case 0 — context crosses the portal
 * ------------------------------------------------------------------ */

/**
 * `createPortal` moves *where* a subtree paints in the DOM; it does not move
 * the subtree in the React tree, so context should still cross it. This is
 * the one case that de-risks all five portal components at once: if context
 * did not cross, every one of them would silently fall back to the provider's
 * default ceiling instead of whatever the local provider actually set.
 *
 * `Card`'s own fill intent is hard-coded to `"low"` (`card.tsx`), which caps
 * below every possible ceiling regardless of whether the ceiling is the local
 * `"high"` or the context default `"med"` — so a Card can never distinguish
 * "context crossed" from "context did not cross" here, and using one would
 * test nothing. `Button` exposes an explicit `fill` override, which raises
 * its own intent to `"high"` and makes the ceiling the only thing left that
 * can determine the result.
 */
function Case0ContextCrossesPortal() {
  const record = useRecord();
  const mounted = useMounted();
  const inlineRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mounted) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const inlineFill = inlineRef.current?.getAttribute("data-hc-fill") ?? null;
        const portalFill = portalRef.current?.getAttribute("data-hc-fill") ?? null;
        record({
          case: "0",
          inlineFill,
          portalFill,
          bothHigh: inlineFill === "high" && portalFill === "high",
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [mounted, record]);

  return (
    <section data-testid="case-0" className="space-y-2">
      <CaseHeading n="0" title="Context crosses the portal" />
      <HandicraftProvider fidelity="high" fill="high">
        <div className="flex flex-wrap gap-4">
          <Button ref={inlineRef} data-testid="case-0-inline" variant="ghost" fill="high">
            Inline
          </Button>
          {mounted
            ? createPortal(
                <Button ref={portalRef} data-testid="case-0-portal" variant="ghost" fill="high">
                  Portalled
                </Button>,
                document.body,
              )
            : null}
        </div>
      </HandicraftProvider>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Case 1 — measurement inside a portal target that mounts on open
 * ------------------------------------------------------------------ */

function Case1MountOnOpen() {
  const record = useRecord();
  const containerEl = usePortalContainer();
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = cardRef.current;
    if (!el) return;
    void waitForFidelityHigh(el).then(({ hit, ms }) => {
      const svg = el.querySelector(".hc-sketch-svg");
      const rect = el.getBoundingClientRect();
      const svgWidth = svg ? Number(svg.getAttribute("width")) : null;
      const svgHeight = svg ? Number(svg.getAttribute("height")) : null;
      record({
        case: "1",
        activated: hit,
        msToHigh: Math.round(ms),
        svgWidth,
        svgHeight,
        rectWidth: rect.width,
        rectHeight: rect.height,
        // ±2px is the quantize grid (engine/cache.ts), so a delta inside it is
        // measurement noise, not a defect.
        widthDeltaPx: svgWidth !== null ? Math.abs(svgWidth - rect.width) : null,
        heightDeltaPx: svgHeight !== null ? Math.abs(svgHeight - rect.height) : null,
      });
    });
  }, [open, record]);

  return (
    <section data-testid="case-1" className="space-y-2">
      <CaseHeading n="1" title="Measurement inside a portal target that mounts on open" />
      <Button
        data-testid="case-1-toggle"
        disabled={!containerEl}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Close" : "Open"} portal card
      </Button>
      {open && containerEl
        ? createPortal(
            <Card data-testid="case-1-card" ref={cardRef} className={`mt-3 ${PORTAL_CARD_WIDTH}`}>
              <CardTitle>Mounted on open</CardTitle>
              <CardContent>Measured the instant tier 2 activates.</CardContent>
            </Card>,
            containerEl,
          )
        : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Case 2a / 2b — zero-size on first frame (display vs. visibility)
 * ------------------------------------------------------------------ */

/**
 * `getBoundingClientRect()` returns all zeroes for a `display: none` element,
 * so `useSketchFrame` sets size to zero and short-circuits into tier 1 — the
 * open question is whether the shared `ResizeObserver` delivers an entry once
 * the element gains a real box. `visibility: hidden` (2b) is the control: the
 * element keeps its box the whole time, so it should measure correctly from
 * the first frame, and if 2a fails while 2b passes that isolates the cause to
 * `display` rather than to portals generally.
 */
function Case2Reveal({ mode, label }: { mode: "display" | "visibility"; label: string }) {
  const record = useRecord();
  const containerEl = usePortalContainer();
  const [revealed, setRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerEl) return;
    const sampled = new Set<number>();
    const sample = (ms: number) => {
      if (sampled.has(ms)) return;
      sampled.add(ms);
      const el = cardRef.current;
      const rect = el?.getBoundingClientRect();
      record({
        case: label,
        atMs: ms,
        fidelity: el?.getAttribute("data-hc-fidelity") ?? null,
        hasBox: !!(rect && rect.width > 0 && rect.height > 0),
      });
    };
    sample(0);
    const t250 = setTimeout(() => sample(250), 250);
    const t1000 = setTimeout(() => sample(1000), 1000);
    const reveal = setTimeout(() => setRevealed(true), 500);
    return () => {
      clearTimeout(t250);
      clearTimeout(t1000);
      clearTimeout(reveal);
    };
  }, [containerEl, record, label]);

  const wrapperStyle: CSSProperties =
    mode === "display"
      ? { display: revealed ? "block" : "none" }
      : { visibility: revealed ? "visible" : "hidden" };

  return (
    <section data-testid={`case-${label}`} className="space-y-2">
      <CaseHeading
        n={label}
        title={
          mode === "display"
            ? "display:none parent, revealed after 500ms"
            : "visibility:hidden, revealed after 500ms — control case"
        }
      />
      {containerEl
        ? createPortal(
            <div style={wrapperStyle} data-testid={`case-${label}-wrapper`}>
              <Card data-testid={`case-${label}-card`} ref={cardRef} className={PORTAL_CARD_WIDTH}>
                <CardTitle>{mode}</CardTitle>
              </Card>
            </div>,
            containerEl,
          )
        : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Case 2c / 2c-bis — animated entrance
 * ------------------------------------------------------------------ */

/**
 * The highest-value case in this rig. `getBoundingClientRect()` may return
 * the *transformed* rect, so a popup mounting mid-entrance would measure at
 * the scaled size and generate geometry for the wrong dimensions —
 * `ResizeObserver` watches the border box, which a transform does not change,
 * so no correction would ever arrive. Run at two doses (0.9 and 0.5): a
 * hypothesis that predicts the *magnitude* at two doses is far harder to
 * satisfy by accident than one that only predicts a direction.
 *
 * This case reports the raw numbers only — `svgWidth`, `frameOffsetWidth`,
 * the delta between them, and the full `MutationObserver` timeline. The
 * refutation thresholds that turn those numbers into a verdict live in the QA
 * plan, not here: baking a verdict into the rig would let the rig grade its
 * own hypothesis.
 */
function Case2cTransformEntrance({ dose, label }: { dose: number; label: string }) {
  const record = useRecord();
  const containerEl = usePortalContainer();
  const [scaled, setScaled] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const mutationsRef = useRef<Array<{ width: string | null; t: number }>>([]);
  const doneRef = useRef(false);

  // Two frames, not one: the browser has to actually paint the starting
  // `scale(dose)` before the transition to `scale(1)` begins, or the two
  // states coalesce into a single one and `transitionend` never fires.
  useEffect(() => {
    if (!containerEl) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setScaled(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [containerEl]);

  // Watches `.hc-sketch-svg`'s `width` attribute for the life of this case. A
  // single entry (the initial render) is itself the finding: it means
  // whatever `useSketchFrame` measured at mount never got corrected. Two or
  // more mean something did re-measure, and this is what records when.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const mo = new MutationObserver((entries) => {
      const t = performance.now();
      for (const entry of entries) {
        if (entry.type === "attributes" && entry.attributeName === "width") {
          mutationsRef.current.push({ width: (entry.target as Element).getAttribute("width"), t });
        }
      }
    });
    mo.observe(wrap, { attributes: true, attributeFilter: ["width"], subtree: true });
    return () => mo.disconnect();
  }, [containerEl]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const el = cardRef.current;
    const svg = el?.querySelector(".hc-sketch-svg");
    const svgWidth = svg ? Number(svg.getAttribute("width")) : null;
    const frameOffsetWidth = el?.offsetWidth ?? null;
    const deltaPercent =
      svgWidth !== null && frameOffsetWidth
        ? ((frameOffsetWidth - svgWidth) / frameOffsetWidth) * 100
        : null;
    // A second, independent reference. Once the hook measures `offsetWidth`,
    // `svgWidth` and `frameOffsetWidth` are the same number by construction and
    // `deltaPercent` is necessarily zero — that would grade the fix with the
    // fix's own API. `getComputedStyle`'s resolved `width` is the used
    // content-box width from layout, read through a different API entirely, so
    // agreement between the two deltas is evidence rather than a tautology.
    const computedWidth = el ? parseFloat(getComputedStyle(el).width) : null;
    const computedDeltaPercent =
      svgWidth !== null && computedWidth
        ? ((computedWidth - svgWidth) / computedWidth) * 100
        : null;
    record({
      case: label,
      dose,
      svgWidth,
      frameOffsetWidth,
      deltaPercent,
      computedWidth,
      computedDeltaPercent,
      mutationEntries: mutationsRef.current.length,
      mutationLog: mutationsRef.current,
    });
  }, [record, label, dose]);

  useEffect(() => {
    if (!scaled) return;
    const el = cardRef.current;
    const fallback = setTimeout(finish, 1000);
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === "transform") finish();
    };
    el?.addEventListener("transitionend", onEnd);
    return () => {
      clearTimeout(fallback);
      el?.removeEventListener("transitionend", onEnd);
    };
  }, [scaled, finish]);

  return (
    <section data-testid={`case-${label}`} className="space-y-2">
      <CaseHeading n={label} title={`Animated entrance — scale(${dose}) to scale(1) over 200ms`} />
      {containerEl
        ? createPortal(
            <div ref={wrapRef} data-testid={`case-${label}-wrapper`}>
              <div
                style={{
                  width: "min(20rem, calc(100vw - 2rem))",
                  transform: `scale(${scaled ? 1 : dose})`,
                  transformOrigin: "top left",
                  transition: "transform 200ms",
                }}
              >
                <Card data-testid={`case-${label}-card`} ref={cardRef} className="w-full">
                  <CardTitle>{label}</CardTitle>
                  <CardContent>Measured after the transition settles.</CardContent>
                </Card>
              </div>
            </div>,
            containerEl,
          )
        : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Case 3 — unmount and remount, 50 cycles
 * ------------------------------------------------------------------ */

function Case3UnmountRemount() {
  const record = useRecord();
  const containerEl = usePortalContainer();
  const [open, setOpen] = useState(false);
  const [cycling, setCycling] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const frame = useCallback(() => new Promise<void>((r) => requestAnimationFrame(() => r())), []);

  const runCycles = useCallback(async () => {
    if (!containerEl) return;
    setCycling(true);
    for (let i = 0; i < 50; i++) {
      setOpen(true);
      await frame();
      await frame();
      setOpen(false);
      await frame();
    }

    // Checked with the portal closed, before reopening: a stale node held past
    // its close would show up as a non-empty container here.
    const staleChildrenAfterClose = containerEl.children.length;
    const staleSvgCountAfterClose = containerEl.querySelectorAll(".hc-sketch-svg").length;

    setOpen(true);
    await frame();
    const el = cardRef.current;
    const { hit, ms } = el ? await waitForFidelityHigh(el) : { hit: false, ms: 0 };
    const svg = el?.querySelector(".hc-sketch-svg");

    record({
      case: "3",
      cycles: 50,
      staleChildrenAfterClose,
      staleSvgCountAfterClose,
      // A poisoned resize-bus subscription (see resize-bus.ts) has no public
      // surface to inspect directly, so its absence is proven the same way
      // its presence would show up: does the frame still reach fidelity=high
      // with the right size after fifty cycles of teardown.
      reopenActivated: hit,
      reopenMsToHigh: Math.round(ms),
      reopenSvgWidth: svg ? Number(svg.getAttribute("width")) : null,
      reopenRectWidth: el?.getBoundingClientRect().width ?? null,
    });
    setCycling(false);
  }, [containerEl, frame, record]);

  return (
    <section data-testid="case-3" className="space-y-2">
      <CaseHeading n="3" title="Unmount and remount, 50 cycles" />
      <Button
        data-testid="case-3-run"
        disabled={cycling || !containerEl}
        onClick={() => void runCycles()}
      >
        {cycling ? "Cycling…" : "Run 50 open/close cycles"}
      </Button>
      {open && containerEl
        ? createPortal(
            <Card data-testid="case-3-card" ref={cardRef} className={`mt-3 ${PORTAL_CARD_WIDTH}`}>
              <CardTitle>Cycled</CardTitle>
            </Card>,
            containerEl,
          )
        : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Case 3b — ref target identity change while the hook stays mounted
 * ------------------------------------------------------------------ */

/**
 * Adversarial, and reasoned out of the source rather than guessed at.
 * `useSketchFrame`'s measuring effect depends on `[fidelity]`; its ref
 * callback is a `useCallback` with an empty dependency array, so it is stable
 * and React only invokes it on mount and unmount of whichever DOM node it is
 * currently attached to. Swapping the rendered tag from `<div>` to `<section>`
 * unmounts the old node and mounts a genuinely different one — the ref
 * callback fires for both, but the measuring effect does not re-run, because
 * `fidelity` never changed. `observeResize` stays attached to the now-gone old
 * node; the new node is never observed.
 *
 * This calls `useSketchFrame` directly rather than routing through `Button` or
 * `Card`, because no shipped component exposes a way to swap its own root
 * element's tag. `apps/playground` already imports from `@handicraft/core`
 * directly, so this is ordinary playground code, not a registry import.
 */
function Case3bRefIdentitySwap() {
  const record = useRecord();
  const [asSection, setAsSection] = useState(false);
  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rounded",
    radius: 8,
    seedKey: "case-3b",
    fill: "low",
    fillColor: "var(--hc-ink-faint)",
  });
  const { ref: frameRef, ...frameAttrs } = frameProps;
  const elRef = useRef<HTMLElement | null>(null);

  const composedRef = useCallback(
    (node: HTMLElement | null) => {
      frameRef(node);
      elRef.current = node;
    },
    [frameRef],
  );

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const el = elRef.current;
        if (!el) return;
        const svg = el.querySelector(".hc-sketch-svg");
        record({
          case: "3b",
          tag: asSection ? "section" : "div",
          fidelity: el.getAttribute("data-hc-fidelity"),
          svgWidth: svg ? Number(svg.getAttribute("width")) : null,
          rectWidth: el.getBoundingClientRect().width,
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [asSection, record]);

  const targetProps = {
    ...frameAttrs,
    className: `hc-frame block p-4 ${PORTAL_CARD_WIDTH}`,
    "data-testid": "case-3b-target",
  };

  return (
    <section data-testid="case-3b" className="space-y-2">
      <CaseHeading n="3b" title="Ref target identity change while the hook stays mounted" />
      <Button data-testid="case-3b-toggle" onClick={() => setAsSection((v) => !v)}>
        Swap target to {asSection ? "div" : "section"}
      </Button>
      {asSection ? (
        <section {...targetProps} ref={composedRef}>
          {sketchLayer}
          <span className="font-body text-sm">Currently a &lt;section&gt;</span>
        </section>
      ) : (
        <div {...targetProps} ref={composedRef as Ref<HTMLDivElement>}>
          {sketchLayer}
          <span className="font-body text-sm">Currently a &lt;div&gt;</span>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Case 4 — seedKey stability across open and close
 * ------------------------------------------------------------------ */

/**
 * None of the four shipped components expose a settable `seedKey`, so 4b (an
 * explicit, controlled seedKey) needs direct `useSketchFrame` access the same
 * way case 3b does. This bespoke `SeedFrame` exists only to make `seedKey`
 * controllable from outside — it is not standing in for "the real Button and
 * Card" the other cases use, it is answering a question those components
 * cannot expose an API for.
 */
function SeedFrame({ seedKey, ref }: { seedKey?: string; ref?: Ref<HTMLDivElement> }) {
  const { frameProps, sketchLayer } = useSketchFrame({
    shape: "rounded",
    radius: 8,
    fill: "low",
    fillColor: "var(--hc-ink-faint)",
    ...(seedKey !== undefined ? { seedKey } : {}),
  });
  const { ref: frameRef, ...frameAttrs } = frameProps;

  return (
    <div
      {...frameAttrs}
      ref={composeRefs(frameRef as Ref<HTMLDivElement>, ref)}
      className={`hc-frame p-4 ${PORTAL_CARD_WIDTH}`}
      data-testid="seed-frame"
    >
      {sketchLayer}
      <span className="font-body text-sm">seed target</span>
    </div>
  );
}

/**
 * A sibling mounted before the portal case, so opening it shifts everything
 * after it one slot over in the React tree that `useId()` derives its output
 * from. Portals move where a subtree paints, not its position in that tree —
 * see Case 0 — so this decoy sitting outside the portal still shifts the
 * `useId()` fallback of the `SeedFrame` mounted inside one.
 */
function ShiftDecoy() {
  useId();
  return <span data-testid="case-4c-decoy" className="sr-only" />;
}

function SeedKeyCase({ variant }: { variant: "4a" | "4b" | "4c" }) {
  const record = useRecord();
  const containerEl = usePortalContainer();
  const [open, setOpen] = useState(false);
  const [shiftSibling, setShiftSibling] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const dsRef = useRef<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);

  const frame = useCallback(() => new Promise<void>((r) => requestAnimationFrame(() => r())), []);

  const openOnce = useCallback(async () => {
    setOpen(true);
    // Two frames covers the fast path (roughjs already warm, since the
    // provider preloads it) landing geometry before this reads it.
    await frame();
    await frame();
    const path = cardRef.current?.querySelector(".hc-sketch-svg path");
    const d = path?.getAttribute("d") ?? null;
    dsRef.current = [...dsRef.current, d ? d.slice(0, 40) : "<none>"];
    setOpen(false);
    setOpenCount(dsRef.current.length);
    if (dsRef.current.length === 3) {
      const [a, b, c] = dsRef.current;
      record({ case: variant, ds: dsRef.current, allMatch: a === b && b === c });
      dsRef.current = [];
      setOpenCount(0);
    }
  }, [frame, record, variant]);

  return (
    <div data-testid={`case-${variant}`} className="flex flex-wrap items-center gap-3">
      {variant === "4c" ? (
        <label className="font-body flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            data-testid="case-4c-shift-toggle"
            checked={shiftSibling}
            onChange={(e) => setShiftSibling(e.target.checked)}
          />
          shift a sibling before the next open
        </label>
      ) : null}
      {variant === "4c" && shiftSibling ? <ShiftDecoy /> : null}
      <Button
        data-testid={`case-${variant}-open`}
        disabled={!containerEl || open}
        onClick={() => void openOnce()}
      >
        {variant} — open ({openCount}/3)
      </Button>
      {open && containerEl
        ? createPortal(
            <SeedFrame ref={cardRef} {...(variant === "4b" ? { seedKey: "spike-stable" } : {})} />,
            containerEl,
          )
        : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Case 5 / 5b — stacking
 * ------------------------------------------------------------------ */

/**
 * Reproduces the Dialog shape: a fixed full-viewport backdrop with a Card
 * centred on it, entirely inside a portal at the end of `<body>`.
 * `.hc-frame { isolation: isolate }` bounds a stacking context locally, so the
 * sketch SVG's `z-index: -1` should stay contained regardless of where the
 * frame sits in the document — but an `opacity < 1` ancestor (5b) also creates
 * a stacking context of its own, which is the classic way a negative z-index
 * child gets eaten by whatever paints next in its new parent context. Worth
 * verifying rather than assuming `isolation: isolate` on the frame itself is
 * enough.
 */
function Case5Stacking({ opacityWrap, label }: { opacityWrap: number; label: string }) {
  const record = useRecord();
  const containerEl = usePortalContainer();
  const [open, setOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        record({
          case: label,
          fidelity: cardRef.current?.getAttribute("data-hc-fidelity") ?? null,
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [open, record, label]);

  return (
    <section data-testid={`case-${label}`} className="space-y-2">
      <CaseHeading
        n={label}
        title={
          opacityWrap === 1
            ? "Stacking — isolation: isolate plus z-index: -1, portalled to the end of body"
            : "Stacking under an opacity < 1 ancestor, its own stacking context"
        }
      />
      <Button
        data-testid={`case-${label}-open`}
        disabled={!containerEl}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Close" : "Open"} backdrop
      </Button>
      {open && containerEl
        ? createPortal(
            <div
              data-testid={`case-${label}-backdrop`}
              style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
                background: "rgba(0, 0, 0, 0.5)",
                opacity: opacityWrap,
                zIndex: 40,
              }}
            >
              <Card data-testid={`case-${label}-card`} ref={cardRef} className={PORTAL_CARD_WIDTH}>
                <CardTitle data-testid={`case-${label}-text`}>Stacked card</CardTitle>
                <CardContent>
                  Checked mechanically: elementFromPoint over this text must return the text, not
                  the sketch SVG, and elementsFromPoint just outside the card&apos;s left edge must
                  still include it.
                </CardContent>
              </Card>
            </div>,
            containerEl,
          )
        : null}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

export function Spike() {
  const [lines, setLines] = useState<string[]>([]);
  const record = useCallback((entry: ReadoutEntry) => {
    setLines((prev) => [...prev, JSON.stringify(entry)]);
  }, []);

  return (
    <ReadoutContext.Provider value={record}>
      <HandicraftProvider fidelity="high">
        <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6">
          <header className="space-y-1">
            <h1 className="font-hand text-3xl">Portal spike</h1>
            <p className="font-body text-hc-ink-soft text-sm">
              Diagnostic rig for cycle 000, item 2 — not a component to copy. Each case below
              appends one JSON line to the readout at the bottom of the page; read that, not the
              pixels, unless a case says otherwise.
            </p>
          </header>

          <Case0ContextCrossesPortal />
          <Case1MountOnOpen />
          <Case2Reveal mode="display" label="2a" />
          <Case2Reveal mode="visibility" label="2b" />
          <Case2cTransformEntrance dose={0.9} label="2c" />
          <Case2cTransformEntrance dose={0.5} label="2c-bis" />
          <Case3UnmountRemount />
          <Case3bRefIdentitySwap />

          <section data-testid="case-4" className="space-y-2">
            <CaseHeading n="4" title="seedKey stability across open and close" />
            <p className="font-body text-hc-ink-soft text-sm">
              Each row opens and closes three times and records the first path&apos;s <code>d</code>{" "}
              attribute, truncated to 40 characters, on every open, plus whether all three matched.
            </p>
            <div className="flex flex-col gap-3">
              <SeedKeyCase variant="4a" />
              <SeedKeyCase variant="4b" />
              <SeedKeyCase variant="4c" />
            </div>
          </section>

          <Case5Stacking opacityWrap={1} label="5" />
          <Case5Stacking opacityWrap={0.98} label="5b" />

          <section aria-label="Structured results" className="space-y-2">
            <h2 className="font-hand text-xl">Readout</h2>
            <pre
              data-testid="spike-readout"
              className="font-note bg-hc-paper-sunken max-h-96 overflow-auto rounded p-4 text-xs"
            >
              {lines.join("\n")}
            </pre>
          </section>
        </main>
      </HandicraftProvider>
    </ReadoutContext.Provider>
  );
}
