/**
 * Tier-2 geometry: roughViz's rendering technique, adapted for UI.
 *
 * roughViz calls `rough.svg(el).rectangle(...)` and `appendChild`s the returned
 * `<g>`. That fights React, which expects to own the DOM. We use the generator
 * directly instead — `toPaths()` hands back plain `d` strings that React can
 * render as ordinary JSX, so reconciliation, keys and StrictMode all behave.
 *
 * roughjs is an *optional* peer dependency loaded through a dynamic import. A
 * project that never leaves tier 1 downloads none of it, and a project that
 * forgot to install it degrades to the CSS frame instead of crashing.
 */

import { createCache, quantize } from "./cache";
import { FILLED_MARKS, MARK_STROKES, type MarkName } from "./marks";

export type SketchShape = "rect" | "rounded" | "pill" | "circle" | "underline";

export type SketchFillStyle = "hachure" | "cross-hatch" | "zigzag" | "dots" | "dashed" | "solid";

export interface SketchGeometry {
  shape: SketchShape;
  width: number;
  height: number;
  /** Corner radius for `rounded`. Ignored by other shapes. */
  radius?: number;
}

/**
 * How much scribbled texture sits inside the shape.
 *
 * Levels rather than raw rough.js params because the useful range is narrow and
 * the readable range is narrower still: measured against body copy, `med` and
 * `high` visibly degrade paragraph legibility, while one-word surfaces are fine.
 * Components therefore cap themselves (Input `no`, Card/Button `low`, Badge
 * `med`, checked Checkbox `high`) instead of exposing arbitrary numbers.
 */
export type FillLevel = "no" | "low" | "med" | "high";

interface FillConfig {
  fillStyle: SketchFillStyle;
  fillWeight: number;
  hachureGap: number;
  opacity: number;
}

export const FILL_LEVELS: Record<FillLevel, FillConfig | null> = {
  no: null,
  low: { fillStyle: "hachure", fillWeight: 0.8, hachureGap: 9, opacity: 0.24 },
  med: { fillStyle: "hachure", fillWeight: 1.2, hachureGap: 5.5, opacity: 0.5 },
  high: { fillStyle: "cross-hatch", fillWeight: 1.3, hachureGap: 5, opacity: 0.7 },
};

const FILL_ORDER: readonly FillLevel[] = ["no", "low", "med", "high"];

/**
 * Combine a component's intent with the page's texture budget.
 *
 * The provider's `fill` is a **ceiling**, not a default: a Card that has decided
 * `low` is right for paragraphs must not jump to cross-hatch because the page
 * asked for more, but a page that asks for `no` must be able to flatten
 * everything. Raising above a component's own intent is meaningless, so the
 * result is always the lower of the two.
 */
export function capFill(intent: FillLevel, ceiling: FillLevel): FillLevel {
  return FILL_ORDER.indexOf(intent) <= FILL_ORDER.indexOf(ceiling) ? intent : ceiling;
}

/**
 * `layered` adds two passes roughViz has no equivalent for: a loose pencil
 * guideline under the ink, and heavier marks where a pen would dwell at a
 * direction change. `plain` is the single-pass equivalent.
 */
export type InkStyle = "layered" | "plain";

export interface SketchStyle {
  seed: number;
  roughness?: number;
  bowing?: number;
  strokeWidth?: number;
  stroke?: string;
  /** Colour of the hachure. Ignored when `fillLevel` is `no`. */
  fill?: string;
  fillLevel?: FillLevel;
  hachureAngle?: number;
  ink?: InkStyle;
  /** Chalk needs a wide faint dust pass; ink on paper does not. */
  chalk?: boolean;
}

/**
 * Which pass a path belongs to. Needed by the draw-on animation, which has to
 * treat them differently: strokes are revealed along their length, the hachure
 * fades (revealing it wipes, because it is one path of ~100 disjoint segments),
 * and the pooling marks simply land at the end.
 */
export type SketchPassKind = "dust" | "under" | "fill" | "ink" | "pool";

export interface SketchPath {
  d: string;
  stroke: string;
  strokeWidth: number;
  fill: string;
  opacity?: number;
  kind: SketchPassKind;
}

/** Minimal structural types — avoids a hard type dependency on roughjs. */
interface RoughPathInfo {
  d: string;
  stroke: string;
  strokeWidth: number;
  fill?: string;
}
interface RoughDrawable {
  shape: string;
}
interface RoughGeneratorLike {
  path(d: string, options?: Record<string, unknown>): RoughDrawable;
  circle(x: number, y: number, diameter: number, options?: Record<string, unknown>): RoughDrawable;
  line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: Record<string, unknown>,
  ): RoughDrawable;
  linearPath(
    points: Array<[number, number]>,
    options?: Record<string, unknown>,
  ): RoughDrawable;
  toPaths(drawable: RoughDrawable): RoughPathInfo[];
}
interface RoughModule {
  generator(config?: Record<string, unknown>): RoughGeneratorLike;
}

/**
 * Baseline "hand". Tuned against a 190×52 button and verified in a browser
 * against roughViz — the previous values (roughness 1.1, stroke 1.6,
 * preserveVertices true) produced a rounded rectangle, not a drawing.
 */
export const BASE_ROUGHNESS = 2.2;
export const BASE_BOWING = 1.4;
export const BASE_STROKE_WIDTH = 2.4;

/** Below this, the taper starts pulling the parameters back. */
const TAPER_PIVOT = 44;

/**
 * Scale roughness, bowing and stroke to the element.
 *
 * rough.js wobble amplitude is an absolute pixel count, so parameters that read
 * as confidently drawn on a 190×52 button *destroy* a 20×20 checkbox — the
 * strokes overlap each other and the shape fills in as an unreadable blob.
 * (Rendered and confirmed; this is the same failure mode as sizing a
 * border-radius for one component and applying it to all of them.)
 *
 * Applied centrally so no caller has to remember it. At ≥44px it is the
 * identity; a 20px box lands near roughness 1.0 / stroke 1.8.
 */
export function taperForSize(width: number, height: number) {
  const k = Math.min(1, Math.max(0.4, Math.min(width, height) / TAPER_PIVOT));
  return {
    k,
    scaleRoughness: (base: number) => base * k,
    scaleBowing: (base: number) => base * k,
    // Stroke tapers less aggressively than roughness: a hairline reads as
    // unfinished rather than small.
    scaleStroke: (base: number) => Math.max(1.1, base * (0.55 + 0.45 * k)),
  };
}

const cache = createCache<SketchPath[]>();

let generatorPromise: Promise<RoughGeneratorLike | null> | null = null;
/** Set once the dynamic import resolves; what makes `generateSketchSync` possible. */
let loadedGenerator: RoughGeneratorLike | null = null;
let warnedMissing = false;

async function getGenerator(): Promise<RoughGeneratorLike | null> {
  // Deliberately the *bundled* ESM build, not `roughjs/bin/generator`. The
  // `bin/` tree has extensionless internal imports, so Node's ESM resolver
  // cannot load it — only a bundler can. That would break SSR and node-env
  // tests. The bundled entry is self-contained and works in both.
  generatorPromise ??= import("roughjs/bundled/rough.esm.js")
    .then((mod) => {
      const rough = ((mod as { default?: RoughModule }).default ?? mod) as unknown as RoughModule;
      loadedGenerator = rough.generator();
      return loadedGenerator;
    })
    .catch(() => {
      if (!warnedMissing) {
        warnedMissing = true;
        console.warn(
          '[handcraft] fidelity="high" needs the optional peer dependency `roughjs`. ' +
            "Run `npm install roughjs`. Falling back to the CSS sketch frame.",
        );
      }
      return null;
    });
  return generatorPromise;
}

/** SVG path for a rounded rectangle. rough.js has no rounded-rect primitive, but it will roughen any path. */
function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  if (radius === 0) {
    return `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`;
  }
  return [
    `M${x + radius} ${y}`,
    `L${x + w - radius} ${y}`,
    `A${radius} ${radius} 0 0 1 ${x + w} ${y + radius}`,
    `L${x + w} ${y + h - radius}`,
    `A${radius} ${radius} 0 0 1 ${x + w - radius} ${y + h}`,
    `L${x + radius} ${y + h}`,
    `A${radius} ${radius} 0 0 1 ${x} ${y + h - radius}`,
    `L${x} ${y + radius}`,
    `A${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
    "Z",
  ].join(" ");
}

function cacheKey(geom: SketchGeometry, style: SketchStyle, w: number, h: number): string {
  return [
    geom.shape,
    w,
    h,
    geom.radius ?? "",
    style.seed,
    style.roughness ?? "",
    style.bowing ?? "",
    style.strokeWidth ?? "",
    style.stroke ?? "",
    style.fill ?? "",
    style.fillLevel ?? "",
    style.hachureAngle ?? "",
    style.ink ?? "",
    style.chalk ? "chalk" : "",
  ].join("|");
}

/**
 * Returns SVG path data for one sketched shape, or `[]` when the element has no
 * area yet or roughjs is unavailable.
 */
export async function generateSketch(
  geom: SketchGeometry,
  style: SketchStyle,
): Promise<SketchPath[]> {
  const w = quantize(geom.width);
  const h = quantize(geom.height);
  if (w <= 0 || h <= 0) return [];

  const key = cacheKey(geom, style, w, h);
  const cached = cache.get(key);
  if (cached) return cached;

  const gen = await getGenerator();
  if (!gen) return [];

  const paths = compose(gen, geom, style, w, h);
  cache.set(key, paths);
  return paths;
}

/**
 * Synchronous variant. Returns `null` when roughjs has not finished loading —
 * the caller falls back to the async path.
 *
 * Exists so `HandcraftProvider` can warm the module on mount and every
 * component after the first can generate inside `useLayoutEffect`, swapping the
 * CSS frame for real geometry *before* paint. Without it, every page load shows
 * tier 1 for a frame and then visibly changes.
 */
export function generateSketchSync(
  geom: SketchGeometry,
  style: SketchStyle,
): SketchPath[] | null {
  const w = quantize(geom.width);
  const h = quantize(geom.height);
  if (w <= 0 || h <= 0) return [];

  const key = cacheKey(geom, style, w, h);
  const cached = cache.get(key);
  if (cached) return cached;

  if (!loadedGenerator) return null;

  const paths = compose(loadedGenerator, geom, style, w, h);
  cache.set(key, paths);
  return paths;
}

/** Starts loading roughjs without waiting for a component to need it. */
export function preloadSketchEngine(): void {
  void getGenerator();
}

function shapePath(
  geom: SketchGeometry,
  pad: number,
  iw: number,
  ih: number,
): string | null {
  switch (geom.shape) {
    case "pill":
      return roundedRectPath(pad, pad, iw, ih, ih / 2);
    case "rounded":
      return roundedRectPath(pad, pad, iw, ih, geom.radius ?? 6);
    case "rect":
      return roundedRectPath(pad, pad, iw, ih, 0);
    default:
      // circle and underline use rough.js primitives rather than a path.
      return null;
  }
}

function drawShape(
  gen: RoughGeneratorLike,
  geom: SketchGeometry,
  options: Record<string, unknown>,
  w: number,
  h: number,
  pad: number,
  iw: number,
  ih: number,
): RoughDrawable {
  if (geom.shape === "circle") return gen.circle(w / 2, h / 2, Math.min(iw, ih), options);
  if (geom.shape === "underline") return gen.line(pad, h - pad, w - pad, h - pad, options);
  return gen.path(shapePath(geom, pad, iw, ih)!, options);
}

/**
 * Builds the full stack of passes for one shape, in paint order:
 * dust (chalk only) → under-drawing → fill → ink → pooling.
 */
function compose(
  gen: RoughGeneratorLike,
  geom: SketchGeometry,
  style: SketchStyle,
  w: number,
  h: number,
): SketchPath[] {
  const taper = taperForSize(w, h);
  const strokeWidth = taper.scaleStroke(style.strokeWidth ?? BASE_STROKE_WIDTH);
  const roughness = taper.scaleRoughness(style.roughness ?? BASE_ROUGHNESS);
  const bowing = taper.scaleBowing(style.bowing ?? BASE_BOWING);
  const stroke = style.stroke ?? "currentColor";
  const layered = (style.ink ?? "layered") === "layered";

  // Strokes are centred on the path, so inset by half of one to keep the shape
  // inside the element's own box. Wander beyond that is handled by the parent
  // SVG's overflow:visible.
  const pad = strokeWidth / 2;
  const iw = Math.max(1, w - strokeWidth);
  const ih = Math.max(1, h - strokeWidth);

  const base: Record<string, unknown> = {
    seed: style.seed,
    roughness,
    bowing,
    strokeWidth,
    stroke,
    // Deliberately OFF. With it on, rough.js pins every vertex to the nominal
    // box and the frame loses its corner overshoot — measured 5.47px of wander
    // versus 9.13px without, and visually the difference between "rounded
    // rectangle" and "drawn". Alignment to padding is handled by the taper and
    // by the frame owning no layout, not by pinning corners.
    preserveVertices: false,
    ...(style.hachureAngle !== undefined ? { hachureAngle: style.hachureAngle } : {}),
  };

  const out: SketchPath[] = [];
  const push = (info: RoughPathInfo[], kind: SketchPassKind, opacity?: number) => {
    for (const p of info) {
      out.push({
        d: p.d,
        stroke: p.stroke,
        strokeWidth: p.strokeWidth,
        fill: p.fill ?? "none",
        kind,
        ...(opacity !== undefined ? { opacity } : {}),
      });
    }
  };

  // Chalk on slate reads thin and hard next to ink on paper. A wide, very faint
  // pass underneath restores the dusty edge. Straight colour inversion does not.
  if (style.chalk) {
    push(
      gen.toPaths(
        drawShape(
          gen,
          geom,
          { ...base, strokeWidth: strokeWidth + 2.6 },
          w,
          h,
          pad,
          iw,
          ih,
        ),
      ),
      "dust",
      0.13,
    );
  }

  // Roughed out in pencil before being inked.
  if (layered) {
    push(
      gen.toPaths(
        drawShape(
          gen,
          geom,
          { ...base, seed: style.seed + 977, roughness: roughness * 1.55, strokeWidth: 1.1 },
          w,
          h,
          pad,
          iw,
          ih,
        ),
      ),
      "under",
      0.22,
    );
  }

  const fillConfig = FILL_LEVELS[style.fillLevel ?? "no"];
  if (fillConfig && style.fill) {
    push(
      gen.toPaths(
        drawShape(
          gen,
          geom,
          {
            ...base,
            fill: style.fill,
            fillStyle: fillConfig.fillStyle,
            fillWeight: fillConfig.fillWeight,
            // Chalk does not hatch finely.
            hachureGap: style.chalk ? fillConfig.hachureGap * 1.3 : fillConfig.hachureGap,
            // Suppress this pass's own outline; the ink pass below draws it.
            strokeWidth: 0.001,
            stroke: "none",
          },
          w,
          h,
          pad,
          iw,
          ih,
        ),
      ),
      "fill",
      fillConfig.opacity,
    );
  }

  push(
    gen.toPaths(drawShape(gen, geom, base, w, h, pad, iw, ih)),
    "ink",
    style.chalk ? 0.92 : undefined,
  );

  // A pen dwelling at a direction change leaves a heavier mark. Only on closed
  // shapes with real corners, and only once the box is big enough for it to read
  // as a mark rather than as dirt.
  if (layered && taper.k > 0.55 && geom.shape !== "circle" && geom.shape !== "underline") {
    const corners: Array<[number, number]> = [
      [pad, pad],
      [w - pad, pad],
      [w - pad, h - pad],
      [pad, h - pad],
    ];
    corners.forEach(([cx, cy], i) => {
      const jx = ((style.seed >> (i * 3)) % 3) - 1;
      const jy = ((style.seed >> (i * 5)) % 3) - 1;
      const r = 0.55 * strokeWidth + (i % 2) * 0.25;
      out.push({
        d: circlePath(cx + jx * 0.6, cy + jy * 0.6, r),
        stroke: "none",
        strokeWidth: 0,
        fill: stroke,
        opacity: 0.5,
        kind: "pool",
      });
    });
  }

  return out;
}

/** Two arcs — cheaper than routing a 2px dot through rough.js, and indistinguishable. */
function circlePath(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
}

export interface MarkStyle {
  seed: number;
  size: number;
  roughness?: number;
  bowing?: number;
  strokeWidth?: number;
  stroke?: string;
}

const markCache = createCache<SketchPath[]>();

/**
 * Geometry for one drawn mark.
 *
 * Shares the frame's taper, so a 14px tick inside a checkbox is automatically
 * calmer than a 32px one on a button — without either caller knowing about it.
 * Marks are far smaller than frames, so the taper is doing most of the work
 * here: at 16px the effective roughness lands near 0.8.
 */
export function generateMarkSync(
  name: MarkName,
  style: MarkStyle,
): SketchPath[] | null {
  const size = Math.max(1, Math.round(style.size));
  const key = [name, size, style.seed, style.stroke ?? "", style.strokeWidth ?? ""].join("|");
  const cached = markCache.get(key);
  if (cached) return cached;
  if (!loadedGenerator) return null;

  const gen = loadedGenerator;
  const taper = taperForSize(size, size);
  const strokeWidth = taper.scaleStroke(style.strokeWidth ?? BASE_STROKE_WIDTH * 0.8);
  const options: Record<string, unknown> = {
    seed: style.seed,
    roughness: taper.scaleRoughness(style.roughness ?? BASE_ROUGHNESS),
    bowing: taper.scaleBowing(style.bowing ?? BASE_BOWING),
    strokeWidth,
    stroke: style.stroke ?? "currentColor",
    preserveVertices: false,
  };

  const out: SketchPath[] = [];

  if (FILLED_MARKS.has(name)) {
    out.push({
      d: circlePath(size / 2, size / 2, size * 0.21),
      stroke: "none",
      strokeWidth: 0,
      fill: style.stroke ?? "currentColor",
      kind: "ink",
    });
  } else {
    for (const unitStroke of MARK_STROKES[name]) {
      const pts = unitStroke.map(([x, y]) => [x * size, y * size] as [number, number]);
      const drawable =
        pts.length === 2
          ? gen.line(pts[0]![0], pts[0]![1], pts[1]![0], pts[1]![1], options)
          : gen.linearPath(pts, options);
      for (const p of gen.toPaths(drawable)) {
        out.push({
          d: p.d,
          stroke: p.stroke,
          strokeWidth: p.strokeWidth,
          fill: p.fill ?? "none",
          kind: "ink",
        });
      }
    }
  }

  markCache.set(key, out);
  return out;
}

export async function generateMark(name: MarkName, style: MarkStyle): Promise<SketchPath[]> {
  const immediate = generateMarkSync(name, style);
  if (immediate) return immediate;
  await getGenerator();
  return generateMarkSync(name, style) ?? [];
}

/** Test/HMR escape hatch. */
export function __resetSketchEngine(): void {
  cache.clear();
  generatorPromise = null;
  loadedGenerator = null;
  warnedMissing = false;
}
