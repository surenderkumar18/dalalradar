
// lib\bubble-chart\bubbleEngineSub.js

export function getBubbleColor(intent, finalScore, d) {
  // 🟣 High conviction ONLY
  if (finalScore > 1.1 && d.moneyFlowScore > 0.6) {
    return "#a78bfa";
  }

  switch (intent) {
    case "MOMENTUM_BUYING":
    case "STRONG_BUYING":
      return "#22c55e";

    case "EARLY_ACCUMULATION":
    case "SHORT_COVERING":
      return "#60a5fa";

    case "DISTRIBUTION":
    case "UNWINDING":
      return "#ef4444";

    case "WEAK_SELLING":
      return "#f87171";

    default:
      return "#64748b";
  }
}


export function resolveBubbleColor(d) {
  // =========================
  // 🟣 HIGH CONVICTION FIRST
  // =========================
  if (d.finalScore > 1.1 && d.moneyFlowScore > 0.6) {
    return "#a78bfa";
  }

  // =========================
  // 🟣 MOMENTUM (WITH GATE)
  // =========================
  if (d.intent === "MOMENTUM_BUYING" && d.moneyFlowScore > 0.5) {
    return "#a78bfa";
  }

  // =========================
  // 🎯 BASE COLOR
  // =========================
  let fill = getBubbleColor(d.intent, d.finalScore, d);

  // =========================
  // 🎨 LAYER ADJUSTMENTS
  // =========================
  if (d.layer === "early") {
    return lightenColor(fill, 0.25);
  }

  if (d.layer === "mid") {
    return desaturateColor(fill, 0.6);
  }

  return fill;
}

export function desaturateColor(hex, amount = 0.5) {
  const num = parseInt(hex.slice(1), 16);

  let r = num >> 16;
  let g = (num >> 8) & 0x00ff;
  let b = num & 0x0000ff;

  const avg = (r + g + b) / 3;

  r = r + (avg - r) * amount;
  g = g + (avg - g) * amount;
  b = b + (avg - b) * amount;

  return `rgb(${r}, ${g}, ${b})`;
}
export function lightenColor(color, amount = 0.2) {
  // simple mix with white
  const c = color.replace("#", "");
  const num = parseInt(c, 16);

  let r = (num >> 16) + 255 * amount;
  let g = ((num >> 8) & 0x00ff) + 255 * amount;
  let b = (num & 0x0000ff) + 255 * amount;

  r = Math.min(255, Math.floor(r));
  g = Math.min(255, Math.floor(g));
  b = Math.min(255, Math.floor(b));

  return `rgb(${r},${g},${b})`;
}
export function formatTurnoverCr(val) {
  if (!val) return "";

  const cr = val / 100; // 🔥 convert Lakhs → Cr
  return Math.round(cr).toLocaleString("en-IN") + " Cr";
}

export function formatMoney(val) {
  if (!val) return "";

  if (val >= 1_00_00_000) {
    return (val / 1_00_00_000).toFixed(0) + " Cr";
  } else if (val >= 1_00_000) {
    return (val / 1_00_000).toFixed(0) + " L";
  } else {
    return val.toLocaleString("en-IN");
  }
}