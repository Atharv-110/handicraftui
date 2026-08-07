import type { CSSProperties } from "react";
import { HandicraftProvider } from "@handicraft/core";
import { Badge } from "@/ui/badge/badge";
import { Button } from "@/ui/button/button";
import { Card } from "@/ui/card/card";
import { Checkbox } from "@/ui/checkbox/checkbox";
import { Input } from "@/ui/input/input";
import { Separator } from "@/ui/separator/separator";

/**
 * The hero's whole stagger rides one mechanism: `--hc-draw-delay` is a CSS
 * custom property, and custom properties inherit through the DOM regardless
 * of which component happens to sit where. `handicraft.css`'s four timeline
 * rules already read `var(--hc-draw-delay, 0ms)` on every `.hc-sketch-svg
 * path`, so a plain wrapper `<div>` carrying this style sets the delay for
 * every frame beneath it — Card, Separator, Button, Checkbox, Input, Badge
 * alike — with no prop on any of them. That is why `Button`'s own
 * `drawDelay` prop (cycle 009) does not need widening to the other six: the
 * landing turns out not to need it at all.
 *
 * `CSSProperties` carries no index signature for custom properties
 * (csstype's own stance, "removed to enable closed typing"), so the object
 * literal needs the same cast `useSketchFrame.tsx`'s `SketchLayer` already
 * relies on for `--hc-draw-duration` and `--hc-draw-delay` — a spread there
 * dodges the excess-property check where this file states it directly.
 */
function drawDelayStyle(ms: number): CSSProperties {
  return { "--hc-draw-delay": `${ms}ms` } as CSSProperties;
}

/**
 * `data-testid="hero-event-N"` on each of the four wrappers below exists for
 * `tests/e2e/landing.spec.ts`'s LN-3 — the inheritance claim is "the single
 * most load-bearing unverified thing in this brief" and needs a stable
 * handle on each wrapper to read a computed `animation-delay` from. Not a
 * `.hc-frame`, not a class the stylesheet or `hc/no-off-scale-class` reads —
 * inert outside the test that targets it.
 */

/**
 * Section 1. Four draw events, `ROADMAP.md` §5.3's 120-180ms marks band read
 * as a 140ms stagger step (0 / 140 / 280 / 420ms) — the ceiling
 * `ui-ux-pro-max`'s Excessive Motion row sets for a view is one or two
 * animated elements, and four is already generous.
 *
 * `drawOnDuration` is left at the provider default (1100ms) on purpose — that
 * figure has a recorded derivation (`context.tsx`: 520ms "was over before the
 * eye could follow it") and is not re-tuned without new evidence.
 *
 * Sections 2 through 7 render fully drawn at first paint and never carry
 * `drawOn` — Part 2 §8's motion table, narrowed by founder ruling (cycle 012
 * §7): flipping `drawOn` on a mounted frame blinks it from hidden to visible,
 * and mounting a section's tree only on intersection is forbidden outright by
 * Part 2 §5's "no landing content hidden by default and revealed by script."
 * The hero is the one section drawn before the reader can see it happen.
 */
export function Hero() {
  return (
    <HandicraftProvider drawOn>
      {/* `px-6` (24px) is the one horizontal-padding value `PAD_X_PX` carries
          that also clears DESIGN-SYSTEM.md §3's frame-collision floor, so it
          is used unchanged at every width rather than widening at `lg`. Part
          2 §4's 32px (768px) and 80px (1280px) gutter floors are new
          marketing-only figures that were never added to `PAD_X_PX` — §1.7 of
          this cycle's brief touches only `TYPE_SCALE` and
          `HAND_FACE_EXCEPTIONS` — and `hc/no-off-scale-class`'s suppression
          cap is reserved for `min-w-0`/`min-h-0`, not an arbitrary padding
          value. `max-w-[1120px] mx-auto` reaches the same "capped column,
          centred page" outcome without a `px-*` utility outside the ramp:
          the column stops growing at 1120px and the browser distributes the
          remainder as margin. Zero overflow at every width is verified in
          the browser (B1); the exact 32px/80px split is not, and is routed
          to whichever cycle next edits `PAD_X_PX`. */}
      <section className="mx-auto max-w-[1120px] px-6 pt-16 pb-20 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-24 lg:pb-24">
        <div>
          <div data-testid="hero-event-2" style={drawDelayStyle(140)}>
            <p className="font-hand text-hc-ink-soft text-lg">Handicraft UI</p>
            {/* The kicker underline is a Separator, not the SketchMark
                `underline` device Part 2 §7 names for marginalia. SketchMark
                emits only `data-hc-drawn` — no `data-hc-draw`, no
                `pathLength`, no `data-hc-kind` — so it never joins the
                draw-on timeline and cannot be one of the hero's four events.
                Separator goes through SketchLayer and does. Both are
                engine-drawn, so "zero SVG the engine did not produce" holds
                either way. */}
            {/* `max-w-16` caps the rendered width at 64px; `max-w-*` sits
                outside `hc/no-off-scale-class`'s size half entirely (only
                `min-h`, `min-w`, `h`, `w`, `size` and `px` are matched), so
                this is how the kicker underline stays short without an
                arbitrary bracket value. */}
            <Separator decorative className="mt-2 max-w-16" />
          </div>

          <div data-testid="hero-event-1" style={drawDelayStyle(0)} className="mt-6">
            <Card>
              <h1 className="font-hand text-hc-ink text-4xl leading-tight lg:text-5xl">
                Every mark on this page is drawn by the library, live, in the browser, right now.
              </h1>
            </Card>
          </div>

          {/* The headline text itself never animates — only the Card frame
              around it does. Chromium excludes `opacity: 0` elements from
              LCP candidacy, so a faded headline would delay LCP until the
              fade completed; the sketch SVG paths are `aria-hidden` at
              `z-index: -1` and the text paints at first contentful paint
              regardless of the frame's own entrance. */}
          <p className="font-body text-hc-ink mt-6 max-w-[560px] text-lg">
            Tier 2 is rough.js geometry, generated in the browser from a 12-seed pool. Tier 1 is the
            CSS fallback that paints first and steps aside once that geometry exists — the handover
            every specimen on this page goes through on load.
          </p>
        </div>

        <div data-testid="hero-event-3" style={drawDelayStyle(280)} className="mt-12 lg:mt-0">
          <Card>
            <div
              data-testid="hero-event-4"
              style={drawDelayStyle(420)}
              className="flex flex-col gap-4"
            >
              <Button variant="primary">Save draft</Button>
              {/* Decorative specimens, not content — hiding them below the
                  md breakpoint costs nothing readable. Cycle 012's brief
                  (§1.10) derives the 375px frame count as 70 - 3 = 67 from
                  this wrapper, on the premise that `hidden` removes the
                  three from the DOM. It does not: `hidden` is `display:
                  none`, which `document.querySelectorAll(".hc-frame")`
                  still matches — CSS display has no bearing on DOM
                  presence. The visual outcome the brief wants (the panel
                  reduces to Button alone at 375px) is exactly what this
                  produces; the DOM-count side-effect it predicts on top of
                  that is not achievable without client-side conditional
                  mounting, which Part 2 §5 forbids outright ("no landing
                  content hidden by default and revealed by script"). Flagged
                  in the cycle manifest rather than silently built to a
                  number this markup cannot produce. The wrapper still
                  shares Button's 420ms delay, so all four specimens draw as
                  one event wherever they are visible. */}
              <div className="hidden flex-col gap-4 md:flex">
                <Checkbox label="Tier 2 by default" defaultChecked />
                <Input placeholder="fill, hand and ink, all live" readOnly />
                <Badge variant="marked">Drawn, not decoded</Badge>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </HandicraftProvider>
  );
}
