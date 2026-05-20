"use client";

// context/UserPlanContext.js
//
// 🎯 USER PLAN CONTEXT — Holds the current user's plan globally.
//
// SOLVES: Prop-drilling `isPremiumUser` through 10 components.
//
// HOW IT WORKS:
//   1. Wrap your app once in <UserPlanProvider>
//   2. Any component can read user plan via useUserPlan()
//   3. No need to pass isPremiumUser as prop
//
// CURRENT STATE:
//   isPremiumUser is hardcoded to false (no auth yet).
//
// WHEN AUTH IS ADDED:
//   Replace the hardcoded value with a real auth check
//   (Supabase, Clerk, etc.). Components don't change.
//

import { createContext, useContext, useState, useEffect } from "react";

// ─── CONTEXT ───────────────────────────────────────────────────
const UserPlanContext = createContext({
  isPremiumUser: false,
  plan: "free", // "free" | "premium" | "admin"
  setPlan: () => {},
});

// ─── PROVIDER ──────────────────────────────────────────────────
export function UserPlanProvider({ children }) {
  const [plan, setPlan] = useState("free");

  // ─── ADMIN OVERRIDE (for testing) ───
  // To preview premium features without real auth:
  //   In browser console:
  //   localStorage.setItem("dalalradar_plan", "premium")
  //   → refresh page → all premium features visible
  //
  //   To reset: localStorage.removeItem("dalalradar_plan")
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("dalalradar_plan");
    if (stored === "premium" || stored === "admin") {
      setPlan(stored);
    }
  }, []);

  // ─── TODO: When auth is added, replace the useEffect above with: ───
  //
  //   useEffect(() => {
  //     async function loadUserPlan() {
  //       const res = await fetch("/api/user/me");
  //       const user = await res.json();
  //       setPlan(user.tier || "free");
  //     }
  //     loadUserPlan();
  //   }, []);

  const value = {
    isPremiumUser: plan === "premium" || plan === "admin",
    plan,
    setPlan,
  };

  return (
    <UserPlanContext.Provider value={value}>
      {children}
    </UserPlanContext.Provider>
  );
}

// ─── HOOK ──────────────────────────────────────────────────────
export function useUserPlan() {
  return useContext(UserPlanContext);
}