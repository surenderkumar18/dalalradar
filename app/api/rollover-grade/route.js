// app/api/rollover-grade/route.js

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import rolloverData from "@/data/rolloverData.json";

const FILE_PATH = path.join(process.cwd(), "data/rolloverGrades.json");

function readFile() {
  if (!fs.existsSync(FILE_PATH)) return {};
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf8"));
}

function writeFile(data) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

export async function POST(req) {
  const body = await req.json();

  /* ================= CLEAN ================= */
  if (body.action === "clean") {
    const existing = readFile();
    const valid = new Set(Object.keys(rolloverData));

    const cleaned = {};
    let removed = [];

    for (const [sym, val] of Object.entries(existing)) {
      if (valid.has(sym)) cleaned[sym] = val;
      else removed.push(sym);
    }

    writeFile(cleaned);

    return NextResponse.json({
      success: true,
      removed,
      removedCount: removed.length,
    });
  }

  /* ================= SAVE ================= */
  const { symbol, grade, buildup } = body;

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol required" },
      { status: 400 }
    );
  }

  const existing = readFile();

  existing[symbol] = existing[symbol] || {};

  if (grade !== undefined) existing[symbol].grade = grade;
  if (buildup !== undefined) existing[symbol].buildup = buildup;

  writeFile(existing);

  return NextResponse.json({ success: true });
}
