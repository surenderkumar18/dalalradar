// app/layout.js
//
// 🎯 ROOT LAYOUT
// Changes from prior version:
//   ✅ Fixed metadata (was "Create Next App" — embarrassing in production)
//   ✅ Added OpenGraph + Twitter cards (for social sharing)
//   ✅ Switched to JetBrains Mono + Fraunces (matches landing page brand)
//   ✅ Added theme color + favicon refs
//   ✅ Set Indian locale
//   ✅ Wired GA4 + Microsoft Clarity + Vercel Analytics
//      → GA4 and Clarity only fire in production (NEXT_PUBLIC_VERCEL_ENV)
//
// 🆕 SEO UPDATE (May 2026):
//   ✅ Blocks search engines from indexing app.dalalradar.com
//      → app is a TOOL, not content. SEO traffic should go to dalalradar.com
//   ✅ Removed `keywords` meta (Google ignores since 2009)
//
// This file affects EVERY page in your app.

import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";

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
// Shows up in:
//   - Browser tab title
//   - Social media previews (WhatsApp, Twitter, LinkedIn shares)
//   - NOT Google search results — we explicitly block indexing below.
//     The app is a tool. All discovery traffic should land on the
//     marketing site at dalalradar.com.
export const metadata = {
  metadataBase: new URL("https://app.dalalradar.com"),
  title: {
    default: "DalalRadar — Smart Money Tools",
    template: "%s · DalalRadar",
  },
  description:
    "DalalRadar tool dashboard. Track institutional money flow across 208 F&O stocks on Dalal Street.",
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

  // 🔒 BLOCK SEARCH ENGINES FROM INDEXING THE APP
  // The app is a tool, not marketing content. Keep all SEO traffic on
  // dalalradar.com (landing), then click-through to launch the app.
  // This prevents tool URLs and query-param variants from polluting search.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },

  // OG/Twitter STAY — these are for link sharing (WhatsApp/Twitter etc),
  // which is independent of search indexing. When a user shares an app
  // URL, they should still see a branded preview card.
  openGraph: {
    title: "DalalRadar — Smart Money Tools",
    description:
      "Track institutional money flow on Dalal Street. Real-time signal engine for Indian F&O.",
    url: "https://app.dalalradar.com",
    siteName: "DalalRadar",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://dalalradar.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "DalalRadar — Smart Money Radar for Indian F&O",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DalalRadar — Smart Money Tools",
    description: "Smart money tracking for Dalal Street.",
    creator: "@DalalRadarIN",
    site: "@DalalRadarIN",
    images: ["https://dalalradar.com/og-image.png"],
  },
};

// ─── VIEWPORT ─────────────────────────────────────────────────────────
// Separate export in Next.js 14+
export const viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: true,
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

        {/* Google Analytics 4 */}
        {/* Google Analytics 4 — only in production */}
        {process.env.NEXT_PUBLIC_VERCEL_ENV === "production" && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-FFMMK4L8PP"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-FFMMK4L8PP', { anonymize_ip: true });
              `}
            </Script>
          </>
        )}

        {/* Microsoft Clarity — only in production */}
        {process.env.NEXT_PUBLIC_VERCEL_ENV === "production" && (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wvkpr09c1o");
          `}
          </Script>
        )}

        {/* Vercel Analytics */}
        <Analytics />
      </body>
    </html>
  );
}
