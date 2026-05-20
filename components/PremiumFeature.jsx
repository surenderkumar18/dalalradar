"use client";

// components/PremiumFeature.jsx
//
// 🎯 PREMIUM FEATURE WRAPPER — Conditionally render UI based on flags.
//
// USAGE (3 patterns):
//
// 1. SIMPLE HIDE (most common):
//    <PremiumFeature feature="STOCK_SEARCH">
//      <MemoSearch ... />
//    </PremiumFeature>
//
//    → Free user: hidden if STOCK_SEARCH is premium-only
//    → Premium user: visible
//    → Killed globally (FEATURE_FLAGS.STOCK_SEARCH = false): hidden for all
//
// 2. WITH FALLBACK (upgrade prompt):
//    <PremiumFeature
//      feature="EXPORT_CSV"
//      fallback={<UpgradePrompt feature="Export" />}
//    >
//      <ExportCSVButton />
//    </PremiumFeature>
//
//    → Free user: sees the upgrade prompt
//    → Premium user: sees the actual button
//
// 3. WITH LOCKED OVERLAY (shows feature but disabled):
//    <PremiumFeature feature="WHALE_DETECTION" showLocked>
//      <WhalePanel />
//    </PremiumFeature>
//
//    → Free user: sees WhalePanel with "🔒 Premium" overlay (disabled)
//    → Premium user: sees WhalePanel fully working
//

import { hasFeature, isPremiumOnly, isFeatureLive } from "@/utils/featureAccess";
import { useUserPlan } from "@/context/UserPlanContext";

export default function PremiumFeature({
  feature,
  children,
  fallback = null,
  showLocked = false,
}) {
  const { isPremiumUser } = useUserPlan();

  // ─── Globally killed feature → never show ───
  if (!isFeatureLive(feature)) {
    return null;
  }

  // ─── User has access → show normally ───
  if (hasFeature(feature, isPremiumUser)) {
    return <>{children}</>;
  }

  // ─── User doesn't have access ───

  // showLocked mode → show feature with overlay
  if (showLocked && isPremiumOnly(feature)) {
    return <LockedOverlay>{children}</LockedOverlay>;
  }

  // Default → show fallback or nothing
  return fallback;
}

// ─── LOCKED OVERLAY (for showLocked mode) ──────────────────────
function LockedOverlay({ children }) {
  return (
    <div
      style={{
        position: "relative",
        opacity: 0.4,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(10, 10, 12, 0.5)",
          pointerEvents: "auto",
          cursor: "pointer",
        }}
        onClick={() => {
          // TODO: open upgrade modal when ready
          alert("Premium feature — upgrade coming soon!");
        }}
      >
        <div
          style={{
            background: "var(--bg-2, #111114)",
            border: "1px solid var(--gold, #facc15)",
            padding: "6px 12px",
            fontFamily: "var(--font-app, monospace)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--gold, #facc15)",
          }}
        >
          🔒 Premium
        </div>
      </div>
    </div>
  );
}
