// app/tools/rollover/utils/loadMarketCaps.js

import LOCAL from "@/data/localMarketCaps.json";
import { normalizeRows } from "./normalize";

export async function loadMarketCaps(mode) {

  if (mode === "LOCAL") {

    console.log("📁 LOAD → LOCAL");

    return {
      source: "LOCAL",
      rows: normalizeRows(LOCAL),
    };

  }

  try {

    console.log("🌐 LOAD → LIVE");

    const res = await fetch("/api/marketcaps", {
      cache: "no-store",
    });

    if (!res.ok) throw new Error("API failed");

    const json = await res.json();

    return {
      source: "LIVE",
      rows: normalizeRows(json.data),
    };

  } catch (err) {

    console.log("⚠️ LIVE failed → fallback LOCAL");

    return {
      source: "LOCAL",
      rows: normalizeRows(LOCAL),
    };

  }

}