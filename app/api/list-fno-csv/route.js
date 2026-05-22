// app\api\list-fno-csv\route.js

import fs from "fs";
import path from "path";

export async function GET() {
  const dirPath = path.join(process.cwd(), "data/FNO-CSV-DATA");

  if (!fs.existsSync(dirPath)) {
    return Response.json({ files: [] });
  }

  const files = fs
    .readdirSync(dirPath)
    .filter(file => file.toLowerCase().endsWith(".csv"));

  return Response.json({ files });
}