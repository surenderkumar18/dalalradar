// app/tools/smart-money-sector-river/layout.js
// ════════════════════════════════════════════════════════════
//  SECTOR RIVER — per-page metadata
//
//  Server Component. Wraps the client-side page.js and provides
//  proper metadata for social shares and browser tabs.
//
//  Place this file at:
//    app/tools/smart-money-sector-river/layout.js
// ════════════════════════════════════════════════════════════

export const metadata = {
  title: "Sector River — DalalRadar",
  description:
    "Watch capital flow between 21 F&O sectors. Day-over-day rotation arrows show which sectors institutions are bidding into and which they're abandoning — before the rotation shows up in price.",

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
    canonical: "https://app.dalalradar.com/tools/smart-money-sector-river",
  },

  openGraph: {
    type: "website",
    title: "Sector River — Capital Flow Between F&O Sectors",
    description:
      "21 sectors plotted as flow ribbons. Spot rotation before price catches up.",
    url: "https://app.dalalradar.com/tools/smart-money-sector-river",
    siteName: "DalalRadar",
    locale: "en_IN",
    images: [
      {
        url: "https://dalalradar.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Sector River — capital rotation between 21 F&O sectors on DalalRadar",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@DalalRadarIN",
    creator: "@DalalRadarIN",
    title: "Sector River — DalalRadar",
    description:
      "Watch capital rotate between 21 F&O sectors. Spot rotation before price catches up.",
    images: ["https://dalalradar.com/og-image.png"],
  },
};

export default function SectorRiverLayout({ children }) {
  return children;
}