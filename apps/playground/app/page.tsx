import { cn } from "@handcraft/core/utils";
import { Harness } from "./harness";

/**
 * A Server Component on purpose.
 *
 * `cn` is imported from `@handcraft/core/utils`, the entry with no "use client"
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
  const params = await searchParams;
  const fidelity = params.fidelity === "lite" ? "lite" : "high";
  const dark = params.dark === "1";
  const texture = params.texture !== "0";
  const stress = params.stress === "1";
  const hand = (["steady", "natural", "loose", "hurried"] as const).find((h) => h === params.hand);
  const ink = params.ink === "plain" ? "plain" : "layered";
  const drawOn = params.drawOn === "1";
  const drawMs = Number(params.drawMs) || undefined;
  const fill = (["no", "low", "med", "high"] as const).find((f) => f === params.fill);

  return (
    // The theme class has to wrap the header too, or dark mode leaves a strip of
    // light paper above the fold.
    <main className={cn(dark && "dark")}>
      <header className="bg-hc-paper text-hc-ink px-6 pt-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-hand text-3xl">Handcraft UI</h1>
          <p className="font-body text-hc-ink-soft mt-1 text-sm">
            Server-rendered above the fold. Tier 1 paints first, rough.js replaces it before paint.
          </p>
        </div>
      </header>
      <Harness
        initialFidelity={fidelity}
        initialDark={dark}
        initialTexture={texture}
        initialStress={stress}
        {...(hand ? { initialHand: hand } : {})}
        initialInk={ink}
        initialDrawOn={drawOn}
        {...(drawMs ? { initialDrawMs: drawMs } : {})}
        {...(fill ? { initialFill: fill } : {})}
      />
    </main>
  );
}
