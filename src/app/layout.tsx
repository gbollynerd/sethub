import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Self-hosted variable fonts. Outfit carries the display voice (tight,
 * geometric, confident); Plus Jakarta Sans handles body copy. Shipping them
 * ourselves keeps the first paint fast and avoids a third-party request.
 */
const outfit = localFont({
  src: "./fonts/outfit-variable.woff2",
  variable: "--font-outfit",
  display: "swap",
  weight: "100 900",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const jakarta = localFont({
  src: "./fonts/plus-jakarta-sans-variable.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "200 800",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "SetHub — the digital home for your school set",
    template: "%s · SetHub",
  },
  description:
    "SetHub is a digital alumni workspace. One account, many school communities — each set runs its own private space for people, chat, events, elections, projects and transparent finances.",
  applicationName: "SetHub",
  keywords: [
    "alumni association", "old students association", "class set",
    "alumni platform Nigeria", "school reunion", "alumni dues",
  ],
  openGraph: {
    title: "SetHub — the digital home for your school set",
    description:
      "One account, many school communities. Chat, elections, dues, projects and institutional memory, all in one place.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0898A0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
