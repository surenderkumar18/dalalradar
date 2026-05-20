// app/api/images/route.js

import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

// Natural compare function
function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder");

  if (!folder) {
    return NextResponse.json({ error: "Missing folder name" }, { status: 400 });
  }

  const folderPath = path.join(process.cwd(), "public", folder);

  try {
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    console.log("📂 Reading folder:", folderPath);
    const files = fs.readdirSync(folderPath);
    console.log("📄 Files found:", files);
   
    /*
    const imageFiles = files
      .filter((file) =>
        [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp"].includes(path.extname(file).toLowerCase())
      )
      .sort(naturalCompare);

    */
    const mediaFiles = files.filter((file) =>
    [
      ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".bmp",
      ".mp4", ".webm"
    ].includes(path.extname(file).toLowerCase())
  );  



  const urls = mediaFiles
    .sort(naturalCompare)
    .map((file) => `/${folder}/${file}`);

  return NextResponse.json({ images: urls });
  } catch (err) {
    console.error("Error reading folder:", err);
    return NextResponse.json({ error: "Could not read folder" }, { status: 500 });
  }
}

