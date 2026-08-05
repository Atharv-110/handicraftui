import { cn } from "@handicraft/core/utils";
import { HandicraftProvider, type FillLevel } from "@handicraft/core";
import { parseHcParams } from "../hc-params";
import { Specimen, type SpecimenId } from "./specimens";

// Duplicated from `specimens.tsx`'s own `SPECIMEN_IDS`, not re-imported —
// `specimens.tsx` carries "use client", and a Server Component importing a
// plain runtime value (not a component) from a client module gets an opaque
// client reference rather than the real array: `SPECIMEN_IDS.find` throws
// `TypeError: ... .find is not a function` at request time, measured while
// building this route. The *type* crosses the boundary fine — `type
// SpecimenId` above is erased at compile time — so only the runtime list is
// copied here, kept to the same seven literals as the switch in
// `specimens.tsx`.
const SPECIMEN_IDS: readonly SpecimenId[] = [
  "button",
  "badge",
  "card",
  "checkbox",
  "input",
  "separator",
  "label",
];
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
    <main
      className={cn(hc.dark && "dark")}
      // Functional, not introspection — `handicraft.css:513` keys the
      // turbulence filter off this exact attribute on any ancestor
      // (`[data-hc-texture="on"]`), the same mechanism `harness.tsx:98`
      // already relies on. `data-hc-cell-texture` below is a different
      // thing: it only echoes the parsed state for a test to read, and
      // carries no CSS meaning of its own — CODE-CONTRACT.md's warning about
      // `data-hc-fidelity` already meaning something on a frame applies here
      // too, so the two names stay apart on purpose.
      data-hc-texture={hc.texture ? "on" : undefined}
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
    </main>
  );
}
