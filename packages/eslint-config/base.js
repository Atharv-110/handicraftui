import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import turbo from "eslint-plugin-turbo";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Build output and caches are never worth linting, in any package. */
export const ignores = {
  ignores: [
    "**/dist/**",
    "**/.next/**",
    // The playground's dev build lands here rather than in `.next`, so that a
    // repo-wide `pnpm build` cannot overwrite a running dev server's chunks.
    // Without this it gets linted, and Next's generated types alone account for
    // several hundred errors.
    "**/.next-dev/**",
    "**/.turbo/**",
    "**/coverage/**",
    "**/node_modules/**",
  ],
};

export const base = [
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  turbo.configs["flat/recommended"],
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // tsconfig sets verbatimModuleSyntax, so an unmarked type-only import is
      // a real emit-time error rather than a style preference.
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Must stay last: turns off everything Prettier already owns.
  prettier,
];

export default base;
