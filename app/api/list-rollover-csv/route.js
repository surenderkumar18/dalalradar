import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dirPath = path.join(
      process.cwd(),
      "data/ROLLOVER-CSV"
    );

    // 🔥 if folder missing → return empty
    if (!fs.existsSync(dirPath)) {
      return Response.json({ files: [] });
    }

    const files = fs
      .readdirSync(dirPath)
      .filter(file => file.toLowerCase().endsWith(".csv"));

    return Response.json({ files });

  } catch (err) {
    return Response.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}