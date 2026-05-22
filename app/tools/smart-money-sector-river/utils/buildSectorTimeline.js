/**
 * Build a per-date sector leadership timeline.
 *
 * Uses a rolling-window smoothed turnover to determine the leader,
 * which kills single-day volume spikes from being treated as rotation.
 *
 * @param {Object} flow  sectorMap from buildSectorFlow: { sector: { date: turnover } }
 * @param {number} window  smoothing window in days (default 3)
 */
export function buildSectorTimeline(flow, window = 3){

  const sectors = Object.keys(flow);

  if(sectors.length === 0) return [];

  // Use union of all dates, sorted, instead of trusting one sector's keys
  const dates = [...new Set(
    sectors.flatMap(s => Object.keys(flow[s]))
  )].sort();

  const timeline = [];

  dates.forEach((date, idx) => {

    // Smoothed turnover = mean of last `window` days for each sector
    const windowStart = Math.max(0, idx - window + 1);
    const windowDates = dates.slice(windowStart, idx + 1);

    let leader = null;
    let maxSmoothed = -Infinity;
    let rawValueAtDate = 0;

    sectors.forEach(sec => {

      const smoothed = windowDates.reduce(
        (sum, d) => sum + (flow[sec][d] || 0),
        0
      ) / windowDates.length;

      if(smoothed > maxSmoothed){
        maxSmoothed = smoothed;
        leader = sec;
        rawValueAtDate = flow[sec][date] || 0;
      }

    });

    timeline.push({
      date,
      leader,
      value: rawValueAtDate,
      smoothed: maxSmoothed
    });

  });

  return timeline;

}