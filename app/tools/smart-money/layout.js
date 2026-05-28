// app/tools/smart-money/layout.js
// ════════════════════════════════════════════════════════════
//  SMART MONEY RADAR — per-page metadata
//
//  Server Component (no "use client"). This wraps the existing
//  client-side page.js and provides proper metadata for social
//  shares, browser tabs, and noindex enforcement.
//
//  Place this file alongside page.js at:
//    app/tools/smart-money/layout.js
// ════════════════════════════════════════════════════════════
import Providers from "./Providers";  
export const metadata = {
  title: "Smart Money Radar — DalalRadar",
  description:
    "Visualize institutional money flow across 208 F&O stocks. 18-pattern signal engine reads delivery, OI, and money flow to surface accumulation, distribution, and rotation.",

  // App pages stay out of search engines — landing site funnels SEO.
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
    canonical: "https://app.dalalradar.com/tools/smart-money",
  },

  openGraph: {
    type: "website",
    title: "Smart Money Radar — Track Institutional Flow on Dalal Street",
    description:
      "Daily money flow timeline across 208 F&O stocks. 5-tier color scale, 18-pattern signal engine, sector + stock views.",
    url: "https://app.dalalradar.com/tools/smart-money",
    siteName: "DalalRadar",
    locale: "en_IN",
    images: [
      {
        url: "https://dalalradar.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Smart Money Radar — DalalRadar's institutional flow timeline",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@DalalRadarIN",
    creator: "@DalalRadarIN",
    title: "Smart Money Radar — DalalRadar",
    description:
      "Track institutional money flow across 208 F&O stocks. 18-pattern signal engine.",
    images: ["https://dalalradar.com/og-image.png"],
  },
};

export default function SmartMoneyLayout({ children }) {
  return <Providers>{children}</Providers>;  
}