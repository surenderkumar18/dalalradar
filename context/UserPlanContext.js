"use client";

// context/UserPlanContext.jsx
//
// 🎯 USER PLAN / ROLE CONTEXT
//
// Three roles (see utils/featureAccess.js → ROLES):
//   admin · premium · general
//
// Provides:
//   role           → "admin" | "premium" | "general"
//   isAdmin        → role === "admin"
//   isPremiumUser  → admin OR premium  (legacy code that checks
//                    isPremiumUser keeps working — admins pass it)
//
// SETTING THE ROLE:
//   Wrap your layout with <UserPlanProvider role={...}>.
//   Hardcode for now; later derive `role` from your auth session.
//
//   import { UserPlanProvider } from "@/context/UserPlanContext";
//   import { ROLES } from "@/utils/featureAccess";
//   <UserPlanProvider role={ROLES.ADMIN}>{children}</UserPlanProvider>
//

import { createContext, useContext } from "react";
import { ROLES } from "@/utils/featureAccess";

const UserPlanContext = createContext({
  role: ROLES.GENERAL,
  isAdmin: false,
  isPremiumUser: false,
});

export function UserPlanProvider({ role = ROLES.GENERAL, children }) {
  const isAdmin = role === ROLES.ADMIN;

  const value = {
    role,
    isAdmin,
    // 🔑 Admin counts as premium for any legacy isPremiumUser checks.
    isPremiumUser: isAdmin || role === ROLES.PREMIUM,
  };

  return (
    <UserPlanContext.Provider value={value}>
      {children}
    </UserPlanContext.Provider>
  );
}

export function useUserPlan() {
  return useContext(UserPlanContext);
}