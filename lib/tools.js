// lib/tools.js
//
// 🎯 TOOLS REGISTRY — single source of truth for all DalalRadar tools.
//
// Adding a new tool? Just add one entry below. The dashboard, navigation,
// and tool switcher will all pick it up automatically.
//
// Status values:
//   "live"     → tool is built, fully usable
//   "beta"     → tool is usable but rough edges
//   "soon"     → coming soon, shows "Notify me" instead of "Open"
//   "planned"  → on roadmap, not visible to users yet
//
// To add a new tool (e.g., "Volatility Scanner"):
//   1. Add an entry to the TOOLS array below
//   2. Create app/tools/volatility-scanner/page.js
//   3. That's it — dashboard updates automatically

export const TOOLS = [
  {
    id: "smart-money",
    name: "Bubble Chart",
    tagline: "Smart Money Radar",
    description:
      "Track institutional money flow across 208 F&O stocks. 18-pattern signal engine, sector rotation, and whale detection — all in one timeline.",
    status: "live",
    href: "/tools/smart-money",
    icon: "bubble",
    accent: "var(--green)",
    features: [
      "5-tier color scale (accumulation → distribution)",
      "18-pattern signal engine",
      "Sector + stock + all-stocks views",
      "Whale tracking and recovery detection",
    ],
  },
  {
    id: "rollover",
    name: "Rollover",
    tagline: "Futures Expiry Analytics",
    description:
      "Track F&O rollover percentages, strike-level OI changes, and rollover-driven price action across monthly and quarterly expiries.",
    status: "soon",
    href: "/tools/rollover",
    icon: "rollover",
    accent: "var(--gold)",
    features: [
      "Rollover % per stock per expiry",
      "Strike OI buildup detection",
      "Cross-month rollover comparison",
      "Aggressive rollover alerts",
    ],
  },
  {
    id: "heatmap",
    name: "Heatmap",
    tagline: "Sector Intensity Map",
    description:
      "Visualize money flow intensity across all 21 F&O sectors at a glance. Color encodes accumulation strength, size encodes turnover.",
    status: "soon",
    href: "/tools/heatmap",
    icon: "heatmap",
    accent: "var(--red)",
    features: [
      "21 sectors color-coded by flow",
      "Real-time intensity updates",
      "Drill-down into sector composition",
      "Historical heatmap playback",
    ],
  },
  {
    id: "learn",
    name: "Learn",
    tagline: "Methodology & Patterns",
    description:
      "Educational library covering chart patterns, money flow concepts, F&O mechanics, and the DalalRadar methodology in plain language.",
    status: "live",
    href: "/learn",
    icon: "learn",
    accent: "var(--cyan)",
    features: [
      "Candlestick patterns explained",
      "Smart money concepts",
      "F&O glossary",
      "Method documentation",
    ],
  },
];

// Helper functions for components
export const getLiveTools = () => TOOLS.filter((t) => t.status === "live");
export const getSoonTools = () => TOOLS.filter((t) => t.status === "soon");
export const getToolById = (id) => TOOLS.find((t) => t.id === id);
export const getToolByHref = (href) => TOOLS.find((t) => t.href === href);

// Status display helpers
export const STATUS_CONFIG = {
  live: {
    label: "LIVE",
    color: "var(--green)",
    bg: "rgba(0, 255, 162, 0.12)",
  },
  beta: {
    label: "BETA",
    color: "var(--gold)",
    bg: "rgba(250, 204, 21, 0.12)",
  },
  soon: {
    label: "SOON",
    color: "var(--text-mute)",
    bg: "rgba(100, 116, 139, 0.12)",
  },
  planned: {
    label: "PLANNED",
    color: "var(--text-mute)",
    bg: "rgba(100, 116, 139, 0.08)",
  },
};