// utils/featureAccess.js
//
// 🎯 FEATURE ACCESS — Check if a feature is available to the user.
//
// THREE ROLES:
//   admin    → sees all BUILT features (free + premium). Bypasses the
//              premium gate, but NOT the global kill switch (so unbuilt
//              stubs like HEATMAP_TOOL stay hidden and can't crash).
//   premium  → sees free + premium features.
//   general  → sees free features only.
//
// USAGE:
//   import { hasFeature, ROLES } from "@/utils/featureAccess";
//   if (hasFeature("STOCK_SEARCH", role)) { ... }
//
//   // Back-compat: a boolean still works —
//   //   true  → treated as premium
//   //   false → treated as general
//   if (hasFeature("STOCK_SEARCH", isPremiumUser)) { ... }
//
// LOGIC (Option A — admin bypasses premium gate, NOT kill switch):
//   1. Is feature globally enabled? → if not, hide for EVERYONE (incl. admin)
//   2. Is the user an admin?        → if yes, show (all built features)
//   3. Is it premium-only?          → if yes, only premium users
//   4. Otherwise (free + enabled)   → show to everyone
//

import { FEATURE_FLAGS, PREMIUM_FEATURES } from "@/config/featureFlags";

// Role constants — import these instead of using magic strings.
export const ROLES = {
  ADMIN: "admin",
  PREMIUM: "premium",
  GENERAL: "general",
};

// Accept either a role string or a legacy boolean (isPremiumUser).
function normalizeRole(roleOrBool) {
  if (roleOrBool === true) return ROLES.PREMIUM; // old isPremiumUser={true}
  if (roleOrBool === false) return ROLES.GENERAL; // old isPremiumUser={false}
  return roleOrBool || ROLES.GENERAL;
}

export function hasFeature(featureKey, roleOrBool = ROLES.GENERAL) {
  const role = normalizeRole(roleOrBool);

  // Step 1: Is the feature globally enabled?
  // ⛔ Applies to ADMINS too — never render an unbuilt/killed feature.
  if (!FEATURE_FLAGS[featureKey]) {
    return false;
  }

  // Step 2: 🔑 ADMIN — sees all BUILT features (free + premium).
  if (role === ROLES.ADMIN) {
    return true;
  }

  // Step 3: Is this a premium-only feature?
  if (PREMIUM_FEATURES[featureKey]) {
    return role === ROLES.PREMIUM;
  }

  // Step 4: Free feature, globally enabled → show to everyone.
  return true;
}

// ─── HELPERS ─────────────────────────────────────────────────

/** True if feature is premium-locked (visible but paywalled). */
export function isPremiumOnly(featureKey) {
  return Boolean(PREMIUM_FEATURES[featureKey]);
}

/** True if feature exists globally (regardless of user tier). */
export function isFeatureLive(featureKey) {
  return Boolean(FEATURE_FLAGS[featureKey]);
}

/** True if the given role/bool is an admin. */
export function isAdminRole(roleOrBool) {
  return normalizeRole(roleOrBool) === ROLES.ADMIN;
}