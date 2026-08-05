import reactLibrary from "@handicraft/eslint-config/react-library";

export default [
  ...reactLibrary,
  // Cycle 005. The ramps govern shipped component source and nothing else,
  // so this is where the fourth `hc` rule turns on — react-library.js
  // already registers the `hc` plugin for every file this config reaches,
  // ESLint flat config merges plugin registrations across every matching
  // config object for a file, so this object only needs the rule override,
  // not a second `plugins` entry.
  {
    files: ["default/**/*.tsx"],
    rules: { "hc/no-off-scale-class": "error" },
  },
];
