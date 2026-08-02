# Handicraft UI — Voice

The standard every user-facing word is held to: documentation, landing page, component descriptions, API
reference, headings, errors, empty states. It is written in the voice it describes, so it is also its own
first example.

**The test it has to pass:** two people writing the same component description, working only from this
file, land in the same place. Where a rule below leaves room for two answers, the rule is unfinished —
that is a fix to this file, not a judgment call at the keyboard.

Scope: this governs the `hc-writer` carve-out named in `PRINCIPLES.md` — shipped prose. Reports between
agents stay caveman.

## Register

Plain, exact, unhurried. The register of a good manual written by the person who built the thing: it
explains a choice, gives the number behind it, and moves on. It does not sell.

In register:

- Tier 2 is the default. Tier 1 is the pre-hydration paint, the no-JavaScript fallback, and the opt-out
  for very large lists.
- `fill` is a ceiling, not a default. A component asks for what it needs and gets the lower of the two.
- 500 components generate in 1.6ms from the seed pool and 110ms without.

Out of register, same facts:

- Blazing-fast rendering with an intelligent two-tier fallback system.
- Powerful, flexible fill controls give you complete freedom over texture.
- We've obsessed over performance so you don't have to.

The difference is not enthusiasm. It is that nothing in the second set can be checked.

**Humour** is dry, structural and rare. It comes from the subject already being funny — a library where
the checkbox and its tick are drawn by the same hand — never from a joke laid on top. If a sentence would
be less clear without the joke, cut the joke.

## Person

- The reader is **you**, and only when they are being asked to do something: "Wrap your app in
  `HandicraftProvider`." Never "you'll love", never "you might be wondering".
- The library is **Handicraft UI**, or the specific thing under discussion — `Button`, the engine, tier 1.
- **Never "we"** in shipped copy. There is no team voice. In `CONTRIBUTING.md` the maintainer appears in
  the third person.
- Components are the subject of their own sentences: "Checkbox keeps a real `<input type="checkbox">` in
  the DOM." Not "we keep a real input".
- Instructions are imperative, with no softener: "Run `pnpm test`." Not "You can run", not "Simply run".

## Tense

- **Present simple for everything the library does.** "The taper applies centrally." "Tier 1 paints before
  hydration."
- **Past only for what was measured or decided**, and only where the history is the point: "Corners were
  pinned once, and the whole aesthetic went with them."
- **No future tense for the roadmap.** "Not built yet" — never "will ship", "coming soon", never a date. A
  thing exists or it does not.

## Naming

**A feature's name is its prop's name.** `hand` is `hand` in the API reference, the docs body, the landing
page, an error string and a section heading. A plain-language gloss follows the name once, then the name
does the rest of the work: "`hand` — the drawing personality: `steady`, `natural`, `loose`, `hurried`."

Never rename a prop into a phrase; `fill` is `fill`, not "texture density controls". Never name anything
from the build side: someone sets how dense a surface's fill is, nobody "configures the hachure
generator's parameters".

Where no prop exists, name the concept by the user's action or by the artifact they can see: the frame,
the tick, the margin rule, the handover.

Fixed spellings. These are the only accepted forms:

| Write                     | Never                                                                   |
| ------------------------- | ----------------------------------------------------------------------- |
| Handicraft UI, Handicraft | Handcraft — the repository folder is `handcraft-ui`; the product is not |
| `@handicraft/core`        | `@handcraft/core`                                                       |
| tier 1, tier 2            | Tier 1, T1, tier one                                                    |
| hand-drawn                | handdrawn, hand drawn                                                   |
| rough.js                  | Rough.js, RoughJS                                                       |
| roughViz                  | RoughViz, Roughviz                                                      |
| shadcn-style              | shadcn style, Shadcn-style                                              |
| blackboard dark mode      | dark theme, night mode                                                  |
| handover                  | hand-off, transition                                                    |

`hachure` is jargon and it stays, because it is what the code calls it and what rough.js calls it. Gloss it
on first use per document — "hachure, the scribbled fill that hatches a surface" — then use it plainly.

## The notebook vocabulary, and its budget

Ink, paper, pen, chalk, slate, margin rule, biro, highlighter, exercise book. This vocabulary is why the
library is memorable and it is available whenever it clarifies. `hand` really is a drawing personality;
the entrance animation really does lay down a pencil guideline before inking.

Three limits:

1. **The metaphor never replaces the mechanical fact.** State what it does, then what it looks like:
   "`rescribble` redraws the frame on hover and press, so the button looks re-inked" — not "your buttons
   come alive under the cursor".
2. **One metaphor per passage.** Ink, pen, paper and chalk in the same paragraph read as a theme rather
   than a description.
3. **Never extend it into a verb the API does not have.** No "scribble a form together", no "sketch your
   way to a design system". The API says `fill`, `hand`, `ink`, `drawOn`; the prose says the same words.

If a reader could finish a sentence holding the wrong mental model of what a prop does, the metaphor lost.
Cut it there.

## Numbers

Numbers are the argument. Use them in place of adjectives, and never round in the project's favour.

- **State the condition.** "The handover completes in 71ms in production, Fast 4G throttled." Not "the
  handover is fast".
- **Give the comparison where one exists.** "1.6ms from the 12-seed pool, 110ms without."
- **Digits with units, no space**: `1.6ms`, `44px`, `375px`, `2.4px`. Dimensions take `×`: `190×52`.
- **Digits for counts**: 4 of 21 components, 85 tests, 12 seeds. Reword rather than open a sentence with a
  digit.
- **Never invent one.** If a claim needs a number nobody has measured, write `<NEEDS-NUMBER>` in its place
  and raise it in the report. A plausible number is the worst thing that can go in this copy — the whole
  voice runs on the reader trusting the numbers that are real.

## Sentence case and mechanics

- **Sentence case everywhere**: headings, buttons, labels, table headers, navigation. Proper nouns keep
  their case — React, Next.js, TypeScript, Tailwind, Base UI, MIT, rough.js, roughViz, Handicraft UI.
- **Code identifiers keep their exact case and always take backticks**: `fill`, `drawOnDuration`,
  `HandicraftProvider`, `useSketchFrame`, `SketchMark`, `@handicraft/core`.
- **Headings never end in a full stop.** A heading is a label; if it needs a full stop it is a sentence in
  the wrong place.
- **British spelling in prose** — colour, behaviour, licence, normalise, recognise. **American spelling
  wherever it is code** — `color`, CSS properties, prop names. One sentence may legitimately hold both:
  "the `color` prop sets the tick's colour."
- Serial comma. Em dash with spaces — like this — not en dashes, not double hyphens.
- No exclamation marks. No emoji. No capitals for emphasis.
- Bold marks the one clause a skimming reader must not miss, once or twice per section. Italics only for a
  term being defined.
- One idea per sentence, one job per element. A label labels, an example demonstrates, and a caption does
  not quietly introduce a second feature.

## Errors

An error's job is to leave the reader knowing what to do next. Three parts, in this order:

1. **What happened**, naming the actual identifier.
2. **What the library did instead** — the fallback, where there is one.
3. **The fix**, as one instruction.

Rules: present tense, active voice, no apology, no "oops", no "something went wrong", no exclamation mark.
Never blame the reader — state the condition, not the omission. Name the component or prop exactly as the
API does. Never be vague about what happened; "invalid configuration" is not an error message.

The shape, illustrative rather than shipped strings:

> Checkbox found no `HandicraftProvider` above it and is drawing with the default hand. Wrap the app in
> `HandicraftProvider` to set `hand`, `ink` and `fill` in one place.

> `fill="huge"` is not a fill level. Use `no`, `low`, `med` or `high`.

Not:

> Sorry! Something went wrong while configuring the geometry generator.

## Empty states

An empty screen is an invitation. Say what belongs there and the one action that puts it there. No mood,
no "nothing to see here", no illustration doing the talking.

> No components match "acccordion". Accordion is not built yet — 4 of 21 are. Clear the search to see the
> four that exist.

## Component descriptions — the recipe

Every component description, wherever it appears, is three sentences in this order:

1. **What it is, from the reader's side.** Present tense, names the element and what the user does with it.
2. **What is different about it here.** Tied to one named prop or one measured behaviour — never to an
   adjective.
3. **The default or constraint that would otherwise surprise someone.**

Worked example, Checkbox:

> A checkbox with a drawn box and a drawn tick. The tick is a `SketchMark`, so it shares the box's seed,
> hand and size taper — tick and box look like one drawing rather than an icon dropped into a frame. The
> whole label row is the 44px touch target while the box itself stays 20px, because growing the box would
> pull it out of the stroke range these parameters were tuned for.

Rejected, same component:

> A beautifully hand-drawn checkbox that brings personality to your forms. Fully accessible and endlessly
> customisable.

Nothing in the rejected version can be checked, and it tells a reader nothing they had not already assumed.

## What this project never says

**Marketing vocabulary**: blazing fast, buttery smooth, seamless, effortless, magical, delightful,
beautiful or gorgeous about our own work, powerful, robust, revolutionary, game-changing, next-generation,
cutting-edge, best-in-class, production-ready.

**Filler**: simply, just, easy, quickly, obviously, of course, basically, actually, in order to, leverage,
utilise, under the hood, at the end of the day.

**False company**: we, our team, join thousands of developers.

**Anything unverified**: a capability not in `INDEX.md`, a number nobody measured, an accessibility claim
with no audit behind it, "fully accessible", "works everywhere", "zero config".

**Anything unkind**: no other library is bad. roughViz is the reference point and the bar, named
respectfully and factually. Compare on mechanism, never on merit — "rough.js pins corners by default; this
engine does not" is a fact; "other hand-drawn libraries look fake" is not ours to say.

**And "Handcraft".** The folder is `handcraft-ui` for historical reasons. The product is Handicraft UI in
every word a reader sees.

## Two standing honesty rules

1. **Nothing gets documented that does not exist.** Check `.claude/state/INDEX.md` before writing about a
   component. Four of 21 are built; prose reading as though the other 17 ship today is a defect, not
   optimism.
2. **No install instruction until one works.** `@handicraft/core` is 0.0.0 and unpublished, the registry is
   not hosted, `handicraftui.dev` is not registered. An instruction that fails costs more than an honest
   absence.

## Where this voice does not apply

Reports to other agents, cycle documents, briefs and findings are caveman at level `full`, per
`PRINCIPLES.md`. The artifact is prose; the status line is caveman. Shipped code comments are prose too,
but follow `CODE-CONTRACT.md`'s why-not-what convention rather than this file.
