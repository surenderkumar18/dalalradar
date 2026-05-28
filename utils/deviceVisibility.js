// utils/deviceVisibility.js
//
// 🎯 DEVICE VISIBILITY — Should a control show at the current screen width?
//
// Reads DEVICE_VISIBILITY from config/featureFlags.js. Each feature maps to
// { mobile, tablet, desktop } booleans.
//
// Breakpoints:
//   mobile  : width < 768
//   tablet  : 768 ≤ width < 1024
//   desktop : width ≥ 1024
//
// USAGE:
//   import { canShowOnDevice } from "@/app/utils/deviceVisibility";
//
//   // Standard (unchanged):
//   canShowOnDevice("STOCK_SEARCH", screenWidth)
//
//   // 🔑 Admin bypass — pass isAdmin as the 3rd arg. Admins see every
//   // control regardless of screen size (e.g. desktop-only search on a phone).
//   canShowOnDevice("STOCK_SEARCH", screenWidth, isAdmin)
//

import { DEVICE_VISIBILITY } from "@/config/featureFlags";

// Tailwind-ish breakpoints
const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

export function getDeviceType(width) {
  if (width < TABLET_MIN) return "mobile";
  if (width < DESKTOP_MIN) return "tablet";
  return "desktop";
}

export function canShowOnDevice(featureKey, width, isAdmin = false) {
  // 🔑 ADMIN — bypass device gating entirely, see everything.
  if (isAdmin) return true;

  const rule = DEVICE_VISIBILITY[featureKey];

  // No rule defined → default to visible (don't accidentally hide
  // controls that were never added to the DEVICE_VISIBILITY map).
  if (!rule) return true;

  const device = getDeviceType(width);
  return Boolean(rule[device]);
}