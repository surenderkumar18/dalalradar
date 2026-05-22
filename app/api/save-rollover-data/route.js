// app/api/save-rollover-data/route.js

import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const { data } = await req.json();

    if (!data || Object.keys(data).length === 0) {
      return Response.json({ error: "No data provided" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "data/rolloverData.json");

    /* ----------------------------------------
       🔥 REPLACE FULL FILE (NO MERGE)
    ---------------------------------------- */
    fs.writeFileSync(filePath, JSON.stringify(data));

    return Response.json({
      success: true,
      message: "Rollover data replaced successfully",
    });
  } catch (err) {
    return Response.json({ error: "Save failed" }, { status: 500 });
  }
}
