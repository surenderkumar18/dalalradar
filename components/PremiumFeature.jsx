"use client";

// components/PremiumFeature.jsx
//
// 🎯 PREMIUM FEATURE WRAPPER — Conditionally render UI based on flags + role.
//
// ROLES (see utils/featureAccess.js):
//   admin    → sees all BUILT features (free + premium)
//   premium  → sees free + premium
//   general  → sees free only
//
// A globally-killed feature (FEATURE_FLAGS.X = false) is hidden for
// EVERYONE — including admins — so unbuilt stubs never render/crash.
//
// USAGE (3 patterns):
//
// 1. SIMPLE HIDE (most common):
//    <PremiumFeature feature="STOCK_SEARCH">
//      <MemoSearch ... />
//    </PremiumFeature>
//
// 2. WITH FALLBACK (upgrade prompt):
//    <PremiumFeature feature="EXPORT_CSV" fallback={<UpgradePrompt />}>
//      <ExportCSVButton />
//    </PremiumFeature>
//
// 3. WITH LOCKED OVERLAY (shows feature but disabled):
//    <PremiumFeature feature="WHALE_DETECTION" showLocked>
//      <WhalePanel />
//    </PremiumFeature>
//

import {
  hasFeature,
  isPremiumOnly,
  isFeatureLive,
} from "@/utils/featureAccess";
import { useUserPlan } from "@/context/UserPlanContext";

export default function PremiumFeature({
  feature,
  children,
  fallback = null,
  showLocked = false,
}) {
  const { role } = useUserPlan();

  // ─── Globally killed feature → never show (admins included) ───
  if (!isFeatureLive(feature)) {
    return null;
  }

  // ─── User has access (general/premium/admin per role) → show normally ───
  if (hasFeature(feature, role)) {
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
            padding: "9px 12px",
            fontFamily: "var(--font-app, monospace)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--gold, #facc15)",
            borderRadius: 4,
          }}
        >
          🔒 Premium
        </div>
      </div>
    </div>
  );
}