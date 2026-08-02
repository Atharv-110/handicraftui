import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Registry components import from the published name; point it at source
      // so tests exercise the same code the build ships.
      "@handicraft/core": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "../../registry/tests/**/*.test.{ts,tsx}"],
    // Two roots, both scoped tightly on purpose. pnpm links the workspace back
    // into registry/node_modules/@handicraft/core, and that symlink resolves to
    // packages/core — a real path with no node_modules segment in it, so the
    // exclude below cannot catch a walk through it. Only the narrowness of these
    // globs can. registry/tests holds test files and nothing else.
    //
    // registry/default is deliberately absent. Component source there imports
    // nothing but react and @handicraft/core, which is a rule stated on the
    // directory rather than on the subset that ships; a co-located test importing
    // vitest would break it. Tests for registry components live in registry/tests.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
