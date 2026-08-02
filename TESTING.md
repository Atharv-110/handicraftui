# Testing Handcraft UI

Run these in order. Each step assumes the previous one passed — later steps are
much harder to interpret if an earlier one is red.

Covers Button, Card, Input and Checkbox, plus the engine, marks and both render
tiers. Steps 8–10 are manual for now.

---

## 0. Install and build once

```bash
corepack enable pnpm          # only needed once per machine
pnpm install
pnpm --filter @handcraft/core build
```

**The playground consumes `@handcraft/core` as a built package, not as source.**
After any core rebuild you must restart the dev server and clear its cache:

```bash
lsof -ti:4321 | xargs kill -9
rm -rf apps/playground/.next
```

Skip this and Next serves the previous `dist`. CSS changes hot-reload, so the
page *looks* updated while the JS is stale — which presents as "tier 2 renders
nothing" rather than as a cache problem. This cost real debugging time once.

---

## 1. Unit and integration tests

```bash
pnpm test
```

Expect **62 passed**. What they guard, in order of how badly it hurts when they
fail:

| File | Guards against |
|---|---|
| `engine/aesthetic.test.ts` | The look silently regressing — corners getting pinned, roughness dialled back, fill levels collapsing, the seed pool breaking |
| `styles/tier-agreement.test.ts` | Tier 1 and tier 2 drifting apart across the `.ts`/`.css` boundary |
| `engine/seed.test.ts` | Seed clustering. React's `useId` emits stride-8 tree positions that collapse onto a few variants without a mixed hash |
| `engine/marks.test.ts` | Drawn icons breaking at small sizes or losing determinism |
| `engine/generator.test.ts` | Non-deterministic geometry, cache misses on sub-pixel resize |
| `frame/hydration.test.tsx` | Server/client markup divergence |
| `frame/tier2.test.tsx` | rough.js failing to mount; the sketch layer entering layout or the a11y tree |
| `frame/draw-on.test.tsx` | Pass ordering, the entrance timeline running out of sequence, and the animation costing anything when off |

**Confirm the suite is load-bearing.** Each of these should fail exactly one
test, then revert:

```bash
# engine/generator.ts — corners get pinned, the original regression
preserveVertices: false   →   true            # fails "does not pin the corners"

# engine/seed.ts — geometry stops being deterministic
return POOL_SEEDS[...]    →   Math.floor(Math.random() * 1000) + 1

# styles/handcraft.css — the tiers drift
--hc-stroke-w: 2.4px      →   1.6px           # fails "uses the same stroke weight"
--hc-r-a: 4px …           →   14px …          # fails "keeps tier-1 corners near-square"
```

If any of those stays green, something is wrong with the setup.

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
pnpm --filter @handcraft/playground dev
```

<http://localhost:4321>. Every control is URL-addressable, so you can deep-link
a state and Playwright can pin one later:

| URL | State |
|---|---|
| `/` | tier 2 (rough.js), natural hand, `fill=med`, layered ink |
| `?fidelity=lite` | tier 1 — CSS only, no JS |
| `?hand=steady\|natural\|loose\|hurried` | drawing personality |
| `?fill=no\|low\|med\|high` | page-wide texture ceiling |
| `?ink=plain` | drop the under-drawing and pen marks |
| `?drawOn=1` | entrance animation |
| `?drawOn=1&drawMs=2500` | slower entrance (default 1100ms, slider in the toolbar) |
| `?dark=1` | blackboard theme |
| `?texture=0` | turbulence off |
| `?stress=1` | 500 frames, for the perf check |

The readout under the controls reports settle time, frame count and path count.

---

## 4. Confirm what is actually server-rendered

```bash
curl -s http://localhost:4321/ | grep -o 'class="hc-frame' | wc -l          # 18
curl -s http://localhost:4321/ | grep -o 'data-hc-seed="[0-9]"' | sort | uniq -c
curl -s http://localhost:4321/ | grep -c "hc-sketch-svg"                    # 0
```

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

All 18 frames should already be on tier 2 by 60ms — the provider preloads
rough.js and components generate synchronously in `useLayoutEffect`.

---

## 7. Keyboard and focus

Tab through the page. Every interactive element needs a visible focus ring that
follows the wobbly corner radius. Check both themes: the ring uses a dedicated
`--hc-focus` token precisely so it clears 3:1 against paper *and* ink, which
neither accent colour does.

Press and hold a button — it should shift onto its own shadow, like a pen being
pressed down. `<Button rescribble>` additionally redraws its geometry on hover
and press.

---

## 8. Degraded modes — not automated yet

**Forced colors.** DevTools → Rendering → *Emulate CSS forced-colors: active*.
Both stroke layers must vanish, replaced by a single plain system-coloured
border. Two near-identical borders a fraction of a degree apart is noise in this
mode, not charm.

**Print.** Cmd-P. Second stroke pass, SVG, offset shadows and paper textures all
drop out.

**Reduced motion.** DevTools → Rendering → *prefers-reduced-motion: reduce*, then
load `?drawOn=1`. Frames must appear **immediately and fully** — the dash is
reset along with the animation, so a partial reset would leave them invisible
rather than merely unanimated.

---

## 9. Performance

`?stress=1` renders 500 frames. The readout reports settle time.

Measured: **518 frames settle in 64ms — the same as 18 frames.** That is the
seed pool working; 500 same-size buttons share 12 cached geometries. Without it,
500 unique seeds cost ~110ms of generation, roughly seven dropped frames.

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
- Four components. The other sixteen are Phase 2, and they depend on
  `SketchMark`, which is already built.
