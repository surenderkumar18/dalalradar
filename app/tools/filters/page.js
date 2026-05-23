// app/tools/filters/page.js
//
// 🛡️ SERVER COMPONENT — handles metadata + production block
//
// This file is the entry point. Next.js processes it on the server BEFORE
// the client component mounts. That lets us:
//   ✅ Export metadata (blocks search engines)
//   ✅ Call notFound() to return real HTTP 404 before any JS ships
//   ✅ Skip the entire client bundle on production (saves bytes too)
//
// The actual filter UI lives in FiltersClient.js (client component).

import { notFound } from "next/navigation";
import FiltersClient from "./FiltersClient";

// ─── METADATA (server-only export) ────────────────────────────────────
export const metadata = {
  title: "Filters (dev)",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

// ─── PAGE ─────────────────────────────────────────────────────────────
export default function FiltersPage() {
  // 🚫 Block on production (Vercel)
  // notFound() throws — Next.js catches it and renders the 404 page.
  // This runs ON THE SERVER, so the client bundle never even loads.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <FiltersClient />;
}