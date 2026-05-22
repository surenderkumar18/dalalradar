// app\api\list-oi-csv\route.js

import fs from "fs";
import path from "path";

export async function GET() {
  const dirPath = path.join(process.cwd(), "data/OI-CSV-DATA");

  if (!fs.existsSync(dirPath)) {
    return Response.json({ files: [] });
  }

  const files = fs
    .readdirSync(dirPath)
    .filter(file => file.toLowerCase().endsWith(".csv"));

  return Response.json({ files });
}