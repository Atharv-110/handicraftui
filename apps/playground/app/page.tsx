import { HandicraftSurface } from "@handicraft/core";
import { parseHcParams } from "./hc-params";
import { Harness } from "./harness";

/**
 * A Server Component on purpose.
 *
 * `HandicraftSurface` (cycle 005) is `"use client"`, imported from the
 * default entry — a Server Component rendering a client component into its
 * own tree is the ordinary Next.js shape, no different from
 * `HandicraftProvider` inside `Harness` a few lines below. This file used to
 * call `cn` from the `/utils` split entry here to prove that entry has no
 * "use client" of its own; that call moved into `HandicraftSurface` along
 * with the theme class and the paint it now pairs with, so `apps/playground`
 * no longer exercises the split entry directly. `packages/core/src/utils.ts`
 * still deliberately carries no directive — `Input`'s wrapper import in
 * `registry/default/ui/input/input.tsx` is unaffected either way, since it
 * imports `cn` from the bare `@handicraft/core` specifier, not `/utils`.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Read on the server so the initial state matches between server and client.
  // Deriving it from window.location in a useState initialiser would mismatch.
  // Also gives Playwright a way to pin a tier without clicking anything.
  // Parsing itself moved to hc-params.ts — cycle 004, so `/matrix` reads the
  // same nine-key vocabulary instead of growing a second, driftable copy.
  const params = await searchParams;
  const hc = parseHcParams(params);

  return (
    // The theme class has to wrap the header too, or dark mode leaves a strip
    // of light paper above the fold. `<header>` keeps its own paint below —
    // same reasoning as `HandicraftSurface`'s own inline style, applied by
    // hand because the header is not itself the themed root.
    <HandicraftSurface as="main" dark={hc.dark}>
      <header className="bg-hc-paper text-hc-ink px-6 pt-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-hand text-3xl">Handicraft UI</h1>
          <p className="font-body text-hc-ink-soft mt-1 text-sm">
            Server-rendered above the fold. Tier 1 paints first, rough.js replaces it before paint.
          </p>
        </div>
      </header>
      <Harness
        initialFidelity={hc.fidelity}
        initialDark={hc.dark}
        initialTexture={hc.texture}
        initialStress={hc.stress}
        {...(hc.hand ? { initialHand: hc.hand } : {})}
        initialInk={hc.ink}
        initialDrawOn={hc.drawOn}
        {...(hc.drawMs ? { initialDrawMs: hc.drawMs } : {})}
        {...(hc.fill ? { initialFill: hc.fill } : {})}
      />
    </HandicraftSurface>
  );
}
