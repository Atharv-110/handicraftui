import type { Metadata } from "next";
import { Kalam } from "next/font/google";
import "./globals.css";

/**
 * Kalam (OFL) is the permanent hand face, not a placeholder for Excalifont —
 * ROADMAP §6.8's font decision. Weights 400 and 700 cover every hand-face use
 * on the landing: kickers and marginalia at 400, headings and the headline at
 * 700. `display: "swap"` because Kalam is the brand at the top of the page
 * and a flash of invisible text costs more than a flash of the fallback.
 */
const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Handicraft UI",
  description: "A hand-drawn React component library, in the spirit of roughViz.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Server-rendered, zero client cost. Mirrors apps/playground/app/layout.tsx —
    // the landing has no fidelity/theme URL seam of its own (§1.0: this route
    // carries no URL-addressable state), so there is nothing here for a Playwright
    // spec to pin ahead of navigation the way E1 does for the playground.
    <html lang="en" className={kalam.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
