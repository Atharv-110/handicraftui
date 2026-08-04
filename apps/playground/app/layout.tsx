import type { Metadata } from "next";
import { Kalam } from "next/font/google";
import "./globals.css";

/**
 * Kalam (OFL) stands in for Excalifont until the self-hosted `registry:font`
 * item exists. Without a real hand face loaded, the stack falls through to the
 * generic `cursive` keyword, which macOS resolves to a formal serif italic —
 * it reads as an accident rather than a choice.
 */
const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Handicraft UI — playground",
  description: "Tier comparison harness for the hand-drawn component library.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Server-rendered, zero client cost, and `suppressHydrationWarning` is
    // already here. `reuseExistingServer: false` in playwright.config.ts
    // already keeps a timing spec off `next dev`, but Rule V4's history is a
    // list of times this project trusted a process and got a stale artifact
    // anyway — an assertion beats a convention. Cycle 003's E1 reads this
    // before any timing spec runs, so a spec accidentally talking to `next
    // dev` fails loudly instead of just reporting a faster number.
    <html
      lang="en"
      className={kalam.variable}
      suppressHydrationWarning
      data-hc-env={process.env.NODE_ENV}
    >
      <body>{children}</body>
    </html>
  );
}
