/**
 * Handicraft UI — the `hc` ESLint plugin.
 *
 * Four rules, one file, deliberately at the top level of this package rather
 * than in a subdirectory. `turbo.json`'s `globalDependencies` already carries
 * `packages/eslint-config/*.js`, measured live (cycle 005 §2) as reaching
 * every top-level file in this package — a subdirectory would silently fall
 * outside that glob, and a rule change that cannot invalidate the lint cache
 * is the exact defect class this file exists to close.
 *
 * Plain ESM, an inline flat-config plugin object. ESLint flat config accepts
 * a plugin as a plain object — nothing here gets published and nothing gets
 * installed, so this file adds zero dependencies to the workspace.
 *
 * The four constants below are hand-copied from what
 * `packages/core/src/styles/ramps.ts` already declares, not imported from
 * it. That is deliberate, not laziness: importing `ramps.ts` would make this
 * file the single source of truth for both sides of the comparison and
 * erase the drift `design-tokens.test.ts`'s R6 exists to catch. R6's whole
 * claim is that two independently authored homes for one number still
 * agree; an import would make that claim untestable by construction.
 */

/**
 * `CONTROL_RAMP` heights (36, 44, 48) + `TOKEN_RAMP.xs.height` (24) +
 * `GEOMETRY_PINS`'s two values — Checkbox's drawn box (20) and Separator's
 * rule thickness (2), neither a ramp value on either ramp. Six values,
 * sorted ascending.
 */
export const SIZE_PX = [2, 20, 24, 36, 44, 48];

/**
 * `CONTROL_RAMP` horizontal padding (12, 16, 24) + `TOKEN_RAMP.xs.padX` (8)
 * + `SPACING.padPage` (12, already present — the duplicate collapses to one
 * entry). Four distinct values, sorted ascending.
 */
export const PAD_X_PX = [8, 12, 16, 24];

/**
 * Every `TYPE_SCALE` step's Tailwind utility, caption through displayLg.
 * Seven values.
 */
export const TYPE_UTILITIES = [
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
];

/**
 * The three `TYPE_SCALE` steps below 18px — where `DESIGN-SYSTEM.md` §2's
 * hachure-interference argument binds on the hand face. Above 18px the hand
 * face is legal everywhere; below it, only inside
 * `HAND_FACE_EXCEPTION_FILES`.
 */
export const SUB_18_TYPE_UTILITIES = ["text-xs", "text-sm", "text-base"];

/**
 * `DESIGN-SYSTEM.md` §2's closed three-item exception, as path fragments
 * rather than component names — a lint rule reads `context.filename`, not an
 * exported identifier. Closed on purpose: §2 says outright that closing the
 * list is what makes the exception lintable instead of a per-component
 * judgment call.
 */
export const HAND_FACE_EXCEPTION_FILES = ["ui/badge/", "ui/label/", "ui/button/"];

/**
 * Strips every Tailwind variant prefix down to the base utility — a single
 * variant (`disabled:`), chained ones (`motion-safe:disabled:`), or a
 * bracketed one (`data-[state=open]:`). Cuts on the LAST `:` found at
 * bracket depth zero, so the `:` inside `data-[state=open]` is never
 * mistaken for the variant boundary — a plain `lastIndexOf(":")` would cut
 * `data-[state=open]:px-5` after `open]` and leave `px-5` intact only by
 * accident, breaking on the next variant whose value contains a colon.
 */
function stripVariants(token) {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < token.length; i += 1) {
    const ch = token[i];
    if (ch === "[") depth += 1;
    else if (ch === "]") depth -= 1;
    else if (ch === ":" && depth === 0) cut = i;
  }
  return cut === -1 ? token : token.slice(cut + 1);
}

/**
 * Every string a `className` attribute's value can statically resolve to,
 * walked through the shapes `CODE-CONTRACT.md`'s own authoring ritual
 * produces: a direct string, a template literal, `cn(...)`'s own arguments,
 * and the `a && "b"` / `a ? "b" : "c"` conditionals that carry disabled and
 * variant classes. A bare identifier or member expression — a variable, a
 * `VARIANTS[key]` lookup — is left alone rather than guessed at: the rule
 * cannot see into it, and reporting there would teach a component to hoist
 * the string just to silence the rule.
 */
function collectClassNameLiterals(node, out) {
  if (!node) return;
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") out.push(node);
      break;
    case "TemplateLiteral":
      for (const quasi of node.quasis) out.push(quasi);
      break;
    case "JSXExpressionContainer":
      collectClassNameLiterals(node.expression, out);
      break;
    case "CallExpression":
      for (const arg of node.arguments) collectClassNameLiterals(arg, out);
      break;
    case "ConditionalExpression":
      collectClassNameLiterals(node.consequent, out);
      collectClassNameLiterals(node.alternate, out);
      break;
    case "LogicalExpression":
      collectClassNameLiterals(node.left, out);
      collectClassNameLiterals(node.right, out);
      break;
    case "ArrayExpression":
      for (const element of node.elements) collectClassNameLiterals(element, out);
      break;
    default:
      break;
  }
}

/** A `Literal` and a `TemplateElement` carry their string in different keys. */
function literalText(literalOrQuasi) {
  return literalOrQuasi.type === "TemplateElement"
    ? literalOrQuasi.value.cooked
    : literalOrQuasi.value;
}

function tokensOf(text) {
  return typeof text === "string" ? text.split(/\s+/).filter(Boolean) : [];
}

/**
 * Requirement 2 (cycle 005 §3.3). The global stylesheet rule is
 * `.hc-frame:focus-visible`, which matches only when the frame element is
 * itself the focusable one — true for Button, false for anything wrapping a
 * real control in a `<span>` or `<div>`, which is most of what Base UI
 * wraps. Checkbox shipped with no visible focus at all: its frame was a
 * `<span>` around an `opacity-0` `<input>`, and `opacity` applies to an
 * outline too, so the native ring was drawn correctly and perfectly
 * transparent. Nothing looked broken in the DOM. This rule has no subject in
 * the repository until Phase 2 Wave A — see `fixtures/tripwire-fixture.tsx`
 * for why that is not left unverified until then.
 */
const baseUiFocusWithin = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Every useSketchFrame() call in a file that imports @base-ui/react must pass focusWithin: true.",
    },
    schema: [],
    messages: {
      missingFocusWithin:
        "Base UI frames wrap a control they do not own. Pass `focusWithin: true`.",
    },
  },
  create(context) {
    let hasBaseUiImport = false;
    const calls = [];

    return {
      ImportDeclaration(node) {
        if (
          typeof node.source.value === "string" &&
          node.source.value.startsWith("@base-ui/react")
        ) {
          hasBaseUiImport = true;
        }
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "useSketchFrame") {
          calls.push(node);
        }
      },
      // Checked at Program:exit rather than inline, so a call appearing
      // before its file's @base-ui/react import — legal JS, since imports
      // are hoisted — is never missed. Imports sit first in every file this
      // repository ships, but "sits first in practice" is exactly the kind
      // of assumption a lint rule should not need.
      "Program:exit"() {
        if (!hasBaseUiImport) return;
        for (const call of calls) {
          const [firstArg] = call.arguments;
          // Cannot see into a variable — reporting here would teach people
          // to hoist the object literal to silence the rule rather than fix
          // the missing option.
          if (!firstArg || firstArg.type !== "ObjectExpression") continue;

          const prop = firstArg.properties.find(
            (property) =>
              property.type === "Property" &&
              !property.computed &&
              ((property.key.type === "Identifier" && property.key.name === "focusWithin") ||
                (property.key.type === "Literal" && property.key.value === "focusWithin")),
          );
          const isTrue = prop && prop.value.type === "Literal" && prop.value.value === true;
          if (!isTrue) context.report({ node: call, messageId: "missingFocusWithin" });
        }
      },
    };
  },
};

/**
 * Requirement 4 (cycle 005 §3.4). Three halves, one rule, three
 * `messageId`s so a failure says which. Enabled only for
 * `registry/default/**​/*.tsx` (see `registry/eslint.config.mjs`) — the
 * ramps govern shipped component source and nothing else, so the package
 * that owns those files owns the rule that governs them, and this rule sits
 * "off" in the shared preset for that reason.
 *
 * Reads only quoted string literals, never a comment — an ESLint rule never
 * sees a comment in the first place, because comments are not `Literal`
 * nodes. That is the property `design-tokens.test.ts`'s old D7 regex reader
 * had to reconstruct with `stripComments`, and a parser gets for free.
 */
const noOffScaleClass = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Size, type and hand-face-below-18px utilities in registry/default/**/*.tsx must stay on the ramps DESIGN-SYSTEM.md §2 and §4 declare.",
    },
    schema: [],
    messages: {
      offScaleSize:
        "`{{token}}` is off the size ramp — not a value in SIZE_PX or PAD_X_PX. See DESIGN-SYSTEM.md §4.",
      offScaleType:
        "`{{token}}` is off the type scale — not a TYPE_SCALE step. See DESIGN-SYSTEM.md §2.",
      handFaceBelow18:
        "`font-hand` below 18px is legal only in badge-text, label-text or button-label. See DESIGN-SYSTEM.md §2.",
    },
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const isExceptionFile = HAND_FACE_EXCEPTION_FILES.some((fragment) =>
      filename.includes(fragment),
    );

    const SIZE_TOKEN = /^(min-h|min-w|h|w|size|px)-(.+)$/;
    const TYPE_TOKEN = /^text-(.+)$/;
    const ARBITRARY_VALUE = /^\[.+\]$/;
    const NUMERIC_VALUE = /^[0-9]+(\.[0-9]+)?$/;
    const XL_STEP = /^[0-9]*xl$/;
    const HAS_LENGTH_UNIT = /(px|rem|em|vh|vw|%|ch)\]$/;

    /**
     * Half one (size) and half two (type) run over every string literal in
     * the file, not just `className` attributes — `SIZES`/`VARIANTS`
     * `as const` objects (button.tsx's SIZES, badge.tsx's VARIANTS) hold the
     * same class strings one JSX hop away, through a computed member
     * expression this rule cannot see into from the JSX side. Scanning
     * every literal catches both without needing to resolve the lookup.
     */
    function checkSizeAndType(reportNode, rawToken) {
      const token = stripVariants(rawToken);

      const sizeMatch = SIZE_TOKEN.exec(token);
      if (sizeMatch) {
        const [, prefix, value] = sizeMatch;
        // `px-` is a padding-x prefix, checked against PAD_X_PX; the other
        // five are dimension prefixes, checked against SIZE_PX. Same
        // escape-hatch and skip-keyword rules apply to both, so one branch
        // covers both tables instead of duplicating the numeric/arbitrary
        // logic a second time.
        const table = prefix === "px" ? PAD_X_PX : SIZE_PX;
        if (ARBITRARY_VALUE.test(value)) {
          // `h-[37px]` — the classic escape. Always reported; there is none
          // in the registry today.
          context.report({ node: reportNode, messageId: "offScaleSize", data: { token } });
        } else if (NUMERIC_VALUE.test(value)) {
          // Tailwind's spacing unit is 0.25rem against a 16px root, so
          // pixels are the suffix times four.
          const px = parseFloat(value) * 4;
          if (!table.includes(px)) {
            context.report({ node: reportNode, messageId: "offScaleSize", data: { token } });
          }
        }
        // Anything else — full, screen, auto, px, min, max, fit and the
        // like — is a layout keyword the ramps have no opinion about, and
        // is silently skipped rather than guessed at. An opinion about
        // `w-full` would make this rule wrong instead of strict.
        return;
      }

      const typeMatch = TYPE_TOKEN.exec(token);
      if (typeMatch) {
        const value = typeMatch[1];
        const isArbitrary = ARBITRARY_VALUE.test(value);
        const sizeShaped =
          value === "xs" ||
          value === "sm" ||
          value === "base" ||
          value === "lg" ||
          XL_STEP.test(value) ||
          (isArbitrary && HAS_LENGTH_UNIT.test(value));
        // text-hc-ink and text-hc-danger-ink fail every branch above and are
        // never reached — Tailwind overloads `text-` across size and
        // colour, and this shape test is what tells them apart without a
        // colour-token allowlist that would need updating every time
        // DESIGN-SYSTEM grows a role.
        if (sizeShaped && !TYPE_UTILITIES.includes(token)) {
          context.report({ node: reportNode, messageId: "offScaleType", data: { token } });
        }
      }
    }

    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        for (const token of tokensOf(node.value)) checkSizeAndType(node, token);
      },
      TemplateElement(node) {
        for (const token of tokensOf(node.value.cooked)) checkSizeAndType(node, token);
      },
      // Half three, the hand face below 18px. Scoped to one className
      // attribute's own aggregated tokens — the co-occurrence this half
      // reports on is "one component's rendered class list", not "this
      // utility exists somewhere in the file", which is why it cannot share
      // the file-wide Literal/TemplateElement walk above.
      JSXAttribute(node) {
        if (isExceptionFile) return;
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "className") return;

        const literals = [];
        collectClassNameLiterals(node.value, literals);
        const tokens = literals.flatMap((literal) => tokensOf(literalText(literal)));

        const hasHandFace = tokens.includes("font-hand");
        const hasSub18 = tokens.some((token) =>
          SUB_18_TYPE_UTILITIES.includes(stripVariants(token)),
        );
        if (hasHandFace && hasSub18) {
          context.report({ node, messageId: "handFaceBelow18" });
        }
      },
    };
  },
};

/**
 * Requirement 5 (cycle 005 §3.5). Replaces D7's runtime `readFileSync` walk,
 * which `QA-CONTRACT.md` Rule V1b names as the one open escape in the
 * turbo-hashing fix: `@handicraft/core#test` hashes zero inputs under
 * `apps/playground`, so a warm local `pnpm test` replayed green after a
 * regression D7 itself would have caught cold. `@handicraft/playground#lint`
 * and `@handicraft/registry#lint` already hash exactly what this rule reads.
 *
 * Reads string literals, not raw file text — a comment naming the token is
 * no longer a violation, where D7's raw-text read would have failed on one.
 * This library's own doctrine discusses `text-hc-ink-faint` constantly, and
 * a check that cannot tell a mention from a use is the exact defect cycle
 * 002b already paid for on `input.tsx`'s `px-4`.
 */
const noInkFaintText = {
  meta: {
    type: "problem",
    docs: {
      description:
        "text-hc-ink-faint is a hachure colour, not a text colour — it fails AA contrast as text.",
    },
    schema: [],
    messages: {
      found:
        "`text-hc-ink-faint` fails AA contrast as text. It is a hachure colour, not a text colour.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === "string" && tokensOf(node.value).includes("text-hc-ink-faint")) {
          context.report({ node, messageId: "found" });
        }
      },
      TemplateElement(node) {
        if (tokensOf(node.value.cooked).includes("text-hc-ink-faint")) {
          context.report({ node, messageId: "found" });
        }
      },
    };
  },
};

/**
 * Requirement 6, the lint half (cycle 005 §3.6). `globals.css:14-17` paints
 * `body` from `var(--hc-paper)` resolved at `:root`, and `.dark` may land on
 * any descendant of `body` — so paint and theme are separable by
 * construction, and cycle 004 iteration 1 separated them and shipped a
 * 1.1924:1 render into 26 of 67 baselines. `HandicraftSurface` is the fix;
 * this rule is what keeps a hand-written `className="dark"` from
 * reintroducing the split it closes. Scoped to the `className` attribute,
 * which is what keeps `theme === "dark"` comparisons and `data-*` values out
 * of it — Tailwind's `dark:` variant is a different token under whitespace
 * splitting, so it is untouched.
 */
const noBareDarkClass = {
  meta: {
    type: "problem",
    docs: {
      description:
        "A bare `dark` class in a className attribute must come from HandicraftSurface, which pairs it with the paint.",
    },
    schema: [],
    messages: {
      found: "A bare `dark` class must come from HandicraftSurface, not be written by hand.",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "className") return;

        const literals = [];
        collectClassNameLiterals(node.value, literals);
        for (const literal of literals) {
          if (tokensOf(literalText(literal)).includes("dark")) {
            context.report({ node: literal, messageId: "found" });
          }
        }
      },
    };
  },
};

export const handicraft = {
  rules: {
    "base-ui-focus-within": baseUiFocusWithin,
    "no-off-scale-class": noOffScaleClass,
    "no-ink-faint-text": noInkFaintText,
    "no-bare-dark-class": noBareDarkClass,
  },
};

export default handicraft;
