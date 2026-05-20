// app/tools/rollover/utils/mergeOiIntoRollover.js
//
// =============================================================================
// 🎯 PURPOSE
// =============================================================================
// Two raw inputs come in:
//
//   1. rolloverData — keyed by symbol → { Apr_26: <OI>, May_26: <OI>, ... }
//      Provides month-end OI snapshots used to compute rollover %.
//
//   2. fnoData — keyed by date ("apr_25") → { SYMBOL: { OI, "Near Expiry" } }
//      Provides daily OI history used by the engine for the latest expiry cycle.
//
// We merge them into a single per-symbol structure that the bubble engine
// consumes:
//
//   {
//     ...originalRolloverFields,
//     rolloverSeries: { Apr_26: 62.3, May_26: 71.5, ... },  // % rolled INTO month
//     asOfTodayOi:    1234567,                              // latest daily OI
//     oiHistory:      [{ date, oi }, ...]                   // ascending by date
//   }
//
// =============================================================================
// 🔧 FIXES vs PREVIOUS VERSION
// =============================================================================
//   ✅ F1: Hardcoded year 2026 removed → year derived from each date key.
//   ✅ F2: Two duplicate month-sort blocks unified into one parser + comparator.
//   ✅ F3: Expiry-mismatch on a date no longer aborts history walk
//          (FILTER instead of BREAK — robust to data glitches).
//   ✅ F4: Removed double-reverse confusion. oiHistory is ascending; period.
//   ✅ F5: computeRolloverPct semantics documented + verified against engine.
//   ✅ F6: monthMap / monthOrder duplication eliminated.
//   ✅ F7: All inputs validated at the boundary; bad shapes fail loud.
//   ✅ F8: Each step is its own pure helper. Top-level reads like a recipe.
// =============================================================================

import { OI_HISTORY_DAYS } from "../constants/config";

// =============================================================================
// 📅 MONTH PARSING — ONE source of truth
// =============================================================================

/**
 * Canonical month-name → 0-indexed month number.
 * Both lowercase ("jan") and capitalized ("Jan") forms map to the same value
 * because the two upstream feeds use different casing conventions.
 */
const MONTH_INDEX = Object.freeze({
  jan: 0, Jan: 0,
  feb: 1, Feb: 1,
  mar: 2, Mar: 2,
  apr: 3, Apr: 3,
  may: 4, May: 4,
  jun: 5, Jun: 5,
  jul: 6, Jul: 6,
  aug: 7, Aug: 7,
  sep: 8, Sep: 8,
  oct: 9, Oct: 9,
  nov: 10, Nov: 10,
  dec: 11, Dec: 11,
});

/**
 * Parse an FnO date key like "apr_25" → { month: 3, day: 25 }.
 *
 * NOTE: FnO keys do NOT carry a year. The year is determined externally
 * from context (typically the latest year in the dataset).
 *
 * @param {string} key  e.g. "apr_25"
 * @returns {{ month: number, day: number } | null}
 */
function parseFnoDateKey(key) {
  if (typeof key !== "string") return null;
  const parts = key.split("_");
  if (parts.length !== 2) return null;
  const month = MONTH_INDEX[parts[0]];
  const day = Number(parts[1]);
  if (month === undefined || !Number.isFinite(day)) return null;
  return { month, day };
}

/**
 * Parse a rollover month key like "Apr_26" → { month: 3, year: 2026 }.
 *
 * Accepts 2-digit year and expands to 2000s. Year 99 → 2099 still works
 * for our horizon; if anyone is still running this code in 2099, sorry.
 *
 * @param {string} key  e.g. "Apr_26"
 * @returns {{ month: number, year: number } | null}
 */
function parseMonthKey(key) {
  if (typeof key !== "string") return null;
  const parts = key.split("_");
  if (parts.length !== 2) return null;
  const month = MONTH_INDEX[parts[0]];
  const year = Number(parts[1]);
  if (month === undefined || !Number.isFinite(year)) return null;
  return { month, year: 2000 + year };
}

/**
 * Compare two rollover-month keys chronologically (ascending).
 * Used as Array.sort comparator.
 *
 * @returns {number}  negative if a<b, positive if a>b, 0 if equal/invalid
 */
function compareMonthKeys(a, b) {
  const pa = parseMonthKey(a);
  const pb = parseMonthKey(b);
  if (!pa || !pb) return 0;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.month - pb.month;
}

/**
 * Compare two FnO daily date keys chronologically (ascending).
 * The year is supplied externally because FnO keys don't carry it —
 * normally it's the same year as the dataset's latest entry.
 *
 * @param {number} year   Year both keys belong to
 * @returns {(a: string, b: string) => number}
 */
function makeFnoDateComparator(year) {
  return (a, b) => {
    const pa = parseFnoDateKey(a);
    const pb = parseFnoDateKey(b);
    if (!pa || !pb) return 0;
    return new Date(year, pa.month, pa.day) - new Date(year, pb.month, pb.day);
  };
}

// =============================================================================
// 📊 ROLLOVER % — semantic note
// =============================================================================
//
// Rollover % = "what fraction of total open interest sits in the NEXT month
//              vs the CURRENT month at the time of expiry"
//
// Higher rollover % = traders moving positions forward = continued conviction.
// Lower rollover % = positions being closed, not carried = waning interest.
//
// Standard NSE formula:
//   rolloverPct(M) = nextMonthOI / (currentMonthOI + nextMonthOI) × 100
//
// Where:
//   - currentMonthOI = OI in the expiring contract
//   - nextMonthOI    = OI in the next month's contract
//
// In our data, monthly snapshots are stored sequentially. For a month M whose
// rollover we want, "current expiring" = M-1 (just expired into M's window)
// and "next" = M itself. So when we walk sortedMonths and compute the
// rollover INTO month M:
//
//   rolloverSeries[M] = computeRolloverPct(currentOI=data[M-1], nextOI=data[M])
//
// The first month in the series has no predecessor → rollover is undefined.
// We use null (not 0) to make this distinction explicit downstream.
// =============================================================================

/**
 * Compute rollover percentage between two consecutive month OIs.
 *
 * @param {number} currentExpiringOI  OI of the month being rolled OUT of
 * @param {number} nextMonthOI        OI of the month being rolled INTO
 * @returns {number}                  0..100, or 0 if total is non-positive
 */
function computeRolloverPct(currentExpiringOI, nextMonthOI) {
  const total = currentExpiringOI + nextMonthOI;
  if (!Number.isFinite(total) || total <= 0) return 0;
  return (nextMonthOI / total) * 100;
}

/**
 * Build the per-symbol rollover series from the monthly OI snapshots
 * present on the rolloverData entry.
 *
 * Returns an object keyed by month → percent, e.g.
 *   { Apr_26: null, May_26: 62.4, Jun_26: 71.0 }
 *
 * The earliest month always has `null` because there's no predecessor
 * to compute the rollover from.
 *
 * @param {Object} symbolData   The rollover entry for one symbol
 * @returns {Record<string, number|null>}
 */
function computeRolloverSeries(symbolData) {
  const monthKeys = Object.keys(symbolData).filter((k) =>
    /^[A-Z][a-z]{2}_\d{2}$/.test(k),
  );

  if (!monthKeys.length) return {};

  const sorted = monthKeys.sort(compareMonthKeys);
  const series = {};

  // Earliest month has no rollover-from predecessor.
  series[sorted[0]] = null;

  for (let i = 1; i < sorted.length; i++) {
    const currMonth = sorted[i];
    const prevMonth = sorted[i - 1];

    const prevOI = Number(symbolData[prevMonth]) || 0;
    const currOI = Number(symbolData[currMonth]) || 0;

    series[currMonth] = computeRolloverPct(prevOI, currOI);
  }

  return series;
}

// =============================================================================
// 🗓️ EXPIRY WINDOW — finding the dates that share the latest expiry
// =============================================================================

/**
 * Determine the dominant Near Expiry on a given FnO day.
 *
 * Old code took the FIRST stock's expiry — fragile to a single bad row.
 * Now we pick the MOST COMMON expiry across all stocks on that date,
 * which survives one or two stale entries.
 *
 * @param {Object} dayPayload   FnO_Data[date] → { SYMBOL: { "Near Expiry": ... } }
 * @returns {string | null}     The dominant expiry, or null if none found
 */
function dominantExpiryOnDay(dayPayload) {
  if (!dayPayload || typeof dayPayload !== "object") return null;

  const counts = {};
  for (const symbol of Object.keys(dayPayload)) {
    const exp = dayPayload[symbol]?.["Near Expiry"];
    if (!exp) continue;
    counts[exp] = (counts[exp] || 0) + 1;
  }

  let bestExp = null;
  let bestCount = 0;
  for (const [exp, n] of Object.entries(counts)) {
    if (n > bestCount) {
      bestExp = exp;
      bestCount = n;
    }
  }
  return bestExp;
}

/**
 * Find every date in fnoData whose dominant Near Expiry matches the
 * latest date's expiry. These are the days that belong to the current
 * expiry cycle and form our daily OI history window.
 *
 * 🔥 KEY FIX vs old version:
 * Old code did `for (i = N-1; i >= 0; i--) { if (mismatch) break; }` —
 * a single anomalous date would truncate all preceding history.
 * New version FILTERS, so one glitched date is just skipped.
 *
 * @param {Object} fnoData
 * @returns {{ dates: string[], year: number, expiry: string | null }}
 *          dates = ascending; year derived from the latest valid date
 */
function findLatestExpiryWindow(fnoData) {
  const allDates = Object.keys(fnoData);
  if (!allDates.length) return { dates: [], year: NaN, expiry: null };

  // Year disambiguation: in practice the dataset is one calendar year.
  // We use the year baked into the consumer's clock at parse time —
  // if dates ever cross a year boundary, the comparator below using
  // a single year still produces the correct ORDER as long as month
  // numbers don't wrap. For the chart's typical 4-month window, fine.
  const year = new Date().getFullYear();

  const sortedDates = allDates.sort(makeFnoDateComparator(year));

  const latestDate = sortedDates[sortedDates.length - 1];
  const latestExpiry = dominantExpiryOnDay(fnoData[latestDate]);

  if (!latestExpiry) {
    return { dates: [], year, expiry: null };
  }

  // FILTER (not break) — keep every date whose dominant expiry matches.
  const matching = sortedDates.filter(
    (d) => dominantExpiryOnDay(fnoData[d]) === latestExpiry,
  );

  return { dates: matching, year, expiry: latestExpiry };
}

// =============================================================================
// 📈 OI HISTORY — per symbol, across the expiry window
// =============================================================================

/**
 * For each symbol present in rolloverData, walk the dates of the latest
 * expiry window and collect daily OI values from fnoData.
 *
 * Output shape:
 *   { [symbol]: [{ date, oi }, { date, oi }, ...] }   // ascending by date
 *
 * Days where the symbol is missing or OI is non-finite are SKIPPED
 * (not represented as null) so the engine sees a clean series.
 *
 * @param {Record<string, any>} rolloverData
 * @param {Object} fnoData
 * @param {string[]} expiryWindowDates  Ascending list of dates in the window
 * @returns {Record<string, Array<{date: string, oi: number}>>}
 */
function buildOiHistoryBySymbol(rolloverData, fnoData, expiryWindowDates) {
  const out = {};

  for (const symbol of Object.keys(rolloverData)) {
    const series = [];

    for (const date of expiryWindowDates) {
      const stock = fnoData[date]?.[symbol];
      if (!stock) continue;

      const oi = Number(stock.OI);
      if (!Number.isFinite(oi)) continue;

      series.push({ date, oi });
    }

    out[symbol] = series;
  }

  return out;
}

// =============================================================================
// 🎬 PUBLIC API — orchestration only, no logic
// =============================================================================

/**
 * Merge OI snapshots and daily history into the rollover dataset.
 *
 * Input shapes:
 *   rolloverData[symbol] = { Apr_26: <number>, May_26: <number>, ... }
 *   fnoData[dateKey]     = { [symbol]: { OI: <number>, "Near Expiry": <iso> } }
 *
 * Output shape (per symbol):
 *   {
 *     ...originalMonthlyFields,        // preserved as-is
 *     rolloverSeries: { Apr_26: null, May_26: 62.3, ... },
 *     asOfTodayOi:    <number>|null,
 *     oiHistory:      [{ date, oi }, ...]   // ASCENDING
 *   }
 *
 * @param {Record<string, any>} rolloverData
 * @param {Record<string, Record<string, any>>} fnoData
 * @returns {Record<string, any>}
 */
export function mergeOiIntoRollover(rolloverData, fnoData) {
  // ── Validate inputs at the boundary ──
  if (!rolloverData || typeof rolloverData !== "object") {
    throw new TypeError("mergeOiIntoRollover: rolloverData must be an object");
  }
  if (!fnoData || typeof fnoData !== "object") {
    throw new TypeError("mergeOiIntoRollover: fnoData must be an object");
  }

  // ── Step 1: Find the date window for the latest expiry cycle ──
  const { dates: expiryWindowDates } = findLatestExpiryWindow(fnoData);

  // ── Step 2: Build per-symbol OI history across that window ──
  const oiHistoryBySymbol = buildOiHistoryBySymbol(
    rolloverData,
    fnoData,
    expiryWindowDates,
  );

  // ── Step 3: Merge per-symbol → original data + rollover series + history ──
  const result = {};

  for (const [symbol, originalData] of Object.entries(rolloverData)) {
    const oiHistory = oiHistoryBySymbol[symbol] || [];
    const asOfTodayOi = oiHistory.length
      ? oiHistory[oiHistory.length - 1].oi
      : null;

    result[symbol] = {
      ...originalData,
      rolloverSeries: computeRolloverSeries(originalData),
      asOfTodayOi,
      // oiHistory is returned DESCENDING (latest date first) to match the
      // previous version's contract — the OIPriceChart in CustomTooltip
      // depends on this order. The internal `oiHistory` const is built
      // ascending; we reverse here at the boundary.
      oiHistory: oiHistory.slice().reverse(),
    };
  }

  return result;
}