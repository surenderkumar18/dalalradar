/**
 * Detect sector rotation events from a leadership timeline.
 *
 * An event is emitted when the smoothed leader changes from one sector
 * to another AND the new leader's margin over the runner-up is meaningful
 * (filters out near-tie noise where leadership flips day to day).
 *
 * @param {Object} flow      sectorMap: { sector: { date: turnover } }
 * @param {Array}  timeline  optional precomputed timeline from buildSectorTimeline
 * @param {number} minMargin minimum margin over #2 sector to count as a rotation (default 0.03 = 3%)
 */
export function detectSectorLeadership(flow, timeline = null, minMargin = 0.03){

  const sectors = Object.keys(flow);
  if(sectors.length === 0) return [];

  // If no timeline provided, build a quick one (unsmoothed) for back-compat
  if(!timeline){
    const dates = [...new Set(
      sectors.flatMap(s => Object.keys(flow[s]))
    )].sort();

    timeline = dates.map(date => {
      let leader = null;
      let max = -Infinity;
      sectors.forEach(sec => {
        const v = flow[sec][date] || 0;
        if(v > max){ max = v; leader = sec; }
      });
      return { date, leader, value: max };
    });
  }

  const events = [];

  for(let i = 1; i < timeline.length; i++){

    const prev = timeline[i-1];
    const curr = timeline[i];

    if(curr.leader === prev.leader) continue;

    // Compute margin: how much does the new leader beat the runner-up *today*?
    const values = sectors
      .map(sec => flow[sec][curr.date] || 0)
      .sort((a,b) => b - a);

    const top = values[0];
    const second = values[1] || 0;

    if(top === 0) continue;

    const margin = (top - second) / top;

    if(margin >= minMargin){
      events.push({
        date: curr.date,
        from: prev.leader,
        to: curr.leader,
        value: curr.value,
        margin
      });
    }

  }

  return events;

}