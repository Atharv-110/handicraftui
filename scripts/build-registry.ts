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

const REGISTRY = {
  name: "handcraft-ui",
  homepage: "https://github.com/Atharv-110/handcraft-ui",
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
    description: meta.description ?? `${toTitle(name)} — a hand-drawn Handcraft UI component.`,
    dependencies: [...dependencies].sort(),
    registryDependencies: meta.registryDependencies ?? [],
    files,
  };
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
