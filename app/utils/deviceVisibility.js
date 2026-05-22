import {
  DEVICE_VISIBILITY,
  FEATURE_FLAGS,
} from "@/config/featureFlags";

export function canShowOnDevice(
  feature,
  screenWidth
) {
  // 🚫 feature disabled globally
  if (!FEATURE_FLAGS?.[feature]) {
    return false;
  }

  const config =
    DEVICE_VISIBILITY?.[feature];

  // default = visible everywhere
  if (!config) return true;

  const isMobile = screenWidth < 768;
  const isTablet =
    screenWidth >= 768 &&
    screenWidth < 1200;

  const isDesktop = screenWidth >= 1200;

  if (isMobile) {
    return config.mobile !== false;
  }

  if (isTablet) {
    return config.tablet !== false;
  }

  if (isDesktop) {
    return config.desktop !== false;
  }

  return true;
}