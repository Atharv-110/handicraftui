# Handicraft UI — Principles

Permanent law. Every agent reads this first. Written at caveman `lite`: no filler, full sentences.

Nothing here is re-litigated without founder approval. If a task seems to require breaking a rule
here, that is a `DECISION-REQUIRED`, not a judgment call.

---

## Mission

A hand-drawn React component library, in the spirit of roughViz but for general UI. Installed
shadcn-style so users own and can edit the source. It has a complete design language of its own.

**The bar: roughViz should look like nothing in front of us.** This is the founder's stated standard
and it is the tiebreaker on any aesthetic question.

---

## Communication protocol — caveman `lite`, everywhere

All internal writing is caveman at level **`lite`**: no filler, no hedging, **articles and full
sentences kept**. Professional but tight. This covers conversation, briefs, findings, cycle
documents, manifests, agent-to-agent handoffs and status lines. Follow the skill at
`.claude/skills/caveman/SKILL.md`, including its `Boundaries` and `Auto-Clarity` sections.

What `lite` reads like, from the skill's own example:

> Your component re-renders because you create a new object reference each render. Wrap it in
> `useMemo`.

Not this, which is `full`:

> New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`.

**The level was `full` until 2026-08-03 and the founder changed it.** `full` drops articles and
allows fragments. It saved tokens and cost readability, to the point where the founder could not scan
a findings report without decoding it first. A communication protocol that the person everything
reports to cannot read has failed at the only job it has. `lite` keeps the discipline — no filler,
no hedging, no padding — and gives back the grammar.

Two rules from the skill that are easy to get wrong and still bind at `lite`:

- **Never invent abbreviations** (`cfg`, `impl`, `req`, `fn`). The tokenizer splits them identically
  to the full word: zero saving, worse decoding. Standard acronyms (DB, API, HTTP) are fine. No `→`
  arrows — they cost a token and save nothing.
- Technical terms, code blocks, API names, CLI commands and exact error strings stay verbatim.

### Four things follow a stricter standard than `lite`

These are no longer escapes from compression — at `lite` there is little left to compress. Each one
answers to a more specific standard instead.

1. **Shipped code comments** in `registry/default/**` and `packages/core/**` follow
   `CODE-CONTRACT.md`'s dense why-not-what style. These files install into users' repositories, so
   the comments are a product feature rather than internal notes.
2. **All `hc-writer` output** — docs, landing copy, component descriptions, error and empty states —
   follows `VOICE.md`, which is far more prescriptive than `lite`.
3. **Project memory** at `~/.claude/projects/-Users-atharvvani-Developer-libararies-js-handcraft-ui/memory/`
   is normal prose. It holds verbatim statute, invariants and exact error strings.
4. **Root-cause diagnosis and evidence chains** stay in full prose. The evidence is the value, and
   the reasoning is what makes it checkable a month later.

---

## Locked aesthetic decisions

Settled by the founder. Do not reopen.

- **Notebook, ink on paper.** Paper is near-neutral `oklch(97.8% 0.006 90)`, deliberately not a warm
  cream. A strongly tinted ground fights real product content, and warm-cream plus serif plus
  terracotta is a recognisable AI-design default.
- **Ink is blue-black ballpoint** `oklch(24% 0.03 265)`, not grey. The slight blue is what reads as
  "written with a pen" rather than "grey UI text".
- **Accents come from the subject**: exercise-book margin red, highlighter, blue biro. Highlighter is
  only ever a background behind text, never a text colour.
- **Dark mode is a blackboard**, not a dimmed light theme. Chalk on slate, with a wide faint dust pass
  under a softer stroke and a wider hachure gap. A straight colour inversion reads as "dark mode UI",
  not as chalk.
- **Handwriting is the accent face** — display, buttons, labels. Body copy and form fields use a
  legible humanist system stack. An all-handwritten UI fails at 14px in a table.
- **Icons are drawn marks, not Lucide.** `SketchMark` renders through the same engine, seed pool, hand
  and taper as the frames, so a tick is drawn by the same person as its checkbox.
- **No charts in v1.** The engine stays chart-agnostic so a chart layer can reuse it later.

---

## Engine invariants — load-bearing

The aesthetic regressed once already, shipping as "rounded rectangles with a slightly doubled
border", because every individual suppressing choice looked reasonable on its own. Do not adjust any
of these without reading the evidence in project memory `aesthetic-invariants.md`.

```
BASE_ROUGHNESS   = 2.2        roughViz's own panel ships 2.5
BASE_BOWING      = 1.4        capped at 2.0 across every hand preset
BASE_STROKE_WIDTH = 2.4
preserveVertices  = false     never change this
default shape     = rect      sharp tested visibly more drawn than rounded
POOL_SIZE         = 12        hard-coded seeds, not generated
```

- `preserveVertices: false` is **the single biggest hand-drawn signal**. It was originally `true` to
  keep frames aligned to padding, which traded the entire aesthetic for a layout concern.
- **Overshoot is measured by corner displacement, never by bounding box.** Bounding box asserts the
  opposite of the intent: pinned vertices still leave edges free to bow, so `preserveVertices: true`
  actually produces a *larger* bbox wander. The discriminating metric is the distance from each
  nominal corner to the nearest point the pen visits — 0.6 to 2.0px free, exactly 0.00 pinned.
- **Size-aware taper is mandatory, not polish.** rough.js wobble amplitude is an absolute pixel count,
  so parameters tuned on a 190×52 button destroy a 20×20 checkbox. `taperForSize()` applies it
  centrally so no caller has to remember.
- **The 12-seed pool is a viability requirement.** 500 components with unique seeds cost 110ms of
  generation and roughly seven dropped frames; from the pool, 1.6ms.

---

## Responsiveness law

- Every component works at **any width from 375px (iPhone SE) upward**. 375 is a hard floor, not a
  target.
- **No horizontal overflow at any breakpoint.** Verified as `scrollWidth <= clientWidth` on the
  document element, not by eye.
- **44px minimum touch target** on anything interactive. This is a **house rule, stricter than the
  law.** WCAG 2.2 Level AA is 2.5.8 at 24×24 CSS px; the 44×44 figure is 2.5.5, Level **AAA**, and
  matches Apple HIG. Button `md` and `lg` clear it. `sm` at 36px is AA-conformant and fails only this
  rule, which is why it is dense-desktop-only rather than a compliance defect.
- **Strokes wander up to 13.81px past the nominal box** and the sketch SVG is `overflow: visible` by
  design. The gap floor between two drawn frames is **24px**, page padding **12px** — see
  `DESIGN-SYSTEM.md` §3 for the measurement behind both.

  The figure was recorded as "roughly 9px" until 2026-08-03 and was wrong twice over: it came from a
  comment measuring bezier **control** points, which bound a curve without lying on it, and it
  covered only the default hand in light mode. Re-measured across 4 hands × 2 chalk states × 60
  seeds, 9px understates the global worst by 46%.

---

## Accessibility law

- Keyboard reachable, in a sensible order, with **visible focus** at every breakpoint.
- **WCAG AA contrast**, including ink over every hachure fill level, measured **worst-pixel** — the
  glyph landing on a hatch line, not the area average. WCAG gives no rule for patterned backgrounds,
  so this is a deliberate project choice; the area-average reading would have passed a combination
  that is visibly hard to read. Every locked ratio is in `DESIGN-SYSTEM.md` §1.
- **No automated tool enforces the worst-pixel rule.** axe samples a flat computed background and
  never sees the hatch line. An axe pass going green on a combination `DESIGN-SYSTEM.md` forbids is
  expected, and is never grounds for relaxing a number there.
- **Zero axe criticals.** axe has run once by hand — cycle 000b, `@axe-core/cli` 4.12.1 — and found
  real violations. What is still missing is axe running automatically in CI across the matrix.
- `prefers-reduced-motion` honoured. For `drawOn` the dash must be reset alongside the animation, or
  strokes freeze at their hidden start value and the frame never appears at all.
- `forced-colors` honoured. Fallback rules live **unlayered** in the stylesheet on purpose, because
  unlayered rules outrank every layer.
- **Colour never carries meaning alone.** Structurally enforced by highlighter being background-only,
  and by the founder decision of 2026-08-03 that **a role colour is emphasis, never the sole signal**.

  Binding on every component: anything using `danger`, `warning`, `success`, `info` or `accent` must
  carry the same information in text or a drawn mark. **A variant distinguished by colour alone is a
  defect regardless of its contrast ratio.**

  This is not only an accessibility position, it is what makes the hachure usable. A `low` hachure
  renders at 1.19:1 to 1.31:1 against paper, and the theoretical ceiling at that opacity is 1.78:1 for
  pure black — so a hachure that had to carry state could never pass 1.4.11's 3:1 at `low`, for any
  colour. Full working in `DESIGN-SYSTEM.md`.
- Native semantics first. Checkbox keeps a real `<input type="checkbox">` in the DOM, transparent and
  positioned over the drawn box, so behaviour is the platform's rather than reimplemented.

---

## Design references

Use the installed skills rather than inventing principles.

- **`ui-ux-pro-max`** — searchable database of styles, palettes, font pairings, UX guidelines, motion
  presets. Invoke with the **absolute path**:

  ```
  python "/Users/atharvvani/Developer/libararies/js/handcraft-ui/.claude/skills/ui-ux-pro-max/scripts/search.py"
  ```

  The skill's own docs say `${CLAUDE_PLUGIN_ROOT}/...`, which is **empty for project-scoped skills**.
  Using the documented form returns nothing and fails silently. Always assert the search returned rows
  before trusting it; report zero rows rather than substituting invented guidance.

- **`frontend-design`** — aesthetic direction and the writing section that `VOICE.md` derives from.
- **`accessibility`** — WCAG 2.2 audit checklist, plus `references/WCAG.md` and
  `references/A11Y-PATTERNS.md`.
- **`migrate-radix-to-base`** — required reading before any Base UI component, because most shadcn
  reference code is Radix-based and needs translating.

---

## Escalation

Every agent ends its output with `STATUS: DONE | BLOCKED | DECISION-REQUIRED`.

```
DECISION-REQUIRED
question:      <one sentence, ends with ?>
why-blocked:   <why this is not a routine judgment call>
options:
  - label:       <1-5 words>
    consequence: <what this choice commits us to>
recommendation: <label>
```

**Threshold.** Escalate only when the options lead to materially different work *and* the answer is
not derivable from this doctrine, the codebase, or a locked decision. Routine judgment calls get made
and noted in the cycle file. Packets failing this test are rejected and the agent is re-dispatched
with "decide it".

**If the founder is unavailable, the cycle parks.** Never proceed on a guess.

Always `DECISION-REQUIRED`, never a judgment call:

- Any new dependency, or any version change to an existing one. Base UI is locked at v1.6.0.
- Any new import in `registry/default/**` beyond `react` and `@handicraft/core` — the registry derives
  its user-facing `dependencies` from imports, so a stray import becomes an install requirement.
- Any change to the engine invariants above.
- Anything that would break a locked aesthetic decision.

---

## Briefs — the founder approves before anyone builds

**No implementation starts on an unapproved brief.** The architect writes it, the founder reads it,
and `hc-dev` is dispatched only after approval. This is the merge rule one step earlier in the cycle,
and it exists for the same reason: an architect ACCEPT answers "is this correct", not "is this what
the founder wants built".

The reason is on the record. In cycle 1 the architect's brief carried a frame count that was wrong by
two, and a `separator.tsx` class list holding both `h-full` and `self-stretch` — mutually exclusive
in flexbox, because an explicit height suppresses `align-self: stretch`. Dev built both faithfully,
which is exactly dev's job. Both were caught, but only after the code was written, tests were built
on top of it and a full QA pass had run. That is the most expensive place to find a brief error.

### What a brief must carry

- **Every number carries its derivation.** Not "31 frames" but "19 baseline + 7 badges + 5
  separators = 31; the 2 inputs are already inside the baseline". A number without its arithmetic is
  not reviewable, and the wrong frame count survived review precisely because nobody could check it.
- **Every file path exists or is marked NEW**, cited from `.claude/state/INDEX.md`.
- **What is deliberately out of scope**, and which cycle takes it instead.
- **The one thing the founder should push back on.** Every brief has a weakest decision. Name it
  rather than letting the reviewer hunt for it.
- **Ordered steps stay in plain prose.** Order-sensitive instructions are the case the caveman
  skill's own Auto-Clarity rule flags, and a build sequence is exactly that case.

The founder approves, amends, or rejects. A brief waiting for review is the system working, not a
stall to be cleared.

---

## Merging — the founder merges, nobody else

**No agent and no automation merges a pull request. Ever.** Not the main thread, not a subagent, not
on a green CI run, not after an architect ACCEPT. The merge button belongs to the founder alone.

This is not a formality. An architect ACCEPT means the work meets the cycle's Definition of Done. It
does not mean the founder wants it in the product. Those are different questions and only one person
answers the second.

The sequence is fixed:

1. Work is committed to a branch and pushed.
2. A pull request is opened, and CI must be green before it is presented.
3. The pull request is **presented to the founder for review**, who asks whatever they want about it.
4. The founder merges. Or does not.

Between steps 3 and 4 the work waits. There is no timeout, no default-to-merge, and no "it was green
so it went in". A pull request sitting unmerged is the system working, not a stall to be cleared.

### Pull request descriptions

The description is what the review happens against, so it carries the weight. Requirements:

- **Structured as pointers**, not prose paragraphs. A reviewer scans first and reads second.
- **Every non-obvious claim carries its example** — the actual number, the actual measurement, the
  before-and-after, the exact `file:line`. "Fixed the measurement bug" is not reviewable. "Measured
  10% off at `scale(0.9)` and 50% at `scale(0.5)`; reads 0% at both after the fix, against two
  independent instruments" is.
- **State what was deliberately NOT done**, and why. Findings routed to a later cycle get named here
  rather than discovered later.
- **Name the risk you would ask about** if you were reviewing rather than writing it. Anything that
  needed a judgment call belongs in the description, not buried in a commit body.
- Show code or output where it settles the point faster than a sentence would.

A description that would let a reviewer approve without understanding the change has failed, no
matter how green the CI.

---

## Single writer per file

| Path | Sole owner |
|---|---|
| `registry/default/**`, `packages/core/src/**` | `hc-dev` |
| `**/*.test.ts`, `**/*.test.tsx` | `hc-qa` |
| `.claude/state/INDEX.md` | `hc-dev` |
| `.claude/cycles/NNN-*.md` — brief and verdict | `hc-architect` |
| `.claude/cycles/NNN-*.md` — findings section | `hc-qa` |
| docs and content files | `hc-writer` |
| `.claude/doctrine/**` | nobody — founder-approved, main thread writes |

---

## Related

- `.claude/doctrine/CODE-CONTRACT.md` — how components are written
- `.claude/doctrine/QA-CONTRACT.md` — what "verified" means
- `.claude/state/INDEX.md` — what exists and where
- `TESTING.md` — the human testing walkthrough
