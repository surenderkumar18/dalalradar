// app\api\process-csv\route.js

import fs from "fs";
import path from "path";
import { FNO_STOCKS } from "@/data/fnoStocks";

function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};

    headers.forEach((header, i) => {
      const raw = values[i]?.trim();

      if (
        ["PREV_CLOSE","OPEN_PRICE","HIGH_PRICE","LOW_PRICE","LAST_PRICE",
         "CLOSE_PRICE","AVG_PRICE","TTL_TRD_QNTY","TURNOVER_LACS",
         "NO_OF_TRADES","DELIV_QTY","DELIV_PER"].includes(header)
      ) {
        obj[header] = raw ? Number(raw) : 0;
      } else {
        obj[header] = raw;
      }
    });

    return obj;
  });
}

function generateLabel(fileName) {
  const match = fileName.match(/_(\d{2})(\d{2})(\d{4})\.csv$/);
  if (!match) return null;

  const [, dd, mm] = match;

  const months = [
    "jan","feb","mar","apr","may","jun",
    "jul","aug","sep","oct","nov","dec"
  ];

  return `${months[Number(mm)-1]}_${Number(dd)}`;
}

export async function POST(req) {
  try {
    const { fileName } = await req.json();

    const filePath = path.join(
      process.cwd(),
      "data",
      "NSE-CSV-DELIVERY-DATA",
      fileName
    );

    if (!fs.existsSync(filePath)) {
      return Response.json({ error: "File not found" }, { status: 400 });
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseCSV(content);

    const fnoSet = new Set(FNO_STOCKS);
    const mapped = {};

    parsed.forEach(item => {
      if (
        item?.SERIES === "EQ" &&
        item?.SYMBOL &&
        fnoSet.has(item.SYMBOL)
      ) {
        mapped[item.SYMBOL] = item;
      }
    });

    const mappedCount = Object.keys(mapped).length;

    const label = generateLabel(fileName);

    const deliveryPath = path.join(process.cwd(), "data", "delivery.json");
    let alreadyExists = false;

    if (fs.existsSync(deliveryPath)) {
      const existing = JSON.parse(fs.readFileSync(deliveryPath, "utf-8"));
      alreadyExists = !!existing[label];
    }

    const threshold = Math.floor(FNO_STOCKS.length * 0.7);
    const lowCountWarning = mappedCount < threshold;

    return Response.json({
      mappedData: mapped,
      suggestedLabel: label,
      mappedCount,
      alreadyExists,
      lowCountWarning
    });

  } catch (err) {
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}