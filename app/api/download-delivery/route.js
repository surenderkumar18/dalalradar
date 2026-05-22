// app/api/download-delivery/route.js

import fs from "fs";
import path from "path";
import https from "https";

/* --------------------------------------------------
   🔥 HELPER: DOWNLOAD WITH REDIRECT SUPPORT
-------------------------------------------------- */
function downloadFile(url, savePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(savePath);

    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
        "Referer": "https://www.nseindia.com/",
      },
    };

    https.get(url, options, (res) => {

      // 🔥 HANDLE REDIRECT (301 / 302)
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;

        if (!redirectUrl) {
          reject("Redirect failed: no location header");
          return;
        }

        console.log("↪ Redirecting to:", redirectUrl);

        // 🔁 Recursive call
        downloadFile(redirectUrl, savePath)
          .then(resolve)
          .catch(reject);

        return;
      }

      // ❌ REAL ERROR
      if (res.statusCode >= 400) {
        reject(`Download failed: ${res.statusCode}`);
        return;
      }

      // ✅ PIPE FILE
      res.pipe(file);

      file.on("finish", () => {
        file.close(() => resolve());
      });

      file.on("error", (err) => {
        fs.unlink(savePath, () => {});
        reject(err);
      });

    }).on("error", (err) => {
      fs.unlink(savePath, () => {});
      reject(err);
    });
  });
}

/* --------------------------------------------------
   🚀 MAIN API
-------------------------------------------------- */
export async function POST(req) {
  try {
    const { date } = await req.json(); // format: 20260402

    if (!date) {
      return Response.json({ error: "Date required" }, { status: 400 });
    }

    // Convert YYYYMMDD → DDMMYYYY
    const yyyy = date.slice(0, 4);
    const mm = date.slice(4, 6);
    const dd = date.slice(6, 8);

    const formattedDate = `${dd}${mm}${yyyy}`;

    const fileName = `sec_bhavdata_full_${formattedDate}.csv`;

    const url = `https://nsearchives.nseindia.com/products/content/${fileName}`;

    const savePath = path.join(
      process.cwd(),
      "data/NSE-CSV-DELIVERY-DATA",
      fileName
    );

    /* --------------------------------------------------
       CREATE FOLDER IF NOT EXISTS
    -------------------------------------------------- */
    const folder = path.dirname(savePath);
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    /* --------------------------------------------------
       SKIP IF FILE EXISTS
    -------------------------------------------------- */
    if (fs.existsSync(savePath)) {
      return Response.json({
        success: true,
        cached: true,
        fileName,
        message: "File already exists",
      });
    }

    /* --------------------------------------------------
       DOWNLOAD FILE (FIXED)
    -------------------------------------------------- */
    await downloadFile(url, savePath);

    /* --------------------------------------------------
       SUCCESS RESPONSE
    -------------------------------------------------- */
    return Response.json({
      success: true,
      fileName,
      message: "Delivery CSV downloaded successfully",
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