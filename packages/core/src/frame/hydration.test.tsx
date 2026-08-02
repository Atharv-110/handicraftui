import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HandcraftProvider, type Fidelity } from "../theme/context";
import { useSketchFrame } from "./useSketchFrame";

function Box({ label }: { label: string }) {
  const { frameProps, sketchLayer } = useSketchFrame({ shape: "rounded", radius: 8 });
  return (
    <div className="hc-frame" {...frameProps}>
      {sketchLayer}
      {label}
    </div>
  );
}

function App({ fidelity }: { fidelity: Fidelity }) {
  return (
    <HandcraftProvider fidelity={fidelity}>
      <Box label="one" />
      <Box label="two" />
      <Box label="three" />
    </HandcraftProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function hydrateAndCollectErrors(fidelity: Fidelity) {
  const html = renderToString(
    <StrictMode>
      <App fidelity={fidelity} />
    </StrictMode>,
  );

  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  const errors: unknown[][] = [];
  vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args));

  await act(async () => {
    hydrateRoot(
      container,
      <StrictMode>
        <App fidelity={fidelity} />
      </StrictMode>,
    );
  });

  return { html, container, errors };
}

describe("SSR hydration", () => {
  // The single highest-risk failure in the whole library: rough.js without a
  // seed produces different path data on every call, so an unseeded tier-2
  // component mismatches on the `d` attribute of every path it renders.
  it.each<Fidelity>(["lite", "high"])("hydrates cleanly at fidelity=%s", async (fidelity) => {
    const { errors } = await hydrateAndCollectErrors(fidelity);
    const mismatches = errors.filter((e) => String(e[0]).match(/hydrat|did not match|mismatch/i));
    expect(mismatches).toEqual([]);
  });

  it("emits no sketch SVG in server HTML, so both tiers start identical", async () => {
    const html = renderToString(<App fidelity="high" />);
    // Tier 2 has not measured anything yet on the server. If it emitted an SVG
    // here it would be sized from a guess, and the client would disagree.
    expect(html).not.toContain("hc-sketch-svg");
    expect(html).not.toContain('data-hc-fidelity="high"');
  });

  it("assigns a stable seed bucket to server and client markup", async () => {
    const { html, container } = await hydrateAndCollectErrors("lite");

    const serverSeeds = [...html.matchAll(/data-hc-seed="(\d+)"/g)].map((m) => m[1]);
    const clientSeeds = [...container.querySelectorAll("[data-hc-seed]")].map((el) =>
      el.getAttribute("data-hc-seed"),
    );

    expect(serverSeeds.length).toBe(3);
    expect(clientSeeds).toEqual(serverSeeds);
  });

  it("gives sibling components different wobble", async () => {
    const html = renderToString(<App fidelity="lite" />);
    const seeds = [...html.matchAll(/data-hc-seed="(\d+)"/g)].map((m) => m[1]);
    // Not a strict requirement of correctness, but three identical frames in a
    // row is the tell that the seed is not actually varying.
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
});
