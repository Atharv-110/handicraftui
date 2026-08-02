# Handicraft UI

Hand-drawn React components. Real sketched geometry, not a rounded border and a wobble filter.

> **Pre-release.** Four components exist of a planned twenty-one. Nothing is published to npm yet and
> the registry is not hosted, so there is no install command that works today. Watch the repo if you
> want to know when there is.

## What it is

A component library in the spirit of [roughViz](https://www.jwilber.me/roughviz/), but for general UI
rather than charts. Components are distributed shadcn-style: the source is copied into your project
and you own it.

Rendering runs in two tiers. Tier 1 is pure CSS — a doubled pseudo-element border, an SVG turbulence
filter and gradient hachure. Tier 2 generates real geometry with [rough.js](https://roughjs.com) and
draws it as SVG paths. Tier 2 is the default; tier 1 is the pre-hydration paint, the no-JavaScript
fallback, and the opt-out for very large lists.

A few things that turned out to matter more than expected:

- **Corner overshoot is the single biggest hand-drawn signal.** rough.js pins corners by default; the
  engine deliberately does not, so strokes run past the corner the way a pen does.
- **Parameters have to taper with element size.** Settings tuned on a 190×52 button turn a 20×20
  checkbox into an unreadable blob, because wobble amplitude is an absolute pixel count. The taper is
  applied centrally so no component has to remember.
- **Geometry is drawn from a fixed 12-seed pool.** Five hundred components generate in 1.6ms this way
  and 110ms without — roughly seven dropped frames. It is a viability requirement, not an optimisation.
- **Dark mode is a blackboard, not an inverted theme.** Chalk on slate, with a faint dust pass under a
  softer stroke.

## Status

|            |                                         |
| ---------- | --------------------------------------- |
| Components | 4 of 21 — button, card, checkbox, input |
| Tests      | 64, across 8 files                      |
| Published  | not yet                                 |
| Docs site  | not yet                                 |

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

Full walkthrough in [TESTING.md](TESTING.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first — it covers the setup trap that will otherwise cost you
an hour, the five gates, and the standard a change has to meet. Contributions are accepted under the
Developer Certificate of Origin; sign commits with `git commit -s`.

## Licence

Code is [MIT](LICENSE).

The **Handicraft UI** name, wordmark and logo are not covered by that licence — see
[TRADEMARK.md](TRADEMARK.md). Forking is welcome and MIT permits it; give your fork its own name.

---

_This README is a placeholder pending a proper pass._
