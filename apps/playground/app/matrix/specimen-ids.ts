/**
 * `SPECIMEN_IDS` and `SpecimenId` — cycle 004 iteration 2, fix F7. A plain
 * module, no "use client", so both a Server Component and a client one can
 * import the runtime array directly.
 *
 * Before this file existed, `matrix/page.tsx` duplicated the seven-literal
 * list by hand rather than importing it from `specimens.tsx`, because
 * `specimens.tsx` carries "use client" and a Server Component importing a
 * plain runtime value (not a component) from a client module receives an
 * opaque client reference instead of the real array — measured live as
 * `TypeError: ... .find is not a function` at request time, every
 * navigation, the one time the direct import was tried.
 *
 * The duplication was itself a defect, not a fix: it is the exact
 * two-homes-for-one-value shape this project keeps a rule against
 * (`--hc-red`/`--hc-danger`, the tier-1/tier-2 constants, `--hc-shadow`
 * declared inside `:root` only). It also left two drift directions between
 * this list and `specimens.tsx`'s `switch (c)`, closed by two different
 * mechanisms — an earlier version of this comment named one direction and
 * justified it with the other's mechanism, which read as one closure when
 * only one was covered. Separated here so each is labelled on its own:
 *
 * **Direction 1 — a switch case naming an id not in this list.** Closed by
 * this file's existence. `SpecimenId` derives from `SPECIMEN_IDS`
 * (`(typeof SPECIMEN_IDS)[number]`), so a `case` for a literal outside that
 * union fails to narrow against `SpecimenId` and `tsc` raises `TS2678` —
 * verified live, `pnpm build` fails at exactly that error the moment such a
 * case exists without the id (`matrix.spec.ts`'s M1a is the reachable proof).
 *
 * **Direction 2 — an id added to this list with no matching switch case.**
 * Closed by `specimens.tsx`'s `renderSpecimen` carrying an explicit
 * `ReactElement` return annotation (cycle 004 iteration 3, F11): under this
 * repository's `strict: true` a switch that is not exhaustive over its
 * narrowed union, with no return past it, then fails to satisfy the
 * annotation and `tsc` raises `TS2366` — verified live against
 * `@types/react` with `--strict --verbatimModuleSyntax`. Before that
 * annotation existed, a missing case silently inferred
 * `Element | undefined`, `undefined` is valid JSX, and `matrix.spec.ts`'s M1
 * iterates `MATRIX_CELLS`'s components rather than this list, so nothing
 * caught the gap — an id added here with no switch arm rendered silently
 * blank the day a grid cell finally referenced it, which is exactly what
 * `matrix.spec.ts`'s M1d mutation reproduces.
 */
export const SPECIMEN_IDS = [
  "button",
  "badge",
  "card",
  "checkbox",
  "input",
  "separator",
  "label",
] as const;

export type SpecimenId = (typeof SPECIMEN_IDS)[number];
