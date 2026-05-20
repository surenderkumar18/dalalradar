// utils/featureAccess.js
//
// 🎯 FEATURE ACCESS — Check if a feature is available to the user.
//
// USAGE:
//   import { hasFeature } from "@/utils/featureAccess";
//
//   if (hasFeature("STOCK_SEARCH", isPremiumUser)) {
//     // Show the feature
//   }
//
// LOGIC:
//   1. Is feature globally enabled? → if not, hide for everyone
//   2. Is it premium-only? → if yes, only show to premium users
//   3. Otherwise → show to everyone
//

import { FEATURE_FLAGS, PREMIUM_FEATURES } from "@/config/featureFlags";

export function hasFeature(featureKey, isPremiumUser = false) {
  // Step 1: Is the feature globally enabled?
  if (!FEATURE_FLAGS[featureKey]) {
    return false; // killed globally — hide from everyone
  }

  // Step 2: Is this a premium-only feature?
  if (PREMIUM_FEATURES[featureKey]) {
    return isPremiumUser; // only premium users can see it
  }

  // Step 3: Free feature, globally enabled → show to everyone
  return true;
}

// ─── HELPERS ─────────────────────────────────────────────────

/**
 * Check if feature is premium-locked (visible but paywalled).
 * Useful for showing "🔒 Premium" badges on disabled UI.
 */
export function isPremiumOnly(featureKey) {
  return Boolean(PREMIUM_FEATURES[featureKey]);
}

/**
 * Check if feature exists globally (regardless of user tier).
 */
export function isFeatureLive(featureKey) {
  return Boolean(FEATURE_FLAGS[featureKey]);
}