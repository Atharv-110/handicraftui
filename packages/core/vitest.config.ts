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
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "../../registry/default/**/*.test.tsx"],
    // pnpm links the workspace back into registry/node_modules/@handicraft/core,
    // so a looser registry glob walks the symlink and runs this same suite a
    // second time. Scoping to registry/default plus an explicit exclude keeps
    // the run honest.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
