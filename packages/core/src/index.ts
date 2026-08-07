export { cn } from "./lib/cn";
export { composeRefs } from "./lib/compose-refs";

export {
  HandicraftProvider,
  useHandicraft,
  useHandProfile,
  HANDS,
  type Fidelity,
  type Hand,
  type HandProfile,
  type HandicraftConfig,
  type HandicraftProviderProps,
} from "./theme/context";

export { HandicraftSurface, type HandicraftSurfaceProps } from "./theme/surface";

export {
  useSketchFrame,
  useSketchSeed,
  type SketchFrameProps,
  type UseSketchFrameOptions,
  type UseSketchFrameResult,
} from "./frame/useSketchFrame";

export { type SketchState } from "./engine/state";

export { SketchMark, type SketchMarkProps } from "./frame/SketchMark";
export {
  MARK_STROKES,
  FILLED_MARKS,
  markRotation,
  type MarkName,
  type MarkDirection,
} from "./engine/marks";

export {
  generateSketch,
  generateSketchSync,
  preloadSketchEngine,
  taperForSize,
  __resetSketchEngine,
  sketchCacheStats,
  BASE_ROUGHNESS,
  BASE_BOWING,
  BASE_STROKE_WIDTH,
  CHALK_STROKE_WIDTH,
  FILL_LEVELS,
  capFill,
  type FillLevel,
  type InkStyle,
  type SketchCacheStats,
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
export { observeResize, type ResizeCallback } from "./engine/resize-bus";
export { quantize, QUANT } from "./engine/cache";
