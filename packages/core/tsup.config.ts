import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { defineConfig, type Options } from "tsup";

const shared: Options = {
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  treeshake: true,
  // roughjs is loaded via dynamic import in the tier-2 path only. Keeping it
  // external is what lets tier-1 consumers ship zero bytes of it.
  external: ["react", "react-dom", "roughjs"],
};

const USE_CLIENT = '"use client";\n';

/**
 * esbuild drops directives when bundling and tsup's `banner` option did not
 * survive either. Without "use client", Next.js App Router treats the provider
 * and hooks as Server Components and throws on the first useState — so this is
 * asserted in a build step rather than trusted to a flag.
 */
function prependUseClient(files: string[]) {
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    if (src.startsWith(USE_CLIENT)) continue;
    writeFileSync(file, USE_CLIENT + src);
  }
}

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/index.ts" },
    clean: true,
    onSuccess: async () => {
      copyFileSync("src/styles/handicraft.css", "dist/handicraft.css");
      prependUseClient(["dist/index.js", "dist/index.cjs"]);
    },
  },
  {
    ...shared,
    // Isomorphic entry. Deliberately gets no directive so it stays callable
    // during a server render.
    entry: { utils: "src/utils.ts" },
    clean: false,
  },
]);
