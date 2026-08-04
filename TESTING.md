# Testing Handicraft UI

Run these in order. Each step assumes the previous one passed — later steps are
much harder to interpret if an earlier one is red.

Covers Badge, Button, Card, Checkbox, Input, Label and Separator, plus the
engine, marks and both render tiers. Steps 8–10 are manual for now.

---

## 0. Install and build once

```bash
corepack enable pnpm          # only needed once per machine
pnpm install
pnpm --filter @handicraft/core build
```

**The playground consumes `@handicraft/core` as a built package, not as source.**
After any core rebuild you must restart the dev server and clear its cache:

```bash
lsof -ti:4321 | xargs kill -9
rm -rf apps/playground/.next-dev
```

`next dev` writes to `.next-dev` and `next build` writes to `.next`, so a
repository-root `pnpm build` cannot replace a running dev server's chunks. The
dev cache is the one to clear here.

Skip this and Next serves the previous `dist`. CSS changes hot-reload, so the
page _looks_ updated while the JS is stale — which presents as "tier 2 renders
nothing" rather than as a cache problem. This cost real debugging time once.

---

## 1. Unit and integration tests

```bash
pnpm test
```

Expect **108 passed** across **16 files**. What they guard, in order of how
badly it hurts when they fail. Paths sit under `packages/core/src/` unless the
row says otherwise:

| File                                | Guards against                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `engine/aesthetic.test.ts`          | The look silently regressing — corners getting pinned, roughness dialled back, fill levels collapsing, the seed pool breaking |
| `engine/golden-shapes.test.ts`      | Path data drifting on a shape the change was not aimed at. Five goldens from baseline `e9eda22`, compared byte for byte       |
| `styles/tier-agreement.test.ts`     | Tier 1 and tier 2 drifting apart across the `.ts`/`.css` boundary                                                             |
| `engine/seed.test.ts`               | Seed clustering. React's `useId` emits stride-8 tree positions that collapse onto a few variants without a mixed hash         |
| `engine/marks.test.ts`              | Drawn icons breaking at small sizes or losing determinism                                                                     |
| `engine/generator.test.ts`          | Non-deterministic geometry, cache misses on sub-pixel resize                                                                  |
| `engine/rule-geometry.test.ts`      | The `underline` arm degenerating on a long axis. `drawShape` draws down a vertical separator and across a horizontal one      |
| `frame/measure.test.tsx`            | A frame measuring zero: a transformed ancestor, a detached node flushing over it, or a ref swap losing the subscription       |
| `frame/hydration.test.tsx`          | Server/client markup divergence                                                                                               |
| `frame/tier2.test.tsx`              | rough.js failing to mount; the sketch layer entering layout or the a11y tree                                                  |
| `engine/resize-bus.test.ts`         | The shared `ResizeObserver` batching more than once a frame, or flushing against an element that has left the document        |
| `frame/draw-on.test.tsx`            | Pass ordering, the entrance timeline running out of sequence, and the animation costing anything when off                     |
| `frame/focus-within.test.tsx`       | `data-hc-focus-within` going missing from either tier, which takes the visible focus ring with it                             |
| `registry/tests/badge.test.tsx`     | Badge crossing the `k > 0.55` taper gate into corner pooling, or a variant's fill level moving off its measured contrast      |
| `registry/tests/separator.test.tsx` | The frame's own pseudo-elements painting through a 2px rule, or a vertical rule resolving to zero height                      |
| `registry/tests/label.test.tsx`     | Label acquiring a frame, an SVG or a dead `peer-` class, and `htmlFor` failing to resolve to its control                      |

**Confirm the suite is load-bearing.** Each mutation below must turn the listed
tests red, then revert cleanly. The counts were measured, not estimated — a
mutation that fails a different number than stated means the suite has drifted:

```bash
# engine/generator.ts — corners get pinned, the original regression
preserveVertices: false   →   true            # 5 tests, 2 files

# engine/seed.ts — geometry stops being deterministic
return POOL_SEEDS[...]    →   Math.floor(Math.random() * 100000)   # 4 tests, 4 files

# styles/handicraft.css — the tiers drift
--hc-stroke-w: 2.4px      →   1.6px           # 1 test
--hc-r-a: 4px …           →   14px …          # 1 test
```

Exactly which tests:

| Mutation           | Turns red                                                                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preserveVertices` | `aesthetic.test.ts` "does not pin the corners", plus `golden-shapes.test.ts` for `rect`, `rect-small`, `rounded` and `pill`                                                                                                   |
| `POOL_SEEDS`       | `seed.test.ts` "is deterministic" and "bounds distinct geometries by the pool size", `generator.test.ts` "derives a usable seed from a React id", `tier2.test.tsx` "renders identical geometry across two independent mounts" |
| `--hc-stroke-w`    | `tier-agreement.test.ts` "uses the same stroke weight"                                                                                                                                                                        |
| `--hc-r-a`         | `tier-agreement.test.ts` "keeps tier-1 corners near-square to match tier 2's sharp rect"                                                                                                                                      |

Two details worth knowing, because both look like bugs and are not:

- **`circle` survives the `preserveVertices` mutation** while the other four
  goldens fail. A circle path has no polygon vertices to pin, so the flag has
  nothing to act on. Four of five failing is correct.
- **`golden-shapes.test.ts` survives the seed mutation.** It calls
  `generateSketch` with an explicit `seed: 42` rather than deriving one from an
  id, so it never reaches `seedFrom`. Only geometry mutations reach it.

If a mutation stays green entirely, something is wrong with the setup.

---

## 2. Typecheck everything

```bash
pnpm typecheck
pnpm lint
pnpm exec tsc --noEmit -p registry/tsconfig.json
```

The last one matters most: registry components are typechecked against
`packages/core/src`, so a breaking API change fails here rather than in
someone's project after they run `shadcn add`.

---

## 3. Start the playground

```bash
pnpm --filter @handicraft/playground dev
```

<http://localhost:4321>. Every control is URL-addressable, so you can deep-link
a state and Playwright can pin one later:

| URL                                     | State                                                    |
| --------------------------------------- | -------------------------------------------------------- |
| `/`                                     | tier 2 (rough.js), natural hand, `fill=med`, layered ink |
| `?fidelity=lite`                        | tier 1 — CSS only, no JS                                 |
| `?hand=steady\|natural\|loose\|hurried` | drawing personality                                      |
| `?fill=no\|low\|med\|high`              | page-wide texture ceiling                                |
| `?ink=plain`                            | drop the under-drawing and pen marks                     |
| `?drawOn=1`                             | entrance animation                                       |
| `?drawOn=1&drawMs=2500`                 | slower entrance (default 1100ms, slider in the toolbar)  |
| `?dark=1`                               | blackboard theme                                         |
| `?texture=0`                            | turbulence off                                           |
| `?stress=1`                             | 500 frames, for the perf check                           |

The readout under the controls reports settle time, frame count and path count.

---

## 4. Confirm what is actually server-rendered

```bash
curl -s http://localhost:4321/ | grep -o 'class="hc-frame' | wc -l          # note it
curl -s http://localhost:4321/ | grep -o 'data-hc-seed="[0-9]"' | sort | uniq -c
curl -s http://localhost:4321/ | grep -c "hc-sketch-svg"                    # 0
```

The first number is whatever the harness renders today. It moves every time a
component is added, so it is not written down here; step 6 compares against it.
The second should spread across the seed buckets rather than piling onto one or
two.

The last one is the point: **the server sends no geometry even though tier 2 is
the default.** rough.js needs a measured element and a server has no layout
engine. What ships is `class="hc-frame" data-hc-seed="6" data-hc-fill="low"`,
which the stylesheet turns into a complete drawn frame. Tier 2 upgrades it after
mount.

---

## 5. No-JavaScript check

DevTools → Command palette → **Disable JavaScript** → reload.

Every component must stay fully framed, with hachure. This is the whole argument
for tier 1 existing.

Note: Chrome's `--disable-javascript` flag is ignored in recent headless builds,
and `--dump-dom` returns nothing with scripting off. To check this from a
script, strip the scripts out of the real SSR HTML instead:

```bash
curl -s http://localhost:4321/ \
  | perl -0pe 's|<script\b.*?</script>||gs; s|<head>|<head><base href="http://localhost:4321/">|' \
  > /tmp/nojs.html
```

---

## 6. The tier handover

Reload `/` a few times and watch the frames. Tier 1 paints first and tier 2
replaces it, so any visible difference becomes a flash on **every** page load.

It should not announce itself. The two tiers deliberately agree on stroke weight
(2.4px), near-square corners and hachure density; `tier-agreement.test.ts` keeps
them that way. Compare directly:

```
/?fidelity=lite    vs    /?fidelity=high
```

To measure how fast the handover completes:

```bash
for t in 60 150 400; do
  echo -n "${t}ms: "
  google-chrome --headless --disable-gpu --virtual-time-budget=$t \
    --dump-dom http://localhost:4321/ 2>/dev/null \
    | grep -c 'data-hc-fidelity="high"'
done
```

The count at 60ms should already match step 4's frame count — the provider
preloads rough.js and components generate synchronously in `useLayoutEffect`.

---

## 7. Keyboard and focus

Tab through the page. Every interactive element needs a visible focus ring that
follows the wobbly corner radius. Check both themes: the ring uses a dedicated
`--hc-focus` token precisely so it clears 3:1 against paper _and_ ink, which
neither accent colour does.

Press and hold a button — it should shift onto its own shadow, like a pen being
pressed down. `<Button rescribble>` additionally redraws its geometry on hover
and press.

---

## 8. Degraded modes — not automated yet

**Forced colors.** DevTools → Rendering → _Emulate CSS forced-colors: active_.
Both stroke layers must vanish, replaced by a single plain system-coloured
border. Two near-identical borders a fraction of a degree apart is noise in this
mode, not charm.

**Print.** Cmd-P. Second stroke pass, SVG, offset shadows and paper textures all
drop out.

**Reduced motion.** DevTools → Rendering → _prefers-reduced-motion: reduce_, then
load `?drawOn=1`. Frames must appear **immediately and fully** — the dash is
reset along with the animation, so a partial reset would leave them invisible
rather than merely unanimated.

---

## 9. Performance

`?stress=1` adds 500 buttons. The readout reports settle time, frame count and
path count.

Read the settle time with the instrument's floor in mind. The readout polls on a
16ms timer and waits for three consecutive stable counts, so **it cannot report
anything below 64ms** — four ticks. A stress run and a default run both reading
64ms means both settled at or under that floor, not that they took the same
measured time.

The number that carries the argument is generation, measured on its own: 500
components cost **1.6ms** from the 12-seed pool and **110ms** with unique seeds,
roughly seven dropped frames. Under `?stress=1`, 500 same-size buttons share 12
cached geometries.

Also worth profiling a window resize, which the readout does not cover: confirm
the shared `ResizeObserver` still batches to one flush per frame under load.

---

## 10. Real consumer install — after the docs site is deployed

`pnpm registry:build` already emits valid items to `registry/public/r/`. The
end-to-end check needs them served:

```bash
npx create-next-app@latest /tmp/hc-consumer --ts --tailwind --app
cd /tmp/hc-consumer
npx shadcn@latest add http://localhost:3000/r/button.json
pnpm build
```

This is the only check that exercises what users actually do.

---

## Known gaps

- **Pixel parity between tiers is not machine-verified.** jsdom proves the DOM
  contract and the constants are guarded by `tier-agreement.test.ts`, but
  neither measures. Real `getBoundingClientRect()` comparison needs Playwright.
- **Excalifont is not self-hosted.** The playground loads Kalam (OFL) via
  `next/font` as a stand-in. Without a real hand face the stack falls through to
  the generic `cursive` keyword, which macOS renders as a formal serif italic.
- **No axe run yet**, so accessibility rests on the contract in the CSS rather
  than on a tool.
- **The library is 7 components of 21.** Four of the remaining 14 are plain
  semantics and ten are built on Base UI. Neither group is blocked on the engine
  — `SketchMark`, the drawn-mark primitive, is built.
