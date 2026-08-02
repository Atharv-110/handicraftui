import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import { base } from "./base.js";

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
];

export default reactLibrary;
