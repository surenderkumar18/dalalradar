// app/api/market-alpha/whales/route.js
// ════════════════════════════════════════════════════════════
//  WHALE TRACKER — Lazy-loaded endpoint
//  Called only when user clicks "Load Whale Tracker" button.
//  Place at: app/api/market-alpha/whales/route.js
// ════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
try { yahooFinance.suppressNotices?.(["yahooSurvey", "ripHistorical"]); } catch (_) {}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

const CONCURRENCY = 5;
const CACHE_TTL_MS = 8 * 60 * 1000;

/* ════════════════════════════════════════════════════════════
   FULL SECTOR STOCK LISTS for whale scanning
   (Same lean lists as ranking — change here if you want to
    scan MORE stocks for whales than what's in the composite.)
═══════════════════════════════════════════════════════════ */
const WHALE_SECTOR_STOCKS = {
  Auto: [
    "MARUTI.NS", "M&M.NS", "TATAMOTORS.NS", "BAJAJ-AUTO.NS",
    "EICHERMOT.NS", "HEROMOTOCO.NS", "TVSMOTOR.NS", "BHARATFORG.NS",
    "MOTHERSON.NS", "SONACOMS.NS", "UNOMINDA.NS",
  ],
  BANK_PRIVATE: [
    "HDFCBANK.NS", "ICICIBANK.NS", "AXISBANK.NS", "KOTAKBANK.NS",
    "INDUSINDBK.NS", "IDFCFIRSTB.NS", "FEDERALBNK.NS", "AUBANK.NS",
  ],
  BANK_PSU: [
    "SBIN.NS", "BANKBARODA.NS", "CANBK.NS", "PNB.NS", "INDIANB.NS",
    "UNIONBANK.NS", "BANKINDIA.NS",
  ],
  CapitalGoods: [
    "SIEMENS.NS", "ABB.NS", "HAL.NS", "BEL.NS", "CGPOWER.NS",
    "POLYCAB.NS", "HAVELLS.NS", "DIXON.NS", "BHEL.NS", "KAYNES.NS",
  ],
  Cement: ["ULTRACEMCO.NS", "GRASIM.NS", "AMBUJACEM.NS", "SHREECEM.NS", "DALBHARAT.NS"],
  Chemical: ["ASIANPAINT.NS", "PIDILITIND.NS", "SRF.NS", "PIIND.NS", "UPL.NS", "SOLARINDS.NS"],
  Energy: [
    "RELIANCE.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS",
    "BPCL.NS", "IOC.NS", "TATAPOWER.NS", "ADANIGREEN.NS",
    "GAIL.NS", "HINDPETRO.NS",
  ],
  Exchange: ["BSE.NS", "CDSL.NS", "MCX.NS", "ANGELONE.NS", "CAMS.NS", "KFINTECH.NS"],
  FMCG: [
    "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS",
    "DABUR.NS", "TATACONSUM.NS", "GODREJCP.NS", "MARICO.NS", "VBL.NS",
  ],
  Hospital: ["APOLLOHOSP.NS", "MAXHEALTH.NS", "FORTIS.NS"],
  IT: [
    "TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS",
    "LTIM.NS", "TECHM.NS", "PERSISTENT.NS", "COFORGE.NS",
    "MPHASIS.NS", "TATAELXSI.NS",
  ],
  Infra: ["LT.NS", "ADANIPORTS.NS", "ADANIENT.NS", "RVNL.NS", "NBCC.NS"],
  Insurance: ["SBILIFE.NS", "HDFCLIFE.NS", "ICICIPRULI.NS", "LICI.NS", "ICICIGI.NS"],
  Internet: ["NAUKRI.NS", "POLICYBZR.NS", "PAYTM.NS"],
  Logistics: ["INDIGO.NS", "IRCTC.NS", "CONCOR.NS", "DELHIVERY.NS", "GMRAIRPORT.NS"],
  Metal: [
    "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "VEDL.NS",
    "COALINDIA.NS", "JINDALSTEL.NS", "NMDC.NS", "SAIL.NS", "HINDZINC.NS",
  ],
  NBFC: [
    "BAJFINANCE.NS", "BAJAJFINSV.NS", "SHRIRAMFIN.NS", "CHOLAFIN.NS",
    "JIOFIN.NS", "PFC.NS", "RECLTD.NS", "MUTHOOTFIN.NS",
    "HDFCAMC.NS", "SBICARD.NS",
  ],
  Pharma: [
    "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS",
    "LUPIN.NS", "TORNTPHARM.NS", "ZYDUSLIFE.NS", "AUROPHARMA.NS",
    "MANKIND.NS", "BIOCON.NS",
  ],
  Realty: ["DLF.NS", "LODHA.NS", "GODREJPROP.NS", "OBEROIRLTY.NS", "PRESTIGE.NS", "PHOENIXLTD.NS"],
  Retail: ["TITAN.NS", "TRENT.NS", "DMART.NS", "NYKAA.NS", "KALYANKJIL.NS", "PAGEIND.NS"],
  Telecom: ["BHARTIARTL.NS", "INDUSTOWER.NS", "IDEA.NS"],
};

/* ─── Cache ─── */
const cache = new Map(); // key -> { data, expires }

function cacheKey(sectors) { return sectors.sort().join(","); }
function getCached(key) {
  const hit = cache.get(key);
  if (!hit || Date.now() > hit.expires) { cache.delete(key); return null; }
  return hit.data;
}
function setCached(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

/* ─── Helpers ─── */
function toDateKey(d) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().split("T")[0];
}

async function fetchHistorical(ticker, queryOptions) {
  try {
    const rows = await yahooFinance.historical(ticker, queryOptions);
    if (!rows?.length) return null;
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

async function scanSectorWhales(sectorName, tickers, queryOptions) {
  const fetched = await mapLimit(tickers, CONCURRENCY, (t) =>
    fetchHistorical(t, queryOptions)
  );

  const out = [];
  tickers.forEach((ticker, i) => {
    const data = fetched[i];
    if (!data || data.length < 11) {
      out.push({ ticker, sector: sectorName, status: "INSUFFICIENT DATA" });
      return;
    }
    const last = data[data.length - 1];
    const vols = data.map((d) => d.volume);
    const last10 = vols.slice(-11, -1);
    const avgVol = last10.length ? last10.reduce((a, b) => a + b, 0) / last10.length : 0;
    const vRatio = avgVol > 0 ? last.volume / avgVol : 1;
    const closes = data.map((d) => d.close);
    const priceChg5d =
      closes.length >= 6
        ? (closes[closes.length - 1] / closes[closes.length - 6] - 1) * 100
        : 0;

    let signal, score;
    if (vRatio > 2.5) { signal = "🐋 WHALE ENTRY"; score = 5; }
    else if (vRatio > 1.8) { signal = "🚀 STRONG ACCUM"; score = 4; }
    else if (vRatio > 1.2) { signal = "✅ ACCUMULATING"; score = 3; }
    else if (vRatio > 0.7) { signal = "💤 QUIET"; score = 2; }
    else { signal = "⬇️ DRYING UP"; score = 1; }

    out.push({
      sector: sectorName, ticker,
      price: last.close, vRatio, priceChg5d, signal, score,
    });
  });
  return out;
}

/* ════════════════════════════════════════════════════════════
   ROUTE: GET /api/market-alpha/whales?sectors=Auto,IT,Pharma
═══════════════════════════════════════════════════════════ */
export async function GET(request) {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const sectorsParam = searchParams.get("sectors");
    if (!sectorsParam) {
      return NextResponse.json(
        { success: false, error: "Missing ?sectors=A,B,C param" },
        { status: 400 }
      );
    }
    const sectors = sectorsParam.split(",").filter(Boolean);
    if (sectors.length === 0) {
      return NextResponse.json(
        { success: false, error: "No sectors specified" },
        { status: 400 }
      );
    }

    const key = cacheKey(sectors);
    const cached = getCached(key);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 45);
    const queryOptions = {
      period1: Math.floor(start.getTime() / 1000),
      period2: Math.floor(end.getTime() / 1000),
      interval: "1d",
    };

    const whalePerSector = {};
    const allStrongSignals = [];

    // Parallel across sectors
    const results = await Promise.all(
      sectors.map(async (sec) => {
        const stocks = WHALE_SECTOR_STOCKS[sec];
        if (!stocks) return { sec, valid: [] };
        const results = await scanSectorWhales(sec, stocks, queryOptions);
        const valid = results.filter((r) => r.score != null);
        valid.sort((a, b) => b.score - a.score || b.vRatio - a.vRatio);
        return { sec, valid };
      })
    );

    for (const { sec, valid } of results) {
      whalePerSector[sec] = valid;
      valid.forEach((r) => { if (r.score >= 4) allStrongSignals.push(r); });
    }
    allStrongSignals.sort((a, b) => b.score - a.score || b.vRatio - a.vRatio);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const payload = {
      success: true,
      elapsedSec: parseFloat(elapsed),
      whalePerSector,
      topWhaleSignals: allStrongSignals.slice(0, 10),
      fromCache: false,
    };
    setCached(key, payload);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}