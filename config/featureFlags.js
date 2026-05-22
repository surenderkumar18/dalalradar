// config/featureFlags.js
//
// 🎯 FEATURE FLAGS — Centralized config for the entire app.
//
// TWO REGISTRIES:
//   FEATURE_FLAGS   → Is the feature shipped at all? (kill switch)
//   PREMIUM_FEATURES → Does it require premium tier?
//
// HOW TO USE:
//   1. Hide search globally:    FEATURE_FLAGS.STOCK_SEARCH = false
//   2. Make search premium:     PREMIUM_FEATURES.STOCK_SEARCH = true
//   3. Always show for free:    PREMIUM_FEATURES.STOCK_SEARCH = false
//   4. Kill feature entirely:   FEATURE_FLAGS.STOCK_SEARCH = false
//
// ─────────────────────────────────────────────────────────────────
// 🚦 GLOBAL ENABLE/DISABLE
// ─────────────────────────────────────────────────────────────────
// If false → feature is hidden from EVERYONE (even premium users)
// If true  → feature is shown (based on PREMIUM_FEATURES below)
// ─────────────────────────────────────────────────────────────────

export const FEATURE_FLAGS = {
  // ─── Header / Search ───
  STOCK_SEARCH: true,
  NOTIFICATIONS: true,
  EXPORT_BUTTON: true,

  // ─── Chart Controls ───
  BUBBLE_SIZE: true,
  APPLY_CONTROLS: true,
  RELATIVE_SIZE: true,
  PAST_DAYS_FILTER: true,
  BUBBLE_POSITION: true,
  VIEW_SETTINGS: true,
  ALL_STOCKS_BUTTON: true,

  // ─── Analysis Features ───
  SIGNAL_ENGINE: true,
  SMART_ENTRY: true,
  ROTATION_SCORE: true,
  WHALE_DETECTION: true,
  CUSTOM_ALERTS: true,
  BACKTESTING: true,

  // ─── Data Views ───
  FAVORITES_MODE: true,
  WATCHLISTS: true,
  MULTI_TIMEFRAME: true,
  COMPARISON_VIEW: true,

  // ─── Export ───
  EXPORT_PNG: true,
  EXPORT_CSV: true,

  // ─── Premium-Only Tools ───
  AI_INSIGHTS: true,
  API_ACCESS: true,
  REAL_TIME_DATA: true,

  // ─── Future Tools ───
  ROLLOVER_TOOL: false, // not built yet
  HEATMAP_TOOL: false, // not built yet
  OI_PRICE_CHART: true,
};

// ─────────────────────────────────────────────────────────────────
// 💎 PREMIUM-ONLY FEATURES
// ─────────────────────────────────────────────────────────────────
// If a feature is listed as `true` here → only premium users see it
// If listed as `false` or missing → free for everyone
// ─────────────────────────────────────────────────────────────────

export const PREMIUM_FEATURES = {
  // ─── Free for everyone (current strategy) ───
  STOCK_SEARCH: false,
  BUBBLE_SIZE: false,
  APPLY_CONTROLS: true,
  RELATIVE_SIZE: false,
  PAST_DAYS_FILTER: false,
  BUBBLE_POSITION: false,
  VIEW_SETTINGS: false,
  ALL_STOCKS_BUTTON: false,
  SIGNAL_ENGINE: false,
  SMART_ENTRY: false,
  ROTATION_SCORE: false,

  // ─── Premium-only (locked for free users) ───
  NOTIFICATIONS: true,
  EXPORT_BUTTON: true,
  EXPORT_PNG: true,
  EXPORT_CSV: true,
  WHALE_DETECTION: true,
  CUSTOM_ALERTS: true,
  BACKTESTING: true,
  FAVORITES_MODE: true,
  WATCHLISTS: true,
  MULTI_TIMEFRAME: true,
  COMPARISON_VIEW: true,
  AI_INSIGHTS: true,
  API_ACCESS: true,
  REAL_TIME_DATA: true,
  OI_PRICE_CHART: true,
};


// config/featureFlags.js

export const DEVICE_VISIBILITY = {
  STOCK_SEARCH: {
    mobile: false,
    tablet: false,
    desktop: true,
  },

  APPLY_CONTROLS: {
    mobile: false,
    tablet: false,
    desktop: true,
  },

  BUBBLE_SIZE: {
    mobile: false,
    tablet: true,
    desktop: true,
  },

  RELATIVE_SIZE: {
    mobile: false,
    tablet: true,
    desktop: true,
  },

  PAST_DAYS_FILTER: {
    mobile: true,
    tablet: true,
    desktop: true,
  },

  BUBBLE_POSITION: {
    mobile: false,
    tablet: false,
    desktop: true,
  },

  VIEW_SETTINGS: {
    mobile: true,
    tablet: true,
    desktop: true,
  },

  ALL_STOCKS_BUTTON: {
    mobile: false,
    tablet: true,
    desktop: true,
  },

  SIGNAL_ENGINE: {
    mobile: false,
    tablet: true,
    desktop: true,
  },
};