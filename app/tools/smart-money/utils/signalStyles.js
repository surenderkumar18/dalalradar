// Client-safe: just maps signal types to colors/icons
// The actual SIGNAL DETECTION stays on the backend.

export function resolveSignalStyle(payload) {
  const sig = payload.bubbleSignal;
  if (!sig) return null;

  const validation = payload.signalValidation || "tentative";
  const isStrict = sig.tier === "strict";

  if (sig.type === "BUY") {
    return {
      fill: "#22c55e",
      icon: "▲",
      opacity: validation === "confirmed" ? 1.0 : validation === "failed" ? 0.3 : 0.75,
      glow: isStrict && validation === "confirmed",
      ring: isStrict,
    };
  }
  if (sig.type === "SELL") {
    return {
      fill: "#ef4444",
      icon: "▼",
      opacity: validation === "confirmed" ? 1.0 : validation === "failed" ? 0.3 : 0.75,
      glow: isStrict && validation === "confirmed",
      ring: isStrict,
    };
  }
  if (sig.type === "WARN") {
    return {
      fill: "#eab308",
      icon: "!",
      opacity: 0.8,
      glow: false,
      ring: false,
    };
  }
  return null;
}