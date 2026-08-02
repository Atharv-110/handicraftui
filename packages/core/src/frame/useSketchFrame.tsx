"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  capFill,
  generateSketch,
  generateSketchSync,
  type FillLevel,
  type InkStyle,
  type SketchPath,
  type SketchShape,
} from "../engine/generator";
import { measureBorderBox, observeResize } from "../engine/resize-bus";
import { poolIndex, seedBucket, seedFrom } from "../engine/seed";
import { useHandicraft, HANDS, type Fidelity } from "../theme/context";

/** `useLayoutEffect` warns during SSR; there is no layout to read on a server anyway. */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface UseSketchFrameOptions {
  shape?: SketchShape;
  /** Corner radius for `shape: "rounded"`. */
  radius?: number;
  /** Overrides the provider for this component only. */
  fidelity?: Fidelity;
  /**
   * The component's intended texture density. The provider's `fill` acts as a
   * ceiling, so the effective level is the lower of the two — a page can flatten
   * everything with `fill="no"`, but cannot force cross-hatch onto a surface
   * that has decided paragraphs need to stay readable.
   */
  fill?: FillLevel;
  /** Colour of the hachure. Required for any fill level other than `no`. */
  fillColor?: string;
  ink?: InkStyle;
  roughness?: number;
  bowing?: number;
  strokeWidth?: number;
  /** Any CSS colour. Defaults to the element's own `currentColor`. */
  stroke?: string;
  hachureAngle?: number;
  chalk?: boolean;
  /**
   * Redraw with different geometry on hover/press, so the component looks
   * re-inked. Free — the alternate geometry is already in the cache. Off by
   * default: twenty things redrawing as a cursor crosses a toolbar reads as
   * noise rather than as craft.
   */
  rescribble?: boolean;
  /** Stable string to derive geometry from. Defaults to `useId()`. */
  seedKey?: string;
  /**
   * Ring the frame while a direct child has keyboard focus.
   *
   * For components that put the frame on a wrapper and the real control inside
   * it — Input, Checkbox, and most of what is still to be built. The control's
   * own ring is either invisible (Checkbox's input is `opacity-0`, and opacity
   * applies to an outline like everything else) or drawn inside the frame rather
   * than around it, so the frame has to carry it.
   *
   * Opt-in rather than automatic: a Card containing a focused Button would
   * otherwise draw a second ring around the whole card. The component knows
   * whether its frame is standing in for a control; the stylesheet does not.
   */
  focusWithin?: boolean;
}

export interface SketchFrameProps {
  ref: (node: HTMLElement | null) => void;
  "data-hc-seed": number;
  /** Lets tier 1 draw gradient hachure at the same density tier 2 will. */
  "data-hc-fill": FillLevel;
  "data-hc-fidelity"?: "high";
  "data-hc-focus-within"?: "";
  style?: React.CSSProperties;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
}

export interface UseSketchFrameResult {
  /** Spread onto the framed element, alongside `className="hc-frame"`. */
  frameProps: SketchFrameProps;
  /** Render as the first child. `null` whenever tier 1 is in effect. */
  sketchLayer: ReactNode;
}

/**
 * Wires an element to the sketch engine.
 *
 * The important behaviour is the handover. `data-hc-fidelity="high"` is what
 * hides the CSS stroke layers, and it is only applied *after* rough.js geometry
 * exists. So the CSS frame is visible from the first paint, the SVG replaces it
 * silently once measured, and there is never a frame where the element has no
 * border. Server and client both start in the same state, so hydration matches.
 *
 * Since tier 2 became the default, that swap happens on every page load rather
 * than only when opted in — hence the synchronous generate path, which lets
 * every component after the first swap *before* paint instead of after it.
 */
export function useSketchFrame(options: UseSketchFrameOptions = {}): UseSketchFrameResult {
  const config = useHandicraft();
  const autoId = useId();
  const seedKey = options.seedKey ?? autoId;
  const fidelity = options.fidelity ?? config.fidelity;
  const profile = HANDS[config.hand];

  const [paths, setPaths] = useState<SketchPath[]>([]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [stateOffset, setStateOffset] = useState(0);
  const nodeRef = useRef<HTMLElement | null>(null);

  const {
    shape = "rect",
    radius,
    fillColor,
    ink = config.ink,
    roughness = profile.roughness,
    bowing = profile.bowing,
    strokeWidth = profile.strokeWidth,
    stroke,
    hachureAngle,
    chalk = config.chalk,
    rescribble = false,
    focusWithin = false,
  } = options;

  const fill = capFill(options.fill ?? config.fill, config.fill);

  /** The node the resize bus is currently attached to, and how to detach it. */
  const observedRef = useRef<HTMLElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);

  /**
   * Reconcile the subscription with whatever node the ref currently holds.
   *
   * Deliberately has no dependency array. A component that swaps its rendered tag
   * mounts a genuinely different DOM node, and nothing about that change is
   * expressible as a dependency — with `[fidelity]` the effect never re-ran, the
   * bus stayed attached to the old detached node, and the new node was never
   * measured at all. A node change always accompanies a render, so checking on
   * every render is both sufficient and, in the overwhelmingly common case, one
   * reference comparison.
   *
   * The two obvious alternatives both depend on the ref callback's identity, and
   * `composeRefs` returns a new function per render (see lib/compose-refs.ts)
   * while the shipped components call it inline — so React detaches and
   * re-attaches the frame's ref on every single render.
   *
   * Holding the node in state then sets it twice per render, to null and
   * straight back to the same node. React's `Object.is` bailout absorbs that
   * before it can cascade, so nothing crashes and nothing re-subscribes; it
   * silently doubles the render passes instead, measured at 6 against 12 across
   * three re-renders. Subscribing from a React 19 ref cleanup fails differently:
   * `composeRefs` discards the returned cleanup and returns undefined itself, so
   * React falls back to calling the ref with null and the cleanup never runs at
   * all.
   */
  useIsomorphicLayoutEffect(() => {
    const node = fidelity === "high" ? nodeRef.current : null;
    if (node === observedRef.current) return;

    stopRef.current?.();
    stopRef.current = null;
    observedRef.current = node;

    if (!node) {
      setSize({ w: 0, h: 0 });
      return;
    }

    setSize(measureBorderBox(node));
    stopRef.current = observeResize(node, (w, h) => setSize({ w, h }));
  });

  /**
   * Unmount only. Kept separate from the effect above on purpose: that one has no
   * dependency array, so a cleanup attached to it would unobserve after every
   * render.
   */
  useIsomorphicLayoutEffect(() => {
    return () => {
      stopRef.current?.();
      stopRef.current = null;
      observedRef.current = null;
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (fidelity !== "high" || size.w <= 0 || size.h <= 0) {
      setPaths([]);
      return;
    }

    const geom = { shape, width: size.w, height: size.h, radius };
    const style = {
      seed: seedFrom(seedKey, config.handOffset + stateOffset),
      roughness,
      bowing,
      strokeWidth,
      stroke,
      fill: fillColor,
      fillLevel: fill,
      hachureAngle,
      ink,
      chalk,
    };

    // Fast path: if roughjs is already warm (the provider preloads it), the
    // geometry lands in this same layout pass and the browser never paints the
    // CSS frame at all.
    const immediate = generateSketchSync(geom, style);
    if (immediate) {
      setPaths(immediate);
      return;
    }

    let cancelled = false;
    void generateSketch(geom, style).then((next) => {
      if (!cancelled) setPaths(next);
    });
    return () => {
      cancelled = true;
    };
  }, [
    fidelity,
    size.w,
    size.h,
    shape,
    radius,
    seedKey,
    config.handOffset,
    stateOffset,
    roughness,
    bowing,
    strokeWidth,
    stroke,
    fillColor,
    fill,
    hachureAngle,
    ink,
    chalk,
  ]);

  const active = paths.length > 0;

  const frameProps: SketchFrameProps = {
    ref,
    // Tier 1 picks one of eight authored CSS variants; tier 2 picks one of
    // twelve pooled geometries. Same idea, so the two tiers stay in sympathy.
    "data-hc-seed": seedBucket(seedKey),
    "data-hc-fill": fill,
    // Feeds the CSS hachure gradients, so tier 1 tints its texture the same way
    // tier 2 will rather than defaulting to ink on a highlighter-yellow button.
    ...(fillColor ? { style: { "--hc-fill-color": fillColor } as React.CSSProperties } : {}),
    ...(active ? ({ "data-hc-fidelity": "high" } as const) : {}),
    ...(focusWithin ? ({ "data-hc-focus-within": "" } as const) : {}),
    ...(rescribble && fidelity === "high"
      ? {
          onPointerEnter: () => setStateOffset(1),
          onPointerLeave: () => setStateOffset(0),
          onPointerDown: () => setStateOffset(2),
          onPointerUp: () => setStateOffset(1),
        }
      : {}),
  };

  return {
    frameProps,
    sketchLayer: active ? (
      <SketchLayer
        paths={paths}
        width={size.w}
        height={size.h}
        drawOn={config.drawOn}
        drawOnDuration={config.drawOnDuration}
      />
    ) : null,
  };
}

/** Exposed so components can key other artwork (marks, arrows) to the same hand. */
export function useSketchSeed(seedKey: string, offset = 0): number {
  const { handOffset } = useHandicraft();
  return poolIndex(seedKey, handOffset + offset);
}

interface SketchLayerProps {
  paths: SketchPath[];
  width: number;
  height: number;
  drawOn: boolean;
  drawOnDuration: number;
}

/**
 * Purely decorative, so it is hidden from assistive technology and takes no
 * pointer events. `overflow: visible` matters — rough.js strokes deliberately
 * wander outside the box (~9px at the default hand) and would otherwise be
 * clipped flat, which is exactly the tell that makes a sketch look fake.
 */
function SketchLayer({ paths, width, height, drawOn, drawOnDuration }: SketchLayerProps) {
  return (
    <svg
      className="hc-sketch-svg"
      aria-hidden="true"
      focusable="false"
      width={width}
      height={height}
      {...(drawOn ? { "data-hc-draw": "" } : {})}
      style={{
        position: "absolute",
        inset: 0,
        // Behind the element's content but in front of its background. Relies
        // on `isolation: isolate` from .hc-frame to bound the stacking context.
        zIndex: -1,
        overflow: "visible",
        pointerEvents: "none",
        color: "inherit",
        // The whole sequence's duration; the stylesheet slices it per pass.
        ...(drawOn ? { "--hc-draw-duration": `${drawOnDuration}ms` } : {}),
      }}
    >
      {paths.map((p, i) => (
        <path
          // Index is a stable identity here: the array is regenerated wholesale
          // and its order is meaningful (dust, under-drawing, fill, ink and
          // pooling must paint in sequence).
          key={i}
          d={p.d}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          fill={p.fill}
          {...(p.opacity !== undefined ? { opacity: p.opacity } : {})}
          {...(drawOn
            ? // Normalising pathLength to 1 lets one set of dash keyframes serve
              // every component size without measuring anything.
              { "data-hc-kind": p.kind, pathLength: 1 }
            : {})}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
