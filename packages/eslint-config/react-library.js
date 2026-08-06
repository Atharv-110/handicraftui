import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { base } from "./base.js";
import { handicraft } from "./handicraft-rules.js";

export const reactLibrary = [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  // Not formatting rules, so ordering after eslint-config-prettier is safe.
  reactHooks.configs.flat["recommended-latest"],
  {
    // Three of the four `hc` rules apply everywhere this preset reaches —
    // packages/core, registry, and through next.js, apps/playground.
    // `hc/no-off-scale-class` is "off" here: the ramps govern shipped
    // component source and nothing else, so registry/eslint.config.mjs
    // turns it on for `default/**/*.tsx` alone, in the file a reader of
    // `registry/` can see without opening this shared preset.
    plugins: { hc: handicraft },
    rules: {
      "hc/base-ui-focus-within": "error",
      "hc/no-ink-faint-text": "error",
      "hc/no-bare-dark-class": "error",
      "hc/no-off-scale-class": "off",
    },
  },
];

export default reactLibrary;
