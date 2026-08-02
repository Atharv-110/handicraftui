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
    <html lang="en" className={kalam.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
