import { HandicraftProvider, HandicraftSurface, type FillLevel } from "@handicraft/core";
import { parseHcParams } from "../hc-params";
import { Specimen } from "./specimens";
// Fix F7, cycle 004 iteration 2. The direct import from `specimens.tsx`
// still fails the same way — that file carries "use client" and this is a
// Server Component, and a plain runtime value crossing that boundary
// resolves to an opaque client reference rather than the real array. The fix
// is a plain module neither side owns, not a second hand-copied list: see
// `specimen-ids.ts`'s header comment for the duplication this replaces and
// the drift it left unguarded.
import { SPECIMEN_IDS } from "./specimen-ids";

const SFILLS: readonly FillLevel[] = ["no", "low", "med", "high"];

/**
 * One specimen per navigation — cycle 004 §3.3. A Server Component, mirroring
 * `page.tsx`'s shape: read `searchParams`, parse, render.
 *
 * `c` and `sfill` are matrix-only keys, parsed here rather than in
 * `hc-params.ts`. `sfill` drives the specimen's own `fill` prop — never the
 * shared `fill` key, which keeps its existing meaning everywhere else in
 * this repository: the provider's ceiling. Driving the fill axis through the
 * ceiling instead would collapse Button's four `sfill` levels to two
 * distinct renders (`capFill("high", "low")` and `capFill("med", "low")`
 * both land on `"low"`, since Button's `default` variant declares intent
 * `"low"`) — two duplicate baselines out of four. Keeping the two knobs
 * apart is what keeps every cell a distinct render.
 */
export default async function MatrixPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hc = parseHcParams(params);

  const cRaw = typeof params.c === "string" ? params.c : "";
  const c = SPECIMEN_IDS.find((id) => id === cRaw);

  const sfillRaw = typeof params.sfill === "string" ? params.sfill : "";
  const sfill = SFILLS.find((f) => f === sfillRaw);

  return (
    <HandicraftSurface
      as="main"
      dark={hc.dark}
      // Fix F1, cycle 004 iteration 2, made structural in cycle 005.
      // `.dark` sits on this element, so the themed paint has to sit here
      // too — `body { background-color: var(--hc-paper) }`
      // (`globals.css:14-17`) resolves outside `.dark` whenever `.dark`
      // lands on a descendant of `body`, which `<main>` always is. Measured
      // live at 1.1924:1 (chalk ink on light paper) before F1 existed;
      // `harness.tsx:62-63` never hit the defect because it puts `.dark` on
      // the *outer* div and the paint on an *inner* one. Painting this
      // element rather than adding a wrapper keeps the specimen's box
      // origin — and every committed light baseline's geometry — provably
      // unchanged: nothing is inserted into the tree. `--color-hc-paper` is
      // declared `@theme inline` (`handicraft.css:231`), which is what
      // makes `bg-hc-paper` resolve its `var()` against *this* element's
      // own computed custom properties rather than against `:root`'s.
      // `HandicraftSurface` (cycle 005) is what makes that coupling
      // structural instead of a convention held by hand across three call
      // sites: the class and the paint now come from one prop and one call,
      // so they cannot be applied separately the way this element and
      // `harness.tsx`'s once could, with no composed-token trap of the kind
      // that froze `--hc-shadow` in cycle 002c. `text-hc-ink` is not
      // decoration: the `separator` specimen's inline `<span>`s declare no
      // colour of their own and would otherwise inherit `body`'s light ink
      // — `HandicraftSurface`'s inline `color` carries that now.
      // `min-h-screen` is cosmetic only — it cannot move a block
      // container's first in-flow child, so it carries no risk to any clip.
      className="min-h-screen"
      // Functional, not introspection — `handicraft.css:513` keys the
      // turbulence filter off this exact attribute on any ancestor
      // (`[data-hc-texture="on"]`), the same mechanism `harness.tsx:98`
      // already relies on. `data-hc-cell-texture` below is a different
      // thing: it only echoes the parsed state for a test to read, and
      // carries no CSS meaning of its own — CODE-CONTRACT.md's warning about
      // `data-hc-fidelity` already meaning something on a frame applies here
      // too, so the two names stay apart on purpose.
      data-hc-texture={hc.texture ? "on" : undefined}
      // Deliberately the *raw* param, not the resolved `c` — for an unknown
      // id `c` is `undefined`, and echoing that would erase the only DOM
      // record of what was actually asked for, which is exactly what M2
      // checks. The other seven `data-hc-cell-*` keys below echo resolved
      // state; this one is the one exception, on purpose.
      data-hc-cell-component={cRaw}
      data-hc-cell-hand={hc.hand ?? "natural"}
      data-hc-cell-ink={hc.ink}
      data-hc-cell-fill={hc.fill ?? "med"}
      data-hc-cell-sfill={sfill ?? "na"}
      data-hc-cell-fidelity={hc.fidelity}
      data-hc-cell-dark={hc.dark ? "1" : "0"}
      data-hc-cell-texture={hc.texture ? "on" : "off"}
    >
      {/*
        `stress`, `drawOn` and `drawMs` are parsed by `parseHcParams` for
        parity with `/`, but none of the three reaches the provider below —
        on purpose, not by omission. `stress` is a harness-only concept with
        nothing here to gate. `drawOn` animates, and a screenshot gate cannot
        tolerate that: a cell captured mid-stroke is not a baseline. Stated
        here so a future reader does not file the missing wiring as a bug.
      */}
      <HandicraftProvider
        fidelity={hc.fidelity}
        texture={hc.texture}
        {...(hc.hand ? { hand: hc.hand } : {})}
        ink={hc.ink}
        {...(hc.fill ? { fill: hc.fill } : {})}
        chalk={hc.dark}
      >
        {c ? (
          <Specimen c={c} {...(sfill ? { sfill } : {})} />
        ) : (
          // Not `null`. A route rendering nothing for a bad id is
          // QA-CONTRACT.md's "a filter that matches nothing still exits 0"
          // in route form — 67 blank pages would baseline cleanly and prove
          // nothing was ever rendered.
          <p data-testid="hc-specimen-unknown">{cRaw || "(missing c)"}</p>
        )}
      </HandicraftProvider>
    </HandicraftSurface>
  );
}
