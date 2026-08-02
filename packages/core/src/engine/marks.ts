/**
 * Drawn marks — the icon layer.
 *
 * A geometric Lucide checkmark inside a wobbly hand-drawn box looks wrong: two
 * different hands on the same object. These are drawn by the same engine, from
 * the same seed pool, through the same size taper as the frame around them, so
 * a tick is drawn by the same person as its checkbox.
 *
 * Geometry is expressed in a 0..1 unit square and scaled at generation time,
 * which is what lets one definition serve a 12px indicator and a 32px button
 * icon. Validated legible down to 12px.
 */

export type MarkName =
  | "check"
  | "cross"
  | "chevron"
  | "arrow"
  | "dot"
  | "dash"
  | "minus"
  | "plus"
  | "ellipsis"
  | "underline"
  | "strike"
  | "bracket"
  | "circle-around";

export type MarkDirection = "right" | "down" | "left" | "up";

/** Polylines in unit space. Multiple entries mean multiple pen strokes. */
export type UnitStroke = ReadonlyArray<readonly [number, number]>;

export const MARK_STROKES: Record<MarkName, ReadonlyArray<UnitStroke>> = {
  // Deliberately asymmetric: the short leg is steeper than the long one, the
  // way a tick is actually written rather than how it would be constructed.
  check: [
    [
      [0.16, 0.54],
      [0.4, 0.78],
      [0.86, 0.22],
    ],
  ],
  cross: [
    [
      [0.24, 0.24],
      [0.76, 0.76],
    ],
    [
      [0.76, 0.24],
      [0.24, 0.76],
    ],
  ],
  chevron: [
    [
      [0.36, 0.24],
      [0.66, 0.5],
      [0.36, 0.76],
    ],
  ],
  arrow: [
    [
      [0.16, 0.5],
      [0.84, 0.5],
    ],
    [
      [0.6, 0.3],
      [0.84, 0.5],
      [0.6, 0.7],
    ],
  ],
  dash: [
    [
      [0.2, 0.5],
      [0.8, 0.5],
    ],
  ],
  minus: [
    [
      [0.22, 0.5],
      [0.78, 0.5],
    ],
  ],
  plus: [
    [
      [0.22, 0.5],
      [0.78, 0.5],
    ],
    [
      [0.5, 0.22],
      [0.5, 0.78],
    ],
  ],
  ellipsis: [
    [
      [0.16, 0.5],
      [0.2, 0.5],
    ],
    [
      [0.48, 0.5],
      [0.52, 0.5],
    ],
    [
      [0.8, 0.5],
      [0.84, 0.5],
    ],
  ],
  underline: [
    [
      [0.04, 0.82],
      [0.96, 0.82],
    ],
  ],
  strike: [
    [
      [0.04, 0.5],
      [0.96, 0.5],
    ],
  ],
  bracket: [
    [
      [0.7, 0.12],
      [0.3, 0.12],
      [0.3, 0.88],
      [0.7, 0.88],
    ],
  ],
  // Sampled at 16 points rather than 8: rough.js bows the segments *between*
  // vertices, so too few points read as a polygon no matter how rough the line
  // is. Overshoots past the start, the way a circled word actually is.
  "circle-around": [
    Array.from({ length: 17 }, (_, i) => {
      const t = (i / 16) * Math.PI * 2.12 - Math.PI / 2;
      return [0.5 + 0.47 * Math.cos(t), 0.5 + 0.45 * Math.sin(t)] as const;
    }),
  ],
  // Rendered as a filled blob rather than a polyline.
  dot: [],
};

/** Marks drawn as a solid mark rather than a stroke path. */
export const FILLED_MARKS: ReadonlySet<MarkName> = new Set<MarkName>(["dot"]);

const ROTATION: Record<MarkDirection, number> = {
  right: 0,
  down: 90,
  left: 180,
  up: 270,
};

export function markRotation(direction: MarkDirection): number {
  return ROTATION[direction];
}
