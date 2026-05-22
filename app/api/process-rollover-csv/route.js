// app/api/process-rollover-csv/route.js

import fs from "fs";
import path from "path";

/* -----------------------------
   CSV PARSER (STRICT INDEX BASED)
----------------------------- */
function parseCSV(content) {
  const lines = content.split("\n").filter(Boolean);

  // 🔥 Find real header row
  const headerIndex = lines.findIndex((line) => /Symbol\s*\(\d+\)/.test(line));

  if (headerIndex === -1) {
    throw new Error("Header row not found in CSV");
  }

  const headerLine = lines[headerIndex]
    .replace(/"/g, "")
    .split(",")
    .map((h) => h.trim());

  const dataLines = lines.slice(headerIndex + 1);

  // 🔥 Identify boundary index (MoM OI column)
  const momOIIndex = headerLine.findIndex((h) => /MoM.*OI/i.test(h));

  const validIndexes = headerLine
  .map((h, i) => (h ? i : null))
  .filter(i => i !== null);

  return dataLines.map((line) => {
    const values = line
      .replace(/"/g, "")
      .split(",")
      .map((v) => v.trim());

    const obj = {};

    validIndexes.forEach((idx) => {
  const header = headerLine[idx];
      if (!header || header === "") return;

      let key = header.replace(/"/g, "").trim();

      // 🔥 Convert "Jun 25" → "Jun_25"
      const monthMatch = key.match(/^([A-Za-z]{3})\s+(\d{2})$/);

      if (monthMatch) {
        const [, mon, yr] = monthMatch;
        key = `${mon}_${yr}`;
      } else {
        key = key.replace(/ +/g, "_");
      }

      if (key === "MoM_OI_Chg_%") key = "MoM_OI_Change_%";
      if (key === "MoM_Price_Chg%") key = "MoM_Price_Change_%";

      const raw = values[idx];

      let value;
      if (raw === "-" || raw === "" || raw === "Infinity") {
        value = null;
      } else if (!isNaN(raw)) {
        value = Number(raw);
      } else {
        value = raw;
      }

      // 🚨 CRITICAL: ONLY take months BEFORE MoM OI
      const isMonth = /^[A-Za-z]{3}_\d{2}$/.test(key);

      // 🔥 If AFTER MoM OI → it's PRICE
      if (isMonth && idx > momOIIndex) {
        key = key + "_Price";
      }

      // 🚨 prevent overwrite (keep first occurrence as OI)
      if (obj.hasOwnProperty(key)) return;

      // 🚨 prevent overwrite
      if (isMonth && obj[key] != null) {
        return;
      }

      obj[key] = value;
    });

    return obj;
  });
}

/* -----------------------------
   TRANSFORM → FINAL STRUCTURE
----------------------------- */
function transformData(rows) {
  const result = {};

  rows.forEach((row) => {
    const symbolKey = Object.keys(row).find((k) =>
  k.toLowerCase().includes("symbol")
);

    const symbol = row[symbolKey];
    if (!symbol) return;

    const obj = {};

    Object.entries(row).forEach(([key, value]) => {
      if (key.includes("Symbol")) return;

      // normalize key
      let newKey = key.replace(/ +/g, "_");

      obj[newKey] = value;
    });

    result[symbol] = obj;
  });

  return result;
}

/* -----------------------------
   MAIN API
----------------------------- */
export async function POST(req) {
  try {
    const { fileName } = await req.json();

    const filePath = path.join(process.cwd(), "data/ROLLOVER-CSV", fileName);

    if (!fs.existsSync(filePath)) {
      return Response.json({ error: "File not found" }, { status: 400 });
    }

    const content = fs.readFileSync(filePath, "utf-8");

    const parsed = parseCSV(content);
    const transformed = transformData(parsed);

    return Response.json({
      data: transformed,
      rowCount: Object.keys(transformed).length,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
