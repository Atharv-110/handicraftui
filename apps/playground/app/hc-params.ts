import type { Fidelity, FillLevel, Hand, InkStyle } from "@handicraft/core";

export interface HcParams {
  fidelity: Fidelity;
  dark: boolean;
  texture: boolean;
  stress: boolean;
  ink: InkStyle;
  drawOn: boolean;
  hand?: Hand;
  drawMs?: number;
  fill?: FillLevel;
}

const HANDS = ["steady", "natural", "loose", "hurried"] as const;
const FILLS = ["no", "low", "med", "high"] as const;

/**
 * The nine-key URL vocabulary `/` and `/matrix` both read, parsed once. This
 * project has already hit the two-homes-for-one-value defect three times
 * (`--hc-red`/`--hc-danger`, the tier-1/tier-2 constants, `--hc-shadow`
 * declared inside `:root` only), so a second hand-written parser for
 * `/matrix` would be a fourth — a spec pinning `hand=loose` could silently
 * measure `natural` if the two copies drifted.
 *
 * The three optional keys are built by conditional spread and are *absent*
 * from the returned object when the URL omits them, never present as an
 * explicit `undefined`. That is what lets a caller keep the
 * `{...(hand ? { initialHand: hand } : {})}` shape and let
 * `HandicraftProvider`'s own default take over — CODE-CONTRACT.md's rule:
 * omitting a prop and passing it as `undefined` are different things to a
 * component reading `x !== undefined`.
 */
export function parseHcParams(params: Record<string, string | string[] | undefined>): HcParams {
  const fidelity = params.fidelity === "lite" ? "lite" : "high";
  const dark = params.dark === "1";
  // `texture` is the one key that inverts. Every other key reads "present with a
  // specific value means non-default"; this one reads "absent means on", so a
  // builder emitting `texture=1` for the true case is silently correct here and
  // silently wrong for anything using the URL to know the true state. Kept as
  // `!== "0"` rather than normalised, because normalising it would change what
  // `/` renders for every URL that omits the key.
  const texture = params.texture !== "0";
  const stress = params.stress === "1";
  const hand = HANDS.find((h) => h === params.hand);
  const ink = params.ink === "plain" ? "plain" : "layered";
  const drawOn = params.drawOn === "1";
  const drawMs = Number(params.drawMs) || undefined;
  const fill = FILLS.find((f) => f === params.fill);

  return {
    fidelity,
    dark,
    texture,
    stress,
    ink,
    drawOn,
    ...(hand !== undefined ? { hand } : {}),
    ...(drawMs !== undefined ? { drawMs } : {}),
    ...(fill !== undefined ? { fill } : {}),
  };
}
