/**
 * The `/matrix` grid — cycle 004 §3.5.
 *
 * Cells are generated, not listed. A file of 67 literal records is a file
 * nobody re-derives; the four blocks below are the derivation, and the
 * arithmetic they produce is checked live by `matrix.spec.ts`'s M9, not
 * re-typed as a magic number anywhere else.
 */

export type Component = "button" | "badge" | "card" | "checkbox" | "input" | "separator" | "label";
export type Hand = "steady" | "natural" | "loose" | "hurried";
export type Fill = "no" | "low" | "med" | "high";
export type Tier = "high" | "lite";
export type Theme = "light" | "dark";

export interface Cell {
  component: Component;
  /** Fixed at "default" this cycle. ROADMAP §6.3 adds the other five and renames nothing. */
  state: "default";
  tier: Tier;
  /** `null` where the axis does not apply: tier 1 emits no hand, Label has no frame. */
  hand: Hand | null;
  /** The specimen's own `fill` prop. `null` for the five components that expose none. */
  sfill: Fill | null;
  /** The provider ceiling. Always `max("med", sfill)` where `sfill` applies. */
  ceil: Fill;
  theme: Theme;
}

const HANDS: readonly Hand[] = ["steady", "natural", "loose", "hurried"];
const SFILLS: readonly Fill[] = ["no", "low", "med", "high"];
const THEMES: readonly Theme[] = ["light", "dark"];
const FILL_ORDER: readonly Fill[] = ["no", "low", "med", "high"];

/** Mirrors `capFill`'s ordering without importing the engine into a Playwright-only file. */
function maxFill(a: Fill, b: Fill): Fill {
  return FILL_ORDER.indexOf(a) >= FILL_ORDER.indexOf(b) ? a : b;
}

/** Block A — Button, full grid, tier 2. hand(4) x sfill(4) x theme(2) = 32. */
function blockA(): Cell[] {
  const cells: Cell[] = [];
  for (const hand of HANDS) {
    for (const sfill of SFILLS) {
      for (const theme of THEMES) {
        cells.push({
          component: "button",
          state: "default",
          tier: "high",
          hand,
          sfill,
          ceil: maxFill("med", sfill),
          theme,
        });
      }
    }
  }
  return cells;
}

/**
 * Block B — Button, full grid, tier 1. sfill(4) x theme(2) = 8, `hand: null`.
 * Tier 1 emits no hand information into the DOM at all — `SketchFrameProps`
 * carries `data-hc-seed`, `data-hc-fill`, `data-hc-fidelity` and
 * `data-hc-focus-within`, and nothing else. Four hands at tier 1 would be
 * four identical PNGs, so the axis is dropped rather than pruned.
 */
function blockB(): Cell[] {
  const cells: Cell[] = [];
  for (const sfill of SFILLS) {
    for (const theme of THEMES) {
      cells.push({
        component: "button",
        state: "default",
        tier: "lite",
        hand: null,
        sfill,
        ceil: maxFill("med", sfill),
        theme,
      });
    }
  }
  return cells;
}

/**
 * Block C — one baseline cell per remaining component, both themes.
 * 6 components x theme(2) = 12. Button's baseline already sits inside block
 * A at `hand: "natural"`, `sfill: "low"`, so it is not repeated here.
 */
const BASELINE_COMPONENTS: readonly Component[] = [
  "badge",
  "card",
  "checkbox",
  "input",
  "separator",
  "label",
];

function blockC(): Cell[] {
  const cells: Cell[] = [];
  for (const component of BASELINE_COMPONENTS) {
    for (const theme of THEMES) {
      cells.push({
        component,
        state: "default",
        tier: "high",
        hand: "natural",
        sfill: null,
        ceil: "med",
        theme,
      });
    }
  }
  return cells;
}

/**
 * Block D — spot rows, light only, tier 2. 5 components x 3 cells = 15.
 * Each row pairs a non-default hand with a different fill-axis value, so one
 * row crosses both axes at once. Pairing confounds — a failing cell does not
 * say whether the hand or the fill caused it — and that is accepted on
 * purpose: this is a regression gate, and Button's full grid in block A is
 * the unconfounded instrument. Label is excluded (§1.3 rule 5): it holds no
 * frame, so a spot row would be three identical PNGs.
 *
 * Badge is the only spot component with a `fill` prop, so its three cells
 * drive `sfill` directly and `ceil` follows `max("med", sfill)`. The other
 * four hard-code their intent in source (`input.tsx:42`, `separator.tsx:106`
 * both `"no"`; `checkbox.tsx` branches on checked state; `card.tsx:32`
 * `"low"`), so their three cells drive `ceil` directly instead and `sfill`
 * stays `null` — the ceiling axis is partly inert by construction for these
 * four, and recording that is better than pretending otherwise. Each row is
 * still three distinct renders, because the hand differs across all three
 * regardless of whether the fill axis moves anything.
 */
const SPOT_COMPONENTS: readonly Component[] = ["badge", "card", "checkbox", "input", "separator"];

const SPOT_ROWS: ReadonlyArray<{ hand: Hand; badgeSfill: Fill; otherCeil: Fill }> = [
  { hand: "steady", badgeSfill: "no", otherCeil: "no" },
  { hand: "loose", badgeSfill: "med", otherCeil: "low" },
  { hand: "hurried", badgeSfill: "high", otherCeil: "high" },
];

function blockD(): Cell[] {
  const cells: Cell[] = [];
  for (const component of SPOT_COMPONENTS) {
    for (const row of SPOT_ROWS) {
      if (component === "badge") {
        cells.push({
          component,
          state: "default",
          tier: "high",
          hand: row.hand,
          sfill: row.badgeSfill,
          ceil: maxFill("med", row.badgeSfill),
          theme: "light",
        });
      } else {
        cells.push({
          component,
          state: "default",
          tier: "high",
          hand: row.hand,
          sfill: null,
          ceil: row.otherCeil,
          theme: "light",
        });
      }
    }
  }
  return cells;
}

/** Concatenated in block order — 32 + 8 + 12 + 15 = 67. Checked live by M9, not re-typed here. */
export const MATRIX_CELLS: readonly Cell[] = [...blockA(), ...blockB(), ...blockC(), ...blockD()];

/**
 * `<component>__<state>__<tier>__<hand>__<sfill>__<ceil>__<theme>.png`. One
 * function over the record, so a screenshot's filename can never drift from
 * the cell it names — `null` axes render as `na`.
 */
export function nameFor(cell: Cell): string {
  const hand = cell.hand ?? "na";
  const sfill = cell.sfill ?? "na";
  return `${cell.component}__${cell.state}__${cell.tier}__${hand}__${sfill}__${cell.ceil}__${cell.theme}.png`;
}
