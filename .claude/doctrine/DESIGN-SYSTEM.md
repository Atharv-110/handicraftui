# Handicraft UI — Design System

Locked by the founder on 2026-08-03, from `hc-planner`'s research. Caveman `lite`.

**Every value here is founder-locked. Changing one is `DECISION-REQUIRED`.**

This exists because the same defect was found three times in three cycles and filed as three
unrelated bugs. Button `danger` failing AA, Badge `marked` dropping from `med` to `low`, and the
playground `h2` at 2.93:1 are one missing system, rediscovered by hand each time. A fourth
rediscovery is already in the code: Button `primary` is Badge `marked` again, same number, same
cause, fixed for Badge alone because there was nowhere to write the rule down. This file is that
place.

---

## How contrast is measured here

**Worst pixel, not area average.** A hachure is a set of drawn lines with gaps between them. The
binding case for text is the glyph pixel landing *on* a hatch line, not in a gap.

WCAG 2.x measures contrast "with respect to the specified background over which the text is rendered
in normal usage" and **gives no rule for patterned backgrounds**. So worst-pixel is a project choice,
not a spec requirement — and it is chosen deliberately, because the area-average reading would have
passed Badge `marked` at `med`, which is visibly hard to read.

**Consequence QA must know: no automated tool will enforce this.** axe and every other checker sample
a flat computed background and never see the hatch line. An axe pass going green on a combination
this file forbids is expected behaviour, not a bug, and **must not be used to relax a number here.**

Model: a hatch line is `fillColor` at `FILL_LEVELS[level].opacity`, composited source-over in
gamma-encoded sRGB. Calibrated against the three filed measurements and reproducing all three within
0.01 (3.56 / 3.64 / 2.92 against filed 3.56 / 3.64 / 2.93).

### Which WCAG rule applies to what

| Surface | Rule | Floor |
|---|---|---|
| Label text on a hachure | 1.4.3 | 4.5:1, or 3:1 if large (≥24px, or ≥18.5px bold) |
| The hachure itself, when decorative | 1.4.11 exempt | none |
| The hachure itself, **when it distinguishes a state** (checked, selected, disabled) | 1.4.11 | 3:1 |
| Button's frame stroke | 1.4.11, optional | none — the label identifies the control |
| **Input's frame stroke** | 1.4.11 | 3:1 — an empty field has no other visible content. Currently 15.46:1 light, 12.98:1 dark |

**Touch targets: 44px is AAA, not AA.** WCAG 2.2 Level AA is 2.5.8 at **24×24 CSS px**. The 44×44
figure is 2.5.5, Level **AAA**, and matches Apple HIG. This project holds itself to 44px by choice.
Say so rather than implying it is the legal floor — the distinction decides whether a 36px control is
a compliance failure or a house-style exception.

---

## 1. Semantic colour roles — two-tone, ceiling `low`

Each role carries **an ink value and a fill value, per theme**. Role-tinted text is legal over that
role's own hachure **up to `fill: "low"`** and no further.

```
role     theme  ink                            hex       fill                           hex
danger   light  oklch(50.92% 0.1761  27.04)    #B52A27   oklch(66.92% 0.1843  27.05)    #F15D53
danger   dark   oklch(68.48% 0.1735  27.11)    #F2675C   oklch(54.45% 0.1882  26.96)    #C62F2C
warning  light  oklch(50.02% 0.0899  74.96)    #815B1F   oklch(65.44% 0.1175  75.07)    #BA8531
warning  dark   oklch(68.60% 0.1230  75.17)    #C68E35   oklch(52.60% 0.0943  75.34)    #8A6222
success  light  oklch(48.10% 0.1132 149.69)    #226F39   oklch(63.54% 0.1491 149.81)    #36A357
success  dark   oklch(66.10% 0.1554 149.83)    #39AC5C   oklch(50.85% 0.1190 150.09)    #25783F
info     light  oklch(49.41% 0.1388 255.26)    #2061AE   oklch(65.06% 0.1616 255.04)    #4290EF
info     dark   oklch(68.00% 0.1459 254.99)    #559AF0   oklch(52.49% 0.1463 254.85)    #236ABC
accent   light  oklch(51.02% 0.1731  10.02)    #B2294F   oklch(67.53% 0.1873  10.10)    #F25A7C
accent   dark   oklch(69.01% 0.1744  10.23)    #F26582   oklch(54.98% 0.1871  10.04)    #C52E58
```

**Full precision is load-bearing, not pedantry.** This table shipped once with the lightness rounded
to whole percent, and the two columns were then different colours: 15 of 20 disagreed, and **5 of the
10 fills dropped below the 1.4.11 3:1 floor** — `warning` light 2.97, `warning` dark 2.94, `success`
light 2.96, `info` dark 2.96, `accent` light 2.96. Every value above round-trips byte-exact to its
hex. Never re-round them, and never write a token from the hex and a comment from the oklch or the
two will drift apart again.

Every one of the ten cells satisfies all four constraints simultaneously: role ink ≥4.5:1 on paper ·
role ink ≥4.5:1 over its own `low` fill · neutral ink ≥4.5:1 over that fill · fill ≥3:1 against paper
for 1.4.11. **Worst cell in the set is 4.50:1.** Chroma is clamped to the sRGB boundary so nothing is
silently clipped by the browser.

**Dark mode inverts the ink/fill lightness relationship** — the fill goes *darker* than the ink. That
is correct for chalk on slate and is not a colour inversion of the light set. Do not "fix" it.

### Two different ceilings, do not confuse them

- **Role-tinted text over its own fill: `low`.** The decision above.
- **Neutral ink over a role fill: `med`** for every role, `high` for `default`, `low` for `marked`.

Neutral ink has far more headroom. Measured, ink over each fill:

```
fill token          light  no/low/med/high        dark  no/low/med/high       ceiling
ink-faint (default) 15.46 12.39  9.52  7.64      12.98  9.69  6.71  5.05      high
danger              15.46 10.47  6.60  4.59      12.98  9.24  5.80  4.04 X    med
success             15.46 11.47  8.04  5.99      12.98  8.41  4.93  3.34 X    med
biro (info)         15.46 10.78  6.90  4.69      12.98  8.51  5.08  3.48 X    med
red (accent)        15.46 10.80  7.06  5.04      12.98  9.19  5.76  4.02 X    med
highlighter         15.46 14.80 14.16 13.74      12.98  7.22  3.64 X 2.29 X   low
```

**Dark mode always caps one level below light**, so every ceiling is the minimum of the two. Badge
independently reached exactly these numbers for `default`, `danger` and `marked` in cycle 1 — the
table reproduces its conclusions without being told them.

**`ink-soft` caps at `low` over every role fill.** Card's description is `text-hc-ink-soft text-sm`,
so any role-filled Card is already at `low` regardless of what it asks for.

### Bugs this closes, all currently live

| Fix | Detail |
|---|---|
| `--hc-red` and `--hc-danger` collapse into one | Perceptual distance 0.0234; a just-noticeable step is ~0.02. Two names, one colour |
| `--hc-ink-faint` is declared **fill-only, never text** | 2.92:1 on paper, 3.04 raised, 2.72 sunken — fails as text, fine as fill. One token doing two jobs with two floors. Root cause of the `h2` bug |
| `--hc-success` replaced | 4.10:1 light, fails AA. Unused today only because Badge deferred a `success` variant |
| `--hc-focus` moved inside sRGB | `oklch(52% 0.19 255)` has red channel −0.0108 and is silently clipped to `#0065D2`. Its own comment claims 3:1 against ink; it measures 2.96:1 light, 1.80:1 dark |
| Button `primary` drops `med` → `low` | Ink over highlighter at `med` is 3.64:1 in dark mode. Identical to the Badge `marked` defect |
| Button `danger` pins its tier-2 stroke to ink | Tier 1 fixes the pseudo-element stroke to `--hc-ink`; tier 2 resolves `currentColor` against the tinted element, so the stroke colour flips at handover. Fixed with `stroke`, **not** by dropping the tint — see the rule below |

### Any component that tints its text passes `stroke`

**A component using a role `ink` on its text must pass `stroke: "var(--hc-ink)"` to
`useSketchFrame`.** Not optional, and not a per-component judgment call.

Tier 1 pins the pseudo-element stroke to `--hc-ink` in CSS. Tier 2 resolves `currentColor` against
the element, which a tinted component has changed. Without an explicit `stroke` the frame is one
colour before hydration and another after, and the flip is visible at every page load.

`useSketchFrame` already accepts `stroke?: string` and threads it to the generator, so this costs one
line per component and no engine work.

This rule is written here rather than in the components on purpose. Badge worked out the equivalent
rule for its own `marked` variant in cycle 1, had nowhere to record it, and Button `primary` shipped
the identical 3.64:1 defect as a result. A rule that lives in one component's comments is a rule that
gets rediscovered.

**`--hc-focus`'s "3:1 against ink" requirement is itself unresolved.** At `outline-offset: 3px` the
ring sits on paper, where it measures 5.22:1 light and 7.21:1 dark. Whether the stated requirement is
the right one is an open question, flagged and not decided here.

---

## 2. Type scale — two scales plus a named exception list

**The x-height hypothesis was wrong and is recorded so it is not re-derived.** Kalam's x-height ratio
is 0.526 against Inter's 0.546 — at 14px that is 7.36px against 7.64px, a 0.28px difference. The hand
face does *not* fail because it is small.

**It fails because of hachure interference.** `FILL_LEVELS` gaps are 9 / 5.5 / 5px and chalk
multiplies them by 1.3. Hatch lines crossing a glyph's x-height band, hand face:

```
 px   x-height    low     med    high   med+chalk
 12     6.31    0.70 !  1.15 !  1.26 !   0.88 !
 14     7.36    0.82 !  1.34 !  1.47 !   1.03 !
 16     8.42    0.94 !  1.53 !  1.68     1.18 !
 18     9.47    1.05 !  1.72    1.89     1.32 !
 24    12.62    1.40 !  2.30    2.52     1.77
 30    15.78    1.75    2.87    3.16     2.21
```

`!` marks the 0.7–1.6 band: roughly one line per glyph, landing mid-letter where it reads as a stem.
Above ~3 the texture averages into flat grey and stops imitating strokes. `fillWeight` is an absolute
pixel count that does not shrink with the text, so a 1.2px `med` hatch line is 16.3% of the x-height
at 14px and 7.6% at 30px.

### The rule

- **Display scale** — hand face, **18px and up**.
- **UI scale** — body face, 12–18px.
- **Exception list** — the hand face may appear below 18px in exactly three places: **badge text,
  label text, and button labels at any control-ramp size.** Nothing else. Adding a fourth is a
  doctrine amendment, not a component decision.

  The button entry covers `sm` (14px) and `md` (16px); `lg` is 18px and needs no exception. An
  earlier draft of this file said "button `sm` label", which was unsatisfiable — `button.tsx` carries
  `font-hand` on the root for every size, and `PRINCIPLES.md` locks buttons as a hand-face surface.
  Three locked statements, no two of which could all hold.

The exception list exists because all three are *tokens* — short, unwrapped, scanned as a shape
rather than tracked across a line. That is what "an all-handwritten UI fails at 14px in a table"
actually means. Making the list explicit is the point: today the same reasoning sits in three
unrelated component comments.

**The 0.7–1.6 interference band is a reasoned threshold from the geometry, not a measured legibility
result.** The arithmetic is exact; where the perceptual boundary truly sits needs a browser pass.
Recorded as unverified.

---

## 3. Spacing — 24px gap floor, 12px page padding

**This is a collision floor between two drawn frames, not a general spacing unit.** Non-framed
content — Label, plain text — has no stroke excursion and is not bound by it. Keep that distinction
explicit or every gap in the library inflates.

Two facing frames each contribute their own excursion, so the gap floor is 2× the chosen percentile.
Page padding is 1×, because only one frame faces the edge.

**The old ~9px figure was wrong twice.** It came from a comment measuring bezier **control** points,
which bound the curve without lying on it, and it covered only the default hand in light mode.
Re-measured with curves flattened to real on-curve points, half the stroke width added, perceptible
passes only, across 8 sizes × 4 hands × 2 chalk states × 60 seeds × 4 fill levels:

```
scope                              p50    p90    p95    p99    max
natural, light (default)           4.21   6.02   6.68   9.29   9.48
natural + chalk (default, dark)    4.26   7.23   8.52  11.28  12.11
all hands, both modes              4.51   8.11   9.02  10.76  13.81
```

9px is right for the default hand in light mode at p99. It understates `natural`+chalk by 28% and the
global worst by 46%. Worst cell is `loose` + chalk; even `steady` reaches 11.09.

**24px covers p99 across every hand and both themes**, sits on the 4px grid, and costs nothing in
density. It fails only where two `loose` frames put their worst excursions on facing edges at the
same position along the edge — rare, and the measurement is conservative because it takes the maximum
over the whole edge.

At 375px: 375 − 24 padding leaves 351px of content. A 2-column grid at a 24px gap gives 163px
columns.

---

## 4. Size ramps — two of them

**Control ramp**, for anything interactive:

| Size | Height | Padding-x | Type | Gap | Touch target |
|---|---|---|---|---|---|
| `sm` | 36px | 12px | 14px | 6px | **AA (≥24px). House rule is 44px, so `sm` is dense-desktop only** |
| `md` | 44px | 16px | 16px | 8px | AAA (≥44px) |
| `lg` | 48px | 24px | 18px | 10px | AAA (≥44px) |

**Token ramp**, for non-interactive marks — Badge today, plus Chip, Tag, Pill and Avatar-status when
they exist:

| Size | Height | Padding-x | Type | Touch target |
|---|---|---|---|---|
| `xs` | 24px | 8px | 14px | non-interactive |

**The touch-target column is a field, not a comment.** One of `AAA (≥44)`, `AA (≥24, spacing rule
applies)`, or `non-interactive`. That turns Button's prose caveat into something checkable.

### Why Badge gets its own ramp rather than an asterisk

Badge's `h-6` is a **geometry constraint wearing a size name**. 24px pins `min(w,h)` so `taperForSize`
returns k = 0.5454, which keeps corner pooling off below its `k > 0.55` gate — **a 0.2px margin**. Any
single ramp that assigns Badge a height silently switches four corner dots on. A second ramp makes
that a rule instead of a landmine.

### Current disagreements to fix

Heights already agree at `md` — Button, Input and Checkbox are all 44px. That is the ramp already
working. Two things do not agree:

- **Input padding-x is 12px**, should be 16px to match Button `md`.
- **Checkbox gap is 10px**, should be 8px to match Button `md`.

---

## 5. Elevation — two levels

**Paper stacking is decoration and cannot carry elevation.** Measured:

```
light   raised vs paper 1.04:1   sunken vs paper 1.07:1   raised vs sunken 1.12:1
dark    raised vs paper 1.13:1   sunken vs paper 1.10:1   raised vs sunken 1.24:1
```

Against a 3:1 floor for anything identifying a component. A Popover distinguished from the page only
by `paper-raised` is not distinguished. Paper tokens may accompany elevation; they may never be the
only signal.

Two levels, deliberately:

- **`on-page`** — the 3px zero-blur shadow offset already shipping. Reads as paper lifted off the
  page. Button's press state already moves onto it.
- **`over-page`** — a hachure scrim, plus the sheet's own ink frame. Everything in Base UI Wave B
  lands here.

Nested overlays **widen the scrim's hachure gap; they never double the darkness.**

**The scrim alpha is an aesthetic choice, not an accessibility constraint**, provided the sheet keeps
its frame — at 15.46:1 the frame alone identifies the sheet comfortably. Light mode would need
α ≥ ~0.47 for the sheet's *surface* to reach 3:1 against the scrim, which is not required. In dark
mode the binding constraint is different and real: past α 0.5, ink text placed *on* the scrim drops
to 3.04:1 and fails. Text on a scrim is the thing to watch, not the sheet.

**This item is the most speculative in this file and is deliberately the smallest.** Nothing in Wave B
exists yet. There is also no prior art — Excalidraw has no shadows at all (drop shadow is an open
request, excalidraw#7661) and tldraw abandoned the hand-drawn look. A third level gets added from
evidence when Tooltip-over-Popover is a real problem, not before.

---

## 6. Enforcement

The mechanism already exists: `styles/tier-agreement.test.ts` reads the stylesheet as text and asserts
constants match, because nothing in the type system connects a `.css` file to a `.ts` one.

- **`design-tokens.test.ts`** — asserts every role's contrast in both themes at its declared ceiling,
  **computed, not eyeballed**. Eyeballed contrast is what produced the original three failures.
- **A lint rule** rejecting raw spacing and type classes from outside the scales, and the hand face
  below 18px outside the three-item exception list.
- The exception list is enumerable on purpose. That is what makes it lintable, and it is why the
  two-scales option was chosen over the run-length rule that describes the physics better but cannot
  be checked.

---

## Known limits of the numbers in this file

Stated so nobody treats them as more settled than they are.

- **The compositing model is single-source.** It reproduces three prior measurements to 0.01, which is
  strong, but all three came from this project and possibly the same method. First browser or axe
  measurement disagreeing by more than 0.05 invalidates every ceiling in §1.
- **The excursion figures are engine-side, not rendered.** Antialiasing, `stroke-linecap: round` and
  the SVG's `overflow: visible` behaviour could each move real ink by a fraction of a pixel.
  Directionally conservative, so error should favour the floor.
- **Every dark-mode ratio inherits chalk's four uncalibrated constants** — dust stroke +2.6, opacity
  0.13, hachure gap ×1.3, ink opacity 0.92. They were held at shipped values throughout. Tuning them
  moves every dark-mode number here. No calibration cycle is assigned; this file is the reason to
  assign one.
- **Excalifont's metrics are unverified.** §2's table is Kalam's. If the font decision changes, §2's
  numbers move.

---

## Related

`.claude/doctrine/PRINCIPLES.md` · `.claude/doctrine/CODE-CONTRACT.md` ·
`.claude/doctrine/QA-CONTRACT.md` · `ROADMAP.md` §6.0
