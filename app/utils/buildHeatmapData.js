// app\tools\rollover\utils\buildHeatmapData.js

import delivery from "@/data/delivery.json";
import { TIMEFRAMES } from "../constants/timeframes";

// ✅ Sort dates (latest first)
const DATE_KEYS = Object.keys(delivery).sort((a, b) => {
  const d1 = new Date(Object.values(delivery[a])[0].DATE1);
  const d2 = new Date(Object.values(delivery[b])[0].DATE1);
  return d2 - d1;
});

// ✅ Map timeframe → days
const timeframeMap = Object.fromEntries(
  TIMEFRAMES.map(t => [t.key, t.days])
);

// ✅ Convert YYYY-MM-DD → mar_16
function formatToDataKey(dateStr) {
  if (!dateStr) return null;

  const d = new Date(dateStr);

  const months = [
    "jan","feb","mar","apr","may","jun",
    "jul","aug","sep","oct","nov","dec"
  ];

  return `${months[d.getMonth()]}_${d.getDate()}`;
}

// ✅ Volume (window-based with startIndex)
function calcVolume(symbol, days, startIndex) {
  let sum = 0;

  for (let i = startIndex; i < startIndex + days; i++) {
    const key = DATE_KEYS[i];
    if (!key) break;

    const row = delivery[key]?.[symbol];
    if (!row) continue;

    sum += row.TTL_TRD_QNTY || 0;
  }

  return sum;
}

// ✅ Turnover
function calcTurnover(symbol, days, startIndex) {
  let sum = 0;

  for (let i = startIndex; i < startIndex + days; i++) {
    const key = DATE_KEYS[i];
    if (!key) break;

    const row = delivery[key]?.[symbol];
    if (!row) continue;

    sum += row.TURNOVER_LACS || 0;
  }

  return sum;
}

// ✅ Generic window
function calcWindow(symbol, start, end, field) {
  let sum = 0;

  for (let i = start; i < end; i++) {
    const key = DATE_KEYS[i];
    if (!key) break;

    const row = delivery[key]?.[symbol];
    if (!row) continue;

    sum += row[field] || 0;
  }

  return sum;
}

// 🚀 MAIN FUNCTION
export function buildHeatmapData(
  marketRows,
  timeframe = "1D",
  selectedDate = null
) {

  if (!DATE_KEYS.length) return [];

  const days = timeframeMap[timeframe] || 1;

  // 🔥 STEP 1: find startIndex

  let startIndex = 0;

  if (selectedDate) {
    const key = formatToDataKey(selectedDate);
    const foundIndex = DATE_KEYS.indexOf(key);


    if (foundIndex === 0) {
      startIndex = 0;
    }
    else if (foundIndex > 0) {
      startIndex = foundIndex;
    }
  }

  // 🔥 STEP 2: window positions
  const latestKey = DATE_KEYS[startIndex];
  const offset = Math.min(startIndex + days, DATE_KEYS.length - 1);
  const pastKey = DATE_KEYS[offset];

  const latestRows = delivery[latestKey];
  const pastRows = delivery[pastKey];

  if (!latestRows || !pastRows) return [];

  // ✅ Market cap map
  const mcapMap = {};
  marketRows.forEach(r => {
    mcapMap[r.symbol] = r;
  });

  const rows = [];

  Object.values(latestRows).forEach(stock => {

    const info = mcapMap[stock.SYMBOL];
    if (!info) return;

    const prevPrice = delivery[pastKey]?.[stock.SYMBOL]?.CLOSE_PRICE;
    if (!prevPrice) return;

    // ✅ PERFORMANCE
    const performance =
      ((stock.CLOSE_PRICE - prevPrice) / prevPrice) * 100;

    // ✅ CURRENT WINDOW
    const currVolume = calcVolume(stock.SYMBOL, days, startIndex);
    const currTurnover = calcTurnover(stock.SYMBOL, days, startIndex);

    // ✅ PREVIOUS WINDOW
    const prevVolume = calcWindow(
      stock.SYMBOL,
      startIndex + days,
      startIndex + days * 2,
      "TTL_TRD_QNTY"
    );

    const prevTurnover = calcWindow(
      stock.SYMBOL,
      startIndex + days,
      startIndex + days * 2,
      "TURNOVER_LACS"
    );

    // ✅ TURNOVER CHANGE
    let turnoverChange = 0;

    if (prevTurnover && prevTurnover > 0) {
      turnoverChange =
        ((currTurnover - prevTurnover) / prevTurnover) * 100;
    }

    rows.push({
      symbol: stock.SYMBOL,
      sector: info.sector,
      name: info.name,

      marketCap: info.mcap || info.marketCap,

      volume: currVolume,
      turnover: currTurnover,

      volume_curr: currVolume,
      volume_prev: prevVolume,

      turnover_curr: currTurnover,
      turnover_prev: prevTurnover,

      performance,
      turnoverChange,

      open: stock.OPEN_PRICE,
      close: stock.CLOSE_PRICE,
      prevClose: prevPrice,

      deliveryQty: stock.DELIV_QTY || 0,
      deliveryPct: stock.DELIV_PER || 0,
    });

  });

  return rows;
}