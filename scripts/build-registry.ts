/**
 * Emits shadcn-compatible registry JSON from `registry/default/ui`.
 *
 * The component source is the single source of truth: dependencies are read
 * back out of its own import statements rather than maintained by hand, so a
 * new import can never silently ship a broken `shadcn add`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = join(ROOT, "registry", "default", "ui");
const OUT = join(ROOT, "registry", "public", "r");
const DEPENDENCIES_FILE = join(ROOT, "registry", "dependencies.json");

const REGISTRY = {
  name: "handicraft-ui",
  homepage: "https://github.com/Atharv-110/handicraftui",
};

// Every shadcn-compatible project already has these. Listing them would make
// `shadcn add` reinstall the consumer's own framework.
const ASSUMED_DEPENDENCIES = new Set(["react", "react-dom"]);

const IMPORT_SPECIFIER = /\bfrom\s*["']([^"']+)["']|\bimport\s*["']([^"']+)["']/g;

interface ComponentMeta {
  title?: string;
  description?: string;
  registryDependencies?: string[];
}

interface DependenciesManifest {
  components: Record<string, string[]>;
}

/** Bare npm specifiers a file imports, collapsed to package names. */
function externalDependencies(source: string): string[] {
  const found = new Set<string>();

  for (const match of source.matchAll(IMPORT_SPECIFIER)) {
    const specifier = match[1] ?? match[2];
    if (!specifier || specifier.startsWith(".") || specifier.startsWith("@/")) continue;

    const segments = specifier.split("/");
    const pkg = specifier.startsWith("@")
      ? segments.slice(0, 2).join("/")
      : (segments[0] ?? specifier);

    if (!ASSUMED_DEPENDENCIES.has(pkg)) found.add(pkg);
  }

  return [...found].sort();
}

function readMeta(dir: string): ComponentMeta {
  const path = join(dir, "meta.json");
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as ComponentMeta) : {};
}

function toTitle(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildItem(name: string) {
  const dir = join(SRC, name);
  const meta = readMeta(dir);

  // Tests stay in the repo; they are not part of what a consumer installs.
  const sources = readdirSync(dir)
    .filter((file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"))
    .sort();

  if (sources.length === 0) {
    throw new Error(`registry/default/ui/${name} contains no component source`);
  }

  const dependencies = new Set<string>();
  const files = sources.map((file) => {
    const absolute = join(dir, file);
    const content = readFileSync(absolute, "utf8");
    for (const dep of externalDependencies(content)) dependencies.add(dep);

    return {
      path: relative(join(ROOT, "registry"), absolute).split(sep).join(posix.sep),
      content,
      type: "registry:ui" as const,
      target: `components/ui/${file}`,
    };
  });

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:ui" as const,
    title: meta.title ?? toTitle(name),
    description: meta.description ?? `${toTitle(name)} — a hand-drawn Handicraft UI component.`,
    dependencies: [...dependencies].sort(),
    registryDependencies: meta.registryDependencies ?? [],
    files,
  };
}

/**
 * `registry/dependencies.json` is a second, human-authored statement of the
 * same fact `buildItem` already derives — not a second derivation, which
 * would put the same regex in two homes, the exact defect this repository
 * has a rule against. `PRINCIPLES.md` makes any import beyond `react` and
 * `@handicraft/core` a DECISION-REQUIRED; comparing the two is what makes
 * that decision reviewable, since adding a dependency to a shipped
 * component now needs a matching line in this file or the build fails
 * loudly instead of shipping a silently-widened install requirement.
 *
 * Both directions checked, not just one: a stale entry left behind by a
 * deleted component is as wrong as a missing one, and a name present on
 * both sides with a mismatched array is the case an equality check on the
 * whole manifest would miss if it only checked "for every real component,
 * is there an entry" — a manifest could still pass that with the wrong
 * dependencies for a name it happens to share with a directory.
 */
function checkDeclaredDependencies(names: string[], items: ReturnType<typeof buildItem>[]) {
  const manifest = JSON.parse(readFileSync(DEPENDENCIES_FILE, "utf8")) as DependenciesManifest;
  const declaredNames = new Set(Object.keys(manifest.components));
  const realNames = new Set(names);

  for (const name of names) {
    if (!declaredNames.has(name)) {
      throw new Error(
        `registry/dependencies.json is missing an entry for "${name}" — every ` +
          `registry/default/ui directory needs one.`,
      );
    }
  }

  for (const name of declaredNames) {
    if (!realNames.has(name)) {
      throw new Error(
        `registry/dependencies.json declares "${name}", which is not a real ` +
          `registry/default/ui directory. Remove the stale entry.`,
      );
    }
  }

  for (const item of items) {
    const declared = [...(manifest.components[item.name] ?? [])].sort();
    const derived = [...item.dependencies].sort();
    if (JSON.stringify(declared) !== JSON.stringify(derived)) {
      throw new Error(
        `registry/dependencies.json's "${item.name}" entry ${JSON.stringify(declared)} ` +
          `does not match its derived dependencies ${JSON.stringify(derived)}.`,
      );
    }
  }
}

function main() {
  if (!existsSync(SRC)) throw new Error(`No component source at ${SRC}`);

  const names = readdirSync(SRC, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (names.length === 0) throw new Error(`No components found in ${SRC}`);

  // Rebuilt from scratch so a deleted component cannot linger as a stale URL.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const items = names.map(buildItem);

  checkDeclaredDependencies(names, items);

  for (const item of items) {
    writeFileSync(join(OUT, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
  }

  writeFileSync(
    join(OUT, "registry.json"),
    `${JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema/registry.json",
        ...REGISTRY,
        // The index carries metadata only — file bodies live in the per-item
        // documents the CLI actually fetches.
        items: items.map(({ files, ...rest }) => ({
          ...rest,
          files: files.map(({ path, type, target }) => ({ path, type, target })),
        })),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`registry: wrote ${items.length} items to ${relative(ROOT, OUT)}`);
  for (const item of items) {
    console.log(`  ${item.name} → ${item.dependencies.join(", ") || "no dependencies"}`);
  }
}

main();
