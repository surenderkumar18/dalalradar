// app\tools\bubbleChart\utils\visualHelpers.js

// =====================================================================
// 🎨 BUBBLE VISUAL ENGINE v2 — UNIVERSAL HELPERS
//
// Used by ALL views (sectors, stocks, all-stocks, favorites).
// Provides:
//   - 5-tier color scale (semantic intent encoding)
//   - Recency tiering (4 levels: fresh/recent/old/ancient)
//   - "Today" detection
//   - Consistent visual language across the entire app
//
// Drop this into: tools/bubbleChart/utils/visualHelpers.js
// =====================================================================

// =====================================================================
// 🎨 5-TIER COLOR SCALE
//
// Maps moneyFlowScore + delivery + price into semantic colors.
// Replaces the old 4-bucket (red/green/grey/purple) system with a
// 5-tier gradient that encodes accumulation STRENGTH, not just direction.
//
// Tier 1: STRONG ACCUMULATION  → Bright Green   (#22c55e)
// Tier 2: MILD ACCUMULATION    → Olive Green    (#84cc16)
// Tier 3: NEUTRAL              → Grey           (#64748b)
// Tier 4: MILD DISTRIBUTION    → Orange         (#f97316)
// Tier 5: STRONG DISTRIBUTION  → Bright Red     (#ef4444)
//
// PLUS:
// Tier 0: HIGH MOMENTUM        → Purple         (#a78bfa)
//          (overrides others when price >3% or finalScore >1.1)
// =====================================================================

const TIER_COLORS = {
  HIGH_MOMENTUM_UP:   { fill: "#a78bfa", tier: 0, label: "High momentum up" },
  STRONG_ACCUM:       { fill: "#22c55e", tier: 1, label: "Strong accumulation" },
  MILD_ACCUM:         { fill: "#84cc16", tier: 2, label: "Mild accumulation" },
  NEUTRAL:            { fill: "#64748b", tier: 3, label: "Neutral" },
  MILD_DIST:          { fill: "#f97316", tier: 4, label: "Mild distribution" },
  STRONG_DIST:        { fill: "#ef4444", tier: 5, label: "Strong distribution" },
  HIGH_MOMENTUM_DOWN: { fill: "#c026d3", tier: 0, label: "High momentum down" },
};

// =====================================================================
// 🎯 PRIMARY: 5-tier color resolver
// =====================================================================
export function resolveBubbleColorV2(d) {
  if (!d) return TIER_COLORS.NEUTRAL.fill;

  const mfs = d.moneyFlowScore || 0;
  const price = d.price || 0;
  const delivery = d.delivery || 0;
  const finalScore = d.finalScore || 0;

  // Tier 0: HIGH MOMENTUM (overrides everything)
  if (Math.abs(price) > 3 && Math.abs(finalScore) > 1.0) {
    return price > 0
      ? TIER_COLORS.HIGH_MOMENTUM_UP.fill
      : TIER_COLORS.HIGH_MOMENTUM_DOWN.fill;
  }
  if (finalScore > 1.1 && mfs > 0.6) {
    return TIER_COLORS.HIGH_MOMENTUM_UP.fill;
  }

  // Tier 1: STRONG ACCUMULATION (institutional buying)
  if (mfs > 0.3 && delivery > 50 && price >= 0) {
    return TIER_COLORS.STRONG_ACCUM.fill;
  }
  if (mfs > 0.4 && price > 0.5) {
    return TIER_COLORS.STRONG_ACCUM.fill;
  }

  // Tier 2: MILD ACCUMULATION
  if (mfs > 0.15 && price >= 0) {
    return TIER_COLORS.MILD_ACCUM.fill;
  }

  // Tier 5: STRONG DISTRIBUTION (institutional selling)
  if (mfs < -0.3 && delivery > 50 && price <= 0) {
    return TIER_COLORS.STRONG_DIST.fill;
  }
  if (mfs < -0.4 && price < -0.5) {
    return TIER_COLORS.STRONG_DIST.fill;
  }

  // Tier 4: MILD DISTRIBUTION
  if (mfs < -0.15 && price <= 0) {
    return TIER_COLORS.MILD_DIST.fill;
  }

  // Tier 3: NEUTRAL (default fallback)
  return TIER_COLORS.NEUTRAL.fill;
}

// =====================================================================
// 🎯 Get tier number (for sorting / opacity logic)
// =====================================================================
export function resolveBubbleTier(d) {
  const color = resolveBubbleColorV2(d);
  for (const key of Object.keys(TIER_COLORS)) {
    if (TIER_COLORS[key].fill === color) return TIER_COLORS[key].tier;
  }
  return 3;
}

// =====================================================================
// 🎯 Get tier label (for tooltips / legends)
// =====================================================================
export function resolveBubbleTierLabel(d) {
  const color = resolveBubbleColorV2(d);
  for (const key of Object.keys(TIER_COLORS)) {
    if (TIER_COLORS[key].fill === color) return TIER_COLORS[key].label;
  }
  return "Neutral";
}

// =====================================================================
// 📅 RECENCY TIERING v2
//
// Replaces binary "isRecent" with 4 tiers:
//   FRESH    → last 5 days     → 100% opacity
//   RECENT   → 6-20 days       → 70% opacity
//   OLD      → 21-60 days      → 40% opacity
//   ANCIENT  → 60+ days        → 20% opacity
//
// Trading decisions need recency bias. Old data is context, not signal.
// =====================================================================

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function computeRecencyTier(bubbleDate, latestDate) {
  if (!bubbleDate || !latestDate) return "fresh";

  const daysOld = (latestDate - bubbleDate) / ONE_DAY_MS;

  if (daysOld < 5) return "fresh";
  if (daysOld < 20) return "recent";
  if (daysOld < 60) return "old";
  return "ancient";
}

export function getRecencyOpacity(tier) {
  switch (tier) {
    case "fresh":   return 1.0;
    case "recent":  return 0.7;
    case "old":     return 0.4;
    case "ancient": return 0.2;
    default:        return 1.0;
  }
}

// =====================================================================
// 🎯 IS-TODAY DETECTION
// Used to give today's bubbles extra emphasis (larger, glowing border)
// =====================================================================
export function isToday(bubbleDate, latestDate) {
  if (!bubbleDate || !latestDate) return false;
  return Math.abs(bubbleDate - latestDate) < ONE_DAY_MS;
}

// =====================================================================
// 🎨 TODAY EMPHASIS MULTIPLIERS
// Applied to today's bubbles to make them pop:
//   - Size: 1.3x larger
//   - Opacity: forced to 1.0 (overrides recency)
//   - Border: 1.5px gold ring around bubble
// =====================================================================
export const TODAY_SIZE_MULTIPLIER = 1.3;
export const TODAY_BORDER_COLOR = "#facc15";
export const TODAY_BORDER_WIDTH = 1.5;

// =====================================================================
// 🎨 BACKWARD-COMPAT EXPORT
// Re-export under old name so existing code keeps working
// =====================================================================
export const resolveBubbleColor = resolveBubbleColorV2;

// =====================================================================
// 🎯 COLOR LEGEND DATA (for UI legends)
// =====================================================================
export const COLOR_LEGEND = [
  { color: "#22c55e", label: "Strong accumulation", priority: 1 },
  { color: "#84cc16", label: "Mild accumulation",   priority: 2 },
  { color: "#64748b", label: "Neutral",              priority: 3 },
  { color: "#f97316", label: "Mild distribution",    priority: 4 },
  { color: "#ef4444", label: "Strong distribution",  priority: 5 },
  { color: "#a78bfa", label: "High momentum",        priority: 0 },
];