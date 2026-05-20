// app/api/marketcaps/route.js

export async function GET() {
  const url =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSzCf4EsI9cpZoGuO3SicmApaE8j-ybvM52BZnCb1i5FLf7Ej08DvQTbrpHFtsBsOUShYw72B6wB765/pub?gid=1836273232&single=true&output=csv";

  try {
    const res = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error("Google sheet fetch failed");

    const text = await res.text();

    const rows = text
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .slice(1); // remove header

    const data = rows
      .map((r) => {
        // safer split (only first 3 commas matter)
        const parts = r.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);

        const symbol = parts[0]?.trim();
        if (!symbol) return null;

        return {
          symbol: symbol.toUpperCase(),
          mcap: Number(parts[1]) || 0,
          sector: (parts[2] || "OTHER").trim().toUpperCase(),
          name: parts[3]?.replace(/"/g, "").trim() || symbol,
        };
      })
      .filter(Boolean);

    console.log("📊 Google sheet rows:", data.length);

    return Response.json({
      source: "google",
      data,
    });
  } catch (err) {
    console.log("⚠️ Google sheet failed → using LOCAL fallback");

    const local = await import("@/data/localMarketCaps.json");

    return Response.json({
      source: "local",
      data: local.default || [],
    });
  }
}
