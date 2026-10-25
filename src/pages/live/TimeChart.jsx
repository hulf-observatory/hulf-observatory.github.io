// Trend chart for a full view: a line (or bars) over time with a light normal band, dashed grid, axis labels.
// Follows the figure rules (DESIGN-SYSTEM §5): data in colour, grid and labels in grey, no legend box.
const W = 760;
const H = 240;
const M = { l: 44, r: 16, t: 12, b: 28 };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ms = (s) => Date.parse(s.length <= 10 ? `${s}T00:00:00` : s.length === 16 ? `${s}:00` : s);

function niceTicks(lo, hi, n = 4) {
  const span = hi - lo || 1;
  const step0 = span / n;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= step0) || mag * 10;
  const start = Math.floor(lo / step) * step;
  const out = [];
  for (let v = start; v <= hi + step * 0.01; v += step) out.push(+v.toFixed(6));
  return out;
}

export default function TimeChart({ points = [], band = [], colour, mark = 'line', invert = false, unit = '', monthly = false, minSpan = 0, label }) {
  const pts = points.filter((p) => p[1] != null);
  if (pts.length < 2) return <p className="lt-empty">Not enough readings yet for a trend.</p>;
  const t0 = ms(points[0][0]);
  const t1 = ms(points[points.length - 1][0]);
  const vals = [...pts.map((p) => p[1]), ...band.flatMap((b) => [b[1], b[2]])];
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (mark === 'bars' || lo > 0 && lo < (hi - lo) * 0.6) lo = 0;
  hi = Math.max(hi, lo + minSpan);   // a few tenths of a mm must not fill the chart
  const ticks = niceTicks(lo, hi);
  lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
  const x = (t) => M.l + ((t - t0) / (t1 - t0 || 1)) * (W - M.l - M.r);
  const y = (v) => {
    const f = (v - lo) / (hi - lo || 1);
    return M.t + (invert ? f : 1 - f) * (H - M.t - M.b);
  };
  const daily = points[0][0].length <= 10;
  const DAY = 86400000;
  // x labels: about six, on day (or month) boundaries
  const xt = [];
  const long = monthly || t1 - t0 > 90 * DAY;
  if (long) {
    // first of each month, thinned to about six labels
    const months = [];
    const d = new Date(t0); d.setDate(1); d.setMonth(d.getMonth() + 1);
    for (; d.getTime() <= t1; d.setMonth(d.getMonth() + 1)) months.push(new Date(d));
    const every = Math.max(1, Math.ceil(months.length / 7));
    months.filter((_, i) => i % every === 0).forEach((m) => xt.push([m.getTime(),
      m.getMonth() === 0 || every > 2 ? `${MON[m.getMonth()]} ${String(m.getFullYear()).slice(2)}` : MON[m.getMonth()]]));
  } else {
    const stepDays = Math.max(1, Math.round((t1 - t0) / DAY / 6));
    for (let t = t0; t <= t1; t += stepDays * DAY) { const d = new Date(t); xt.push([t, `${d.getDate()} ${MON[d.getMonth()]}`]); }
  }
  let body;
  if (mark === 'bars') {
    const bw = Math.max(1.5, ((W - M.l - M.r) / points.length) * 0.7);
    body = pts.map((p) => <rect key={p[0]} x={x(ms(p[0])) - bw / 2} y={Math.min(y(p[1]), y(0))} width={bw} height={Math.abs(y(0) - y(p[1])) || 1} fill={colour} />);
  } else {
    const d = pts.map((p) => `${x(ms(p[0])).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' L');
    const top = []; const bottom = [];
    band.forEach((b) => {
      const a = ms(b[0]);
      if (a + DAY < t0 || a > t1) return;
      const a0 = Math.max(a, t0); const a1 = daily ? a : Math.min(a + DAY, t1);
      top.push([x(a0), y(b[2])], [x(a1), y(b[2])]); bottom.push([x(a0), y(b[1])], [x(a1), y(b[1])]);
    });
    const area = top.length ? `M${[...top, ...bottom.reverse()].map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' L')}Z` : null;
    const last = pts[pts.length - 1];
    body = (
      <>
        {area && <path d={area} fill={colour} opacity="0.12" />}
        <path d={`M${d}`} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" />
        <circle cx={x(ms(last[0]))} cy={y(last[1])} r="4" fill={colour} />
      </>
    );
  }
  return (
    <svg className="lt-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="#E5E7EB" strokeDasharray="3 3" />
          <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="lt-axis">{v}{unit && v === ticks[ticks.length - 1] ? ` ${unit}` : ''}</text>
        </g>
      ))}
      {xt.map(([t, s]) => <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="lt-axis">{s}</text>)}
      {body}
    </svg>
  );
}
