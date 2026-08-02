# Handcraft UI — Code Contract

How components are written here. Read by `hc-architect`, `hc-dev`, `hc-qa`. Caveman `lite`.

This describes the pattern as it **actually exists** in `registry/default/ui/button/button.tsx` and
`registry/default/ui/checkbox/checkbox.tsx`. Read one of those before writing a new component.

---

## Layout

```
registry/default/ui/<name>/<name>.tsx     one directory per component, one same-named file
registry/default/ui/<name>/meta.json      optional: { title?, description?, registryDependencies? }
```

No `index.ts`, no stories. Co-located tests are supported (`registry/default/**/*.test.tsx` is in the
vitest include glob) but none exist yet.

`packages/core` is the engine. Its public API is the **explicit barrel** at
`packages/core/src/index.ts` — every export is listed by name, there are no `export *` statements. A
new primitive is not usable until it is added there.

Second entry point `@handcraft/core/utils` maps to `src/utils.ts` and deliberately carries **no**
`"use client"`, so `cn()` and the engine stay callable during a server render.

---

## The authoring ritual

```tsx
"use client";                                    // line 1, before imports

import * as React from "react";                  // namespace import, always
import { cn, useSketchFrame, type FillLevel } from "@handcraft/core";

const VARIANTS = { ... } as const;               // plain object, NOT cva
const SIZES = { ... } as const;

export interface XProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;               // types derived from the objects
  fill?: FillLevel;
  ref?: React.Ref<HTMLButtonElement>;            // React 19: ref is a plain prop
}

export function X({ className, variant = "default", ref, ...props }: XProps) {
  const { frameProps, sketchLayer } = useSketchFrame({ ... });
  const { ref: frameRef, ...frameAttrs } = frameProps;

  return (
    <button
      {...frameAttrs}
      ref={composeRefs(frameRef as React.Ref<HTMLButtonElement>, ref)}
      className={cn("hc-frame ...", VARIANTS[variant], className)}
      {...props}
    >
      {sketchLayer}      {/* always the FIRST child, before children */}
      {children}
    </button>
  );
}
```

Rules embedded above, stated explicitly:

- **`"use client"` is line 1.** Without it the App Router treats the component as a Server Component
  and throws on the first hook.
- **Named imports from the bare specifier `@handcraft/core` only.** Never a relative path into
  `packages/core`, never a subpath. Types come in with an inline `type` modifier on the same line.
- **No `cva`, no `tailwind-variants`.** Neither is a dependency and neither may become one. Variants
  are `as const` objects; prop types derive via `keyof typeof`.
- **No `forwardRef`.** React 19, `ref` is a plain prop.
- **`.hc-frame` must be in the className** or the tier-1 CSS never applies.
- **`{sketchLayer}` is the first child.** It is absolutely positioned at `z-index: -1` inside an
  `isolation: isolate` context; placing it after content does not paint correctly.
- **`frameRef` always needs a cast.** `SketchFrameProps["ref"]` is typed
  `(node: HTMLElement | null) => void`.
- Use `composeRefs(frameRef, ref)` when the frame and the consumer ref land on the **same** element
  (Button). When they land on different elements (Checkbox: frame on the wrapper `<span>`, consumer
  ref on the real `<input>`), do not compose.
- **Conditional-spread idiom** for optional props, because `exactOptionalPropertyTypes` is on:
  `{...(rescribble !== undefined ? { rescribble } : {})}`. Never pass an explicit `undefined`.

---

## `useSketchFrame` options

`packages/core/src/frame/useSketchFrame.tsx`. Full surface:

```
shape  radius  fidelity  fill  fillColor  ink  roughness  bowing
strokeWidth  stroke  hachureAngle  chalk  rescribble  seedKey
```

- **`shape` defaults to `rect` (sharp).** Sharp tested visibly more drawn than rounded, because the
  stroke overshoots past the corner instead of easing around an arc. `rounded`, `pill`, `circle` and
  `underline` are opt-in.
- **`seedKey` pins geometry across state changes.** Checkbox passes `inputId` so checked and unchecked
  share one seed and ticking does not redraw the box. Any component whose state changes its `fill`
  needs this, or it will visibly re-scribble on interaction.
- **`fillColor` replaces the flat `bg-*` it used to carry.** The scribbled fill *is* the surface now;
  a flat background behind a hachure pass just muddies it.
- **`rescribble` is opt-in per component**, never a page default. Twenty things redrawing as a cursor
  sweeps a toolbar reads as noise rather than craft.

## `fill` is a ceiling, not a default

The component declares its **intent**; the provider sets the **ceiling**; the effective level is the
lower of the two, via `capFill()`. A page can flatten the whole UI with `fill="no"` but cannot force
cross-hatch onto a Card that decided its paragraphs must stay readable.

Current intents, driven by the readability finding (body copy over `med` or `high` texture is
measurably harder to read):

| Component | Intent |
|---|---|
| `Input` | `no` — the one surface where the user's own content must stay perfectly legible |
| `Card`, `Button` default/danger | `low` |
| `Button` primary, `Badge` | `med` |
| `Checkbox` checked | `low` — cross-hatch competes with the tick drawn on top of it |

A new component picks its intent from how much text sits on it. Paragraphs get `no` or `low`.

---

## Styling

- Tokens are `hc-`-prefixed Tailwind classes (`text-hc-ink`, `bg-hc-paper-sunken`, `font-hand`) and
  `var(--hc-*)` custom properties for anything handed to the engine.
- `cn` is clsx plus tailwind-merge, from `packages/core/src/lib/cn.ts`.
- **CSS layer order is load-bearing.** Tokens live in `@layer base`, the frame in `@layer components`
  (which Tailwind sorts before `utilities`), and focus / reduced-motion / forced-colors / print stay
  **unlayered** — unlayered rules outrank every layer, which is what a fallback needs. Never put frame
  styles in a private layer: a private layer declared after Tailwind's sorts after `utilities` and
  silently beats every consumer `bg-*`.
- `filter` does not inherit; custom properties do. Texture is switched on with
  `[data-hc-texture="on"] { --hc-texture-filter: url("#hc-wobble") }` plus
  `filter: var(--hc-texture-filter, none)` on the pseudo-elements, so any ancestor can enable it for a
  subtree.

## Tier agreement

Tier 1 (CSS) paints before **every** hydration, so the two tiers must agree visually or the handover
flashes on every page load. They deliberately share stroke weight (2.4px), near-square corners (1 to
5px radii) and hachure density.

Nothing in the type system connects a `.css` file to a `.ts` one, so
`packages/core/src/styles/tier-agreement.test.ts` reads the stylesheet as text and asserts the
constants still match. **Any change to stroke weight, corner radii or hachure gaps updates both sides
and that test.**

---

## Comment style — normal prose, never caveman

The repo convention is dense **why-not-what** comments justifying every non-obvious choice. These
files install into users' repositories via `shadcn add`; the comments are a product feature.

Good, from `checkbox.tsx`:

```tsx
// Ink, not paper. Hachure is a scribble, not a solid — a paper-coloured tick
// over it has almost nothing to contrast against and simply disappears.
```

Explain the choice and what was rejected. Do not narrate what the line does.

---

## Registry pipeline

`scripts/build-registry.ts`, run by `pnpm registry:build`.

It reads every directory under `registry/default/ui`, emits `registry/public/r/<name>.json` plus an
index, and **derives each item's user-facing `dependencies` by regexing the imports** — skipping
relative and `@/` specifiers, dropping `react` and `react-dom`.

Consequence: **any stray import becomes an install requirement for every user of that component.**
Any new import beyond `react` and `@handcraft/core` is a `DECISION-REQUIRED`, never a judgment call.

`registry/public/r/` is generated, gitignored and prettier-ignored. Never hand-edit it.

---

## Gates

Run from the repo root. All five, every time, before reporting.

```bash
pnpm test            # vitest, packages/core only package with a test script
pnpm typecheck       # turbo, forces ^build first
pnpm lint            # turbo run lint && eslint scripts
pnpm build           # turbo
pnpm registry:build  # tsx scripts/build-registry.ts
```

`test` and `typecheck` both depend on `^build`, so `@handcraft/core` is built by tsup first.

Formatting: `pnpm format` writes, `pnpm format:check` verifies. Prettier is `semi: true`,
`singleQuote: false`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`.

---

## Traps that have already cost this project time

- **Rebuilding core under a live dev server serves stale JS.** The playground consumes
  `@handcraft/core` as built `dist`, not source. CSS hot-reloads while the JS stays stale, so it
  presents as "tier 2 renders nothing" rather than as a cache error. After any core rebuild:
  `lsof -ti:4321 | xargs kill -9`, `rm -rf apps/playground/.next-dev`, restart.
- **`tsup` strips `"use client"`.** esbuild drops directives; the `banner` option did not survive
  either. `packages/core/tsup.config.ts` prepends it in an `onSuccess` step. Two entries exist on
  purpose — `index.ts` gets the directive, `utils.ts` deliberately does not.
- **`roughjs/bin/generator` cannot be loaded by Node** — extensionless internal imports fail ESM
  resolution. Use `roughjs/bundled/rough.esm.js`, which works in Node and bundlers alike.
- **React `useId` emits stride-8 tree positions** (`_R_9_`, `_R_h_`, `_R_p_` decode to 9, 17, 25).
  Feeding those into `% 8` collapsed a page onto 4 of 8 variants. Fixed with a MurmurHash3 finaliser
  on the FNV-1a output in `engine/seed.ts`.
- **Painting order.** Absolutely-positioned pseudo-elements and SVG paint above static content.
  `isolation: isolate` on `.hc-frame` bounds a stacking context; `z-index: -1` on the stroke layers
  paints them after the background but before the content.
- **roughjs is an optional peer dependency.** Tier 1 must keep working without it installed.

---

## Related

`.claude/doctrine/PRINCIPLES.md` · `.claude/doctrine/QA-CONTRACT.md` · `.claude/state/INDEX.md` · `TESTING.md`
