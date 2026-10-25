// Card graphics, one rule for all (design review, 25 Oct; written into DESIGN-SYSTEM.md §5):
//   - the graphic fills the right half of the card (at least 120 px tall); one narrow column, 22 px wide, on every card
//   - today: fill or dot in the card's colour, labelled 12 px bold ink ("now 23%")
//   - normal: 1.5 px dashed ink line — only ever normal
//   - last year: solid 1.5 px grey tick — only ever last year
//   - a shortfall against normal or last year hatched red; a surplus hatched grey (hatching = a gap, never an amount)
//   - every label to the right of the column, 11 px muted (today's 12 px bold); labels nudged apart when close
const RED_HATCH = 'repeating-linear-gradient(135deg, rgba(194,65,59,.5) 0 1.5px, transparent 1.5px 5px)';
const GREY_HATCH = 'repeating-linear-gradient(135deg, rgba(17,24,39,.22) 0 1.5px, transparent 1.5px 5px)';
const GAP = 11; // % of the 120 px box ≈ one label line

// labels at % positions (from the bottom, or from the top when `fromTop`), pushed apart and kept in the box
function spread(labels) {
  const out = [...labels].sort((a, b) => a.at - b.at).map((l) => ({ ...l, y: l.at }));
  out.forEach((l, i) => { if (i && l.y - out[i - 1].y < GAP) l.y = out[i - 1].y + GAP; });
  const over = out.length ? out[out.length - 1].y - 96 : 0;
  if (over > 0) out.forEach((l) => { l.y -= over; });
  return out;
}

function Labels({ items, fromTop = false }) {
  return (
    <div className="lg-labels">
      {spread(items).map((l, i) => (
        <span key={`${i}-${l.text}`} className={l.now ? 'is-now' : ''} style={{ [fromTop ? 'top' : 'bottom']: `${l.y}%` }}>{l.text}</span>
      ))}
    </div>
  );
}

const clamp = (v) => Math.max(0, Math.min(100, v));

// Tank (rain, reservoirs): filled to today, dashed normal, the gap hatched, last year as a grey tick.
export function Tank({ value, normal, lastYear, max, closed = false, colour, nowText, normalText, lastYearText, label }) {
  const top = max || Math.max(value, normal, lastYear || 0) * 1.08 || 1;
  const p = (v) => clamp((v / top) * 100);
  const short = value < normal;
  return (
    <div className="lg" role="img" aria-label={label}>
      <div className={`lg-col ${closed ? 'lg-col--box' : 'lg-col--tank'}`}>
        <span className="lg-fill" style={{ height: `${p(value)}%`, background: colour }} />
        <span className="lg-gap" style={{ bottom: `${p(Math.min(value, normal))}%`, height: `${Math.abs(p(normal) - p(value))}%`, background: short ? RED_HATCH : GREY_HATCH }} />
        <span className="lg-normal" style={{ bottom: `${p(normal)}%` }} />
        {lastYear != null && <span className="lg-last" style={{ bottom: `${p(lastYear)}%` }} />}
      </div>
      <Labels items={[{ at: p(value), text: nowText, now: true }, { at: p(normal), text: normalText },
        ...(lastYear != null ? [{ at: p(lastYear), text: lastYearText }] : [])]} />
    </div>
  );
}

// Well (groundwater): the top is ground level; the dry part from the ground down to today's water hatched red, the
// water below it in the card's colour; last year as a grey tick. Fixed 0–20 m scale, deeper if needed.
export function Well({ depth, before, colour, label }) {
  const bottom = Math.max(20, Math.ceil(Math.max(depth, before) / 5) * 5);
  const p = (v) => clamp((v / bottom) * 100);
  return (
    <div className="lg lg--well" role="img" aria-label={label}>
      <div className="lg-col lg-col--well">
        <span className="lg-water" style={{ top: `${p(depth)}%`, background: colour }} />
        <span className="lg-gap" style={{ top: 0, height: `${p(depth)}%`, background: RED_HATCH }} />
        <span className="lg-last lg-last--top" style={{ top: `${p(before)}%` }} />
      </div>
      <span className="lg-ground">ground</span>
      <Labels fromTop items={[{ at: p(depth), text: `now ${depth.toFixed(1)} m`, now: true },
        { at: p(before), text: `last year ${before.toFixed(1)}` }]} />
    </div>
  );
}

// Column (tankers, humidity): today's amount as a solid fill in the card's colour. The comparison is either the grey
// tick (`ref`), or — with `overlay` — last year's amount hatched over the bottom of today's bar.
// `closed` draws a closed box (percentages: humidity, reservoirs), like the temperature track.
// humidity: water in the air drawn as dots rather than a solid fill
const dotFill = (c) => `radial-gradient(${c} 1.1px, transparent 1.3px) 0 0 / 5px 5px`;
const OVERLAY_HATCH = 'repeating-linear-gradient(135deg, rgba(255,255,255,.75) 0 1.5px, transparent 1.5px 5px)';
export function Column({ value, ref: refValue, overlay = false, closed = false, dots = false, max, colour, nowText, refText, label }) {
  const top = max || Math.max(value, refValue ?? 0) * 1.05 || 1;
  const p = (v) => clamp((v / top) * 100);
  return (
    <div className="lg" role="img" aria-label={label}>
      <div className={`lg-col ${closed ? 'lg-col--box' : 'lg-col--tank'}`}>
        <span className="lg-fill" style={{ height: `${p(value)}%`, background: dots ? dotFill(colour) : colour }} />
        {refValue != null && (overlay
          ? <span className="lg-fill lg-overlay" style={{ height: `${p(refValue)}%`, background: OVERLAY_HATCH }} />
          : <span className="lg-last" style={{ bottom: `${p(refValue)}%` }} />)}
      </div>
      <Labels items={[{ at: p(value), text: nowText, now: true }, ...(refValue != null ? [{ at: p(refValue), text: refText }] : [])]} />
    </div>
  );
}

// Thermometer (heat): fixed 15–40 °C track; the normal low–high as a light band; a dot for now.
export function Thermo({ now, low, high, colour, label }) {
  const lo = 15; const hi = 40;
  const p = (v) => clamp(((v - lo) / (hi - lo)) * 100);
  return (
    <div className="lg" role="img" aria-label={label}>
      <div className="lg-col lg-col--track">
        <span className="lg-band" style={{ bottom: `${p(low)}%`, height: `${p(high) - p(low)}%` }} />
        <span className="lg-dot" style={{ bottom: `${p(now)}%`, background: colour }} />
      </div>
      <Labels items={[{ at: p(now), text: `now ${now.toFixed(1)}`, now: true },
        { at: p(high), text: `normal high ${high.toFixed(1)}` }, { at: p(low), text: `normal low ${low.toFixed(1)}` }]} />
    </div>
  );
}

// Category bar (air quality, heat index): a standard's categories stacked with equal heights, toned down except the
// one today's value falls in; names on the right, today's value next to its category, a tick across the bar.
// `steps` are the category limits from the bottom (n + 1 numbers for n categories).
export function CategoryBar({ value, steps, colours, names, unit = '', label }) {
  const n = names.length;
  const pos = (v) => {
    const x = Math.max(steps[0], Math.min(steps[n], v));
    const i = Math.min(n - 1, Math.max(0, steps.findIndex((s, k) => k > 0 && x <= s) - 1));
    return ((i + (x - steps[i]) / (steps[i + 1] - steps[i])) / n) * 100;
  };
  const current = Math.min(n - 1, Math.floor(pos(value) / (100 / n)));
  const shown = Number.isInteger(value) ? value : value.toFixed(1);
  return (
    <div className="lg lg--aqi" role="img" aria-label={label}>
      <div className="lg-col lg-col--aqi">
        {colours.map((c, k) => <span key={names[k]} title={names[k]} className="lg-seg"
          style={{ bottom: `${(k / n) * 100}%`, height: `calc(${100 / n}% - 1px)`, background: c, opacity: k === current ? 1 : 0.3 }} />)}
        <span className="lg-now" style={{ bottom: `${pos(value)}%` }} />
      </div>
      <div className="lg-labels">
        {names.map((nm, k) => (k === current
          ? <span key={nm} className="is-now" style={{ bottom: `${pos(value)}%` }}>{nm} · {shown}{unit}</span>
          : Math.abs(((k + 0.5) / n) * 100 - pos(value)) < 12 ? null   // too close to today's label
            : <span key={nm} style={{ bottom: `${((k + 0.5) / n) * 100}%` }}>{nm}</span>))}
      </div>
    </div>
  );
}

// CPCB National AQI: categories, in CPCB's colours muted as on the Weather and air page (Teja, 25 Oct)
export const AQI = { steps: [0, 50, 100, 200, 300, 400, 500], colours: ['#8FC9A0', '#C9E09C', '#F3E08C', '#F2B46E', '#D9665B', '#A84540'],
  names: ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very poor', 'Severe'] };
// IMD's experimental heat index bands (°C): ≤ 35, 36–45, 46–55, > 55, named by IMD's warning level for their colours
// (green, yellow, orange, red), the colours muted as on the Weather and air page
export const HEAT_INDEX = { steps: [20, 35.5, 45.5, 55.5, 65], colours: ['#A9D5B4', '#F3E08C', '#F2B46E', '#D9665B'],
  names: ['No warning', 'Be aware', 'Be prepared', 'Take action'] };

// Wind: a grid of identical thin arrows pointing where the wind is going across HMDA (the speed-weighted
// direction). Station-by-station arrows belong in the full view.
export function WindGrid({ from, colour, label }) {
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cells.push([12.5 + c * 25, 12.5 + r * 25]);
  return (
    <figure className="lg-field" role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMinYMid meet">
        {cells.map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${from + 180})`}>
            <line x1="0" y1="8" x2="0" y2="-7" stroke={colour} strokeWidth="1" strokeLinecap="round" />
            <path d="M-3.2,-3.6 L0,-8.5 L3.2,-3.6" fill="none" stroke={colour} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
      </svg>
    </figure>
  );
}

// Humidity as dots: a square of 10 × 10 dots — one dot per percent — dark blue from the bottom row up, the rest light
// blue; no box. The same footprint as the wind grid.
export function DotDensity({ value, colour, label }) {
  const on = Math.round(Math.max(0, Math.min(100, value)));
  // cell i in reading order (top-left first); its rank from the bottom row upwards
  const rankFromBottom = (i) => (9 - Math.floor(i / 10)) * 10 + (i % 10);
  return (
    <div className="lg-square" role="img" aria-label={label}>
      <div className="lg-dots10">
        {Array.from({ length: 100 }, (_, i) => <i key={i} style={{ background: rankFromBottom(i) < on ? colour : '#B7CDE4' }} />)}
      </div>
    </div>
  );
}
