"use client";

import { useEffect, useState } from "react";

/**
 * Time from first paint to the point where every sketch frame has mounted its
 * geometry, plus the resulting DOM cost.
 *
 * Exists because the seed pool was justified by a generation benchmark
 * (110 ms → 1.6 ms for 500 components) and that number says nothing about
 * rasterization. This measures the thing the benchmark could not.
 */
export function PerfReadout() {
  const [stats, setStats] = useState<{ ms: number; svgs: number; paths: number } | null>(null);

  useEffect(() => {
    const start = performance.now();
    let frames = 0;
    let lastCount = -1;

    // Poll until the number of mounted sketch layers stops changing for a few
    // consecutive ticks. `setTimeout` rather than `requestAnimationFrame`
    // because headless Chrome's virtual-time mode drives timers but not rAF,
    // and this needs to be measurable from a script as well as by eye.
    let timer: ReturnType<typeof setTimeout>;
    let ticks = 0;
    const tick = () => {
      const svgs = document.querySelectorAll(".hc-sketch-svg").length;
      // Tier 1 mounts no geometry at all, so waiting for a non-zero count would
      // hang forever rather than reporting the (perfectly valid) zero.
      if (++ticks > 40 && svgs === 0) {
        setStats({ ms: Math.round(performance.now() - start), svgs: 0, paths: 0 });
        return;
      }
      if (svgs === lastCount && svgs > 0) {
        frames += 1;
        if (frames >= 3) {
          setStats({
            ms: Math.round(performance.now() - start),
            svgs,
            paths: document.querySelectorAll(".hc-sketch-svg path").length,
          });
          return;
        }
      } else {
        frames = 0;
        lastCount = svgs;
      }
      timer = setTimeout(tick, 16);
    };

    timer = setTimeout(tick, 16);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div data-testid="perf-readout" className="font-note text-hc-ink-faint mt-2 text-xs">
      {stats
        ? stats.svgs === 0
          ? "tier 1 — CSS frame only, no geometry mounted"
          : `settled in ${stats.ms}ms · ${stats.svgs} frames · ${stats.paths} paths`
        : "measuring…"}
    </div>
  );
}
