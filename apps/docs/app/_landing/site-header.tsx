/**
 * FB-1, cycle 012 architect verdict §9.3 (F-4). No nav, no header and no
 * skip link shipped in this cycle's first pass — a real gap on the first
 * page every visitor sees, and three separate locked documents (Part 2 §5's
 * wireframe, its §3 type-role table, this cycle's own B8) already described
 * one that never got built.
 *
 * Text only, 44px, zero frames — neither element calls `useSketchFrame`, so
 * `document.querySelectorAll(".hc-frame")` is unaffected and LN-1's 70 holds.
 *
 * One real link, deliberately: the repository, the same destination the
 * footer already links to. Not "components" or "docs" — those routes do not
 * exist yet, and Part 2 §11 item 9 forbids shipping an instruction that
 * does not work, which applies identically to a nav link that 404s.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="bg-hc-paper text-hc-ink focus:border-hc-ink sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:border focus:px-4 focus:text-sm focus:underline"
    >
      Skip to content
    </a>
  );
}

/**
 * `min-h-11` (44px) rather than a fixed height, so the row never clips if
 * the wordmark or link text wraps at a narrow width — `min-h-11` decodes
 * cleanly onto `SIZE_PX` either way, unlike a fixed `h-11` that would still
 * pass the lint rule but could clip real content.
 */
export function SiteHeader() {
  return (
    <header className="mx-auto flex min-h-11 max-w-[1120px] items-center justify-between px-6 py-3">
      <span className="font-hand text-hc-ink text-lg">Handicraft UI</span>
      <a
        href="https://github.com/Atharv-110/handicraftui"
        className="font-body text-hc-ink-soft inline-flex min-h-11 items-center text-sm underline underline-offset-2"
      >
        github.com/Atharv-110/handicraftui
      </a>
    </header>
  );
}
