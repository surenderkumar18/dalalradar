// app/api/market-alpha/sector-stocks/route.js
// ════════════════════════════════════════════════════════════
//  SECTOR STOCKS — per-stock performance for a single sector
//  over the requested time window. Called on-demand when
//  user expands a sector card in the ranking panel.
//
//  GET /api/market-alpha/sector-stocks?sector=IT&period=3mo
// ════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();
try { yahooFinance.suppressNotices?.(["yahooSurvey", "ripHistorical"]); } catch (_) {}

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 90;

const CONCURRENCY = 8;
const CACHE_TTL_MS = 8 * 60 * 1000; // 8-minute cache
const BENCHMARK = "^NSEI";

/* ════════════════════════════════════════════════════════════
   FULL F&O SECTOR UNIVERSE
   ──────────────────────────────────────────────────────────
   Every F&O-eligible stock on NSE, classified into the same
   21 sectors used by the ranking engine. The ranking engine
   uses a SLIM subset (5-8 reps per sector) for speed; this
   endpoint exposes the FULL list when a user expands a sector.
   
   Source: NSE F&O list classified by sector. Update quarterly
   as F&O additions/removals happen.
═══════════════════════════════════════════════════════════ */
const SECTOR_STOCKS = {
  Auto: [
    "MARUTI.NS", "M&M.NS", "TATAMOTORS.NS", "BAJAJ-AUTO.NS",
    "EICHERMOT.NS", "HEROMOTOCO.NS", "TVSMOTOR.NS",
    "ASHOKLEY.NS", "MOTHERSON.NS", "BOSCHLTD.NS", "BHARATFORG.NS",
    "BALKRISIND.NS", "MRF.NS", "APOLLOTYRE.NS", "EXIDEIND.NS",
    "TIINDIA.NS", "SONACOMS.NS",
  ],
  BANK_PRIVATE: [
    "HDFCBANK.NS", "ICICIBANK.NS", "AXISBANK.NS", "KOTAKBANK.NS",
    "INDUSINDBK.NS", "IDFCFIRSTB.NS", "FEDERALBNK.NS", "BANDHANBNK.NS",
    "AUBANK.NS", "RBLBANK.NS", "YESBANK.NS",
  ],
  BANK_PSU: [
    "SBIN.NS", "BANKBARODA.NS", "CANBK.NS", "PNB.NS", "INDIANB.NS",
    "UNIONBANK.NS", "IOB.NS", "BANKINDIA.NS",
  ],
  CapitalGoods: [
    "SIEMENS.NS", "ABB.NS", "HAL.NS", "BEL.NS", "CGPOWER.NS",
    "POLYCAB.NS", "HAVELLS.NS", "CUMMINSIND.NS", "BHEL.NS",
    "THERMAX.NS", "ASTRAL.NS", "VOLTAS.NS", "CROMPTON.NS",
    "KEI.NS", "SUPREMEIND.NS", "DIXON.NS", "AMBER.NS",
    "KAYNES.NS", "TIINDIA.NS",
  ],
  Cement: [
    "ULTRACEMCO.NS", "GRASIM.NS", "AMBUJACEM.NS", "SHREECEM.NS",
    "DALBHARAT.NS", "ACC.NS", "JKCEMENT.NS", "RAMCOCEM.NS",
  ],
  Chemical: [
    "ASIANPAINT.NS", "PIDILITIND.NS", "SRF.NS", "PIIND.NS", "UPL.NS",
    "BERGEPAINT.NS", "DEEPAKNTR.NS", "AARTIIND.NS", "TATACHEM.NS",
    "NAVINFLUOR.NS", "ATUL.NS", "GNFC.NS", "COROMANDEL.NS",
    "CHAMBLFERT.NS", "GUJGASLTD.NS",
  ],
  Energy: [
    "RELIANCE.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS",
    "BPCL.NS", "IOC.NS", "TATAPOWER.NS", "HINDPETRO.NS",
    "GAIL.NS", "ADANIPOWER.NS", "ADANIGREEN.NS", "JSWENERGY.NS",
    "NHPC.NS", "SJVN.NS", "TORNTPOWER.NS", "IGL.NS", "PETRONET.NS",
    "OIL.NS", "MGL.NS",
  ],
  Exchange: [
    "BSE.NS", "CDSL.NS", "MCX.NS", "ANGELONE.NS", "CAMS.NS",
    "KFINTECH.NS",
  ],
  FMCG: [
    "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS",
    "DABUR.NS", "TATACONSUM.NS", "GODREJCP.NS", "COLPAL.NS",
    "MARICO.NS", "UBL.NS", "VBL.NS", "PGHH.NS", "EMAMILTD.NS",
    "RADICO.NS", "HATSUN.NS",
  ],
  Hospital: [
    "APOLLOHOSP.NS", "MAXHEALTH.NS", "FORTIS.NS", "GLOBALHEALT.NS",
    "MEDANTA.NS", "NH.NS", "KIMS.NS", "RAINBOW.NS",
  ],
  IT: [
    "TCS.NS", "INFY.NS", "HCLTECH.NS", "WIPRO.NS",
    "LTIM.NS", "TECHM.NS", "PERSISTENT.NS", "COFORGE.NS",
    "MPHASIS.NS", "LTTS.NS", "OFSS.NS", "TATAELXSI.NS",
    "KPITTECH.NS", "BSOFT.NS", "INTELLECT.NS",
  ],
  Infra: [
    "LT.NS", "ADANIPORTS.NS", "ADANIENT.NS", "RVNL.NS",
    "IRCON.NS", "NCC.NS", "KEC.NS", "GMRINFRA.NS",
    "GMRAIRPORT.NS", "JSWINFRA.NS", "IRB.NS", "PNCINFRA.NS",
  ],
  Insurance: [
    "SBILIFE.NS", "HDFCLIFE.NS", "ICICIPRULI.NS", "LICI.NS",
    "ICICIGI.NS", "MAXFIN.NS", "STARHEALTH.NS", "NIACL.NS",
    "GICRE.NS",
  ],
  Internet: [
    "NAUKRI.NS", "POLICYBZR.NS", "PAYTM.NS", "ZOMATO.NS",
    "NYKAA.NS", "CARTRADE.NS", "EASEMYTRIP.NS", "IXIGO.NS",
  ],
  Logistics: [
    "INDIGO.NS", "IRCTC.NS", "CONCOR.NS", "DELHIVERY.NS",
    "TCI.NS", "BLUEDART.NS", "MAHLOG.NS", "GATI.NS",
    "VRLLOG.NS",
  ],
  Metal: [
    "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "VEDL.NS",
    "COALINDIA.NS", "JINDALSTEL.NS", "SAIL.NS", "NMDC.NS",
    "NATIONALUM.NS", "HINDZINC.NS", "HINDCOPPER.NS", "APLAPOLLO.NS",
    "JSWHL.NS", "RATNAMANI.NS", "WELCORP.NS", "WELSPUNLIV.NS",
  ],
  NBFC: [
    "BAJFINANCE.NS", "BAJAJFINSV.NS", "SHRIRAMFIN.NS", "CHOLAFIN.NS",
    "JIOFIN.NS", "PFC.NS", "RECLTD.NS", "MUTHOOTFIN.NS",
    "MANAPPURAM.NS", "L&TFH.NS", "IIFL.NS", "AAVAS.NS",
    "HDFCAMC.NS", "ABCAPITAL.NS", "POONAWALLA.NS", "PEL.NS",
    "SBICARD.NS", "M&MFIN.NS", "PNBHOUSING.NS", "CANFINHOME.NS",
    "LICHSGFIN.NS", "IDFC.NS",
  ],
  Pharma: [
    "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS",
    "LUPIN.NS", "TORNTPHARM.NS", "ZYDUSLIFE.NS", "AUROPHARMA.NS",
    "ALKEM.NS", "BIOCON.NS", "GLENMARK.NS", "MANKIND.NS",
    "GLAND.NS", "LAURUSLABS.NS", "ABBOTINDIA.NS", "GRANULES.NS",
    "IPCALAB.NS", "PFIZER.NS", "SANOFI.NS", "AJANTPHARM.NS",
    "SYNGENE.NS", "JBCHEPHARM.NS",
  ],
  Realty: [
    "DLF.NS", "LODHA.NS", "GODREJPROP.NS", "OBEROIRLTY.NS",
    "PRESTIGE.NS", "PHOENIXLTD.NS", "BRIGADE.NS", "SOBHA.NS",
    "MAHLIFE.NS", "ANANTRAJ.NS",
  ],
  Retail: [
    "TITAN.NS", "TRENT.NS", "DMART.NS", "NYKAA.NS", "KALYANKJIL.NS",
    "ABFRL.NS", "VMART.NS", "SHOPERSTOP.NS", "PAGEIND.NS",
    "RELAXO.NS", "BATAINDIA.NS",
  ],
  Telecom: [
    "BHARTIARTL.NS", "INDUSTOWER.NS", "IDEA.NS", "TATACOMM.NS",
    "TEJASNET.NS", "HFCL.NS",
  ],
};

/* ─── Cache (keyed by sector|period) ─── */
const cache = new Map();
const cacheKey = (sector, period) => `${sector}|${period}`;
function getCached(key) {
  const hit = cache.get(key);
  if (!hit || Date.now() > hit.expires) { cache.delete(key); return null; }
  return hit.data;
}
function setCached(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

/* ─── Helpers ─── */
function getPeriodStart(period) {
  const d = new Date();
  switch (period) {
    case "1wk": d.setDate(d.getDate() - 10); break;
    case "15d": d.setDate(d.getDate() - 21); break;
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
    if (!rows?.length) return null;
    return rows
      .filter((q) => q.close != null && q.date != null)
      .map((q) => ({
        date: q.date,
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

/* ════════════════════════════════════════════════════════════
   ROUTE
═══════════════════════════════════════════════════════════ */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get("sector");
    const period = searchParams.get("period") || "3mo";

    if (!sector) {
      return NextResponse.json(
        { success: false, error: "Missing ?sector= param" },
        { status: 400 }
      );
    }

    const stocks = SECTOR_STOCKS[sector];
    if (!stocks) {
      return NextResponse.json(
        { success: false, error: `Unknown sector: ${sector}` },
        { status: 400 }
      );
    }

    // Cache hit?
    const key = cacheKey(sector, period);
    const cached = getCached(key);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true });
    }

    const endDate = new Date();
    const startDate = getPeriodStart(period);
    const queryOptions = {
      period1: Math.floor(startDate.getTime() / 1000),
      period2: Math.floor(endDate.getTime() / 1000),
      interval: "1d",
    };

    // Fetch benchmark (Nifty) so we can compute relative-strength per stock
    const benchmark = await fetchHistorical(BENCHMARK, queryOptions);
    const benchStart = benchmark?.length ? benchmark[0].close : null;
    const benchEnd = benchmark?.length ? benchmark[benchmark.length - 1].close : null;
    const benchChg =
      benchStart && benchEnd ? ((benchEnd / benchStart - 1) * 100) : null;

    // Fetch all stocks for this sector in parallel
    const fetched = await mapLimit(stocks, CONCURRENCY, (t) =>
      fetchHistorical(t, queryOptions)
    );

    const results = stocks.map((ticker, i) => {
      const data = fetched[i];
      if (!data || data.length < 2) {
        return { ticker, status: "no-data" };
      }
      const first = data[0];
      const last = data[data.length - 1];
      const pctChg = ((last.close / first.close - 1) * 100);
      // Relative vs Nifty over the same window
      const rsVsBench = benchChg != null ? pctChg - benchChg : null;
      // Last 5d % change (or whatever is available)
      const recent = data.slice(-Math.min(6, data.length));
      const recentChg =
        recent.length >= 2
          ? (recent[recent.length - 1].close / recent[0].close - 1) * 100
          : null;

      return {
        ticker,
        startPrice: parseFloat(first.close.toFixed(2)),
        endPrice: parseFloat(last.close.toFixed(2)),
        pctChg: parseFloat(pctChg.toFixed(2)),
        rsVsBench: rsVsBench != null ? parseFloat(rsVsBench.toFixed(2)) : null,
        recentChg: recentChg != null ? parseFloat(recentChg.toFixed(2)) : null,
        latestVolume: last.volume,
        days: data.length,
      };
    });

    // Sort by pctChg descending (best performer first)
    const valid = results.filter((r) => r.pctChg != null);
    const errored = results.filter((r) => r.pctChg == null);
    valid.sort((a, b) => b.pctChg - a.pctChg);

    const payload = {
      success: true,
      sector,
      period,
      benchmarkPctChg: benchChg != null ? parseFloat(benchChg.toFixed(2)) : null,
      stocks: [...valid, ...errored],
      counts: {
        total: stocks.length,
        loaded: valid.length,
        errored: errored.length,
      },
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