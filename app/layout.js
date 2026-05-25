// app/layout.js
//
// 🎯 ROOT LAYOUT — applies to EVERY page in app.dalalradar.com.
//
// Current state:
//   ✅ Real metadata (title, description, OG, Twitter)
//   ✅ JetBrains Mono + Fraunces (matches landing brand)
//   ✅ Theme color #0b1220 (brand navy)
//   ✅ Indian locale (en_IN)
//   ✅ Pinch-zoom enabled (a11y / WCAG 2.1)
//   ✅ Blocks search engines from indexing the app
//      → all SEO traffic should go to dalalradar.com (landing)
//   ✅ GA4 + Microsoft Clarity gated to production only
//      → no analytics noise from preview deployments or local dev
//   ✅ Vercel Analytics always on (separates prod/preview internally)
//
// METADATA INHERITANCE:
//   If you add `export const metadata = {...}` to any page.js, it MERGES
//   with this layout's metadata — but `robots` does not always inherit
//   safely. Best practice: don't re-declare `robots` in page.js; just
//   override `title` and let everything else inherit.

import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";

import "./globals.css";
import { JetBrains_Mono, Fraunces } from "next/font/google";

// ─── BRAND FONTS ───────────────────────────────────────────────────────
// JetBrains Mono → data, body, UI (terminal feel)
// Fraunces       → display, headlines (editorial flair)
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
  // The app is a tool, not marketing content. All SEO discovery should
  // land on dalalradar.com (landing), then click through to launch the app.
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
  // which is independent of search indexing. When a user shares an app URL,
  // they should still see a branded preview card.
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
  userScalable: true, // a11y: allow pinch-zoom (WCAG 2.1 SC 1.4.4)
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