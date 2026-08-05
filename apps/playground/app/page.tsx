import { cn } from "@handicraft/core/utils";
import { parseHcParams } from "./hc-params";
import { Harness } from "./harness";

/**
 * A Server Component on purpose.
 *
 * `cn` is imported from `@handicraft/core/utils`, the entry with no "use client"
 * directive — calling it here proves the split entry actually works. Importing
 * it from the default entry would throw at render time.
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
    // The theme class has to wrap the header too, or dark mode leaves a strip of
    // light paper above the fold.
    <main className={cn(hc.dark && "dark")}>
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
    </main>
  );
}
