// app\api\list-csv\route.js

import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dirPath = path.join(process.cwd(), "data", "NSE-CSV-DELIVERY-DATA");

    if (!fs.existsSync(dirPath)) {
      return Response.json({ files: [] });
    }

    const files = fs
      .readdirSync(dirPath)
      .filter((file) => file.endsWith(".csv"));

    return Response.json({ files });
  } catch (err) {
    return Response.json({ error: "Failed to read CSV folder" }, { status: 500 });
  }
}