"use client";

import { useEffect, useId, useLayoutEffect, useState } from "react";
import { generateMark, generateMarkSync, type SketchPath } from "../engine/generator";
import { markRotation, type MarkDirection, type MarkName } from "../engine/marks";
import { seedFrom } from "../engine/seed";
import { HANDS, useHandicraft } from "../theme/context";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface SketchMarkProps {
  name: MarkName;
  /** Box size in px. The mark scales to fill it. */
  size?: number;
  /** Rotation for directional marks (`chevron`, `arrow`, `bracket`). */
  direction?: MarkDirection;
  /** Defaults to `currentColor`, so a mark inherits its parent's ink. */
  color?: string;
  strokeWidth?: number;
  className?: string;
  /**
   * Marks are usually decorative — the label beside a checkbox carries the
   * meaning. Pass a label only when the mark is the sole carrier.
   */
  label?: string;
  /** Share a frame's seed so mark and frame look drawn in the same stroke. */
  seedKey?: string;
}

/**
 * A hand-drawn icon.
 *
 * Deliberately not a font or an SVG sprite: those are geometrically perfect and
 * read as a different hand from the frame around them. This shares the frame's
 * seed pool, active `hand` and size taper, so a tick and its checkbox look like
 * one drawing rather than two.
 */
export function SketchMark({
  name,
  size = 16,
  direction = "right",
  color,
  strokeWidth,
  className,
  label,
  seedKey,
}: SketchMarkProps) {
  const config = useHandicraft();
  const autoId = useId();
  const key = seedKey ?? autoId;
  const profile = HANDS[config.hand];

  const [paths, setPaths] = useState<SketchPath[]>([]);

  useIsomorphicLayoutEffect(() => {
    const style = {
      seed: seedFrom(key, config.handOffset),
      size,
      roughness: profile.roughness,
      bowing: profile.bowing,
      ...(strokeWidth !== undefined ? { strokeWidth } : {}),
      ...(color !== undefined ? { stroke: color } : {}),
    };

    const immediate = generateMarkSync(name, style);
    if (immediate) {
      setPaths(immediate);
      return;
    }

    let cancelled = false;
    void generateMark(name, style).then((next) => {
      if (!cancelled) setPaths(next);
    });
    return () => {
      cancelled = true;
    };
  }, [name, size, key, config.handOffset, profile.roughness, profile.bowing, strokeWidth, color]);

  const rotation = markRotation(direction);

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      // rough.js strokes wander past their nominal box; clipping them flat is
      // the tell that makes a sketch look fake.
      style={{ overflow: "visible", display: "inline-block", flex: "none" }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      focusable="false"
    >
      <g transform={rotation ? `rotate(${rotation} ${size / 2} ${size / 2})` : undefined}>
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill={p.fill}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}
