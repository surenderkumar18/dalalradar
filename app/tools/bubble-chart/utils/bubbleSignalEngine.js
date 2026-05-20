// =====================================================================
// 🚀 BUBBLE SIGNAL ENGINE v3.3 — BUY SYMMETRY (RECOVERY CONTINUATION)
//
// Critical fix from v3.2: Engine was blind to "continuing uptrends".
// Stocks like ADANIENT (recovered from -25% crash, now breaking out)
// got ZERO BUY signals because existing patterns require:
//   - A recent dip (SUPPORT_RECLAIM, PULLBACK_REVERSAL)
//   - A quiet consolidation (ACCUMULATION_EXIT, BREAKOUT_CONFIRM)
//   - Specific daily flow patterns
//
// v3.3 adds 3 new BUY patterns symmetric to v3.2's SELL additions:
//
//   🆕 TREND_CONTINUATION_BUY — Mirror of TREND_CONTINUATION_SELL
//        Catches healthy stocks in sustained uptrends
//
//   🆕 NEW_HIGH_BREAKOUT — Catches breakouts to new highs
//        For stocks breaking 30/60 day highs with volume
//
//   🆕 RECOVERY_CONTINUATION — The ADANIENT pattern
//        Catches stocks that recovered from damage and are now flying
//
// Backward compatible: same exports, same toggle.
// All v3.2 SELL patterns preserved.
// =====================================================================

import config from "./config.js";

const THRESHOLDS = {
  DISTRIBUTION: {
    minDelivery: 50,
    maxPriceChg: -0.3,
    minFlowSpike: 1.0,
    minHistoryDays: 5,
    minPriorGain: 3,
  },
  BEARISH_DIVERGENCE: {
    priceUpDays: 2,
    moneyFlowDropThreshold: -0.10,
    minPriorMove: 3,
  },
  EXHAUSTION_TOP: {
    parabolicGain: 6,
    climaxVolumeRatio: 2.0,
    reversalThreshold: -0.5,
  },
  BREAKDOWN: {
    priceDropThreshold: -1.5,
    minDelivery: 45,
    minOIBuildup: 0.5,
    consecutiveDownDays: 1,
  },
  BREAKOUT_CONFIRM: {
    priceUpThreshold: 1.5,
    volumeRatio: 1.5,
    minDelivery: 45,
    minMoneyFlowScore: 0.4,
  },
  PULLBACK_REVERSAL: {
    pullbackDepth: -2,
    bounceThreshold: 0.8,
    minDelivery: 42,
    minHistoryDays: 7,
  },
  EARLY_WARNING: {
    deliveryDrop: -7,
    volumeFlat: 0.95,
    priceFlat: 0.7,
  },
  CUMULATIVE_ACCUMULATION: {
    minHistoryDays: 10,
    minStrongBuyDays: 4,
    maxWeakDays: 3,
    minDeliveryRise: 2,
    minNetPriceMove: 2,
  },
  SUPPORT_RECLAIM: {
    minHistoryDays: 25,
    dipTolerance: 1.01,
    reclaimMultiplier: 1.015,
    minDelivery: 48,
    minBouncePrice: 0.8,
  },
  TREND_CONTEXT: {
    strongUpCumulative: 8,
    strongDownCumulative: -8,
    mildUpCumulative: 3,
    mildDownCumulative: -3,
    accelerationThreshold: 0.5,
  },
  BIG_TREND: {
    minHistoryDays: 40,
    window: 60,
    crashThreshold: -15,
    deepDamage: -25,
    distanceFromHighDanger: 15,
    distanceFromHighSevere: 25,
    minRecoveryDays: 5,
  },
  CUMULATIVE_DISTRIBUTION: {
    minHistoryDays: 10,
    minStrongSellDays: 4,
    maxStrongBuyDays: 3,
    maxNetPriceMove: -2,
    maxLastDayPrice: 0.5,
  },
  TREND_CONTINUATION_SELL: {
    minHistoryDays: 40,
    requiresDamaged: true,
    minDownDays: 3,
    maxBouncePct: 1.5,
    minRecentDecline: -2,
  },
  LOWER_HIGH_REJECTION: {
    minHistoryDays: 20,
    bounceWindow: 10,
    minBounce: 3,
    rejectionPct: -0.8,
    minDelivery: 40,
  },
  RESISTANCE_REJECTION: {
    minHistoryDays: 25,
    rallyTolerance: 0.99,
    rejectionMultiplier: 0.985,
    minDelivery: 45,
    minRejectionPrice: -0.5,
  },

  // 🆕 NEW v3.3 BUY PATTERNS
  TREND_CONTINUATION_BUY: {
    minHistoryDays: 40,
    minUpDays: 3,              // 3+ up days in last 5
    maxPullbackPct: -1.5,      // biggest pullback < -1.5%
    minRecentGain: 2,          // cumulative last 10 days >= 2%
    requiresHealthy: true,     // only fires on healthy structure
  },

  NEW_HIGH_BREAKOUT: {
    minHistoryDays: 30,
    highWindow: 30,            // look at 30-day high
    breakoutMultiplier: 1.005, // current price >= 100.5% of 30d high
    minDelivery: 45,
    minPriceMove: 1.0,         // today's price move >= 1%
    minVolumeRatio: 1.3,       // volume >= 1.3x recent average
  },

  RECOVERY_CONTINUATION: {
    minHistoryDays: 60,
    lookbackDays: 90,          // look back 90 days for damage
    damageThreshold: -15,      // had been down -15%+ in lookback
    minRecoveryMove: 12,       // recovered +12%+ from low
    minRecentMomentum: 3,      // last 5 days net >= 3%
    requiresHealthy: true,
  },
};

// =====================================================================
// 🧠 SHORT-TERM TREND (30-day)
// =====================================================================
export function computeTrendContext(history) {
  if (history.length < 20) return "unknown";

  const t = THRESHOLDS.TREND_CONTEXT;
  const window = Math.min(30, history.length);
  const last = history.slice(-window);

  const cumPrice = last.reduce((s, d) => s + (d.price || 0), 0);
  const greenDays = last.filter((d) => (d.price || 0) > 0).length;
  const greenPct = greenDays / last.length;

  let acceleration = 0;
  if (last.length >= 20) {
    const last10 = last.slice(-10);
    const prior = last.slice(0, last.length - 10);
    const last10Avg = last10.reduce((s, d) => s + (d.price || 0), 0) / last10.length;
    const priorAvg = prior.reduce((s, d) => s + (d.price || 0), 0) / prior.length;
    acceleration = last10Avg - priorAvg;
  }

  const avgMFS = last.reduce((s, d) => s + (d.moneyFlowScore || 0), 0) / last.length;

  if (
    acceleration > t.accelerationThreshold &&
    cumPrice > 0 &&
    avgMFS > 0.1 &&
    greenPct > 0.50
  ) {
    return "accelerating_up";
  }
  if (cumPrice > t.strongUpCumulative && greenPct > 0.50 && avgMFS > 0.10) {
    return "strong_uptrend";
  }
  if (cumPrice > t.mildUpCumulative && greenPct >= 0.48) {
    return "mild_uptrend";
  }
  if (cumPrice < t.strongDownCumulative && greenPct < 0.45 && avgMFS < -0.05) {
    return "strong_downtrend";
  }
  if (cumPrice < t.mildDownCumulative && greenPct < 0.50) {
    return "mild_downtrend";
  }
  return "range";
}

// =====================================================================
// 🆕 BIG TREND (60-day)
// =====================================================================
export function computeBigTrendContext(history) {
  const t = THRESHOLDS.BIG_TREND;
  if (history.length < t.minHistoryDays) return "unknown";

  const window = Math.min(t.window, history.length);
  const last = history.slice(-window);

  const cumPrice60 = last.reduce((s, d) => s + (d.price || 0), 0);

  let level = 100;
  let highLevel = level;
  let currentLevel = level;

  for (const h of last) {
    const pct = h.price || 0;
    level = level * (1 + pct / 100);
    currentLevel = level;
    if (level > highLevel) highLevel = level;
  }

  const distFromHigh =
    highLevel > 0 ? ((highLevel - currentLevel) / highLevel) * 100 : 0;

  if (cumPrice60 <= t.deepDamage || distFromHigh >= t.distanceFromHighSevere) {
    return "severely_damaged";
  }
  if (cumPrice60 <= t.crashThreshold || distFromHigh >= t.distanceFromHighDanger) {
    return "damaged";
  }
  return "healthy";
}

// =====================================================================
// 🆕 RECOVERY QUALITY CHECK
// =====================================================================
export function isRecoveryQualified(history) {
  const t = THRESHOLDS.BIG_TREND;
  if (history.length < t.minRecoveryDays) return false;

  const last5 = history.slice(-t.minRecoveryDays);
  const stableUpDays = last5.filter((d) => (d.price || 0) >= -0.5).length;
  const positiveFlowDays = last5.filter(
    (d) => (d.moneyFlowScore || 0) > 0.1,
  ).length;
  return stableUpDays >= 3 && positiveFlowDays >= 3;
}

// =====================================================================
// 🆕 v3.3: PRIOR DAMAGE CHECK
// Returns true if the stock was damaged within last 90 days but is now healthy
// (the ADANIENT case — crashed in Jan/Feb, recovered, now breaking out)
// =====================================================================
export function wasPriorDamaged(history) {
  if (history.length < 60) return false;

  // Look at the older window (excluding most recent 20 days)
  const olderWindow = history.slice(-90, -20);
  if (olderWindow.length < 30) return false;

  // Reconstruct price levels in older window
  let level = 100;
  let highLevel = level;
  let lowLevel = level;

  for (const h of olderWindow) {
    level = level * (1 + (h.price || 0) / 100);
    if (level > highLevel) highLevel = level;
    if (level < lowLevel) lowLevel = level;
  }

  // Was there significant damage in older period?
  const maxDrawdown = ((lowLevel - highLevel) / highLevel) * 100;

  return maxDrawdown <= -15;
}

// =====================================================================
// 📊 OBV TREND
// =====================================================================
export function computeOBVTrend(history) {
  if (history.length < 15) return 0;

  let obv = 0;
  const series = history.map((d) => {
    if ((d.price || 0) > 0.1) obv += d.volume || 0;
    else if ((d.price || 0) < -0.1) obv -= d.volume || 0;
    return obv;
  });

  const last5 = series.slice(-5).reduce((s, v) => s + v, 0) / 5;
  const prior10 = series.slice(-15, -5).reduce((s, v) => s + v, 0) / 10;

  const maxAbs = Math.max(Math.abs(last5), Math.abs(prior10), 1);
  return (last5 - prior10) / maxAbs;
}

// =====================================================================
// PATTERN: CUMULATIVE ACCUMULATION (BUY) — unchanged
// =====================================================================
function detectCumulativeAccumulation(history) {
  const t = THRESHOLDS.CUMULATIVE_ACCUMULATION;
  if (history.length < t.minHistoryDays) return null;

  const last = history.at(-1);
  const last10 = history.slice(-10);

  const strongBuyDays = last10.filter(
    (d) =>
      (d.moneyFlowScore || 0) > 0.25 &&
      (d.delivery || 0) > 42 &&
      (d.price || 0) >= -0.3,
  ).length;

  const weakDays = last10.filter(
    (d) => (d.moneyFlowScore || 0) < -0.2 || (d.price || 0) < -1.5,
  ).length;

  if (strongBuyDays < t.minStrongBuyDays) return null;
  if (weakDays > t.maxWeakDays) return null;

  const netPrice = last10.reduce((s, d) => s + (d.price || 0), 0);
  if (netPrice < t.minNetPriceMove) return null;

  const last5Deliv =
    last10.slice(-5).reduce((s, d) => s + (d.delivery || 0), 0) / 5;
  const prior5Deliv =
    last10.slice(0, 5).reduce((s, d) => s + (d.delivery || 0), 0) / 5;
  const deliveryRising = last5Deliv > prior5Deliv + t.minDeliveryRise;

  if ((last.price || 0) < 0) return null;
  if ((last.moneyFlowScore || 0) < 0.15) return null;

  const accumPressure = strongBuyDays - weakDays;
  const strength = Math.min(accumPressure / 8 + netPrice / 20, 1);

  return {
    type: "BUY",
    pattern: "CUMULATIVE_ACCUMULATION",
    strength,
    tier:
      strongBuyDays >= 6 && deliveryRising && netPrice > 4 ? "strict" : "relaxed",
    reasons: [
      `${strongBuyDays}/10 strong buy days`,
      `Only ${weakDays} weak days`,
      `Net +${netPrice.toFixed(1)}% over 10 days`,
      deliveryRising
        ? `Delivery rising (${prior5Deliv.toFixed(0)}% → ${last5Deliv.toFixed(0)}%)`
        : null,
    ].filter(Boolean),
  };
}

// =====================================================================
// 🆕 v3.3: TREND CONTINUATION BUY
// Mirror of TREND_CONTINUATION_SELL — catches healthy stocks in sustained uptrends
// (covers the case where stock keeps rising without obvious dips)
// =====================================================================
function detectTrendContinuationBuy(history, bigTrend) {
  const t = THRESHOLDS.TREND_CONTINUATION_BUY;
  if (history.length < t.minHistoryDays) return null;

  // Only fires on healthy structures
  if (bigTrend !== "healthy") return null;

  const last = history.at(-1);
  const last5 = history.slice(-5);
  const last10 = history.slice(-10);

  // Count up days in last 5
  const upDays = last5.filter((d) => (d.price || 0) > 0.3).length;
  if (upDays < t.minUpDays) return null;

  // Biggest pullback in last 5 not too deep
  const minPullback = Math.min(...last5.map((d) => d.price || 0));
  if (minPullback < t.maxPullbackPct) return null;

  // Net 10-day gain
  const net10 = last10.reduce((s, d) => s + (d.price || 0), 0);
  if (net10 < t.minRecentGain) return null;

  // Last day must not be aggressively bearish
  if ((last.price || 0) < -1.5) return null;

  // Strength based on momentum + delivery
  const avgDelivery =
    last5.reduce((s, d) => s + (d.delivery || 0), 0) / 5;
  const momentumScore = Math.min(net10 / 12, 1);
  const deliveryScore = Math.min(avgDelivery / 70, 1);
  const upDayScore = upDays / 5;

  const strength = Math.min(
    momentumScore * 0.4 + deliveryScore * 0.3 + upDayScore * 0.3,
    1,
  );

  // Strict if: 4+ up days OR (3+ up + high delivery + strong momentum)
  const isStrict =
    upDays >= 4 ||
    (upDays >= 3 && avgDelivery > 50 && net10 > 5);

  return {
    type: "BUY",
    pattern: "TREND_CONTINUATION_BUY",
    strength,
    tier: isStrict ? "strict" : "relaxed",
    reasons: [
      `${upDays}/5 recent up days`,
      `Net +${net10.toFixed(1)}% over 10 days`,
      `Healthy 60-day structure`,
      avgDelivery > 50
        ? `Avg delivery ${avgDelivery.toFixed(0)}% (institutional buying)`
        : `Avg delivery ${avgDelivery.toFixed(0)}%`,
    ],
  };
}

// =====================================================================
// 🆕 v3.3: NEW HIGH BREAKOUT
// Catches stocks breaking above 30-day high with volume
// =====================================================================
function detectNewHighBreakout(history) {
  const t = THRESHOLDS.NEW_HIGH_BREAKOUT;
  if (history.length < t.minHistoryDays) return null;

  const last = history.at(-1);

  // Today's price must be meaningfully positive
  if ((last.price || 0) < t.minPriceMove) return null;

  // Delivery must support
  if ((last.delivery || 0) < t.minDelivery) return null;

  // Reconstruct price levels for last 30 days
  const window = history.slice(-t.highWindow);
  let level = 100;
  const levels = window.map((d) => {
    level = level * (1 + (d.price || 0) / 100);
    return level;
  });

  if (levels.length < 25) return null;

  // Current level vs prior 30-day high (excluding today)
  const priorLevels = levels.slice(0, -1);
  const priorHigh = Math.max(...priorLevels);
  const currentLevel = levels[levels.length - 1];

  // Must be at or above prior 30d high
  if (currentLevel < priorHigh * t.breakoutMultiplier) return null;

  // Volume check
  const prior10 = history.slice(-11, -1);
  if (prior10.length < 5) return null;
  const avgVol = prior10.reduce((s, d) => s + (d.volume || 0), 0) / prior10.length;
  const volRatio = avgVol > 0 ? (last.volume || 0) / avgVol : 0;
  if (volRatio < t.minVolumeRatio) return null;

  // Strength calculation
  const breakoutPct =
    priorHigh > 0 ? ((currentLevel - priorHigh) / priorHigh) * 100 : 0;
  const priceScore = Math.min((last.price || 0) / 4, 1);
  const volScore = Math.min((volRatio - 1) / 2, 1);
  const deliveryScore = Math.min((last.delivery || 0) / 70, 1);

  const strength = Math.min(
    priceScore * 0.4 + volScore * 0.3 + deliveryScore * 0.3,
    1,
  );

  // Strict if: strong break + high volume + good delivery
  const isStrict =
    breakoutPct > 1.0 &&
    volRatio > 1.6 &&
    (last.delivery || 0) > 50 &&
    (last.price || 0) > 1.5;

  return {
    type: "BUY",
    pattern: "NEW_HIGH_BREAKOUT",
    strength,
    tier: isStrict ? "strict" : "relaxed",
    reasons: [
      `Broke 30-day high (+${breakoutPct.toFixed(1)}% above prior high)`,
      `Price +${last.price.toFixed(1)}% today`,
      `Volume ${volRatio.toFixed(1)}x recent avg`,
      `Delivery ${last.delivery.toFixed(0)}%`,
    ],
  };
}

// =====================================================================
// 🆕 v3.3: RECOVERY CONTINUATION
// THE ADANIENT PATTERN — stock was damaged, recovered, now flying
// =====================================================================
function detectRecoveryContinuation(history, bigTrend) {
  const t = THRESHOLDS.RECOVERY_CONTINUATION;
  if (history.length < t.minHistoryDays) return null;

  // Current structure must be healthy
  if (bigTrend !== "healthy") return null;

  // Must have had prior damage
  if (!wasPriorDamaged(history)) return null;

  const last = history.at(-1);

  // Reconstruct full price history
  let level = 100;
  const levels = history.slice(-t.lookbackDays).map((d) => {
    level = level * (1 + (d.price || 0) / 100);
    return level;
  });

  if (levels.length < 60) return null;

  // Find the lowest point in older period (the bottom)
  const olderLevels = levels.slice(0, -10);
  const bottomLevel = Math.min(...olderLevels);
  const currentLevel = levels[levels.length - 1];

  // Recovery move from bottom
  const recoveryMove =
    bottomLevel > 0 ? ((currentLevel - bottomLevel) / bottomLevel) * 100 : 0;

  if (recoveryMove < t.minRecoveryMove) return null;

  // Recent momentum check (last 5 days)
  const last5 = history.slice(-5);
  const recentMomentum = last5.reduce((s, d) => s + (d.price || 0), 0);
  if (recentMomentum < t.minRecentMomentum) return null;

  // Last day must be positive or stable
  if ((last.price || 0) < -1) return null;

  // Delivery & money flow support
  const avgDelivery = last5.reduce((s, d) => s + (d.delivery || 0), 0) / 5;
  const avgMFS = last5.reduce((s, d) => s + (d.moneyFlowScore || 0), 0) / 5;

  // Strength scoring
  const recoveryScore = Math.min(recoveryMove / 30, 1);
  const momentumScore = Math.min(recentMomentum / 8, 1);
  const deliveryScore = Math.min(avgDelivery / 65, 1);

  const strength = Math.min(
    recoveryScore * 0.35 + momentumScore * 0.35 + deliveryScore * 0.3,
    1,
  );

  // Strict if: huge recovery + strong recent momentum + good delivery + positive flow
  const isStrict =
    recoveryMove > 18 &&
    recentMomentum > 4 &&
    avgDelivery > 45 &&
    avgMFS > 0.15;

  return {
    type: "BUY",
    pattern: "RECOVERY_CONTINUATION",
    strength,
    tier: isStrict ? "strict" : "relaxed",
    reasons: [
      `Recovered +${recoveryMove.toFixed(1)}% from bottom`,
      `Recent 5-day momentum: +${recentMomentum.toFixed(1)}%`,
      `Now in healthy structure`,
      avgDelivery > 50
        ? `Institutional buying (${avgDelivery.toFixed(0)}% delivery)`
        : `Avg delivery ${avgDelivery.toFixed(0)}%`,
    ],
  };
}

// =====================================================================
// 🆕 PATTERN: CUMULATIVE DISTRIBUTION (SELL) — unchanged from v3.2
// =====================================================================
function detectCumulativeDistribution(history) {
  const t = THRESHOLDS.CUMULATIVE_DISTRIBUTION;
  if (history.length < t.minHistoryDays) return null;

  const last = history.at(-1);
  const last10 = history.slice(-10);

  const strongSellDays = last10.filter(
    (d) =>
      (d.moneyFlowScore || 0) < -0.20 &&
      (d.price || 0) <= 0.3,
  ).length;

  const strongBuyDays = last10.filter(
    (d) => (d.moneyFlowScore || 0) > 0.25 && (d.price || 0) > 0.5,
  ).length;

  if (strongSellDays < t.minStrongSellDays) return null;
  if (strongBuyDays > t.maxStrongBuyDays) return null;

  const netPrice = last10.reduce((s, d) => s + (d.price || 0), 0);
  if (netPrice > t.maxNetPriceMove) return null;

  if ((last.price || 0) > t.maxLastDayPrice) return null;

  const last5Deliv =
    last10.slice(-5).reduce((s, d) => s + (d.delivery || 0), 0) / 5;
  const prior5Deliv =
    last10.slice(0, 5).reduce((s, d) => s + (d.delivery || 0), 0) / 5;
  const deliveryFalling = last5Deliv < prior5Deliv - 2;

  const sellDayAvgDeliv =
    last10
      .filter((d) => (d.price || 0) < -0.3)
      .reduce((s, d) => s + (d.delivery || 0), 0) /
    Math.max(1, last10.filter((d) => (d.price || 0) < -0.3).length);

  const distPressure = strongSellDays - strongBuyDays;
  const strength = Math.min(distPressure / 8 + Math.abs(netPrice) / 20, 1);

  const isStrict =
    strongSellDays >= 6 ||
    (strongSellDays >= 5 && deliveryFalling && Math.abs(netPrice) > 4) ||
    (strongSellDays >= 5 && sellDayAvgDeliv > 50);

  return {
    type: "SELL",
    pattern: "CUMULATIVE_DISTRIBUTION",
    strength,
    tier: isStrict ? "strict" : "relaxed",
    reasons: [
      `${strongSellDays}/10 strong sell days`,
      `Only ${strongBuyDays} buy days`,
      `Net ${netPrice.toFixed(1)}% over 10 days`,
      deliveryFalling
        ? `Delivery falling (${prior5Deliv.toFixed(0)}% → ${last5Deliv.toFixed(0)}%)`
        : null,
      sellDayAvgDeliv > 50
        ? `Institutional selling (${sellDayAvgDeliv.toFixed(0)}% delivery)`
        : null,
    ].filter(Boolean),
  };
}

// =====================================================================
// 🆕 PATTERN: TREND CONTINUATION SELL — unchanged from v3.2
// =====================================================================
function detectTrendContinuationSell(history, bigTrend) {
  const t = THRESHOLDS.TREND_CONTINUATION_SELL;
  if (history.length < t.minHistoryDays) return null;

  if (bigTrend !== "damaged" && bigTrend !== "severely_damaged") return null;

  const last = history.at(-1);
  const last5 = history.slice(-5);
  const last10 = history.slice(-10);

  const downDays = last5.filter((d) => (d.price || 0) < -0.3).length;
  if (downDays < t.minDownDays) return null;

  const maxBounce = Math.max(...last5.map((d) => d.price || 0));
  if (maxBounce > t.maxBouncePct) return null;

  const net10 = last10.reduce((s, d) => s + (d.price || 0), 0);
  if (net10 > t.minRecentDecline) return null;

  if ((last.price || 0) > 1.5) return null;

  const severityBoost = bigTrend === "severely_damaged" ? 0.3 : 0.15;
  const strength = Math.min(
    Math.abs(net10) / 8 + (downDays / 5) * 0.3 + severityBoost,
    1,
  );

  const isStrict =
    bigTrend === "severely_damaged" ||
    (downDays >= 4 && (last.price || 0) < 0);

  return {
    type: "SELL",
    pattern: "TREND_CONTINUATION_SELL",
    strength,
    tier: isStrict ? "strict" : "relaxed",
    reasons: [
      `${downDays}/5 recent down days`,
      `Net ${net10.toFixed(1)}% over 10 days`,
      `Biggest bounce only +${maxBounce.toFixed(1)}%`,
      bigTrend === "severely_damaged"
        ? "Severely damaged structure"
        : "Damaged structure continuing",
    ],
  };
}

// =====================================================================
// 🆕 PATTERN: LOWER HIGH REJECTION — unchanged from v3.2
// =====================================================================
function detectLowerHighRejection(history) {
  const t = THRESHOLDS.LOWER_HIGH_REJECTION;
  if (history.length < t.minHistoryDays) return null;

  const last = history.at(-1);

  const bounceWindow = history.slice(-t.bounceWindow, -2);
  if (bounceWindow.length < 5) return null;

  const cumBounce = bounceWindow.reduce((s, d) => s + (d.price || 0), 0);
  if (cumBounce < t.minBounce) return null;

  const last2 = history.slice(-2);
  const recentDecline = last2.reduce((s, d) => s + (d.price || 0), 0);
  if (recentDecline > t.rejectionPct) return null;

  if ((last.price || 0) > t.rejectionPct) return null;
  if ((last.delivery || 0) < t.minDelivery) return null;

  let level = 100;
  const levels = history.slice(-30).map((d) => {
    level = level * (1 + (d.price || 0) / 100);
    return level;
  });

  if (levels.length < 20) return null;

  const oldHigh = Math.max(...levels.slice(0, levels.length - 10));
  const recentHigh = Math.max(...levels.slice(-10));

  if (recentHigh > oldHigh * 0.95) return null;

  const strength = Math.min(
    Math.abs(recentDecline) / 4 + cumBounce / 10,
    1,
  );

  const isStrict =
    (last.delivery || 0) > 50 &&
    Math.abs(recentDecline) > 1.5 &&
    recentHigh < oldHigh * 0.92;

  return {
    type: "SELL",
    pattern: "LOWER_HIGH_REJECTION",
    strength,
    tier: isStrict ? "strict" : "relaxed",
    reasons: [
      `Bounce of +${cumBounce.toFixed(1)}% rejected`,
      `Rolling over ${recentDecline.toFixed(1)}%`,
      `Lower high vs prior peak (-${((1 - recentHigh / oldHigh) * 100).toFixed(1)}%)`,
      `${last.delivery.toFixed(0)}% delivery confirms`,
    ],
  };
}

// =====================================================================
// 🆕 PATTERN: RESISTANCE REJECTION — unchanged from v3.2
// =====================================================================
function detectResistanceRejection(history) {
  const t = THRESHOLDS.RESISTANCE_REJECTION;
  if (history.length < t.minHistoryDays) return null;

  const last = history.at(-1);

  let level = 100;
  const levels = history.slice(-25).map((d) => {
    level = level * (1 + (d.price || 0) / 100);
    return level;
  });

  if (levels.length < 20) return null;

  const olderLevels = levels.slice(0, -5);
  const recentLevels = levels.slice(-5);

  const priorResistance = Math.max(...olderLevels);
  const recentHigh = Math.max(...recentLevels);
  const currentLevel = levels[levels.length - 1];

  const approached = recentHigh >= priorResistance * t.rallyTolerance;
  const rejected = currentLevel < priorResistance * t.rejectionMultiplier;

  if (!approached || !rejected) return null;
  if ((last.price || 0) > t.minRejectionPrice) return null;
  if ((last.delivery || 0) < t.minDelivery) return null;

  const rejectionPct = ((priorResistance - currentLevel) / priorResistance) * 100;
  const strength = Math.min(
    (rejectionPct / 4) * 0.4 +
      ((last.delivery || 0) / 70) * 0.3 +
      Math.abs(last.price || 0) / 3 * 0.3,
    1,
  );

  const isStrict =
    (last.delivery || 0) > 55 &&
    rejectionPct > 2 &&
    (last.price || 0) < -1.5;

  return {
    type: "SELL",
    pattern: "RESISTANCE_REJECTION",
    strength,
    tier: isStrict ? "strict" : "relaxed",
    reasons: [
      `Rejected at prior resistance`,
      `Closed ${last.price.toFixed(1)}% with ${last.delivery.toFixed(0)}% delivery`,
      `${rejectionPct.toFixed(1)}% below resistance`,
      `Failed breakout = bearish reversal`,
    ],
  };
}

// =====================================================================
// PATTERN: SUPPORT RECLAIM (BUY) — unchanged
// =====================================================================
function detectSupportReclaim(history) {
  const t = THRESHOLDS.SUPPORT_RECLAIM;
  if (history.length < t.minHistoryDays) return null;

  const last = history.at(-1);

  let level = 100;
  const levels = history.slice(-25).map((d) => {
    level = level * (1 + (d.price || 0) / 100);
    return level;
  });

  if (levels.length < 20) return null;

  const olderLevels = levels.slice(0, -5);
  const recentLevels = levels.slice(-5);

  const priorSupport = Math.min(...olderLevels);
  const recentLow = Math.min(...recentLevels);
  const currentLevel = levels[levels.length - 1];

  const dippedBelow = recentLow <= priorSupport * t.dipTolerance;
  const reclaimed = currentLevel > priorSupport * t.reclaimMultiplier;

  if (!dippedBelow || !reclaimed) return null;
  if ((last.price || 0) < t.minBouncePrice) return null;
  if ((last.delivery || 0) < t.minDelivery) return null;

  const reclaimPct = ((currentLevel - priorSupport) / priorSupport) * 100;
  const strength = Math.min(
    (reclaimPct / 4) * 0.4 +
      ((last.delivery || 0) / 70) * 0.3 +
      ((last.price || 0) / 3) * 0.3,
    1,
  );

  return {
    type: "BUY",
    pattern: "SUPPORT_RECLAIM",
    strength,
    tier:
      (last.delivery || 0) > 55 && reclaimPct > 2 && (last.price || 0) > 1.5
        ? "strict"
        : "relaxed",
    reasons: [
      `Reclaimed support after dip`,
      `Closed +${last.price.toFixed(1)}% with ${last.delivery.toFixed(0)}% delivery`,
      `${reclaimPct.toFixed(1)}% above prior low`,
      `Failed breakdown = bullish reversal`,
    ],
  };
}

// =====================================================================
// EXISTING PATTERNS — unchanged
// =====================================================================

function detectDistribution(history) {
  const t = THRESHOLDS.DISTRIBUTION;
  if (history.length < t.minHistoryDays) return null;
  const last = history.at(-1);

  const last10 = history.slice(-10);
  const priorGain = last10.reduce((s, d) => s + (d.price || 0), 0);
  if (priorGain < t.minPriorGain) return null;

  const highDelivery = last.delivery >= t.minDelivery;
  const fallingPrice = last.price <= t.maxPriceChg;
  const turnoverSpike = (last.turnoverChange || 0) >= t.minFlowSpike;
  const sellerOIBuildup = (last.oiChangePct || 0) > 0.5 && last.price < 0;

  const conditions = [highDelivery, fallingPrice, turnoverSpike, sellerOIBuildup];
  const fireCount = conditions.filter(Boolean).length;
  if (fireCount < 2) return null;

  const deliveryStrength = Math.min(last.delivery / 80, 1);
  const priceStrength = Math.min(Math.abs(last.price) / 3, 1);
  const strength = (deliveryStrength + priceStrength) / 2;

  return {
    type: "SELL",
    pattern: "DISTRIBUTION_TOP",
    strength: Math.min(strength, 1),
    tier: fireCount >= 3 ? "strict" : "relaxed",
    reasons: [
      highDelivery ? `Delivery ${last.delivery.toFixed(0)}%` : null,
      fallingPrice ? `Price ${last.price.toFixed(1)}%` : null,
      turnoverSpike ? `Flow spike ${last.turnoverChange.toFixed(0)}%` : null,
      sellerOIBuildup
        ? `Short OI buildup (+${last.oiChangePct?.toFixed(1)}%)`
        : null,
    ].filter(Boolean),
  };
}

function detectBearishDivergence(history) {
  const t = THRESHOLDS.BEARISH_DIVERGENCE;
  if (history.length < 5) return null;

  const last2 = history.slice(-2);
  const prior3 = history.slice(-5, -2);

  const priceUp = last2.every((d) => (d.price || 0) >= -0.3);
  if (!priceUp) return null;

  const totalPriceMove = history.slice(-8).reduce((s, d) => s + (d.price || 0), 0);
  if (totalPriceMove < t.minPriorMove) return null;

  const avgMFSLast = last2.reduce((s, d) => s + (d.moneyFlowScore || 0), 0) / 2;
  const avgMFSPrior = prior3.reduce((s, d) => s + (d.moneyFlowScore || 0), 0) / 3;
  const mfsChange = avgMFSLast - avgMFSPrior;
  if (mfsChange > t.moneyFlowDropThreshold) return null;

  const avgDeliveryLast = last2.reduce((s, d) => s + (d.delivery || 0), 0) / 2;
  const avgDeliveryPrior = prior3.reduce((s, d) => s + (d.delivery || 0), 0) / 3;
  const deliveryDrop = avgDeliveryLast < avgDeliveryPrior - 3;

  const strength = Math.min(Math.abs(mfsChange) * 2.5, 1);

  return {
    type: "SELL",
    pattern: "BEARISH_DIVERGENCE",
    strength,
    tier: deliveryDrop && Math.abs(mfsChange) > 0.2 ? "strict" : "relaxed",
    reasons: [
      `Price up +${totalPriceMove.toFixed(1)}% but flow dropping`,
      `MFS dropped ${(mfsChange * 100).toFixed(0)} pts`,
      deliveryDrop
        ? `Delivery weakening (${avgDeliveryLast.toFixed(0)}%)`
        : null,
    ].filter(Boolean),
  };
}

function detectExhaustionTop(history) {
  const t = THRESHOLDS.EXHAUSTION_TOP;
  if (history.length < 7) return null;
  const last = history.at(-1);

  const last5 = history.slice(-5);
  const parabolicGain = last5.reduce((s, d) => s + (d.price || 0), 0);
  if (parabolicGain < t.parabolicGain) return null;

  const last3 = history.slice(-3);
  const prior10 = history.slice(-13, -3);
  if (prior10.length < 5) return null;

  const avgVolPrior = prior10.reduce((s, d) => s + (d.volume || 0), 0) / prior10.length;
  const avgVolRecent = last3.reduce((s, d) => s + (d.volume || 0), 0) / 3;
  const volRatio = avgVolPrior > 0 ? avgVolRecent / avgVolPrior : 0;
  if (volRatio < t.climaxVolumeRatio) return null;

  const reversalHint =
    last.price <= t.reversalThreshold ||
    (last.moneyFlowScore < 0.2 && history.at(-2)?.moneyFlowScore > 0.4);
  if (!reversalHint) return null;

  const strength = Math.min(parabolicGain / 12 + (volRatio - 1.5) / 3, 1);

  return {
    type: "SELL",
    pattern: "EXHAUSTION_TOP",
    strength,
    tier: parabolicGain > 10 && volRatio > 2.5 ? "strict" : "relaxed",
    reasons: [
      `Parabolic +${parabolicGain.toFixed(1)}% in 5 days`,
      `Climax volume ${volRatio.toFixed(1)}x normal`,
      `Reversal hint (price ${last.price.toFixed(1)}%)`,
    ],
  };
}

function detectBreakdown(history) {
  const t = THRESHOLDS.BREAKDOWN;
  if (history.length < 5) return null;

  const last = history.at(-1);
  const prev = history.at(-2);

  if (last.price > t.priceDropThreshold) return null;
  if (last.delivery < t.minDelivery) return null;

  const shortBuildup = (last.oiChangePct || 0) >= t.minOIBuildup;
  if (!shortBuildup) return null;

  const last2Down = last.price < 0 && prev.price < 0;
  const dropMagnitude = Math.min(Math.abs(last.price) / 4, 1);
  const oiMagnitude = Math.min((last.oiChangePct || 0) / 8, 1);
  const strength = (dropMagnitude + oiMagnitude) / 2;

  return {
    type: "SELL",
    pattern: "BREAKDOWN",
    strength,
    tier: last2Down && last.delivery > 55 ? "strict" : "relaxed",
    reasons: [
      `Drop ${last.price.toFixed(1)}%`,
      `Delivery ${last.delivery.toFixed(0)}% confirms selling`,
      `Short buildup (OI +${last.oiChangePct?.toFixed(1)}%)`,
      last2Down ? "Consecutive down days" : null,
    ].filter(Boolean),
  };
}

function detectBreakoutConfirm(history) {
  const t = THRESHOLDS.BREAKOUT_CONFIRM;
  if (history.length < 6) return null;
  const last = history.at(-1);

  const prior5 = history.slice(-6, -1);
  const priorPriceRange = prior5.reduce((s, d) => s + Math.abs(d.price || 0), 0);
  if (priorPriceRange > 7) return null;

  if (last.price < t.priceUpThreshold) return null;
  if ((last.moneyFlowScore || 0) < t.minMoneyFlowScore) return null;

  const prior10 = history.slice(-11, -1);
  if (prior10.length < 3) return null;

  const avgVol = prior10.reduce((s, d) => s + (d.volume || 0), 0) / prior10.length;
  const volRatio = avgVol > 0 ? (last.volume || 0) / avgVol : 0;
  if (volRatio < t.volumeRatio) return null;

  if (last.delivery < t.minDelivery) return null;

  const strength = Math.min(
    (last.price / 4) * 0.4 + (volRatio / 3) * 0.3 + (last.delivery / 70) * 0.3,
    1,
  );

  return {
    type: "BUY",
    pattern: "BREAKOUT_CONFIRM",
    strength,
    tier: last.delivery > 50 && volRatio > 2 ? "strict" : "relaxed",
    reasons: [
      `Breaking ${priorPriceRange.toFixed(1)}% range`,
      `Price +${last.price.toFixed(1)}% with volume ${volRatio.toFixed(1)}x`,
      `Delivery ${last.delivery.toFixed(0)}%`,
    ],
  };
}

function detectPullbackReversal(history) {
  const t = THRESHOLDS.PULLBACK_REVERSAL;
  if (history.length < t.minHistoryDays) return null;
  const last = history.at(-1);

  const olderHist = history.slice(-13, -3);
  if (olderHist.length < 5) return null;
  const priorTrend = olderHist.reduce((s, d) => s + (d.price || 0), 0);
  if (priorTrend < 3) return null;

  const pullback = history.slice(-3, -1);
  const pullbackMagnitude = pullback.reduce((s, d) => s + (d.price || 0), 0);
  if (pullbackMagnitude > t.pullbackDepth) return null;

  if (last.price < t.bounceThreshold) return null;
  if (last.delivery < t.minDelivery) return null;
  if ((last.moneyFlowScore || 0) < 0.25) return null;

  const strength = Math.min(
    (last.price / 2.5) * 0.5 + (last.delivery / 65) * 0.5,
    1,
  );

  return {
    type: "BUY",
    pattern: "PULLBACK_REVERSAL",
    strength,
    tier:
      last.delivery > 50 && (last.moneyFlowScore || 0) > 0.45
        ? "strict"
        : "relaxed",
    reasons: [
      `Prior uptrend +${priorTrend.toFixed(1)}%`,
      `Pullback ${pullbackMagnitude.toFixed(1)}% (healthy)`,
      `Bounce +${last.price.toFixed(1)}% with ${last.delivery.toFixed(0)}% delivery`,
    ],
  };
}

function detectAccumulationExit(history) {
  if (history.length < 12) return null;
  const last = history.at(-1);

  const quietPhase = history.slice(-9, -1);
  const priceRange = quietPhase.reduce((s, d) => s + Math.abs(d.price || 0), 0);
  const avgMFS =
    quietPhase.reduce((s, d) => s + Math.abs(d.moneyFlowScore || 0), 0) / 8;

  if (priceRange > 10) return null;
  if (avgMFS > 0.3) return null;
  if (last.price < 1.2) return null;
  if ((last.moneyFlowScore || 0) < 0.35) return null;
  if (last.delivery < 45) return null;

  const avgQuietVol = quietPhase.reduce((s, d) => s + (d.volume || 0), 0) / 8;
  const volRatio = avgQuietVol > 0 ? (last.volume || 0) / avgQuietVol : 0;
  if (volRatio < 1.3) return null;

  const strength = Math.min(
    (last.moneyFlowScore || 0) * 0.4 +
      (last.delivery / 100) * 0.3 +
      (volRatio / 4) * 0.3,
    1,
  );

  return {
    type: "BUY",
    pattern: "ACCUMULATION_EXIT",
    strength,
    tier: avgMFS < 0.2 && volRatio > 1.8 ? "strict" : "relaxed",
    reasons: [
      `Quiet phase (range ${priceRange.toFixed(1)}%)`,
      `Breakout +${last.price.toFixed(1)}%`,
      `Volume ${volRatio.toFixed(1)}x avg`,
    ],
  };
}

function detectEarlyWarning(history) {
  const t = THRESHOLDS.EARLY_WARNING;
  if (history.length < 7) return null;

  const last3 = history.slice(-3);
  const prior4 = history.slice(-7, -3);

  const priorMFS = prior4.reduce((s, d) => s + (d.moneyFlowScore || 0), 0) / 4;
  if (priorMFS < 0.25) return null;

  const avgDelivLast = last3.reduce((s, d) => s + (d.delivery || 0), 0) / 3;
  const avgDelivPrior = prior4.reduce((s, d) => s + (d.delivery || 0), 0) / 4;
  const deliveryChange = avgDelivLast - avgDelivPrior;
  if (deliveryChange > t.deliveryDrop) return null;

  const avgPriceLast = last3.reduce((s, d) => s + Math.abs(d.price || 0), 0) / 3;
  if (avgPriceLast > t.priceFlat) return null;

  const avgVolLast = last3.reduce((s, d) => s + (d.volume || 0), 0) / 3;
  const avgVolPrior = prior4.reduce((s, d) => s + (d.volume || 0), 0) / 4;
  const volRatio = avgVolPrior > 0 ? avgVolLast / avgVolPrior : 1;
  if (volRatio > t.volumeFlat) return null;

  return {
    type: "WARN",
    pattern: "EARLY_WARNING",
    strength: Math.min(Math.abs(deliveryChange) / 15, 1),
    tier: "relaxed",
    reasons: [
      `Delivery dropped ${deliveryChange.toFixed(0)} pts`,
      `Price stalling (avg ${avgPriceLast.toFixed(1)}%)`,
      `Volume contracting (${(volRatio * 100).toFixed(0)}% of prior)`,
    ],
  };
}

function detectDamagedStructureWarn(history, bigTrend) {
  if (bigTrend !== "damaged" && bigTrend !== "severely_damaged") return null;
  if (history.length < 30) return null;

  const last = history.at(-1);
  const last5 = history.slice(-5);

  const last5Avg = last5.reduce((s, d) => s + (d.price || 0), 0) / 5;
  if (last5Avg > 0.5) return null;

  const last5Deliv = last5.reduce((s, d) => s + (d.delivery || 0), 0) / 5;

  return {
    type: "WARN",
    pattern: "DAMAGED_STRUCTURE",
    strength: bigTrend === "severely_damaged" ? 0.7 : 0.5,
    tier: "relaxed",
    reasons: [
      bigTrend === "severely_damaged"
        ? "Severely damaged 60-day structure"
        : "Damaged 60-day structure",
      `Last 5 days avg ${last5Avg.toFixed(1)}%`,
      `Avg delivery ${last5Deliv.toFixed(0)}%`,
      "Risk zone — avoid new longs",
    ],
  };
}

// =====================================================================
// 🎯 MAIN ENTRY — v3.3 BUY SYMMETRY
// =====================================================================
export function detectBubbleSignal(history) {
  if (!history || history.length < 5) return null;

  const trend = computeTrendContext(history);
  const bigTrend = computeBigTrendContext(history);
  const recoveryQualified = isRecoveryQualified(history);
  const obvTrend = computeOBVTrend(history);
  const priorDamaged = wasPriorDamaged(history);  // 🆕 v3.3

  // ─── BUY DETECTORS (now 8 patterns!) ───
  const buyDetectors = [
    detectAccumulationExit(history),
    detectPullbackReversal(history),
    detectBreakoutConfirm(history),
    detectCumulativeAccumulation(history),
    detectSupportReclaim(history),
    detectTrendContinuationBuy(history, bigTrend),    // 🆕 v3.3
    detectNewHighBreakout(history),                    // 🆕 v3.3
    detectRecoveryContinuation(history, bigTrend),     // 🆕 v3.3
  ].filter(Boolean);

  // ─── SELL DETECTORS (8 patterns from v3.2) ───
  const sellDetectors = [
    detectExhaustionTop(history),
    detectDistribution(history),
    detectBreakdown(history),
    detectBearishDivergence(history),
    detectCumulativeDistribution(history),
    detectTrendContinuationSell(history, bigTrend),
    detectLowerHighRejection(history),
    detectResistanceRejection(history),
  ].filter(Boolean);

  // ─── SEVERELY DAMAGED: aggressive SELL bias ───
  if (bigTrend === "severely_damaged") {
    if (sellDetectors.length > 0) {
      return pickBestSignal(sellDetectors, trend, obvTrend, bigTrend, priorDamaged);
    }
    const reclaim = buyDetectors.find(
      (d) => d.pattern === "SUPPORT_RECLAIM" && d.tier === "strict",
    );
    if (reclaim && buyDetectors.length >= 2 && recoveryQualified) {
      return tagSignal(reclaim, trend, obvTrend, buyDetectors.length, bigTrend, priorDamaged);
    }
    return detectDamagedStructureWarn(history, bigTrend);
  }

  // ─── DAMAGED: lean SELL, require strict+confluence+recovery for BUY ───
  if (bigTrend === "damaged") {
    if (sellDetectors.length > 0) {
      return pickBestSignal(sellDetectors, trend, obvTrend, bigTrend, priorDamaged);
    }

    if (!recoveryQualified) {
      return detectDamagedStructureWarn(history, bigTrend);
    }

    if (buyDetectors.length >= 2) {
      const strictBuys = buyDetectors.filter((b) => b.tier === "strict");
      if (strictBuys.length >= 1) {
        return pickBestSignal(buyDetectors, trend, obvTrend, bigTrend, priorDamaged);
      }
    }

    const strictBuy = buyDetectors.find((d) => d.tier === "strict");
    if (strictBuy && obvTrend > 0.2) {
      return tagSignal(strictBuy, trend, obvTrend, 1, bigTrend, priorDamaged);
    }

    return detectDamagedStructureWarn(history, bigTrend);
  }

  // ─── HEALTHY STRUCTURES: standard logic ───
  if (trend === "strong_downtrend") {
    if (sellDetectors.length > 0) {
      return pickBestSignal(sellDetectors, trend, obvTrend, bigTrend, priorDamaged);
    }
    const reclaim = buyDetectors.find((d) => d.pattern === "SUPPORT_RECLAIM");
    if (reclaim && reclaim.tier === "strict") {
      return tagSignal(reclaim, trend, obvTrend, 1, bigTrend, priorDamaged);
    }
    return null;
  }

  if (trend === "strong_uptrend" || trend === "accelerating_up") {
    if (sellDetectors.length >= 2) {
      return pickBestSignal(sellDetectors, trend, obvTrend, bigTrend, priorDamaged);
    }
    if (buyDetectors.length > 0) {
      return pickBestSignal(buyDetectors, trend, obvTrend, bigTrend, priorDamaged);
    }
    return null;
  }

  // Normal flow — confluence wins
  if (buyDetectors.length >= 2 && sellDetectors.length === 0) {
    return pickBestSignal(buyDetectors, trend, obvTrend, bigTrend, priorDamaged);
  }
  if (sellDetectors.length >= 2 && buyDetectors.length === 0) {
    return pickBestSignal(sellDetectors, trend, obvTrend, bigTrend, priorDamaged);
  }
  if (sellDetectors.length >= 2) {
    return pickBestSignal(sellDetectors, trend, obvTrend, bigTrend, priorDamaged);
  }
  if (buyDetectors.length === 1) {
    return tagSignal(buyDetectors[0], trend, obvTrend, 1, bigTrend, priorDamaged);
  }
  if (sellDetectors.length === 1) {
    return tagSignal(sellDetectors[0], trend, obvTrend, 1, bigTrend, priorDamaged);
  }

  return detectEarlyWarning(history);
}

// =====================================================================
// 🎯 SIGNAL PICKER + TAGGER
// =====================================================================
function pickBestSignal(signals, trend, obvTrend, bigTrend, priorDamaged) {
  if (!signals.length) return null;
  signals.sort((a, b) => b.strength - a.strength);
  return tagSignal(signals[0], trend, obvTrend, signals.length, bigTrend, priorDamaged);
}

function tagSignal(signal, trend, obvTrend, patternCount, bigTrend, priorDamaged) {
  if (!signal) return null;

  const tagged = {
    ...signal,
    trendContext: trend,
    bigTrendContext: bigTrend || "unknown",
    obvTrend: Number(obvTrend.toFixed(3)),
    patternCount,
    confluence: patternCount >= 2,
    priorDamaged: priorDamaged || false,  // 🆕 v3.3
  };

  // Confluence upgrade
  if (patternCount >= 2 && tagged.tier === "relaxed") {
    tagged.tier = "strict";
    tagged.upgradeReason = "confluence";
  }

  // OBV veto (downgrade only)
  if (signal.type === "BUY" && obvTrend < -0.3) {
    tagged.tier = "relaxed";
    tagged.obvWarning = "OBV diverging negative";
  }
  if (signal.type === "SELL" && obvTrend > 0.3) {
    tagged.tier = "relaxed";
    tagged.obvWarning = "OBV diverging positive";
  }

  // Trend alignment boost
  if (
    signal.type === "BUY" &&
    (trend === "strong_uptrend" || trend === "accelerating_up")
  ) {
    tagged.trendAligned = true;
    if (tagged.tier === "relaxed") tagged.tier = "strict";
  }
  if (
    signal.type === "SELL" &&
    (trend === "strong_downtrend" || trend === "mild_downtrend")
  ) {
    tagged.trendAligned = true;
    if (tagged.tier === "relaxed") tagged.tier = "strict";
  }

  // SELL signals in damaged structures get auto-upgraded
  if (
    signal.type === "SELL" &&
    (bigTrend === "damaged" || bigTrend === "severely_damaged")
  ) {
    tagged.trendAligned = true;
    if (tagged.tier === "relaxed") tagged.tier = "strict";
  }

  // 🆕 v3.3: BUY in healthy + recovery context = auto-strict
  if (signal.type === "BUY" && bigTrend === "healthy" && priorDamaged) {
    tagged.recoveryMode = true;
    if (tagged.tier === "relaxed" && patternCount >= 1) {
      tagged.tier = "strict";
      tagged.upgradeReason = tagged.upgradeReason || "recovery_continuation";
    }
  }

  // Trend conflict downgrade
  if (signal.type === "BUY" && trend === "strong_downtrend") {
    tagged.tier = "relaxed";
    tagged.trendConflict = true;
  }
  if (signal.type === "SELL" && trend === "strong_uptrend") {
    tagged.tier = "relaxed";
    tagged.trendConflict = true;
  }

  // Big trend damage flags
  if (bigTrend === "severely_damaged" && signal.type === "BUY") {
    tagged.damagedStructure = "severe";
    tagged.tier = "relaxed";
  }
  if (bigTrend === "damaged" && signal.type === "BUY") {
    tagged.damagedStructure = "moderate";
    if (tagged.tier === "strict" && patternCount < 2) {
      tagged.tier = "relaxed";
    }
  }

  return tagged;
}

// =====================================================================
// 🎨 SIGNAL STYLE RESOLVER — unchanged
// =====================================================================
export function resolveSignalStyle(payload) {
  const sig = payload.bubbleSignal;
  if (!sig) return null;

  const validation = payload.signalValidation || "tentative";

  if (sig.type === "BUY") {
    if (sig.tier === "strict") {
      if (validation === "confirmed") {
        return {
          fill: "#22c55e",
          opacity: 1.0,
          glow: true,
          glowColor: "#22c55e",
          icon: "▲",
          ring: true,
        };
      }
      if (validation === "failed") {
        return { fill: "#5e6e5e", opacity: 0.35, glow: false, icon: null };
      }
      return {
        fill: "#22c55e",
        opacity: 0.75,
        glow: false,
        icon: "▲",
        ring: false,
      };
    }
    if (validation === "confirmed") {
      return { fill: "#84cc16", opacity: 0.9, glow: false, icon: "▴" };
    }
    if (validation === "failed") {
      return { fill: "#525f3f", opacity: 0.3, glow: false, icon: null };
    }
    return { fill: "#84cc16", opacity: 0.6, glow: false, icon: "▴" };
  }

  if (sig.type === "SELL") {
    if (sig.tier === "strict") {
      if (validation === "confirmed") {
        return {
          fill: "#ef4444",
          opacity: 1.0,
          glow: true,
          glowColor: "#ef4444",
          icon: "▼",
          ring: true,
        };
      }
      if (validation === "failed") {
        return { fill: "#6e5959", opacity: 0.35, glow: false, icon: null };
      }
      return {
        fill: "#ef4444",
        opacity: 0.75,
        glow: false,
        icon: "▼",
        ring: false,
      };
    }
    if (validation === "confirmed") {
      return { fill: "#f97316", opacity: 0.9, glow: false, icon: "▾" };
    }
    if (validation === "failed") {
      return { fill: "#5f4a3f", opacity: 0.3, glow: false, icon: null };
    }
    return { fill: "#f97316", opacity: 0.6, glow: false, icon: "▾" };
  }

  if (sig.type === "WARN") {
    return {
      fill: "#eab308",
      opacity: 0.7,
      glow: false,
      icon: "!",
      pulsing: true,
    };
  }

  return null;
}

// =====================================================================
// 🔍 VALIDATION POST-PASS — unchanged
// =====================================================================
export function applySignalValidation(bubblesByStock) {
  for (const symbol of Object.keys(bubblesByStock)) {
    const bubbles = bubblesByStock[symbol];

    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (!b.bubbleSignal) continue;

      const next3 = bubbles.slice(i + 1, i + 4);

      if (next3.length < 3) {
        b.signalValidation = "tentative";
        continue;
      }

      const sig = b.bubbleSignal;
      const avgPrice =
        next3.reduce((s, n) => s + (n.price || 0), 0) / next3.length;
      const upDays = next3.filter((n) => (n.price || 0) >= 0).length;
      const downDays = next3.filter((n) => (n.price || 0) < 0).length;

      if (sig.type === "BUY") {
        if (upDays >= 2 && avgPrice > 0) {
          b.signalValidation = "confirmed";
        } else if (downDays >= 2 || avgPrice < -2) {
          b.signalValidation = "failed";
        } else {
          b.signalValidation = "tentative";
        }
      } else if (sig.type === "SELL") {
        if (downDays >= 2 && avgPrice < 0) {
          b.signalValidation = "confirmed";
        } else if (upDays >= 2 || avgPrice > 2) {
          b.signalValidation = "failed";
        } else {
          b.signalValidation = "tentative";
        }
      } else {
        b.signalValidation = "tentative";
      }
    }

    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (!b.bubbleSignal) continue;
      if (b.bubbleSignal.tier === "strict") continue;

      const lookback = bubbles.slice(Math.max(0, i - 10), i);
      const recentFailures = lookback.filter(
        (p) => p.bubbleSignal && p.signalValidation === "failed",
      ).length;

      if (recentFailures >= 2) {
        b.bubbleSignal = null;
        b.signalValidation = null;
        b.hasBuySignal = false;
        b.hasSellSignal = false;
        b.hasWarnSignal = false;
      }
    }
  }
}