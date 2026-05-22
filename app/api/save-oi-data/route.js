// app/api/save-oi-data/route.js

import fs from "fs";
import path from "path";

export async function POST(req) {
  const { label, data } = await req.json();

  if (!label || !data) {
    return Response.json(
      { error: "Label and data required" },
      { status: 400 }
    );
  }

  const basePath = path.join(process.cwd(), "data");

  const sectorFilePath = path.join(
    basePath,
    "OIinterpretationSectorRotation.json"
  );

  const rawFilePath = path.join(
    basePath,
    "OIinterpretation.json"
  );

  // ---------- 1️⃣ Update Sector Rotation File ----------
  let existing = {};

  if (fs.existsSync(sectorFilePath)) {
    const fileContent = fs.readFileSync(sectorFilePath, "utf-8");
    existing = fileContent ? JSON.parse(fileContent) : {};
  }

  const alreadyExists = !!existing[label];

  existing[label] = data;

  // Custom formatted (dates on new line, arrays minified)
  const formatted =
    "{\n" +
    Object.entries(existing)
      .map(([key, value]) => {
        return `  "${key}": ${JSON.stringify(value)}`;
      })
      .join(",\n") +
    "\n}\n";

  fs.writeFileSync(sectorFilePath, formatted);

  // ---------- 2️⃣ Update Raw OI File ----------
  // This file stores ONLY latest day array (fully minified)

  fs.writeFileSync(
    rawFilePath,
    JSON.stringify(data, null, 2) + "\n"
  );

  return Response.json({
    success: true,
    alreadyExists
  });
}