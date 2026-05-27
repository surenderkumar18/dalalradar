// app/tools/market-alpha/layout.js
// ════════════════════════════════════════════════════════════
//  MARKET ALPHA — per-page metadata
//
//  Server Component. Wraps the client-side page.js and provides
//  proper metadata for social shares and browser tabs.
//
//  Place this file at:
//    app/tools/market-alpha/layout.js
// ════════════════════════════════════════════════════════════

export const metadata = {
  title: "Market Alpha — DalalRadar",
  description:
    "Rank 21 F&O sectors by relative strength vs Nifty across 1wk to 2y windows. VIX-aware position-sizing cues. Whale tracker on top sectors.",

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

  alternates: {
    canonical: "https://app.dalalradar.com/tools/market-alpha",
  },

  openGraph: {
    type: "website",
    title: "Market Alpha — Sector Relative Strength vs Nifty",
    description:
      "21 F&O sectors ranked by RS vs Nifty. VIX regime detection. Catch leaders before the breakout, laggards before the breakdown.",
    url: "https://app.dalalradar.com/tools/market-alpha",
    siteName: "DalalRadar",
    locale: "en_IN",
    images: [
      {
        url: "https://dalalradar.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Market Alpha — sector relative-strength ranking vs Nifty 50 on DalalRadar",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@DalalRadarIN",
    creator: "@DalalRadarIN",
    title: "Market Alpha — DalalRadar",
    description:
      "Sector relative-strength ranking vs Nifty with VIX-aware position sizing.",
    images: ["https://dalalradar.com/og-image.png"],
  },
};

export default function MarketAlphaLayout({ children }) {
  return children;
}