// app/layout.js
//
// 🎯 STEP 1 OF REFACTOR — Root layout
// Changes:
//   ✅ Fixed metadata (was "Create Next App" — embarrassing in production)
//   ✅ Added OpenGraph + Twitter cards (for social sharing)
//   ✅ Switched to JetBrains Mono + Fraunces (matches landing page brand)
//   ✅ Added theme color + favicon refs
//   ✅ Set Indian locale
//
// This file affects EVERY page in your app.

import "./globals.css";
import { JetBrains_Mono, Fraunces } from "next/font/google";

// ─── BRAND FONTS ───────────────────────────────────────────────────────
// JetBrains Mono → data, body, UI (terminal feel)
// Fraunces       → display, headlines (editorial flair)
//
// These match dalalradar.com landing page exactly for brand consistency.
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// ─── METADATA ─────────────────────────────────────────────────────────
// This shows up in:
//   - Browser tab title
//   - Google search results
//   - Social media previews (when sharing app.dalalradar.com)
//   - WhatsApp/Telegram link previews
export const metadata = {
  metadataBase: new URL("https://app.dalalradar.com"),
  title: {
    default: "DalalRadar — Smart Money Tools",
    template: "%s · DalalRadar",
  },
  description:
    "Track institutional money flow on Dalal Street. Real-time signal engine, sector rotation tracker, and whale alerts for Indian F&O markets.",
  keywords: [
    "smart money india",
    "dalal street tracker",
    "f&o analysis",
    "sector rotation",
    "money flow",
    "institutional trading",
    "indian stock market tools",
  ],
  authors: [{ name: "DalalRadar" }],
  creator: "DalalRadar",
  publisher: "DalalRadar",
  applicationName: "DalalRadar",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "DalalRadar — Smart Money Tools",
    description:
      "Track institutional money flow on Dalal Street. Real-time signal engine for Indian F&O.",
    url: "https://app.dalalradar.com",
    siteName: "DalalRadar",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DalalRadar",
    description: "Smart money tracking for Dalal Street.",
    creator: "@DalalRadarIN",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

// ─── VIEWPORT ─────────────────────────────────────────────────────────
// Separate export in Next.js 14+
export const viewport = {
  themeColor: "#0a0a0c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// ─── ROOT LAYOUT ──────────────────────────────────────────────────────
export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${mono.variable} ${display.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}