# Handcraft UI — Principles

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

## Communication protocol — caveman

All internal natural language is caveman, level `full`. Conversation, briefs, findings, cycle
documents, manifests, agent-to-agent handoffs. Follow the skill at
`.claude/skills/caveman/SKILL.md`, including its own `Boundaries` and `Auto-Clarity` sections.

Two rules from the skill that are easy to get wrong:

- **Never invent abbreviations** (`cfg`, `impl`, `req`, `fn`). The tokenizer splits them identically
  to the full word: zero saving, worse decoding. Standard acronyms (DB, API, HTTP) are fine. No `→`
  arrows — they cost a token and save nothing.
- Technical terms, code blocks, API names, CLI commands and exact error strings stay verbatim.

### Four carve-outs — normal prose, no exceptions

Each exists because compression there destroys something unrecoverable.

1. **Shipped code comments** in `registry/default/**` and `packages/core/**`. These files install into
   users' repositories. The dense why-not-what comment style is a product feature. Caveman in shipped
   source is a defect that stays invisible until a stranger reads it.
2. **All `hc-writer` output** — docs, landing copy, component descriptions, error and empty states. It
   is the product's voice. Writer reports to the team in caveman; writer output never is.
3. **Project memory** at `~/.claude/projects/-Users-atharvvani-Developer-libararies-js-handcraft-ui/memory/`.
   Memory holds verbatim statute, invariants and exact error strings.
4. **Root-cause diagnosis and evidence chains.** The evidence is the value. Report the verdict in
   caveman, keep the chain in prose.

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
- **44px minimum touch target** on anything interactive. Button `md` and `lg` already clear it; `sm`
  is explicitly for dense desktop toolbars only.
- Strokes wander up to roughly 9px past the nominal box and the sketch SVG is `overflow: visible` by
  design. Audit padding and grid gaps at every breakpoint, or frames collide with neighbours at tight
  gaps.

---

## Accessibility law

- Keyboard reachable, in a sensible order, with **visible focus** at every breakpoint.
- **WCAG AA contrast**, including ink over every hachure fill level. At `med` and `high`, body copy
  over the texture is measurably harder to read — this is why per-component fill intent exists.
- **Zero axe criticals.** No axe run has ever happened on this project; the first QA cycle changes
  that.
- `prefers-reduced-motion` honoured. For `drawOn` the dash must be reset alongside the animation, or
  strokes freeze at their hidden start value and the frame never appears at all.
- `forced-colors` honoured. Fallback rules live **unlayered** in the stylesheet on purpose, because
  unlayered rules outrank every layer.
- **Colour never carries meaning alone.** Structurally enforced by highlighter being background-only.
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
- Any new import in `registry/default/**` beyond `react` and `@handcraft/core` — the registry derives
  its user-facing `dependencies` from imports, so a stray import becomes an install requirement.
- Any change to the engine invariants above.
- Anything that would break a locked aesthetic decision.

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
