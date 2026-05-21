//import "server-only";
import {
  computeStockMetrics,
  getSymbol,
  computeMoneyFlowScore,
  getIntentAndLayer,
  computeBaseline,
  resolveIntent,
  buildFinalBubble,
  resolveRowY,
  detectSmartEntry,
} from "@/app/tools/smart-money/utils/bubbleEngine.js";

// TEMP: signal engine moved to backend
const detectBubbleSignal = () => null;
const applySignalValidation = () => {};

import config from "./config.js";

function processStock({
  stock,
  prevStock,
  avgFlow,
  avgTurnover,
  avgDelivery,
  useRelative,
  useShouldApplyControls,
  bubbleControls,
  intentMemory,
  rolloverPct = 0,
  rolloverExpansion = 1,
}) {
  const symbol = getSymbol(stock);

  const {
    turnover,
    flow,
    price,
    delivery,
    prevFlow,
    flowSpike,
    relativeScore,
  } = computeStockMetrics({
    stock,
    prevStock,
    avgFlow,
    avgTurnover,
    avgDelivery,
    useRelative,
    useShouldApplyControls,
  });

  // 1. Avg Trade Size (fallback compute)
  const avgTradeSize =
    stock.totalTrades > 0
      ? stock.turnover_curr / stock.totalTrades
      : stock.avgTradeSize || 0;

  const prevAvgTradeSize =
    prevStock.totalTrades > 0
      ? prevStock.turnover_curr / prevStock.totalTrades
      : prevStock.avgTradeSize || avgTradeSize;

  const avgTradeSizeExpansion = avgTradeSize / (prevAvgTradeSize || 1);

  // 2. Futures Basis
  const basis = (stock.futPrice || 0) - (stock.close || 0);
  const prevBasis = (prevStock.futPrice || 0) - (prevStock.close || 0);

  const basisExpansion = basis - prevBasis;

  // 3. Contracts expansion
  const contractExpansion =
    prevStock.contracts > 0 ? (stock.contracts || 0) / prevStock.contracts : 1;

  // 4. Normalized OI (lot-adjusted)
  const normOI = (stock.openInterest || 0) * (stock.lotSize || 1);
  const prevNormOI = (prevStock.openInterest || 0) * (prevStock.lotSize || 1);
  const oiExpansion = normOI / (prevNormOI || 1);

  const moneyFlowScore = computeMoneyFlowScore({
    price,
    volume: stock.volume_curr || 0,
    prevVolume: stock.volume_prev || 0,
    delivery,
    oi: stock.openInterest || 0,
    prevOI: stock.prevOI || 0,
    oiChangePct: stock.oiChangePct || 0,
    turnover,
    prevTurnover: prevStock.turnover_curr || 0,
    bubbleControls,
    useShouldApplyControls,
    avgTradeSizeExpansion,
    basisExpansion,
    contractExpansion,
    oiExpansion,
    oiAnalysis: stock.oiAnalysis || "neutral",
    rolloverPct,
    rolloverExpansion,
  });

  const prevIntent = intentMemory[symbol] || "NEUTRAL";

  const { intent, layer } = resolveIntent({
    flow,
    price,
    prevFlow,
    flowSpike,
    delivery,
    moneyFlowScore,
    prevIntent,
  });

  intentMemory[symbol] = intent;

  const strength = Math.min(
    Math.abs(moneyFlowScore) * 0.7 + (delivery / 100) * 0.3,
    1,
  );

  const { finalScore, size } = buildFinalBubble({
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

  const deliveryTrend = prevStock?.delivery ? delivery - prevStock.delivery : 0;

  return {
    symbol,
    turnover,
    flow,
    price,
    delivery,
    intent,
    layer,
    strength,
    moneyFlowScore,
    finalScore,
    size,
    volume: stock.volume_curr || 0,
    avgTradeSizeExpansion,
    basisExpansion,
    contractExpansion,
    oiExpansion,
    deliveryTrend,
    rolloverPct,
    rolloverExpansion,
  };
}

function enrichFnoFields(stock) {
  return {
    openInterest: stock.openInterest || 0,
    oiChangePct: stock.oiChangePct ?? 0,
    futPrice: stock.futPrice || 0,
    futPriceChange: stock.futPriceChange || 0,
    lotSize: stock.lotSize || 0,
    lots: stock.lots || 0,
    fnoVolume: stock.fnoVolume || 0,
    shares: stock.shares || 0,
    fnoTurnover: stock.fnoTurnover || 0,
    expiry: stock.expiry || null,
    totalTrades: stock.totalTrades || 0,
    contracts: stock.contracts || 0,
    avgTradeSize: stock.avgTradeSize || 0,
    oiAnalysis: stock.oiAnalysis || "neutral",
  };
}

function getPreviousMonthKey(key) {
  if (!key) return null;
  const [mon, yr] = key.split("_");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  let idx = months.indexOf(mon);
  let year = Number(yr);
  idx -= 1;
  if (idx < 0) {
    idx = 11;
    year -= 1;
  }
  return `${months[idx]}_${year}`;
}

function expiryToMonthKey(expiry) {
  if (!expiry) return null;
  const d = new Date(expiry);
  if (isNaN(d.getTime())) return null;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  return `${month}_${year}`;
}

// =====================================================================
// 🔥 F3 — FORWARD-LOOKING VALIDATION POST-PASS
// (unchanged from your existing code)
// =====================================================================

function applySmartEntryValidation(bubblesByStock) {
  for (const symbol of Object.keys(bubblesByStock)) {
    const bubbles = bubblesByStock[symbol];

    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      if (!b.isSmartEntry) continue;

      const next3 = bubbles.slice(i + 1, i + 4);

      if (next3.length < 3) {
        b.smartValidation = "tentative";
        continue;
      }

      const allUp = next3.every((n) => (n.price || 0) >= 0);
      const avgFlow =
        next3.reduce((s, n) => s + (n.turnoverChange || 0), 0) / next3.length;
      const avgPrice =
        next3.reduce((s, n) => s + (n.price || 0), 0) / next3.length;
      const downDays = next3.filter((n) => (n.price || 0) < 0).length;

      if (allUp && avgFlow > 0) {
        b.smartValidation = "confirmed";
      } else if (downDays >= 2 || avgPrice < -2) {
        b.smartValidation = "failed";
      } else {
        b.smartValidation = "tentative";
      }
    }
  }
}

export function buildStockBubbleFromTimeline(
  timeline,
  selectedSector,
  stockCategories,
  useRelative = true,
  useShouldApplyControls = false,
  bubbleControls = {},
  rolloverDataMap = {},
  rowPosition = "center",
  enableSignalEngine = false,
) {
  if (!timeline?.length || !selectedSector) return [];
  if (!stockCategories?.length) return [];

  const yMap = Object.fromEntries(
    stockCategories.map((s, i) => [s, resolveRowY(i, rowPosition)]),
  );

  const prevMaps = timeline.map((day, i) =>
    Object.fromEntries(
      (timeline[i - 1]?.stocks || []).map((s) => [getSymbol(s), s]),
    ),
  );

  const validSymbols = new Set(stockCategories);

  const historyMap = {};
  const intentMemory = {};

  const allBubbles = timeline.flatMap((day, i) => {
    const time = new Date(day.date).getTime();

    const stocks = (day.stocks || []).filter((s) =>
      validSymbols.has(getSymbol(s)),
    );

    if (!stocks.length) return [];
    const prevMap = prevMaps[i];

    const { avgFlow, avgTurnover, avgDelivery } = computeBaseline(stocks);

    return stocks
      .map((stock) => {
        const close = stock.close || 0;
        const symbol = getSymbol(stock);

        const rollover = rolloverDataMap?.[symbol] || {};

        const y = yMap[symbol];
        if (y === undefined) return null;

        const prevIntent = intentMemory[symbol] || "NEUTRAL";
        const prevStock = prevMap[symbol] || {};

        const expiryDate = stock.expiry
          ? new Date(stock.expiry).getTime()
          : null;
        const currentDate = time;

        let daysToExpiry = Infinity;

        if (expiryDate) {
          daysToExpiry = (expiryDate - currentDate) / (1000 * 60 * 60 * 24);
        }

        const expiry = expiryToMonthKey(stock.expiry);

        let rolloverPct = 0;
        let prevRolloverPct = 0;

        if (
          daysToExpiry <= 5 &&
          daysToExpiry >= 0 &&
          expiry &&
          rollover?.rolloverSeries &&
          rollover.rolloverSeries[expiry] !== undefined
        ) {
          rolloverPct = rollover.rolloverSeries[expiry];

          const prevExpiry = getPreviousMonthKey(expiry);

          prevRolloverPct =
            rollover.rolloverSeries?.[prevExpiry] ?? rolloverPct;
        }

        const rolloverExpansion = Math.min(
          (rolloverPct - prevRolloverPct) / Math.max(prevRolloverPct, 20),
          2,
        );

        const data = processStock({
          stock,
          prevStock,
          avgFlow,
          avgTurnover,
          avgDelivery,
          useRelative,
          useShouldApplyControls,
          bubbleControls,
          intentMemory,
          rolloverPct,
          rolloverExpansion,
        });

        if (!historyMap[symbol]) {
          historyMap[symbol] = [];
        }

        historyMap[symbol].push(data);

        const signal = detectSmartEntry(
          historyMap[symbol],
          config.detectSmartEntry,
        );

        const bubbleSignal = enableSignalEngine
          ? detectBubbleSignal(historyMap[symbol])
          : null;

        return {
          x: time,
          y,
          size: data.size,
          finalScore: data.finalScore,
          sector: selectedSector,
          stock: symbol,
          turnover: data.turnover,
          turnoverChange: data.flow,
          layer: data.layer,
          intent: data.intent,
          strength: data.strength,
          price: data.price,
          delivery: data.delivery,
          close,
          ...enrichFnoFields(stock),
          moneyFlowScore: data.moneyFlowScore,
          finalScore: data.finalScore,
          rolloverData: rollover || {},
          oiHistory: rollover.oiHistory || [],
          asOfTodayOi: rollover.asOfTodayOi || null,
          _intent: data.intent,
          rowPosition,
          isSmartEntry: signal?.signal === "SMART_MONEY_ENTRY",
          smartStrength: signal?.strength || 0,
          smartTier: signal?.tier || null,
          smartValidation: null,
          rolloverPct,
          rolloverExpansion,
          bubbleSignal: bubbleSignal,
          signalValidation: null,
          hasBuySignal: bubbleSignal?.type === "BUY",
          hasSellSignal: bubbleSignal?.type === "SELL",
          hasWarnSignal: bubbleSignal?.type === "WARN",
        };
      })
      .filter(Boolean);
  });

  const byStock = {};
  for (const b of allBubbles) {
    if (!byStock[b.stock]) byStock[b.stock] = [];
    byStock[b.stock].push(b);
  }
  applySmartEntryValidation(byStock);
  if (enableSignalEngine) {
    applySignalValidation(byStock);
  }

  return allBubbles;
}

export function buildAllStocksBubble(
  timeline,
  categories = [],
  useRelative = true,
  useShouldApplyControls = false,
  bubbleControls = {},
  rolloverDataMap = {},
  rowPosition = "center",
) {
  if (!timeline?.length) return { bubbles: [], sectorPositions: {} };

  const yMap = {};

  const prevMaps = timeline.map((day, i) =>
    Object.fromEntries(
      (timeline[i - 1]?.stocks || []).map((s) => [getSymbol(s), s]),
    ),
  );

  categories.forEach((sym, i) => {
    if (!sym) return;
    yMap[sym] = resolveRowY(i, rowPosition);
  });

  const sectorBuckets = {};

  timeline.forEach((day) => {
    (day.stocks || []).forEach((stock) => {
      const symbol = getSymbol(stock);
      const sector = stock.sector || "UNKNOWN";

      const y = yMap[symbol];
      if (y === undefined) return;

      if (!sectorBuckets[sector]) {
        sectorBuckets[sector] = [];
      }

      sectorBuckets[sector].push(y);
    });
  });

  const sectorPositions = {};

  Object.entries(sectorBuckets).forEach(([sector, ys]) => {
    if (!ys.length) return;

    const sorted = [...new Set(ys)].sort((a, b) => a - b);

    const groups = [];
    let start = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === prev + 1) {
        prev = sorted[i];
      } else {
        groups.push({ minY: start, maxY: prev });
        start = sorted[i];
        prev = sorted[i];
      }
    }

    groups.push({ minY: start, maxY: prev });

    sectorPositions[sector] = {
      groups,
      midY: sorted[Math.floor(sorted.length / 2)],
    };
  });

  const intentMemory = {};
  const bubbles = timeline.flatMap((day, i) => {
    const time = new Date(day.date).getTime();

    const stocks = day.stocks || [];
    const prevMap = prevMaps[i];
    const { avgFlow, avgTurnover, avgDelivery } = computeBaseline(stocks);
    return (day.stocks || [])
      .map((stock) => {
        const close = stock.close || 0;
        const symbol = getSymbol(stock);

        const sector = stock.sector || "UNKNOWN";

        const y = yMap[symbol];
        if (y === undefined) return null;

        const prevIntent = intentMemory[symbol] || "NEUTRAL";
        const prevStock = prevMap[symbol] || {};

        const rollover = rolloverDataMap?.[symbol] || {};

        const expiryDate = stock.expiry
          ? new Date(stock.expiry).getTime()
          : null;

        let daysToExpiry = Infinity;

        if (expiryDate) {
          daysToExpiry = (expiryDate - time) / (1000 * 60 * 60 * 24);
        }

        const expiry = expiryToMonthKey(stock.expiry);
        let rolloverPct = 0;
        let prevRolloverPct = 0;

        if (
          daysToExpiry <= 5 &&
          daysToExpiry >= 0 &&
          expiry &&
          rollover?.rolloverSeries &&
          rollover.rolloverSeries[expiry] !== undefined
        ) {
          rolloverPct = rollover.rolloverSeries[expiry];

          const prevExpiry = getPreviousMonthKey(expiry);

          prevRolloverPct =
            rollover.rolloverSeries?.[prevExpiry] ?? rolloverPct;
        }

        const rolloverExpansion = Math.min(
          (rolloverPct - prevRolloverPct) / Math.max(prevRolloverPct, 20),
          2,
        );

        const data = processStock({
          stock,
          prevStock,
          avgFlow,
          avgTurnover,
          avgDelivery,
          useRelative,
          useShouldApplyControls,
          bubbleControls,
          intentMemory,
          rolloverPct,
          rolloverExpansion,
        });

        return {
          x: time,
          y,
          size: data.size,
          finalScore: data.finalScore,
          sector: sector,
          stock: symbol,
          turnover: data.turnover,
          turnoverChange: data.flow,
          layer: data.layer,
          intent: data.intent,
          strength: data.strength,
          price: data.price,
          delivery: data.delivery,
          close,
          ...enrichFnoFields(stock),
          moneyFlowScore: data.moneyFlowScore,
          finalScore: data.finalScore,
          rolloverData: rollover || {},
          oiHistory: rollover.oiHistory || [],
          asOfTodayOi: rollover.asOfTodayOi || null,
          _intent: data.intent,
          rowPosition,
          rolloverPct,
          rolloverExpansion,
        };
      })
      .filter(Boolean);
  });

  return {
    bubbles,
    sectorPositions,
  };
}

// =====================================================================
// 🆕 SECTOR MODE — REBUILT WITH SIGNAL ENGINE SUPPORT
//
// What's new vs your existing version:
//   ✅ Builds per-sector HISTORY (compatible with bubbleSignalEngine)
//   ✅ Runs detectBubbleSignal() on each sector's history
//   ✅ Runs applySignalValidation() post-pass
//   ✅ Bubbles get the same fields as stock bubbles:
//        - bubbleSignal (BUY/SELL/WARN with pattern/tier/strength)
//        - signalValidation (confirmed/tentative/failed)
//        - hasBuySignal / hasSellSignal / hasWarnSignal flags
//
// What's PRESERVED (unchanged):
//   ✅ All 5 existing fixes (SR-1 through SR-5)
//   ✅ Sector aggregation logic
//   ✅ Market-relative pricing
//   ✅ Intent memory
//   ✅ Rotation score, breadth, dispersion
//   ✅ Existing bubble payload fields
//
// The TimelineBubble.js sector renderer already handles bubbleSignal
// via renderBubbleWithSignal — no changes needed there!
//
// Only ONE new parameter: enableSignalEngine (default false for safety)
// =====================================================================

function aggregateSectorMetrics(dayStocks, sectorName) {
  const stocks = dayStocks.filter((s) => s.sector === sectorName);
  if (!stocks.length) return null;

  let totalTurnover = 0;
  let totalVolume = 0;
  let totalOI = 0;
  let oiChangeWeighted = 0;
  let priceWeighted = 0;
  let deliveryWeighted = 0;
  let basisExpSum = 0;
  let avgTradeExpSum = 0;
  let contractExpSum = 0;
  let oiExpSum = 0;
  let oiAnalysisSum = 0;
  let weightSum = 0;

  let positivePriceCount = 0;
  const prices = [];

  const oiAnalysisMap = {
    long_buildup: 1,
    short_buildup: -1,
    short_covering: 0.5,
    long_unwinding: -0.5,
  };

  for (const s of stocks) {
    const turnover = s.turnover_curr ?? (s.TURNOVER_LACS || 0) * 100000;
    const volume = s.volume_curr || 0;
    const oi = s.openInterest || 0;
    const oiChangePct = s.oiChangePct ?? 0;
    const price =
      s.changePct ??
      s.pChange ??
      s.performance ??
      (s.CLOSE_PRICE && s.PREV_CLOSE
        ? ((s.CLOSE_PRICE - s.PREV_CLOSE) / s.PREV_CLOSE) * 100
        : 0);
    const delivery =
      s.DELIV_PER ?? (volume > 0 ? (s.deliveryQty / volume) * 100 : 0);

    const w = turnover || 1;

    totalTurnover += turnover;
    totalVolume += volume;
    totalOI += oi;
    oiChangeWeighted += oiChangePct * w;
    priceWeighted += price * w;
    deliveryWeighted += delivery * w;

    weightSum += w;
    prices.push(price);
    if (price > 0) positivePriceCount += 1;

    const totalTrades = s.totalTrades || 0;
    const avgTradeSize =
      totalTrades > 0
        ? (s.turnover_curr || 0) / totalTrades
        : s.avgTradeSize || 0;
    const avgTradeExp = avgTradeSize > 0 ? 1 : 1;
    avgTradeExpSum += avgTradeExp * w;

    const basis = (s.futPrice || 0) - (s.close || 0);
    basisExpSum += basis * w;

    const contractExp = s.contracts > 0 ? 1 : 1;
    contractExpSum += contractExp * w;

    const oiExp = oi > 0 ? 1 : 1;
    oiExpSum += oiExp * w;

    oiAnalysisSum += (oiAnalysisMap[s.oiAnalysis] || 0) * w;
  }

  if (weightSum === 0) return null;

  const meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance =
    prices.reduce((s, p) => s + (p - meanPrice) ** 2, 0) / prices.length;
  const dispersion = Math.sqrt(variance);

  return {
    turnover: totalTurnover,
    volume: totalVolume,
    oi: totalOI,
    oiChangePct: oiChangeWeighted / weightSum,
    price: priceWeighted / weightSum,
    delivery: deliveryWeighted / weightSum,
    basisExpansion: basisExpSum / weightSum,
    avgTradeSizeExpansion: avgTradeExpSum / weightSum,
    contractExpansion: contractExpSum / weightSum,
    oiExpansion: oiExpSum / weightSum,
    oiAnalysisScore: oiAnalysisSum / weightSum,
    breadth: positivePriceCount / stocks.length,
    dispersion,
    stockCount: stocks.length,
  };
}

export function buildBubbleFromTimeline(
  timeline,
  sectors,
  useShouldApplyControls = false,
  bubbleControls = {},
  rowPosition = "center",
  rolloverDataMap = {},
  enableSignalEngine = false,  // 🆕 NEW PARAMETER
) {
  if (!timeline?.length) return [];

  // ─── STEP 1: Pre-compute sector aggregates for every day ───
  const sectorAggByDay = timeline.map((day) => {
    const agg = {};
    for (const secName of sectors) {
      agg[secName] = aggregateSectorMetrics(day.stocks || [], secName);
    }
    return agg;
  });

  // ─── STEP 2: Compute MARKET-AVERAGE per day ───
  const marketAvgByDay = sectorAggByDay.map((dayAgg) => {
    const validSectors = Object.values(dayAgg).filter(Boolean);
    if (!validSectors.length)
      return { avgPrice: 0, avgFlow: 0, avgDelivery: 0 };

    let totalPrice = 0;
    let totalDelivery = 0;
    let count = 0;

    for (const s of validSectors) {
      totalPrice += s.price || 0;
      totalDelivery += s.delivery || 0;
      count += 1;
    }

    return {
      avgPrice: count > 0 ? totalPrice / count : 0,
      avgDelivery: count > 0 ? totalDelivery / count : 0,
    };
  });

  // ─── STEP 3: per-sector intent memory + history ───
  const sectorIntentMemory = {};
  const sectorHistory = {};
  // 🆕 NEW: per-sector ENGINE-READY history for signal detection
  const sectorEngineHistory = {};

  // ─── STEP 4: Build bubbles ───
  const allBubbles = timeline.flatMap((day, i) => {
    const time = new Date(day.date).getTime();
    const dayAgg = sectorAggByDay[i];
    const prevDayAgg = sectorAggByDay[i - 1] || {};
    const marketAvg = marketAvgByDay[i];

    return sectors
      .map((secName, secIdx) => {
        const y = resolveRowY(secIdx, rowPosition);
        const sec = dayAgg[secName];
        if (!sec) return null;

        const prevSec = prevDayAgg[secName];

        const flow =
          prevSec && prevSec.turnover > 0
            ? ((sec.turnover - prevSec.turnover) / prevSec.turnover) * 100
            : 0;

        const prevFlow =
          i >= 2 && prevSec && sectorAggByDay[i - 2]?.[secName]
            ? ((prevSec.turnover - sectorAggByDay[i - 2][secName].turnover) /
                sectorAggByDay[i - 2][secName].turnover) *
              100
            : 0;

        const flowSpike = flow - prevFlow;

        const relativePrice = sec.price - marketAvg.avgPrice;

        const moneyFlowScore = computeMoneyFlowScore({
          price: relativePrice,
          volume: sec.volume,
          prevVolume: prevSec?.volume || 0,
          delivery: sec.delivery,
          oi: sec.oi,
          prevOI: prevSec?.oi || 0,
          oiChangePct: sec.oiChangePct,
          turnover: sec.turnover,
          prevTurnover: prevSec?.turnover || 0,
          bubbleControls,
          useShouldApplyControls,
          avgTradeSizeExpansion: sec.avgTradeSizeExpansion || 1,
          basisExpansion: sec.basisExpansion || 0,
          contractExpansion: sec.contractExpansion || 1,
          oiExpansion: sec.oiExpansion || 1,
          oiAnalysis:
            sec.oiAnalysisScore > 0.3
              ? "long_buildup"
              : sec.oiAnalysisScore < -0.3
                ? "short_buildup"
                : "neutral",
          rolloverPct: 0,
          rolloverExpansion: 1,
        });

        const prevIntent = sectorIntentMemory[secName] || "NEUTRAL";
        const { intent, layer } = resolveIntent({
          flow,
          price: relativePrice,
          prevFlow,
          flowSpike,
          delivery: sec.delivery,
          moneyFlowScore,
          prevIntent,
        });
        sectorIntentMemory[secName] = intent;

        const finalScore = Math.max(-1, Math.min(moneyFlowScore, 1.5));

        let size = 8 + Math.pow(Math.abs(finalScore), 1.3) * 40;

        if (layer === "strong") size *= 1.2;
        if (layer === "early") size *= 0.9;

        const strength = Math.min(
          Math.abs(moneyFlowScore) * 0.7 + (sec.delivery / 100) * 0.3,
          1,
        );

        // ─── Rotation score (5d avg vs prior 5d avg) ───
        if (!sectorHistory[secName]) sectorHistory[secName] = [];
        sectorHistory[secName].push({ time, moneyFlowScore });

        let rotationScore = 0;
        const hist = sectorHistory[secName];
        if (hist.length >= 10) {
          const last5 = hist.slice(-5);
          const prior5 = hist.slice(-10, -5);
          const last5avg = last5.reduce((s, h) => s + h.moneyFlowScore, 0) / 5;
          const prior5avg =
            prior5.reduce((s, h) => s + h.moneyFlowScore, 0) / 5;
          rotationScore = last5avg - prior5avg;
        }

        // ─── Dominant expiry for tooltip context ───
        const stocksToday = day.stocks || [];
        const expiryCount = {};
        stocksToday.forEach((s) => {
          if (s.sector !== secName || !s.expiry) return;
          expiryCount[s.expiry] = (expiryCount[s.expiry] || 0) + 1;
        });
        const sectorExpiry =
          Object.entries(expiryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          null;

        // 🆕 ─── BUILD ENGINE-READY HISTORY ENTRY ───
        // This is the per-sector "stock-like" series the signal engine consumes.
        // It has the same shape as processStock()'s output for individual stocks,
        // so detectBubbleSignal() works on it without modification.
        if (!sectorEngineHistory[secName]) sectorEngineHistory[secName] = [];

        const engineEntry = {
          // CORE FIELDS used by signal engine pattern detectors:
          price: sec.price,                         // sector's weighted avg price change %
          volume: sec.volume,                        // sector total volume
          delivery: sec.delivery,                    // weighted avg delivery %
          oi: sec.oi,                                // total OI
          oiChangePct: sec.oiChangePct,              // weighted avg OI change %
          turnover: sec.turnover,                    // sector total turnover
          turnoverChange: flow,                      // % change in turnover day-over-day
          moneyFlowScore,                            // sector-level MFS
          // SECONDARY fields:
          breadth: sec.breadth,
          dispersion: sec.dispersion,
          relativePrice,
          rotationScore,
          time,
        };

        sectorEngineHistory[secName].push(engineEntry);

        // 🆕 ─── RUN SIGNAL ENGINE ON SECTOR HISTORY ───
        const bubbleSignal = enableSignalEngine
          ? detectBubbleSignal(sectorEngineHistory[secName])
          : null;

        return {
          x: time,
          y,
          size,
          sector: secName,
          turnover: sec.turnover,
          turnoverChange: flow,
          layer,
          intent,
          strength,
          rowPosition,
          expiry: sectorExpiry,
          moneyFlowScore,
          finalScore,
          price: sec.price,
          relativePrice,
          delivery: sec.delivery,
          oiChangePct: sec.oiChangePct,
          oi: sec.oi,
          breadth: sec.breadth,
          dispersion: sec.dispersion,
          stockCount: sec.stockCount,
          rotationScore,
          marketAvgPrice: marketAvg.avgPrice,
          isSmartEntry: false,
          smartStrength: 0,
          smartTier: null,
          smartValidation: null,
          // 🆕 SIGNAL ENGINE FIELDS (same shape as stock bubbles)
          bubbleSignal,
          signalValidation: null,  // filled in by post-pass below
          hasBuySignal: bubbleSignal?.type === "BUY",
          hasSellSignal: bubbleSignal?.type === "SELL",
          hasWarnSignal: bubbleSignal?.type === "WARN",
        };
      })
      .filter(Boolean);
  });

  // 🆕 ─── F3 POST-PASS — FORWARD VALIDATION FOR SECTOR SIGNALS ───
  // Group bubbles by sector (already chronological), then validate.
  if (enableSignalEngine) {
    const bySector = {};
    for (const b of allBubbles) {
      if (!bySector[b.sector]) bySector[b.sector] = [];
      bySector[b.sector].push(b);
    }
    // applySignalValidation expects a map keyed by "stock", but it's just a key.
    // Works identically for sector keys.
    applySignalValidation(bySector);
  }

  return allBubbles;
}