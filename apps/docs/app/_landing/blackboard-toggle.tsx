"use client";

import * as React from "react";
import { HandicraftProvider, HandicraftSurface } from "@handicraft/core";
import { Button } from "@/ui/button/button";
import { ComposedForm, SectionChrome } from "./sections";

/**
 * Section 5 — the differentiator the reference has no equivalent for.
 * `HandicraftSurface`'s own pattern (cycle 005) already proves the shape a
 * future theme switcher slots into: local state, one wrapped section, the
 * rest of the page untouched.
 *
 * Landing-local rather than a registry component. `registry/default/**`
 * fires the registry dependency assert and is never pre-approved (cycle
 * 012 §1.9), and a theme toggle is not one of the 21 planned components —
 * shipping an eighth registry item ahead of the roadmap puts unplanned
 * public API into every consumer's install surface for one landing
 * section. Everything this component puts on the page is still the
 * registry's: `Button` is the control, `HandicraftSurface` is the paint,
 * and `ComposedForm` is the same tree section 4 already renders.
 *
 * `chalk` is threaded through its own `HandicraftProvider` alongside
 * `HandicraftSurface`'s `dark` — the two are set together deliberately.
 * `HandicraftConfig.chalk`'s own doctring says React cannot see a CSS
 * class, so nothing here can derive chalk from the `.dark` token the way a
 * CSS selector could; the state that drives one has to drive both.
 *
 * No tween, no cross-fade — Part 2 §8's motion table: frames regenerate on
 * click and nothing animates either way, so reduced motion is identical to
 * the resting state.
 */
export function BlackboardToggle() {
  const [dark, setDark] = React.useState(false);

  return (
    <HandicraftSurface
      as="section"
      dark={dark}
      data-testid="blackboard-surface"
      className="mx-auto max-w-[1120px] px-6 py-16 lg:py-24"
    >
      <SectionChrome kicker="Blackboard" heading="The same seven, in chalk" />
      <div className="mb-6">
        {/* `md` (44px) clears the house touch rule; `sm` at 36px is
            dense-desktop-only and wrong here — this is the one interactive
            control on the whole landing. The label carries the state as
            text, and `aria-pressed` carries it to assistive technology;
            colour is never the only signal (`PRINCIPLES.md`'s binding
            rule), which is also the reason a `MarkName` glyph could not
            stand in for this — there is no sun and no moon in that
            thirteen-entry vocabulary. `data-testid` is for LN-4, the same
            reason hero.tsx's four wrappers carry one. */}
        <Button
          type="button"
          variant="ghost"
          size="md"
          aria-pressed={dark}
          data-testid="blackboard-toggle"
          onClick={() => setDark((d) => !d)}
        >
          {dark ? "blackboard" : "paper"}
        </Button>
      </div>
      <HandicraftProvider chalk={dark}>
        <div className="max-w-md">
          <ComposedForm />
        </div>
      </HandicraftProvider>
    </HandicraftSurface>
  );
}
