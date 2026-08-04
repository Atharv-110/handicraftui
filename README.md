# Handicraft UI

Hand-drawn React components. Real sketched geometry, not a rounded border and a wobble filter.

> **Pre-release.** Of a planned 21 components, 7 exist and 14 do not. `@handicraft/core` is version
> 0.0.0 and unpublished, the registry is not hosted, and there is no docs site — so there is no
> install command that works today, and this file does not invent one. Everything below is what runs
> in this repository right now.

## What it is

A component library in the spirit of [roughViz](https://www.jwilber.me/roughviz/), but for general UI
rather than charts. Components are distributed shadcn-style: the source is copied into your project
and you own it, comments included.

Rendering runs in two tiers. Tier 1 is pure CSS — a doubled pseudo-element border, an SVG turbulence
filter and gradient hachure. Tier 2 generates real geometry with [rough.js](https://roughjs.com) and
draws it as SVG paths. Tier 2 is the default; tier 1 is the pre-hydration paint, the no-JavaScript
fallback, and the opt-out for very large lists.

The two tiers deliberately share stroke weight, corner radii and hachure density, because tier 1 paints
before every hydration and the handover has to pass unnoticed. A DOM `MutationObserver` times it from
document start: 33.6ms in light mode and 34.3ms on the blackboard, the worse of the two, each a median of
3 warm reloads under `next build && next start` with Fast 4G throttling, measured on 2026-08-04 by
`pnpm test:e2e:perf`. The budget, under the same conditions, is 110ms.

This file used to say 71ms, and **nothing got faster — the instrument changed.** That figure came from
the playground's on-page readout, which polls every 16ms and reports only after three consecutive stable
counts, so 64ms is the lowest number it can print; it was reading its own floor. The `MutationObserver`
has no floor, so the two figures measure different things and are not comparable.

## The API as it stands

This runs today in `apps/playground`. It is not installable yet.

```tsx
<HandicraftProvider hand="natural" ink="layered" fill="med">
  <Card ruled>
    <CardHeader>
      <CardTitle>Field notes</CardTitle>
    </CardHeader>
    <CardContent>
      <Label htmlFor="place">Where were you?</Label>
      <Input id="place" placeholder="Second bench, north side" />
      <Checkbox label="Draft" />
    </CardContent>
    <CardFooter>
      <Badge variant="marked">New</Badge>
      <Button variant="primary" rescribble>
        Save
      </Button>
    </CardFooter>
  </Card>
</HandicraftProvider>
```

`hand` is a drawing personality — `steady`, `natural`, `loose` or `hurried`. Each preset shifts
roughness, bowing and stroke weight together, the way a different person with a different pen would, so
changing it visibly redraws the whole page.

`fill` is a ceiling, not a default. A component declares how much hachure its own surface can carry and
gets the lower of the two, so `fill="no"` flattens an entire page while a `Card` that has decided its
paragraphs need to stay readable is never forced denser.

## Four things that turned out to matter

- **Corner overshoot is the single biggest hand-drawn signal.** rough.js pins corners by default; this
  engine deliberately does not, so strokes run past the corner the way a pen does. Pinning them back is
  the one change that trades the whole aesthetic for a layout convenience — it happened once here, and
  the components shipped looking like rounded rectangles with a slightly doubled border.

- **Parameters have to taper with element size.** Wobble amplitude is an absolute pixel count, so
  settings tuned on a 190×52 button turn a 20×20 checkbox into an unreadable blob. The taper is applied
  centrally, so no component has to remember it.

- **Geometry comes from a fixed 12-seed pool.** 500 components generate in 1.6ms this way and 110ms
  without — roughly seven dropped frames. It is a viability requirement, not an optimisation.

- **Dark mode is a blackboard, not an inverted theme.** Chalk on slate: a wide faint dust pass under a
  softer stroke, and a wider hachure gap. A straight colour inversion reads as dark-mode UI rather than
  as chalk.

## What exists

| Component   | What it does that a plain one does not                                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Badge`     | Four variants. Colour is emphasis, never the signal — the meaning is in the text, so a badge still reads correctly with the fill invisible.                 |
| `Button`    | Four variants. `primary` carries its emphasis as highlighter hachure instead of a flat fill; `rescribble` redraws the frame on hover and press.             |
| `Card`      | `ruled` draws the exercise-book margin rule down the left edge. Fill is capped at `low`: measured against body copy, denser hachure costs legibility.       |
| `Checkbox`  | Keeps a real `<input type="checkbox">` in the DOM under the drawn box. The tick is a `SketchMark`, sharing the box's seed, hand and size taper.             |
| `Input`     | No fill, ever. A text field is the one surface where the reader's own content has to stay perfectly legible, and hachure behind a value is the wrong trade. |
| `Label`     | Draws nothing. It imports `cn` and no engine code, because a label that framed itself would compete with the field under it.                                |
| `Separator` | A `<div role="separator">`, not an `<hr>`: a void element cannot hold the sketch layer. `decorative` takes the rule out of the accessibility tree.          |

**Not built yet — 14.** Avatar, Alert, Skeleton and Textarea are plain semantics. Radio, Switch,
Select, Slider, Tabs, Accordion, Dialog, Popover, Tooltip and DropdownMenu are built on Base UI. No
charts in v1 — the engine stays chart-agnostic so a chart layer can reuse it later.

## How it is verified

The unit suite is 127 tests across 18 files, run in jsdom. Every one of them is mutation-verified: break
the invariant it guards, confirm the named test fails and nothing unrelated goes with it, revert, confirm
green again, and check the revert with `git diff` rather than assuming it landed — prettier reformatting a
mutated value has silently defeated a revert here before. A test that cannot fail is decoration.

A second suite of 64 Playwright tests across 5 spec files drives a real browser against
`next build && next start`: exact `getBoundingClientRect()` and `scrollHeight` parity between the tiers,
the degraded modes (no JavaScript, forced colours, reduced motion, print), axe on four pages with zero
critical violations, and an overflow sweep at 375, 768, 1280 and 1920px. Those four spec files — 59 of
the 64 — run on every pull request. The handover and stress timings are the fifth, and run nightly and on
demand, because a shared CI runner is not the condition their budgets are stated under.

The look is under test the same way the logic is. Corner overshoot is measured as the distance from each
nominal corner to the nearest point the pen visits: 0.6 to 2.0px when corners run free, exactly 0.00
when they are pinned. Bounding box would assert the opposite of the intent, since pinned vertices still
leave edges free to bow.

The gates, run from the repository root:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm registry:build
pnpm format:check
```

## Not done yet

Beyond the components that are not built:

- **Nothing is published.** `@handicraft/core` is 0.0.0 and the registry is not hosted, so no
  `shadcn add` URL resolves.
- **No docs site.**
- **Ink parity between the tiers is not measured.** Layout parity is: `tier-parity.spec.ts` asserts exact
  `getBoundingClientRect()` and `scrollHeight` equality between tier 1 and tier 2, no tolerance. Whether
  the two strokes look alike enough that the swap does not announce itself is still an eyeball check. A
  pixel diff cannot answer it, because `preserveVertices: false` lets tier 2's stroke wander up to
  13.81px past the box tier 1 draws at.
- **The handwriting face is not self-hosted.** The playground borrows Kalam through `next/font`.

## Local development

```bash
corepack enable pnpm
pnpm install
pnpm --filter @handicraft/core build
pnpm --filter @handicraft/playground dev   # http://localhost:4321
```

The playground is the harness for every visual change, and its state lives in the URL:

```
?fidelity=lite|high  &dark=1  &texture=0  &stress=1
&hand=steady|natural|loose|hurried  &ink=plain|layered
&fill=no|low|med|high  &drawOn=1  &drawMs=<n>
```

One trap will otherwise cost you an hour: the playground consumes `@handicraft/core` as built `dist`,
not as source. Rebuilding core under a running dev server leaves the server on the old JavaScript, and
because CSS hot-reloads while JS does not, it presents as "tier 2 renders nothing" rather than as a
cache problem. Full walkthrough in [TESTING.md](TESTING.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. It covers the setup trap above, the gates, and the
standard a change has to meet — including what gets a patch sent back. Contributions are accepted under
the Developer Certificate of Origin; sign commits with `git commit -s`.

## Licence

Code is [MIT](LICENSE).

The **Handicraft UI** name, wordmark and logo are not covered by that licence — see
[TRADEMARK.md](TRADEMARK.md). Forking is welcome and MIT permits it; give your fork its own name.
