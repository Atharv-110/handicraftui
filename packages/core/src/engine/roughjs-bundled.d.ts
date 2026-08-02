/**
 * roughjs ships types for `bin/*` but not for the bundled entry point, which is
 * the only one Node's ESM resolver can actually load (see generator.ts). The
 * real shape is asserted structurally at the import site.
 */
declare module "roughjs/bundled/rough.esm.js" {
  const rough: unknown;
  export default rough;
}
