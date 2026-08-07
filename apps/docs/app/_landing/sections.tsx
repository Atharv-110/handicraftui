import { HandicraftProvider, type Hand } from "@handicraft/core";
import { Badge } from "@/ui/badge/badge";
import { Button } from "@/ui/button/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/card/card";
import { Checkbox } from "@/ui/checkbox/checkbox";
import { Input } from "@/ui/input/input";
import { Label } from "@/ui/label/label";
import { Separator } from "@/ui/separator/separator";
import { Marginalia } from "../_marginalia/marginalia";

/** Shared page rhythm — 96px vertical at 1280 (`py-24`), 64px at 375
 * (`py-16`); Part 2 §4. Horizontal padding is the one `PAD_X_PX` value (24px,
 * `px-6`) that also clears the frame-collision floor — see hero.tsx's own
 * comment for why the 32px/768px and 80px/1280px figures are not expressed
 * as `px-*` utilities here. */
const SECTION = "mx-auto max-w-[1120px] px-6 py-16 lg:py-24";

/**
 * Every section opens with a Kalam kicker above a heading in a drawn frame —
 * two frames, `Card` for the heading and `Separator` for the kicker
 * underline, the "chrome 2" addend in every §1.10 row. Neither carries a
 * `--hc-draw-delay` wrapper: sections 2 through 7 render fully drawn at
 * first paint, per the founder-accepted narrowing in cycle 012 §7.
 */
export function SectionChrome({ kicker, heading }: { kicker: string; heading: string }) {
  return (
    <div className="mb-8">
      <p className="font-hand text-hc-ink-soft text-lg">{kicker}</p>
      <Separator decorative className="mt-2 mb-4 max-w-16" />
      <Card>
        <h2 className="font-hand font-bold text-hc-ink text-3xl">{heading}</h2>
      </Card>
    </div>
  );
}

/**
 * Section 2 — the one claim no competitor's landing can make: the same
 * `Button`, unmodified, at both resolved tiers. `fidelity` on
 * `HandicraftProvider` overrides the default for everything beneath it, so
 * the two columns genuinely render through different code paths rather than
 * a screenshot standing in for one of them.
 */
export function TheHandover() {
  return (
    <section className={SECTION}>
      <SectionChrome kicker="The handover" heading="Two renders, one attribute" />
      <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
        <div>
          <HandicraftProvider fidelity="lite">
            <Button variant="primary">Save draft</Button>
          </HandicraftProvider>
          <p className="font-body text-hc-ink-soft mt-3 text-sm">
            <code>fidelity=&quot;lite&quot;</code> — CSS only, zero JavaScript
          </p>
        </div>
        <div>
          <HandicraftProvider fidelity="high">
            <Button variant="primary">Save draft</Button>
          </HandicraftProvider>
          <p className="font-body text-hc-ink-soft mt-3 text-sm">
            <code>fidelity=&quot;high&quot;</code> — rough.js geometry
          </p>
        </div>
      </div>
    </section>
  );
}

const HAND_CARDS: Array<{ hand: Hand; label: string }> = [
  { hand: "steady", label: "steady" },
  { hand: "natural", label: "natural" },
  { hand: "loose", label: "loose" },
  { hand: "hurried", label: "hurried" },
];

/** One specimen per hand card — Button, Checkbox, Input, Badge, in that
 * order, so the four-card grid is the hand demo rather than a fifth
 * repeated specimen. */
function handSpecimen(hand: Hand) {
  switch (hand) {
    case "steady":
      return <Button variant="primary">Save draft</Button>;
    case "natural":
      return <Checkbox label="Notify me" defaultChecked />;
    case "loose":
      return <Input placeholder="Same input, different pen" readOnly />;
    case "hurried":
      return <Badge variant="marked">Drawn live</Badge>;
  }
}

/**
 * Section 3 — the feature grid, and the grid itself is the demonstration.
 * Four cards, one per `hand`, each under its own nested `HandicraftProvider`
 * so the rough.js parameters genuinely differ card to card rather than being
 * relabelled.
 *
 * `gap-9` (36px) is Part 2 §4's tilted-frame floor, not the shipped 24px
 * `SPACING.gapFrame` — two facing ±1° cards need `2 x 13.81 + rotation growth
 * <= 36px` (cycle 012 §1.12), and `gap-` sits outside
 * `hc/no-off-scale-class`'s size half entirely, so the wider figure needs no
 * suppression to ship.
 *
 * Rotation is `rotate-[0.6deg]`, alternating sign, applied to the wrapper
 * `<div>` around each card rather than to the `Card` element itself —
 * CODE-CONTRACT's frame styling stays untouched, and the rotation is layout,
 * not a frame parameter.
 */
export function FourHands() {
  return (
    <section className={`${SECTION} hc-ruled`}>
      <SectionChrome kicker="Four hands" heading="One drawing personality per page" />
      <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
        {HAND_CARDS.map(({ hand, label }, i) => (
          <div key={hand} className={i % 2 === 0 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"}>
            <HandicraftProvider hand={hand}>
              <Card>
                <CardTitle>{label}</CardTitle>
                <div className="mt-3">{handSpecimen(hand)}</div>
              </Card>
            </HandicraftProvider>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The composed form both section 4 and section 5 render — a real form, not a
 * swatch grid, per §1.10's own framing. Exported so the blackboard toggle
 * (section 5) re-renders the identical tree rather than a hand-copied one
 * that could drift from it.
 *
 * Six frames: `Card` + `Input` x2 + `Checkbox` + `Button` + `Badge`. §1.10's
 * content bullet for section 4 also names a `Separator` between the fields
 * and the footer, but the frame-count table's own addends (`chrome 2 + Card
 * 1 + Input x2 + Checkbox 1 + Button 1 + Badge 1 = 8`) and the independent
 * per-component cross-check (`Separator 12`, derived from exactly one
 * kicker per section plus the numbers panel's four) both total 70 only
 * without it. Built to the number, which is checked twice; the extra
 * Separator is a prose/table mismatch in the brief, not implemented.
 */
export function ComposedForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a project</CardTitle>
        <CardDescription>The same seven components, doing an actual job.</CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hc-project-name">Name</Label>
          <Input id="hc-project-name" placeholder="Handicraft UI" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hc-project-owner">Owner</Label>
          <Input id="hc-project-owner" placeholder="you@example.com" />
        </div>
        <Checkbox label="Notify me when this ships" defaultChecked />
      </div>
      <CardFooter>
        <Button variant="primary">Create project</Button>
        <Badge variant="marked">Draft</Badge>
      </CardFooter>
    </Card>
  );
}

/** Section 4. */
export function ComponentsAtWork() {
  return (
    <section className={SECTION}>
      <SectionChrome kicker="Components at work" heading="A form, not a swatch grid" />
      <div className="max-w-md">
        <ComposedForm />
      </div>
    </section>
  );
}

/**
 * Section 6 — the numbers, `VOICE.md`'s register made into a panel. Five
 * figures, four `Separator`s between them (fence-post, not one per figure),
 * every number copied from a doctrine file rather than invented — `VOICE.md`
 * itself names the 34.3ms handover as the worked example of its own
 * "state the condition" rule, so its exact wording is reused for the
 * `Marginalia` note beneath the panel rather than paraphrased.
 */
export function TheNumbers() {
  return (
    <section className={`${SECTION} hc-ruled`}>
      <SectionChrome kicker="The numbers" heading="Measured, not adjectived" />
      <Card>
        <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap">
          <Figure value="12" label="seeds in the pool" />
          <Separator orientation="vertical" className="hidden sm:block" />
          <Figure value="1.6ms" label="500 frames, from the pool (110ms without)" />
          <Separator orientation="vertical" className="hidden sm:block" />
          <div>
            <Figure value="34.3ms" label="handover" />
            <Badge variant="marked" className="mt-2">
              budget: 110ms
            </Badge>
          </div>
          <Separator orientation="vertical" className="hidden sm:block" />
          <Figure value="13.81px" label="worst-case stroke excursion" />
          <Separator orientation="vertical" className="hidden sm:block" />
          <Figure value="44px" label="minimum touch target" />
        </div>
      </Card>
      <div className="mt-4">
        <Marginalia>
          The 34.3ms figure is measured against <code>next build &amp;&amp; next start</code>, Fast
          4G throttled, median of 3 warm reloads, on 2026-08-04. 110ms is the stress budget this
          page never approaches at 70 frames — a ceiling, not what loaded.
        </Marginalia>
      </div>
    </section>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-hand font-bold text-hc-ink text-3xl">{value}</p>
      <p className="font-body text-hc-ink-soft text-sm">{label}</p>
    </div>
  );
}

/** Every planned component, Badge and Wave order from `ROADMAP.md` §7 to
 * §9 — 7 shipped, 14 not, 21 total. Distinguished by variant AND text, never
 * colour alone: `PRINCIPLES.md`'s binding rule, and this is its hardest
 * application on the page. */
const COMPONENTS: Array<{ name: string; built: boolean }> = [
  { name: "Badge", built: true },
  { name: "Button", built: true },
  { name: "Card", built: true },
  { name: "Checkbox", built: true },
  { name: "Input", built: true },
  { name: "Label", built: true },
  { name: "Separator", built: true },
  { name: "Skeleton", built: false },
  { name: "Alert", built: false },
  { name: "Avatar", built: false },
  { name: "Textarea", built: false },
  { name: "Radio", built: false },
  { name: "Switch", built: false },
  { name: "Tooltip", built: false },
  { name: "Popover", built: false },
  { name: "DropdownMenu", built: false },
  { name: "Select", built: false },
  { name: "Dialog", built: false },
  { name: "Tabs", built: false },
  { name: "Accordion", built: false },
  { name: "Slider", built: false },
];

/** Section 7 — the honest inventory, occupying the closing slot instead of a
 * CTA. `flex-wrap` is what lets the 21 badges wrap at 375px per §1.12's
 * responsive table. */
export function WhatExists() {
  return (
    <section className={SECTION}>
      <SectionChrome kicker="What exists" heading="7 of 21, named" />
      <div className="flex flex-wrap gap-3">
        {COMPONENTS.map((c) => (
          <Badge key={c.name} variant={c.built ? "default" : "ghost"}>
            {c.name} — {c.built ? "built" : "not built yet"}
          </Badge>
        ))}
      </div>
    </section>
  );
}

/** Licence and repository, nothing else — no CTA, no waitlist, no install
 * command, no playground link (§1.0). */
export function LandingFooter() {
  return (
    <footer className={SECTION}>
      <Separator className="mb-6" />
      <p className="font-body text-hc-ink-soft text-sm">
        MIT licensed.{" "}
        <a
          href="https://github.com/Atharv-110/handicraftui"
          className="text-hc-ink underline underline-offset-2"
        >
          github.com/Atharv-110/handicraftui
        </a>
      </p>
    </footer>
  );
}
