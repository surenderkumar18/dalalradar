// lib\bubble-chart\bubbleEngine.js



// =========================
// 🔧 BASIC HELPERS
// =========================
const intentConfig = {
  MOMENTUM_BUYING: { layer: "strong", weight: 1.3 },
  STRONG_BUYING: { layer: "strong", weight: 1.2 },
  EARLY_ACCUMULATION: { layer: "early", weight: 1.1 },
  SHORT_COVERING: { layer: "early", weight: 1.05 },
  WEAK_SELLING: { layer: "weak", weight: 0.85 },
  UNWINDING: { layer: "weak", weight: 0.8 },
  DISTRIBUTION: { layer: "weak", weight: 0.75 },
  NEUTRAL: { layer: "mid", weight: 1 },
};

function resolveControls(bubbleControls, useShouldApplyControls) {
  if (!useShouldApplyControls) {
    return {
      price: true,
      volume: true,
      delivery: true,
      oi: true,
    };
  }

  return {
    price: bubbleControls?.price ?? true,
    volume: bubbleControls?.volume ?? true,
    delivery: bubbleControls?.delivery ?? true,
    oi: bubbleControls?.oi ?? true,
  };
}
export function getSymbol(stock) {
  return stock.symbol || stock.SYMBOL;
}

function getTurnover(stock) {
  return stock.turnover_curr ?? (stock.TURNOVER_LACS || 0) * 100000;
}

// =========================
// 📊 STOCK METRICS (CORE BASE)
// =========================

export function computeStockMetrics({
  stock,
  prevStock,
  avgFlow = 0,
  avgTurnover = 0,
  avgDelivery = 0,
  useRelative = false,
}) {
  const turnover = getTurnover(stock);
  const prevTurnover = stock.turnover_prev || 0;

  // 📈 FLOW (% change in turnover)
  const flow =
    prevTurnover > 0 ? ((turnover - prevTurnover) / prevTurnover) * 100 : 0;

  // 📈 PRICE
  const price =
    stock.changePct ??
    stock.pChange ??
    stock.performance ??
    (stock.CLOSE_PRICE && stock.PREV_CLOSE
      ? ((stock.CLOSE_PRICE - stock.PREV_CLOSE) / stock.PREV_CLOSE) * 100
      : 0);

  // 📦 DELIVERY %
  const delivery =
    stock.DELIV_PER ??
    (stock.volume_curr > 0 ? (stock.deliveryQty / stock.volume_curr) * 100 : 0);

  // 📊 PREV FLOW
  const prevTurn = prevStock?.turnover_curr || 0;

  const prevFlow =
    prevTurn > 0
      ? ((prevTurn - (prevStock.turnover_prev || 0)) / prevTurn) * 100
      : 0;

  const flowSpike = flow - prevFlow;

  // 📊 RELATIVE SCORE (optional)
  const relativeScore = useRelative
    ? (flow - avgFlow) * 0.4 +
      ((turnover - avgTurnover) / (avgTurnover || 1)) * 0.3 +
      (delivery - avgDelivery) * 0.3
    : 0;

  return {
    turnover,
    flow,
    price,
    delivery,
    prevFlow,
    flowSpike,
    relativeScore,
  };
}
function getDirection({ price, oiChangePct, delivery }) {
  // 🔥 CASE 1: No OI data or truly flat
  if (oiChangePct === null || oiChangePct === undefined || oiChangePct === 0) {
    if (delivery > 50) return 0.9;
    if (delivery > 45) return 0.75;
    return price > 0 ? 0.5 : -0.5;
  }

  // 🔥 CASE 2: VERY SMALL OI (noise zone)
  if (Math.abs(oiChangePct) < 0.5) {
    // ⚠️ DO NOT treat negative same as positive
    if (oiChangePct > 0) {
      // mild buildup → allow delivery assist
      if (delivery > 50) return 0.8;
      if (delivery > 45) return 0.7;
    } else {
      // mild unwinding → reduce bullish bias
      return price > 0 ? 0.4 : -0.4;
    }

    return price > 0 ? 0.5 : -0.5;
  }

  // 🔥 CASE 3: REAL OI SIGNAL (stronger zone)
  if (oiChangePct > 0 && price > 0) return 1;
  if (oiChangePct > 0 && price < 0) return -1;
  if (oiChangePct < 0 && price > 0) return 0.5;
  if (oiChangePct < 0 && price < 0) return -0.5;

  return 0;
}
export function computeMoneyFlowScore({
  price,
  volume,
  prevVolume,
  delivery,
  oi,
  prevOI,
  oiChangePct,
  turnover,
  prevTurnover,
  bubbleControls,
  useShouldApplyControls,
  avgTradeSizeExpansion = 1,
  basisExpansion = 0,
  contractExpansion = 1,
  oiExpansion = 1,
  oiAnalysis = "neutral",
  rolloverPct = 0,
  rolloverExpansion = 1,
}) {
  let score = 0;
  let weight = 0;

  const controls = resolveControls(bubbleControls, useShouldApplyControls);

  // =========================
  // 📊 CORE WEIGHTED SIGNALS
  // =========================

  // 1. Price direction (pure price signal)
  if (controls.price && price !== 0) {
    const strength = Math.min(Math.abs(price) / 5, 1);
    const direction = price > 0 ? 1 : -1;
    score += strength * direction * 0.25;
    weight += 0.25;
  }

  // 2. Volume expansion with directional context
  if (controls.volume && volume > 0) {
    const ratio = volume / (prevVolume || 1);
    const strength = Math.min(Math.log1p(ratio), 2) / 2;
    const direction = getDirection({ price, oiChangePct, delivery });
    score += strength * direction * 0.2;
    weight += 0.2;
  }

  // 3. Delivery % — institutional participation proxy
  if (controls.delivery && delivery > 0) {
    const strength = Math.min(delivery / 100, 1);
    const direction = getDirection({ price, oiChangePct, delivery });
    score += strength * direction * 0.2;
    weight += 0.2;
  }

  // 4. OI change — fresh position buildup vs unwinding
  if (controls.oi && oi > 0) {
    let oiSignal = 0;
    if (price > 0 && oiChangePct > 0)
      oiSignal = 1; // long buildup
    else if (price < 0 && oiChangePct > 0)
      oiSignal = -1; // short buildup
    else if (price > 0 && oiChangePct < 0)
      oiSignal = 0.5; // short covering
    else if (price < 0 && oiChangePct < 0) oiSignal = -0.5; // long unwinding

    const strength = Math.min(Math.abs(oiChangePct) / 20, 1);
    score += oiSignal * strength * 0.25;
    weight += 0.2;
  }

  // 5. Turnover flow — always included as baseline signal
  if (turnover > 0) {
    const ratio = turnover / (prevTurnover || 1);
    const strength = Math.min(Math.log1p(ratio), 2) / 2;
    const direction = getDirection({ price, oiChangePct, delivery });
    score += strength * direction * 0.1;
    weight += 0.1;
  }

  // =========================
  // 🧠 BOOST LAYER
  // Additive overlay — applied AFTER base score.
  // Never touches weight denominator.
  // Total max positive boost: +0.27
  // Total max negative boost: -0.12
  // =========================

  let boost = 0;

  // 🔥 FIX 1: Quiet accumulation moved here (was in score — caused weight inflation)
  // Condition: flat price, high delivery, rising volume, low OI noise
  // Institutional stealth buying pattern
  if (
    price >= 0 &&
    price < 1 &&
    delivery > 45 &&
    volume > (prevVolume || 0) * 1.2 &&
    Math.abs(oiChangePct) < 1
  ) {
    boost += 0.08; // controlled — no longer divided by weight
  }

  // Avg Trade Size expansion (block buying footprint)
  // Tier 1: moderate expansion
  if (avgTradeSizeExpansion > 1.3) boost += 0.02;
  // Tier 2: large block trades (cumulative with tier 1 = +0.07 max)
  if (avgTradeSizeExpansion > 1.6) boost += 0.05;

  // Futures basis expansion — gated by OI confirmation
  // Expanding premium + rising OI = fresh institutional long buildup
  if (basisExpansion > 0 && oiChangePct > 0) boost += 0.05;
  // Contracting basis + rising OI = short buildup, bearish
  if (basisExpansion < 0 && oiChangePct > 0) boost -= 0.05;

  // Contract volume expansion — gated by OI direction
  // More contracts + rising OI = institutional position increase
  if (contractExpansion > 1.2 && oiChangePct > 0) boost += 0.04;

  // 🔥 FIX 2: oiExpansion now gated by direction (was unconditional — fires on short buildup too)
  // Lot-adjusted OI rising + price-confirmed bullish OI = long buildup confirmed
  if (oiExpansion > 1.2 && oiChangePct > 0) boost += 0.04;

  // OI Analysis string → directional score
  // Source: derived field from data provider (lower weight = 0.05 multiplier)
  const oiMap = {
    long_buildup: 1,
    short_buildup: -1,
    short_covering: 0.5,
    long_unwinding: -0.5,
  };
  boost += (oiMap[oiAnalysis] || 0) * 0.05;

  // =========================
  // 🔥 ROLLOVER CONFIRMATION (NEW)
  // =========================

  const direction = getDirection({ price, oiChangePct, delivery });

  if (
    rolloverPct > 0 && // ← add this guard
    (Math.abs(oiChangePct) > 2 || rolloverPct > 60)
  ) {
    if (rolloverPct > 60) boost += 0.05 * direction;
    if (rolloverExpansion > 0.15) boost += 0.04 * direction;
    if (rolloverPct < 50) boost -= 0.03 * Math.abs(direction);
  }

  // =========================
  // FINAL SCORE
  // base = true weighted average of core signals
  // boost = institutional overlay (controlled additive layer)
  // clamp to [-1, 1]
  // =========================

  const base = weight > 0 ? score / weight : 0;

  return Math.max(-1, Math.min(base + boost, 1));
}

export function getIntentAndLayer({
  flow,
  price,
  prevFlow,
  flowSpike,
  delivery,
}) {
  // 🔥 NOISE FILTER (ADD HERE)
  if (Math.abs(flow) < 1) {
    return {
      intent: "NEUTRAL",
      layer: "mid",
      weight: 1,
    };
  }

  let intent = "NEUTRAL";

  // 🔥 DELIVERY DIVERGENCE (NEW — HIGH PRIORITY)
  if (delivery > 60 && price < -1 && flow > 0) {
    return {
      intent: "DISTRIBUTION",
      layer: "weak",
      weight: 0.8,
    };
  }

  // 🚀 MOMENTUM
  // PRIORITY: Strong → Weak

  if (flow > 50 && price > 5) {
    intent = "MOMENTUM_BUYING";
  } else if (flow > 6 && prevFlow > 5 && price > 0 && delivery > 45) {
    intent = "STRONG_BUYING";
  } else if ((flow > 3 || flowSpike > 2) && price > 0 && delivery > 40) {
    intent = "EARLY_ACCUMULATION";
  } else if (flow > 5 && price < -0.5 && delivery > 45) {
    intent = "DISTRIBUTION";
  } else if (flow < -8 && price < 0) {
    intent = "UNWINDING";
  } else if (flow < -5 && price > 1) {
    intent = "SHORT_COVERING";
  } else if (flow > 3 && price < 0) {
    intent = "WEAK_SELLING";
  }

  const config = intentConfig[intent] || intentConfig["NEUTRAL"];

  return {
    intent,
    layer: config.layer,
    weight: config.weight,
  };
}

export function resolveIntent({
  flow,
  price,
  prevFlow,
  flowSpike,
  delivery,
  moneyFlowScore,
  prevIntent,
}) {
  let { intent, layer } = getIntentAndLayer({
    flow,
    price,
    prevFlow,
    flowSpike,
    delivery,
  });

  // 🔥 HARD RESET — must fire FIRST before any intent inheritance
  if (moneyFlowScore < -0.3 && price <= 0) {
    return { intent: "DISTRIBUTION", layer: "weak" };
  }

  // neutral overrides come after
  if (moneyFlowScore > 0.5 && intent === "NEUTRAL" && flow > 2) {
    intent = "STRONG_BUYING";
    layer = "strong";
  }
  if (moneyFlowScore < -0.5 && intent === "NEUTRAL" && flow < -2) {
    intent = "UNWINDING";
    layer = "weak";
  }
  if (Math.abs(flow) < 1.5 && Math.abs(moneyFlowScore) < 0.08) {
    intent = "NEUTRAL";
    layer = "mid";
  }
  if (
    intent === "NEUTRAL" &&
    prevIntent !== "NEUTRAL" &&
    Math.abs(moneyFlowScore) > 0.15
  ) {
    intent = prevIntent;
  }
  if (
    intent !== prevIntent &&
    Math.abs(flow) < 2 &&
    Math.abs(moneyFlowScore) < 0.2
  ) {
    intent = prevIntent;
  }

  return { intent, layer };
}
export function computeBaseline(stocks) {
  let totalFlow = 0;
  let totalTurnover = 0;
  let totalDelivery = 0;

  for (const x of stocks) {
    const t = getTurnover(x);
    const pt = x.turnover_prev || 0;

    const flow = pt > 0 ? ((t - pt) / pt) * 100 : 0;

    const delivery =
      x.DELIV_PER ??
      (x.volume_curr > 0 ? (x.deliveryQty / x.volume_curr) * 100 : 0);

    totalFlow += flow;
    totalTurnover += t;
    totalDelivery += delivery;
  }

  const n = stocks.length || 1;

  return {
    avgFlow: totalFlow / n,
    avgTurnover: totalTurnover / n,
    avgDelivery: totalDelivery / n,
  };
}

function computeFinalBubbleScore({
  stock,
  prevStock,
  price,
  delivery,
  turnover,
  relativeScore,
  moneyFlowScore,
  bubbleControls,
  useRelative,
  useShouldApplyControls,
}) {
  let score = 0;
  let weightSum = 0;

  const controls = resolveControls(bubbleControls, useShouldApplyControls);

  // 🎯 PRICE (make optional)
  if (controls.price) {
    const absPrice = Math.abs(price);
    const normalized = Math.min(absPrice / 5, 1);
    score += normalized * 0.6;
    weightSum += 0.6;
  }

  // 📊 VOLUME
  if (controls.volume) {
    const vol = stock.volume_curr || 0;
    const ratio = vol / (stock.volume_prev || vol || 1);
    const normalized = Math.min(Math.log1p(ratio), 2);
    score += normalized * 0.8;
    weightSum += 0.8;
  }

  // 📦 DELIVERY
  if (controls.delivery) {
    const normalized = Math.max(0, Math.min((delivery - 20) / 60, 1));
    score += normalized * 1.1;
    weightSum += 1.1;
  }

  // 📑 OI
  if (controls.oi) {
    const oi = stock.openInterest || 0;
    const normalized = Math.min(oi / 1e6, 1);
    score += normalized * 0.6;
    weightSum += 0.6;
  }

  // 🔥 SAFETY (ADD THIS BLOCK)
  if (weightSum === 0) {
    return {
      finalScore: 0,
      size: 6, // minimum bubble
    };
  }

  // 🧠 BASE
  let baseScore = weightSum > 0 ? score / weightSum : 0;

  // 🔥 BLEND
  let finalScore =
    baseScore * 0.25 + moneyFlowScore * 0.6 + (delivery / 100) * 0.15;

  // 🔥 RELATIVE
  if (useRelative) {
    const rel = Math.max(-1, Math.min(relativeScore / 50, 1));
    finalScore = finalScore * (1 + rel);
  }

  // ✅ FIXED CLAMP
  const clamped = Math.max(-1, Math.min(finalScore, 2));

  // 📏 SIZE
  const size = 6 + Math.pow(Math.abs(clamped), 1.3) * 40;

  return { finalScore: clamped, size };
}

export function buildFinalBubble({
  stock,
  prevStock,
  price,
  delivery,
  turnover,
  relativeScore,
  moneyFlowScore,
  bubbleControls,
  useRelative,
  useShouldApplyControls,
}) {
  if (!useShouldApplyControls) {
    const finalScore = Math.max(0, Math.min(Math.abs(moneyFlowScore), 1.5));
    const size = 6 + Math.pow(finalScore, 1.3) * 40;

    return { finalScore, size };
  }

  return computeFinalBubbleScore({
    stock,
    prevStock,
    price,
    delivery,
    turnover,
    relativeScore,
    moneyFlowScore,
    bubbleControls,
    useRelative,
    useShouldApplyControls,
  });
}
/**
   * 
    top: i + 0.15
    center: i + 0.5
    bottom: i + 0.85
   */
export function resolveRowY(i, position = "center") {
  switch (position) {
    case "top":
      return i + 1;

    case "center":
      return i + 0.5;

    case "bottom":
      return i; // ✅ FIXED

    default:
      return i + 0.5;
  }
}
export function getRowOffset(position, r = 10) {
  if (position === "bottom") return r;
  if (position === "top") return -r;
  return 0; // center
}

/**
 * 💥 SUMMARY :::: Color	Meaning
🟣 Purple	High conviction / momentum
🟢 Green	Strong buying
🔵 Blue	Early accumulation
🔴 Red	Selling / unwinding
 */

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

/*
export function resolveBubbleColor(d) {
  return resolveBubbleColorV2(d);
}
  */
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

const TEST_RATINGS = ["A++", "A+", "A", "-A"];

export function getRandomRating(seed) {
  // 🔥 stable random (same bubble → same rating)
  const str = String(seed);
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return TEST_RATINGS[Math.abs(hash) % TEST_RATINGS.length];
}

const SMART_ENTRY_CONFIG = {
  strict: {
    quiet: 0.3,
    expansion: 0.45,
    flow: 2,
    confirm: 0.4,
    priceConfirm: 0,
  },
  relaxed: {
    quiet: 0.4,
    expansion: 0.3,
    flow: 1,
    confirm: 0.25,
    priceConfirm: -0.5,
  },
};

// =====================================================================
// 🔥 SMART ENTRY DETECTOR — REWRITTEN WITH F1 + F2
//
// F1: 20-day-high proximity rejection (kills "fires at top" failures)
// F2: Delivery-quality tier (strict vs relaxed gold based on delivery %)
//
// Returns:
//   null                                  — pattern not detected
//   { signal, strength, tier: "strict" }  — high-confidence (gold)
//   { signal, strength, tier: "relaxed" } — pattern OK but low delivery
//                                            (rendered as dimmer yellow)
//
// Tier 'confirmed'/'tentative'/'failed' is added LATER by the
// post-pass in buildStockBubbleFromTimeline (forward-looking F3).
// This function only sets 'strict' vs 'relaxed' based on current data.
// =====================================================================

export function detectSmartEntry(history, mode = "strict") {
  if (history.length < 4) return null;

  const last = history.at(-1);
  const prev = history.at(-2);
  const prev2 = history.at(-3);

  const isStrict = mode === "strict";

  // =========================
  // 🟤 QUIET BASE
  // =========================
  const recentQuiet = isStrict
    ? Math.abs(prev.moneyFlowScore) < 0.3 &&
      Math.abs(prev2.moneyFlowScore) < 0.3
    : Math.abs(prev.moneyFlowScore) < 0.4 &&
      Math.abs(prev2.moneyFlowScore) < 0.4;

  // =========================
  // 🟢 EXPANSION (IMPROVED)
  // =========================
  const expansionStart = isStrict
    ? // 🔹 Core strength
      prev.moneyFlowScore > 0.45 &&
      prev.price > 0 &&
      prev.flow > 2 &&
      // 🔹 Institutional participation
      prev.delivery > 40 &&
      (prev.oiChangePct === undefined || prev.oiChangePct >= 0) &&
      // 🔹 Continuity (not 1-candle spike)
      prev2.moneyFlowScore > 0.25 &&
      // 🔹 Acceleration (real expansion, not flat)
      prev.moneyFlowScore - prev2.moneyFlowScore > 0.1
    : prev.moneyFlowScore > 0.3 &&
      prev.price > -0.2 &&
      prev.flow > 1 &&
      prev.delivery > 38 &&
      (prev.oiChangePct === undefined || prev.oiChangePct >= 0);

  // =========================
  // 🟣 CONFIRMATION
  // =========================
  const confirmation = isStrict
    ? last.moneyFlowScore > 0.4 &&
      last.price >= 0 &&
      (last.oiChangePct === undefined || last.oiChangePct >= 0) &&
      (last.rolloverPct === undefined || last.rolloverPct > 60)
    : last.moneyFlowScore > 0.25 &&
      last.price > -0.5 &&
      (last.oiChangePct === undefined || last.oiChangePct >= 0);

  // =========================
  // ❌ HARD REJECTION: SHORT COVERING
  // =========================
  if (last.price > 0 && last.oiChangePct < 0) {
    return null;
  }

  // =========================
  // ❌ LATE ENTRY TRAP
  // =========================
  const priorMove = history
    .slice(-6, -3)
    .reduce((sum, d) => sum + (d.price || 0), 0);

  if (priorMove > 8) return null;

  // =========================
  // 🔥 F1: 20-DAY-HIGH PROXIMITY REJECTION
  // The pattern (quiet → expansion → confirmation) looks identical
  // at a top (distribution) vs at a breakout (accumulation).
  // If price is within 3% of recent high, treat as distribution risk.
  //
  // Uses cumulative percent moves over last 20 days as a proxy
  // for "how far from local low" since we only track daily % changes.
  // =========================
  const last20 = history.slice(-20);

  if (last20.length >= 10) {
    // Reconstruct relative price levels from daily % moves
    let level = 100;
    let highLevel = level;
    let currentLevel = level;

    for (const h of last20) {
      const pct = h.price || 0;
      level = level * (1 + pct / 100);
      currentLevel = level;
      if (level > highLevel) highLevel = level;
    }

    // % distance from 20-day high
    const distFromHigh =
      highLevel > 0 ? ((highLevel - currentLevel) / highLevel) * 100 : 0;

    // REJECT if within 3% of 20-day high
    if (distFromHigh < 3) {
      return null;
    }
  }

  // =========================
  // Volume Velocity (Acceleration)
  // =========================
  const volAcceleration = history.slice(-3).every((d, i, arr) => {
    if (i === 0) return true;
    return d.volume >= arr[i - 1].volume * 0.9;
  });

  // 🔥 EXHAUSTION SPIKE FILTER
  if (last.price > 3 && prev.price > 2 && last.moneyFlowScore > 0.6) {
    return null;
  }

  // =========================
  // ✅ FINAL SIGNAL
  // =========================
  if (recentQuiet && expansionStart && confirmation) {
    let strength = (prev.moneyFlowScore + last.moneyFlowScore) / 2;

    // 🔥 APPLY VOLUME FILTER
    if (!volAcceleration) {
      strength *= 0.9;
    }

    // 🔥 PENALTY: weak OI participation
    if (last.oiChangePct !== undefined && last.oiChangePct < 1) {
      strength *= 0.85;
    }

    // 🔥 BOOST: strong delivery (institutional)
    if (last.delivery > 50) {
      strength *= 1.1;
    }

    // =========================
    // 🔥 F2: DELIVERY-QUALITY TIER
    // Strict gold = delivery >= 45% on average over last 5 days
    //               (real institutional accumulation)
    // Relaxed gold = pattern OK but delivery weak
    //               (could be futures speculation; render as dim yellow)
    // =========================
    const recent5 = history.slice(-5);
    const avgDelivery5 =
      recent5.reduce((s, h) => s + (h.delivery || 0), 0) / recent5.length;

    const tier = avgDelivery5 >= 45 ? "strict" : "relaxed";

    return {
      signal: "SMART_MONEY_ENTRY",
      strength: Math.max(0, Math.min(strength, 1.5)), // clamp
      tier, // 🔥 NEW: 'strict' | 'relaxed'
    };
  }

  return null;
}
