// app\api\process-oi-csv\route.js

import fs from "fs";
import path from "path";

function parseCSV(content) {
  const lines = content.split("\n").filter(Boolean);

  if (lines.length <= 1) return [];

  const headers = lines[0]
    .replace(/"/g, "")
    .split(",")
    .map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line
      .replace(/"/g, "")
      .split(",")
      .map(v => v.trim());

    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] ?? "";
    });

    return obj;
  });
}

export async function POST(req) {
  const { fileName } = await req.json();

  if (!fileName) {
    return Response.json({ error: "File name required" }, { status: 400 });
  }

  const filePath = path.join(
    process.cwd(),
    "data/OI-CSV-DATA",
    fileName
  );

  if (!fs.existsSync(filePath)) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const parsedData = parseCSV(content);

  const LOW_COUNT_THRESHOLD = 200;

  return Response.json({
    parsedData,
    rowCount: parsedData.length,
    lowCountWarning: parsedData.length < LOW_COUNT_THRESHOLD
  });
}