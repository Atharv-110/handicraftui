# Handicraft UI — QA Contract

What "verified" means here. Read by `hc-architect` (writes the QA plan) and `hc-qa` (executes it).
Caveman `lite`.

Core stance: **a claim is not verified until it has been independently reproduced.** Not by reading
code, not by trusting a report.

---

## Definition of Done — permanent floor

The architect adds per-cycle criteria on top. Nothing ships below this line.

- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm registry:build` all green,
      **re-run by QA, never read from the dev manifest**
- [ ] Every new behaviour has a test; every new test is mutation-verified **and the revert is verified**
- [ ] Renders correctly at **375 / 768 / 1280 / 1920**, no horizontal overflow at any width
- [ ] 44px minimum touch target on interactive elements
- [ ] Keyboard reachable, focus visible, axe reports zero criticals
- [ ] Correct at `fidelity=lite` **and** `fidelity=high`, no visible flash at handover
- [ ] Correct in blackboard dark mode
- [ ] Registry item builds and its derived `dependencies` are correct
- [ ] Shipped comments follow `CODE-CONTRACT.md`'s why-not-what style, not the internal register
- [ ] Every visual claim verified in a browser, not asserted from code

---

## Rule V1 — never trust the manifest

`hc-dev` reports gate results. **Re-run all five yourself.** A dev agent claiming green is the single
most likely false report in this system, and every downstream check inherits the error.

---

## Mutation testing

The house standard. A test that cannot fail is decoration.

For every new assertion:

1. Note the file's exact current state.
2. Break the invariant the test guards.
3. Run the suite. Confirm **that test fails, and only that test**. A mutation that fails five tests
   means the assertion is not isolating what it claims to.
4. Revert.
5. **Verify the revert** — re-run the suite *and* `git diff` the file. Clean diff, green suite.

### A filter that matches nothing still exits 0

`pnpm test -- -t "<name>"` filters correctly — that part works. But a name matching **no test** reports
`85 skipped`, `Tasks: 2 successful`, and **exit code 0**.

So a mutation run whose filter has a typo, or whose test was renamed, reports success having executed
nothing at all. It is the precise failure mutation testing exists to catch, wearing a green tick.

**Never read exit code alone.** Assert a non-zero *passed* count:

```bash
pnpm test -- -t "does not pin the corners" 2>&1 | grep -E 'Tests +[1-9][0-9]* passed'
```

If that grep finds nothing, the filter matched nothing and the mutation proved nothing, whatever the
exit code said.

### Rule V2 — verify the revert, always

This has already failed here. While mutation-testing the draw-on timeline, prettier reformatted the
mutated value from `1.0` to `1`, the `cp` restore was lost against the reformatted file, and a broken
timeline survived into an apparently green run. It was only caught because an exit code disagreed with
a grep.

Never assume a revert worked. `git diff` is now the baseline — that is what the first commit is for.

### Known-good mutations (from `TESTING.md`)

**Each must fail its stated count. Two of the four fail more than one test, and
that is correct** — a mutation crossing a genuine shared invariant *should* light
up every guard that covers it. What matters is that the count is known in advance
and does not change.

Measured 2026-08-03 against 108 tests in 16 files:

| Mutation | Fails | Which |
|---|---|---|
| `preserveVertices: false → true` in `engine/generator.ts` | **5 tests, 2 files** | `aesthetic.test.ts` "does not pin the corners", plus `golden-shapes.test.ts` for `rect`, `rect-small`, `rounded`, `pill` |
| `POOL_SEEDS` return replaced with `Math.random()` in `engine/seed.ts` | **4 tests, 4 files** | `seed.test.ts` ×2, `generator.test.ts` "derives a usable seed from a React id", `tier2.test.tsx` "renders identical geometry across two independent mounts" |
| `--hc-stroke-w: 2.4px → 1.6px` in `styles/handicraft.css` | **1 test** | `tier-agreement.test.ts` "uses the same stroke weight" |
| `--hc-r-a: 4px → 14px` in `styles/handicraft.css` | **1 test** | `tier-agreement.test.ts` "keeps tier-1 corners near-square" |

This table previously read "each must fail exactly one named test", which had
become false and was never noticed, because nobody counts the failures when the
suite goes red as expected. **A stale expectation in a mutation table is
invisible in exactly the way mutation testing exists to prevent.** Re-measure it
whenever a test file is added that covers one of these invariants.

Two results that look like defects and are not. Both were measured:

- **`circle` survives the `preserveVertices` mutation.** A circle path has no
  polygon vertices to pin, so the flag has nothing to act on. Four goldens of
  five is the correct answer, not a gap.
- **`golden-shapes.test.ts` survives the seed mutation.** It passes an explicit
  `seed: 42` to `generateSketch` rather than deriving one from an id, so it never
  reaches `seedFrom`.

The separate rule in "Mutation testing" above — that a *new* assertion's mutation
should isolate that assertion — still stands. It governs tests being written now,
not these four whole-invariant probes.

### Rule V3 — a test can pass for the wrong reason

jsdom has **no `ResizeObserver`** and returns zeroed `getBoundingClientRect`, so tier 2 never activates
unless both are stubbed. `frame/tier2.test.tsx` stubs them; without that the whole tier-2 suite is
decorative.

Any new test asserting tier-2 behaviour must first **prove tier 2 activated** — assert generated paths
exist, not merely that nothing crashed.

Other jsdom specifics:

- `globalThis.IS_REACT_ACT_ENVIRONMENT = true` is set in `vitest.setup.ts`, or React does not guarantee
  effects have flushed.
- `import.meta.url` is not a `file:` URL under jsdom; `fileURLToPath` throws. Read files with
  `resolve(process.cwd(), ...)`.
- The registry glob must stay scoped to `registry/default/**`, or pnpm's symlink at
  `registry/node_modules/@handicraft/core` makes vitest run the core suite a second time.

---

## Rule V4 — pre-flight before any browser work

Mandatory. Skipping it means testing stale code and reporting phantom bugs.

```bash
lsof -ti:4321 | xargs kill -9          # may be empty; that is fine
rm -rf apps/playground/.next-dev
pnpm --filter @handicraft/core build
pnpm --filter @handicraft/playground dev    # background
curl -s http://localhost:4321 > /dev/null  # confirm it actually answers
```

`tsup --clean` briefly deletes `dist`, so the dev server may log
`Failed to read source code from packages/core/dist/index.js` during a rebuild. It recompiles on its
own. Ignore it.

---

## Browser verification

Driven through **chrome-devtools MCP in a visible window**, so the founder can watch what is being
tested. That visibility is a requirement, not a convenience.

### Rule I1 — fallback ladder, announced not silent

If MCP tools do not resolve, state which rung is in use. Never downgrade quietly.

1. MCP inside the QA agent (preferred)
2. MCP driven by the main thread, QA analysing the output
3. Headless Chrome CLI — already proven in this project. **Loses the watch-it-happen property.**

### Viewport matrix

`375 / 768 / 1280 / 1920`. 375 is the iPhone SE floor and is non-negotiable.

At each width assert **no horizontal overflow** mechanically, not by eye:

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

### State matrix per component

`fidelity=lite` and `fidelity=high` × light and blackboard dark. The playground is URL-addressable:

```
?fidelity=lite|high  &dark=1  &texture=0  &stress=1
&hand=steady|natural|loose|hurried  &ink=plain|layered
&fill=no|low|med|high  &drawOn=1  &drawMs=<n>
```

### Also every cycle

- **Keyboard** — tab order sensible, focus visible at every breakpoint, no trap.
- **axe** — zero criticals. **axe has run once, manually**, in cycle 000b: `@axe-core/cli` 4.12.1
  against a version-matched Chrome and chromedriver pair, covering the harness in both themes and the
  spike route. It found real violations, including the `ink-faint` serious findings that
  `DESIGN-SYSTEM.md` now traces to one token doing two jobs.

  What has never happened is **axe in CI, automated, across the matrix.** That is the gap, and it is
  narrower than "no axe run has ever happened", which this file claimed until 2026-08-04.

  **A green axe result never overrides `DESIGN-SYSTEM.md`.** axe samples a flat computed background
  and cannot see a hatch line, so it will pass fill-and-colour combinations that file forbids. That
  is expected behaviour, not a disagreement to resolve, and it is never grounds for relaxing a locked
  ratio. Contrast over a hachure is verified by the computed check in `design-tokens.test.ts`, which
  measures the worst pixel; axe covers everything else.
- **Handover** — reload with the network throttled. If the tier-1 to tier-2 swap announces itself, that
  is a finding.
- **Stress** — `?stress=1` renders 500 frames.

  ### Budgets — production only, conditions attached

  | What | Budget | Conditions |
  |---|---|---|
  | Handover | **110ms** | `next build && next start`, Fast 4G throttled, median of 3 |
  | Stress settle | **300ms** | `next build && next start`, unthrottled, `?stress=1`, median of 3 |

  Both are **1.4× the worst figure observed in cycle 000b**, and that multiplier is stated so the next
  person knows the headroom is deliberate rather than inherited.

  **`next dev` is explicitly unbudgeted, and the dev-to-production ratio is not a constant.** This
  paragraph previously read "roughly 4× production — 270ms handover against 71ms". **That multiplier is
  withdrawn.** It was one pair of numbers under one network condition, recorded without its conditions,
  and it does not generalise. Measured under throttling in cycle 002a the real ratio is **60×**, which
  is not a drift from 4× — it is evidence that the quantity was never a fixed multiple.

  **The mechanism, measured 2026-08-04.** `next dev` serves every file under
  `apps/playground/.next-dev/static/chunks/` with `cache-control: no-store, must-revalidate`. **No
  full-page navigation under `next dev` is ever cache-warm.** Every reload re-fetches the entire
  unminified, eval-source-mapped client bundle. The ratio to production is therefore set by bundle size
  and link speed rather than by compile cost, and it grows every time the bundle grows.

  | Condition | Handover | Against production warm |
  |---|---|---|
  | `next dev`, Fast 4G, cold navigation | 2722.5ms | 60.6× |
  | `next dev`, Fast 4G, warm reload, route already compiled | 2716.1ms | 60.5× |
  | `next dev`, unthrottled | 427.8ms | 9.5× |
  | `next build && next start`, Fast 4G, cold cache | 260.4ms | 5.8× |
  | `next build && next start`, Fast 4G, warm reload, median of 3 | **44.9ms** | 1× |

  Cold and warm under `next dev` differ by `2722.5 - 2716.1 = 6.4ms`, which is **0.2%**. Route
  compilation is not the cost. Any explanation resting on compile time is disproven by that line.

  **Rules that follow.**

  - **Handover is measured on `next build && next start` only.** A throttled `next dev` handover figure
    measures the dev server's transport, not the library. It is not an instrument. Do not report it as a
    handover number and do not compare it to anything.
  - **Stress may be measured under `next dev`, unthrottled.** Settle time is computation-bound and the
    transport is out of the loop once the page has loaded. This is why the stress figure survived the
    same investigation unharmed.
  - **The +15% cycle-over-cycle flag still applies, and only between figures taken under identical
    conditions** — same command, same throttle, same instrument. A change of conditions is not a
    regression. Comparing across conditions is precisely how a 60× transport artifact gets filed as a
    code defect.
  - Never compare any `next dev` figure to the budget table above.

  This paragraph is the second time a number in this section was an artifact rather than a measurement.
  The first was a 60ms budget below the instrument floor. Both survived because they were recorded
  without their conditions. **A figure in this section carries its command, its throttle and its date,
  or it is not recorded.**

  **Never set a budget below ~64ms.** `apps/playground/app/perf-readout.tsx` ticks at 16ms and requires
  three consecutive stable counts, so its earliest possible output is four ticks. That is an instrument
  floor, not a measurement.

  The history is worth keeping, because it is the reason this section is shaped like this. The budgets
  previously read 60ms and 64ms with no conditions recorded. 60ms was **below the instrument floor and
  therefore unreachable**, and 64ms *was* the floor — so both were artifacts rather than measurements,
  and nobody could tell whether a miss meant a regression or a different `NODE_ENV`.

  They were withdrawn rather than raised to match observation, because raising them would have
  laundered a possible regression into the baseline. A budget nobody can reproduce is worse than no
  budget: it fails cycles for unknown reasons and trains people to wave it through. Any future change
  to these numbers records its conditions, or it is not a budget.
- **No-JS** — tier 1 must render complete, hachured frames. Chrome's `--disable-javascript` is ignored
  in recent headless builds and `--dump-dom` returns nothing with scripting off, so the working method
  is to `curl` the SSR HTML and strip the `<script>` tags.

### Rule A2 — one component per browser pass

Four viewports × two tiers × two themes is already sixteen states. Three components in one pass blows
context mid-run and produces a truncated report that looks complete.

---

## Rule R1 — regression blast radius

Components share engine files. If the dev manifest touches any of:

```
packages/core/src/engine/**
packages/core/src/theme/context.tsx
packages/core/src/frame/**
packages/core/src/styles/handicraft.css
```

then **every component listed against that touchpoint in `.claude/state/INDEX.md` is re-verified**, not
just the new one. Non-negotiable. This is what the core-touchpoints section of the index exists for.

Related, Rule R2: stroke weight, corner radii and hachure gaps live in both a `.ts` and a `.css` file
with nothing in the type system connecting them. `styles/tier-agreement.test.ts` guards the drift; a
change updates both sides and that test.

---

## Findings format

Each finding, in the cycle document:

```
[H|M|L] <one-line claim>
  where:  <file:line>
  repro:  <exact steps, or URL + viewport + what to look at>
  expect: <what should happen>
  actual: <what happens>
```

- **H** — breaks the Definition of Done, or ships something visibly wrong.
- **M** — real defect, does not block the floor.
- **L** — polish, or a note for later.

**Rule V5: a finding without a reproduction is auto-rejected.** Repro plus `file:line`, or it is not a
finding. Keeps the loop evidence-based rather than impressionistic.

Also report a benchmark table: gate timings, stress settle time, handover time, and any measurement
the QA plan asked for.

### Rule L2 — disagreement

The architect may mark a finding `REJECTED` with reasoning. If QA re-raises the **identical** finding
afterwards, it auto-escalates to the founder. This blocks the architect from bulldozing a valid
finding and blocks QA from re-raising forever.

---

## Related

`.claude/doctrine/PRINCIPLES.md` · `.claude/doctrine/CODE-CONTRACT.md` · `.claude/state/INDEX.md` · `TESTING.md`
