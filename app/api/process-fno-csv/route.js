import fs from "fs";
import path from "path";

/* ---------------------------
   HELPERS
--------------------------- */

function parseCSV(content) {
  const lines = content.split("\n").filter(Boolean);

  const headers = lines[0]
    .replace(/"/g, "")
    .split(/,|\t/)
    .map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = line
      .replace(/"/g, "")
      .split(/,|\t/)
      .map((v) => v.trim());

    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] ?? "";
    });

    return obj;
  });
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === "0") return null;

  try {
    // ✅ CASE 1: YYYY-MM-DD (NEW NSE FORMAT)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    }

    // ✅ CASE 2: DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [dd, mm, yyyy] = dateStr.split("-");
      const date = new Date(`${yyyy}-${mm}-${dd}`);
      return isNaN(date.getTime()) ? null : date;
    }

    // ✅ CASE 3: 30-MAR-2026 (OLD FORMAT)
    const match = dateStr.match(/(\d{2}-[A-Z]{3}-\d{4})/);
    if (match) {
      const date = new Date(match[1]);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  } catch {
    return null;
  }
}

function getFlow(priceChange, oiChange) {
  if (oiChange === null) return "neutral";

  if (priceChange > 0 && oiChange > 0) return "longBuildup";
  if (priceChange < 0 && oiChange > 0) return "shortBuildup";
  if (priceChange > 0 && oiChange < 0) return "shortCovering";
  if (priceChange < 0 && oiChange < 0) return "longUnwinding";

  return "neutral";
}

function safeExtractSymbol(contract) {
  if (!contract) return null;

  const cleaned = contract.replace("FUTSTK", "");

  for (let i = 0; i < cleaned.length; i++) {
    if (/[A-Z]/.test(cleaned[i])) {
      return cleaned.slice(i).match(/[A-Z]+/)?.[0] || null;
    }
  }

  return null;
}

/* ---------------------------
   MAIN API
--------------------------- */

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const fileName = body?.fileName;
    console.log("📥 API HIT: process-fno-csv");
    console.log("📄 fileName:", fileName);

    if (!fileName) {
      return Response.json({ error: "fileName missing" }, { status: 400 });
    }

    const csvPath = path.join(process.cwd(), "data/FNO-CSV-DATA", fileName);

    if (!fs.existsSync(csvPath)) {
      return Response.json({ error: "CSV not found" }, { status: 404 });
    }

    const content = fs.readFileSync(csvPath, "utf-8");
    const rows = parseCSV(content);
    console.log("🧪 Sample row:", rows[0]);
    if (!rows.length) {
      return Response.json({ error: "CSV empty" });
    }

    const isNewFormat = rows[0]?.TckrSymb !== undefined;

    /* ---------------- GROUP ---------------- */

    const symbolMap = {};
    
      console.log("📦 Symbols found:", Object.keys(symbolMap).length);

    rows.forEach((row) => {
      let symbol, expiry;

      if (isNewFormat) {
        if (row.Sgmt !== "FO" || row.FinInstrmTp !== "STF") return;

        symbol = row.TckrSymb;
        expiry = parseDate(row.XpryDt);
      } else {
        if (!row.CONTRACT_D?.startsWith("FUTSTK")) return;

        try {
          symbol = safeExtractSymbol(row.CONTRACT_D);
          if (!symbol) return;
        } catch {
          return;
        }

        expiry = parseDate(row.CONTRACT_D);
      }

      if (!symbol) {
        console.log("❌ Missing symbol:", row);
        return;
      }

      if (!expiry) {
        console.log("❌ Invalid expiry:", row.XpryDt, row);
        return;
      }

      if (!symbolMap[symbol]) {
        symbolMap[symbol] = [];
      }

      symbolMap[symbol].push({ row, expiry });

      
    });

    /* ---------------- PROCESS ---------------- */

    const result = [];

    Object.keys(symbolMap).forEach((symbol) => {
      const contracts = symbolMap[symbol];

      contracts.sort((a, b) => a.expiry - b.expiry);

      let totalOI = 0;
      let totalDelta = 0;
      let totalTurnover = 0;
      let totalVolume = 0;
      let totalVolumeShares = 0;

      let lotSize = 0;
      let nearExpiry = null;
      let totalTrades = 0;

      contracts.forEach(({ row, expiry }, index) => {
        let price, prev, oiShares, tradedVal, oiDelta, volume, ls;

        if (isNewFormat) {
          price = Number(row.ClsPric || 0);
          prev = Number(row.PrvsClsgPric || 0);

          oiShares = Number(row.OpnIntrst || 0);
          oiDelta = Number(row.ChngInOpnIntrst || 0);

          tradedVal = Number(row.TtlTrfVal || 0);
          volume = Number(row.TtlTradgVol || 0);

          ls = Number(row.NewBrdLotQty || 0);
        } else {
          price = Number(row.CLOSE_PRIC || 0);
          prev = Number(row.PREVIOUS_S || 0);

          const oiLots = Number(row.OI_NO_CON || 0);
          const tradedQty = Number(row.TRADED_QUA || 0);
          const tradedContracts = Number(row.TRD_NO_CON || 0);

          ls =
            tradedContracts > 0
              ? Math.round(tradedQty / tradedContracts)
              : 0;

          oiShares = oiLots * ls;
          tradedVal = Number(row.TRADED_VAL || tradedQty * price);
          volume = tradedQty;

          oiDelta = 0;
        }

        totalOI += oiShares;
        totalDelta += oiDelta;
        totalTurnover += tradedVal;
        totalVolume += volume;

        // ✅ FIXED: correct volume shares
        totalVolumeShares += volume * ls;

        // ✅ FIXED: safe lot size
        if (ls > 0) {
          lotSize = ls;
        }

        if (index === 0) {
          nearExpiry = expiry;
        }
        const trades = Number(row.TtlNbOfTxsExctd || 0);
        totalTrades += trades;
      });

      /* ---------------- WEIGHTED PRICE ---------------- */

      let totalWeightedPrice = 0;
      let totalWeightedPrev = 0;
      let totalWeight = 0;

      contracts.forEach(({ row }) => {
        let price, prev, oiShares;

        if (isNewFormat) {
          price = Number(row.ClsPric || 0);
          prev = Number(row.PrvsClsgPric || 0);
          oiShares = Number(row.OpnIntrst || 0);
        } else {
          price = Number(row.CLOSE_PRIC || 0);
          prev = Number(row.PREVIOUS_S || 0);

          const oiLots = Number(row.OI_NO_CON || 0);
          const tradedQty = Number(row.TRADED_QUA || 0);
          const tradedContracts = Number(row.TRD_NO_CON || 0);

          const ls =
            tradedContracts > 0
              ? Math.round(tradedQty / tradedContracts)
              : 0;

          oiShares = oiLots * ls;
        }

        if (price > 0 && prev > 0 && oiShares > 0) {
          totalWeightedPrice += price * oiShares;
          totalWeightedPrev += prev * oiShares;
          totalWeight += oiShares;
        }
      });

      const avgPrice =
        totalWeight > 0 ? totalWeightedPrice / totalWeight : 0;

      const avgPrev =
        totalWeight > 0 ? totalWeightedPrev / totalWeight : 0;

      const priceChange =
        avgPrev > 0 ? ((avgPrice - avgPrev) / avgPrev) * 100 : 0;

      /* ---------------- OI CHANGE ---------------- */

      let oiChange = null;

      if (totalOI > 0) {
        const prevOI = totalOI - totalDelta;

        if (prevOI > 0) {
          oiChange = (totalDelta / prevOI) * 100;
        }
      }
      // 🔥 NEW: Avg Trade Size
      const avgTradeSize =
        totalTrades > 0 ? totalVolume / totalTrades : 0;

      const lots =
        lotSize > 0 ? Math.round(totalOI / lotSize) : 0;

      const flow = getFlow(priceChange, oiChange);

      /* ---------------- OUTPUT ---------------- */

      /** KEEP this comment when ever you generate new code
       * 
       * 3️⃣ TtlTradgVol (Total Volume)

          👉 Number of contracts traded today

          Volume = Intraday activity

       * 4️⃣ TtlTrfVal (Total Traded Value)

        👉 Total money traded (₹ value)

        TtlTrfVal = Total ₹ value of all trades
        Turnover = Volume × Price × Lot size
        Example:
        69,344,830 → ~6.9 Cr traded
        2,344,006,255 → ~234 Cr traded (🔥 strong money flow)
      */

      /** SAMPLE OBJECT
       {
        "Symbol": "ABCAPITAL",
        "FUT_PRICE": 306.65,
        "FUT_PRICE CHANGE %": -2.9,
        "Lot size": 3100,
        "Lots": 14426,
        "OI": 44971700,
        "OI CHANGE %": -2.03,
        "Volume": 12000,        // TtlTradgVol 👉 Number of contracts traded today
        "Turnover": 7014991085, // TtlTrfVal
        "Near Expiry": "2026-04-28",
        "OI Analysis": "longUnwinding",
        TtlNbOfTxsExctd: totalTrades,
        TtlTradgVol_contr: totalVolume,
        TtlTradgVol_shares: totalVolumeShares, 
        TtlTrfVal: totalTurnover,
        TtlNbOfTxsExctd: totalTrades,
        AvgTradeSize: Number(avgTradeSize.toFixed(2)),
      }
       */

      result.push({
        Symbol: symbol,

        FUT_PRICE: Number(avgPrice.toFixed(2)),
        "FUT_PRICE CHANGE %": Number(priceChange.toFixed(2)),

        "Lot size": lotSize,
        Lots: lots,

        OI: totalOI,

        "OI CHANGE %":
          oiChange !== null
            ? Number(oiChange.toFixed(2))
            : null,

        TtlTradgVol_contr: totalVolume,
        TtlTradgVol_shares: totalVolumeShares, // ✅ FIXED
        TtlTrfVal: totalTurnover,

        "Near Expiry":
          nearExpiry && !isNaN(nearExpiry.getTime())
            ? nearExpiry.toISOString().split("T")[0]
            : null,

        "OI Analysis": flow,
        TtlNbOfTxsExctd: totalTrades,
        AvgTradeSize: Number(avgTradeSize.toFixed(2)),
      });
    });

    return Response.json({
      data: result,
      count: result.length,
    });

  } catch (err) {
    console.error("API ERROR:", err);

    return Response.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}