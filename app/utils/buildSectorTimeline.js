import delivery from "@/data/delivery.json";
import fno from "@/data/fno.json"; // 🔥 NEW
import { buildHeatmapData } from "./buildHeatmapData";

// helper
function avg(arr, key) {
  if (!arr.length) return 0;
  return arr.reduce((sum, x) => sum + (x[key] || 0), 0) / arr.length;
}

/* ---------------------------
   🔥 FNO HELPER
--------------------------- */

function getFnoForDate(date) {
  if (!fno) return null;

  const d = new Date(date);

  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];

  const key = `${months[d.getMonth()]}_${String(d.getDate()).padStart(2, "0")}`;

  return fno[key] || null;
}

/* ---------------------------
   🔥 MAIN
--------------------------- */

export function buildSectorTimeline(marketRows, timeframe = "1D") {
  // ✅ sort oldest → latest
  const DATE_KEYS = Object.keys(delivery).sort((a, b) => {
    const d1 = new Date(Object.values(delivery[a])[0].DATE1);
    const d2 = new Date(Object.values(delivery[b])[0].DATE1);
    return d1 - d2;
  });

  const timeline = [];

  for (let i = 0; i < DATE_KEYS.length; i++) {
    const key = DATE_KEYS[i];
    const sample = Object.values(delivery[key])[0];

    if (!sample?.DATE1) continue;

    const date = formatToISO(sample.DATE1);

    // 🔥 base rows (cash market)
    const rows = buildHeatmapData(marketRows, timeframe, date);

    // 🔥 FNO MAP FOR THIS DATE
    const fnoMap = getFnoForDate(date);

    /* ---------------------------
       🔥 MERGE FNO DATA (SAFE)
    --------------------------- */

    const enrichedRows = rows.map((r) => {
      function normalizeSymbol(sym) {
        return (sym || "")
          .toUpperCase()
          .replace("-EQ", "")
          .replace(/\s+/g, "")
          .trim();
      }

      const sym = normalizeSymbol(r.symbol || r.SYMBOL);

      let f = fnoMap?.[sym];

      if (!f) {
        console.warn("❌ NO FNO:", sym);
      } else {
        //console.log("✅ FNO FOUND:", sym, f["Lot size"]);
      }

     

      if (!f) return r; // ✅ NO BREAK

      return {
        ...r,

        /**
         *  Symbol: ,
            FUT_PRICE: ,
            "FUT_PRICE CHANGE %":,
            "Lot size": ,
            Lots: ,
            OI: ,
            "OI CHANGE %":,
            TtlTradgVol_contr: ,
            TtlTradgVol_shares: , 
            TtlTrfVal: ,
            "Near Expiry":,
            "OI Analysis": ,
            TtlNbOfTxsExctd: ,
            AvgTradeSize: ,
         */

        // 🔥 FNO DATA (NEW FIELDS)
        
        futPrice: f.FUT_PRICE || 0,
        futPriceChange: f["FUT_PRICE CHANGE %"] || 0,
        lotSize: Number(f?.["Lot size"] || 0),
        lots: Number(f?.Lots || 0),
        openInterest: Number(f?.OI || 0),
        oiChangePct: Number(f?.["OI CHANGE %"] || 0),
        fnoVolume: f.TtlTradgVol_contr || 0,
        shares: f.TtlTradgVol_shares || 0,
        fnoTurnover: f.TtlTrfVal || 0,
        expiry: f["Near Expiry"] || null,
         // 🔥 ADD THESE
        totalTrades: f.TtlNbOfTxsExctd || 0,
        contracts: f.TtlTradgVol_contr || 0,
        avgTradeSize: f.AvgTradeSize || 0,
        oiAnalysis: f["OI Analysis"] || "neutral",
      };
    });

    if (!enrichedRows.length) {
      timeline.push({
        date,
        sectors: [],
        stocks: [],
      });
      continue;
    }

    /* ---------------------------
       🔥 GROUP BY SECTOR
    --------------------------- */

    const sectorMap = {};

    enrichedRows.forEach((r) => {
      const sec = r.sector || "OTHER";

      if (!sectorMap[sec]) {
        sectorMap[sec] = [];
      }

      sectorMap[sec].push(r);
    });

    /* ---------------------------
       🔥 SECTOR METRICS
    --------------------------- */

    const sectors = Object.entries(sectorMap).map(([sec, stocks]) => {
      // 🔥 turnover
      const totalTurnoverCurr = stocks.reduce(
        (s, x) => s + (x.turnover_curr || 0),
        0,
      );

      const totalTurnoverPrev = stocks.reduce(
        (s, x) => s + (x.turnover_prev || 0),
        0,
      );

      let turnoverChange = 0;

      if (totalTurnoverPrev > 0) {
        turnoverChange =
          ((totalTurnoverCurr - totalTurnoverPrev) / totalTurnoverPrev) * 100;
      }

      // 🔥 delivery
      const totalDelivery = stocks.reduce(
        (s, x) => s + (x.deliveryQty || 0),
        0,
      );

      const totalVolume = stocks.reduce((s, x) => s + (x.volume_curr || 0), 0);

      const deliveryPct =
        totalVolume > 0 ? (totalDelivery / totalVolume) * 100 : 0;

      return {
        name: sec,

        turnover: totalTurnoverCurr,
        turnoverChange,
        avgPerf: avg(stocks, "performance"),
        deliveryPct,

        stockCount: stocks.length,
      };
    });

    /* ---------------------------
       🔥 PUSH FINAL
    --------------------------- */

    timeline.push({
      date,
      sectors,
      stocks: enrichedRows, // 🔥 IMPORTANT
    });
  }

  return timeline;
}

/* ---------------------------
   🔧 DATE HELPER
--------------------------- */

function formatToISO(str) {
  const [d, mon, y] = str.split("-");

  const months = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const dt = new Date(y, months[mon], d);

  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");

  return `${dt.getFullYear()}-${mm}-${dd}`;
}
