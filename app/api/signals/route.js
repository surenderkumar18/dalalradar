// app/api/signals/route.js
//
// 🔒 PROTECTED API ROUTE — Signal engine runs server-side only.
// Client sends bubble history, server returns signal annotations.
// The secret detection logic NEVER ships to the browser.

import "server-only";
import {
  detectBubbleSignal,
  applySignalValidation,
} from "@/lib/smart-money/bubbleSignalEngine.js";

export async function POST(req) {
  try {
    const body = await req.json();
    const { bubblesByKey } = body;

    if (!bubblesByKey || typeof bubblesByKey !== "object") {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Compute signals for each key (stock or sector)
    const signals = {};

    for (const [key, history] of Object.entries(bubblesByKey)) {
      if (!Array.isArray(history) || history.length === 0) continue;

      // Detect signal on the latest bubble using full history
      const lastSignal = detectBubbleSignal(history);

      // Build signal map: index → signal (only mark bubbles with signals)
      signals[key] = history.map((_, i) => {
        // Recompute signal at each historical point
        const historyUpToI = history.slice(0, i + 1);
        return detectBubbleSignal(historyUpToI);
      });
    }

    // Apply forward-looking validation
    const bubblesByKeyForValidation = {};
    for (const key of Object.keys(bubblesByKey)) {
      bubblesByKeyForValidation[key] = bubblesByKey[key].map((b, i) => ({
        ...b,
        bubbleSignal: signals[key][i],
      }));
    }
    applySignalValidation(bubblesByKeyForValidation);

    // Return only what client needs: signals + validation
    const result = {};
    for (const key of Object.keys(bubblesByKeyForValidation)) {
      result[key] = bubblesByKeyForValidation[key].map((b) => ({
        bubbleSignal: b.bubbleSignal,
        signalValidation: b.signalValidation,
      }));
    }

    return Response.json({ signals: result });
  } catch (err) {
    console.error("Signal API error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}