/**
 * Date utilities for sector flow data.
 *
 * The source data uses keys like "jan_27", "feb_4", "may_8" — these sort
 * INCORRECTLY with lexicographic ordering (apr < feb < jan < mar < may, and
 * "apr_1" < "apr_15" < "apr_2"). We convert to ISO format internally for
 * correct sorting, then format back for display on the chart axis.
 */

const MONTH_MAP = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
};

const MONTH_REVERSE = Object.fromEntries(
  Object.entries(MONTH_MAP).map(([k,v]) => [v,k])
);

/**
 * Parse "jan_27" → "2026-01-27"
 *
 * @param {string} key      date key like "jan_27"
 * @param {number} fyStart  fiscal year start month (1-12). Months >= fyStart go to
 *                          fyStartYear, months < fyStart go to fyStartYear + 1.
 *                          For Indian FY starting April: fyStart=4, fyStartYear=2025
 *                          For calendar year: fyStart=1, fyStartYear=2026
 * @param {number} fyStartYear  the calendar year of the fiscal year's start
 */
export function parseDateKey(key, fyStart = 1, fyStartYear = 2026){

  if(!key || typeof key !== "string") return null;

  const parts = key.toLowerCase().split("_");
  if(parts.length !== 2) return null;

  const [monStr, dayStr] = parts;
  const mm = MONTH_MAP[monStr];
  if(!mm) return null;

  const monthNum = parseInt(mm, 10);
  const day = parseInt(dayStr, 10);
  if(isNaN(day)) return null;

  // Determine year: months before fyStart belong to fyStartYear + 1
  const year = monthNum >= fyStart ? fyStartYear : fyStartYear + 1;

  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Format "2026-01-27" → "jan_27" for axis display
 */
export function formatDateForDisplay(iso){
  if(!iso || typeof iso !== "string") return iso;

  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if(!m) return iso;

  const [, mm, dd] = m;
  const monStr = MONTH_REVERSE[mm];
  if(!monStr) return iso;

  return `${monStr}_${parseInt(dd, 10)}`;
}

/**
 * Compare two "jan_27" style date keys chronologically.
 * Useful if you don't want to convert all keys to ISO.
 *
 * Returns negative, zero, or positive (Array.sort compatible).
 */
export function compareDateKeys(a, b, fyStart = 1, fyStartYear = 2026){
  const aIso = parseDateKey(a, fyStart, fyStartYear);
  const bIso = parseDateKey(b, fyStart, fyStartYear);

  if(aIso === null && bIso === null) return 0;
  if(aIso === null) return 1;
  if(bIso === null) return -1;

  return aIso.localeCompare(bIso);
}