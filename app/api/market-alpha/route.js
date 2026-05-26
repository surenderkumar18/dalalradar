// app/api/market-alpha/route.js
// ════════════════════════════════════════════════════════════
//  MASTER ALPHA COMMANDER — Fast API Route (v4)
//
//  Speed optimizations:
//   1. 5–8 representative stocks per sector (was up to 22)
//   2. 8-minute in-memory cache per period
//   3. Whale tracker moved to separate endpoint (lazy-loaded)
//
//  Place at: app/api/market-alpha/route.js
// ════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
try { yahooFinance.suppressNotices?.(["yahooSurvey", "ripHistorical"]); } catch (_) {}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

/* ════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════ */
const BENCHMARK = "^NSEI";
const VIX_TICKER = "^INDIAVIX";
const MIN_COMPOSITE_STOCKS = 2;
const CONCURRENCY = 5;          // parallel fetches
const CACHE_TTL_MS = 8 * 60 * 1000;  // 8-minute cache

/* ════════════════════════════════════════════════════════════
   SLIM SECTOR LISTS — 5–8 high-weight representative stocks
   Picked for liquidity + size + sector-driving weight.
   This is what powers the ranking chart (fast path).
═══════════════════════════════════════════════════════════ */
const COMPOSITE_SECTORS = {
  Auto: [
    "MARUTI.NS", "M&M.NS", "TATAMOTORS.NS", "BAJAJ-AUTO.NS",
    "EICHERMOT.NS", "HEROMOTOCO.NS", "TVSMOTOR.NS",
  ],
  BANK_PRIVATE: [
    "HDFCBANK.NS", "ICICIBANK.NS", "AXISBANK.NS", "KOTAKBANK.NS",
    "INDUSINDBK.NS", "IDFCFIRSTB.NS",
  ],
  BANK_PSU: [
    "SBIN.NS", "BANKBARODA.NS", "CANBK.NS", "PNB.NS", "INDIANB.NS",
  ],
  CapitalGoods: [
    "SIEMENS.NS", "ABB.NS", "HAL.NS", "BEL.NS", "CGPOWER.NS",
    "POLYCAB.NS", "HAVELLS.NS",
  ],
  Cement: [
    "ULTRACEMCO.NS", "GRASIM.NS", "AMBUJACEM.NS", "SHREECEM.NS", "DALBHARAT.NS",
  ],
  Chemical: [
    "ASIANPAINT.NS", "PIDILITIND.NS", "SRF.NS", "PIIND.NS", "UPL.NS",
  ],
  Energy: [
    "RELIANCE.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS",
    "BPCL.NS", "IOC.NS", "TATAPOWER.NS",
  ],
  Exchange: [
    "BSE.NS", "CDSL.NS", "MCX.NS", "ANGELONE.NS", "CAMS.NS",
  ],
  FMCG: [
    "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS",
    "DABUR.NS", "TATACONSUM.NS",
  ],
  Hospital: ["APOLLOHOSP.NS", "MAXHEALTH.NS", "FORTIS.NS"],
  IT: [
    "TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS",
    "LTIM.NS", "TECHM.NS", "PERSISTENT.NS",
  ],
  Infra: ["LT.NS", "ADANIPORTS.NS", "ADANIENT.NS", "RVNL.NS"],
  Insurance: ["SBILIFE.NS", "HDFCLIFE.NS", "ICICIPRULI.NS", "LICI.NS", "ICICIGI.NS"],
  Internet: ["NAUKRI.NS", "POLICYBZR.NS", "PAYTM.NS"],
  Logistics: ["INDIGO.NS", "IRCTC.NS", "CONCOR.NS", "DELHIVERY.NS"],
  Metal: [
    "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "VEDL.NS",
    "COALINDIA.NS", "JINDALSTEL.NS",
  ],
  NBFC: [
    "BAJFINANCE.NS", "BAJAJFINSV.NS", "SHRIRAMFIN.NS", "CHOLAFIN.NS",
    "JIOFIN.NS", "PFC.NS", "RECLTD.NS",
  ],
  Pharma: [
    "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS",
    "LUPIN.NS", "TORNTPHARM.NS", "ZYDUSLIFE.NS",
  ],
  Realty: ["DLF.NS", "LODHA.NS", "GODREJPROP.NS", "OBEROIRLTY.NS", "PRESTIGE.NS"],
  Retail: ["TITAN.NS", "TRENT.NS", "DMART.NS", "NYKAA.NS", "KALYANKJIL.NS"],
  Telecom: ["BHARTIARTL.NS", "INDUSTOWER.NS", "IDEA.NS"],
};

// Full lists (for whale tracker endpoint). Kept separate.
export const FULL_SECTOR_STOCKS = COMPOSITE_SECTORS; // alias; identical for now

/* ════════════════════════════════════════════════════════════
   IN-MEMORY CACHE
   Keyed by period. Survives across requests inside one
   Node process. Resets when the dev server restarts.
═══════════════════════════════════════════════════════════ */
const cache = new Map(); // period -> { data, expires }

function getCached(period) {
  const hit = cache.get(period);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(period);
    return null;
  }
  return hit.data;
}

function setCached(period, data) {
  cache.set(period, { data, expires: Date.now() + CACHE_TTL_MS });
}

/* ════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function toDateKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split("T")[0];
}

function getPeriodStart(period) {
  const d = new Date();
  switch (period) {
    case "1wk": d.setDate(d.getDate() - 10); break;   // ~5 trading days + buffer
    case "15d": d.setDate(d.getDate() - 21); break;   // ~15 trading days + buffer
    case "1mo": d.setMonth(d.getMonth() - 1); break;
    case "6mo": d.setMonth(d.getMonth() - 6); break;
    case "1y": d.setFullYear(d.getFullYear() - 1); break;
    case "2y": d.setFullYear(d.getFullYear() - 2); break;
    case "3mo":
    default: d.setMonth(d.getMonth() - 3); break;
  }
  return d;
}

async function fetchHistorical(ticker, queryOptions) {
  try {
    const rows = await yahooFinance.historical(ticker, queryOptions);
    if (!rows || rows.length === 0) return null;
    return rows
      .filter((q) => q.close != null && q.date != null)
      .map((q) => ({
        date: toDateKey(q.date),
        close: q.close,
        volume: q.volume ?? 0,
      }));
  } catch (_) {
    return null;
  }
}

async function fetchHistoricalStrict(ticker, queryOptions) {
  const rows = await yahooFinance.historical(ticker, queryOptions);
  if (!rows || rows.length === 0) throw new Error(`No data for ${ticker}`);
  return rows
    .filter((q) => q.close != null && q.date != null)
    .map((q) => ({
      date: toDateKey(q.date),
      close: q.close,
      volume: q.volume ?? 0,
    }));
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      try { out[idx] = await fn(items[idx], idx); }
      catch (_) { out[idx] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/* ════════════════════════════════════════════════════════════
   COMPOSITE BUILDER
═══════════════════════════════════════════════════════════ */
async function buildComposite(sectorName, tickers, queryOptions) {
  const fetched = await mapLimit(tickers, CONCURRENCY, (t) =>
    fetchHistorical(t, queryOptions)
  );

  const series = {};
  const successful = [];
  tickers.forEach((t, i) => {
    const data = fetched[i];
    if (data && data.length >= 3) {
      const m = new Map();
      data.forEach((d) => m.set(d.date, d.close));
      series[t] = m;
      successful.push(t);
    }
  });

  if (successful.length < MIN_COMPOSITE_STOCKS) {
    return { composite: null, used: [], failed: tickers };
  }

  const dateSet = new Set();
  successful.forEach((t) => series[t].forEach((_, d) => dateSet.add(d)));
  const allDates = Array.from(dateSet).sort();

  const matrix = {};
  successful.forEach((t) => {
    matrix[t] = new Array(allDates.length).fill(null);
    let lastVal = null;
    for (let i = 0; i < allDates.length; i++) {
      const v = series[t].get(allDates[i]);
      if (v != null) lastVal = v;
      matrix[t][i] = lastVal;
    }
  });

  const threshold = Math.max(2, Math.floor(successful.length * 0.6));
  const keepIdx = [];
  for (let i = 0; i < allDates.length; i++) {
    let count = 0;
    for (const t of successful) if (matrix[t][i] != null) count++;
    if (count >= threshold) keepIdx.push(i);
  }
  if (keepIdx.length < 3) {
    return { composite: null, used: [], failed: tickers };
  }

  successful.forEach((t) => {
    const vals = keepIdx.map((i) => matrix[t][i]);
    let nextVal = null;
    for (let i = vals.length - 1; i >= 0; i--) {
      if (vals[i] != null) nextVal = vals[i];
      else vals[i] = nextVal;
    }
    let lastVal = null;
    for (let i = 0; i < vals.length; i++) {
      if (vals[i] != null) lastVal = vals[i];
      else vals[i] = lastVal;
    }
    matrix[t] = vals;
  });

  const finalTickers = successful.filter(
    (t) => !matrix[t].some((v) => v == null)
  );
  if (finalTickers.length < MIN_COMPOSITE_STOCKS) {
    return { composite: null, used: [], failed: tickers };
  }

  const compositeSeries = [];
  const keepDates = keepIdx.map((i) => allDates[i]);
  for (let i = 0; i < keepDates.length; i++) {
    let sum = 0;
    finalTickers.forEach((t) => {
      const base = matrix[t][0];
      sum += (matrix[t][i] / base) * 100;
    });
    compositeSeries.push({
      date: keepDates[i],
      value: sum / finalTickers.length,
    });
  }

  return {
    composite: compositeSeries,
    used: finalTickers,
    failed: tickers.filter((t) => !finalTickers.includes(t)),
  };
}

/* ════════════════════════════════════════════════════════════
   ROUTE HANDLER
═══════════════════════════════════════════════════════════ */
export async function GET(request) {
  const startTime = Date.now();
  const log = [];
  const warn = (msg) => { log.push(msg); console.log("[market-alpha]", msg); };

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "3mo";
    const skipCache = searchParams.get("nocache") === "1";

    // ─── CACHE HIT ───
    if (!skipCache) {
      const cached = getCached(period);
      if (cached) {
        warn(`✅ Cache HIT for "${period}" — instant response`);
        return NextResponse.json({
          ...cached,
          fromCache: true,
          cacheAgeSec: Math.floor(
            (Date.now() - (cached._cachedAt || Date.now())) / 1000
          ),
        });
      }
      warn(`🔍 Cache MISS for "${period}" — building fresh`);
    } else {
      warn(`⏭ Cache bypassed via ?nocache=1`);
    }

    const endDate = new Date();
    const startDate = getPeriodStart(period);
    const queryOptions = {
      period1: Math.floor(startDate.getTime() / 1000),
      period2: Math.floor(endDate.getTime() / 1000),
      interval: "1d",
    };

    warn(`Period: ${period}, range: ${toDateKey(startDate)} → ${toDateKey(endDate)}`);

    // 1) Benchmark
    let benchmark;
    try {
      benchmark = await fetchHistoricalStrict(BENCHMARK, queryOptions);
      warn(`Benchmark: ${benchmark.length} days`);
    } catch (e) {
      warn("BENCHMARK FAILED: " + e.message);
      return NextResponse.json(
        { success: false, error: `Benchmark fetch failed: ${e.message}`, log },
        { status: 500 }
      );
    }

    if (benchmark.length < 3) {
      return NextResponse.json(
        { success: false, error: `Only ${benchmark.length} days of benchmark data (need 3+)`, log },
        { status: 500 }
      );
    }
    const benchmarkMap = new Map();
    benchmark.forEach((d) => benchmarkMap.set(d.date, d.close));

    // 2) VIX
    let vixValue = 15;
    try {
      const vixQuote = await yahooFinance.quote(VIX_TICKER);
      if (vixQuote?.regularMarketPrice) {
        vixValue = vixQuote.regularMarketPrice;
        warn(`VIX: ${vixValue.toFixed(2)}`);
      }
    } catch (e) {
      warn("VIX exception: " + e.message);
    }

    // 3) Composites — PARALLEL across sectors for max speed
    warn(`Building ${Object.keys(COMPOSITE_SECTORS).length} composites in parallel...`);
    const sectorEntries = Object.entries(COMPOSITE_SECTORS);
    const sectorResults = await Promise.all(
      sectorEntries.map(async ([sectorName, tickers]) => {
        try {
          const { composite, used, failed } = await buildComposite(
            sectorName, tickers, queryOptions
          );
          return { sectorName, composite, used, failed, tickers };
        } catch (e) {
          return { sectorName, composite: null, error: e.message, tickers };
        }
      })
    );

    const sectorHistory = {};
    const finalScores = {};
    const buildLog = [];

    for (const r of sectorResults) {
      if (!r.composite) {
        buildLog.push({
          sector: r.sectorName, status: "skipped",
          used: 0, total: r.tickers.length,
        });
        warn(`✗ ${r.sectorName}: insufficient data`);
        continue;
      }
      buildLog.push({
        sector: r.sectorName, status: "ok",
        used: r.used.length, total: r.tickers.length, failed: r.failed,
      });
      warn(`✓ ${r.sectorName}: ${r.used.length}/${r.tickers.length}`);

      const rsRaw = [];
      for (const point of r.composite) {
        const b = benchmarkMap.get(point.date);
        if (b == null) continue;
        rsRaw.push({ date: point.date, ratio: point.value / b });
      }
      if (rsRaw.length < 2) continue;
      const baseRatio = rsRaw[0].ratio;
      const rsSeries = rsRaw.map((p) => ({
        date: p.date,
        value: parseFloat(((p.ratio / baseRatio) * 100).toFixed(2)),
      }));
      sectorHistory[r.sectorName] = rsSeries;
      finalScores[r.sectorName] = rsSeries[rsSeries.length - 1].value;
    }

    if (Object.keys(finalScores).length === 0) {
      return NextResponse.json(
        { success: false, error: "No sectors could be built.", buildLog, log },
        { status: 500 }
      );
    }

    // 4) Date range
    const allDatesSet = new Set();
    Object.values(sectorHistory).forEach((arr) =>
      arr.forEach((p) => allDatesSet.add(p.date))
    );
    const allDates = Array.from(allDatesSet).sort();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    warn(`✅ Done in ${elapsed}s. ${Object.keys(finalScores).length} sectors ranked.`);

    const payload = {
      success: true,
      vix: vixValue,
      period,
      elapsedSec: parseFloat(elapsed),
      dateRange: {
        start: allDates[0] || null,
        end: allDates[allDates.length - 1] || null,
        days: allDates.length,
      },
      sectorHistory,
      finalScores,
      buildLog,
      _cachedAt: Date.now(),
      fromCache: false,
    };

    setCached(period, payload);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
      },
    });
  } catch (err) {
    console.error("[market-alpha] FATAL:", err);
    return NextResponse.json(
      { success: false, error: err.message || String(err), stack: err.stack, log },
      { status: 500 }
    );
  }
}