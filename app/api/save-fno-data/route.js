// app\api\save-fno-data\route.js

import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const { label, data } = await req.json();

    if (!label || !data) {
      return Response.json({ error: "Missing data" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "data", "fno.json");

    let existing = {};

    if (fs.existsSync(filePath)) {
      existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }

    /* ---------------------------
      🔥 FIX: CONVERT OLD ARRAY FORMAT
    --------------------------- */

    Object.keys(existing).forEach((key) => {
      if (Array.isArray(existing[key])) {
        const obj = {};

        existing[key].forEach((item) => {
          obj[item.Symbol] = item;
        });

        existing[key] = obj;
      }
    });

    /* ---------------------------
      ✅ NOW SAFE TO USE
    --------------------------- */

    // ✅ ADD / UPDATE
    const dayObject = {};

    data.forEach((item) => {
      if (!dayObject[item.Symbol]) {
        dayObject[item.Symbol] = item;
      }
    });

    // 🔥 SORT SYMBOLS
    const sortedSymbols = Object.keys(dayObject).sort();

    const sortedDayObject = {};

    sortedSymbols.forEach((sym) => {
      sortedDayObject[sym] = dayObject[sym];
    });

    // ✅ SAVE SORTED
    existing[label] = sortedDayObject;

    Object.keys(existing).forEach((key) => {
      const obj = existing[key];

      if (!obj || Array.isArray(obj)) return;

      const sortedKeys = Object.keys(obj).sort();
      const sortedObj = {};

      sortedKeys.forEach((k) => {
        sortedObj[k] = obj[k];
      });

      existing[key] = sortedObj;
    });
    /* ---------------------------
       SORT BY DATE (IMPORTANT)
    --------------------------- */

    const monthIndex = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const keys = Object.keys(existing).sort((a, b) => {
      const [ma, da] = a.split("_");
      const [mb, db] = b.split("_");

      const dateA = new Date(2026, monthIndex[ma], Number(da));
      const dateB = new Date(2026, monthIndex[mb], Number(db));

      return dateA - dateB;
    });

    /* ---------------------------
       WRITE MANUALLY (🔥 KEY PART)
    --------------------------- */

    const lines = ["{"];

    keys.forEach((key, i) => {
      const value = existing[key];

      // 🔥 MINIFY EACH DATE
      const val = JSON.stringify(value);

      lines.push(`  "${key}": ${val}${i < keys.length - 1 ? "," : ""}`);
    });

    lines.push("}");

    fs.writeFileSync(filePath, lines.join("\n"));

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Save failed" }, { status: 500 });
  }
}
