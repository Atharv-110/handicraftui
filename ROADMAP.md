# Handicraft UI — Roadmap

The plan from here to 1.0. Written at caveman `lite` per `PRINCIPLES.md`: no filler, full sentences.

**This file is amendable.** It is not doctrine. `.claude/doctrine/**` is permanent law that is not
re-litigated; a roadmap that survives contact with reality gets edited. Amendments arrive as a pull
request the founder reviews, same as any other change. Where this file and doctrine disagree,
**doctrine wins and this file is corrected.**

Derived from the founder's master plan v3, with the corrections in §0 applied.

---

## 0. Corrections applied to master plan v3

v3 was written without access to `.claude/`, which is robots-blocked to automated fetch. Its §0
flagged a pending doctrine diff. That diff has now been done against the real files, and these are
the results. Each correction follows v3's own precedence rule: existing doctrine wins.

| v3 said                                                                        | Doctrine says                                                                                                                                                                    | Applied                                                                                                                                     |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| §5.5 handover assert at **71ms**                                               | Budget is **110ms**, deliberately 1.4× the worst observed figure of 71ms, under stated conditions                                                                                | Asserting at worst-observed guarantees flake. Budget is 110ms production, and `next dev` stays unbudgeted at roughly 4× that                |
| §0/§4.2 "518 frames settle in **64ms**", states budget "≤ 2× the current 64ms" | 64ms is the **instrument floor** of `apps/playground/app/perf-readout.tsx` — 16ms tick, three consecutive stable counts, so four ticks minimum. "An artifact, not a measurement" | Stress budget is **300ms** production, unthrottled, median of 3. No budget is ever set below ~64ms because the instrument cannot resolve it |
| §5.3 "Badge/Separator/Label — never QA'd"                                      | Cycle 1 ran a full QA pass on all three, mutation-verified, browser-verified                                                                                                     | Dropped. Replaced by re-verifying all seven against the new design system and state-pair rules, which is a different and smaller job        |
| §0 "PENDING DOCTRINE DIFF", blocking Phase 0 item 1                            | All five doctrine files are readable from inside the repo                                                                                                                        | Done. This table is the diff                                                                                                                |
| §3 cycle close                                                                 | `PRINCIPLES.md` carries two founder approval gates — briefs and merges                                                                                                           | Both added to the cycle protocol in §4                                                                                                      |
| §"Comms" caveman `full`                                                        | Founder changed the level to `lite` on 2026-08-03                                                                                                                                | `lite` throughout                                                                                                                           |
| §"Team": planner, ui-architect, dev, qa, hc-writer                             | Files are `hc-planner`, `hc-architect`, `hc-dev`, `hc-qa`, `hc-writer`                                                                                                           | Mapped                                                                                                                                      |
| §4 doctrine additions: state pairs, pool-caching, motion tokens, test seam     | —                                                                                                                                                                                | All four kept. They are the strongest part of v3                                                                                            |

**One addition v3 did not have: the design system.** It is now Phase 0 item 0 and it blocks the rest
of Phase 0. Reasoning in §6.

---

## 1. Where the project actually is

Verified against `origin/main` at commit `08a50f4`, not assumed.

- **7 of 21 components** shipped: Badge, Button, Card, Checkbox, Input, Label, Separator.
- **108 tests across 16 files**, green. All five gates green.
- Two-tier render with a tested tier agreement. Handover measured at 71ms in production.
- Fixed 12-seed pool with a mixed hash. 500 components generate in 1.6ms from the pool, 110ms
  without.
- Central size-aware taper. Corner overshoot as a tested invariant (`preserveVertices: false`).
- Hands `steady | natural | loose | hurried`. `ink` is `plain | layered`. `fill` is a ceiling:
  `no | low | med | high`.
- Blackboard dark mode with chalk wiring in the engine.
- Draw-on entrance with dash-reset handling for `prefers-reduced-motion`. Opt-in `rescribble`.
- `focusWithin` contract, `--hc-focus` token.
- URL-addressable playground on port 4321. Registry builds to `registry/public/r/`.

**Known stale, fixed in Phase 0 item 2:** `README.md` says four components exist. `TESTING.md` says
62 tests pass.

**Unbuilt, 14:** Skeleton, Alert, Avatar, Textarea (plain semantics) · Radio, Switch, Select, Slider,
Tabs, Accordion, Dialog, Popover, Tooltip, DropdownMenu (Base UI).

---

## 2. Thesis and laws

shadcn animates with easing. Handicraft animates by **redrawing**. The product sells handwriting, not
randomness. The bar from `CLAUDE.md` stands: _roughViz should look like nothing in front of us._

Five laws, every component:

1. **Idle is still.** Nothing moves that was not touched.
2. **State change is ink change.** The pen redraws; the geometry does not tween.
3. **Seed is state.** Pool-cached, never per-instance.
4. **The real element does the work.** The sketch layer is decorative, outside layout and outside the
   accessibility tree. Already under test.
5. **Motion is four verbs only**: draw-on, erase, marker sweep, boil.

**DECISION-REQUIRED, founder only, no agent discretion:** Base UI version change from 1.6.0 · a new
motion verb · a new hand · seed-pool size change · registry schema change after beta · **any change
to a locked design token once §6.0 lands**.

---

## 3. Skill routing

The planner names the relevant skills in every cycle brief.

| Skill                     | Fires in                       | Trigger                                                                                                                                                                                                                                                   |
| ------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **caveman**               | Always                         | Level `lite` everywhere. Four stricter standards per `PRINCIPLES.md`                                                                                                                                                                                      |
| **frontend-design**       | 0, 1, 2, 3                     | Phase 0: design system direction and the state-pair visual review. Phases 1–2: an aesthetic pass on every component before QA hand-off — dev runs it, QA checks it happened. Phase 3: docs art direction                                                  |
| **ui-ux-pro-max**         | 0 and 3 heavy, 1–2 spot        | Phase 0: palette and type-pairing research for the design system. Phase 3: docs and landing. **Trap: its documented `${CLAUDE_PLUGIN_ROOT}` path is empty for project-scoped skills and fails silently.** Use the absolute path and assert rows came back |
| **accessibility**         | 0 gate, every DoD, 4           | Phase 0: the WCAG 2.2 checklist defines both the axe gate and the design system's contrast floors. Every component DoD. Phase 4: published audit                                                                                                          |
| **shadcn**                | 0, 1.5, 3, any registry change | Consumer-install E2E design, beta registry hosting, `apps/docs` consumption pattern. Authority on registry item schema                                                                                                                                    |
| **migrate-radix-to-base** | 2 only                         | Entry toll before **each** Base UI component, not once per phase. Public reference code is Radix-shaped and must be translated, never copied                                                                                                              |
| **find-skills**           | Every phase open               | Run against the phase's work shape to catch gaps. Already visible: a Playwright or visual-regression skill before Phase 0 item 4, an npm-publish or changelog skill before Phase 1.5                                                                      |

Skills hygiene lands in Phase 4: `skills-lock.json` tracks 3 of 6, and `CONTRIBUTING.md` needs the
fresh-clone reinstall block.

---

## 4. Cycle protocol

**One cycle is one work session.** Any item that does not fit one or two cycles gets split at cycle
open.

**Open.** The planner pulls the next items from this roadmap and names the §3 skills in the brief.

**Brief.** The architect writes it. **The founder approves it before `hc-dev` is dispatched.** Every
number in it carries its derivation. See `PRINCIPLES.md`.

**Build.** Per `CODE-CONTRACT.md`.

**Verify.** Per `QA-CONTRACT.md`. QA re-runs every gate independently and never reads them from the
dev manifest.

**Close.** Gates green (`test`, `typecheck`, `lint`, `build`, `registry:build`, `format:check`, plus
the Playwright suites once they exist) · `.claude/state/INDEX.md` row updated · memory written in
normal prose · anything `DECISION-REQUIRED` queued for the founder, never resolved inline · pull
request opened with a pointer-structured description. **The founder merges. Nobody else, ever.**

Cycle estimates below are planning aids, not commitments. **Velocity check at Phase 0 close:** the
planner compares estimate against actual and rescales Phases 1–4 before Phase 1 opens.

---

## 5. Doctrine additions to land in Phase 0

### 5.1 Every interactive state exists in both tiers

Tier 1 paints before hydration and is the no-JavaScript truth. A tier-2-only state is a handover
flash and a dead state without JavaScript. Each state ships as a pair. Press-onto-shadow already
proves the pattern.

| State    | Tier 2                                            | Tier 1                                        |
| -------- | ------------------------------------------------- | --------------------------------------------- |
| hover    | +0.4 roughness redraw, a generalised `rescribble` | stroke one step darker, shadow +1px           |
| press    | `strokeWidth` 2.5, shift onto the shadow          | shipped, keep                                 |
| focus    | pen-circle ring on its own pool seed              | `--hc-focus` outline, shipped, keep           |
| disabled | dots fill, ink at 45%                             | opacity plus a dashed pseudo-border           |
| error    | roughness 2.4, bowing 2.0, error ink              | thicker error pseudo-border, `rotate(0.3deg)` |

**"Error ink" does not exist yet.** That is §6.0's job, and it is why the design system blocks this
item rather than running beside it.

**Exception, to be documented in `PRINCIPLES.md`:** the floating parts of overlay components (Dialog,
Popover, Tooltip, Select popup, DropdownMenu) are tier-2 and JavaScript-only by nature. The no-JS
rule binds their **triggers** only.

### 5.2 States stay pool-cacheable

State variants are parameter shifts on the **same** pool seed. The mark cache key gains a params
dimension, never a seed dimension. 500 hovering buttons still hit 12 cached hover geometries. Boil is
2–3 pre-generated pool variants cycled by class swap, cached the same way.

Budget: the all-states stress matrix settles inside **300ms** production, unthrottled, median of 3 —
the existing stress budget, not a new one. Extend the playground readout with a **cache-hit-rate**
figure so the claim is measurable. Do not express this budget as a multiple of 64ms; that number is
the instrument's floor, not a measurement.

### 5.3 Motion tokens

Interaction motion is a different register from the 1100ms entrance draw-on. Marks 120–180ms. State
redraws at most 220ms. Popups 150ms. Tooltip 0, deliberate restraint, documented as such. Boil at
10fps via `steps()`.

These land as `--hc-*` custom properties so the `tier-agreement.test.ts` pattern can cover them.
Every new animated property copies the draw-on dash-reset pattern for reduced motion. Each verb gets
one mutation-verified test.

### 5.4 Test seam

A `data-hc-state` attribute plus a playground URL parameter `&state=hover|press|focus|disabled|error`,
following the existing `&hand=` pattern. This is the only test-only surface added, and production
behaviour never reads it.

---

## 6. Phase 0 — foundation · est. 6–9 cycles

Gate: all seven items green.

### 6.0 Design system — NEW, blocks items 3 through 6

**This did not exist in v3 and it is the largest gap in the project.** There is an engine — tested,
invariant-guarded, excellent — and seven components' worth of styling decisions made one at a time.
There is no system underneath them.

The evidence is already in the backlog, filed as three unrelated bugs:

| Symptom                                                                     | Filed as                      | Actually                                                             |
| --------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------- |
| Button `danger` at 3.56:1 light, 3.74:1 dark — fails AA                     | a Button bug                  | nobody defined what `danger` means as a colour with a contrast floor |
| Badge `marked` forced from `med` fill down to `low` at 3.64:1 on blackboard | a Badge decision              | the same missing definition, rediscovered by hand                    |
| Playground `h2` at 2.93:1, axe serious                                      | out of scope, playground-only | there is no type scale, so nothing set it                            |

Three contrast failures, three separate one-off fixes, three cycles. That is a missing system, not
three bugs. Fourteen more components without one means fourteen more one-off decisions, and by
component 21 nothing agrees with anything.

**What it must define:**

1. **Semantic colour roles** — `danger`, `warning`, `success`, `info`, `accent`. Each carries an ink
   colour, a fill colour, a **proven** contrast ratio in both light and blackboard mode, and the
   **maximum fill level the role may use**, because above some density the text stops passing. This
   is where `fill`-as-a-ceiling meets colour.
2. **Type scale** — named steps across the two faces, encoding a rule already locked in
   `PRINCIPLES.md`: an all-handwritten UI fails at 14px in a table. The scale states **which face is
   permitted at which size**. That constraint is specific to this library and worth writing down.
3. **Spacing scale** — with a floor no ordinary design system needs. Strokes wander roughly 9px past
   the nominal box and the sketch SVG is `overflow: visible` by design. `PRINCIPLES.md` already says
   frames collide at tight gaps; this turns that warning into numbers.
4. **One shared size ramp** — `sm`, `md`, `lg` with defined height, padding, type step and
   touch-target status, used by every component. `sm` is already documented as dense-desktop-only
   because it is under 44px. That rule belongs in the ramp, not in Button's comments.
5. **Elevation** — needed before Wave B has five overlay components inventing it five ways. In this
   aesthetic elevation is not a shadow blur; it is paper stacking, a second stroke pass, the hachure
   scrim.

Density is deliberately out of scope for 1.0.

**How it is enforced.** The mechanism already exists and works: `styles/tier-agreement.test.ts` reads
the stylesheet as text and asserts constants still match. Extend the pattern with a
`design-tokens.test.ts` asserting (a) every semantic role's contrast ratio in both themes at its
declared maximum fill, **computed rather than eyeballed**; (b) every size in the ramp meets or
explicitly declares its touch-target status. A third check — no component ships a raw spacing or type
class from outside the scale — is a lint rule, and it lands in item 6.

**Process.** `hc-planner` researches and returns options with consequences. **The founder decides the
locked values** — `PRINCIPLES.md` reserves aesthetic calls to the founder and this is the largest set
of them the project will ever make. The result lands as `.claude/doctrine/DESIGN-SYSTEM.md` plus
tokens plus the contrast test. _(planner, then founder, then architect, dev, qa)_

### 6.1 Protocol and doctrine

Caveman to `lite`, the brief-review gate, this roadmap at the repo root. Then §5 into
`PRINCIPLES.md` and `CODE-CONTRACT.md`, with `QA-CONTRACT.md` gaining the both-tier check and the
overlay exception. _(main thread, hc-writer)_

### 6.2 Docs sync

`README.md` says four components, reality is seven. `TESTING.md` says 62 tests, reality is 108.
Smallest possible pull request. _(hc-writer)_

### 6.3 State machinery — blocked on 6.0

Generalise `rescribble` into the engine-level parameter shift of §5.1. Every component consumes it.
Add the `&state=` seam of §5.4. _(architect designs, dev lands)_

### 6.4 Playwright layer

A root project targeting playground URLs. Six spec families:

- **Visual matrix** — `toHaveScreenshot` across a pruned component × state × hand × fill × dark grid,
  deterministic via the seed pool plus URL state.
- **Tier parity** — `?fidelity=lite` against `high`, screenshot plus `getBoundingClientRect`. Closes
  a named known gap.
- **Degraded modes** — forced-colors, reduced-motion, print emulation, and no-JS via
  `javaScriptEnabled: false`. Converts `TESTING.md` §8 from manual steps to specs.
- **axe** — `@axe-core/playwright`, gate defined by the accessibility skill's WCAG 2.2 checklist,
  zero critical. Closes the second named gap: axe has run **once, by hand** in cycle 000b, and has
  never run automatically in CI.
- **Consumer install E2E, now rather than after hosting** — CI statically serves
  `registry/public/`, then `create-next-app` plus `shadcn add http://localhost:PORT/r/button.json`
  plus build. Unblocks `TESTING.md` §10 without waiting on a domain.
- **Handover timing** — ported from `TESTING.md` §6, asserting the **110ms** production budget under
  `next build && next start` with Fast 4G throttling, median of 3. Not 71ms: that is the worst
  observed figure and asserting there leaves zero headroom.

**Matrix pruning rule**, which is what keeps the screenshot count survivable: the full grid runs on
Button only. Every other component tests all states at the default hand, plus one spot-check row
across hands and fills. The architect owns the grid file. _(dev; shadcn and accessibility skills)_

### 6.5 QA protocol rewrite

Mutation suite, then `test:pw <component>`, then review diffs only. Chrome DevTools MCP is reserved
for first-of-kind interactions and bug reproduction rather than being the default instrument. Lands
in `QA-CONTRACT.md`. Adds one duty: **QA re-checks the brief's numbers, not only the code.**
_(planner, qa)_

### 6.6 CI tripwires

A Base UI import without `focusWithin: true` fails the build — that kills the invisible-focus bug
class structurally. The registry dependencies-match-imports assert. Plus, once 6.0 lands, the
off-scale spacing and type class check. Into the existing workflows. _(dev)_

Plus the `text-hc-ink-faint` source scan: move it out of `design-tokens.test.ts` D7 and into the lint
task of each package that owns the files, so the check runs where the hash already covers what it
reads. Closes `QA-CONTRACT.md` Rule V1b's one open escape. _(dev)_

### 6.7 Re-verify the built seven

All seven components against the new design system and the §5.1 state pairs. This replaces v3's "QA
the built 7", which assumed Badge, Label and Separator had never been QA'd. They were, in cycle 1,
mutation-verified and browser-verified. _(qa)_

---

## 7. Phase 1 — the plain four · est. 4–6 cycles

Order: **Skeleton, Alert, Avatar, Textarea.**

Per-component landing set: component plus registry item · matrix spec file · the §5.1 state table
filled in · a `frontend-design` pass before QA · `INDEX.md` row · mutation-verified tests in the
suite's break-one-test style · docs-page skeleton in `apps/docs`.

- **Skeleton** — the underdrawing. Light pencil hachure blocks; the shimmer is a boil of pool-cached
  frames; tier 1 is an animated hachure gradient, which satisfies §5.1 with zero JavaScript. Ships
  `SketchReveal` (erase, then content draws on), reused by Avatar, Dialog and the docs demos.
- **Alert** — a paper note with a thick vertical ink accent in the semantic colour. Error uses
  agitated physics; info and success stay calm. A `sticky` variant: yellow paper, 1° rotation, taped
  corner. Drawn glyph icons via `SketchMark`.
- **Avatar** — a rough circle ring, with the image clipped by the ring's own fill path so the photo
  edge is irregular. Hachure-fill initials as the fallback. Status is a solid scribble dot on the
  ring. Stacks alternate ±0.5° rotation.
- **Textarea** — inherits Input's rules wholesale. `ResizeObserver` regenerates on the same seed, 2px
  threshold, debounced. Corner-scribble resize affordance. A bare `react-hook-form register()` is a
  QA gate.

---

## 8. Phase 1.5 — beta ship · est. 2–3 cycles

Beta lands at 11 components, which is why this is its own phase.

1. **Versioning starts.** `@handicraft/core` at `0.1.0-beta` on npm. `CHANGELOG.md` begins. Semver
   posture documented: 0.x may break, but **registry items are additive-only from here**. A schema
   change is `DECISION-REQUIRED`.
2. **Hosting.** The `apps/docs` scaffold deploys to `handicraftui.dev`, serving `registry/public/r/`
   statically from the same deploy. One Vercel project covers docs-lite and the registry together.
3. **Docs-lite.** Landing, install page, and 11 minimal component pages — live demo, `shadcn add`
   command, props. Full docs stay in Phase 3.
4. **Consumer E2E re-pointed** at the production URL. The local static-serve variant stays in CI.
5. **Feedback surface.** Issue templates for bug, component request and accessibility. Beta caveats
   in the README. `hc-writer` owns README and INDEX sync at every cycle close from here on — that is
   the stale-docs lesson institutionalised.
6. **Font.** Verify the Excalifont licence, then self-host it or formally commit to Kalam. Kill the
   `cursive` fallthrough, which hits a serif-italic trap on macOS. Beta users screenshot things, so
   the face has to be right before rather than after.

Phase 2 then proceeds with real installs live. That is the point: Base UI components arrive under
consumer pressure, and the dependency tripwire from §6.6 plus the additive-only rule protect beta
users from churn.

---

## 9. Phase 2 — the Base UI ten · est. 12–18 cycles

**Entry toll, per component:** `migrate-radix-to-base` read fresh · `@base-ui/react@1.6.0` exact,
installed once at Wave A open · `focusWithin: true`, CI-enforced, with QA still confirming the
pen-circle lands on the correct box · registry dependency tripwire green on the first pull request ·
both-tier trigger states per §5.1.

**Wave A · 2–3 cycles.**

- **Radio** — spiral-scribble dot draws in over 120ms. On group change the old dot erases _while_ the
  new one draws, a one-beat overlap, so the pen reads as moving between boxes.
- **Switch** — position tweens on standard easing; ink never tweens. The track marker-sweeps in the
  direction of travel. The thumb boils during drag and settles with one reseed.

**Wave B · 7–9 cycles.** The overlay stack, in dependency order.

- **Tooltip** — instant, per the tooltip-0 motion token. Pre-generated at trigger mount. **The portal
  context bridge is solved here** — hand, ink, fill and seed crossing the portal — and the pattern is
  documented in `CODE-CONTRACT.md` for the four that follow.
- **Popover** — a hand-drawn tail merged into the frame path as one continuous outline, never a CSS
  arrow. The `framePathWithTail` engine utility is born here and reused by Select and DropdownMenu.
  Collision flip re-derives the tail side.
- **DropdownMenu** — marker-sweep item hover. Destructive items get a red squiggle underline drawn on
  hover. Submenu sheets counter-rotate against the parent.
- **Select** — Input physics on the trigger. Wobble-rotate chevron with one mid-turn reseed. 180ms
  popup draw-on with 20ms per-item stagger. Per-item caching that stays virtualisation-safe.
  Performance gate: a 200-item list with highlight travel at 60fps.
- **Dialog** — the hachure scrim, a large-gap diagonal in semi-transparent ink, as a shared engine
  primitive. Sheet scales 0.97 to 1 with draw-on. Exit is a fast fade plus a 0.5° page lift. Nested
  rule: a second scrim widens the gap, never doubles the darkness. The scrim is overlay-exempt under
  §5.1.

**Wave C · 4–6 cycles.** The hardest interactions, with the most experience banked.

- **Tabs** — the indicator never slides. The old underline erases over 100ms while the new one draws
  over 150ms, and the overlap is intentional. `indicator="circle"` reuses the focus-ring machinery.
- **Accordion** — height animates on standard easing, because layout has to be smooth. The inner
  content draws on during the reveal. The `+` becomes `−` by **erasing** the vertical stroke, redrawn
  on close.
- **Slider** — track and full-width range stroke are pre-drawn. Dragging reveals via clip or
  dasharray and **never regenerates**. The thumb boils under the cursor. A paper-flag value bubble
  uses the tail utility. Range thumbs sit at a pool-seed offset. The stress page gains a slider row
  and the §5.2 budget applies.

---

## 10. Phase 3 — docs · est. 5–8 cycles

`apps/docs` grows from scaffold to product. The architecture stands: **docs consume components
through the registry** — `shadcn add` from the project's own `r/`, copies committed — so registry
breakage breaks the docs build. Dogfooding as CI. The playground stays the engine harness, untouched.

- **Direction** — `frontend-design` for art direction. `ui-ux-pro-max` (absolute path) for palette,
  font pairing and UX guidelines. House voice is the README's register: measured numbers, decisions
  with reasons, zero marketing adjectives. `VOICE.md` governs and `hc-writer` enforces.
- **Foundations pages** — Philosophy (five laws, four verbs, the corner-overshoot story) · Hands, ink
  and fill with a live switcher · **Two tiers**, the 71ms handover as a feature page nobody else can
  write · Seeds and the 12-pool (determinism, 1.6ms against 110ms) · Motion · Accessibility with
  published axe results · **The design system**, which after §6.0 is a page rather than an apology.
- **Component template** — live demo with hand and state controls · `shadcn add` command · anatomy ·
  props generated from types · interaction spec naming which §5.1 rows apply · accessibility notes ·
  recipes.
- **Landing** — a hand-switcher that redraws the page, and the published numbers.

---

## 11. Phase 4 — launch · est. 3–4 cycles

**1.0 gate:** 21 of 21 through the Definition of Done · docs complete · consumer E2E green against
production · axe zero-critical, published.

**Ship list:** `@handicraft/core` 1.0 · five signature captures recorded from the docs (hachure
scrim, skeleton inking, tabs erase-and-redraw, one-prop hand swap, boiling slider thumb) · two
repo-born essays, both already measured — _"12 seeds, 500 components, 1.6ms"_ and _"a CSS twin for
every rough.js state"_ · Show HN, r/reactjs, an X thread running one signature per day for a week ·
a comparison page (wired-elements as the toy-to-production framing; shadcn as a philosophy
difference, not a competitor) · skills-lock hygiene plus the `CONTRIBUTING.md` reinstall block ·
`TRADEMARK.md` and DCO linked in the checklist.

---

## 12. Definition of Done — every component

1. The five laws hold. Physics read from tokens. Zero local magic numbers.
2. **Every value comes from the design system** — colour role, type step, spacing step, size ramp
   entry. A raw Tailwind class outside the scale fails the lint rule.
3. The §5.1 state-pair table is filled, with the overlay exemption cited where it applies.
4. Matrix, tier-parity, degraded-mode and axe specs green. Mutation-verified unit tests in the
   suite's style.
5. WCAG 2.2 checklist pass per the accessibility skill. Keyboard per the WAI-ARIA APG. `focusWithin`
   correct wherever the frame sits on a wrapper.
6. Pool-cacheable states proven via the cache-hit readout, inside the §5.2 budget.
7. Registry item valid, dependency tripwire green, included in consumer E2E.
8. Docs page live in `apps/docs`. `INDEX.md` row current.
9. QA sign-off against this list.

---

## 13. Risks

| Risk                                                                                   | Mitigation                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The design system arrives too late and Phase 1 components each invent their own values | It is item 0 and it blocks items 3 through 6. Nothing new is built before it lands                                                                                                           |
| Founder becomes the bottleneck now that briefs need approval too                       | Briefs are one per cycle and reviewable in minutes when every number carries its derivation. If it does bottleneck, that is a real signal and the gate gets revisited — not quietly bypassed |
| Beta users on 0.x hit churn during Phase 2                                             | Additive-only registry rule, dependency tripwire, CHANGELOG discipline from `0.1.0-beta`                                                                                                     |
| Screenshot matrix explodes                                                             | Pruned grid: Button full, everything else states at default hand plus one spot row. Architect owns the grid file                                                                             |
| Tier-1 approximations drift as states multiply                                         | Extend `tier-agreement.test.ts` per state pair. The mechanism already exists and already works                                                                                               |
| A 12-seed pool is too small for states × boil frames                                   | The cache-hit readout surfaces it early. A pool resize is `DECISION-REQUIRED`                                                                                                                |
| Session-sized cycles fragment big items like Dialog and Slider                         | The cycle-open splitting rule in §4. Wave estimates already assume multi-cycle components                                                                                                    |
| Docs drift recurs                                                                      | `hc-writer` owns README and INDEX sync at **every** cycle close from Phase 1.5                                                                                                               |
| `ui-ux-pro-max` silent path failure wastes a session                                   | Absolute path only, and assert rows came back before trusting the result                                                                                                                     |
| Perf budgets get quietly relaxed to match observation                                  | Any budget change records its conditions or it is not a budget. The history of the 60ms and 64ms artifacts is kept in `QA-CONTRACT.md` for exactly this reason                               |

---

## 14. Immediate next actions

1. **main thread** — land the protocol changes and this file. Open the pull request. _(in progress)_
2. **hc-planner** — research the design system per §6.0 and return options with consequences for
   founder decision. This is the first time the planner is used for what it exists for.
3. **hc-writer** — the README and TESTING sync pull request. Smallest change in Phase 0.
4. **hc-architect** — a one-page RFC on the state parameter-shift engine plus the §5.1 tier-1 table,
   for founder sign-off. Blocked until the design system lands, because §5.1's `error` row names ink
   that does not exist.
5. **hc-dev** — Playwright scaffold, with the Button matrix spec as the protocol pilot. Runs in
   parallel with the design system work; it depends on no tokens.

---

## Related

`.claude/doctrine/PRINCIPLES.md` · `.claude/doctrine/CODE-CONTRACT.md` ·
`.claude/doctrine/QA-CONTRACT.md` · `.claude/doctrine/VOICE.md` · `.claude/state/INDEX.md` ·
`TESTING.md`
