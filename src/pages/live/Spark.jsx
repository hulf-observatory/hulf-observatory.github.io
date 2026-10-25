// Small trend figure for a card: a line (or daily bars for rain), no axes; the first and last dates sit under it.
// `band` ([date, low, high] per day) is drawn as a light area behind the line — the normal range.
// `invert` draws larger values lower (depth to groundwater: deeper is down); `minSpan` sets the smallest value range shown.
import { fmtDay, fmtWhen } from './data';

const W = 300;
const H = 56;
const DAY = 86400000;
const ms = (s) => Date.parse(s.length <= 10 ? `${s}T00:00:00` : s.length === 16 ? `${s}:00` : s);

export default function Spark({ points, band, colour, mark = 'line', invert = false, minSpan = 0, monthly = false, label, bandLabel }) {
  const all = points || [];
  const pts = all.filter((p) => p[1] != null);
  if (pts.length < 2) return <div className="live-spark live-spark--empty">Not enough readings yet for a trend</div>;
  const daily = all[0][0].length <= 10;
  const t0 = ms(all[0][0]);
  const t1 = ms(all[all.length - 1][0]);
  const bands = mark === 'line' ? (band || []).filter((b) => ms(b[0]) + DAY > t0 && ms(b[0]) <= t1) : [];
  const vals = [...pts.map((p) => p[1]), ...bands.flatMap((b) => [b[1], b[2]])];
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (mark === 'bars') lo = 0;
  hi = Math.max(hi, lo + minSpan); // a few tenths of a mm must not fill the whole height
  if (hi === lo) hi = lo + 1;
  const y = (v) => {
    const t = (v - lo) / (hi - lo);
    return 4 + (invert ? t : 1 - t) * (H - 8);
  };
  const x = (s) => Math.min(W, Math.max(0, ((ms(s) - t0) / (t1 - t0 || 1)) * W));
  const xt = (t) => Math.min(W, Math.max(0, ((t - t0) / (t1 - t0 || 1)) * W));

  let body;
  if (mark === 'bars') {
    const slot = W / all.length;
    const bw = Math.max(2, slot * 0.6);
    body = all.map((p, i) => (p[1] == null ? null : (
      <rect key={p[0]} x={i * slot + (slot - bw) / 2} y={y(p[1])} width={bw}
        height={Math.max(1, H - 4 - y(p[1]))} fill={colour} />
    )));
  } else {
    const d = pts.map((p) => `${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' L');
    const last = pts[pts.length - 1];
    // daily bands as steps for hourly lines (each day's range spans that day), as a smooth area for daily lines
    const top = []; const bottom = [];
    bands.forEach((b) => {
      const a = ms(b[0]);
      top.push([xt(a), y(b[2])]); if (!daily) top.push([xt(a + DAY), y(b[2])]);
      bottom.push([xt(a), y(b[1])]); if (!daily) bottom.push([xt(a + DAY), y(b[1])]);
    });
    const area = top.length ? `M${[...top, ...bottom.reverse()].map((q) => q.map((n) => n.toFixed(1)).join(',')).join(' L')}Z` : null;
    body = (
      <>
        {area && <path d={area} fill={colour} opacity="0.13" />}
        <path d={`M${d}`} fill="none" stroke={colour} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round"
          vectorEffect="non-scaling-stroke" />
        <circle cx={x(last[0])} cy={y(last[1])} r="3" fill={colour} />
      </>
    );
  }
  return (
    <figure className="live-spark">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
        <line x1="0" x2={W} y1={H - 4} y2={H - 4} stroke="#E5E7EB" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {body}
      </svg>
      <figcaption>
        <span>{monthly ? fmtWhen(all[0][0].slice(0, 7)) : fmtDay(all[0][0])}</span>
        <span>{label}{bands.length > 0 && bandLabel ? <> · <i className="live-band-key" style={{ background: colour }} /> {bandLabel}</> : null}</span>
        <span>{monthly ? fmtWhen(all[all.length - 1][0].slice(0, 7)) : fmtDay(all[all.length - 1][0])}</span>
      </figcaption>
    </figure>
  );
}
