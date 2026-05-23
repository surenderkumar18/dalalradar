// app/tools/smart-money-sector-river/page.js
//
// 🚀 OPTIMIZED with lazy loading:
// - D3 chart component loads only when this page is visited
// - delivery.json loads dynamically (not bundled into JS)
//
// 🎯 Background uses var(--bg) for theme consistency

"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import SiteFooter from "@/components/SiteFooter";
import DashboardHeader from "@/app/components/DashboardHeader";
import { detectSectorLeadership } from "./utils/detectSectorLeadership";
import { buildSectorTimeline } from "./utils/buildSectorTimeline";
import { buildSectorFlow } from "./utils/buildSectorFlow";

import { loadMarketCaps } from "@/app/utils/loadMarketCaps";

const SectorMoneyRiver = dynamic(
  () => import("./components/SectorMoneyRiver"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading visualization engine...
      </div>
    ),
  },
);

export default function Page() {
  const [flow, setFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [deliveryModule, res] = await Promise.all([
          import("@/data/delivery.json"),
          loadMarketCaps("LOCAL"),
        ]);

        if (!res || !res.rows) {
          throw new Error("loadMarketCaps returned no rows");
        }

        const delivery = deliveryModule.default;
        const sectorFlow = buildSectorFlow(delivery, res.rows);

        if (!cancelled) {
          setFlow(sectorFlow);
        }
      } catch (err) {
        console.error("Failed to load sector flow:", err);
        if (!cancelled) {
          setError(err.message || "Unknown error loading sector data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const timeline = useMemo(() => {
    if (!flow) return [];
    return buildSectorTimeline(flow, 3);
  }, [flow]);

  const events = useMemo(() => {
    if (!flow || timeline.length === 0) return [];
    return detectSectorLeadership(flow, timeline, 0.03);
  }, [flow, timeline]);

  return (
    <div
      className="flex min-h-screen text-gray-100"
      style={{ background: "var(--bg)" }}
    >
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <section className="flex-1 relative p-6">
          {loading && (
            <div className="flex items-center justify-center h-full text-gray-400">
              Loading sector money flow...
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center justify-center h-full text-red-400">
              Error: {error}
            </div>
          )}

          {!loading && !error && flow && (
            <SectorMoneyRiver data={flow} events={events} timeline={timeline} />
          )}
        </section>
        
      <SiteFooter />
      </main>
    </div>
  );
}