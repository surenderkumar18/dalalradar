// app/api/download-fno/route.js

import fs from "fs";
import path from "path";
import https from "https";
import AdmZip from "adm-zip";

export async function POST(req) {
  try {
    const { date } = await req.json(); // format: 20260323

    if (!date) {
      return Response.json({ error: "Date required" }, { status: 400 });
    }

    const fileName = `BhavCopy_NSE_FO_0_0_0_${date}_F_0000.csv`;

    // https://archives.nseindia.com/content/fo/BhavCopy_NSE_FO_0_0_0_20260427_F_0000.csv.zip

    const url = `https://archives.nseindia.com/content/fo/${fileName}.zip`;
    console.log("🌐 URL:", url);
    console.log("📁 Expected CSV:", fileName);

    const zipPath = path.join(process.cwd(), "data", `fno_${date}.zip`);
    const extractPath = path.join(process.cwd(), "data/FNO-CSV-DATA");
    const csvPath = path.join(extractPath, fileName);

    /* --------------------------------------------------
       ✅ 1. CREATE FOLDER IF NOT EXISTS
    -------------------------------------------------- */
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }

    /* --------------------------------------------------
       ✅ 2. SKIP DOWNLOAD IF FILE ALREADY EXISTS
    -------------------------------------------------- */
    if (fs.existsSync(csvPath)) {
      return Response.json({
        success: true,
        message: "File already exists (cached)",
        fileName,
      });
    }

    /* --------------------------------------------------
       ✅ 3. DOWNLOAD ZIP (WITH HEADERS - NSE SAFE)
    -------------------------------------------------- */
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(zipPath);

      const options = {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "*/*",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
        },
      };

      https
        .get(url, options, (res) => {
          if (res.statusCode !== 200) {
            reject(`Download failed: ${res.statusCode}`);
            return;
          }

          res.pipe(file);

          file.on("finish", () => {
            file.close(resolve);
          });
        })
        .on("error", (err) => {
          fs.unlink(zipPath, () => {}); // cleanup partial file
          reject(err);
        });
    });

    /* --------------------------------------------------
       ✅ 4. UNZIP SAFELY
    -------------------------------------------------- */
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);
    } catch (e) {
      return Response.json(
        { error: "Unzip failed: " + e.message },
        { status: 500 }
      );
    }

    /* --------------------------------------------------
       ✅ 5. VERIFY CSV EXISTS
    -------------------------------------------------- */
    if (!fs.existsSync(csvPath)) {
      return Response.json(
        { error: "CSV not found after extraction" },
        { status: 500 }
      );
    }

    /* --------------------------------------------------
       ✅ 6. CLEANUP ZIP
    -------------------------------------------------- */
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    /* --------------------------------------------------
       ✅ SUCCESS RESPONSE
    -------------------------------------------------- */
    return Response.json({
      success: true,
      fileName,
      message: "Downloaded & extracted successfully",
    });

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);

    return Response.json(
      {
        error: "Download failed",
        message: err.message,
      },
      { status: 500 }
    );
  }
}