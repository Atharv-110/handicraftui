import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { ESLint, type Linter } from "eslint";
/**
 * `packages/eslint-config` is plain ESM JavaScript with no `.d.ts` beside it
 * and no `types` condition on its `exports` map, so TypeScript resolves this
 * specifier to an untyped `.js` and reports TS7016 under `strict`. An in-file
 * `declare module` cannot fix it either — TS2665, an untyped module cannot be
 * augmented. `@ts-expect-error` rather than `@ts-ignore` on purpose: the
 * moment that package grows declarations, TypeScript reports this directive
 * as unused and the gate goes red until it is deleted. Filed as cycle 005
 * finding M2.
 */
// @ts-expect-error `packages/eslint-config` ships plain ESM with no type declarations.
import { reactLibrary } from "@handicraft/eslint-config/react-library";
import { expect, it } from "vitest";

/**
 * L1 to L5 — cycle 005 §4.3.
 *
 * Two different claims, and they fail differently. L1 through L4 assert that
 * each `hc` rule *works* — it fires, on real source, at the count
 * `fixtures/tripwire-fixture.tsx` was written to produce. L5 asserts that
 * each rule is *on* for the packages it governs. A rule that works but is
 * switched off in the preset passes L1 through L4 and gates nothing, and
 * that failure is invisible to every other check in this repository: nothing
 * in real source violates `hc/no-ink-faint-text` today, so `pnpm lint` stays
 * green whether the rule is enabled or deleted. L5 is the only guard that
 * sees it.
 *
 * The fixture is the subject on purpose. `hc/base-ui-focus-within` has no
 * subject anywhere in this repository until Phase 2 Wave A, twelve to
 * eighteen cycles out, and "the first Base UI cycle will notice if it broke"
 * is the same reasoning that let the `visual` job skip `main` for two cycles.
 *
 * Cycle 005 §4.3 flagged ESLint 10's programmatic surface as the one thing
 * the architect had not exercised, and named two fallbacks. Neither was
 * needed: `new ESLint({ overrideConfigFile: true, overrideConfig })` and
 * `calculateConfigForFile` both behave as written on eslint 10.8.0, measured
 * before this file was authored. Recorded so the next reader does not
 * re-litigate a risk that was closed by measurement.
 */

const repoRoot = resolve(process.cwd(), "../..");
const FIXTURE = join(repoRoot, "packages/eslint-config/fixtures/tripwire-fixture.tsx");

/**
 * The four rules at `error` in one config the test owns, rather than
 * whatever the presets happen to say. That separation is what makes L1
 * through L4 tests of the rules and L5 a test of the wiring — if these tests
 * read the preset, a preset mutation would fail all five and none of them
 * would isolate what it claims.
 */
const ALL_FOUR: Linter.RulesRecord = {
  "hc/base-ui-focus-within": "error",
  "hc/no-off-scale-class": "error",
  "hc/no-ink-faint-text": "error",
  "hc/no-bare-dark-class": "error",
};

/**
 * Linted once and memoised. ESLint start-up dominates the cost of these
 * tests, and the fixture is read-only within a run, so five instances would
 * buy nothing but wall time.
 */
let pending: Promise<Linter.LintMessage[]> | undefined;

async function fixtureMessages(): Promise<Linter.LintMessage[]> {
  pending ??= (async () => {
    // Asserted before the lint run rather than left to `lintFiles`, which
    // throws "No files matching the pattern" — a message about a glob, for
    // what is actually a moved or deleted fixture.
    expect(existsSync(FIXTURE), `${FIXTURE} does not exist`).toBe(true);

    const eslint = new ESLint({
      cwd: repoRoot,
      overrideConfigFile: true,
      // `reactLibrary` rather than a hand-assembled parser config: the rules
      // run on `.tsx`, which needs `typescript-eslint` — a dependency of
      // `@handicraft/eslint-config` and not of `packages/core`. Importing the
      // preset borrows it through the package that already declares it, and
      // adds no dependency to this one. `eslint` itself is already a
      // devDependency here.
      overrideConfig: [...reactLibrary, { files: ["**/*.tsx"], rules: ALL_FOUR }],
    });
    const results = await eslint.lintFiles([FIXTURE]);
    // A lint run over nothing reports zero messages and every count assertion
    // below would then read as "the rule did not fire" — QA-CONTRACT.md's "a
    // filter matching nothing still exits 0" in lint-run form. Both floors
    // are asserted before any count can mean anything.
    expect(results.length, "linting the fixture produced no result object").toBe(1);
    expect(results[0]!.filePath, "the lint result is for some other file").toBe(FIXTURE);
    return results[0]!.messages;
  })();
  return pending;
}

function countOf(messages: Linter.LintMessage[], ruleId: string): number {
  return messages.filter((message) => message.ruleId === ruleId).length;
}

it("L1 — hc/base-ui-focus-within fires once on the fixture", () => {
  return fixtureMessages().then((messages) => {
    expect(countOf(messages, "hc/base-ui-focus-within")).toBe(1);
  });
});

it("L2 — hc/no-off-scale-class fires three times, once per half", () => {
  return fixtureMessages().then((messages) => {
    const mine = messages.filter((message) => message.ruleId === "hc/no-off-scale-class");
    expect(mine.length).toBe(3);

    // Three halves, not one half firing three times. Without this the fixture
    // could lose its `text-4xl` and gain a second `px-5` and the count above
    // would still read 3 — which is precisely the shape of green that
    // mutation testing exists to catch.
    const messageIds = new Set(mine.map((message) => message.messageId));
    expect(
      messageIds.size,
      `expected three distinct messageIds, got ${[...messageIds].join(", ")}`,
    ).toBe(3);
    expect([...messageIds].sort()).toEqual(["handFaceBelow18", "offScaleSize", "offScaleType"]);
  });
});

it("L3 — hc/no-ink-faint-text fires once on the fixture", () => {
  return fixtureMessages().then((messages) => {
    expect(countOf(messages, "hc/no-ink-faint-text")).toBe(1);
  });
});

it("L4 — hc/no-bare-dark-class fires once on the fixture", () => {
  return fixtureMessages().then((messages) => {
    expect(countOf(messages, "hc/no-bare-dark-class")).toBe(1);
  });
});

/** The calculated config reports a severity as a one-element array; a config
 *  file writes it as a string. Normalised so this test compares severities
 *  rather than shapes. */
function severityOf(entry: Linter.RuleEntry | undefined): number | undefined {
  if (entry === undefined) return undefined;
  const value = Array.isArray(entry) ? entry[0] : entry;
  if (value === "off") return 0;
  if (value === "warn") return 1;
  if (value === "error") return 2;
  return value;
}

it("L5 — the presets enable the rules on the real packages, at the declared severities", async () => {
  // One ESLint instance per package, each with that package's own cwd, so
  // every path resolves through the `eslint.config.mjs` that actually governs
  // it rather than through a root config none of these files answer to.
  // `overrideConfigFile` is deliberately absent here — the whole claim is
  // about what the real config files say.
  const cases: { cwd: string; file: string; expected: Record<string, number> }[] = [
    {
      cwd: "registry",
      file: "default/ui/button/button.tsx",
      expected: {
        "hc/base-ui-focus-within": 2,
        "hc/no-ink-faint-text": 2,
        "hc/no-bare-dark-class": 2,
        // The only path where the fourth rule is on. `registry/eslint.config.mjs`
        // turns it on for `default/**/*.tsx` alone, because the ramps govern
        // shipped component source and nothing else.
        "hc/no-off-scale-class": 2,
      },
    },
    {
      cwd: "apps/playground",
      file: "app/harness.tsx",
      expected: {
        "hc/base-ui-focus-within": 2,
        "hc/no-ink-faint-text": 2,
        "hc/no-bare-dark-class": 2,
        // Off, and asserted as off rather than left unstated. Cycle 005 §3.4
        // records six real playground sites this rule would report today; a
        // silent flip to `error` would fail `pnpm lint` on files the doctrine
        // deliberately does not govern.
        "hc/no-off-scale-class": 0,
      },
    },
    {
      cwd: "packages/core",
      file: "src/theme/surface.tsx",
      expected: {
        "hc/base-ui-focus-within": 2,
        "hc/no-ink-faint-text": 2,
        "hc/no-bare-dark-class": 2,
        "hc/no-off-scale-class": 0,
      },
    },
  ];

  for (const { cwd, file, expected } of cases) {
    const packageRoot = join(repoRoot, cwd);
    const target = join(packageRoot, file);
    // A path that does not exist still calculates a config, so the real
    // subject has to be proven present or this test asserts the preset's
    // opinion about a file nobody ships.
    expect(existsSync(target), `${target} does not exist`).toBe(true);

    const eslint = new ESLint({ cwd: packageRoot });
    const config = await eslint.calculateConfigForFile(target);

    expect(
      Object.keys(config.plugins ?? {}),
      `${cwd} does not register the hc plugin for ${file}`,
    ).toContain("hc");

    for (const [ruleId, severity] of Object.entries(expected)) {
      expect(
        severityOf(config.rules?.[ruleId]),
        `${cwd}: ${ruleId} is not at severity ${severity} for ${file}`,
      ).toBe(severity);
    }
  }
});
