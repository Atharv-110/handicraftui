import { Spike } from "./spike";

/**
 * Portal spike route.
 *
 * Unlinked from the rest of the playground on purpose — nothing in
 * `apps/playground` navigates here, and it is reached only by typing the URL.
 * See `spike.tsx`'s file header for what this route is answering and why it
 * stays quarantined as a diagnostic rig rather than becoming a pattern to copy.
 *
 * A plain Server Component, same as the main `page.tsx`: there is nothing here
 * that needs the client boundary, so there is no reason to pay for one.
 */
export default function SpikePortalPage() {
  return <Spike />;
}
