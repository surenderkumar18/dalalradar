
import { parseDateKey } from "./dateUtils";
/**
 * Build sector flow map from delivery data + sector lookup.
 *
 * Converts source date keys like "jan_27" to ISO format "2026-01-27" so that
 * default lexicographic sorting works correctly everywhere downstream.
 *
 * @param {Object} deliveryData  { dateKey: { symbol: { SYMBOL, TURNOVER_LACS, ... } } }
 * @param {Array}  marketRows    [{ symbol, sector }, ...]
 * @param {Object} opts          { fyStart, fyStartYear } — see dateUtils.parseDateKey
 *
 * @returns sectorMap: { sector: { "2026-01-27": turnover, ... } }
 */
export function buildSectorFlow(deliveryData, marketRows, opts = {}){

  const { fyStart = 1, fyStartYear = 2026 } = opts;

  const sectorMap = {};
  const unmapped = new Set();
  const unparsedDates = new Set();

  const sectorLookup = {};
  marketRows.forEach(s => {
    sectorLookup[s.symbol] = s.sector;
  });

  Object.entries(deliveryData).forEach(([rawDate, stocks]) => {

    // Convert "jan_27" → "2026-01-27" for correct chronological sorting
    const isoDate = parseDateKey(rawDate, fyStart, fyStartYear);

    if(!isoDate){
      unparsedDates.add(rawDate);
      return; // skip dates we can't parse rather than silently corrupt
    }

    Object.values(stocks).forEach(stock => {

      const sector = sectorLookup[stock.SYMBOL] || "UNKNOWN";

      if(sector === "UNKNOWN"){
        unmapped.add(stock.SYMBOL);
      }

      if(!sectorMap[sector])
        sectorMap[sector] = {};

      if(!sectorMap[sector][isoDate])
        sectorMap[sector][isoDate] = 0;

      sectorMap[sector][isoDate] += stock.TURNOVER_LACS;

    });

  });

  if(unmapped.size > 0){
    console.warn(
      `[buildSectorFlow] ${unmapped.size} symbols without sector mapping:`,
      [...unmapped].slice(0, 20),
      unmapped.size > 20 ? `... and ${unmapped.size - 20} more` : ""
    );
  }

  if(unparsedDates.size > 0){
    console.warn(
      `[buildSectorFlow] ${unparsedDates.size} date keys could not be parsed:`,
      [...unparsedDates].slice(0, 10)
    );
  }

  // Ensure every sector has every date (union of all dates), filling gaps with 0
  const allDates = [...new Set(
    Object.values(sectorMap).flatMap(s => Object.keys(s))
  )].sort(); // ISO strings sort correctly with default compare

  Object.keys(sectorMap).forEach(sec => {
    allDates.forEach(d => {
      if(sectorMap[sec][d] === undefined){
        sectorMap[sec][d] = 0;
      }
    });
  });

  return sectorMap;

}