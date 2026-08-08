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

## Rule V1b — a cached task must hash everything it reads

Rule V1 says never trust the dev manifest. This one says the build tool can produce the same false
green, and re-running the gate does not catch it, because the gate never runs.

**This rule supersedes Rule V1a**, which required `--force` on any cycle whose manifest touched
`registry/default/**`. Cycle 003a replaced that procedure once `turbo.json` closed the gap
structurally. Any document written before 2026-08-04 that cites "Rule V1a" means the superseded
procedure, not this rule — the number changed precisely so those citations cannot silently repoint.

Turbo hashes a task's declared inputs. Anything a task reads outside that set can go stale at an
unchanged hash. `turbo.json` carries three overrides that close the escapes found so far, each one
restating a dependency already declared in a config file — `apps/playground/tsconfig.json`'s `@/ui/*`
alias, and `packages/core/vitest.config.ts`'s `include` glob. Cycle 003a added them and proved them: a
one-line edit under `registry/default/**` now fails `label.test.tsx` A16 under a plain warm
`pnpm test`, where it previously replayed `127 passed` in 35ms.

**One escape is open, which is why this rule survives its own fix.**
`packages/core/src/styles/design-tokens.test.ts`'s D7 walks `apps/playground/app` with `readFileSync`
at runtime. Measured 2026-08-04 on turbo 2.10.8: `@handicraft/core#test` hashes **45 inputs, zero
under `apps/playground`**. A warm local `pnpm test` therefore replays green after a
`text-hc-ink-faint` regression in the harness.

Containment, measured rather than assumed. **CI is not exposed** — neither `ci.yml` nor `e2e.yml`
caches `.turbo`; all four `actions/cache@v6` steps cache the pnpm store path alone, so a fresh runner
really executes every task. `pnpm test:e2e` runs `playwright test` directly rather than through turbo,
so it never replays either, and `tests/e2e/a11y.spec.ts`'s A2 asserts zero serious-or-moderate
violations across the three harness pages — which covers 4 of the 6 files D7 walks.
`apps/playground/app/spike-portal/**` is the residue: A1 visits that route but filters to criticals,
and `color-contrast` is serious. The exposure is a warm local cache only.

**The fix is not a fourth glob.** A glob would encode a runtime `readFileSync` as though it were a
config-declared dependency, and that is the one seam shape no reader can verify from any config file.
The check belongs in the lint task of the package that owns the files: `@handicraft/playground#lint`
already hashes `apps/playground/**` and `@handicraft/registry#lint` already hashes
`registry/default/**`. `ROADMAP.md` §6.6 owns it.

**Before adding a filesystem read to a test, run `turbo run <task> --dry=json` and confirm the file
appears in that task's hashed inputs.** If it does not, either do not read it, or record the instance
here with its measurement.

**Filtered runs are already real runs, which is what keeps the mutation record trustworthy.**
Passthrough arguments are part of the hash: `@handicraft/core#test` hashed `04471ed58aaf1b02` bare and
`347fadaff300cb85` with `-- -t "A15"`. Every mutation run in this project's history used a `-t` or
`-g` filter, so none of them was a replay and no past cycle's conclusions are in doubt.

---

## Mutation testing

The house standard. A test that cannot fail is decoration.

For every new assertion:

1. Note the file's exact current state.
2. Break the invariant the test guards.
3. Run the suite. Confirm the mutation fails **exactly its derived count** — the number written down
   before the run, derived from which assertions read the text the mutation changes. For most
   mutations that count is 1. Where it is higher, the derivation is the claim being tested, and an
   undeclared count is a failure whether it is higher or lower than expected.
4. Revert.
5. **Verify the revert** — re-run the suite *and* `git diff` the file. Clean diff, green suite.

### Deriving the count — hubs and spokes

A **spoke** is a value only one assertion reads; mutating it fails 1 test. A **hub** is a value
several assertions read, so mutating it fails every guard that reads it. Neither is a defect. A
mutation failing 5 tests is only a problem when the count was not derived in advance, because then
nobody knows whether the extra failures are the shared invariant working or the assertion failing to
isolate what it claims.

**When a cycle adds an assertion, re-classify every already-named mutation against the new
assertion's read set before writing the predicted total.** A new assertion that reads text an
existing mutation changes converts that mutation from spoke to hub. Deriving only the new mutations
is half the rule.

This is written because the same error occurred twice: cycles 002b and 002c each predicted 1 for a
mutation that had become a hub, and each was caught by QA against the architect's own brief rather
than by the architect. The count is cheap to derive and expensive to discover.

**A count is written as its addends, never as a total.** `M6 + M7 + card + checkbox = 4`, not `4`.

Cycle 004 produced six wrong counts across one document. Every one of them is the same shape: a sum
with a term dropped. The hub-and-spoke rule above catches the case where nobody knew about the
intersection — but the sixth slip was written *four paragraphs after* the section that identified the
missing term, by the same author, in the same dispatch. Knowing the intersection is not enough when
the total is written as a bare number, because a bare number carries no record of what went into it
and cannot be checked against anything.

Addends make the omission visible to a reader who never re-derives the count. They also survive a
cycle: the next author changing an assertion can see which terms are affected without reconstructing
the arithmetic from scratch.

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

**The revert surface is the tree, not the file.** Check `git status --porcelain` over the whole
repository and compare the entry count to what it was before the mutation. Reverting the source file
is not sufficient and `git diff` on that file will read clean while the tree is dirty.

A mutation that changes a **snapshot name** is the case that proves it. Playwright writes a missing
baseline rather than failing, so the run leaves new PNG files behind under the mutated names — files
no source revert touches, because the source is not where they came from. Cycle 004's QA hit this on
its own mutation run: 32 stray baselines, `git status` going from 32 entries to 64, caught only
because it counted. The next author generating artifacts from a mutated build inherits the same
shape whatever the file type.

### Known-good mutations (from `TESTING.md`)

**Each must fail its stated count. Two of the four fail more than one test, and
that is correct** — a mutation crossing a genuine shared invariant *should* light
up every guard that covers it. What matters is that the count is known in advance
and does not change.

Re-measured 2026-08-04 against **127 tests in 18 files**. Three of the four are unchanged from the
2026-08-03 measurement against 108 tests in 16 files. The fourth changed, and is unstable by nature —
see below the table.

Re-measured again 2026-08-06 against **137 tests in 18 files**, cycle 004. Three are unchanged; the
fourth landed inside its declared 4-or-5 range, which is the only thing that row can be held to.

**These lines accumulate rather than replace each other, and that is the point.** The instruction
below the table — re-measure whenever a test file is added — is only auditable if a reader can see
which suite populations the table has already survived. `108/16 → 127/18 → 137/18` is that audit
trail. Overwriting the earlier figure would assert a measurement nobody took and delete the evidence
for a rule this file imposes fifteen lines further down.

| Mutation | Fails | Which |
|---|---|---|
| `preserveVertices: false → true` in `engine/generator.ts` | **5 tests, 2 files** | `aesthetic.test.ts` "does not pin the corners", plus `golden-shapes.test.ts` for `rect`, `rect-small`, `rounded`, `pill` |
| `POOL_SEEDS` return replaced with `Math.random()` in `engine/seed.ts` | **4 or 5 tests, 3 files — not a stable reference** | `tier2.test.tsx` ×2, `aesthetic.test.ts` "bounds distinct geometries by the pool size", `seed.test.ts` "seedFrom is deterministic", and *sometimes* `aesthetic.test.ts` "keeps the stroke visibly loose" |
| `--hc-stroke-w: 2.4px → 1.6px` in `styles/handicraft.css` | **1 test** | `tier-agreement.test.ts` "uses the same stroke weight" |
| `--hc-r-a: 4px → 14px` in `styles/handicraft.css` | **1 test** | `tier-agreement.test.ts` "keeps tier-1 corners near-square" |

This table previously read "each must fail exactly one named test", which had
become false and was never noticed, because nobody counts the failures when the
suite goes red as expected. **A stale expectation in a mutation table is
invisible in exactly the way mutation testing exists to prevent.** Re-measure it
whenever a test file is added that covers one of these invariants.

### The seed mutation is non-deterministic, and the reason is worth knowing

Kept in the table rather than removed, because it still exercises a real
invariant — but **it is not a fixed-count reference and must never be used as
one.** The identical mutation, applied unchanged, measured 4 failures, then 5,
then 4 across three consecutive runs on 2026-08-04.

The cause is in rough.js, not here. `roughjs/bin/math.js`'s `Random.next()`
reads `if (this.seed) { ... Math.imul(48271, this.seed) ... } else { return
Math.random(); }`. **`Math.imul` coerces its arguments through `ToInt32`, and
`Math.random()` returns a float in `[0, 1)`, so every seed this mutation
produces truncates to `0` on the first internal draw.** Once `this.seed` is `0`,
the `if` is false forever after and rough.js silently falls through to real
`Math.random()` for the rest of that generation.

That is a second and broader instance of the hazard `engine/seed.ts`'s own
comment already names. The comment says a **falsy** seed causes the fallback and
is thinking of literal `0`; via `Math.imul`'s truncation, *any* fractional float
does the same thing. Anything constructing a seed from a non-integer source hits
this, and the symptom is silent — geometry that looks plausible and differs on
every render.

A stable replacement — a fixed non-pool integer, which stays seeded but wrong —
would give a countable reference. Not measured yet; it is owed the next time
this table is touched.

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

### Rule V6 — a text-fit claim is measured on the glyph, not the box

**The check above cannot see text overflowing inside a fixed container, and neither can
`getBoundingClientRect()`.** They answer different questions than the one that matters:
`scrollWidth` is a claim about the **document**, and `getBoundingClientRect()` is a claim about the
**layout track**. Ink that piles up inside a Card widens neither.

Measured on the landing page, cycle 012, after **three green QA passes**: a numbers panel rendered
`1.6ms34.3ms13.81px44px` overprinted into an unreadable smear at 375px. Track stride was 61px while
`34.3ms` needs 95px at `text-3xl` hand-bold — overlaps of 10.0, 33.9 and 28.7px. `scrollWidth` read
**0 overflow**, correctly, because the page genuinely did not scroll. `getBoundingClientRect()`
reported the five values and their five labels at **exactly** matching x-coordinates, correctly,
because the boxes really did align. Every gate was green and axe reported zero violations at every
impact level throughout.

**So: any assertion that text fits uses `Range.getBoundingClientRect()` over the text node**, and
reports both numbers — the rendered glyph width and the container it must fit. A screenshot at the
binding width is required alongside it, because this class is legible to an eye and invisible to the
instruments above.

**Corollary, and it is the half that generalises furthest: pairing is measured at every breakpoint,
never assumed from source order.** A single-column collapse re-orders by document position, so a
label correctly beside its value at 1280 can end up beneath four other values at 375 with nothing
failing anywhere. Cycle 012 shipped that defect twice — once mis-paired but legible, once legible but
mis-paired — and no assertion in the suite could see either.

**Rule V6b — when two consecutive iterations trade one defect for another at the same subject, the
constraint is the defect.** Oscillation is not two bad fixes. It is one over-tight constraint being
satisfied twice, and the fix is to remove the constraint rather than to attempt a third trade. Cycle
012's numbers panel took four passes because a rule forbidding prose over a hachure forced values and
labels into separate containers; the fix was an unfilled Card, after which the rule had no mechanism
to apply and both defects closed at once.

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
  and it does not generalise. Measured under throttling the real ratio is **roughly 84×**, which is not
  a drift from 4× — it is evidence that the quantity was never a fixed multiple. It was recorded as 60×
  until 2026-08-04, against an anchor that has since been corrected; that it moved again is the point
  rather than an exception to it.

  **The mechanism, measured 2026-08-04.** `next dev` serves every file under
  `apps/playground/.next-dev/static/chunks/` with `cache-control: no-store, must-revalidate`. **No
  full-page navigation under `next dev` is ever cache-warm.** Every reload re-fetches the entire
  unminified, eval-source-mapped client bundle. The ratio to production is therefore set by bundle size
  and link speed rather than by compile cost, and it grows every time the bundle grows.

  | Condition | Handover | Against production warm |
  |---|---|---|
  | `next dev`, Fast 4G, cold navigation | 2722.5ms | 84.5× |
  | `next dev`, Fast 4G, warm reload, route already compiled | 2716.1ms | 84.4× |
  | `next dev`, unthrottled | 427.8ms | 13.3× |
  | `next build && next start`, Fast 4G, cold cache | 260.4ms | 8.1× |
  | `next build && next start`, Fast 4G, warm reload, median of 3, DOM `MutationObserver` (`tests/e2e/perf.spec.ts` H1/H2, frameCount 32), 2026-08-04 | **32.2ms light / 31.5ms dark** | 1× |

  Cold and warm under `next dev` differ by `2722.5 - 2716.1 = 6.4ms`, which is **0.2%**. Route
  compilation is not the cost. Any explanation resting on compile time is disproven by that line.

  **The anchor row read 44.9ms until 2026-08-04, and it was a third artifact of the same kind.** Its
  provenance is recoverable: cycle 002a measured it with an ad hoc script driven through browser
  tooling and **never committed**, which waited for two conditions — a frame reaching
  `data-hc-fidelity="high"` **and** a mark reaching `data-hc-drawn`. The committed instrument waits
  for one: every `.hc-frame` at high fidelity. It never queries a mark. **These are different
  quantities by construction**, not two readings of one. The committed instrument has been measured
  five times across three cycles and every reading falls in a 30–38ms band; 44.9ms has exactly one
  data point, from a script nobody can re-run.

  **The four `next dev` rows are cycle 002a's own figures on that same uncommitted instrument.** Their
  ratios above are recomputed against the new anchor, so they now compare one instrument's numerator
  against another's denominator. They are indicative of the order of magnitude and **not** like-for-like.
  Re-deriving the whole table on the committed instrument is owed, together with the 110ms budget
  itself, and neither is done here.

  **Rules that follow.**

  - **Handover is measured on `next build && next start` only.** A throttled `next dev` handover figure
    measures the dev server's transport, not the library. It is not an instrument. Do not report it as a
    handover number and do not compare it to anything.
  - **Stress may be measured under `next dev`, unthrottled.** Settle time is computation-bound and the
    transport is out of the loop once the page has loaded. This is why the stress figure survived the
    same investigation unharmed.
  - **The +15% cycle-over-cycle flag still applies, and only between figures taken under identical
    conditions** — same command, same throttle, same instrument. A change of conditions is not a
    regression. Comparing across conditions is precisely how an 84× transport artifact gets filed as a
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
