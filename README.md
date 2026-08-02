# Handicraft UI

Hand-drawn React components. Real sketched geometry, not a rounded border and a wobble filter.

> **Pre-release.** Four components exist of a planned 21. `@handicraft/core` is version 0.0.0 and
> unpublished, the registry is not hosted, and there is no docs site — so there is no install command
> that works today, and this file does not invent one. Everything below is what runs in this
> repository right now.

## What it is

A component library in the spirit of [roughViz](https://www.jwilber.me/roughviz/), but for general UI
rather than charts. Components are distributed shadcn-style: the source is copied into your project
and you own it, comments included.

Rendering runs in two tiers. Tier 1 is pure CSS — a doubled pseudo-element border, an SVG turbulence
filter and gradient hachure. Tier 2 generates real geometry with [rough.js](https://roughjs.com) and
draws it as SVG paths. Tier 2 is the default; tier 1 is the pre-hydration paint, the no-JavaScript
fallback, and the opt-out for very large lists.

The two tiers deliberately share stroke weight, corner radii and hachure density, because tier 1 paints
before every hydration and the handover has to pass unnoticed. Measured in production with Fast 4G
throttling, the handover completes in 71ms.

## The API as it stands

This runs today in `apps/playground`. It is not installable yet.

```tsx
<HandicraftProvider hand="natural" ink="layered" fill="med">
  <Card ruled>
    <CardHeader>
      <CardTitle>Field notes</CardTitle>
    </CardHeader>
    <CardContent>
      <Input placeholder="Where were you?" />
      <Checkbox label="Draft" />
    </CardContent>
    <CardFooter>
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

| Component  | What it does that a plain one does not                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`   | Four variants. `primary` carries its emphasis as highlighter hachure instead of a flat fill; `rescribble` redraws the frame on hover and press.             |
| `Card`     | `ruled` draws the exercise-book margin rule down the left edge. Fill is capped at `low`: measured against body copy, denser hachure costs legibility.       |
| `Checkbox` | Keeps a real `<input type="checkbox">` in the DOM under the drawn box. The tick is a `SketchMark`, sharing the box's seed, hand and size taper.             |
| `Input`    | No fill, ever. A text field is the one surface where the reader's own content has to stay perfectly legible, and hachure behind a value is the wrong trade. |

**Not built yet — 17.** Badge, Avatar, Alert, Skeleton, Separator, Textarea and Label are plain
semantics. Radio, Switch, Select, Slider, Tabs, Accordion, Dialog, Popover, Tooltip and DropdownMenu are
built on Base UI. No charts in v1 — the engine stays chart-agnostic so a chart layer can reuse it later.

## How it is verified

85 tests. Every one of them is mutation-verified: break the invariant it guards, confirm that test and
only that test fails, revert, confirm green again, and check the revert with `git diff` rather than
assuming it landed — prettier reformatting a mutated value has silently defeated a revert here before.
A test that cannot fail is decoration.

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

Beyond the 17 components:

- **Nothing is published.** `@handicraft/core` is 0.0.0 and the registry is not hosted, so no
  `shadcn add` URL resolves.
- **No docs site.**
- **Pixel parity between the tiers has never been measured.** It is designed for and guarded by shared
  constants read out of the stylesheet, but the visual comparison needs Playwright and has not been run.
- **No axe audit has been run yet.** Components are built to native semantics and the contribution floor
  requires zero critical violations; the first audit is still ahead.
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
