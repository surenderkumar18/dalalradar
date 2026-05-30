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
//   "dev"      → 🆕 internal/admin tool, ONLY visible in development
//
// To add a new tool (e.g., "Volatility Scanner"):
//   1. Add an entry to the TOOLS array below
//   2. Create app/tools/volatility-scanner/page.js
//   3. That's it — dashboard updates automatically
//
// 🔒 To add a DEV-ONLY tool (e.g., internal filters/admin):
//   1. Add entry inside the conditional spread at the bottom
//   2. Add corresponding redirect block in next.config.mjs
//   3. Add NODE_ENV check at top of the page component

// ─── PUBLIC TOOLS (always visible) ───────────────────────────────────
const PUBLIC_TOOLS = [
  {
    id: "smart-money",
    name: "Smart Money Radar",
    tagline: "Daily Money Flow Timeline",
    description:
      "Track institutional money flow across 220+ Highly Liquid stocks. 18-pattern signal engine, sector rotation, and whale detection — all in one timeline.",
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
    id: "market-alpha",
    name: "Market Alpha",
    tagline: "Relative Strength Engine",
    description:
      "Rank all 21 sectors by relative strength vs Nifty. Spot leaders before the breakout, laggards before the breakdown — with VIX-aware sizing cues.",
    status: "live",
    href: "/tools/market-alpha",
    icon: "alpha",
    accent: "var(--purple)",
    features: [
      "RS vs Nifty across 1wk → 2y windows",
      "VIX regime: safe / caution / danger",
      "Top-N leaders & bottom-N laggards",
      "Whale tracker on top sectors",
    ],
  },
  {
    id: "smart-money-sector-river",
    name: "Sector River",
    tagline: "Sector Flow & Rotation",
    description:
      "Watch capital rotate sector-to-sector in real time. Visualize which sectors institutions are bidding into and which they're abandoning.",
    status: "live",
    href: "/tools/smart-money-sector-river",
    icon: "river",
    accent: "var(--cyan)",
    features: [
      "21 sectors plotted as flow ribbons",
      "Day-over-day rotation arrows",
      "Inflow/outflow ranking",
      "Cross-sector momentum compare",
    ],
  },
  {
    id: "learn",
    name: "Learn",
    tagline: "Methodology & Patterns",
    description:
      "How DalalRadar reads the market — 18 signal patterns, 6 behaviors, and the money-flow math behind every bubble, all in plain language.",
    status: "live",
    href: "https://dalalradar.com/methodology.html",
    external: true,
    icon: "learn",
    accent: "var(--cyan)",
    features: [
      "Money flow formula explained",
      "18 signal patterns walkthrough",
      "6 behavioral states (accumulation → trap)",
      "F&O glossary and chart basics",
    ],
  },
  {
    id: "advanced-heatmap",
    name: "Advanced Heatmap",
    tagline: "Intensity & Turnover Map",
    description:
      "Visualize money flow intensity across all 21 F&O sectors at a glance. Color encodes accumulation strength, size encodes turnover.",
    status: "soon",
    href: "/tools/advanced-heatmap",
    icon: "heatmap",
    accent: "var(--gold)",
    features: [
      "21 sectors color-coded by flow",
      "Real-time intensity updates",
      "Drill-down into sector composition",
      "Historical heatmap playback",
    ],
  },
];

// ─── DEV-ONLY TOOLS (hidden in production) ───────────────────────────
// These ONLY appear when NODE_ENV !== "production".
// On Vercel/live site, this array is empty and tools are invisible
// in dashboards, switchers, and footer.
const DEV_ONLY_TOOLS =
  process.env.NODE_ENV !== "production"
    ? [
        
        // Add more dev-only tools here as needed
      ]
    : [];

// ─── EXPORTED REGISTRY ───────────────────────────────────────────────
export const TOOLS = [...PUBLIC_TOOLS, ...DEV_ONLY_TOOLS];

// ─── Helper functions for components ─────────────────────────────────
export const getLiveTools = () => TOOLS.filter((t) => t.status === "live");
export const getSoonTools = () => TOOLS.filter((t) => t.status === "soon");
export const getDevTools = () => TOOLS.filter((t) => t.status === "dev");
export const getToolById = (id) => TOOLS.find((t) => t.id === id);
export const getToolByHref = (href) => TOOLS.find((t) => t.href === href);

// ─── Status display helpers ──────────────────────────────────────────
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
  dev: {
    label: "DEV",
    color: "var(--purple, #a78bfa)",
    bg: "rgba(167, 139, 250, 0.12)",
  },
};