import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useDocumentTitle from '../../lib/useDocumentTitle';
import { Tank, Well, Column, Thermo, CategoryBar, WindGrid, DotDensity, AQI, HEAT_INDEX } from './Graphics';
import { useLiveJson, THEMES, fmtDay, fmtMonth, num } from './data';
import './live.css';

// /live/ — the summary: one card per theme, each opening its full view (/live/<theme>/).
export default function Live() {
  useDocumentTitle('Live');
  // a light grey page behind the white cards, on this page only (Teja, 25 Oct)
  useEffect(() => { document.body.classList.add('is-live'); return () => document.body.classList.remove('is-live'); }, []);
  const { data, error } = useLiveJson('summary.json');
  return (
    <main className="content-main content-main--lg live">
      {/* no visible title (Teja, 25 Oct): the cards start at the top; the heading stays for screen readers */}
      <h1 className="sr-only">Hyderabad live: latest readings across the HMDA region</h1>
      {error && !data && <p className="live-note">The live numbers could not be loaded. Try again in a few minutes.</p>}
      {!data && !error && <p className="live-note">Loading the latest readings…</p>}
      {data && (
        <>
          <div className="live-grid live-grid--cols">
            {ORDER.map((id) => data.cards.find((c) => c.id === id)).filter(Boolean).map((c) => <Card key={c.id} c={c} />)}
          </div>
          {Object.keys(data.errors || {}).length > 0 && <p className="live-note">Some cards could not be updated this time.</p>}
        </>
      )}
    </main>
  );
}

// three columns on wide screens, filled top to bottom: temperature, humidity, heat index | rain, wind, air |
// reservoirs, groundwater, tankers (Teja, 25 Oct). Narrower screens keep this order, row by row.
const ORDER = ['heat', 'humidity', 'heatindex', 'rain', 'wind', 'air', 'reservoirs', 'groundwater', 'tankers'];

function Card({ c }) {
  const t = THEMES[c.id] || { colour: '#185FA5' };
  const { value, unit, line, compare, graphic, asOf, noDate } = describe(c);
  return (
    <Link to={`/live/${c.id}`} className="live-card">
      <div className="live-card-text">
        <span className="live-eyebrow">{c.title}</span>
        <div className="live-value">{value}{unit && <span className="live-unit">{unit}</span>}</div>
        <p className="live-line" title={line}>{line}</p>
        {compare && <p className="live-compare" title={compare}>{compare}</p>}
        {!noDate && <p className="live-updated">{updated(asOf || c.as_of)}</p>}
        <span className="live-open" aria-label={`Explore ${c.title.toLowerCase()}`}>
          Explore
          <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M3 9 L9 3 M4.5 3 H9 V7.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </div>
      <div className="live-card-graphic">{graphic && graphic(t.colour, compare || line)}</div>
    </Link>
  );
}

// "Updated 11:01 am, 25 Oct" for the live feeds; daily and monthly series say which day or month the data is for
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function updated(a) {
  if (!a) return '';
  if (a.length === 7) return `Data for ${fmtMonth(a)}`;
  const [y, m, d] = a.slice(0, 10).split('-').map(Number);
  const day = `${d} ${MON[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`;
  if (a.length === 10) return `Data for ${day}`;
  const hh = Number(a.slice(11, 13));
  return `Updated ${hh % 12 || 12}:${a.slice(14, 16)} ${hh < 12 ? 'am' : 'pm'}, ${day}`;
}

const pct = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} %`;
const share = (a, b) => `${Math.round((a / b) * 100)} %`;

// The words on each card: the number, one line saying what it is, one comparison (normal or last year).
// Numbers come from summary.json (repo live-feed, summary.py). Comparisons follow one pattern: "x % of normal",
// "x m deeper than last year", "x× last year".
export function describe(c) {
  switch (c.id) {
    case 'heat': {
      const band = c.trend?.band?.length ? c.trend.band[c.trend.band.length - 1] : null;
      // daytime readings are compared with the normal high, night-time ones with the normal low
      const hour = Number((c.as_of || '').slice(11, 13));
      const day = hour >= 9 && hour < 19;
      const ref = band ? (day ? band[2] : band[1]) : null;
      const d = ref != null && c.value != null ? c.value - ref : null;
      return {
        value: num(c.value), unit: '°C', line: 'Air temperature now',
        compare: d == null ? null : Math.abs(d) < 0.5 ? `At the normal ${day ? 'high' : 'low'}`
          : `${num(Math.abs(d))}° ${d > 0 ? 'above' : 'below'} the normal ${day ? 'high' : 'low'}`,
        graphic: band && c.value != null ? (colour, label) => <Thermo now={c.value} low={band[1]} high={band[2]} colour={colour} label={label} /> : null,
      };
    }
    case 'humidity':
      return {
        value: num(c.value, 0), unit: '%', line: 'Relative humidity now',
        graphic: (colour, label) => <DotDensity value={c.value} colour={colour} label={label} />,
      };
    case 'heatindex': {
      const d = c.value != null && c.air_c != null ? c.value - c.air_c : null;
      return {
        value: num(c.value), unit: '°C', line: `Feels like · ${c.band || ''}`,
        compare: d == null || Math.abs(d) < 0.5 ? null : `${num(Math.abs(d))}° ${d > 0 ? 'hotter' : 'cooler'} than the air`,
        graphic: c.value != null ? (colour, label) => <CategoryBar value={c.value} {...HEAT_INDEX} unit="°" label={label} /> : null,
      };
    }
    case 'air': {
      const q = c.aqi || {};
      if (q.value == null) return { value: num(c.value, 0), unit: 'µg/m³', line: `PM2.5, 24-hour average · ${c.band || ''}` };
      return {
        value: num(q.value, 0), unit: 'AQI',
        line: `${q.band} · mainly ${POLLUTANT[q.main] || q.main}`,
        compare: null,
        graphic: (colour, label) => <CategoryBar value={q.value} {...AQI} label={label} />,
      };
    }
    case 'wind':
      return {
        value: num(c.value), unit: 'km/h',
        line: c.from ? `${beaufort(c.value)} from the ${long(c.from)}` : beaufort(c.value),
        compare: null,
        graphic: c.from_deg != null ? (colour, label) => <WindGrid from={c.from_deg} colour={colour} label={label} /> : null,
      };
    case 'rain': {
      const s = c.imd_season;
      if (!s) return { value: num(c.value), unit: 'mm', line: 'HMDA average, rain day from 08:30' };
      return {
        value: num(s.actual_mm), unit: 'mm', line: `Rain this season, ${fmtDay(s.from)} to ${fmtDay(s.date)}`, noDate: true,   // the period is in the line
        compare: `${share(s.actual_mm, s.normal_mm)} of normal`,
        graphic: (colour, label) => <Tank value={s.actual_mm} normal={s.normal_mm} colour={colour} label={label}
          nowText={`now ${num(s.actual_mm)}`} normalText={`normal ${num(s.normal_mm, 0)}`} />,
      };
    }
    case 'groundwater': {
      const now = c.now_same_wells; const then = c.last_year_same_wells;
      if (now == null || then == null) return { value: num(c.value), unit: 'm', line: 'Depth to water' };
      const d = now - then;
      return {
        value: num(now), unit: 'm', line: 'Depth to water below ground',
        compare: `${num(Math.abs(d))} m ${d > 0 ? 'deeper' : 'higher'} than last year`,
        graphic: (colour, label) => <Well depth={now} before={then} colour={colour} label={label} />,
      };
    }
    case 'reservoirs':
      return {
        value: num(c.value, 0), unit: '%', line: `Full, ${num(c.tmc)} of ${num(c.capacity_tmc, 0)} TMC`,
        compare: `${share(c.value, c.normal)} of normal for the date`,
        graphic: (colour, label) => <Tank value={c.value} normal={c.normal} lastYear={c.last_year} max={100} closed colour={colour} label={label}
          nowText={`now ${num(c.value, 0)}%`} normalText={`normal ${num(c.normal, 0)}%`} lastYearText={`last year ${num(c.last_year, 0)}%`} />,
      };
    case 'tankers': {
      const ly = c.month.replace(/^\d{4}/, (y) => y - 1);
      return {
        value: num(c.value, 0), unit: '', line: `Tanker bookings, ${shortMonth(c.month)}`, noDate: true,   // the month is in the line
        compare: c.last_year ? `${num(c.value / c.last_year, 1)}× ${shortMonth(ly)}` : null,
        graphic: (colour, label) => <Column value={c.value} ref={c.last_year} overlay closed colour={colour} label={label}
          nowText={`${shortMonth(c.month)} ${compact(c.value)}`} refText={c.last_year ? `${shortMonth(ly)} ${compact(c.last_year)}` : ''} />,
      };
    }
    default:
      return { value: num(c.value), unit: c.unit, line: c.value_label };
  }
}

const POLLUTANT = { pm10: 'PM10', pm25: 'PM2.5', no2: 'NO₂', so2: 'SO₂', co: 'CO', o3: 'ozone', nh3: 'NH₃' };
// Beaufort scale names for km/h
const beaufort = (k) => (k < 1 ? 'Calm' : k < 6 ? 'Light air' : k < 12 ? 'Light breeze' : k < 20 ? 'Gentle breeze'
  : k < 29 ? 'Moderate breeze' : k < 39 ? 'Fresh breeze' : k < 50 ? 'Strong breeze' : 'Near gale');
const shortMonth = (ym) => `${MON[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const compact = (v) => (v >= 1e5 ? `${num(v / 1e5, 2)} lakh` : v >= 1e3 ? `${num(v / 1e3, 0)}k` : num(v, 0));
const long = (s) => ({ N: 'north', NE: 'north-east', E: 'east', SE: 'south-east', S: 'south', SW: 'south-west', W: 'west', NW: 'north-west' }[s] || s);
