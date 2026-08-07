"use client";

/**
 * Handicraft UI — /matrix specimens, cycle 004 §3.4.
 *
 * Every specimen has fixed, declared content. That is a constraint, not an
 * oversight: a committed screenshot baseline pins exact geometry, and
 * geometry is a function of exactly this markup and this text. Changing a
 * specimen's copy invalidates that component's baselines the same way
 * changing its class list would.
 */

import { Badge } from "@/ui/badge/badge";
import { Button } from "@/ui/button/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/card/card";
import { Checkbox } from "@/ui/checkbox/checkbox";
import { Input } from "@/ui/input/input";
import { Label } from "@/ui/label/label";
import { Separator } from "@/ui/separator/separator";
import type { FillLevel, SketchState } from "@handicraft/core";
// `verbatimModuleSyntax: true` requires the `type` modifier on a
// type-only import — `ReactElement` is used only in the return
// annotation below, never as a value.
import type { ReactElement } from "react";
// Fix F7, cycle 004 iteration 2 — the id list and its type live in
// `specimen-ids.ts`, a plain module with no "use client", so `matrix/page.tsx`
// (a Server Component) can import the real runtime array instead of keeping
// a hand-copied duplicate. See that file's header comment for the full story.
import type { SpecimenId } from "./specimen-ids";

export interface SpecimenProps {
  c: SpecimenId;
  /**
   * The specimen's own `fill` prop — distinct from the provider ceiling
   * `/matrix`'s `fill` key still drives. Only Button and Badge expose a
   * `fill` prop; the other five hard-code their intent in source, so this is
   * ignored there by construction rather than by a branch here.
   */
  sfill?: FillLevel;
  /**
   * Cycle 009. Only the button and input cases below branch on it — the two
   * components this cycle wired. `"focus"` and `"default"` (or omitting the
   * prop) both render the plain specimen unchanged.
   */
  state?: SketchState;
}

/**
 * `p-6` is 24px, `--hc-gap-frame` — DESIGN-SYSTEM.md §3's collision floor,
 * not a number invented for this route. PRINCIPLES.md fixes stroke wander at
 * up to 13.81px past the nominal box, with the sketch SVG at
 * `overflow: visible`, so a tighter clip would crop the very overshoot the
 * aesthetic depends on. 24px clears that floor by 10.19px.
 */
export function Specimen({ c, sfill, state }: SpecimenProps) {
  return (
    <div data-testid="hc-specimen" className="inline-flex p-6">
      {renderSpecimen(c, sfill, state)}
    </div>
  );
}

// Fix F11, cycle 004 iteration 3. Without this annotation an id added to
// `SPECIMEN_IDS` with no matching `case` below infers a return type of
// `Element | undefined` rather than an error, and `undefined` renders as
// nothing — silently. With it, a non-exhaustive switch fails to satisfy
// `ReactElement` and `tsc` raises `TS2366` at build time. See
// `specimen-ids.ts`'s header comment, direction 2, for the full mechanism.
function renderSpecimen(
  c: SpecimenId,
  sfill: FillLevel | undefined,
  state: SketchState | undefined,
): ReactElement {
  switch (c) {
    case "button":
      // "disabled" is a real, static state regardless of any pointer.
      // "hover"/"press" instead render with `rescribble` — the URL cannot
      // force a pointer position, so this only enables the frame's own
      // hover/press tracking for a subsequent real `hover()` in a Playwright
      // spec (M14) to drive. Any other state value (including "focus" and
      // "default") renders the plain specimen unchanged.
      if (state === "disabled") {
        return (
          <Button disabled {...(sfill ? { fill: sfill } : {})}>
            Save changes
          </Button>
        );
      }
      if (state === "hover" || state === "press") {
        return (
          <Button rescribble {...(sfill ? { fill: sfill } : {})}>
            Save changes
          </Button>
        );
      }
      return <Button {...(sfill ? { fill: sfill } : {})}>Save changes</Button>;

    case "badge":
      return <Badge {...(sfill ? { fill: sfill } : {})}>Draft</Badge>;

    case "card":
      // The declared hub — cycle 004 §3.4. Holding a Button and a Badge means
      // a regression in either one also fails these 5 Card cells, and that is
      // the requirement rather than a defect: this is the only cell covering
      // `CardFooter`'s gap (`gap-2` to `gap-6` in cycle 002c), and a diff PNG
      // makes which element moved obvious at a glance.
      return (
        <Card className="w-[360px]">
          <CardHeader>
            <CardTitle>Plain card</CardTitle>
            <CardDescription>No margin rule.</CardDescription>
          </CardHeader>
          <CardContent>
            Every frame picks one of eight hand-authored wobble variants from a hash of its own id.
          </CardContent>
          <CardFooter>
            <Button size="sm">Open</Button>
            <Badge variant="marked">New</Badge>
          </CardFooter>
        </Card>
      );

    case "checkbox":
      return <Checkbox label="Remember me" defaultChecked />;

    case "input":
      // Input is `h-11 w-full`, and the specimen wrapper above is a
      // shrink-wrapping `inline-flex`, which `w-full` resolves to zero
      // inside. The fixed-width parent below is what gives it something real
      // to fill — required, not cosmetic.
      //
      // Error is `aria-invalid="true"`, the same real ARIA idiom the
      // component itself derives its state from — not a synthetic prop this
      // route invented. "disabled" is the native attribute. Any other state
      // value renders the plain specimen.
      return (
        <div className="w-[280px]">
          {state === "error" ? (
            <Input aria-invalid="true" placeholder="you@example.com" />
          ) : state === "disabled" ? (
            <Input disabled placeholder="you@example.com" />
          ) : (
            <Input placeholder="you@example.com" />
          )}
        </div>
      );

    case "separator":
      // Both orientations in one specimen. The vertical form is the shape
      // that shipped broken once (F2 — `h-full` suppressing `self-stretch`),
      // and `h-10` gives it a real height to resolve against.
      return (
        <div className="flex w-[280px] flex-col gap-4">
          <Separator />
          <div className="flex h-10 items-stretch gap-3">
            <span className="font-hand text-sm">Docs</span>
            <Separator orientation="vertical" />
            <span className="font-hand text-sm">API</span>
          </div>
        </div>
      );

    case "label":
      // No `htmlFor` — a dangling association would be a defect the matrix
      // is not the instrument for.
      return <Label>Email</Label>;
  }
}
