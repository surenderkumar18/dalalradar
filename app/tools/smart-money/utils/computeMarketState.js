// app\tools\bubbleChart\utils\computeMarketState.js
// =====================================================================
// 📊 MARKET STATE COMPUTATION
//
// Aggregates the entire market into 5-second-scan metrics for the banner:
//   - Market regime (Risk-on / Risk-off / Neutral)
//   - VIX status (proxy: market dispersion)
//   - Breadth (% stocks up)
//   - Top movers (3 hot + 3 cold sectors)
//   - Whale of the day
//   - Rotation counts (rotating in / rotating out)
//
// Drop this into: tools/bubbleChart/utils/computeMarketState.js
// =====================================================================

// =====================================================================
// 🎯 MAIN ENTRY: compute market state from latest bubble data
// =====================================================================
export function computeMarketState({
  sectorBubbleData = [],
  stockBubbleData = [],
  latestDate,
}) {
  if (!latestDate) {
    return getEmptyState();
  }

  // Filter to latest day only
  const todaySectors = sectorBubbleData.filter(
    (b) => Math.abs(b.x - latestDate) < 86400000,
  );

  // For stock data, we may have multiple days — get latest only
  const todayStocks = stockBubbleData.filter(
    (b) => Math.abs(b.x - latestDate) < 86400000,
  );

  if (!todaySectors.length && !todayStocks.length) {
    return getEmptyState();
  }

  // ─── ROTATION COUNTS ───
  const rotatingIn = todaySectors.filter(
    (s) => (s.rotationScore || 0) > 0.05,
  );
  const rotatingOut = todaySectors.filter(
    (s) => (s.rotationScore || 0) < -0.05,
  );
  const stable = todaySectors.filter(
    (s) => Math.abs(s.rotationScore || 0) <= 0.05,
  );

  // ─── TOP MOVERS (hot/cold) ───
  const sortedByRotation = [...todaySectors].sort(
    (a, b) => (b.rotationScore || 0) - (a.rotationScore || 0),
  );
  const topHot = sortedByRotation.slice(0, 3);
  const topCold = sortedByRotation.slice(-3).reverse();

  // ─── BREADTH (% stocks up today) ───
  const stocksForBreadth = todayStocks.length > 0 ? todayStocks : todaySectors;
  const upCount = stocksForBreadth.filter((b) => (b.price || 0) > 0).length;
  const totalCount = stocksForBreadth.length;
  const breadthPct = totalCount > 0 ? (upCount / totalCount) * 100 : 0;

  // ─── MARKET REGIME ───
  // Risk-on: most sectors green + breadth > 55%
  // Risk-off: most sectors red + breadth < 45%
  // Neutral: in between
  let regime = "neutral";
  if (rotatingIn.length > rotatingOut.length && breadthPct > 55) {
    regime = "risk_on";
  } else if (rotatingOut.length > rotatingIn.length && breadthPct < 45) {
    regime = "risk_off";
  }

  // ─── DISPERSION (volatility proxy) ───
  // High dispersion = chaotic market, low = orderly
  const prices = todaySectors
    .map((s) => s.price || 0)
    .filter((p) => Number.isFinite(p));
  const avgPrice = prices.length
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0;
  const variance = prices.length
    ? prices.reduce((s, p) => s + (p - avgPrice) ** 2, 0) / prices.length
    : 0;
  const dispersion = Math.sqrt(variance);

  // Convert dispersion to a VIX-like number (rough proxy)
  // dispersion ~0-1 → VIX 10-12 (calm)
  // dispersion ~2-3 → VIX 15-20 (normal)
  // dispersion ~4+ → VIX 25+ (panic)
  const vixProxy = 10 + dispersion * 4;
  const vixStatus =
    vixProxy < 13 ? "calm" :
    vixProxy < 18 ? "safe" :
    vixProxy < 25 ? "elevated" :
    "panic";

  // ─── WHALE OF THE DAY ───
  // The single stock with highest turnover today + strong price move
  let whaleOfDay = null;
  if (todayStocks.length > 0) {
    const whaleCandidates = todayStocks
      .filter(
        (s) =>
          (s.delivery || 0) > 50 &&
          Math.abs(s.price || 0) > 1.0 &&
          (s.turnover || 0) > 0,
      )
      .sort((a, b) => (b.turnover || 0) - (a.turnover || 0));

    if (whaleCandidates.length) {
      whaleOfDay = {
        symbol: whaleCandidates[0].stock,
        priceChange: whaleCandidates[0].price,
        delivery: whaleCandidates[0].delivery,
      };
    }
  }

  // ─── BREADTH LABEL ───
  const breadthLabel =
    breadthPct >= 65 ? "Broad up" :
    breadthPct >= 55 ? "Mixed up" :
    breadthPct >= 45 ? "Mixed" :
    breadthPct >= 35 ? "Mixed down" :
    "Broad down";

  return {
    regime,
    vixProxy: Number(vixProxy.toFixed(1)),
    vixStatus,
    breadth: {
      pct: Number(breadthPct.toFixed(0)),
      label: breadthLabel,
      upCount,
      totalCount,
    },
    rotation: {
      in: rotatingIn.length,
      out: rotatingOut.length,
      stable: stable.length,
    },
    topHot: topHot.map((s) => ({
      name: s.sector,
      change: Number((s.price || 0).toFixed(1)),
      rotation: Number((s.rotationScore || 0).toFixed(2)),
    })),
    topCold: topCold.map((s) => ({
      name: s.sector,
      change: Number((s.price || 0).toFixed(1)),
      rotation: Number((s.rotationScore || 0).toFixed(2)),
    })),
    whaleOfDay,
    dispersion: Number(dispersion.toFixed(2)),
    latestDate,
  };
}

function getEmptyState() {
  return {
    regime: "unknown",
    vixProxy: null,
    vixStatus: "unknown",
    breadth: { pct: 0, label: "—", upCount: 0, totalCount: 0 },
    rotation: { in: 0, out: 0, stable: 0 },
    topHot: [],
    topCold: [],
    whaleOfDay: null,
    dispersion: 0,
    latestDate: null,
  };
}

// =====================================================================
// 🎯 RECOMPUTE WHALES (for stock view — uses just one sector)
// =====================================================================
export function computeSectorWhales(stockBubbles, latestDate, count = 3) {
  if (!stockBubbles?.length || !latestDate) return [];

  const todayStocks = stockBubbles.filter(
    (b) => Math.abs(b.x - latestDate) < 86400000,
  );

  return todayStocks
    .filter(
      (s) =>
        (s.delivery || 0) > 50 &&
        Math.abs(s.price || 0) > 1.0 &&
        (s.turnover || 0) > 0,
    )
    .sort((a, b) => (b.turnover || 0) - (a.turnover || 0))
    .slice(0, count)
    .map((s) => ({
      symbol: s.stock,
      priceChange: s.price,
      delivery: s.delivery,
      turnover: s.turnover,
    }));
}

// =====================================================================
// 🎯 COMPUTE TOP SIGNALS (for Signal Panel)
// Filters out only bubbles with active signals on the latest date
// =====================================================================
export function computeTopSignals(bubbleData, latestDate) {
  if (!bubbleData?.length || !latestDate) {
    return { buys: [], sells: [], warns: [] };
  }

  const todayBubbles = bubbleData.filter(
    (b) => Math.abs(b.x - latestDate) < 86400000 && b.bubbleSignal,
  );

  const buys = todayBubbles
    .filter((b) => b.bubbleSignal.type === "BUY")
    .sort((a, b) => {
      // Strict first, then by strength
      if (a.bubbleSignal.tier === "strict" && b.bubbleSignal.tier !== "strict")
        return -1;
      if (b.bubbleSignal.tier === "strict" && a.bubbleSignal.tier !== "strict")
        return 1;
      return (b.bubbleSignal.strength || 0) - (a.bubbleSignal.strength || 0);
    });

  const sells = todayBubbles
    .filter((b) => b.bubbleSignal.type === "SELL")
    .sort((a, b) => {
      if (a.bubbleSignal.tier === "strict" && b.bubbleSignal.tier !== "strict")
        return -1;
      if (b.bubbleSignal.tier === "strict" && a.bubbleSignal.tier !== "strict")
        return 1;
      return (b.bubbleSignal.strength || 0) - (a.bubbleSignal.strength || 0);
    });

  const warns = todayBubbles
    .filter((b) => b.bubbleSignal.type === "WARN")
    .sort(
      (a, b) => (b.bubbleSignal.strength || 0) - (a.bubbleSignal.strength || 0),
    );

  return { buys, sells, warns };
}