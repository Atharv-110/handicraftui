/**
 * Isomorphic entry point — `@handcraft/core/utils`.
 *
 * Nothing here touches React, so it is safe to call from a React Server
 * Component, a build script or a Node process. The default entry carries a
 * "use client" directive; anything imported from it becomes a client reference
 * and cannot be *called* during a server render. `cn()` in particular is needed
 * on both sides, which is why this split exists.
 */

export { cn } from "./lib/cn";
export { composeRefs } from "./lib/compose-refs";

export {
  generateSketch,
  generateSketchSync,
  preloadSketchEngine,
  taperForSize,
  __resetSketchEngine,
  BASE_ROUGHNESS,
  BASE_BOWING,
  BASE_STROKE_WIDTH,
  FILL_LEVELS,
  capFill,
  generateMark,
  generateMarkSync,
  type MarkStyle,
  type FillLevel,
  type InkStyle,
  type SketchFillStyle,
  type SketchGeometry,
  type SketchPath,
  type SketchShape,
  type SketchStyle,
} from "./engine/generator";

export {
  hashString,
  poolIndex,
  seedBucket,
  seedFrom,
  SEED_BUCKETS,
  POOL_SIZE,
} from "./engine/seed";
export { quantize, QUANT } from "./engine/cache";

export {
  MARK_STROKES,
  FILLED_MARKS,
  markRotation,
  type MarkName,
  type MarkDirection,
} from "./engine/marks";
