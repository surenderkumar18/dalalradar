"use client";

// <UserPlanProvider role={ROLES.ADMIN}>      // admin — sees everything
// <UserPlanProvider role={ROLES.PREMIUM}>    // premium — free + premium
// <UserPlanProvider role={ROLES.GENERAL}>    // free user

import { UserPlanProvider } from "@/context/UserPlanContext";
import { ROLES } from "@/utils/featureAccess";

export default function Providers({ children }) {
  // 🔧 Change this to test tiers: ROLES.ADMIN / ROLES.PREMIUM / ROLES.GENERAL
  return (
    <UserPlanProvider role={ROLES.GENERAL}>
      {children}
    </UserPlanProvider>
  );
}