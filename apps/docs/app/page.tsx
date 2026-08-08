import { Hero } from "./_landing/hero";
import { BlackboardToggle } from "./_landing/blackboard-toggle";
import { SkipLink, SiteHeader } from "./_landing/site-header";
import {
  ComponentsAtWork,
  FourHands,
  LandingFooter,
  TheHandover,
  TheNumbers,
  WhatExists,
} from "./_landing/sections";

/**
 * The landing — a static showcase route. No URL-addressable state seam, no
 * `?fidelity=` parameter, no hand switcher, no CTA, no install command, no
 * waitlist (cycle 012 §1.0). `/matrix` and the playground harness already
 * own URL-addressable state and are not duplicated here.
 *
 * A Server Component throughout — nothing on this page reads `searchParams`
 * the way `apps/playground/app/page.tsx` does, since there is no state to
 * seed from a URL. Every section it renders is itself a client component
 * where it needs to be (`Hero`'s `HandicraftProvider`, the two nested
 * providers in `TheHandover` and `FourHands`, `BlackboardToggle`'s
 * `useState`), same shape as the playground's `Page` composing `Harness`.
 *
 * Section order is Part 2 §6's seven sections plus footer, section 2 fixed
 * at position 2 per the founder's 2026-08-07 ruling — it is an engineering
 * argument standing where every comparable landing puts a benefit, on
 * purpose.
 */
export default function Page() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main">
        <Hero />
        <TheHandover />
        <FourHands />
        <ComponentsAtWork />
        <BlackboardToggle />
        <TheNumbers />
        <WhatExists />
        <LandingFooter />
      </main>
    </>
  );
}
