import type { ReactNode } from "react";
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
 *
 * FB-2, cycle 012 architect verdict §9.3 (F-5). The description used to sit
 * inside `CardHeader`, on the Card's own `low` hachure — 14px `font-body`
 * squarely inside `DESIGN-SYSTEM.md` §2's 0.7-1.6 interference band (the
 * table reads 1.75 at 30px, which is why a boxed heading is legal and this
 * was not). It now renders before the `Card`, on bare paper. Zero frame
 * change: `CardDescription` carries no `useSketchFrame` call either way.
 */
export function ComposedForm() {
  return (
    <div>
      <CardDescription className="mb-3">
        The same seven components, doing an actual job.
      </CardDescription>
      <Card>
        <CardHeader>
          <CardTitle>Add a project</CardTitle>
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
    </div>
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
 *
 * FB-2, cycle 012 architect verdict §9.3 (F-5). The five 14px labels used to
 * sit inside the `Card` beside their values, on the same `low` hachure the
 * `ComposedForm` fix above names. Values stay in the `Card` — `displayLg`
 * 30px, hand-bold, at the interference table's own boundary — and the
 * labels now render in their own row beneath it, on bare paper. The `Card`
 * still holds exactly what it held before (itself, four vertical
 * `Separator`s, one `Badge`): zero frame change, only where the label text
 * sits in the DOM.
 *
 * F-9, QA iteration 2, cycle 012 §10.3. The FB-2 fix above moved the labels
 * off the hachure but left them paired by ordinal position across two rows
 * that never aligned — measured at 344px apart vertically at 375px, and at
 * horizontally different x-offsets at 1280px, since each row sized its own
 * flex-wrap columns from its own content. `FIGURE_COLS` is one grid
 * template, applied as the same literal string to both rows rather than
 * letting each size independently. The four gap tracks are a fixed `2px`,
 * not `auto` — an explicit length track reserves the same width whether a
 * real `Separator` sits in it (the value row) or nothing does (the label
 * row), which is what makes the two rows' column edges identical rather
 * than approximately close. Labels carry an explicit `gridColumn` (their
 * row has no separators to auto-place around); values rely on DOM order
 * matching the nine tracks one-for-one. Same four `Separator`s, same one
 * `Badge`, same one `Card` — zero frame change again.
 */
// `minmax(0,1fr)`, not bare `1fr` — a bare `1fr` track carries an implicit
// `auto` (min-content) floor, so at narrow widths the longest label
// ("500 frames, from the pool (110ms without)") forces its own column wider
// than a plain fifth of the row, and the value row's short text never hits
// that floor. The two grids then compute different column widths even
// though at 1280px, with room to spare, they looked identical.
// `minmax(0, 1fr)` removes the floor so every column is a pure fraction of
// the fixed available space, independent of what text sits inside it.
//
// F-10, QA iteration 3, cycle 012 §11.3. `[H]`. The five-column layout
// below is `sm:`-only. `getBoundingClientRect`/`clientWidth` on the track
// reported clean at every width, including 375px — the finding is that the
// glyphs, not the boxes, do not fit: `text-3xl` hand-bold needs up to 95px
// ("34.3ms") against a 375px track stride of 61px, and three values
// overprinted each other by 10 to 34px, unreadable in a screenshot even
// though every mechanical check (overflow, box alignment) read green. Below
// `sm` the value grid and label grid both collapse to one column — the
// same breakpoint the four `Separator`s already gate on, so this follows a
// line the layout draws already rather than inventing a second one. Each
// figure gets its own full-width row at both mobile widths this was
// measured at (375, 640-adjacent), with no glyph competing for horizontal
// space, and the reading order is value-block-then-label-block exactly as
// it was after the F-9 fix, before the five-column grid existed — a Medium
// pairing cost iteration 2 already accepted at that width, never an H.
const FIGURE_COLS =
  "grid grid-cols-1 gap-y-3 sm:grid-cols-[minmax(0,1fr)_2px_minmax(0,1fr)_2px_minmax(0,1fr)_2px_minmax(0,1fr)_2px_minmax(0,1fr)] sm:gap-x-3";

export function TheNumbers() {
  return (
    <section className={`${SECTION} hc-ruled`}>
      <SectionChrome kicker="The numbers" heading="Measured, not adjectived" />
      <Card>
        <div className={`${FIGURE_COLS} sm:gap-y-4`}>
          <FigureValue>12</FigureValue>
          <Separator orientation="vertical" className="hidden sm:block" />
          <FigureValue>1.6ms</FigureValue>
          <Separator orientation="vertical" className="hidden sm:block" />
          <div>
            <FigureValue>34.3ms</FigureValue>
            <Badge variant="marked" className="mt-2">
              budget: 110ms
            </Badge>
          </div>
          <Separator orientation="vertical" className="hidden sm:block" />
          <FigureValue>13.81px</FigureValue>
          <Separator orientation="vertical" className="hidden sm:block" />
          <FigureValue>44px</FigureValue>
        </div>
      </Card>
      {/* `px-6` matches `Card`'s own `p-6` horizontal inset exactly at
          `sm:` and above — without it this row's grid spans the section's
          full content width while the value row's grid spans that width
          minus Card's 48px of padding, and two grids of different overall
          widths do not produce equal column edges even with an identical
          template. Harmless at the single-column mobile layout, where each
          row is already full width and centred. */}
      <div className={`mt-3 ${FIGURE_COLS} px-6`}>
        <FigureLabel className="sm:col-start-1">seeds in the pool</FigureLabel>
        <FigureLabel className="sm:col-start-3">
          500 frames, from the pool (110ms without)
        </FigureLabel>
        <FigureLabel className="sm:col-start-5">handover</FigureLabel>
        <FigureLabel className="sm:col-start-7">worst-case stroke excursion</FigureLabel>
        <FigureLabel className="sm:col-start-9">minimum touch target</FigureLabel>
      </div>
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

function FigureValue({ children }: { children: ReactNode }) {
  return <p className="font-hand font-bold text-hc-ink text-center text-3xl">{children}</p>;
}

/** `col-start-N` (`sm:`-only, passed in per call site as a literal class so
 * Tailwind's source scan can see it) is what places each label onto the
 * same track its value occupies once the grid is no longer one column. */
function FigureLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-body text-hc-ink-soft text-center text-sm ${className ?? ""}`}>
      {children}
    </p>
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

/**
 * Licence and repository, nothing else — no CTA, no waitlist, no install
 * command, no playground link (§1.0).
 *
 * FB-3, cycle 012 architect verdict §9.3 (F-2). The repository link used to
 * sit inline in a sentence ("MIT licensed. github.com/…") and measured
 * 16.5px tall — the WCAG 2.5.8 Inline exception covers a link's size being
 * constrained by surrounding line-height, but a footer link list is
 * navigation, not a sentence, so the house 44px rule binds. Rendered as a
 * list now; the link itself carries `inline-flex items-center min-h-11`,
 * which decodes to 44px and is clean on `SIZE_PX`. No new frame — `ul`,
 * `li` and `a` are plain elements.
 */
export function LandingFooter() {
  return (
    <footer className={SECTION}>
      <Separator className="mb-6" />
      <ul className="flex flex-wrap items-center gap-6">
        <li className="font-body text-hc-ink-soft text-sm">MIT licensed.</li>
        <li>
          <a
            href="https://github.com/Atharv-110/handicraftui"
            className="font-body text-hc-ink inline-flex min-h-11 items-center text-sm underline underline-offset-2"
          >
            github.com/Atharv-110/handicraftui
          </a>
        </li>
      </ul>
    </footer>
  );
}
